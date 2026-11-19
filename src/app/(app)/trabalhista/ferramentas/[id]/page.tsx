import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigirModulo } from "@/lib/modulos-server";
import { ativo } from "@/lib/modulos";
import { calculadoraTrab, funcoesDaCalculadoraTrab } from "@/lib/trab/calc/catalogo";
import FerramentaTrab from "@/components/trab/ferramenta-trab";
import type { CalculoSalvo } from "@/components/calc/calculadora-tela";
import type { Valores } from "@/lib/prev/calc/tipos";

export const metadata = { title: "Calculadora trabalhista" };

export default async function FerramentaTrabPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ calc?: string }> }) {
  const session = await exigirModulo("trabalhista");
  const { id } = await params;
  const { calc } = await searchParams;
  const def = calculadoraTrab(id);
  if (!def) notFound();
  if (!funcoesDaCalculadoraTrab(def).every((f) => ativo(session.desativados, f))) redirect("/trabalhista?modulo-off=1");
  let salvo: CalculoSalvo | null = null;
  if (calc) {
    const c = await prisma.calculo.findFirst({
      where: { id: calc, escritorioId: session.escritorioId!, area: "TRABALHISTA", tipo: id },
      include: { cliente: { select: { id: true, nome: true, documento: true } } },
    });
    if (c) salvo = { id: c.id, titulo: c.titulo, dados: c.dados as Valores, parecer: c.parecer, cliente: c.cliente };
  }
  return <FerramentaTrab id={id} salvo={salvo} podeIA={ativo(session.desativados, "trabalhista.parecer")} />;
}
