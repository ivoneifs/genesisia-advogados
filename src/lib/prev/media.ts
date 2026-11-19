// Salário de benefício: correção dos salários de contribuição (INPC, art. 29-B
// da Lei 8.213/91), limitação ao teto, média de 100% (EC 103, art. 26) ou dos
// 80% maiores (regra anterior, Lei 9.876/99) e divisor mínimo.

import { EC103, INICIO_PBC, LEI_9876, compN, competencia, deCompN, somaComp } from "./datas";
import { fatorComposto, type Indices } from "./indices";
import { arred, salarioMinimo, teto } from "./tabelas";

export type SalarioContribuicao = { comp: string; valor: number; origem?: string };

export type ItemMedia = {
  comp: string;
  valor: number; // soma do mês (vários vínculos)
  limitado: number; // depois do teto
  fator: number;
  corrigido: number;
  usado: boolean;
  motivo?: string; // por que ficou de fora
};

export type ResultadoMedia = {
  media: number;
  soma: number;
  divisor: number;
  quantidade: number; // salários válidos no PBC
  usados: number;
  criterio: "100" | "80";
  divisorMinimo: boolean;
  itens: ItemMedia[];
  avisos: string[];
};

export function agruparSalarios(salarios: SalarioContribuicao[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of salarios) {
    if (!/^\d{4}-\d{2}$/.test(s.comp) || !(s.valor > 0)) continue;
    m.set(s.comp, (m.get(s.comp) ?? 0) + s.valor);
  }
  return m;
}

