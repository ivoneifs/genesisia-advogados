// Catálogo completo de calculadoras previdenciárias (todas as seções).
import { SECAO_1, SECAO_2 } from "./secao1e2";
import { SECAO_3, SECAO_4, SECAO_5 } from "./secao3a5";
import { SECAO_6, SECAO_7 } from "./secao6e7";
import { SECAO_8, SECAO_9, SECAO_10, SECAO_11 } from "./secao8a11";
import { SECOES, type Calculadora } from "./tipos";

export const CALCULADORAS: Calculadora[] = [
  ...SECAO_1, ...SECAO_2, ...SECAO_3, ...SECAO_4, ...SECAO_5, ...SECAO_6,
  ...SECAO_7, ...SECAO_8, ...SECAO_9, ...SECAO_10, ...SECAO_11,
];

export function calculadora(id: string) {
  return CALCULADORAS.find((c) => c.id === id) ?? null;
}

export { SECOES };

/** Função (liga/desliga do admin) que controla cada seção do catálogo. */
export const FUNCAO_SECAO: Record<number, string> = {
  1: "previdenciario.ferramentas", 2: "previdenciario.ferramentas", 3: "previdenciario.aposentadoria", 4: "previdenciario.aposentadoria",
  5: "previdenciario.aposentadoria", 6: "previdenciario.beneficios", 7: "previdenciario.rpps", 8: "previdenciario.planejamento",
  9: "previdenciario.atrasados", 10: "previdenciario.atrasados", 11: "previdenciario.ferramentas",
};

export function funcoesDaCalculadora(c: Calculadora): string[] {
  return [FUNCAO_SECAO[c.secao], ...(c.modo === "ia" ? ["previdenciario.parecer"] : [])];
}
