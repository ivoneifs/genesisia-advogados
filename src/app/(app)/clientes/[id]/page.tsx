import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ClienteForm from "@/components/cliente-form";
import { updateCliente } from "@/lib/actions/clientes";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) notFound();

  const action = updateCliente.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Editar cliente
        </h1>
        <p className="text-sm text-gray-500 mt-1">{cliente.nome}</p>
      </div>
      <ClienteForm cliente={cliente} action={action} />
    </div>
  );
}
