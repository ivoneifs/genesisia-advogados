// Regras de aposentadoria do RGPS (INSS): direito adquirido até 13/11/2019,
// transições da EC 103/2019 (arts. 15 a 21), regras permanentes, professor
// e pessoa com deficiência (LC 142/2013).

import { DIAS_ANO, EC103, EC20, competencia, dataDaIdade, fmtAMD, fmtData, idadeEm } from "./datas";
import type { Indices } from "./indices";
import { calcularMedia, evoluirRenda, limitarRenda, type ResultadoMedia, type SalarioContribuicao } from "./media";
import {
  arred,
  bonusFator,
  expectativaSobrevida,
  fatorPrevidenciario,
  idadeArt16,
  idadeArt18,
  pontos8595,
  pontosArt15,
} from "./tabelas";
import { anosEspecialEquivalente, tempoEm, type Linha, type Sexo, type TempoNaData } from "./tempo";

export type GrauPcd = "leve" | "moderada" | "grave";

export type Segurado = {
  nome: string;
  cpf?: string;
  sexo: Sexo;
  nascimento: string;
  der: string; // data de entrada do requerimento (ou data do cálculo)
  pcdGrau?: GrauPcd | null;
};

export type Requisito = { nome: string; exigido: string; atual: string; ok: boolean };

export type ResultadoRegra = {
  id: string;
  nome: string;
  grupo: string;
  fundamento: string;
  aplicavel: boolean;
  motivoNaoAplicavel?: string;
  cumpre: boolean;
  dataAvaliacao: string; // data em que os requisitos foram verificados
  requisitos: Requisito[];
  coeficiente: number;
  fator?: { valor: number; idade: number; tempo: number; expectativa: number; tabua: number; aproximada: boolean; aplicado: boolean };
  media?: ResultadoMedia;
  salarioBeneficio: number;
  rmi: number; // na data de avaliação
  rmiNaDer: number; // reajustada até a DER (direito adquirido)
  memoria: string[];
  observacoes: string[];
  integralidade?: boolean; // proventos = última remuneração do cargo (RPPS)
  paridade?: boolean; // reajuste igual ao dos servidores ativos (RPPS)
};

export type ContextoCalculo = {
  segurado: Segurado;
  linha: Linha;
  salarios: SalarioContribuicao[];
  indices: Indices;
};

/**
 * Tolerância de 2 dias nas comparações de tempo e idade: a contagem em dias
 * com ano de 365,25 pode dar 45,999 anos para o que o INSS conta como 46.
 */
export const TOL = 2 / DIAS_ANO;
export const anos = (dias: number) => dias / DIAS_ANO;
export const fmtAnos = (a: number) => fmtAMD(a * DIAS_ANO);
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function req(nome: string, exigido: string, atual: string, ok: boolean): Requisito {
  return { nome, exigido, atual, ok };
}

export function reqTempo(nome: string, exigidoAnos: number, atualAnos: number): Requisito {
  return req(nome, fmtAnos(exigidoAnos), fmtAnos(atualAnos), atualAnos + TOL >= exigidoAnos);
}

export function reqIdade(exigida: number, atual: number): Requisito {
  const a = Math.floor(exigida);
  const m = Math.round((exigida - a) * 12);
  return req("Idade", `${a} anos${m ? ` e ${m} meses` : ""}`, fmtAnos(atual), atual + 1e-9 >= exigida);
}

function reqCarencia(meses: number, exigida = 180): Requisito {
  return req("Carência", `${exigida} meses`, `${meses} meses`, meses >= exigida);
}

/** Coeficiente do art. 26 da EC 103: 60% + 2% por ano que exceder o limiar. */
export function coeficienteArt26(anosContribuicao: number, limiar: number) {
  return 0.6 + 0.02 * Math.max(0, Math.floor(anosContribuicao + TOL) - limiar);
}

function calcularFator(seg: Segurado, data: string, t: TempoNaData, professor: boolean) {
  const idade = idadeEm(seg.nascimento, data);
  const tc = t.anos + bonusFator(seg.sexo, professor);
  const es = expectativaSobrevida(data, idade);
  const valor = es.valor ? fatorPrevidenciario(tc, idade, es.valor) : 1;
  return { valor, idade, tempo: tc, expectativa: es.valor ?? 0, tabua: es.tabua, aproximada: es.aproximada, aplicado: true };
}

