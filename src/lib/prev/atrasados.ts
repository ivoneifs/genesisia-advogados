// Liquidação de parcelas atrasadas (concessão, restabelecimento ou revisão).
// Correção monetária e juros de mora conforme o Manual de Cálculos da
// Justiça Federal (CJF):
//  - RGPS: INPC (Tema 905/STJ); Fazenda/servidor: IPCA-E (Tema 810/STF).
//  - Juros: 1% a.m. até 06/2009; depois, juros da poupança (Lei 11.960/2009),
//    a partir da citação.
//  - A partir de 12/2021: Selic, uma única vez, no lugar de correção e juros (EC 113/2021, art. 3º).

import { compN, competencia, deCompN, diaN, somaComp, ultimoDiaComp } from "./datas";
import { taxa, type Indices, type SerieIndice } from "./indices";
import { reajusteAnual } from "./media";
import { arred, salarioMinimo, teto } from "./tabelas";

export type ParametrosAtrasados = {
  dib: string; // início do benefício devido (AAAA-MM-DD)
  fim: string; // última data devida (DIP - 1 dia, ou data do cálculo)
  rmiDevida: number;
  rmiPaga?: number; // revisão: renda que já é paga (0/vazio = concessão)
  dibPaga?: string; // início do benefício pago (se diferente)
  reajuste: "INSS" | "nenhum";
  indice: SerieIndice; // INPC | IPCAE | IPCA
  usarSelicEC113: boolean;
  juros: "poupanca" | "1" | "0.5" | "nenhum";
  citacao?: string | null;
  ajuizamento?: string | null;
  prescricao: boolean; // quinquenal (5 anos antes do ajuizamento)
  incluir13: boolean;
  dataCalculo: string; // atualização até
  honorariosPercentual?: number; // sobre vencidas até a sentença (Súmula 111/STJ)
  sentenca?: string | null;
  pagamentosAdministrativos?: { comp: string; valor: number }[]; // valores já recebidos a abater
};

export type LinhaAtrasados = {
  comp: string;
  tipo: "mensal" | "13º";
  devido: number;
  pago: number;
  diferenca: number;
  fatorCorrecao: number;
  corrigido: number;
  jurosPct: number;
  juros: number;
  selicPct: number;
  selic: number;
  total: number;
  prescrita: boolean;
};

export type ResultadoAtrasados = {
  linhas: LinhaAtrasados[];
  totais: { diferenca: number; corrigido: number; juros: number; selic: number; total: number; prescrito: number };
  honorarios: number;
  baseHonorarios: number;
  rendaAtualDevida: number;
  rendaAtualPaga: number;
  vincendas12: number;
  valorCausa: number;
  memoria: string[];
};

const SELIC_DESDE = "2021-12";

/** Juros de mora de um mês (em %), conforme o regime. */
export function jurosMes(indices: Indices, comp: string, regime: ParametrosAtrasados["juros"]): number {
  if (regime === "nenhum") return 0;
  if (regime === "1") return 1;
  if (regime === "0.5") return 0.5;
  // Poupança: 1% até 06/2009; 0,5% a.m.; a partir de 05/2012, 70% da Selic quando ela for ≤ 8,5% a.a.
  if (comp < "2009-07") return 1;
  if (comp < "2012-05") return 0.5;
  const selicMes = taxa(indices, "SELIC", comp);
  if (!selicMes) return 0.5;
  const anual = (Math.pow(1 + selicMes / 100, 12) - 1) * 100;
  return anual > 8.5 ? 0.5 : (Math.pow(1 + (anual * 0.7) / 100, 1 / 12) - 1) * 100;
}

