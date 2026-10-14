"use client";

import { useActionState, useState } from "react";
import { UFS } from "@/lib/djen";
import { createEscritorio, type AdminState } from "@/lib/actions/admin";
import CredenciaisGeradas from "./credenciais-geradas";
import { Plus, X, Building2 } from "lucide-react";

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]";
const LABEL = "block text-xs font-medium text-gray-600 mb-1.5";

export default function CriarEscritorioForm() {
  const [aberto, setAberto] = useState(false);
  // Remonta o formulário a cada abertura para limpar o estado anterior.
  const [chave, setChave] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setChave((k) => k + 1);
          setAberto(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-medium px-4 py-2 shadow-sm shadow-indigo-500/25 transition-colors"
      >
        <Plus size={15} /> Novo escritório
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Formulario key={chave} onFechar={() => setAberto(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function Formulario({ onFechar }: { onFechar: () => void }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    createEscritorio,
    undefined
  );
  const criado = state && "success" in state;

  return (
    <>
      <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center">
            <Building2 size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Novo escritório</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cria o escritório, o primeiro usuário e a OAB do advogado,
              com os dados passados por ele.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onFechar}
          title="Fechar"
          className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:bg-slate-100 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>

      {criado ? (
        <div className="px-6 py-5 space-y-4">
          <CredenciaisGeradas email={state.email} password={state.password} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2"
            >
              Concluir
            </button>
          </div>
        </div>
      ) : (
        <form action={formAction} className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL}>Nome do escritório</label>
            <input
              name="escritorioNome"
              required
              autoFocus
              placeholder="Silva Advogados"
              className={INPUT}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Nome do responsável</label>
              <input
                name="name"
                required
                placeholder="Dra. Maria Silva"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>E-mail de login</label>
              <input
                type="email"
                name="email"
                required
                placeholder="contato@silva.adv.br"
                className={INPUT}
              />
            </div>
          </div>
          <div>
            <label className={LABEL}>Senha inicial</label>
            <input
              type="text"
              name="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="Deixe vazio para gerar automaticamente"
              className={INPUT}
            />
          </div>
          <fieldset className="rounded-xl border border-slate-200 p-4 space-y-3">
            <legend className="px-1 text-xs font-semibold text-gray-600">OAB do advogado (fica travada no escritório)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input name="adv_nome" placeholder="Nome do advogado(a)" className={`${INPUT} sm:col-span-2`} />
              <input name="adv_oab" inputMode="numeric" placeholder="Nº OAB" className={INPUT} />
              <select name="adv_uf" defaultValue="" className={INPUT}>
                <option value="">UF</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
              <input name="adv_cpf" placeholder="CPF" className={INPUT} />
              <input name="adv_emailAdv" type="email" placeholder="E-mail do advogado" className={INPUT} />
              <input name="adv_telefone" placeholder="Telefone / WhatsApp" className={`${INPUT} sm:col-span-2`} />
              <input name="adv_endereco" placeholder="Endereço profissional" className={`${INPUT} sm:col-span-4`} />
            </div>
          </fieldset>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Plano</label>
              <select name="plano" defaultValue="BASICO" className={INPUT}>
                <option value="TRIAL">Trial</option>
                <option value="BASICO">Básico</option>
                <option value="PRO">Pro</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Status inicial</label>
              <select name="status" defaultValue="ATIVO" className={INPUT}>
                <option value="ATIVO">Ativo</option>
                <option value="TRIAL">Trial (7 dias)</option>
                <option value="SUSPENSO">Suspenso</option>
              </select>
            </div>
          </div>

          {state && "error" in state && (
            <p className="text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-200 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-medium px-4 py-2 shadow-sm disabled:opacity-60"
            >
              <Plus size={14} /> {pending ? "Criando..." : "Criar escritório"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
