// Estrutura do catálogo de calculadoras previdenciárias.
// Cada calculadora descreve os campos do formulário e uma função pura de
// cálculo; a tela genérica (/previdenciario/ferramentas/[id]) monta tudo.

import type { Indices } from "../indices";
import type { SalarioContribuicao } from "../media";

export type TipoCampo =
  | "numero"
  | "inteiro"
  | "moeda"
  | "percentual"
  | "data"
  | "competencia"
  | "texto"
  | "textoLongo"
  | "select"
  | "checkbox"
  | "salarios" // lista "MM/AAAA valor" (uma por linha)
  | "periodos"; // lista "dd/mm/aaaa a dd/mm/aaaa [tipo]"

export type Campo = {
  id: string;
  rotulo: string;
  tipo: TipoCampo;
  opcoes?: { valor: string; rotulo: string }[];
  padrao?: string | number | boolean;
  ajuda?: string;
  obrigatorio?: boolean;
  largura?: "inteira" | "meia";
};

export type Valores = Record<string, string | number | boolean | undefined>;

export type LinhaSaida = { rotulo: string; valor: string; destaque?: boolean };

export type Saida = {
  linhas: LinhaSaida[];
  memoria: string[];
  tabela?: { titulo?: string; colunas: string[]; linhas: string[][] };
  avisos?: string[];
};

export type ContextoCalc = { indices: Indices; hoje: string };

export type Modo = "form" | "motor" | "ia";

export type Calculadora = {
  id: string;
  secao: number;
  nome: string;
  fundamento?: string;
  descricao?: string;
  modo: Modo;
  /** motor: aba do cálculo completo que resolve o item */
  aba?: "tempo" | "salarios" | "regras" | "planejamento" | "atrasados" | "rpps" | "revisao";
  campos?: Campo[];
  calcular?: (v: Valores, ctx: ContextoCalc) => Saida;
};

export const SECOES: Record<number, string> = {
  1: "Tempo de contribuição, carência e enquadramento",
  2: "Salário de benefício e coeficientes",
  3: "Aposentadorias RGPS — regras pós-reforma",
  4: "Aposentadorias RGPS — regras de transição",
  5: "Aposentadorias RGPS — direito adquirido",
  6: "Demais benefícios previdenciários e assistenciais",
  7: "Regime próprio (RPPS) e militares",
  8: "Contribuições, indenizações e planejamento",
  9: "Revisões de benefícios",
  10: "Cálculos judiciais, liquidação e execução",
  11: "Internacionais e previdência privada",
};

// ---- helpers de leitura dos campos ----

export const num = (v: Valores, k: string, padrao = 0): number => {
  const x = v[k];
  if (typeof x === "number") return x;
  if (typeof x === "string" && x.trim()) {
    const n = Number(x.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : padrao;
  }
  return padrao;
};
export const txt = (v: Valores, k: string, padrao = ""): string => (v[k] === undefined || v[k] === null ? padrao : String(v[k]));
export const bool = (v: Valores, k: string): boolean => v[k] === true || v[k] === "true" || v[k] === "on";

export const brl = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const pct = (n: number, casas = 2) => `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: casas })}%`;
export const dec = (n: number, casas = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** "03/2020 1.500,00" por linha (aceita ; ou tab). */
export function lerSalarios(texto: string): SalarioContribuicao[] {
  const out: SalarioContribuicao[] = [];
  for (const linha of texto.split(/\n/)) {
    const m = linha.trim().match(/^(\d{2})\/(\d{4})[\s;\t]+(?:R\$\s*)?([\d.]+(?:,\d{1,2})?)/);
    if (!m) continue;
    const valor = Number(m[3].replace(/\./g, "").replace(",", "."));
    if (valor > 0) out.push({ comp: `${m[2]}-${m[1]}`, valor });
  }
  return out;
}

export type PeriodoTexto = { inicio: string; fim: string; tipo: string };

/** "01/02/2000 a 31/12/2005 especial25" por linha. */
export function lerPeriodos(texto: string): PeriodoTexto[] {
  const out: PeriodoTexto[] = [];
  for (const linha of texto.split(/\n/)) {
    const m = linha.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s*(?:a|até|-|–)\s*(\d{2})\/(\d{2})\/(\d{4})\s*(\S+)?/i);
    if (!m) continue;
    out.push({ inicio: `${m[3]}-${m[2]}-${m[1]}`, fim: `${m[6]}-${m[5]}-${m[4]}`, tipo: (m[7] ?? "comum").toLowerCase() });
  }
  return out;
}

export const SEXO: Campo = {
  id: "sexo",
  rotulo: "Sexo",
  tipo: "select",
  opcoes: [
    { valor: "M", rotulo: "Masculino" },
    { valor: "F", rotulo: "Feminino" },
  ],
  padrao: "M",
};
