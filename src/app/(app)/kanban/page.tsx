import Link from "next/link";
import { prisma } from "@/lib/db";
import { moveProcessoStatus } from "@/lib/actions/processos";
import { formatCurrency } from "@/lib/format";
import { ArrowRight } from "lucide-react";

const COLUNAS = [
  { status: "ATIVO", label: "Ativos", next: "ARQUIVADO", nextLabel: "Arquivar" },
  {
    status: "ARQUIVADO",
    label: "Arquivados",
    next: "ENCERRADO",
    nextLabel: "Encerrar",
  },
  { status: "ENCERRADO", label: "Encerrados", next: "ATIVO", nextLabel: "Reabrir" },
];

export default async function KanbanPage() {
  const processos = await prisma.processo.findMany({
    orderBy: { createdAt: "desc" },
    include: { cliente: true, _count: { select: { prazos: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Gestão kanban
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Acompanhe o andamento dos processos por status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUNAS.map((col) => {
          const items = processos.filter((p) => p.status === col.status);
          return (
            <div key={col.status} className="rounded-xl border border-gray-200 bg-gray-50/60">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-medium text-gray-900 text-sm">
                  {col.label}
                </h2>
                <span className="text-xs text-gray-500 bg-white rounded-full px-2 py-0.5 border border-gray-200">
                  {items.length}
                </span>
              </div>
              <div className="p-3 space-y-3 min-h-[120px]">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-gray-200 bg-white p-3 space-y-2 shadow-sm"
                  >
                    <Link
                      href={`/processos/${p.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-[var(--brand)] block truncate"
                    >
                      {p.numero}
                    </Link>
                    <p className="text-xs text-gray-500 truncate">
                      {p.cliente.nome}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{p.area ?? "—"}</span>
                      <span>
                        {p.valorCausa != null
                          ? formatCurrency(p.valorCausa)
                          : ""}
                      </span>
                    </div>
                    <form action={moveProcessoStatus}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value={col.next} />
                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-gray-100 hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] text-gray-600 text-xs font-medium py-1.5 transition-colors"
                      >
                        {col.nextLabel} <ArrowRight size={12} />
                      </button>
                    </form>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-gray-400 px-1 py-4 text-center">
                    Nenhum processo aqui.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
