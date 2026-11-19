"use client";

import { calculadora } from "@/lib/prev/calc/catalogo";
import CalculadoraTela, { type CalculoSalvo } from "@/components/calc/calculadora-tela";

/** Carrega a calculadora no navegador (as funções de cálculo não atravessam o servidor). */
export default function FerramentaPrev({ id, salvo, podeIA }: { id: string; salvo: CalculoSalvo | null; podeIA: boolean }) {
  const calc = calculadora(id);
  if (!calc) return null;
  return <CalculadoraTela calc={calc} area="PREVIDENCIARIO" rotaBase="/previdenciario" salvo={salvo} podeIA={podeIA} />;
}
