import { prisma } from "@/lib/db";
import PecaGenerator from "@/components/peca-generator";

export default async function PecasPage() {
  const [clientes, processos] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nome: "asc" } }),
    prisma.processo.findMany({
      orderBy: { numero: "asc" },
      include: { cliente: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Criação de peças
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gere minutas a partir de modelos, com preenchimento automático dos
          dados do cliente e processo.
        </p>
      </div>
      <PecaGenerator clientes={clientes} processos={processos} />
    </div>
  );
}
