"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DownloadCloud, Loader2, UserRound, ExternalLink, UserPlus } from "lucide-react";
import {
  importarProcessosPorOab,
  consultarAdvogadoOab,
  type ImportOabState,
  type AdvogadoOabResult,
} from "@/lib/actions/oab";
import { UFS } from "@/lib/djen";

const CNA_URL = "https://cna.oab.org.br/";

export default function ImportarOabForm() {
  const [state, formAction, pending] = useActionState<ImportOabState, FormData>(
    importarProcessosPorOab,
    undefined
  );

  // Consulta automática dos dados do advogado ao digitar OAB + UF.
  const [numeroOab, setNumeroOab] = useState("");
  const [uf, setUf] = useState("");
  const [advogado, setAdvogado] = useState<AdvogadoOabResult | null>(null);
  const [consultando, setConsultando] = useState(false);
  const ultimaConsulta = useRef(0);

  const numeroLimpo = numeroOab.replace(/\D/g, "");
  const podeConsultar = numeroLimpo.length >= 3 && !!uf;
  // Só exibe o resultado se ele for da OAB/UF digitadas agora.
  const advogadoAtual =
    advogado && ("error" in advogado || (advogado.oab === numeroLimpo && advogado.uf === uf))
      ? advogado
      : null;

  useEffect(() => {
    if (!podeConsultar) return;
    const id = ++ultimaConsulta.current;
    const timer = setTimeout(async () => {
      setConsultando(true);
      const r = await consultarAdvogadoOab(numeroLimpo, uf);
      if (id === ultimaConsulta.current) {
        setAdvogado(r);
        setConsultando(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [numeroLimpo, uf, podeConsultar]);

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
            value={numeroOab}
            onChange={(e) => setNumeroOab(e.target.value)}
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
            value={uf}
            onChange={(e) => setUf(e.target.value)}
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

      {podeConsultar && (consultando || advogadoAtual) && (
        <div className="mx-5 mb-4 rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3">
          {consultando && !advogadoAtual ? (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" /> Consultando dados do
              advogado...
            </p>
          ) : advogadoAtual && "error" in advogadoAtual ? (
            <p className="text-sm text-red-600">{advogadoAtual.error}</p>
          ) : advogadoAtual ? (
            <div className="flex items-start gap-3">
              <span className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                <UserRound size={18} />
              </span>
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium text-gray-900">
                  {advogadoAtual.nome ?? "Nome não encontrado nas publicações"}
                  {consultando && (
                    <Loader2 size={12} className="inline ml-2 animate-spin text-gray-400" />
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  OAB {advogadoAtual.oab}/{advogadoAtual.uf}
                </p>
                <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <dt className="text-gray-400">Publicações no DJEN</dt>
                    <dd className="text-gray-700 font-medium">
                      {advogadoAtual.totalPublicacoes.toLocaleString("pt-BR")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Última publicação</dt>
                    <dd className="text-gray-700 font-medium">
                      {advogadoAtual.ultimaPublicacao
                        ? new Date(advogadoAtual.ultimaPublicacao).toLocaleDateString("pt-BR", {
                            timeZone: "UTC",
                          })
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Tribunais (recentes)</dt>
                    <dd className="text-gray-700 font-medium">
                      {advogadoAtual.tribunais.length ? advogadoAtual.tribunais.join(", ") : "—"}
                    </dd>
                  </div>
                </dl>
                {advogadoAtual.nome && (
                  <Link
                    href={`/advogados/novo?${new URLSearchParams({
                      nome: advogadoAtual.nome,
                      oab: advogadoAtual.oab,
                      uf: advogadoAtual.uf,
                    })}`}
                    className="mt-2 mr-4 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
                  >
                    <UserPlus size={12} /> Salvar no cadastro de advogados
                  </Link>
                )}
                <a
                  href={CNA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
                >
                  Ficha completa no CNA da OAB (situação, endereço, telefone)
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ) : null}
        </div>
      )}

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
