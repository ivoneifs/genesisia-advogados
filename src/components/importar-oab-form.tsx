"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DownloadCloud, Loader2, CheckCircle2, AlertTriangle, Lock, MessageCircle } from "lucide-react";
import { SUPORTE_WHATSAPP } from "@/lib/contato";
import {
  iniciarImportacaoOab,
  statusImportacaoOab,
  type IniciarImportacaoState,
  type ImportacaoResumo,
} from "@/lib/actions/oab";

export type OabDoEscritorio = { oab: string; uf: string; nome: string };

export default function ImportarOabForm({
  inicial,
  oabs,
}: {
  inicial: ImportacaoResumo | null;
  oabs: OabDoEscritorio[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<IniciarImportacaoState, FormData>(
    iniciarImportacaoOab,
    undefined
  );
  const [imp, setImp] = useState<ImportacaoResumo | null>(inicial);
  const [stateAntes, setStateAntes] = useState<IniciarImportacaoState>(undefined);

  // Ao iniciar, passa a acompanhar a importação devolvida pelo servidor.
  if (state !== stateAntes) {
    setStateAntes(state);
    if (state && "id" in state) {
      setImp({
        id: state.id, oab: "", uf: "", status: "RODANDO", baixadas: 0, total: 0, processos: 0,
        novos: 0, ativos: 0, arquivados: 0, publicacoes: 0, erro: null,
      });
    }
  }

  // Enquanto roda: consulta o progresso a cada 3s e atualiza a lista no fim.
  const idRodando = imp?.status === "RODANDO" ? imp.id : null;
  useEffect(() => {
    if (!idRodando) return;
    const t = setInterval(async () => {
      const r = await statusImportacaoOab(idRodando);
      if (!r) return;
      setImp(r);
      if (r.status !== "RODANDO") router.refresh();
    }, 3000);
    return () => clearInterval(t);
  }, [idRodando, router]);
  const rodando = imp?.status === "RODANDO";

  // Só as OABs vinculadas ao escritório podem ser importadas (trava de OAB).
  const [escolhida, setEscolhida] = useState(oabs[0] ? `${oabs[0].oab}/${oabs[0].uf}` : "");
  const [numeroOab, uf] = escolhida.split("/");

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <form action={formAction} className="px-5 py-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium text-gray-900">Importar processos pela OAB</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Traz do Diário de Justiça Eletrônico Nacional (CNJ) todos os processos e publicações da OAB
            do escritório e marca cada processo como Ativo ou Arquivado (DataJud).
          </p>
        </div>
        {oabs.length === 0 ? (
          <a
            href={SUPORTE_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            <MessageCircle size={15} /> Pedir cadastro da OAB
          </a>
        ) : (
          <>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                <Lock size={11} /> OAB do escritório
              </label>
              {oabs.length === 1 ? (
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {oabs[0].oab}/{oabs[0].uf} · {oabs[0].nome}
                </p>
              ) : (
                <select
                  value={escolhida}
                  onChange={(e) => setEscolhida(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                >
                  {oabs.map((o) => (
                    <option key={`${o.oab}/${o.uf}`} value={`${o.oab}/${o.uf}`}>
                      {o.oab}/{o.uf} · {o.nome}
                    </option>
                  ))}
                </select>
              )}
              <input type="hidden" name="numeroOab" value={numeroOab} />
              <input type="hidden" name="uf" value={uf} />
            </div>
            <button
              type="submit"
              disabled={pending || rodando}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              {pending || rodando ? <Loader2 size={15} className="animate-spin" /> : <DownloadCloud size={15} />}
              {pending ? "Iniciando..." : rodando ? "Importando..." : "Importar todos os processos"}
            </button>
          </>
        )}
      </form>

      {state && "error" in state && <p className="px-5 pb-4 text-sm text-red-600">{state.error}</p>}
      {imp && <Progresso imp={imp} />}
    </div>
  );
}

function Progresso({ imp }: { imp: ImportacaoResumo }) {
  const pct = imp.total ? Math.min(100, Math.round((imp.baixadas / imp.total) * 100)) : 0;
  const n = (x: number) => x.toLocaleString("pt-BR");

  if (imp.status === "RODANDO") {
    const baixando = imp.total === 0 || imp.baixadas < imp.total;
    return (
      <div className="mx-5 mb-4 rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/[0.04] px-4 py-3 space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Loader2 size={14} className="animate-spin text-[var(--brand)]" />
          {baixando
            ? `Baixando publicações do DJEN${imp.oab ? ` (OAB ${imp.oab}/${imp.uf})` : ""}...`
            : "Conferindo situação no DataJud e gravando os processos..."}
        </p>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full rounded-full bg-[var(--brand)] transition-all duration-700" style={{ width: `${baixando ? pct : 100}%` }} />
        </div>
        <p className="text-xs text-gray-500">
          {imp.total ? `${n(imp.baixadas)} de ${n(imp.total)} comunicações` : "Começando..."} · respeitando o
          limite do CNJ, pode levar alguns minutos. Você pode sair desta página: a importação continua.
        </p>
      </div>
    );
  }
  if (imp.status === "CONCLUIDA") {
    return (
      <div className="mx-5 mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex gap-2">
        <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
        <p>
          OAB {imp.oab}/{imp.uf}: <b>{n(imp.processos)}</b> processos encontrados ({n(imp.ativos)} ativos,{" "}
          {n(imp.arquivados)} arquivados). <b>{n(imp.novos)}</b> novos cadastrados e{" "}
          <b>{n(imp.publicacoes)}</b> publicações importadas.{" "}
          <Link href="/processos" className="font-medium underline">Ver processos</Link>
          {imp.erro && <span className="block text-xs text-amber-700 mt-1">{imp.erro}</span>}
        </p>
      </div>
    );
  }
  return (
    <div className="mx-5 mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex gap-2">
      <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
      <p>
        {imp.status === "INTERROMPIDA"
          ? "A importação foi interrompida (o sistema pode ter sido atualizado). Clique em Importar de novo: o que já foi gravado não se repete."
          : `A importação falhou: ${imp.erro ?? "erro desconhecido"}. Tente de novo em instantes.`}
      </p>
    </div>
  );
}
