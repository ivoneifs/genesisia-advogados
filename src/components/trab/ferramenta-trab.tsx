"use client";

import { calculadoraTrab } from "@/lib/trab/calc/catalogo";
import CalculadoraTela, { type CalculoSalvo } from "@/components/calc/calculadora-tela";

export default function FerramentaTrab({ id, salvo, podeIA }: { id: string; salvo: CalculoSalvo | null; podeIA: boolean }) {
  const calc = calculadoraTrab(id);
  if (!calc) return null;
  return <CalculadoraTela calc={calc} area="TRABALHISTA" rotaBase="/trabalhista" salvo={salvo} podeIA={podeIA} />;
}
