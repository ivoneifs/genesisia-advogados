"use client";

import { useActionState, useEffect } from "react";
import { editarUsuario, type EditarUsuarioState } from "@/lib/actions/admin";

const CAMPO =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]";

/** Edição completa de um usuário pelo superadmin: nome, login e senha. */
export default function EditarUsuario({
  usuario,
  onFechar,
}: {
  usuario: { id: string; name: string; email: string };
  /** Sem onFechar, o formulário fica aberto e mostra "Salvo" (Minha conta). */
  onFechar?: () => void;
}) {
  const [state, action, pending] = useActionState<EditarUsuarioState, FormData>(editarUsuario, undefined);
  useEffect(() => {
    if (state && "ok" in state) onFechar?.();
  }, [state, onFechar]);

  return (
    <form action={action} className="px-5 py-3 bg-slate-50 flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={usuario.id} />
      <input name="name" required defaultValue={usuario.name} placeholder="Nome" className={`${CAMPO} flex-1 min-w-[140px]`} />
      <input type="email" name="email" required defaultValue={usuario.email} placeholder="E-mail (login)" className={`${CAMPO} flex-1 min-w-[180px]`} />
      <input
        type="text"
        name="password"
        minLength={8}
        autoComplete="new-password"
        placeholder="Nova senha (deixe vazio para manter)"
        className={`${CAMPO} flex-1 min-w-[200px]`}
      />
      <button type="submit" disabled={pending} className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-3 py-1.5 shadow-sm disabled:opacity-60">
        {pending ? "Salvando..." : "Salvar"}
      </button>
      {onFechar ? (
        <button type="button" onClick={onFechar} className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-slate-200/60">
          Cancelar
        </button>
      ) : (
        state && "ok" in state && <span className="text-xs text-emerald-600">Salvo</span>
      )}
      {state && "error" in state && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