function rendaNoMes(rmi: number, dib: string, comp: string, indices: Indices, reajuste: "INSS" | "nenhum"): number {
  let renda = rmi;
  if (reajuste === "nenhum") return renda;
  const anoIni = Number(dib.slice(0, 4));
  const ano = Number(comp.slice(0, 4));
  for (let a = anoIni + 1; a <= ano; a++) {
    const smAnt = salarioMinimo(`${a - 1}-12`);
    const piso = Math.abs(renda - smAnt) < 0.01;
    renda = piso ? salarioMinimo(`${a}-01`) : renda * (1 + reajusteAnual(indices, a, dib));
    renda = Math.min(Math.max(renda, salarioMinimo(`${a}-01`)), teto(`${a}-01`));
  }
  // Salário mínimo pode mudar no meio do ano (ex.: 05/2023).
  if (Math.abs(renda - salarioMinimo(`${ano}-01`)) < 0.01) renda = salarioMinimo(comp);
  return arred(Math.max(renda, salarioMinimo(comp)));
}

function proporcaoMes(comp: string, inicio: string, fim: string): number {
  const ini = Math.max(diaN(`${comp}-01`), diaN(inicio));
  const f = Math.min(diaN(ultimoDiaComp(comp)), diaN(fim));
  if (f < ini) return 0;
  const dias = f - ini + 1;
  const diasMes = diaN(ultimoDiaComp(comp)) - diaN(`${comp}-01`) + 1;
  return dias >= diasMes ? 1 : dias / 30;
}

