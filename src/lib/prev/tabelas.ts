// Tabelas oficiais do RGPS usadas nos cálculos.
// - Salário mínimo: série 1619 do Banco Central (SGS).
// - Teto (limite máximo do salário de contribuição): portarias interministeriais.
// - Expectativa de sobrevida: Tábuas Completas de Mortalidade do IBGE (ambos os sexos).
// Índices mensais (INPC, Selic, IPCA-E) vêm do Banco Central em tempo real
// (ver lib/prev/indices.ts); aqui ficam só as tabelas que mudam uma vez por ano.

import tabuasIbge from "@/data/prev-tabuas-ibge.json";
import { compN } from "./datas";

type Vigencia = [comp: string, valor: number];

export const SALARIO_MINIMO: Vigencia[] = [
  ["1994-07", 64.79], ["1994-09", 70], ["1995-05", 100], ["1996-05", 112], ["1997-05", 120],
  ["1998-05", 130], ["1999-05", 136], ["2000-04", 151], ["2001-04", 180], ["2002-04", 200],
  ["2003-04", 240], ["2004-05", 260], ["2005-05", 300], ["2006-04", 350], ["2007-04", 380],
  ["2008-03", 415], ["2009-02", 465], ["2010-01", 510], ["2011-01", 540], ["2011-03", 545],
  ["2012-01", 622], ["2013-01", 678], ["2014-01", 724], ["2015-01", 788], ["2016-01", 880],
  ["2017-01", 937], ["2018-01", 954], ["2019-01", 998], ["2020-01", 1039], ["2020-02", 1045],
  ["2021-01", 1100], ["2022-01", 1212], ["2023-01", 1302], ["2023-05", 1320], ["2024-01", 1412],
  ["2025-01", 1518], ["2026-01", 1621],
];

export const TETO: Vigencia[] = [
  ["1994-07", 582.86], ["1995-05", 832.66], ["1996-05", 957.56], ["1997-06", 1031.87],
  ["1998-06", 1081.5], ["1998-12", 1200], ["1999-06", 1255.32], ["2000-06", 1328.25],
  ["2001-06", 1430], ["2002-06", 1561.56], ["2003-06", 1869.34], ["2004-01", 2400],
  ["2004-05", 2508.72], ["2005-05", 2668.15], ["2006-04", 2801.56], ["2006-08", 2801.82],
  ["2007-04", 2894.28], ["2008-03", 3038.99], ["2009-02", 3218.9], ["2010-01", 3467.4],
  ["2011-01", 3689.66], ["2011-03", 3691.74], ["2012-01", 3916.2], ["2013-01", 4159],
  ["2014-01", 4390.24], ["2015-01", 4663.75], ["2016-01", 5189.82], ["2017-01", 5531.31],
  ["2018-01", 5645.8], ["2019-01", 5839.45], ["2020-01", 6101.06], ["2021-01", 6433.57],
  ["2022-01", 7087.22], ["2023-01", 7507.49], ["2024-01", 7786.02], ["2025-01", 8157.41],
  ["2026-01", 8475.55],
];

function vigente(tabela: Vigencia[], comp: string): number {
  const n = compN(comp);
  let valor = tabela[0][1];
  for (const [c, v] of tabela) {
    if (compN(c) <= n) valor = v;
    else break;
  }
  return valor;
}

export const salarioMinimo = (comp: string) => vigente(SALARIO_MINIMO, comp);
export const teto = (comp: string) => vigente(TETO, comp);

// ---- Expectativa de sobrevida (fator previdenciário) ----

const TABUAS = tabuasIbge as Record<string, number[]>;
export const ANOS_TABUA = Object.keys(TABUAS).map(Number).sort((a, b) => a - b);

/**
 * A tábua do ano T é publicada pelo IBGE até 1º de dezembro de T+1 e vale
 * para benefícios requeridos de 1º/12/(T+1) a 30/11/(T+2).
 */
export function anoTabua(der: string): number {
  const [a, m] = der.split("-").map(Number);
  return m === 12 ? a - 1 : a - 2;
}

