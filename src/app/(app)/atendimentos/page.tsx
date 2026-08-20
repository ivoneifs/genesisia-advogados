import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { createAtendimento, deleteAtendimento } from "@/lib/actions/atendimentos";
import { Trash2, Plus, MessageCircle } from "lucide-react";
import { requireEscritorioId } from "@/lib/session";

export default async function AtendimentosPage() {
  const escritorioId = await requireEscritorioId();
  const [atendimentos, clientes, processos] = await Promise.all([
    prisma.atendimento.findMany({
      where: { escritorioId },
      orderBy: { data: "desc" },
      include: { cliente: true, processo: true },
    }),
    prisma.cliente.findMany({ where: { escritorioId }, orderBy: { nome: "asc" } }),
    prisma.processo.findMany({
      where: { escritorioId },
      orderBy: { numero: "asc" },
      select: { id: true, numero: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Atendimentos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Histórico de contatos e interações com os clientes.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">Novo atendimento</h2>
        </div>
        <form action={createAtendimento} className="px-5 py-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Assunto
              </label>
              <input
                name="titulo"
                required
                placeholder="Ligação, dúvida sobre andamento..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Cliente
              </label>
              <select
                name="clienteId"
                required
                defaultValue=""
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              >
                <option value="" disabled>
                  Selecione
                </option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Processo (opcional)
              </label>
              <select
                name="processoId"
                defaultValue=""
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              >
                <option value="">—</option>
                {processos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.numero}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            name="descricao"
            rows={2}
            placeholder="Detalhes do atendimento..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            <Plus size={14} /> Registrar
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {atendimentos.map((a) => (
            <li key={a.id} className="px-5 py-4 flex items-start gap-3">
              <MessageCircle size={16} className="text-gray-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{a.titulo}</p>
                {a.descricao && (
                  <p className="text-sm text-gray-600 mt-0.5">{a.descricao}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {a.cliente.nome}
                  {a.processo && ` · Proc. ${a.processo.numero}`} ·{" "}
                  {formatDateTime(a.data)}
                </p>
              </div>
              <form action={deleteAtendimento}>
                <input type="hidden" name="id" value={a.id} />
                <button
                  type="submit"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </form>
            </li>
          ))}
          {atendimentos.length === 0 && (
            <li className="px-5 py-8 text-center text-gray-400 text-sm">
              Nenhum atendimento registrado ainda.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
