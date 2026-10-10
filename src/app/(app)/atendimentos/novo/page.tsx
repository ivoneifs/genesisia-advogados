import { prisma } from "@/lib/db";
import AtendimentoForm from "@/components/atendimento-form";
import { createAtendimento } from "@/lib/actions/atendimentos";
import { requireEscritorioId } from "@/lib/session";

export default async function NovoAtendimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string; processoId?: string }>;
}) {
  const { clienteId, processoId } = await searchParams;
  const escritorioId = await requireEscritorioId();
  const [clientes, processos] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Novo atendimento</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registre um contato ou interação com o cliente.
        </p>
      </div>
      <AtendimentoForm
        inicial={{ clienteId, processoId }}
        clientes={clientes}
        processos={processos}
        action={createAtendimento}
      />
    </div>
  );
}
