import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigirModulo } from "@/lib/modulos-server";
import CalculoCompleto, { type CalculoCompletoSalvo } from "@/components/prev/calculo-completo";
import type { DadosCompleto } from "@/components/prev/tipos-calculo";

export const metadata = { title: "Cálculo previdenciário" };

export default async function CalculoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ regime?: string; aba?: string }>;
}) {
  const session = await exigirModulo("previdenciario");
  const { id } = await params;
  const { regime, aba } = await searchParams;
  let salvo: CalculoCompletoSalvo | null = null;
  if (id !== "novo") {
    const c = await prisma.calculo.findFirst({
      where: { id, escritorioId: session.escritorioId!, area: "PREVIDENCIARIO" },
      include: { cliente: { select: { id: true, nome: true, documento: true } } },
    });
    if (!c || !c.tipo.startsWith("COMPLETO")) notFound();
    salvo = { id: c.id, titulo: c.titulo, dados: c.dados as unknown as DadosCompleto, parecer: c.parecer, cliente: c.cliente };
  }
  const regimeInicial = salvo?.dados.regime ?? (regime === "RPPS" ? "RPPS" : "RGPS");
  return <CalculoCompleto key={salvo?.id ?? "novo"} salvo={salvo} regimeInicial={regimeInicial} abaInicial={aba} desativados={session.desativados ?? []} />;
}
