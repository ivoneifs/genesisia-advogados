import { prisma } from "@/lib/db";
import PecaGenerator from "@/components/peca-generator";
import { requireEscritorioId } from "@/lib/session";

export default async function PecasPage() {
  const escritorioId = await requireEscritorioId();
  const [clientes, processos, advogados] = await Promise.all([
    prisma.cliente.findMany({ where: { escritorioId }, orderBy: { nome: "asc" } }),
    prisma.processo.findMany({
      where: { escritorioId },
      orderBy: { numero: "asc" },
      select: {
        id: true,
        numero: true,
        vara: true,
        tribunal: true,
        parteContraria: true,
      },
    }),
    prisma.advogado.findMany({
      where: { escritorioId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, oab: true, uf: true, email: true },
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
      <PecaGenerator clientes={clientes} processos={processos} advogados={advogados} />
    </div>
  );
}
