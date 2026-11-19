// Regime próprio dos servidores públicos federais (RPPS da União):
// direito adquirido (CF art. 40 com EC 41/2003; EC 41 arts. 2º e 6º; EC 47 art. 3º),
// transições da EC 103/2019 (arts. 4º, 20 e 21), regras permanentes (art. 10),
// compulsória, incapacidade permanente, Benefício Especial e abono de permanência.

import { DIAS_ANO, EC103, EC20, competencia, idadeEm, somaComp } from "./datas";
import type { Indices } from "./indices";
import { fatorComposto } from "./indices";
import { calcularMedia, agruparSalarios, type SalarioContribuicao } from "./media";
import {
  TOL,
  anos,
  coeficienteArt26,
  fmtAnos,
  req,
  reqIdade,
  reqTempo,
  type Requisito,
  type ResultadoRegra,
  type Segurado,
} from "./rgps";
import { arred, teto } from "./tabelas";
import { anosEspecialEquivalente, tempoEm, type Linha, type TempoNaData } from "./tempo";

export type Servidor = Segurado & {
  ingressoServicoPublico?: string | null; // se vazio, usa o primeiro período no serviço público
  remuneracaoCargo: number; // remuneração atual no cargo efetivo (base da integralidade)
  rpc: boolean; // sujeito ao teto do RGPS (previdência complementar / Funpresp)
};

export type ContextoRpps = {
  servidor: Servidor;
  linha: Linha;
  salarios: SalarioContribuicao[];
  indices: Indices;
};

