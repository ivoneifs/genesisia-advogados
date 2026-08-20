import { prisma } from "@/lib/db";
import { GATILHOS } from "@/lib/workflows";
import { createWorkflow, deleteWorkflow, toggleWorkflow } from "@/lib/actions/workflows";
import { Workflow, Plus, Trash2, Zap, ToggleLeft, ToggleRight } from "lucide-react";
import { requireEscritorioId } from "@/lib/session";

export default async function WorkflowsPage() {
  const escritorioId = await requireEscritorioId();
  const workflows = await prisma.workflow.findMany({
    where: { escritorioId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Workflows</h1>
        <p className="text-sm text-gray-500 mt-1">
          Automatize rotinas: quando algo acontece no escritório, o Genesis
          IA cria a tarefa correspondente automaticamente.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">Novo workflow</h2>
        </div>
        <form
          action={createWorkflow}
          className="px-5 py-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Nome
            </label>
            <input
              name="nome"
              required
              placeholder="Lembrete de prazos importantes"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div className="min-w-[260px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Quando isto acontecer
            </label>
            <select
              name="gatilho"
              required
              defaultValue=""
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <option value="" disabled>
                Selecione um gatilho
              </option>
              {GATILHOS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Dias de antecedência
            </label>
            <input
              type="number"
              name="diasAntes"
              min={0}
              defaultValue={2}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            <Plus size={14} /> Criar workflow
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {workflows.map((wf) => {
            const gatilho = GATILHOS.find((g) => g.value === wf.gatilho);
            return (
              <li key={wf.id} className="px-5 py-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center shrink-0">
                  <Zap size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{wf.nome}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {gatilho?.label ?? wf.gatilho} — {gatilho?.descricao}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {wf.execucoes} execuç{wf.execucoes === 1 ? "ão" : "ões"}
                  </p>
                </div>
                <form action={toggleWorkflow}>
                  <input type="hidden" name="id" value={wf.id} />
                  <input type="hidden" name="ativo" value={String(wf.ativo)} />
                  <button
                    type="submit"
                    className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${
                      wf.ativo
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {wf.ativo ? (
                      <ToggleRight size={14} />
                    ) : (
                      <ToggleLeft size={14} />
                    )}
                    {wf.ativo ? "Ativo" : "Inativo"}
                  </button>
                </form>
                <form action={deleteWorkflow}>
                  <input type="hidden" name="id" value={wf.id} />
                  <button
                    type="submit"
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </form>
              </li>
            );
          })}
          {workflows.length === 0 && (
            <li className="px-5 py-10 flex flex-col items-center text-center gap-2">
              <Workflow size={22} className="text-gray-300" />
              <p className="text-sm text-gray-400">
                Nenhum workflow criado ainda. Crie o primeiro acima.
              </p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
