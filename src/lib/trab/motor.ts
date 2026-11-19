// Motor de cálculos trabalhistas: rescisão, horas extras com reflexos e
// liquidação de sentença (ADC 58/STF e Lei 14.905/2024).

import { compN, competencia, deCompN, diaN, fmtComp, fmtData, idadeEm, somaComp, somaDias, ultimoDiaComp } from "../prev/datas";
import { fatorComposto, somaTaxas, taxa, type Indices } from "../prev/indices";
import { arred, teto } from "../prev/tabelas";
import { diasAvisoPrevio, inssEmpregado, irrf } from "./tabelas";

const brl = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ---------------------------------------------------------------------------
// Bases
// ---------------------------------------------------------------------------

export const salarioHora = (salario: number, divisor: number) => (divisor ? salario / divisor : 0);
export const salarioDia = (salario: number, dias = 30) => salario / (dias || 30);

/** Meses completos de serviço (fração ≥ 15 dias conta como mês) — para 13º e férias. */
export function avos(inicio: string, fim: string): number {
  if (fim < inicio) return 0;
  let n = 0;
  let cursor = inicio;
  while (cursor <= fim) {
    const fimMes = somaDias(addMes(cursor, 1), -1);
    const ate = fimMes < fim ? fimMes : fim;
    const dias = diaN(ate) - diaN(cursor) + 1;
    if (dias >= 15) n++;
    cursor = somaDias(fimMes, 1);
  }
  return n;
}

function addMes(iso: string, meses: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ult = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, ult));
  return dt.toISOString().slice(0, 10);
}

