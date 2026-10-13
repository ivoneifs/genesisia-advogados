import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import AdvogadoForm from "@/components/advogado-form";
import { updateAdvogado } from "@/lib/actions/advogados";
import { requireEscritorioId } from "@/lib/session";
import { Lock } from "lucide-react";

export default async function EditarAdvogadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duplicado?: string }>;
}) {
  const { id } = await params;
  const { duplicado } = await searchParams;
  const escritorioId = await requireEscritorioId();
  const advogado = await prisma.advogado.findFirst({ where: { id, escritorioId } });
  if (!advogado) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{advogado.nome}</h1>
          <p className="text-sm text-gray-500 mt-1 inline-flex items-center gap-1.5">
            <Lock size={13} /> OAB {advogado.oab}/{advogado.uf} · travada
          </p>
        </div>
      </div>
      {duplicado && (
        <p className="max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          Esta OAB já estava cadastrada. Você pode atualizar os dados abaixo.
        </p>
      )}
      <AdvogadoForm advogado={advogado} action={updateAdvogado.bind(null, id)} />
    </div>
  );
}
