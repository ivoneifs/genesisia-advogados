import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import AtendimentoForm from "@/components/atendimento-form";
import { updateAtendimento, deleteAtendimento } from "@/lib/actions/atendimentos";
import { requireEscritorioId } from "@/lib/session";
import { formatDateTimeBR } from "@/lib/format";
import { Trash2 } from "lucide-react";

export default async function EditarAtendimentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const escritorioId = await requireEscritorioId();

  const [atendimento, clientes, processos] = await Promise.all([
    prisma.atendimento.findFirst({ where: { id, escritorioId } }),
    prisma.cliente.findMany({
      where: { escritorioId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.processo.findMany({
      where: { escritorioId },
      orderBy: { numero: "asc" },
      select: { id: true, numero: true, cliente: { select: { nome: true } } },
    }),
  ]);
  if (!atendimento) notFound();

  const action = updateAtendimento.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Editar atendimento</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registrado em {formatDateTimeBR(atendimento.createdAt)}
          </p>
        </div>
        <form action={deleteAtendimento}>
          <input type="hidden" name="id" value={atendimento.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-medium px-4 py-2.5 transition-colors"
          >
            <Trash2 size={14} /> Excluir
          </button>
        </form>
      </div>
      <AtendimentoForm
        atendimento={atendimento}
        clientes={clientes}
        processos={processos}
        action={action}
      />
    </div>
  );
}
