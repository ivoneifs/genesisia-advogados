"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Bot, Check, Copy, FileDown, FileText, Loader2, Save, Sparkles } from "lucide-react";
import type { Calculadora, Campo, Saida, Valores } from "@/lib/prev/calc/tipos";
import { salvarCalculo, type Area, type ClienteOpcao } from "@/lib/actions/calculos";
import { relatorioComoTexto, type RelatorioDados } from "@/lib/relatorio";
import { hojeISO } from "@/lib/prev/datas";
import { baixarDocx } from "@/lib/exportar-docx";
import ClienteSelect from "./cliente-select";
import { useIndices } from "./usar-indices";

const INPUT = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]";

function CampoForm({ c, valor, onChange }: { c: Campo; valor: Valores[string]; onChange: (v: Valores[string]) => void }) {
  const v = valor ?? "";
  const largo = c.largura === "inteira" || c.tipo === "salarios" || c.tipo === "periodos" || c.tipo === "textoLongo";
  return (
    <div className={largo ? "sm:col-span-2 lg:col-span-3" : ""}>
      {c.tipo === "checkbox" ? (
        <label className="flex items-center gap-2 text-sm text-gray-700 mt-5">
          <input type="checkbox" checked={v === true || v === "true"} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
          {c.rotulo}
        </label>
      ) : (
        <>
          <label className="block text-xs font-medium text-gray-600 mb-1">{c.rotulo}{c.obrigatorio && " *"}</label>
          {c.tipo === "select" ? (
            <select value={String(v)} onChange={(e) => onChange(e.target.value)} className={INPUT}>
              {c.opcoes?.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </select>
          ) : c.tipo === "salarios" || c.tipo === "periodos" || c.tipo === "textoLongo" ? (
            <textarea value={String(v)} onChange={(e) => onChange(e.target.value)} rows={c.tipo === "textoLongo" ? 4 : 6} className={`${INPUT} font-mono text-xs`} placeholder={c.tipo === "salarios" ? "07/1994 582,86\n08/1994 600,00" : c.tipo === "periodos" ? "01/03/1990 a 28/02/2000 comum\n01/03/2000 a 13/11/2019 especial25" : ""} />
          ) : (
            <input
              type={c.tipo === "data" ? "date" : c.tipo === "competencia" ? "month" : c.tipo === "texto" ? "text" : "text"}
              inputMode={["numero", "inteiro", "moeda", "percentual"].includes(c.tipo) ? "decimal" : undefined}
              value={String(v)}
              onChange={(e) => onChange(e.target.value)}
              className={INPUT}
              placeholder={c.tipo === "moeda" ? "0,00" : c.tipo === "percentual" ? "%" : ""}
            />
          )}
        </>
      )}
      {c.ajuda && <p className="text-[11px] text-gray-400 mt-1">{c.ajuda}</p>}
    </div>
  );
}

export function ResultadoSaida({ saida }: { saida: Saida }) {
  return (
    <div className="space-y-4">
      <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {saida.linhas.map((l, i) => (
          <div key={i} className={`flex flex-wrap justify-between gap-2 px-3 py-2 text-sm ${l.destaque ? "bg-[var(--brand)]/5 font-semibold text-gray-900" : "text-gray-700"}`}>
            <dt>{l.rotulo}</dt>
            <dd className="text-right">{l.valor}</dd>
          </div>
        ))}
      </dl>
      {saida.memoria.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Memória de cálculo</p>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">{saida.memoria.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}
      {saida.avisos && saida.avisos.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 space-y-1">{saida.avisos.map((a, i) => <p key={i}>{a}</p>)}</div>
      )}
      {saida.tabela && saida.tabela.linhas.length > 0 && (
        <div>
          {saida.tabela.titulo && <p className="text-sm font-medium mb-1">{saida.tabela.titulo}</p>}
          <div className="overflow-x-auto max-h-[420px] rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>{saida.tabela.colunas.map((c) => <th key={c} className="px-2 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap">{c}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {saida.tabela.linhas.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j} className="px-2 py-1 whitespace-nowrap">{c}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function saidaParaRelatorio(titulo: string, subtitulo: string, saida: Saida, extras: RelatorioDados["secoes"] = []): RelatorioDados {
  return {
    titulo,
    subtitulo,
    geradoEm: new Date().toISOString(),
    secoes: [
      { titulo: "Resultado", linhas: saida.linhas },
      ...(saida.memoria.length ? [{ titulo: "Memória de cálculo e fundamentos", memoria: saida.memoria }] : []),
      ...(saida.tabela ? [{ titulo: saida.tabela.titulo ?? "Demonstrativo", tabela: saida.tabela }] : []),
      ...extras,
    ],
    avisos: saida.avisos,
    destaque: saida.linhas.find((l) => l.destaque)?.valor,
  };
}

export type CalculoSalvo = {
  id: string;
  titulo: string;
  dados: Valores & { __ia?: string };
  parecer: string | null;
  cliente: ClienteOpcao | null;
};

export default function CalculadoraTela({
  calc,
  area,
  rotaBase,
  salvo,
  podeIA,
}: {
  calc: Calculadora;
  area: Area;
  rotaBase: string;
  salvo: CalculoSalvo | null;
  podeIA: boolean;
}) {
  const router = useRouter();
  const { indices, carregando: carregandoIndices } = useIndices();
  const padroes = useMemo(() => Object.fromEntries((calc.campos ?? []).map((c) => [c.id, c.padrao ?? (c.tipo === "checkbox" ? false : "")])) as Valores, [calc]);
  const [valores, setValores] = useState<Valores>({ ...padroes, ...(salvo?.dados ?? {}) });
  const [titulo, setTitulo] = useState(salvo?.titulo ?? calc.nome);
  const [cliente, setCliente] = useState<ClienteOpcao | null>(salvo?.cliente ?? null);
  const [id, setId] = useState<string | null>(salvo?.id ?? null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [textoIA, setTextoIA] = useState<string>(salvo?.parecer ?? "");
  const [pedidoIA, setPedidoIA] = useState(String(salvo?.dados?.__ia ?? ""));
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const DOCS = area === "TRABALHISTA"
    ? [["parecer", "Parecer"], ["peticao-trabalhista", "Petição inicial (pedidos líquidos)"], ["impugnacao-calculos", "Impugnação de cálculos"]]
    : [["parecer", "Parecer"], ["planejamento", "Explicação ao cliente"], ["peticao-concessao", "Petição inicial"], ["peticao-revisao", "Petição de revisão"], ["impugnacao-calculos", "Impugnação de cálculos"]];
  const [docIA, setDocIA] = useState("parecer");

  const saida: Saida | null = useMemo(() => {
    if (calc.modo !== "form" || !calc.calcular) return null;
    try {
      return calc.calcular(valores, { indices, hoje: hojeISO() });
    } catch (e) {
      return { linhas: [{ rotulo: "Erro", valor: e instanceof Error ? e.message : "Verifique os dados." }], memoria: [] };
    }
  }, [calc, valores, indices]);

  const relatorio = (): RelatorioDados => {
    const entradas = (calc.campos ?? []).filter((c) => valores[c.id] !== "" && valores[c.id] !== undefined && c.tipo !== "salarios" && c.tipo !== "periodos");
    const dados: RelatorioDados["secoes"] = entradas.length
      ? [{ titulo: "Dados informados", linhas: entradas.map((c) => ({ rotulo: c.rotulo, valor: c.tipo === "checkbox" ? (valores[c.id] === true || valores[c.id] === "true" ? "Sim" : "Não") : c.tipo === "select" ? c.opcoes?.find((o) => o.valor === String(valores[c.id]))?.rotulo ?? String(valores[c.id]) : String(valores[c.id]) })) }]
      : [];
    const analise: RelatorioDados["secoes"] = calc.modo === "ia" && pedidoIA ? [{ titulo: "Dados do caso", texto: pedidoIA }] : [];
    const r = saidaParaRelatorio(titulo, `${calc.nome}${calc.fundamento ? ` — ${calc.fundamento}` : ""}`, saida ?? { linhas: [], memoria: [] });
    r.secoes = [...dados, ...analise, ...r.secoes.filter((s) => s.linhas?.length || s.memoria?.length || s.tabela)];
    return r;
  };

  async function salvar(): Promise<string | null> {
    setSalvando(true);
    setMsg(null);
    const r = await salvarCalculo({
      id,
      area,
      tipo: calc.id,
      titulo,
      dados: { ...valores, __ia: pedidoIA },
      resumo: relatorio(),
      parecer: textoIA || null,
      clienteId: cliente?.id ?? null,
    });
    setSalvando(false);
    if ("error" in r) {
      setMsg({ tipo: "erro", texto: r.error });
      return null;
    }
    if (!id) {
      setId(r.id);
      router.replace(`${rotaBase}/ferramentas/${calc.id}?calc=${r.id}`, { scroll: false });
    }
    setMsg({ tipo: "ok", texto: "Cálculo salvo." });
    return r.id;
  }

  async function abrirRelatorio() {
    const novaJanela = window.open("about:blank", "_blank");
    const salvoId = await salvar();
    if (salvoId && novaJanela) novaJanela.location.href = `/relatorio/calculo/${salvoId}`;
    else novaJanela?.close();
  }

  async function analisarIA() {
    setCarregandoIA(true);
    setMsg(null);
    try {
      const contexto = `Calculadora: ${calc.nome}\nFundamento: ${calc.fundamento ?? "-"}\n${calc.descricao ?? ""}\n\n${relatorioComoTexto(relatorio())}\n\nPedido/dados do advogado:\n${pedidoIA}`;
      const res = await fetch("/api/prev/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, acao: calc.modo === "ia" ? "calculadora" : docIA, contexto, cliente: cliente?.nome }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro na IA.");
      setTextoIA(data.texto);
    } catch (e) {
      setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Erro na IA." });
    } finally {
      setCarregandoIA(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={rotaBase} className="text-xs text-gray-500 hover:text-[var(--brand)] flex items-center gap-1"><ArrowLeft size={12} /> Voltar ao catálogo</Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">{calc.nome}</h1>
          {calc.fundamento && <p className="text-xs text-gray-500 mt-0.5">{calc.fundamento}</p>}
          {calc.modo === "ia" && <span className="inline-flex mt-1 items-center gap-1 rounded-full bg-violet-100 text-violet-700 text-[11px] px-2 py-0.5"><Sparkles size={11} /> Cálculo assistido por IA</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={salvar} disabled={salvando} className="flex items-center gap-1.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 disabled:opacity-60">
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
          </button>
          <button onClick={abrirRelatorio} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium px-4 py-2 hover:bg-gray-50">
            <FileText size={14} /> Relatório / PDF
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${msg.tipo === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.tipo === "ok" ? <Check size={14} /> : <AlertCircle size={14} />} {msg.texto}
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_1fr] gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título do cálculo</label>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={INPUT} />
            </div>
            <ClienteSelect valor={cliente} onChange={setCliente} />
          </div>
          {calc.campos && calc.campos.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-gray-100 pt-4">
              {calc.campos.map((c) => <CampoForm key={c.id} c={c} valor={valores[c.id]} onChange={(v) => setValores((s) => ({ ...s, [c.id]: v }))} />)}
            </div>
          )}
          {calc.modo === "ia" && (
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Dados do caso e o que precisa ser calculado</label>
              <textarea value={pedidoIA} onChange={(e) => setPedidoIA(e.target.value)} rows={10} className={INPUT} placeholder="Ex.: benefício concedido em 03/1990, RMI de Cr$ ..., salários de contribuição ..., quero saber a renda revista e as diferenças." />
            </div>
          )}
          {calc.modo !== "ia" && podeIA && (
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Orientações para a análise da IA (opcional)</label>
              <textarea value={pedidoIA} onChange={(e) => setPedidoIA(e.target.value)} rows={2} className={INPUT} placeholder="Ex.: explique ao cliente em linguagem simples; destaque riscos." />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Resultado</p>
            {carregandoIndices && <span className="text-[11px] text-gray-400 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> carregando índices</span>}
          </div>
          {saida ? <ResultadoSaida saida={saida} /> : calc.modo === "ia" ? <p className="text-sm text-gray-500">Descreva os dados e clique em “Calcular com IA”.</p> : null}

          {podeIA && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {calc.modo !== "ia" && (
                  <select value={docIA} onChange={(e) => setDocIA(e.target.value)} className="rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-violet-700">
                    {DOCS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                  </select>
                )}
                <button onClick={analisarIA} disabled={carregandoIA} className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-60">
                  {carregandoIA ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} {calc.modo === "ia" ? "Calcular com IA" : "Gerar com IA"}
                </button>
              </div>
              {textoIA && (
                <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3">
                  <div className="flex gap-3 justify-end text-xs text-gray-500 mb-2">
                    <button onClick={async () => { await navigator.clipboard.writeText(textoIA).catch(() => {}); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }} className="flex items-center gap-1 hover:text-[var(--brand)]">{copiado ? <Check size={12} /> : <Copy size={12} />} Copiar</button>
                    <button onClick={() => baixarDocx(textoIA, titulo)} className="flex items-center gap-1 hover:text-[var(--brand)]"><FileDown size={12} /> Word</button>
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800 max-h-[520px] overflow-y-auto">{textoIA}</div>
                  <p className="text-[11px] text-gray-400 mt-2">Salve o cálculo para incluir este texto no relatório.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
