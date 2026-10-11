"use client";

import { useActionState, useState } from "react";
import {
  convidarMembro,
  redefinirSenhaMembro,
  alterarPapelMembro,
  alternarAtivoMembro,
  type EquipeState,
} from "@/lib/actions/equipe";
import CredenciaisGeradas from "@/components/admin/credenciais-geradas";
import { INPUT } from "@/components/conta-forms";
import { KeyRound, UserPlus, X } from "lucide-react";

const OPCOES = (
  <>
    <option value="SOCIO">Sócio / administrador</option>
    <option value="ADVOGADO">Advogado(a)</option>
    <option value="ESTAGIARIO">Estagiário(a)</option>
  </>
);

export function ConvidarMembro() {
  const [aberto, setAberto] = useState(false);
  const [chave, setChave] = useState(0);
  if (!aberto)
    return (
      <button
        type="button"
        onClick={() => {
          setChave((k) => k + 1);
          setAberto(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-medium px-4 py-2 shadow-sm shadow-indigo-500/25"
      >
        <UserPlus size={15} /> Adicionar pessoa
      </button>
    );
  return <FormConvite key={chave} onFechar={() => setAberto(false)} />;
}

function FormConvite({ onFechar }: { onFechar: () => void }) {
  const [state, action, pending] = useActionState<EquipeState, FormData>(convidarMembro, undefined);
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4" onClick={onFechar}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Adicionar pessoa à equipe</h2>
            <p className="text-xs text-gray-500 mt-0.5">Uma senha é gerada automaticamente. A pessoa pode trocá-la em Minha conta.</p>
          </div>
          <button type="button" onClick={onFechar} className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        {state && "success" in state ? (
          <>
            <CredenciaisGeradas email={state.email} password={state.password} />
            <div className="flex justify-end">
              <button type="button" onClick={onFechar} className="rounded-lg bg-[var(--brand)] text-white text-sm font-medium px-4 py-2">
                Concluir
              </button>
            </div>
          </>
        ) : (
          <form action={action} className="space-y-3">
            <input name="name" required placeholder="Nome completo" className={INPUT} autoFocus />
            <input name="email" type="email" required placeholder="E-mail de login" className={INPUT} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select name="role" defaultValue="ADVOGADO" className={INPUT}>{OPCOES}</select>
              <input name="whatsapp" placeholder="WhatsApp (opcional)" className={INPUT} />
            </div>
            {state && "error" in state && (
              <p className="text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-200 rounded-lg px-3 py-2">{state.error}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-slate-100">Cancelar</button>
              <button type="submit" disabled={pending} className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 disabled:opacity-60">
                {pending ? "Adicionando..." : "Adicionar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function AcoesMembro({
  id,
  role,
  ativo,
  souEu,
}: {
  id: string;
  role: string;
  ativo: boolean;
  souEu: boolean;
}) {
  const [state, action, pending] = useActionState<EquipeState, FormData>(redefinirSenhaMembro, undefined);
  const [mostrar, setMostrar] = useState(false);
  return (
    <div className="flex items-center gap-2 relative">
      <form action={alterarPapelMembro}>
        <input type="hidden" name="id" value={id} />
        <select
          name="role"
          defaultValue={role}
          disabled={souEu}
          title={souEu ? "Você não pode alterar o próprio perfil" : "Perfil de acesso"}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-gray-700 disabled:opacity-60"
        >
          {OPCOES}
        </select>
      </form>
      {!souEu && (
        <form action={alternarAtivoMembro}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ring-1 ring-inset ${
              ativo ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-gray-500 ring-slate-300"
            }`}
            title={ativo ? "Desativar acesso" : "Reativar acesso"}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${ativo ? "bg-emerald-500" : "bg-gray-400"}`} />
            {ativo ? "Ativo" : "Inativo"}
          </button>
        </form>
      )}
      <form
        action={action}
        onSubmit={(e) => {
          if (!confirm("Gerar uma nova senha para esta pessoa?")) e.preventDefault();
          else setMostrar(true);
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={pending} title="Gerar nova senha" className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-slate-100 hover:text-gray-700">
          <KeyRound size={14} />
        </button>
      </form>
      {mostrar && state && "success" in state && (
        <div className="absolute right-0 top-full mt-2 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-white shadow-xl ring-1 ring-slate-200 p-2">
          <button type="button" onClick={() => setMostrar(false)} className="absolute right-3 top-3 text-emerald-700/60">
            <X size={14} />
          </button>
          <CredenciaisGeradas email={state.email} password={state.password} />
        </div>
      )}
    </div>
  );
}
