import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigirModulo } from "@/lib/modulos-server";
import { ativo } from "@/lib/modulos";
import { calculadora, funcoesDaCalculadora } from "@/lib/prev/calc/catalogo";
import FerramentaPrev from "@/components/prev/ferramenta-prev";
import type { CalculoSalvo } from "@/components/calc/calculadora-tela";
import type { Valores } from "@/lib/prev/calc/tipos";

export const metadata = { title: "Calculadora previdenciária" };

export default async function FerramentaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ calc?: string }> }) {
  const session = await exigirModulo("previdenciario");
  const { id } = await params;
  const { calc } = await searchParams;
  const def = calculadora(id);
  if (!def || def.modo === "motor") notFound();
  if (!funcoesDaCalculadora(def).every((f) => ativo(session.desativados, f))) redirect("/previdenciario?modulo-off=1");
  let salvo: CalculoSalvo | null = null;
  if (calc) {
    const c = await prisma.calculo.findFirst({
      where: { id: calc, escritorioId: session.escritorioId!, area: "PREVIDENCIARIO", tipo: id },
      include: { cliente: { select: { id: true, nome: true, documento: true } } },
    });
    if (c) salvo = { id: c.id, titulo: c.titulo, dados: c.dados as Valores, parecer: c.parecer, cliente: c.cliente };
  }
  return <FerramentaPrev id={id} salvo={salvo} podeIA={ativo(session.desativados, "previdenciario.parecer")} />;
}