export function expectativaSobrevida(
  der: string,
  idadeAnos: number
): { valor: number | null; tabua: number; aproximada: boolean } {
  const desejada = anoTabua(der);
  const min = ANOS_TABUA[0];
  const max = ANOS_TABUA[ANOS_TABUA.length - 1];
  const tabua = Math.min(max, Math.max(min, desejada));
  const idade = Math.min(80, Math.max(0, Math.floor(idadeAnos)));
  const valor = TABUAS[String(tabua)]?.[idade] ?? null;
  return { valor, tabua, aproximada: tabua !== desejada };
}

// ---- Fator previdenciário (Lei 9.876/1999) ----

export const ALIQUOTA_FATOR = 0.31;

/**
 * f = (Tc × a / Es) × [1 + (Id + Tc × a) / 100]
 * Tc já com o bônus (mulher +5; professor +5; professora +10).
 */
export function fatorPrevidenciario(tc: number, idade: number, es: number): number {
  const f = ((tc * ALIQUOTA_FATOR) / es) * (1 + (idade + tc * ALIQUOTA_FATOR) / 100);
  return Math.round(f * 10000) / 10000;
}

export function bonusFator(sexo: "M" | "F", professor: boolean): number {
  if (professor) return sexo === "F" ? 10 : 5;
  return sexo === "F" ? 5 : 0;
}

// ---- Conversão de tempo especial em comum (até 13/11/2019) ----

export function fatorConversao(sexo: "M" | "F", anosEspecial: 15 | 20 | 25): number {
  const tabela = sexo === "M" ? { 15: 2.33, 20: 1.75, 25: 1.4 } : { 15: 2, 20: 1.5, 25: 1.2 };
  return tabela[anosEspecial];
}

// ---- Regra 85/95 progressiva (Lei 13.183/2015) para o direito adquirido ----

export function pontos8595(data: string, sexo: "M" | "F"): number {
  // 85/95 até 30/12/2018; 86/96 de 31/12/2018 até a EC 103.
  const base = data >= "2018-12-31" ? 86 : 85;
  return sexo === "F" ? base : base + 10;
}

// ---- Transição da EC 103 ----

const anoDe = (data: string) => Number(data.slice(0, 4));

/** Art. 15: pontos exigidos no ano. */
export function pontosArt15(data: string, sexo: "M" | "F", professor = false): number {
  const passos = Math.max(0, anoDe(data) - 2019);
  if (professor) return sexo === "F" ? Math.min(92, 81 + passos) : Math.min(100, 91 + passos);
  return sexo === "F" ? Math.min(100, 86 + passos) : Math.min(105, 96 + passos);
}

/** Art. 16: idade mínima progressiva (+6 meses por ano). */
export function idadeArt16(data: string, sexo: "M" | "F", professor = false): number {
  const passos = Math.max(0, anoDe(data) - 2019) * 0.5;
  if (professor) return sexo === "F" ? Math.min(57, 51 + passos) : Math.min(60, 56 + passos);
  return sexo === "F" ? Math.min(62, 56 + passos) : Math.min(65, 61 + passos);
}

/** Art. 18: idade da mulher sobe 6 meses por ano a partir de 2020 até 62. */
export function idadeArt18(data: string, sexo: "M" | "F"): number {
  if (sexo === "M") return 65;
  const passos = Math.max(0, anoDe(data) - 2019) * 0.5;
  return Math.min(62, 60 + passos);
}

// ---- Acúmulo de benefícios (art. 24 da EC 103) ----

export const FAIXAS_ACUMULO: { ate: number; percentual: number }[] = [
  { ate: 1, percentual: 1 },
  { ate: 2, percentual: 0.6 },
  { ate: 3, percentual: 0.4 },
  { ate: 4, percentual: 0.2 },
  { ate: Infinity, percentual: 0.1 },
];

export function parcelaAcumulo(valor: number, sm: number) {
  let restante = valor;
  let anterior = 0;
  let total = 0;
  const faixas: { de: number; ate: number; base: number; percentual: number; valor: number }[] = [];
  for (const f of FAIXAS_ACUMULO) {
    const limite = f.ate * sm;
    const base = Math.max(0, Math.min(restante, limite - anterior));
    if (base > 0) {
      const v = base * f.percentual;
      faixas.push({ de: anterior, ate: Math.min(limite, valor), base, percentual: f.percentual, valor: v });
      total += v;
    }
    restante -= base;
    anterior = limite;
    if (restante <= 0) break;
  }
  return { total: Math.round(total * 100) / 100, faixas };
}

export function arred(v: number) {
  return Math.round(v * 100) / 100;
}
