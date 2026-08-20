import Link from "next/link";
import { prisma } from "@/lib/db";
import ProcessoForm from "@/components/processo-form";
import { createProcesso } from "@/lib/actions/processos";
import { requireEscritorioId } from "@/lib/session";

export default async function NovoProcessoPage() {
  const escritorioId = await requireEscritorioId();
  const clientes = await prisma.cliente.findMany({
    where: { escritorioId },
    orderBy: { nome: "asc" },
  });

  if (clientes.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">Novo processo</h1>
        <p className="text-sm text-gray-500">
          Você precisa cadastrar um cliente antes de criar um processo.
        </p>
        <Link
          href="/clientes/novo"
          className="inline-flex rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          Cadastrar cliente
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Novo processo</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cadastre um novo processo judicial.
        </p>
      </div>
      <ProcessoForm
        clientes={clientes}
        action={createProcesso}
        cancelHref="/processos"
      />
    </div>
  );
}
