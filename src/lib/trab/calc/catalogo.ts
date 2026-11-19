// Catálogo completo de calculadoras trabalhistas.
import type { Calculadora } from "../../prev/calc/tipos";
import { SECOES_TRAB, TRAB_SECAO_1, TRAB_SECAO_2, TRAB_SECAO_3, TRAB_SECAO_4, TRAB_SECAO_5, TRAB_SECAO_6, TRAB_SECAO_7 } from "./secoes1a7";
import { TRAB_SECAO_8, TRAB_SECAO_9, TRAB_SECAO_10, TRAB_SECAO_11, TRAB_SECAO_12, TRAB_SECAO_13 } from "./secoes8a13";

export const CALCULADORAS_TRAB: Calculadora[] = [
  ...TRAB_SECAO_1, ...TRAB_SECAO_2, ...TRAB_SECAO_3, ...TRAB_SECAO_4, ...TRAB_SECAO_5, ...TRAB_SECAO_6, ...TRAB_SECAO_7,
  ...TRAB_SECAO_8, ...TRAB_SECAO_9, ...TRAB_SECAO_10, ...TRAB_SECAO_11, ...TRAB_SECAO_12, ...TRAB_SECAO_13,
];

export function calculadoraTrab(id: string) {
  return CALCULADORAS_TRAB.find((c) => c.id === id) ?? null;
}

/** Função do admin que controla cada seção do catálogo trabalhista. */
export const FUNCAO_SECAO_TRAB: Record<number, string> = {
  1: "trabalhista.ferramentas", 2: "trabalhista.rescisao", 3: "trabalhista.horas", 4: "trabalhista.horas", 5: "trabalhista.adicionais",
  6: "trabalhista.adicionais", 7: "trabalhista.horas", 8: "trabalhista.ferramentas", 9: "trabalhista.rescisao", 10: "trabalhista.ferramentas",
  11: "trabalhista.ferramentas", 12: "trabalhista.ferramentas", 13: "trabalhista.liquidacao",
};

export function funcoesDaCalculadoraTrab(c: Calculadora): string[] {
  return [FUNCAO_SECAO_TRAB[c.secao], ...(c.modo === "ia" ? ["trabalhista.parecer"] : [])];
}

export { SECOES_TRAB };
