"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DownloadCloud, Loader2, UserRound, ExternalLink, UserPlus, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  iniciarImportacaoOab,
  statusImportacaoOab,
  consultarAdvogadoOab,
  type IniciarImportacaoState,
  type ImportacaoResumo,
  type AdvogadoOabResult,
} from "@/lib/actions/oab";
import { UFS } from "@/lib/djen";

const CNA_URL = "https://cna.oab.org.br/";

export default function ImportarOabForm({ inicial }: { inicial: ImportacaoResumo | null }) {
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
            Traz do Diário de Justiça Eletrônico Nacional (CNJ) todos os processos e
            publicações do advogado, marca cada processo como Ativo ou Arquivado
            (DataJud) e cadastra o advogado.
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
          disabled={pending || rodando}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {pending || rodando ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <DownloadCloud size={15} />
          )}
          {pending ? "Iniciando..." : rodando ? "Importando..." : "Importar todos os processos"}
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
