"use client";

import { useActionState, useState } from "react";
import { createUserInEscritorio, type AdminState } from "@/lib/actions/admin";
import CredenciaisGeradas from "./credenciais-geradas";
import { UserPlus } from "lucide-react";

export default function AdicionarUsuarioForm({
  escritorioId,
}: {
  escritorioId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    createUserInEscritorio,
    undefined
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -mx-2 text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand)]/5"
      >
        <UserPlus size={15} /> Adicionar usuário
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="escritorioId" value={escritorioId} />
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          required
          placeholder="Nome"
          className="flex-1 min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]"
        />
        <input
          type="email"
          name="email"
          required
          placeholder="E-mail"
          className="flex-1 min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]"
        />
        <input
          type="text"
          name="password"
          minLength={8}
          autoComplete="new-password"
          placeholder="Senha (vazio = gerar)"
          className="w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]"
        />
        <select
          name="role"
          defaultValue="ADVOGADO"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
        >
          <option value="SOCIO">Sócio / admin</option>
          <option value="ADVOGADO">Advogado(a)</option>
          <option value="ESTAGIARIO">Estagiário(a)</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-3 py-1.5 shadow-sm disabled:opacity-60"
        >
          {pending ? "Adicionando..." : "Adicionar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-slate-200/60"
        >
          Cancelar
        </button>
      </div>
      {state && "error" in state && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}
      {state && "success" in state && (
        <CredenciaisGeradas email={state.email} password={state.password} />
      )}
    </form>
  );
}
