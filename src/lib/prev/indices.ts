// Índices mensais (variação % no mês) e fatores acumulados. Roda no navegador
// e no servidor; os dados vêm de /api/prev/indices (cache do Banco Central).

import { compN, deCompN } from "./datas";

export type SerieIndice = "INPC" | "IPCA" | "IPCAE" | "SELIC" | "TR";
export type Indices = Partial<Record<SerieIndice, Record<string, number>>>;

export const NOMES_INDICE: Record<SerieIndice, string> = {
  INPC: "INPC (IBGE)",
  IPCA: "IPCA (IBGE)",
  IPCAE: "IPCA-E (IBGE)",
  SELIC: "Selic acumulada no mês",
  TR: "Taxa Referencial (TR)",
};

/** Código da série no SGS do Banco Central. */
export const CODIGO_SGS: Record<SerieIndice, number> = {
  INPC: 188,
  IPCA: 433,
  IPCAE: 10764,
  SELIC: 4390,
  TR: 7811,
};

export function taxa(indices: Indices, serie: SerieIndice, comp: string): number {
  return indices[serie]?.[comp] ?? 0;
}

/** Produto de (1 + taxa) de `de` até `ate` (inclusive). Vazio = 1. */
export function fatorComposto(indices: Indices, serie: SerieIndice, de: string, ate: string): number {
  let f = 1;
  for (let n = compN(de); n <= compN(ate); n++) f *= 1 + taxa(indices, serie, deCompN(n)) / 100;
  return f;
}

/** Soma simples das taxas (Selic da EC 113 e juros de mora simples). */
export function somaTaxas(indices: Indices, serie: SerieIndice, de: string, ate: string): number {
  let s = 0;
  for (let n = compN(de); n <= compN(ate); n++) s += taxa(indices, serie, deCompN(n));
  return s;
}

/** Última competência com dado publicado. */
export function ultimaCompetencia(indices: Indices, serie: SerieIndice): string | null {
  const chaves = Object.keys(indices[serie] ?? {});
  return chaves.length ? chaves.sort().at(-1)! : null;
}