const EC41 = "2003-12-31";
const exige = (sexo: "M" | "F", h: number, m: number) => (sexo === "M" ? h : m);
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${(v * 100).toFixed(1).replace(".0", "")}%`;

function ingresso(c: ContextoRpps): string | null {
  return c.servidor.ingressoServicoPublico || c.linha.ingressoServicoPublico;
}

type Proventos =
  | { tipo: "integralidade" }
  | { tipo: "media"; criterio: "100" | "80"; coeficiente: number; proporcao?: number; nota?: string };

type DefRpps = {
  id: string;
  nome: string;
  grupo: string;
  fundamento: string;
  direitoAdquirido?: boolean;
  aplicavel?: (c: ContextoRpps) => string | null;
  requisitos: (c: ContextoRpps, data: string, t: TempoNaData, idade: number) => Requisito[];
  proventos: (c: ContextoRpps, data: string, t: TempoNaData, idade: number) => Proventos;
};

const sp = (t: TempoNaData) => anos(t.diasServicoPublico);
const carreira = (t: TempoNaData) => anos(t.diasCarreira);
const cargo = (t: TempoNaData) => anos(t.diasCargo);
const magisterio = (t: TempoNaData) => anos(t.diasProfessor);
const temMagisterio = (c: ContextoRpps) => (tempoEm(c.linha, "2100-01-01").diasProfessor > 0 ? null : "Sem períodos de magistério.");

const ingressoAte = (data: string, rotulo: string) => (c: ContextoRpps) => {
  const i = ingresso(c);
  if (!i) return "Informe a data de ingresso no serviço público.";
  return i <= data ? null : `Exige ingresso no serviço público até ${rotulo}.`;
};

export const REGRAS_RPPS: DefRpps[] = [
  // ---- Direito adquirido até 13/11/2019 ----
  {
    id: "rpps-ec47-art3",
    nome: "EC 47/2005, art. 3º (integralidade e paridade)",
    grupo: "Direito adquirido até 13/11/2019",
    fundamento: "EC 47/2005, art. 3º; EC 103, art. 3º",
    direitoAdquirido: true,
    aplicavel: ingressoAte(EC20, "16/12/1998"),
    requisitos: (c, _d, t, idade) => {
      const base = exige(c.servidor.sexo, 35, 30);
      const excedente = Math.max(0, Math.floor(t.anos - base + TOL));
      const idadeMin = exige(c.servidor.sexo, 60, 55) - excedente;
      return [
        reqTempo("Tempo de contribuição", base, t.anos),
        reqIdade(idadeMin, idade),
        reqTempo("Serviço público", 25, sp(t)),
        reqTempo("Carreira", 15, carreira(t)),
        reqTempo("Cargo", 5, cargo(t)),
      ];
    },
    proventos: () => ({ tipo: "integralidade" }),
  },
  {
    id: "rpps-ec41-art6",
    nome: "EC 41/2003, art. 6º (integralidade e paridade)",
    grupo: "Direito adquirido até 13/11/2019",
    fundamento: "EC 41/2003, art. 6º; EC 47/2005, art. 2º",
    direitoAdquirido: true,
    aplicavel: ingressoAte(EC41, "31/12/2003"),
    requisitos: (c, _d, t, idade) => [
      reqIdade(exige(c.servidor.sexo, 60, 55), idade),
      reqTempo("Tempo de contribuição", exige(c.servidor.sexo, 35, 30), t.anos),
      reqTempo("Serviço público", 20, sp(t)),
      reqTempo("Carreira", 10, carreira(t)),
      reqTempo("Cargo", 5, cargo(t)),
    ],
    proventos: () => ({ tipo: "integralidade" }),
  },
  {
    id: "rpps-ec41-art2",
    nome: "EC 41/2003, art. 2º (com redutor)",
    grupo: "Direito adquirido até 13/11/2019",
    fundamento: "EC 41/2003, art. 2º",
    direitoAdquirido: true,
    aplicavel: ingressoAte(EC20, "16/12/1998"),
    requisitos: (c, _d, t, idade) => {
      const base = exige(c.servidor.sexo, 35, 30);
      const t98 = tempoEm(c.linha, EC20).anos;
      const pedagio = Math.max(0, base - t98) * 0.2;
      return [
        reqIdade(exige(c.servidor.sexo, 53, 48), idade),
        reqTempo(`Tempo (${base} anos + pedágio de 20%)`, base + pedagio, t.anos),
        reqTempo("Cargo", 5, cargo(t)),
      ];
    },
    proventos: (c, d, _t, idade) => {
      const antecipados = Math.max(0, Math.ceil(exige(c.servidor.sexo, 60, 55) - idade - 1e-9));
      const taxa = d >= "2006-01-01" ? 0.05 : 0.035;
      const red = Math.min(1, antecipados * taxa);
      return { tipo: "media", criterio: "80", coeficiente: 1 - red, nota: `Redutor de ${pct(taxa)} × ${antecipados} ano(s) antecipado(s) = ${pct(red)}.` };
    },
  },
  {
    id: "rpps-art40-voluntaria",
    nome: "Voluntária por idade e tempo (art. 40, §1º, III, a)",
    grupo: "Direito adquirido até 13/11/2019",
    fundamento: "CF, art. 40, §1º, III, a (redação da EC 41/2003); Lei 10.887/2004",
    direitoAdquirido: true,
    requisitos: (c, _d, t, idade) => [
      reqIdade(exige(c.servidor.sexo, 60, 55), idade),
      reqTempo("Tempo de contribuição", exige(c.servidor.sexo, 35, 30), t.anos),
      reqTempo("Serviço público", 10, sp(t)),
      reqTempo("Cargo", 5, cargo(t)),
    ],
    proventos: () => ({ tipo: "media", criterio: "80", coeficiente: 1 }),
  },
  {
    id: "rpps-art40-idade",
    nome: "Voluntária por idade, proporcional (art. 40, §1º, III, b)",
    grupo: "Direito adquirido até 13/11/2019",
    fundamento: "CF, art. 40, §1º, III, b (redação da EC 41/2003)",
    direitoAdquirido: true,
    requisitos: (c, _d, t, idade) => [reqIdade(exige(c.servidor.sexo, 65, 60), idade), reqTempo("Serviço público", 10, sp(t)), reqTempo("Cargo", 5, cargo(t))],
    proventos: (c, _d, t) => {
      const prop = Math.min(1, t.anos / exige(c.servidor.sexo, 35, 30));
      return { tipo: "media", criterio: "80", coeficiente: prop, nota: `Proporcional ao tempo: ${fmtAnos(t.anos)} / ${exige(c.servidor.sexo, 35, 30)} anos = ${pct(prop)}.` };
    },
  },

  // ---- Transições da EC 103 ----
  {
    id: "rpps-art4",
    nome: "Transição por pontos (art. 4º)",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 4º",
    aplicavel: ingressoAte(EC103, "13/11/2019"),
    requisitos: (c, d, t, idade) => {
      const sexo = c.servidor.sexo;
      const idadeMin = d >= "2022-01-01" ? exige(sexo, 62, 57) : exige(sexo, 61, 56);
      const passos = Math.max(0, Number(d.slice(0, 4)) - 2019);
      const pontos = sexo === "M" ? Math.min(105, 96 + passos) : Math.min(100, 86 + passos);
      return [
        reqIdade(idadeMin, idade),
        reqTempo("Tempo de contribuição", exige(sexo, 35, 30), t.anos),
        reqTempo("Serviço público", 20, sp(t)),
        reqTempo("Cargo", 5, cargo(t)),
        req("Pontos (idade + tempo)", String(pontos), (idade + t.anos).toFixed(2), idade + t.anos + TOL >= pontos),
      ];
    },
    proventos: (c, _d, t, idade) => {
      const i = ingresso(c);
      if (i && i <= EC41 && idade + 1e-9 >= exige(c.servidor.sexo, 65, 62)) return { tipo: "integralidade" };
      return { tipo: "media", criterio: "100", coeficiente: coeficienteArt26(t.anos, 20), nota: i && i <= EC41 ? `Integralidade e paridade exigiriam ${exige(c.servidor.sexo, 65, 62)} anos de idade.` : undefined };
    },
  },
  {
    id: "rpps-art4-prof",
    nome: "Professor — transição por pontos (art. 4º, §4º)",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 4º, §4º",
    aplicavel: (c) => ingressoAte(EC103, "13/11/2019")(c) ?? temMagisterio(c),
    requisitos: (c, d, t, idade) => {
      const sexo = c.servidor.sexo;
      const idadeMin = d >= "2022-01-01" ? exige(sexo, 57, 52) : exige(sexo, 56, 51);
      const passos = Math.max(0, Number(d.slice(0, 4)) - 2019);
      const pontos = sexo === "M" ? Math.min(100, 91 + passos) : Math.min(92, 81 + passos);
      return [
        reqIdade(idadeMin, idade),
        reqTempo("Magistério", exige(sexo, 30, 25), magisterio(t)),
        reqTempo("Serviço público", 20, sp(t)),
        reqTempo("Cargo", 5, cargo(t)),
        req("Pontos (idade + tempo)", String(pontos), (idade + t.anos).toFixed(2), idade + t.anos + TOL >= pontos),
      ];
    },
    proventos: (c, _d, t, idade) => {
      const i = ingresso(c);
      if (i && i <= EC41 && idade + 1e-9 >= exige(c.servidor.sexo, 60, 57)) return { tipo: "integralidade" };
      return { tipo: "media", criterio: "100", coeficiente: coeficienteArt26(t.anos, 20) };
    },
  },
  {
    id: "rpps-art20",
    nome: "Transição com pedágio de 100% (art. 20)",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 20",
    aplicavel: ingressoAte(EC103, "13/11/2019"),
    requisitos: (c, _d, t, idade) => {
      const base = exige(c.servidor.sexo, 35, 30);
      const pedagio = Math.max(0, base - tempoEm(c.linha, EC103).anos);
      return [
        reqIdade(exige(c.servidor.sexo, 60, 57), idade),
        reqTempo(`Tempo (${base} anos + pedágio de 100%)`, base + pedagio, t.anos),
        reqTempo("Serviço público", 20, sp(t)),
        reqTempo("Cargo", 5, cargo(t)),
      ];
    },
    proventos: (c) => {
      const i = ingresso(c);
      return i && i <= EC41 ? { tipo: "integralidade" } : { tipo: "media", criterio: "100", coeficiente: 1 };
    },
  },
  {
    id: "rpps-art20-prof",
    nome: "Professor — pedágio de 100% (art. 20, §1º)",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 20, §1º",
    aplicavel: (c) => ingressoAte(EC103, "13/11/2019")(c) ?? temMagisterio(c),
    requisitos: (c, _d, t, idade) => {
      const base = exige(c.servidor.sexo, 30, 25);
      const pedagio = Math.max(0, base - anos(tempoEm(c.linha, EC103).diasProfessor));
      return [
        reqIdade(exige(c.servidor.sexo, 55, 52), idade),
        reqTempo(`Magistério (${base} anos + pedágio de 100%)`, base + pedagio, magisterio(t)),
        reqTempo("Serviço público", 20, sp(t)),
        reqTempo("Cargo", 5, cargo(t)),
      ];
    },
    proventos: (c) => {
      const i = ingresso(c);
      return i && i <= EC41 ? { tipo: "integralidade" } : { tipo: "media", criterio: "100", coeficiente: 1 };
    },
  },
  {
    id: "rpps-art21",
    nome: "Especial — transição por pontos (art. 21)",
    grupo: "Transição EC 103/2019",
    fundamento: "EC 103/2019, art. 21",
    aplicavel: (c) => {
      const m = ingressoAte(EC103, "13/11/2019")(c);
      if (m) return m;
      const t = tempoEm(c.linha, "2100-01-01");
      return t.especial[15] + t.especial[20] + t.especial[25] > 0 ? null : "Sem períodos especiais.";
    },
    requisitos: (_c, _d, t, idade) => {
      const melhor = ([15, 20, 25] as const).map((n) => ({ n, a: anosEspecialEquivalente(t, n), p: { 15: 66, 20: 76, 25: 86 }[n] })).sort((x, y) => y.a / y.n - x.a / x.n)[0];
      return [
        reqTempo(`Efetiva exposição (${melhor.n} anos)`, melhor.n, melhor.a),
        req("Pontos (idade + tempo)", String(melhor.p), (idade + t.anos).toFixed(2), idade + t.anos + TOL >= melhor.p),
        reqTempo("Serviço público", 20, sp(t)),
        reqTempo("Cargo", 5, cargo(t)),
      ];
    },
    proventos: (_c, _d, t) => ({ tipo: "media", criterio: "100", coeficiente: coeficienteArt26(t.anos, 20) }),
  },

  // ---- Regras permanentes (art. 10 da EC 103) ----
  {
    id: "rpps-art10",
    nome: "Voluntária (regra permanente — art. 10)",
    grupo: "Regra permanente",
    fundamento: "EC 103/2019, art. 10, §1º, I",
    requisitos: (c, _d, t, idade) => [
      reqIdade(exige(c.servidor.sexo, 65, 62), idade),
      reqTempo("Tempo de contribuição", 25, t.anos),
      reqTempo("Serviço público", 10, sp(t)),
      reqTempo("Cargo", 5, cargo(t)),
    ],
    proventos: (_c, _d, t) => ({ tipo: "media", criterio: "100", coeficiente: coeficienteArt26(t.anos, 20) }),
  },
  {
    id: "rpps-art10-prof",
    nome: "Professor (regra permanente — art. 10, §2º, III)",
    grupo: "Regra permanente",
    fundamento: "EC 103/2019, art. 10, §2º, III",
    aplicavel: temMagisterio,
    requisitos: (c, _d, t, idade) => [
      reqIdade(exige(c.servidor.sexo, 60, 57), idade),
      reqTempo("Magistério", 25, magisterio(t)),
      reqTempo("Serviço público", 10, sp(t)),
      reqTempo("Cargo", 5, cargo(t)),
    ],
    proventos: (_c, _d, t) => ({ tipo: "media", criterio: "100", coeficiente: coeficienteArt26(t.anos, 20) }),
  },
  {
    id: "rpps-art10-especial",
    nome: "Especial (regra permanente — art. 10, §2º, II)",
    grupo: "Regra permanente",
    fundamento: "EC 103/2019, art. 10, §2º, II",
    requisitos: (_c, _d, t, idade) => [
      reqIdade(60, idade),
      reqTempo("Efetiva exposição", 25, anosEspecialEquivalente(t, 25)),
      reqTempo("Serviço público", 10, sp(t)),
      reqTempo("Cargo", 5, cargo(t)),
    ],
    proventos: (_c, _d, t) => ({ tipo: "media", criterio: "100", coeficiente: coeficienteArt26(t.anos, 20) }),
  },
  {
    id: "rpps-compulsoria",
    nome: "Compulsória (75 anos)",
    grupo: "Regra permanente",
    fundamento: "CF, art. 40, §1º, II; LC 152/2015; EC 103, art. 26, §4º",
    requisitos: (_c, _d, _t, idade) => [reqIdade(75, idade)],
    proventos: (_c, _d, t) => {
      const prop = Math.min(1, t.anos / 20);
      return { tipo: "media", criterio: "100", coeficiente: coeficienteArt26(t.anos, 20), proporcao: prop, nota: `Proporção: ${fmtAnos(t.anos)} / 20 anos (limitada a 1) = ${pct(prop)}.` };
    },
  },
];

export function avaliarRegraRpps(def: DefRpps, c: ContextoRpps, dataAlvo?: string): ResultadoRegra {
  const der = dataAlvo ?? c.servidor.der;
  const data = def.direitoAdquirido && der > EC103 ? EC103 : der;
  const t = tempoEm(c.linha, data);
  const idade = idadeEm(c.servidor.nascimento, data);
  const motivo = def.aplicavel?.(c) ?? null;
  const r: ResultadoRegra = {
    id: def.id, nome: def.nome, grupo: def.grupo, fundamento: def.fundamento,
    aplicavel: !motivo, motivoNaoAplicavel: motivo ?? undefined, cumpre: false, dataAvaliacao: data,
    requisitos: [], coeficiente: 0, salarioBeneficio: 0, rmi: 0, rmiNaDer: 0, memoria: [], observacoes: [],
  };
  if (motivo) return r;
  r.requisitos = def.requisitos(c, data, t, idade);
  r.cumpre = r.requisitos.every((x) => x.ok);

  const p = def.proventos(c, data, t, idade);
  const remuneracao = c.servidor.remuneracaoCargo || 0;
  if (p.tipo === "integralidade") {
    r.integralidade = true;
    r.paridade = true;
    r.coeficiente = 1;
    r.salarioBeneficio = remuneracao;
    r.rmi = remuneracao;
    r.memoria.push(`Integralidade: proventos iguais à remuneração do cargo efetivo (${brl(remuneracao)}), com paridade com os ativos.`);
    if (!remuneracao) r.observacoes.push("Informe a remuneração do cargo para calcular a integralidade.");
  } else {
    const media = calcularMedia({ salarios: c.salarios, dib: data, indices: c.indices, criterio: p.criterio, limitarAoTeto: c.servidor.rpc });
    r.media = media;
    r.coeficiente = p.coeficiente * (p.proporcao ?? 1);
    let valor = media.media * r.coeficiente;
    r.salarioBeneficio = arred(media.media);
    r.memoria.push(`Média ${p.criterio === "100" ? "de 100%" : "dos 80% maiores"} das remunerações desde 07/1994: ${brl(media.media)} (${media.usados} competência(s)).`);
    if (p.nota) r.memoria.push(p.nota);
    r.memoria.push(`Proventos: ${brl(media.media)} × ${pct(r.coeficiente)} = ${brl(valor)}.`);
    if (remuneracao && valor > remuneracao) {
      valor = remuneracao;
      r.memoria.push(`Limitado à remuneração do cargo efetivo: ${brl(remuneracao)}.`);
    }
    if (c.servidor.rpc) {
      const t = teto(competencia(data));
      if (valor > t) {
        valor = t;
        r.memoria.push(`Servidor sujeito à previdência complementar: limitado ao teto do RGPS (${brl(t)}).`);
      }
    }
    r.rmi = arred(valor);
    r.paridade = false;
    r.observacoes.push("Sem paridade: reajuste anual pelos índices do RGPS (CF, art. 40, §8º).", ...media.avisos);
  }
  r.rmiNaDer = r.rmi;
  if (def.direitoAdquirido && der > EC103 && !r.integralidade && r.rmi > 0) {
    r.rmiNaDer = arred(r.rmi * fatorComposto(c.indices, "INPC", "2019-11", somaComp(competencia(der), -1)));
    r.memoria.push(`Valor de 13/11/2019 atualizado pelo INPC até a data do cálculo: ${brl(r.rmiNaDer)}.`);
  }
  if (r.integralidade) r.rmiNaDer = remuneracao;
  return r;
}

export function analisarRpps(c: ContextoRpps): ResultadoRegra[] {
  return REGRAS_RPPS.map((d) => avaliarRegraRpps(d, c));
}

export function cumpreRegraRpps(def: DefRpps, c: ContextoRpps, dataAlvo: string): boolean {
  const data = def.direitoAdquirido && dataAlvo > EC103 ? EC103 : dataAlvo;
  if (def.aplicavel?.(c)) return false;
  return def.requisitos(c, data, tempoEm(c.linha, data), idadeEm(c.servidor.nascimento, data)).every((x) => x.ok);
}

// ---------------------------------------------------------------------------
// Incapacidade permanente do servidor
// ---------------------------------------------------------------------------

export function incapacidadeRpps(c: ContextoRpps, data: string, acidente: boolean) {
  const t = tempoEm(c.linha, data);
  const media = calcularMedia({ salarios: c.salarios, dib: data, indices: c.indices, criterio: "100", limitarAoTeto: c.servidor.rpc });
  const coef = acidente ? 1 : coeficienteArt26(t.anos, 20);
  let valor = media.media * coef;
  if (c.servidor.rpc) valor = Math.min(valor, teto(competencia(data)));
  return { media: media.media, coeficiente: coef, valor: arred(valor), anos: t.anos };
}

// ---------------------------------------------------------------------------
// Benefício Especial (Lei 12.618/2012, art. 3º) — servidor que migrou para a previdência complementar
// ---------------------------------------------------------------------------

export function beneficioEspecial(opts: {
  remuneracoes: SalarioContribuicao[]; // remunerações-base de contribuição desde 07/1994
  dataOpcao: string;
  indices: Indices;
  sexo: "M" | "F";
  professor?: boolean;
  contribuicoesRpps?: number; // Tc: nº de contribuições mensais ao RPPS da União (se vazio, estima)
  diasRpps?: number;
}) {
  const ultima = somaComp(competencia(opts.dataOpcao), -1);
  const ag = agruparSalarios(opts.remuneracoes);
  const corrigidos = [...ag.entries()]
    .filter(([c]) => c >= "1994-07" && c <= ultima)
    .map(([c, v]) => ({ comp: c, valor: v, corrigido: v * (c < ultima ? fatorComposto(opts.indices, "IPCA", somaComp(c, 1), ultima) : 1) }))
    .sort((a, b) => b.corrigido - a.corrigido);
  const qtd = Math.max(1, Math.floor(corrigidos.length * 0.8));
  const maiores = corrigidos.slice(0, qtd);
  const media = maiores.length ? maiores.reduce((s, x) => s + x.corrigido, 0) / maiores.length : 0;
  const tetoRgps = teto(competencia(opts.dataOpcao));
  const tc = opts.contribuicoesRpps ?? Math.round(((opts.diasRpps ?? 0) / DIAS_ANO) * 13);
  const tt = opts.professor ? exige(opts.sexo, 390, 325) : exige(opts.sexo, 455, 390);
  const fc = Math.min(1, tc / tt);
  const valor = Math.max(0, media - tetoRgps) * fc;
  return { media: arred(media), tetoRgps, tc, tt, fatorConversao: fc, valor: arred(valor), quantidade: corrigidos.length, usados: maiores.length };
}

// ---------------------------------------------------------------------------
// Contribuição do servidor federal (EC 103, art. 11) e abono de permanência
// ---------------------------------------------------------------------------

/** Faixas de 2026 (EC 103, art. 11, reajustadas pelo índice do RGPS). Editáveis na tela. */
export const FAIXAS_SERVIDOR_2026: { ate: number; aliquota: number }[] = [
  { ate: 1621.0, aliquota: 0.075 },
  { ate: 2902.84, aliquota: 0.09 },
  { ate: 4354.27, aliquota: 0.12 },
  { ate: 8475.55, aliquota: 0.14 },
  { ate: 14514.29, aliquota: 0.145 },
  { ate: 29028.57, aliquota: 0.165 },
  { ate: 56605.73, aliquota: 0.19 },
  { ate: Infinity, aliquota: 0.22 },
];

export function contribuicaoProgressiva(base: number, faixas = FAIXAS_SERVIDOR_2026) {
  let anterior = 0;
  let total = 0;
  const detalhe: { de: number; ate: number; aliquota: number; valor: number }[] = [];
  for (const f of faixas) {
    if (base <= anterior) break;
    const parte = Math.min(base, f.ate) - anterior;
    const v = parte * f.aliquota;
    detalhe.push({ de: anterior, ate: Math.min(base, f.ate), aliquota: f.aliquota, valor: arred(v) });
    total += v;
    anterior = f.ate;
  }
  return { total: arred(total), efetiva: base ? total / base : 0, detalhe };
}

/** Abono de permanência: igual à contribuição do servidor que já pode se aposentar e continua trabalhando. */
export function abonoPermanencia(remuneracao: number, rpc: boolean, dataCumprimento: string | null, ate: string, faixas = FAIXAS_SERVIDOR_2026) {
  const base = rpc ? Math.min(remuneracao, teto(competencia(ate))) : remuneracao;
  const contrib = contribuicaoProgressiva(base, faixas);
  let meses = 0;
  if (dataCumprimento && dataCumprimento <= ate) {
    const [a1, m1] = dataCumprimento.split("-").map(Number);
    const [a2, m2] = ate.split("-").map(Number);
    meses = (a2 - a1) * 12 + (m2 - m1) + 1;
  }
  // 13º: o abono também incide sobre a gratificação natalina.
  const anual = contrib.total * 13;
  return { base, mensal: contrib.total, anual: arred(anual), meses, acumulado: arred(contrib.total * meses * (13 / 12)), contribuicao: contrib };
}
