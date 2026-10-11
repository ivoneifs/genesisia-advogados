"use client";

import { useActionState, useState } from "react";
import { createPortal } from "react-dom";
import { deleteEscritorio, type ExcluirState } from "@/lib/actions/admin";
import { AlertTriangle, Trash2, X } from "lucide-react";

export default function ExcluirEscritorio({ id, nome }: { id: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title="Excluir escritório e todos os dados"
        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <Trash2 size={15} />
      </button>
      {aberto && createPortal(<Modal id={id} nome={nome} onFechar={() => setAberto(false)} />, document.body)}
    </>
  );
}

function Modal({ id, nome, onFechar }: { id: string; nome: string; onFechar: () => void }) {
  const [state, action, pending] = useActionState<ExcluirState, FormData>(deleteEscritorio, undefined);
  const [digitado, setDigitado] = useState("");
  const confere = digitado.trim() === nome.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-red-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="h-11 w-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <button type="button" onClick={onFechar} className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Excluir escritório</h2>
            <p className="mt-1 text-sm text-gray-600">
              Isto apaga <b>definitivamente</b> todos os processos, publicações, clientes, prazos,
              documentos e o financeiro de <b>{nome}</b>. Os usuários serão desativados.
            </p>
            <p className="mt-3 text-sm text-gray-600">
              Para só bloquear o acesso, use <b>Suspenso</b> em plano e status (botão de ajustes), que não apaga nada.
            </p>
          </div>
          <form action={action} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <label className="block text-xs font-medium text-gray-600">
              Digite <span className="font-semibold text-gray-900">{nome}</span> para confirmar
            </label>
            <input
              name="confirmacao"
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              autoFocus
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500"
            />
            {state && "error" in state && (
              <p className="text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-200 rounded-lg px-3 py-2">{state.error}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!confere || pending}
                className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pending ? "Excluindo..." : "Excluir definitivamente"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
