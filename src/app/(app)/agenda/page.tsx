import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { createTarefa, deleteTarefa, toggleTarefa } from "@/lib/actions/tarefas";
import Badge from "@/components/badge";
import { CheckCircle2, Circle, Trash2, Plus, CalendarClock } from "lucide-react";

export default async function AgendaPage() {
  const [tarefas, prazos, processos] = await Promise.all([
    prisma.tarefa.findMany({
      orderBy: [{ concluida: "asc" }, { data: "asc" }],
      include: { processo: true },
    }),
    prisma.prazo.findMany({
      where: { status: "PENDENTE" },
      orderBy: { dataVencimento: "asc" },
      include: { processo: { include: { cliente: true } } },
    }),
    prisma.processo.findMany({
      orderBy: { numero: "asc" },
      select: { id: true, numero: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Agenda</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tarefas, compromissos e prazos processuais.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">Nova tarefa / compromisso</h2>
        </div>
        <form
          action={createTarefa}
          className="px-5 py-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Título
            </label>
            <input
              name="titulo"
              required
              placeholder="Reunião com cliente, audiência..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Data e hora
            </label>
            <input
              type="datetime-local"
              name="data"
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Tipo
            </label>
            <select
              name="tipo"
              defaultValue="TAREFA"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <option value="TAREFA">Tarefa</option>
              <option value="AUDIENCIA">Audiência</option>
              <option value="REUNIAO">Reunião</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Processo (opcional)
            </label>
            <select
              name="processoId"
              defaultValue=""
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <option value="">—</option>
              {processos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.numero}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            <Plus size={14} /> Adicionar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">Tarefas e compromissos</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {tarefas.map((t) => (
              <li key={t.id} className="px-5 py-3 flex items-center gap-3">
                <form action={toggleTarefa}>
                  <input type="hidden" name="id" value={t.id} />
                  <input
                    type="hidden"
                    name="concluida"
                    value={String(t.concluida)}
                  />
                  <button type="submit" className="text-gray-400 hover:text-[var(--brand)]">
                    {t.concluida ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>
                </form>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      t.concluida
                        ? "text-gray-400 line-through"
                        : "text-gray-900"
                    }`}
                  >
                    {t.titulo}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(t.data)}
                    {t.processo && ` · Proc. ${t.processo.numero}`}
                  </p>
                </div>
                <Badge value={t.tipo} />
                <form action={deleteTarefa}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </form>
              </li>
            ))}
            {tarefas.length === 0 && (
              <li className="px-5 py-6 text-sm text-gray-400">
                Nenhuma tarefa cadastrada.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">Prazos pendentes</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {prazos.map((p) => (
              <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                <CalendarClock size={16} className="text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {p.titulo}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {p.processo.cliente.nome} · Proc. {p.processo.numero}
                  </p>
                </div>
                <span className="text-xs text-gray-500 shrink-0">
                  {formatDate(p.dataVencimento)}
                </span>
              </li>
            ))}
            {prazos.length === 0 && (
              <li className="px-5 py-6 text-sm text-gray-400">
                Nenhum prazo pendente.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
