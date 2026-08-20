import { Workflow, Lock, Sparkles } from "lucide-react";

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Workflows</h1>
        <p className="text-sm text-gray-500 mt-1">
          Automatize as rotinas do seu escritório.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-12 flex flex-col items-center text-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center">
          <Workflow size={26} />
        </div>
        <div className="space-y-1">
          <p className="text-gray-900 font-medium flex items-center justify-center gap-2">
            Recurso premium <Lock size={14} className="text-gray-400" />
          </p>
          <p className="text-sm text-gray-500 max-w-md">
            Crie fluxos automáticos que disparam tarefas, notificações e
            atualizações de status conforme o andamento dos processos — por
            exemplo, gerar uma tarefa automaticamente sempre que um prazo for
            cadastrado como urgente.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium px-4 py-2.5 cursor-not-allowed"
        >
          <Sparkles size={14} /> Em breve
        </button>
      </div>
    </div>
  );
}