export function calcularAtrasados(p: ParametrosAtrasados, indices: Indices): ResultadoAtrasados {
  const memoria: string[] = [];
  const linhas: LinhaAtrasados[] = [];
  const compCalc = competencia(p.dataCalculo);
  const limitePrescricao = p.prescricao && p.ajuizamento ? competencia(somaYears(p.ajuizamento, -5)) : null;
  const compCitacao = p.citacao ? competencia(p.citacao) : null;
  const abatimentos = new Map((p.pagamentosAdministrativos ?? []).map((x) => [x.comp, x.valor]));

  // Atualiza um valor da competência de vencimento até a data do cálculo.
  const atualizar = (comp: string, valor: number) => {
    const venc = somaComp(comp, 1); // benefício do mês é pago no mês seguinte
    let fator = 1;
    let jurosPct = 0;
    let selicPct = 0;
    const fimCorrecao = p.usarSelicEC113 ? somaComp(SELIC_DESDE, -1) : compCalc;
    for (let n = compN(venc); n <= compN(fimCorrecao) && n <= compN(compCalc); n++) {
      const c = deCompN(n);
      fator *= 1 + taxa(indices, p.indice, c) / 100;
      if (compCitacao && c >= compCitacao) jurosPct += jurosMes(indices, c, p.juros);
    }
    // Juros desde a citação para parcelas que venceram antes dela, e desde o vencimento para as posteriores.
    const corrigido = valor * fator;
    const juros = (corrigido * jurosPct) / 100;
    let selic = 0;
    if (p.usarSelicEC113 && compCalc >= SELIC_DESDE) {
      const desde = venc > SELIC_DESDE ? venc : SELIC_DESDE;
      for (let n = compN(desde); n < compN(compCalc); n++) selicPct += taxa(indices, "SELIC", deCompN(n));
      // Mês do cálculo: 1% (Manual CJF, item 4.2.2).
      if (desde <= compCalc) selicPct += 1;
      selic = ((corrigido + juros) * selicPct) / 100;
    }
    return { fator, corrigido, jurosPct, juros, selicPct, selic, total: corrigido + juros + selic };
  };

  const dibPaga = p.dibPaga || p.dib;
  let acum13Devido = 0;
  let acum13Pago = 0;
  for (let n = compN(competencia(p.dib)); n <= compN(competencia(p.fim)); n++) {
    const comp = deCompN(n);
    const prop = proporcaoMes(comp, p.dib, p.fim);
    if (prop <= 0) continue;
    const devido = rendaNoMes(p.rmiDevida, p.dib, comp, indices, p.reajuste) * prop;
    const pagoRenda = p.rmiPaga && comp >= competencia(dibPaga) ? rendaNoMes(p.rmiPaga, dibPaga, comp, indices, p.reajuste) * proporcaoMes(comp, dibPaga, p.fim) : 0;
    const pago = pagoRenda + (abatimentos.get(comp) ?? 0);
    acum13Devido += devido;
    acum13Pago += pagoRenda;
    const add = (tipo: "mensal" | "13º", dev: number, pg: number) => {
      const diferenca = dev - pg;
      const prescrita = !!limitePrescricao && comp < limitePrescricao;
      const a = atualizar(comp, diferenca);
      linhas.push({
        comp, tipo, devido: arred(dev), pago: arred(pg), diferenca: arred(diferenca), fatorCorrecao: a.fator,
        corrigido: arred(a.corrigido), jurosPct: a.jurosPct, juros: arred(a.juros), selicPct: a.selicPct, selic: arred(a.selic),
        total: prescrita ? 0 : arred(a.total), prescrita,
      });
    };
    add("mensal", devido, pago);
    const ultimoMes = comp === competencia(p.fim);
    if (p.incluir13 && (comp.endsWith("-12") || ultimoMes)) {
      // Abono anual: 1/12 do total recebido no ano por mês (proporcional).
      const renda = rendaNoMes(p.rmiDevida, p.dib, comp, indices, p.reajuste);
      const mesesDevido = acum13Devido / (renda || 1);
      const rendaPaga = p.rmiPaga ? rendaNoMes(p.rmiPaga, dibPaga, comp, indices, p.reajuste) : 0;
      const mesesPago = rendaPaga ? acum13Pago / rendaPaga : 0;
      add("13º", (renda * Math.min(12, mesesDevido)) / 12, (rendaPaga * Math.min(12, mesesPago)) / 12);
      acum13Devido = 0;
      acum13Pago = 0;
    }
  }

  const validas = linhas.filter((l) => !l.prescrita);
  const soma = (k: keyof LinhaAtrasados) => arred(validas.reduce((s, l) => s + (l[k] as number), 0));
  const totais = {
    diferenca: soma("diferenca"),
    corrigido: soma("corrigido"),
    juros: soma("juros"),
    selic: soma("selic"),
    total: soma("total"),
    prescrito: arred(linhas.filter((l) => l.prescrita).reduce((s, l) => s + l.diferenca, 0)),
  };

  const baseHonorarios = arred(
    validas.filter((l) => !p.sentenca || l.comp <= competencia(p.sentenca)).reduce((s, l) => s + l.total, 0)
  );
  const honorarios = arred((baseHonorarios * (p.honorariosPercentual ?? 0)) / 100);
  const rendaAtualDevida = rendaNoMes(p.rmiDevida, p.dib, competencia(p.fim), indices, p.reajuste);
  const rendaAtualPaga = p.rmiPaga ? rendaNoMes(p.rmiPaga, dibPaga, competencia(p.fim), indices, p.reajuste) : 0;
  const vincendas12 = arred((rendaAtualDevida - rendaAtualPaga) * 12);

  memoria.push(`Correção monetária: ${p.indice}${p.usarSelicEC113 ? " até 11/2021; a partir de 12/2021, Selic (EC 113/2021)" : ""}.`);
  memoria.push(
    p.juros === "nenhum"
      ? "Sem juros de mora."
      : `Juros de mora ${p.juros === "poupanca" ? "da poupança (Lei 11.960/2009; 1% a.m. até 06/2009)" : `de ${p.juros}% a.m.`} a partir da citação${p.citacao ? "" : " (citação não informada: sem juros)"}.`
  );
  if (limitePrescricao) memoria.push(`Prescrição quinquenal: parcelas anteriores a ${limitePrescricao.slice(5)}/${limitePrescricao.slice(0, 4)} excluídas.`);
  if (p.honorariosPercentual) memoria.push(`Honorários de ${p.honorariosPercentual}% sobre as parcelas vencidas${p.sentenca ? " até a sentença (Súmula 111/STJ)" : ""}.`);

  return {
    linhas,
    totais,
    honorarios,
    baseHonorarios,
    rendaAtualDevida,
    rendaAtualPaga,
    vincendas12,
    valorCausa: arred(totais.total + Math.max(0, vincendas12)),
    memoria,
  };
}

function somaYears(iso: string, anos: number) {
  const [a, m, d] = iso.split("-").map(Number);
  return `${a + anos}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
