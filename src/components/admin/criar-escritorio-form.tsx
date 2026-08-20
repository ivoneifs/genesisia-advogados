"use client";

import { useActionState } from "react";
import { createEscritorio, type AdminState } from "@/lib/actions/admin";
import CredenciaisGeradas from "./credenciais-geradas";
import { Plus } from "lucide-react";

export default function CriarEscritorioForm() {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    createEscritorio,
    undefined
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-medium text-gray-900">Novo escritório (cliente)</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Cria o escritório e o primeiro usuário, com senha gerada
          automaticamente.
        </p>
      </div>
      <form action={formAction} className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Nome do escritório
            </label>
            <input
              name="escritorioNome"
              required
              placeholder="Silva Advogados"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Nome do responsável
            </label>
            <input
              name="name"
              required
              placeholder="Dra. Maria Silva"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              E-mail de login
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="contato@silva.adv.br"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
        </div>

        {state && "error" in state && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
        {state && "success" in state && (
          <CredenciaisGeradas email={state.email} password={state.password} />
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 transition-colors disabled:opacity-60"
        >
          <Plus size={14} /> {pending ? "Criando..." : "Criar escritório"}
        </button>
      </form>
    </div>
  );
}