type Definicao = {
  id: string;
  nome: string;
  grupo: string;
  fundamento: string;
  direitoAdquirido?: boolean; // avalia em 13/11/2019
  aplicavel?: (c: ContextoCalculo) => string | null; // motivo se não aplicável
  requisitos: (c: ContextoCalculo, data: string, t: TempoNaData, idade: number) => Requisito[];
  calculo: (
    c: ContextoCalculo,
    data: string,
    t: TempoNaData,
    idade: number
  ) => { criterio: "100" | "80"; coeficiente: number; fator?: "sempre" | "se-favoravel" | "nunca"; professor?: boolean; divisorMinimo?: boolean; memoria?: string[] };
};

const filiadoAte = (c: ContextoCalculo, data: string) => !!c.linha.primeiraFiliacao && c.linha.primeiraFiliacao <= data;
const posReforma = (c: ContextoCalculo) => !filiadoAte(c, EC103);

const exige = (sexo: Sexo, h: number, m: number) => (sexo === "M" ? h : m);

// ---------------------------------------------------------------------------
// Catálogo das regras
// ---------------------------------------------------------------------------

export const REGRAS_RGPS: Definicao[] = [
  // ---- Direito adquirido (requisitos cumpridos até 13/11/2019) ----
  {
    id: "da-atc",
    nome: "Aposentadoria por tempo de contribuição (integral)",
    grupo: "Direito adquirido até 13/11/2019",
    fundamento: "Lei 8.213/91, art. 52 e ss.; CF, art. 201, §7º, I (redação anterior); EC 103, art. 3º",
    direitoAdquirido: true,
    requisitos: (c, _d, t) => [reqTempo("Tempo de contribuição", exige(c.segurado.sexo, 35, 30), t.anos), reqCarencia(t.carencia)],
    calculo: (c, d, t, idade) => {
      const pontos = idade + t.anos;
      const exigidos = pontos8595(d, c.segurado.sexo);
      const semFator = pontos + TOL >= exigidos;
      return {
        criterio: "80",
        coeficiente: 1,
        fator: semFator ? "se-favoravel" : "sempre",
        divisorMinimo: true,
        memoria: [
          `Pontos (idade + tempo): ${pontos.toFixed(2)} — exigidos ${exigidos} para afastar o fator (Lei 13.183/2015).`,
          semFator ? "Fator previdenciário aplicado só se for favorável (> 1)." : "Fator previdenciário obrigatório.",
        ],
      };
    },
  },
  {
    id: "da-proporcional",
    nome: "Aposentadoria proporcional (EC 20/98)",
    grupo: "Direito adquirido até 13/11/2019",
    fundamento: "EC 20/1998, art. 9º, §1º",
    direitoAdquirido: true,
    aplicavel: (c) => (filiadoAte(c, EC20) ? null : "Exige filiação até 16/12/1998."),
    requisitos: (c, _d, t, idade) => {
      const base = exige(c.segurado.sexo, 30, 25);
      const t98 = tempoEm(c.linha, EC20).anos;
      const pedagio = Math.max(0, base - t98) * 0.4;
      return [
        reqIdade(exige(c.segurado.sexo, 53, 48), idade),
        reqTempo(`Tempo (${base} anos + pedágio de 40%)`, base + pedagio, t.anos),
        reqCarencia(t.carencia),
      ];
    },
    calculo: (c, _d, t) => {
      const base = exige(c.segurado.sexo, 30, 25);
      const t98 = tempoEm(c.linha, EC20).anos;
      const exigido = base + Math.max(0, base - t98) * 0.4;
      const extras = Math.floor(Math.max(0, t.anos - exigido) + TOL);
      const coef = Math.min(1, 0.7 + 0.05 * extras);
      return { criterio: "80", coeficiente: coef, fator: "sempre", divisorMinimo: true, memoria: [`Coeficiente: 70% + 5% × ${extras} ano(s) além do exigido = ${pct(coef)}.`] };
    },
  },
  {
    id: "da-idade",
    nome: "Aposentadoria por idade",
    grupo: "Direito adquirido até 13/11/2019",
    fundamento: "Lei 8.213/91, arts. 48 e 50",
    direitoAdquirido: true,
    requisitos: (c, _d, t, idade) => [reqIdade(exige(c.segurado.sexo, 65, 60), idade), reqCarencia(t.carencia)],
    calculo: (_c, _d, t) => {
      const grupos = Math.floor(t.carencia / 12);
      const coef = Math.min(1, 0.7 + 0.01 * grupos);
      return { criterio: "80", coeficiente: coef, fator: "se-favoravel", divisorMinimo: true, memoria: [`Coeficiente: 70% + 1% × ${grupos} grupo(s) de 12 contribuições = ${pct(coef)}.`] };
    },
  },
  {
    id: "da-especial",
    nome: "Aposentadoria especial",
    grupo: "Direito adquirido até 13/11/2019",
    fundamento: "Lei 8.213/91, art. 57",
    direitoAdquirido: true,
    requisitos: (_c, _d, t) => {
      const melhor = ([15, 20, 25] as const).map((n) => ({ n, a: anosEspecialEquivalente(t, n) })).sort((x, y) => y.a / y.n - x.a / x.n)[0];
      return [reqTempo(`Tempo especial (${melhor.n} anos)`, melhor.n, melhor.a), reqCarencia(t.carencia)];
    },
    calculo: () => ({ criterio: "80", coeficiente: 1, fator: "nunca" }),
  },
  {
    id: "da-professor",
    nome: "Aposentadoria do professor",
    grupo: "Direito adquirido até 13/11/2019",
    fundamento: "CF, art. 201, §8º (redação anterior); Lei 8.213/91, art. 56",
    direitoAdquirido: true,
    aplicavel: (c) => (tempoEm(c.linha, EC103).diasProfessor > 0 ? null : "Sem períodos de magistério."),
    requisitos: (c, _d, t) => [reqTempo("Tempo de magistério", exige(c.segurado.sexo, 30, 25), anos(t.diasProfessor)), reqCarencia(t.carencia)],
    calculo: (c, d, t, idade) => {
      const pontos = idade + t.anos + 5;
      const semFator = pontos + TOL >= pontos8595(d, c.segurado.sexo);
      return { criterio: "80", coeficiente: 1, fator: semFator ? "se-favoravel" : "sempre", professor: true, divisorMinimo: true, memoria: [`Pontos com bônus de 5 (professor): ${pontos.toFixed(2)}.`] };
    },
  },

  // ---- Transições da EC 103 ----
  {
    id: "art15",
    nome: "Transição por pontos",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 15",
    aplicavel: (c) => (posReforma(c) ? "Só para filiados até 13/11/2019." : null),
    requisitos: (c, d, t, idade) => [
      reqTempo("Tempo de contribuição", exige(c.segurado.sexo, 35, 30), t.anos),
      req("Pontos (idade + tempo)", String(pontosArt15(d, c.segurado.sexo)), (idade + t.anos).toFixed(2), idade + t.anos + TOL >= pontosArt15(d, c.segurado.sexo)),
      reqCarencia(t.carencia),
    ],
    calculo: (c, _d, t) => {
      const coef = coeficienteArt26(t.anos, exige(c.segurado.sexo, 20, 15));
      return { criterio: "100", coeficiente: coef, memoria: [`Coeficiente: 60% + 2% por ano acima de ${exige(c.segurado.sexo, 20, 15)} = ${pct(coef)}.`] };
    },
  },
  {
    id: "art16",
    nome: "Transição por idade mínima progressiva",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 16",
    aplicavel: (c) => (posReforma(c) ? "Só para filiados até 13/11/2019." : null),
    requisitos: (c, d, t, idade) => [
      reqTempo("Tempo de contribuição", exige(c.segurado.sexo, 35, 30), t.anos),
      reqIdade(idadeArt16(d, c.segurado.sexo), idade),
      reqCarencia(t.carencia),
    ],
    calculo: (c, _d, t) => {
      const coef = coeficienteArt26(t.anos, exige(c.segurado.sexo, 20, 15));
      return { criterio: "100", coeficiente: coef, memoria: [`Coeficiente: 60% + 2% por ano acima de ${exige(c.segurado.sexo, 20, 15)} = ${pct(coef)}.`] };
    },
  },
  {
    id: "art17",
    nome: "Transição com pedágio de 50%",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 17",
    aplicavel: (c) => {
      if (posReforma(c)) return "Só para filiados até 13/11/2019.";
      const t0 = tempoEm(c.linha, EC103).anos;
      const min = exige(c.segurado.sexo, 33, 28);
      return t0 > min ? null : `Exige mais de ${min} anos de contribuição em 13/11/2019 (tinha ${fmtAnos(t0)}).`;
    },
    requisitos: (c, _d, t) => {
      const base = exige(c.segurado.sexo, 35, 30);
      const t0 = tempoEm(c.linha, EC103).anos;
      const pedagio = Math.max(0, base - t0) * 0.5;
      return [reqTempo(`Tempo (${base} anos + pedágio de 50%: ${fmtAnos(pedagio)})`, base + pedagio, t.anos), reqCarencia(t.carencia)];
    },
    calculo: () => ({ criterio: "100", coeficiente: 1, fator: "sempre", memoria: ["Média de 100% dos salários multiplicada pelo fator previdenciário."] }),
  },
  {
    id: "art18",
    nome: "Transição da aposentadoria por idade",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 18",
    aplicavel: (c) => (posReforma(c) ? "Só para filiados até 13/11/2019." : null),
    requisitos: (c, d, t, idade) => [reqIdade(idadeArt18(d, c.segurado.sexo), idade), reqTempo("Tempo de contribuição", 15, t.anos), reqCarencia(t.carencia)],
    calculo: (c, _d, t) => {
      const coef = coeficienteArt26(t.anos, exige(c.segurado.sexo, 20, 15));
      return { criterio: "100", coeficiente: coef, memoria: [`Coeficiente: 60% + 2% por ano acima de ${exige(c.segurado.sexo, 20, 15)} = ${pct(coef)}.`] };
    },
  },
  {
    id: "art20",
    nome: "Transição com pedágio de 100%",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 20",
    aplicavel: (c) => (posReforma(c) ? "Só para filiados até 13/11/2019." : null),
    requisitos: (c, _d, t, idade) => {
      const base = exige(c.segurado.sexo, 35, 30);
      const t0 = tempoEm(c.linha, EC103).anos;
      const pedagio = Math.max(0, base - t0);
      return [reqIdade(exige(c.segurado.sexo, 60, 57), idade), reqTempo(`Tempo (${base} anos + pedágio de 100%: ${fmtAnos(pedagio)})`, base + pedagio, t.anos), reqCarencia(t.carencia)];
    },
    calculo: () => ({ criterio: "100", coeficiente: 1, memoria: ["100% da média de todos os salários."] }),
  },
  {
    id: "art21",
    nome: "Transição da aposentadoria especial (pontos)",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 21",
    aplicavel: (c) => {
      if (posReforma(c)) return "Só para filiados até 13/11/2019.";
      const t = tempoEm(c.linha, "2100-01-01");
      return t.especial[15] + t.especial[20] + t.especial[25] > 0 ? null : "Sem períodos especiais.";
    },
    requisitos: (_c, _d, t, idade) => {
      const opcoes = ([15, 20, 25] as const).map((n) => ({ n, a: anosEspecialEquivalente(t, n), pontos: { 15: 66, 20: 76, 25: 86 }[n] }));
      const melhor = opcoes.sort((x, y) => y.a / y.n - x.a / x.n)[0];
      return [
        reqTempo(`Efetiva exposição (${melhor.n} anos)`, melhor.n, melhor.a),
        req("Pontos (idade + tempo)", String(melhor.pontos), (idade + t.anos).toFixed(2), idade + t.anos + TOL >= melhor.pontos),
        reqCarencia(t.carencia),
      ];
    },
    calculo: (c, _d, t) => {
      const grau = ([15, 20, 25] as const).map((n) => ({ n, a: anosEspecialEquivalente(t, n) })).sort((x, y) => y.a / y.n - x.a / x.n)[0].n;
      const limiar = grau === 15 ? 15 : exige(c.segurado.sexo, 20, 15);
      const coef = coeficienteArt26(t.anos, limiar);
      return { criterio: "100", coeficiente: coef, memoria: [`Coeficiente: 60% + 2% por ano acima de ${limiar} = ${pct(coef)}.`] };
    },
  },
  {
    id: "art15-prof",
    nome: "Professor — transição por pontos",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 15, §3º",
    aplicavel: (c) => (posReforma(c) ? "Só para filiados até 13/11/2019." : tempoEm(c.linha, "2100-01-01").diasProfessor > 0 ? null : "Sem períodos de magistério."),
    requisitos: (c, d, t, idade) => {
      const p = pontosArt15(d, c.segurado.sexo, true);
      return [reqTempo("Tempo de magistério", exige(c.segurado.sexo, 30, 25), anos(t.diasProfessor)), req("Pontos (idade + tempo)", String(p), (idade + t.anos).toFixed(2), idade + t.anos + TOL >= p), reqCarencia(t.carencia)];
    },
    calculo: (c, _d, t) => ({ criterio: "100", coeficiente: coeficienteArt26(t.anos, exige(c.segurado.sexo, 20, 15)) }),
  },
  {
    id: "art16-prof",
    nome: "Professor — idade mínima progressiva",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 16, §2º",
    aplicavel: (c) => (posReforma(c) ? "Só para filiados até 13/11/2019." : tempoEm(c.linha, "2100-01-01").diasProfessor > 0 ? null : "Sem períodos de magistério."),
    requisitos: (c, d, t, idade) => [reqTempo("Tempo de magistério", exige(c.segurado.sexo, 30, 25), anos(t.diasProfessor)), reqIdade(idadeArt16(d, c.segurado.sexo, true), idade), reqCarencia(t.carencia)],
    calculo: (c, _d, t) => ({ criterio: "100", coeficiente: coeficienteArt26(t.anos, exige(c.segurado.sexo, 20, 15)) }),
  },
  {
    id: "art20-prof",
    nome: "Professor — pedágio de 100%",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 20, §1º",
    aplicavel: (c) => (posReforma(c) ? "Só para filiados até 13/11/2019." : tempoEm(c.linha, "2100-01-01").diasProfessor > 0 ? null : "Sem períodos de magistério."),
    requisitos: (c, _d, t, idade) => {
      const base = exige(c.segurado.sexo, 30, 25);
      const t0 = anos(tempoEm(c.linha, EC103).diasProfessor);
      const pedagio = Math.max(0, base - t0);
      return [reqIdade(exige(c.segurado.sexo, 55, 52), idade), reqTempo(`Magistério (${base} anos + pedágio de 100%)`, base + pedagio, anos(t.diasProfessor)), reqCarencia(t.carencia)];
    },
    calculo: () => ({ criterio: "100", coeficiente: 1 }),
  },

  // ---- Regras permanentes (filiados depois da EC 103) ----
  {
    id: "art19",
    nome: "Aposentadoria programada (regra permanente)",
    grupo: "Regra permanente",
    fundamento: "EC 103/2019, art. 19; CF, art. 201, §7º, I",
    aplicavel: (c) => (posReforma(c) ? null : "Filiado antes da reforma: aplica-se a transição do art. 18."),
    requisitos: (c, _d, t, idade) => [reqIdade(exige(c.segurado.sexo, 65, 62), idade), reqTempo("Tempo de contribuição", exige(c.segurado.sexo, 20, 15), t.anos), reqCarencia(t.carencia)],
    calculo: (c, _d, t) => ({ criterio: "100", coeficiente: coeficienteArt26(t.anos, exige(c.segurado.sexo, 20, 15)) }),
  },
  {
    id: "art19-especial",
    nome: "Aposentadoria especial (regra permanente)",
    grupo: "Regra permanente",
    fundamento: "EC 103/2019, art. 19, §1º, I",
    aplicavel: (c) => (posReforma(c) ? null : "Filiado antes da reforma: aplica-se a transição do art. 21."),
    requisitos: (_c, _d, t, idade) => {
      const melhor = ([15, 20, 25] as const).map((n) => ({ n, a: anosEspecialEquivalente(t, n), idade: { 15: 55, 20: 58, 25: 60 }[n] })).sort((x, y) => y.a / y.n - x.a / x.n)[0];
      return [reqIdade(melhor.idade, idade), reqTempo(`Efetiva exposição (${melhor.n} anos)`, melhor.n, melhor.a), reqCarencia(t.carencia)];
    },
    calculo: (c, _d, t) => ({ criterio: "100", coeficiente: coeficienteArt26(t.anos, exige(c.segurado.sexo, 20, 15)) }),
  },
  {
    id: "art19-prof",
    nome: "Professor (regra permanente)",
    grupo: "Regra permanente",
    fundamento: "EC 103/2019, art. 19, §1º, II",
    aplicavel: (c) => (!posReforma(c) ? "Filiado antes da reforma: aplicam-se as transições do professor." : tempoEm(c.linha, "2100-01-01").diasProfessor > 0 ? null : "Sem períodos de magistério."),
    requisitos: (c, _d, t, idade) => [reqIdade(exige(c.segurado.sexo, 60, 57), idade), reqTempo("Tempo de magistério", 25, anos(t.diasProfessor)), reqCarencia(t.carencia)],
    calculo: (c, _d, t) => ({ criterio: "100", coeficiente: coeficienteArt26(t.anos, exige(c.segurado.sexo, 20, 15)) }),
  },

  // ---- Pessoa com deficiência (LC 142/2013, mantida pelo art. 22 da EC 103) ----
  {
    id: "pcd-tempo",
    nome: "Pessoa com deficiência — por tempo",
    grupo: "Pessoa com deficiência (LC 142/2013)",
    fundamento: "LC 142/2013, art. 3º, I a III; EC 103, art. 22",
    aplicavel: (c) => (c.segurado.pcdGrau ? null : "Segurado não marcado como pessoa com deficiência."),
    requisitos: (c, _d, t) => {
      const g = c.segurado.pcdGrau ?? "leve";
      const exigido = { grave: exige(c.segurado.sexo, 25, 20), moderada: exige(c.segurado.sexo, 29, 24), leve: exige(c.segurado.sexo, 33, 28) }[g];
      return [reqTempo(`Tempo como PcD (deficiência ${g})`, exigido, anos(t.diasPcd)), reqCarencia(t.carencia)];
    },
    calculo: () => ({ criterio: "80", coeficiente: 1, fator: "se-favoravel", memoria: ["LC 142: 100% da média dos 80% maiores; fator só se favorável."] }),
  },
  {
    id: "pcd-idade",
    nome: "Pessoa com deficiência — por idade",
    grupo: "Pessoa com deficiência (LC 142/2013)",
    fundamento: "LC 142/2013, art. 3º, IV; EC 103, art. 22",
    aplicavel: (c) => (c.segurado.pcdGrau ? null : "Segurado não marcado como pessoa com deficiência."),
    requisitos: (c, _d, t, idade) => [reqIdade(exige(c.segurado.sexo, 60, 55), idade), reqTempo("Tempo como PcD", 15, anos(t.diasPcd)), reqCarencia(t.carencia)],
    calculo: (_c, _d, t) => {
      const coef = Math.min(1, 0.7 + 0.01 * Math.floor(t.carencia / 12));
      return { criterio: "80", coeficiente: coef, fator: "se-favoravel" };
    },
  },
];

