import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ProcessoForm from "@/components/processo-form";
import { updateProcesso } from "@/lib/actions/processos";
import { requireEscritorioId } from "@/lib/session";

export default async function EditarProcessoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const escritorioId = await requireEscritorioId();

  const [processo, clientes] = await Promise.all([
    prisma.processo.findFirst({ where: { id, escritorioId } }),
    prisma.cliente.findMany({ where: { escritorioId }, orderBy: { nome: "asc" } }),
  ]);

  if (!processo) notFound();

  const action = updateProcesso.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Editar processo
        </h1>
        <p className="text-sm text-gray-500 mt-1">{processo.numero}</p>
      </div>
      <ProcessoForm
        processo={processo}
        clientes={clientes}
        action={action}
        cancelHref={`/processos/${processo.id}`}
      />
    </div>
  );
}
