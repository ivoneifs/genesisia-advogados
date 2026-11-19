// Contagem de tempo de contribuição.
// - Períodos concomitantes contam uma vez só (vale o mais vantajoso).
// - Tempo especial é convertido em comum só até 13/11/2019 (EC 103, art. 25 §2º).
// - Carência conta meses (competências) com ao menos um dia de período que conta carência.
// A "Linha" guarda somas acumuladas dia a dia, então perguntar o tempo em
// qualquer data custa O(1) — o planejamento faz milhares dessas consultas.

import { DIAS_ANO, EC103, compN, deDiaN, diaN, valida } from "./datas";
import { fatorConversao } from "./tabelas";

export type TipoPeriodo = "comum" | "especial15" | "especial20" | "especial25";

export type Periodo = {
  id: string;
  inicio: string; // AAAA-MM-DD
  fim: string; // AAAA-MM-DD (inclusive)
  tipo: TipoPeriodo;
  descricao?: string;
  professor?: boolean; // efetivo exercício de magistério (educação infantil, fundamental e médio)
  carencia?: boolean; // conta para carência (padrão: sim)
  pcd?: boolean; // trabalhado na condição de pessoa com deficiência (LC 142)
  regime?: "RGPS" | "RPPS"; // INSS ou regime próprio (servidor)
  servicoPublico?: boolean; // efetivo exercício no serviço público
  carreira?: boolean; // na carreira atual
  cargo?: boolean; // no cargo efetivo atual
  projetado?: boolean; // criado pelo planejamento
};

export type Sexo = "M" | "F";

const ESPECIAL: Record<TipoPeriodo, 0 | 15 | 20 | 25> = {
  comum: 0,
  especial15: 15,
  especial20: 20,
  especial25: 25,
};

export type Linha = {
  inicio: number; // diaN do primeiro dia
  fim: number; // diaN do último dia representado
  // somas acumuladas até o dia (índice = dia - inicio)
  bruto: Float64Array; // dias com qualquer período
  convertido: Float64Array; // dias com conversão de especial (até a EC 103)
  esp15: Float64Array;
  esp20: Float64Array;
  esp25: Float64Array;
  professor: Float64Array;
  pcd: Float64Array;
  carencia: Float64Array; // meses de carência acumulados
  servicoPublico: Float64Array;
  carreira: Float64Array;
  cargo: Float64Array;
  rpps: Float64Array;
  primeiraFiliacao: string | null;
  ingressoServicoPublico: string | null;
};

export type TempoNaData = {
  data: string;
  diasBrutos: number;
  diasConvertidos: number;
  anos: number; // convertido, em anos
  especial: { 15: number; 20: number; 25: number }; // dias em cada grau
  diasProfessor: number;
  diasPcd: number;
  carencia: number; // meses
  diasServicoPublico: number;
  diasCarreira: number;
  diasCargo: number;
  diasRpps: number;
};

export function periodosValidos(periodos: Periodo[]): Periodo[] {
  return periodos.filter((p) => valida(p.inicio) && valida(p.fim) && p.fim >= p.inicio);
}

