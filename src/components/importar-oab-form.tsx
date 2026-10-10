"use client";

import { useActionState } from "react";
import Link from "next/link";
import { DownloadCloud, Loader2 } from "lucide-react";
import {
  importarProcessosPorOab,
  type ImportOabState,
} from "@/lib/actions/oab";
import { UFS } from "@/lib/djen";

export default function ImportarOabForm() {
  const [state, formAction, pending] = useActionState<ImportOabState, FormData>(
    importarProcessosPorOab,
    undefined
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <form
        action={formAction}
        className="px-5 py-4 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium text-gray-900">
            Importar processos pela OAB
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Busca no Diário de Justiça Eletrônico Nacional (CNJ) os processos
            do advogado e marca cada um como Ativo ou Inativo (baixado ou
            arquivado, conforme o DataJud do CNJ).
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Nº OAB
          </label>
          <input
            name="numeroOab"
            required
            inputMode="numeric"
            placeholder="123456"
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            UF
          </label>
          <select
            name="uf"
            required
            defaultValue=""
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            <option value="" disabled>
              UF
            </option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {pending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <DownloadCloud size={15} />
          )}
          {pending ? "Buscando (até 1 min)..." : "Buscar processos"}
        </button>
      </form>

      {state && "error" in state && (
        <p className="px-5 pb-4 text-sm text-red-600">{state.error}</p>
      )}
      {state && "success" in state && (
        <div className="px-5 pb-4 text-sm text-gray-700">
          {state.encontrados === 0 ? (
            <p>Nenhum processo com publicações encontrado para a OAB {state.oab}.</p>
          ) : (
            <p>
              OAB {state.oab}: <strong>{state.ativos}</strong> processo
              {state.ativos !== 1 && "s"} ativo{state.ativos !== 1 && "s"}
              {state.arquivados > 0 && (
                <> e {state.arquivados} arquivado{state.arquivados !== 1 && "s"}/baixado
                {state.arquivados !== 1 && "s"}</>
              )}
              . {state.novos} novo{state.novos !== 1 && "s"} cadastrado
              {state.novos !== 1 && "s"} e {state.publicacoes} publicaç
              {state.publicacoes !== 1 ? "ões" : "ão"} importada
              {state.publicacoes !== 1 && "s"}.{" "}
              <Link
                href="/processos"
                className="font-medium text-[var(--brand)] underline"
              >
                Ver processos
              </Link>
              {state.incompleto && (
                <span className="block text-xs text-amber-600 mt-1">
                  Por limite do DJEN, vieram só as publicações mais recentes.
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
