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
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:underline"
      >
        <UserPlus size={13} /> Adicionar usuário
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-lg bg-gray-50 p-3">
      <input type="hidden" name="escritorioId" value={escritorioId} />
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          required
          placeholder="Nome"
          className="flex-1 min-w-[140px] rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
        <input
          type="email"
          name="email"
          required
          placeholder="E-mail"
          className="flex-1 min-w-[180px] rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-xs font-medium px-3 py-1.5 disabled:opacity-60"
        >
          {pending ? "..." : "Adicionar"}
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
