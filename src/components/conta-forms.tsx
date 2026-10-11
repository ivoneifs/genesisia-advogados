"use client";

import { useActionState } from "react";
import { alterarMinhaSenha, salvarMeusDados, type ContaState } from "@/lib/actions/conta";

export const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]";
const LABEL = "block text-xs font-medium text-gray-600 mb-1.5";
const BOTAO =
  "rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 shadow-sm disabled:opacity-60";

function Mensagem({ state }: { state: ContaState }) {
  if (state?.error)
    return <p className="text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-200 rounded-lg px-3 py-2">{state.error}</p>;
  if (state?.success)
    return <p className="text-sm text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-200 rounded-lg px-3 py-2">{state.success}</p>;
  return null;
}

export function MeusDadosForm({ name, whatsapp }: { name: string; whatsapp: string }) {
  const [state, action, pending] = useActionState<ContaState, FormData>(salvarMeusDados, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Nome</label>
          <input name="name" defaultValue={name} required className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>WhatsApp (recebe alertas e o código de recuperação de senha)</label>
          <input name="whatsapp" defaultValue={whatsapp} placeholder="(11) 98765-4321" className={INPUT} />
        </div>
      </div>
      <Mensagem state={state} />
      <button type="submit" disabled={pending} className={BOTAO}>
        {pending ? "Salvando..." : "Salvar dados"}
      </button>
    </form>
  );
}

export function SenhaForm() {
  const [state, action, pending] = useActionState<ContaState, FormData>(alterarMinhaSenha, undefined);
  return (
    <form action={action} className="space-y-4" key={state?.success ? "ok" : "form"}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={LABEL}>Senha atual</label>
          <input name="atual" type="password" required autoComplete="current-password" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Nova senha</label>
          <input name="nova" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Confirmar nova senha</label>
          <input name="confirma" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
        </div>
      </div>
      <Mensagem state={state} />
      <button type="submit" disabled={pending} className={BOTAO}>
        {pending ? "Alterando..." : "Alterar senha"}
      </button>
    </form>
  );
}