export function calcularMedia(opts: {
  salarios: SalarioContribuicao[];
  dib: string; // AAAA-MM-DD
  indices: Indices;
  criterio: "100" | "80";
  aplicarDivisorMinimo?: boolean; // ATC e idade, filiados até 28/11/1999
  primeiraFiliacao?: string | null;
  limitarAoTeto?: boolean; // padrão: sim
  divisor108?: boolean; // aposentadorias (exceto incapacidade) — Lei 8.213, art. 135-A
}): ResultadoMedia {
  const { salarios, dib, indices, criterio } = opts;
  const limitar = opts.limitarAoTeto !== false;
  const ultimaComp = somaComp(competencia(dib), -1);
  const agrupados = agruparSalarios(salarios);
  const avisos: string[] = [];
  const itens: ItemMedia[] = [];

  for (const [comp, valor] of [...agrupados.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (comp < INICIO_PBC || comp > ultimaComp) continue;
    const t = teto(comp);
    const limitado = limitar ? Math.min(valor, t) : valor;
    // Correção pelo INPC dos meses seguintes à competência até o mês anterior
    // ao início do benefício (a última competência do PBC tem fator 1).
    const fator = comp < ultimaComp ? fatorComposto(indices, "INPC", somaComp(comp, 1), ultimaComp) : 1;
    const item: ItemMedia = { comp, valor, limitado, fator, corrigido: limitado * fator, usado: true };
    // EC 103, art. 29: depois da reforma, competência abaixo do mínimo não conta.
    if (comp >= competencia(EC103) && valor < salarioMinimo(comp) - 0.005) {
      item.usado = false;
      item.motivo = "abaixo do salário mínimo (EC 103, art. 29) — pode ser complementada";
    }
    itens.push(item);
  }

  const validos = itens.filter((i) => i.usado);
  let usadosLista = validos;
  if (criterio === "80" && validos.length) {
    const qtd = Math.max(1, Math.floor(validos.length * 0.8));
    const maiores = new Set(
      [...validos].sort((a, b) => b.corrigido - a.corrigido).slice(0, qtd).map((i) => i.comp)
    );
    for (const i of validos) {
      if (!maiores.has(i.comp)) {
        i.usado = false;
        i.motivo = "descartado (20% menores)";
      }
    }
    usadosLista = validos.filter((i) => i.usado);
  }

  const soma = usadosLista.reduce((s, i) => s + i.corrigido, 0);
  let divisor = usadosLista.length;
  let divisorMinimo = false;
  if (
    criterio === "80" &&
    opts.aplicarDivisorMinimo &&
    opts.primeiraFiliacao &&
    opts.primeiraFiliacao <= LEI_9876
  ) {
    // Lei 9.876/99, art. 3º, §2º: divisor ≥ 60% do período desde 07/1994,
    // limitado a 100% das contribuições.
    const meses = compN(ultimaComp) - compN(INICIO_PBC) + 1;
    const minimo = Math.min(validos.length, Math.ceil(meses * 0.6));
    if (minimo > divisor) {
      divisor = minimo;
      divisorMinimo = true;
      avisos.push(`Divisor mínimo aplicado: ${minimo} (60% do período desde 07/1994).`);
    }
  }

  // Lei 14.331/2022 (art. 135-A da Lei 8.213): filiado até 07/1994, DIB a partir
  // de 05/05/2022, aposentadoria (exceto por incapacidade): divisor mínimo de 108.
  if (
    opts.divisor108 &&
    criterio === "100" &&
    dib >= "2022-05-05" &&
    opts.primeiraFiliacao &&
    opts.primeiraFiliacao <= "1994-07-31" &&
    divisor < 108 &&
    usadosLista.length
  ) {
    divisor = 108;
    divisorMinimo = true;
    avisos.push("Divisor mínimo de 108 aplicado (Lei 8.213/91, art. 135-A — filiado até 07/1994).");
  }

  if (!itens.length) avisos.push("Nenhum salário de contribuição no período básico de cálculo (desde 07/1994).");
  const semIndice = !indices.INPC || !Object.keys(indices.INPC).length;
  if (semIndice) avisos.push("Índices do INPC indisponíveis: salários sem correção.");

  return {
    media: divisor ? soma / divisor : 0,
    soma,
    divisor,
    quantidade: validos.length,
    usados: usadosLista.length,
    criterio,
    divisorMinimo,
    itens,
    avisos,
  };
}

/** Piso (salário mínimo) e teto na data de início do benefício. */
export function limitarRenda(valor: number, dib: string): { valor: number; limitadoTeto: boolean; elevadoPiso: boolean } {
  const comp = competencia(dib);
  const t = teto(comp);
  const sm = salarioMinimo(comp);
  if (valor > t) return { valor: t, limitadoTeto: true, elevadoPiso: false };
  if (valor < sm) return { valor: sm, limitadoTeto: false, elevadoPiso: true };
  return { valor: arred(valor), limitadoTeto: false, elevadoPiso: false };
}

/** Média dos últimos 12 salários de contribuição (teto do auxílio por incapacidade). */
export function mediaUltimos12(salarios: SalarioContribuicao[], dib: string, indices: Indices): number {
  const ultimaComp = somaComp(competencia(dib), -1);
  const agrupados = agruparSalarios(salarios);
  const comps = [...agrupados.keys()].filter((c) => c <= ultimaComp).sort().slice(-12);
  if (!comps.length) return 0;
  const soma = comps.reduce((s, c) => {
    const fator = c < ultimaComp ? fatorComposto(indices, "INPC", somaComp(c, 1), ultimaComp) : 1;
    return s + Math.min(agrupados.get(c)!, teto(c)) * fator;
  }, 0);
  return soma / comps.length;
}

/**
 * Reajuste anual do benefício (INSS): em janeiro, INPC acumulado do ano
 * anterior; no primeiro ano, proporcional desde o mês de início.
 */
export function reajusteAnual(indices: Indices, ano: number, dib: string): number {
  const inicioAno = `${ano - 1}-01`;
  const de = competencia(dib) > inicioAno ? competencia(dib) : inicioAno;
  if (de > `${ano - 1}-12`) return 0;
  return fatorComposto(indices, "INPC", de, `${ano - 1}-12`) - 1;
}

/** Evolui a renda mensal desde a DIB até a competência `ate`. */
export function evoluirRenda(rmi: number, dib: string, ate: string, indices: Indices, piso = true): number {
  let renda = rmi;
  const anoIni = Number(dib.slice(0, 4));
  const anoFim = Number(ate.slice(0, 4));
  for (let ano = anoIni + 1; ano <= anoFim; ano++) {
    const sm = salarioMinimo(`${ano}-01`);
    const eraPiso = Math.abs(renda - salarioMinimo(`${ano - 1}-12`)) < 0.01;
    renda = eraPiso && piso ? sm : renda * (1 + reajusteAnual(indices, ano, dib));
    if (piso && renda < sm) renda = sm;
    renda = Math.min(renda, teto(`${ano}-01`));
  }
  return arred(renda);
}

export { deCompN };