/** Avos de 13º no ano civil (mês com 15+ dias trabalhados). */
function avos13(admissao: string, fim: string): number {
  const ano = fim.slice(0, 4);
  const inicio = admissao > `${ano}-01-01` ? admissao : `${ano}-01-01`;
  let n = 0;
  for (let m = 1; m <= 12; m++) {
    const comp = `${ano}-${String(m).padStart(2, "0")}`;
    const ini = `${comp}-01` > inicio ? `${comp}-01` : inicio;
    const f = ultimoDiaComp(comp) < fim ? ultimoDiaComp(comp) : fim;
    if (f >= ini && diaN(f) - diaN(ini) + 1 >= 15) n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Rescisão
// ---------------------------------------------------------------------------

export type TipoRescisao =
  | "sem_justa_causa"
  | "pedido_demissao"
  | "justa_causa"
  | "acordo"
  | "rescisao_indireta"
  | "termino_prazo"
  | "antecipada_empregador"
  | "antecipada_empregado"
  | "culpa_reciproca"
  | "falecimento";

export const NOMES_RESCISAO: Record<TipoRescisao, string> = {
  sem_justa_causa: "Dispensa sem justa causa",
  pedido_demissao: "Pedido de demissão",
  justa_causa: "Dispensa por justa causa",
  acordo: "Acordo entre as partes (art. 484-A)",
  rescisao_indireta: "Rescisão indireta",
  termino_prazo: "Término de contrato por prazo determinado/experiência",
  antecipada_empregador: "Rescisão antecipada do contrato a prazo pelo empregador (art. 479)",
  antecipada_empregado: "Rescisão antecipada do contrato a prazo pelo empregado (art. 480)",
  culpa_reciproca: "Culpa recíproca (art. 484)",
  falecimento: "Falecimento do empregado",
};

export type ParamRescisao = {
  tipo: TipoRescisao;
  admissao: string;
  afastamento: string; // último dia trabalhado
  salario: number;
  mediaVariaveis: number; // médias de HE, comissões, adicionais (integram as verbas)
  aviso: "indenizado" | "trabalhado" | "dispensado" | "nao_cumprido";
  feriasVencidasPeriodos: number; // períodos aquisitivos completos não gozados
  feriasEmDobro: number; // quantos desses estão vencidos (fora do período concessivo)
  saldoFgts: number; // saldo para fins rescisórios (depósitos + JAM)
  fimContratoPrazo?: string; // contratos a prazo
  dependentes: number;
  atrasoPagamento: boolean; // multa art. 477, §8º
  verbasIncontroversasNaoPagas: boolean; // multa art. 467
  dataBase?: string; // mês da data-base (MM) para o trintídio
  descontos: number; // adiantamentos e outros
};

export type LinhaVerba = { verba: string; referencia: string; valor: number; natureza: "salarial" | "indenizatoria"; fgts: boolean; inss: boolean; ir: boolean; desconto?: boolean };

export function calcularRescisao(p: ParamRescisao) {
  const linhas: LinhaVerba[] = [];
  const memoria: string[] = [];
  const remuneracao = p.salario + p.mediaVariaveis;
  const dia = remuneracao / 30;
  const add = (l: LinhaVerba) => l.valor > 0.004 && linhas.push({ ...l, valor: arred(l.valor) });
  const anos = idadeEm(p.admissao, p.afastamento);

  // Aviso prévio
  const temAvisoEmpregador = ["sem_justa_causa", "rescisao_indireta", "acordo", "culpa_reciproca"].includes(p.tipo);
  let diasAviso = temAvisoEmpregador ? diasAvisoPrevio(anos) : 0;
  if (p.tipo === "acordo") diasAviso = Math.floor(diasAviso / 2);
  if (p.tipo === "culpa_reciproca") diasAviso = Math.floor(diasAviso / 2);
  const avisoIndenizado = temAvisoEmpregador && (p.aviso === "indenizado" || p.tipo === "rescisao_indireta" || p.tipo === "acordo");
  const projecao = avisoIndenizado ? somaDias(p.afastamento, diasAviso) : p.afastamento;
  if (avisoIndenizado) {
    add({ verba: p.tipo === "acordo" ? "Aviso prévio indenizado (50% — art. 484-A)" : "Aviso prévio indenizado", referencia: `${diasAviso} dias`, valor: dia * diasAviso, natureza: "indenizatoria", fgts: true, inss: false, ir: false });
    memoria.push(`Aviso prévio de ${diasAviso} dias (30 + 3 por ano completo — Lei 12.506/2011${p.tipo === "acordo" ? "; metade no acordo" : ""}); projeção do contrato até ${fmtData(projecao)} (OJ 82 SDI-1).`);
  }
  if (p.tipo === "pedido_demissao" && p.aviso === "nao_cumprido") {
    add({ verba: "Desconto do aviso prévio não cumprido (art. 487, §2º)", referencia: "30 dias", valor: p.salario, natureza: "indenizatoria", fgts: false, inss: false, ir: false, desconto: true });
  }

  // Saldo de salário
  const diasSaldo = Number(p.afastamento.slice(8, 10));
  add({ verba: "Saldo de salário", referencia: `${diasSaldo} dias`, valor: (p.salario / 30) * Math.min(30, diasSaldo), natureza: "salarial", fgts: true, inss: true, ir: true });

  const justa = p.tipo === "justa_causa";
  // 13º proporcional (com projeção do aviso)
  if (!justa) {
    const av13 = avos13(p.admissao, projecao);
    const av13Trab = avos13(p.admissao, p.afastamento);
    add({ verba: "13º salário proporcional", referencia: `${av13Trab}/12`, valor: (remuneracao / 12) * av13Trab, natureza: "salarial", fgts: true, inss: true, ir: true });
    if (av13 > av13Trab) add({ verba: "13º salário indenizado (projeção do aviso)", referencia: `${av13 - av13Trab}/12`, valor: (remuneracao / 12) * (av13 - av13Trab), natureza: "indenizatoria", fgts: true, inss: false, ir: false });
  }

  // Férias vencidas
  const ferias = (valor: number, nome: string, ref: string) => {
    add({ verba: nome, referencia: ref, valor, natureza: "indenizatoria", fgts: false, inss: false, ir: false });
    add({ verba: `1/3 constitucional sobre ${nome.toLowerCase()}`, referencia: "1/3", valor: valor / 3, natureza: "indenizatoria", fgts: false, inss: false, ir: false });
  };
  const simples = Math.max(0, p.feriasVencidasPeriodos - p.feriasEmDobro);
  if (simples) ferias(remuneracao * simples, "Férias vencidas simples", `${simples} período(s)`);
  if (p.feriasEmDobro) ferias(remuneracao * 2 * p.feriasEmDobro, "Férias vencidas em dobro (art. 137)", `${p.feriasEmDobro} período(s)`);

  // Férias proporcionais (período aquisitivo em curso)
  if (!justa) {
    const aniversario = (() => {
      let a = p.admissao;
      while (addMes(a, 12) <= projecao) a = addMes(a, 12);
      return a;
    })();
    const avFer = Math.min(12, avos(aniversario, projecao));
    const avFerTrab = Math.min(12, avos(aniversario, p.afastamento));
    if (avFerTrab) ferias((remuneracao / 12) * avFerTrab, "Férias proporcionais", `${avFerTrab}/12`);
    if (avFer > avFerTrab) ferias((remuneracao / 12) * (avFer - avFerTrab), "Férias indenizadas (projeção do aviso)", `${avFer - avFerTrab}/12`);
  } else {
    memoria.push("Justa causa: sem 13º e férias proporcionais (Súmula 171/TST); a Convenção 132 da OIT é tese minoritária.");
  }

  // Contratos a prazo
  if (p.fimContratoPrazo && p.fimContratoPrazo > p.afastamento) {
    const diasRestantes = diaN(p.fimContratoPrazo) - diaN(p.afastamento);
    if (p.tipo === "antecipada_empregador") {
      add({ verba: "Indenização do art. 479 (metade dos salários até o termo)", referencia: `${diasRestantes} dias`, valor: (dia * diasRestantes) / 2, natureza: "indenizatoria", fgts: false, inss: false, ir: false });
    }
    if (p.tipo === "antecipada_empregado") {
      add({ verba: "Desconto do art. 480 (prejuízo, limitado ao art. 479)", referencia: `${diasRestantes} dias`, valor: (dia * diasRestantes) / 2, natureza: "indenizatoria", fgts: false, inss: false, ir: false, desconto: true });
    }
  }

  // Indenização adicional (trintídio) — dispensa nos 30 dias antes da data-base
  if (p.dataBase && ["sem_justa_causa", "rescisao_indireta"].includes(p.tipo)) {
    const mesBase = Number(p.dataBase);
    const anoProj = Number(projecao.slice(0, 4));
    let dataBase = `${anoProj}-${String(mesBase).padStart(2, "0")}-01`;
    if (dataBase < projecao) dataBase = `${anoProj + 1}-${String(mesBase).padStart(2, "0")}-01`;
    const dias = diaN(dataBase) - diaN(projecao);
    if (dias >= 0 && dias <= 30) {
      add({ verba: "Indenização adicional (art. 9º da Lei 7.238/84)", referencia: "1 salário", valor: p.salario, natureza: "indenizatoria", fgts: false, inss: false, ir: false });
      memoria.push("Dispensa (com projeção do aviso) nos 30 dias que antecedem a data-base: indenização de um salário (Súmulas 182 e 314/TST).");
    }
  }

  // FGTS do mês e multa rescisória
  const baseFgts = linhas.filter((l) => l.fgts && !l.desconto).reduce((s, l) => s + l.valor, 0);
  const fgtsRescisorio = baseFgts * 0.08;
  const saldoTotal = p.saldoFgts + fgtsRescisorio;
  const multaPct = ["sem_justa_causa", "rescisao_indireta", "antecipada_empregador"].includes(p.tipo) ? 0.4 : ["acordo", "culpa_reciproca"].includes(p.tipo) ? 0.2 : 0;
  const multaFgts = saldoTotal * multaPct;

  // Multas
  if (p.atrasoPagamento && !["falecimento"].includes(p.tipo)) add({ verba: "Multa do art. 477, §8º (atraso na rescisão)", referencia: "1 salário", valor: p.salario, natureza: "indenizatoria", fgts: false, inss: false, ir: false });
  if (p.verbasIncontroversasNaoPagas) {
    const incontroversas = linhas.filter((l) => !l.desconto).reduce((s, l) => s + l.valor, 0) + multaFgts;
    add({ verba: "Multa do art. 467 (50% das verbas incontroversas)", referencia: "50%", valor: incontroversas * 0.5, natureza: "indenizatoria", fgts: false, inss: false, ir: false });
  }

  // Descontos legais
  const baseInss = linhas.filter((l) => l.inss && !l.desconto && !l.verba.startsWith("13º")).reduce((s, l) => s + l.valor, 0);
  const base13 = linhas.filter((l) => l.inss && l.verba.startsWith("13º")).reduce((s, l) => s + l.valor, 0);
  const comp = competencia(p.afastamento);
  const inssMes = inssEmpregado(baseInss, comp).valor;
  const inss13 = inssEmpregado(base13, comp).valor;
  const ir = irrf(baseInss, inssMes, p.dependentes).valor;
  const ir13 = irrf(base13, inss13, p.dependentes).valor;
  const brutos = linhas.filter((l) => !l.desconto).reduce((s, l) => s + l.valor, 0);
  const descontosVerbas = linhas.filter((l) => l.desconto).reduce((s, l) => s + l.valor, 0);
  const descontos = inssMes + inss13 + ir + ir13 + descontosVerbas + p.descontos;
  // Art. 477, §5º: compensação limitada a uma remuneração.
  const limiteCompensacao = remuneracao;
  const outrosDescontos = Math.min(descontosVerbas + p.descontos, limiteCompensacao);
  const liquido = brutos - (inssMes + inss13 + ir + ir13) - outrosDescontos;
  if (descontosVerbas + p.descontos > limiteCompensacao) memoria.push(`Descontos limitados a uma remuneração (${brl(limiteCompensacao)}) — art. 477, §5º.`);

  memoria.push(
    `Remuneração-base: salário ${brl(p.salario)} + médias ${brl(p.mediaVariaveis)} = ${brl(remuneracao)}.`,
    `FGTS do mês rescisório (8% sobre saldo, aviso e 13º): ${brl(fgtsRescisorio)}.`,
    multaPct ? `Multa de ${multaPct * 100}% sobre o saldo do FGTS (${brl(saldoTotal)}): ${brl(multaFgts)}.` : "Sem multa sobre o FGTS para esta modalidade.",
    ["sem_justa_causa", "rescisao_indireta"].includes(p.tipo) ? "Saque integral do FGTS e seguro-desemprego (se cumpridos os requisitos)." : p.tipo === "acordo" ? "Acordo: saque de 80% do FGTS e sem seguro-desemprego." : "Sem saque do FGTS (salvo hipóteses do art. 20 da Lei 8.036/90).",
    `INSS: ${brl(inssMes)} (mês) + ${brl(inss13)} (13º); IRRF: ${brl(ir)} + ${brl(ir13)} (tabela 2026).`,
    "Prazo de pagamento: 10 dias do término (art. 477, §6º).",
  );

  return {
    linhas,
    diasAviso,
    projecao,
    brutos: arred(brutos),
    inss: arred(inssMes + inss13),
    irrf: arred(ir + ir13),
    descontos: arred(descontos),
    liquido: arred(liquido),
    fgtsRescisorio: arred(fgtsRescisorio),
    multaFgts: arred(multaFgts),
    totalFgts: arred(saldoTotal + multaFgts),
    memoria,
  };
}

// ---------------------------------------------------------------------------
// Horas extras e reflexos
// ---------------------------------------------------------------------------

export type ParamHoras = {
  salario: number;
  divisor: number;
  adicionalBase: number; // insalubridade/periculosidade que integram a base (Súmula 264/139)
  horasMes: number; // horas extras por mês
  percentual: number; // 50, 60, 100...
  meses: number;
  diasUteis: number;
  diasDescanso: number; // domingos + feriados no mês (DSR)
  noturno?: boolean; // hora extra noturna: + 20% e redução ficta
  oj394Nova?: boolean; // DSR majorado repercute (a partir de 20/03/2023)
  incluirFgtsMulta?: boolean;
};

export function calcularHorasExtras(p: ParamHoras) {
  const hora = salarioHora(p.salario + p.adicionalBase, p.divisor);
  const fatorNoturno = p.noturno ? 1.2 : 1;
  const horasFicta = p.noturno ? p.horasMes * (60 / 52.5) : p.horasMes;
  const valorHora = hora * fatorNoturno * (1 + p.percentual / 100);
  const mensal = valorHora * horasFicta;
  const dsr = p.diasUteis ? (mensal / p.diasUteis) * p.diasDescanso : 0;
  const total = mensal * p.meses;
  const totalDsr = dsr * p.meses;
  const baseReflexos = p.oj394Nova ? total + totalDsr : total;
  const ferias = (baseReflexos / 12) * (4 / 3);
  const decimo = baseReflexos / 12;
  const fgts = (total + totalDsr + decimo) * 0.08;
  const multa = p.incluirFgtsMulta ? fgts * 0.4 : 0;
  return {
    hora,
    valorHora,
    mensal,
    dsr,
    total,
    totalDsr,
    ferias,
    decimo,
    fgts,
    multa,
    totalGeral: total + totalDsr + ferias + decimo + fgts + multa,
    memoria: [
      `Salário-hora: (${brl(p.salario)} + ${brl(p.adicionalBase)}) ÷ ${p.divisor} = ${brl(hora)} (Súmula 264/TST).`,
      `Hora extra: ${brl(hora)}${p.noturno ? " × 1,20 (noturno)" : ""} × ${1 + p.percentual / 100} = ${brl(valorHora)}${p.noturno ? "; horas noturnas convertidas pela hora ficta de 52min30s (×1,142857)" : ""}.`,
      `DSR: (HE do mês ÷ ${p.diasUteis} dias úteis) × ${p.diasDescanso} domingos/feriados (Súmula 172/TST).`,
      p.oj394Nova ? "DSR majorado repercute em férias, 13º, aviso e FGTS (tese do TST de 20/03/2023, IncJulgRREmbRep-10169-57.2013)." : "OJ 394 SDI-1 (até 19/03/2023): o DSR majorado não repercute nas demais verbas.",
      "Reflexos: férias + 1/3 (média ÷ 12 × 4/3 por ano), 13º (média ÷ 12 por ano) e FGTS 8%" + (p.incluirFgtsMulta ? " + 40%." : "."),
    ],
  };
}

// ---------------------------------------------------------------------------
// Liquidação de sentença trabalhista
// ---------------------------------------------------------------------------

export type CriterioAtualizacao = "tst2024" | "adc58" | "ipcae_1" | "tr_1";

export type ParamLiquidacao = {
  verbas: { comp: string; valor: number; descricao?: string; inss?: boolean; ir?: boolean; fgts?: boolean }[];
  ajuizamento: string;
  dataCalculo: string;
  criterio: CriterioAtualizacao;
  prescricao: boolean;
  multaFgts40: boolean;
  honorariosPct: number;
  custasPct: number;
  honorariosPericiais: number;
  pagos: number; // abatimento global (OJ 415)
  depositosRecursais: number;
  dependentes: number;
};

/** Fator de atualização de uma verba exigível em `comp` até a data do cálculo. */
export function fatorTrabalhista(indices: Indices, criterio: CriterioAtualizacao, comp: string, ajuizamento: string, dataCalculo: string) {
  const venc = somaComp(comp, 1); // salário do mês é exigível no mês seguinte (Súmula 381/TST)
  const compAj = competencia(ajuizamento);
  const compCalc = competencia(dataCalculo);
  const LEI_14905 = "2024-09"; // vigência em 30/08/2024
  let correcao = 1;
  let jurosPct = 0;
  let selicPct = 0;
  const partes: string[] = [];

  if (criterio === "ipcae_1" || criterio === "tr_1") {
    const serie = criterio === "ipcae_1" ? "IPCAE" : "TR";
    correcao = fatorComposto(indices, serie, venc, somaComp(compCalc, -1));
    const meses = Math.max(0, compN(compCalc) - Math.max(compN(venc), compN(compAj)));
    jurosPct = meses * 1;
    partes.push(`${serie} + juros de 1% a.m. desde o ajuizamento`);
    return { correcao, jurosPct, selicPct, descricao: partes.join("; ") };
  }

  // Fase pré-judicial: IPCA-E + juros (TR acumulada — art. 39, caput, Lei 8.177/91).
  const fimPre = somaComp(compAj, -1);
  if (venc <= fimPre) {
    correcao *= fatorComposto(indices, "IPCAE", venc, fimPre);
    jurosPct += somaTaxas(indices, "TR", venc, fimPre);
    partes.push("IPCA-E + TR (fase pré-judicial)");
  }
  const inicioJudicial = venc > compAj ? venc : compAj;
  if (criterio === "adc58") {
    selicPct += somaTaxas(indices, "SELIC", inicioJudicial, somaComp(compCalc, -1));
    partes.push("Selic desde o ajuizamento (ADC 58)");
  } else {
    // TST (E-ED-RR-713-03.2010.5.04.0029, 2024): Selic até 29/08/2024; depois IPCA + taxa legal (Selic − IPCA).
    const fimSelic = somaComp(LEI_14905, -1);
    if (inicioJudicial <= fimSelic) {
      selicPct += somaTaxas(indices, "SELIC", inicioJudicial, compCalc < LEI_14905 ? somaComp(compCalc, -1) : fimSelic);
      partes.push("Selic do ajuizamento até 08/2024");
    }
    const inicioNovo = inicioJudicial > LEI_14905 ? inicioJudicial : LEI_14905;
    if (compCalc > inicioNovo) {
      for (let n = compN(inicioNovo); n < compN(compCalc); n++) {
        const c = deCompN(n);
        const ipca = taxa(indices, "IPCA", c);
        correcao *= 1 + ipca / 100;
        jurosPct += Math.max(0, taxa(indices, "SELIC", c) - ipca); // taxa legal (art. 406, §1º, CC)
      }
      partes.push("IPCA + taxa legal (Selic − IPCA) desde 30/08/2024 (Lei 14.905/2024)");
    }
  }
  return { correcao, jurosPct, selicPct, descricao: partes.join("; ") };
}

export function liquidar(p: ParamLiquidacao, indices: Indices) {
  const limitePrescricao = p.prescricao ? competencia(`${Number(p.ajuizamento.slice(0, 4)) - 5}${p.ajuizamento.slice(4)}`) : null;
  const linhas: string[][] = [];
  let principal = 0, corrigido = 0, juros = 0, selic = 0, baseFgts = 0, prescrito = 0;
  const porComp = new Map<string, { base: number; inss: number }>();
  for (const v of p.verbas) {
    if (limitePrescricao && v.comp < limitePrescricao) {
      prescrito += v.valor;
      continue;
    }
    const f = fatorTrabalhista(indices, p.criterio, v.comp, p.ajuizamento, p.dataCalculo);
    const c = v.valor * f.correcao;
    const j = (c * f.jurosPct) / 100;
    const s = (c * f.selicPct) / 100;
    principal += v.valor;
    corrigido += c;
    juros += j;
    selic += s;
    if (v.fgts !== false) baseFgts += c;
    if (v.inss !== false) {
      const atual = porComp.get(v.comp) ?? { base: 0, inss: 0 };
      atual.base += v.valor;
      porComp.set(v.comp, atual);
    }
    linhas.push([fmtComp(v.comp), v.descricao ?? "", brl(v.valor), f.correcao.toFixed(6).replace(".", ","), brl(c), `${f.jurosPct.toFixed(2).replace(".", ",")}%`, brl(j), `${f.selicPct.toFixed(2).replace(".", ",")}%`, brl(s), brl(c + j + s)]);
  }
  // INSS cota do empregado mês a mês (Súmula 368, III/TST), atualizado pelo mesmo fator.
  let inssEmp = 0;
  for (const [comp, x] of porComp) {
    const f = fatorTrabalhista(indices, p.criterio, comp, p.ajuizamento, p.dataCalculo);
    inssEmp += inssEmpregado(x.base, comp).valor * f.correcao;
  }
  const fgts = baseFgts * 0.08;
  const multa = p.multaFgts40 ? fgts * 0.4 : 0;
  const bruto = corrigido + juros + selic + fgts + multa;
  // IRRF sobre RRA: só sobre o principal corrigido tributável, sem juros (OJ 400/SDI-1; Tema 808/STF).
  const meses = Math.max(1, porComp.size);
  const baseIr = Math.max(0, corrigido - inssEmp);
  const irMes = irrf(baseIr / meses, 0, p.dependentes).valor;
  const ir = irMes * meses;
  const liquidoAutor = bruto - inssEmp - ir - p.pagos;
  const honorarios = (bruto - p.pagos) * (p.honorariosPct / 100);
  // Custas: 2% limitadas a 4 vezes o teto do RGPS (art. 789, caput, CLT).
  const custas = Math.min((bruto - p.pagos) * (p.custasPct / 100), 4 * teto(competencia(p.dataCalculo)));
  const patronal = corrigido * 0.2; // estimativa da cota patronal (sem RAT/terceiros)
  const totalReclamada = bruto - p.pagos + honorarios + custas + p.honorariosPericiais + patronal;
  return {
    linhas,
    principal: arred(principal),
    corrigido: arred(corrigido),
    juros: arred(juros),
    selic: arred(selic),
    fgts: arred(fgts),
    multaFgts: arred(multa),
    bruto: arred(bruto),
    inssEmpregado: arred(inssEmp),
    irrf: arred(ir),
    liquidoAutor: arred(liquidoAutor),
    honorarios: arred(honorarios),
    custas: arred(custas),
    patronal: arred(patronal),
    totalReclamada: arred(totalReclamada),
    saldoAposDepositos: arred(totalReclamada - p.depositosRecursais),
    prescrito: arred(prescrito),
    meses,
  };
}

export { brl, ultimoDiaComp };