export function montarLinha(periodos: Periodo[], sexo: Sexo, ate?: string): Linha {
  const validos = periodosValidos(periodos);
  if (!validos.length) {
    const z = new Float64Array(1);
    return {
      inicio: 0, fim: 0, bruto: z, convertido: z, esp15: z, esp20: z, esp25: z, professor: z, pcd: z,
      carencia: z, servicoPublico: z, carreira: z, cargo: z, rpps: z, primeiraFiliacao: null, ingressoServicoPublico: null,
    };
  }
  const inicio = Math.min(...validos.map((p) => diaN(p.inicio)));
  let fim = Math.max(...validos.map((p) => diaN(p.fim)));
  if (ate) fim = Math.max(fim, diaN(ate));
  const n = fim - inicio + 1;

  // Melhor grau especial do dia (0 = comum, 15 é o mais vantajoso), flags.
  const coberto = new Uint8Array(n);
  const grau = new Uint8Array(n); // 0 ou 15/20/25
  const prof = new Uint8Array(n);
  const pcd = new Uint8Array(n);
  const car = new Uint8Array(n);
  const spub = new Uint8Array(n);
  const carr = new Uint8Array(n);
  const carg = new Uint8Array(n);
  const rp = new Uint8Array(n);

  for (const p of validos) {
    const a = diaN(p.inicio) - inicio;
    const b = diaN(p.fim) - inicio;
    const g = ESPECIAL[p.tipo] ?? 0;
    const contaCarencia = p.carencia !== false;
    for (let i = a; i <= b; i++) {
      coberto[i] = 1;
      if (g && (!grau[i] || g < grau[i])) grau[i] = g;
      if (p.professor) prof[i] = 1;
      if (p.pcd) pcd[i] = 1;
      if (contaCarencia) car[i] = 1;
      if (p.servicoPublico || p.regime === "RPPS") spub[i] = 1;
      if (p.carreira) carr[i] = 1;
      if (p.cargo) carg[i] = 1;
      if (p.regime === "RPPS") rp[i] = 1;
    }
  }

  const fatores = {
    15: fatorConversao(sexo, 15),
    20: fatorConversao(sexo, 20),
    25: fatorConversao(sexo, 25),
  } as const;
  const limiteConversao = diaN(EC103) - inicio;

  const bruto = new Float64Array(n);
  const convertido = new Float64Array(n);
  const esp15 = new Float64Array(n);
  const esp20 = new Float64Array(n);
  const esp25 = new Float64Array(n);
  const professor = new Float64Array(n);
  const pcdAc = new Float64Array(n);
  const carencia = new Float64Array(n);
  const servicoPublico = new Float64Array(n);
  const carreiraAc = new Float64Array(n);
  const cargoAc = new Float64Array(n);
  const rppsAc = new Float64Array(n);
  let ssp = 0, scr = 0, scg = 0, srp = 0;

  let sb = 0, sc = 0, s15 = 0, s20 = 0, s25 = 0, sp = 0, sd = 0, scar = 0;
  let mesAtual = -1;
  let mesContado = false;
  for (let i = 0; i < n; i++) {
    const comp = compN(deDiaN(inicio + i).slice(0, 7));
    if (comp !== mesAtual) {
      mesAtual = comp;
      mesContado = false;
    }
    if (coberto[i]) {
      sb += 1;
      const g = grau[i] as 0 | 15 | 20 | 25;
      sc += g && i <= limiteConversao ? fatores[g] : 1;
      if (g === 15) s15++;
      else if (g === 20) s20++;
      else if (g === 25) s25++;
      if (prof[i]) sp++;
      if (pcd[i]) sd++;
      if (spub[i]) ssp++;
      if (carr[i]) scr++;
      if (carg[i]) scg++;
      if (rp[i]) srp++;
      if (car[i] && !mesContado) {
        scar++;
        mesContado = true;
      }
    }
    bruto[i] = sb; convertido[i] = sc; esp15[i] = s15; esp20[i] = s20; esp25[i] = s25;
    professor[i] = sp; pcdAc[i] = sd; carencia[i] = scar;
    servicoPublico[i] = ssp; carreiraAc[i] = scr; cargoAc[i] = scg; rppsAc[i] = srp;
  }

  const primeira = validos.map((p) => p.inicio).sort()[0];
  const ingressoSP =
    validos.filter((p) => p.servicoPublico || p.regime === "RPPS").map((p) => p.inicio).sort()[0] ?? null;
  return {
    inicio, fim, bruto, convertido, esp15, esp20, esp25, professor, pcd: pcdAc, carencia,
    servicoPublico, carreira: carreiraAc, cargo: cargoAc, rpps: rppsAc,
    primeiraFiliacao: primeira, ingressoServicoPublico: ingressoSP,
  };
}

export function tempoEm(linha: Linha, data: string): TempoNaData {
  const d = diaN(data);
  if (!linha.primeiraFiliacao || d < linha.inicio) {
    return {
      data, diasBrutos: 0, diasConvertidos: 0, anos: 0, especial: { 15: 0, 20: 0, 25: 0 }, diasProfessor: 0,
      diasPcd: 0, carencia: 0, diasServicoPublico: 0, diasCarreira: 0, diasCargo: 0, diasRpps: 0,
    };
  }
  const i = Math.min(d, linha.fim) - linha.inicio;
  return {
    data,
    diasBrutos: linha.bruto[i],
    diasConvertidos: linha.convertido[i],
    anos: linha.convertido[i] / DIAS_ANO,
    especial: { 15: linha.esp15[i], 20: linha.esp20[i], 25: linha.esp25[i] },
    diasProfessor: linha.professor[i],
    diasPcd: linha.pcd[i],
    carencia: linha.carencia[i],
    diasServicoPublico: linha.servicoPublico[i],
    diasCarreira: linha.carreira[i],
    diasCargo: linha.cargo[i],
    diasRpps: linha.rpps[i],
  };
}

/**
 * Tempo especial equivalente (em anos) para a aposentadoria especial de N anos.
 * Atividade mais nociva converte para a menos nociva pela razão entre os
 * tempos (ex.: 15 → 25 multiplica por 25/15); a menos nociva não entra.
 */
export function anosEspecialEquivalente(t: TempoNaData, n: 15 | 20 | 25): number {
  let dias = 0;
  for (const g of [15, 20, 25] as const) if (g <= n) dias += t.especial[g] * (n / g);
  return dias / DIAS_ANO;
}

/** Resumo por período (para a tabela e o relatório). */
export function resumoPeriodo(p: Periodo, sexo: Sexo) {
  const dias = diaN(p.fim) - diaN(p.inicio) + 1;
  const g = ESPECIAL[p.tipo];
  let convertido = dias;
  if (g) {
    const ate = Math.min(diaN(p.fim), diaN(EC103));
    const diasAntes = Math.max(0, ate - diaN(p.inicio) + 1);
    convertido = diasAntes * fatorConversao(sexo, g) + (dias - diasAntes);
  }
  return { dias, convertido };
}
