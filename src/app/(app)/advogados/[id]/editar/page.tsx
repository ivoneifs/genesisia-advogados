import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import AdvogadoForm from "@/components/advogado-form";
import { updateAdvogado, deleteAdvogado } from "@/lib/actions/advogados";
import { requireEscritorioId } from "@/lib/session";
import { Trash2 } from "lucide-react";

export default async function EditarAdvogadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duplicado?: string; conflito?: string }>;
}) {
  const { id } = await params;
  const { duplicado, conflito } = await searchParams;
  const escritorioId = await requireEscritorioId();
  const advogado = await prisma.advogado.findFirst({ where: { id, escritorioId } });
  if (!advogado) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{advogado.nome}</h1>
          <p className="text-sm text-gray-500 mt-1">
            OAB {advogado.oab}/{advogado.uf}
          </p>
        </div>
        <form action={deleteAdvogado}>
          <input type="hidden" name="id" value={advogado.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-medium px-4 py-2.5 transition-colors"
          >
            <Trash2 size={14} /> Excluir
          </button>
        </form>
      </div>
      {duplicado && (
        <p className="max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          Esta OAB já estava cadastrada. Você pode atualizar os dados abaixo.
        </p>
      )}
      {conflito && (
        <p className="max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          Já existe outro advogado(a) com essa OAB/UF. Nada foi alterado.
        </p>
      )}
      <AdvogadoForm advogado={advogado} action={updateAdvogado.bind(null, id)} />
    </div>
  );
}
