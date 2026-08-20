import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ContatoForm from "@/components/contato-form";
import { updateContato } from "@/lib/actions/contatos";
import { requireEscritorioId } from "@/lib/session";

export default async function EditarContatoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const escritorioId = await requireEscritorioId();
  const contato = await prisma.contato.findFirst({ where: { id, escritorioId } });
  if (!contato) notFound();

  const action = updateContato.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Editar contato
        </h1>
        <p className="text-sm text-gray-500 mt-1">{contato.nome}</p>
      </div>
      <ContatoForm contato={contato} action={action} />
    </div>
  );
}
