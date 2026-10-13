"use client";

import { useActionState, useEffect, useRef } from "react";
import { adicionarOabEscritorio, removerOabEscritorio, type OabAdminState } from "@/lib/actions/admin";
import { UFS } from "@/lib/djen";
import { Lock, Plus, X } from "lucide-react";

export type OabVinculada = { id: string; nome: string; oab: string; uf: string };

const CAMPO =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]";

/** OABs travadas no escritório. Só o superadmin inclui ou remove. */
export default function OabsEscritorio({ escritorioId, oabs }: { escritorioId: string; oabs: OabVinculada[] }) {
  const [state, action, pending] = useActionState<OabAdminState, FormData>(adicionarOabEscritorio, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state && "ok" in state) form.current?.reset();
  }, [state]);

  return (
    <div className="px-5 py-3 border-t border-slate-100 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
        <Lock size={12} /> OABs do escritório (travadas) · repetir a mesma OAB atualiza os dados
      </p>
      <div className="flex flex-wrap gap-2">
        {oabs.map((o) => (
          <span
            key={o.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 pl-3 pr-1 py-1 text-xs text-gray-700"
          >
            {o.oab}/{o.uf} · {o.nome}
            <form
              action={removerOabEscritorio}
              onSubmit={(e) => {
                if (!confirm(`Desvincular a OAB ${o.oab}/${o.uf}? Ela ficará livre para outro escritório.`))
                  e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={o.id} />
              <button
                type="submit"
                title="Desvincular OAB"
                className="h-5 w-5 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600"
              >
                <X size={11} />
              </button>
            </form>
          </span>
        ))}
        {oabs.length === 0 && <span className="text-xs text-gray-400">Nenhuma OAB cadastrada ainda.</span>}
      </div>
      <form ref={form} action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="escritorioId" value={escritorioId} />
        <input name="nome" required placeholder="Nome do advogado(a)" className={`${CAMPO} w-52`} />
        <input name="oab" required inputMode="numeric" placeholder="Nº OAB" className={`${CAMPO} w-28`} />
        <select name="uf" required defaultValue="" className={CAMPO}>
          <option value="" disabled>
            UF
          </option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
        <input name="cpf" placeholder="CPF" className={`${CAMPO} w-36`} />
        <input name="emailAdv" type="email" placeholder="E-mail" className={`${CAMPO} w-48`} />
        <input name="telefone" placeholder="Telefone / WhatsApp" className={`${CAMPO} w-44`} />
        <input name="endereco" placeholder="Endereço profissional" className={`${CAMPO} flex-1 min-w-[220px]`} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-slate-100 disabled:opacity-60"
        >
          <Plus size={14} /> Cadastrar OAB
        </button>
        {state && "error" in state && <span className="text-xs text-red-600">{state.error}</span>}
      </form>
    </div>
  );
}