// ---------------------------------------------------------------------------
// Avaliação
// ---------------------------------------------------------------------------

/** Só os requisitos (sem calcular a renda) — usado nas buscas do planejamento. */
export function cumpreRegra(def: Definicao, c: ContextoCalculo, dataAlvo: string): boolean {
  const data = def.direitoAdquirido && dataAlvo > EC103 ? EC103 : dataAlvo;
  if (def.aplicavel?.(c)) return false;
  const t = tempoEm(c.linha, data);
  return def.requisitos(c, data, t, idadeEm(c.segurado.nascimento, data)).every((r) => r.ok);
}

export function avaliarRegra(def: Definicao, c: ContextoCalculo, dataAlvo?: string): ResultadoRegra {
  const der = dataAlvo ?? c.segurado.der;
  const data = def.direitoAdquirido && der > EC103 ? EC103 : der;
  const t = tempoEm(c.linha, data);
  const idade = idadeEm(c.segurado.nascimento, data);
  const motivo = def.aplicavel?.(c) ?? null;
  const base: ResultadoRegra = {
    id: def.id,
    nome: def.nome,
    grupo: def.grupo,
    fundamento: def.fundamento,
    aplicavel: !motivo,
    motivoNaoAplicavel: motivo ?? undefined,
    cumpre: false,
    dataAvaliacao: data,
    requisitos: [],
    coeficiente: 0,
    salarioBeneficio: 0,
    rmi: 0,
    rmiNaDer: 0,
    memoria: [],
    observacoes: [],
  };
  if (motivo) return base;

  base.requisitos = def.requisitos(c, data, t, idade);
  base.cumpre = base.requisitos.every((r) => r.ok);

  const calc = def.calculo(c, data, t, idade);
  const media = calcularMedia({
    salarios: c.salarios,
    dib: data,
    indices: c.indices,
    criterio: calc.criterio,
    aplicarDivisorMinimo: calc.divisorMinimo,
    primeiraFiliacao: c.linha.primeiraFiliacao,
    divisor108: true,
  });
  base.media = media;
  base.coeficiente = calc.coeficiente;
  base.memoria.push(
    `Média ${calc.criterio === "100" ? "de 100% dos salários" : "dos 80% maiores salários"} desde 07/1994: ${brl(media.media)} (${media.usados} salário(s), divisor ${media.divisor}).`
  );
  base.memoria.push(...(calc.memoria ?? []));

  let sb = media.media;
  if (calc.fator && calc.fator !== "nunca") {
    const f = calcularFator(c.segurado, data, t, !!calc.professor);
    const aplicar = calc.fator === "sempre" || f.valor > 1;
    f.aplicado = aplicar;
    base.fator = f;
    base.memoria.push(
      `Fator previdenciário: ${f.valor.toFixed(4)} (idade ${f.idade.toFixed(2)}, tempo ${f.tempo.toFixed(2)}, expectativa ${f.expectativa} — tábua IBGE ${f.tabua})${aplicar ? "" : " — não aplicado (desfavorável)"}.`
    );
    if (f.aproximada) base.observacoes.push(`Tábua de mortalidade do IBGE ${f.tabua} usada por aproximação: confira a expectativa de sobrevida oficial para a data.`);
    if (aplicar) sb *= f.valor;
  }

  // Antes da reforma, o salário de benefício é limitado ao teto antes do coeficiente.
  if (calc.criterio === "80") sb = Math.min(sb, limitarRenda(sb, data).valor);
  base.salarioBeneficio = arred(sb);
  const bruto = sb * calc.coeficiente;
  const lim = limitarRenda(bruto, data);
  base.rmi = lim.valor;
  base.memoria.push(`RMI: ${brl(base.salarioBeneficio)} × ${pct(calc.coeficiente)} = ${brl(bruto)}${lim.limitadoTeto ? " → limitada ao teto" : lim.elevadoPiso ? " → elevada ao salário mínimo" : ""}: ${brl(lim.valor)}.`);
  base.observacoes.push(...media.avisos);

  base.rmiNaDer = base.rmi;
  if (def.direitoAdquirido && der > EC103 && base.rmi > 0) {
    base.rmiNaDer = evoluirRenda(base.rmi, EC103, competencia(der), c.indices);
    base.memoria.push(`RMI em 13/11/2019 reajustada pelos índices do INSS até ${fmtData(der)}: ${brl(base.rmiNaDer)}.`);
  }
  return base;
}

export function analisarRgps(c: ContextoCalculo): ResultadoRegra[] {
  return REGRAS_RGPS.map((def) => avaliarRegra(def, c));
}

/** Melhor benefício já disponível na DER (maior renda). */
export function melhorRegra(resultados: ResultadoRegra[]): ResultadoRegra | null {
  return resultados.filter((r) => r.aplicavel && r.cumpre).sort((a, b) => b.rmiNaDer - a.rmiNaDer)[0] ?? null;
}

export function dataCompletaIdade(seg: Segurado, idade: number) {
  return dataDaIdade(seg.nascimento, idade);
}
