"use client";

import { useState } from "react";
import { Check, Copy, FileDown, Loader2, SpellCheck, Wand2, Scale, MessageSquareText, ListCollapse, AlertCircle, ArrowRightLeft } from "lucide-react";
import { baixarDocx } from "@/lib/exportar-docx";

const MODOS = [
  { id: "corrigir", nome: "Corrigir erros", desc: "Ortografia, acentos, pontuação, concordância e crase", icone: SpellCheck },
  { id: "melhorar", nome: "Melhorar redação", desc: "Clareza, coesão e fluidez, sem mudar o sentido", icone: Wand2 },
  { id: "juridico", nome: "Linguagem jurídica", desc: "Tom formal e técnico para peças", icone: Scale },
  { id: "simplificar", nome: "Linguagem simples", desc: "Para o cliente leigo entender", icone: MessageSquareText },
  { id: "resumir", nome: "Resumir", desc: "Versão curta com o essencial", icone: ListCollapse },
] as const;

type Alteracao = { de: string; para: string; motivo: string };

export default function RevisorTextos() {
  const [texto, setTexto] = useState("");
  const [modo, setModo] = useState<(typeof MODOS)[number]["id"]>("corrigir");
  const [resultado, setResultado] = useState("");
  const [alteracoes, setAlteracoes] = useState<Alteracao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function revisar() {
    if (!texto.trim() || carregando) return;
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/ia/revisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto, modo }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao revisar.");
      setResultado(data.texto);
      setAlteracoes(data.alteracoes ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao revisar.");
    } finally {
      setCarregando(false);
    }
  }

  const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {MODOS.map(({ id, nome, desc, icone: Icone }) => (
          <button
            key={id}
            onClick={() => setModo(id)}
            className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${modo === id ? "border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]" : "border-gray-200 bg-white hover:border-gray-300"}`}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900"><Icone size={15} className="text-[var(--brand)]" /> {nome}</span>
            <span className="block text-[11px] text-gray-500 mt-0.5">{desc}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white flex flex-col">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="font-medium text-gray-700">Texto original</span>
            <span>{palavras} palavra(s)</span>
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cole ou digite aqui o texto a ser revisado..."
            className="flex-1 min-h-[360px] resize-y p-4 text-sm leading-relaxed focus:outline-none rounded-b-xl"
          />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white flex flex-col">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between text-xs">
            <span className="font-medium text-gray-700">Texto revisado</span>
            {resultado && (
              <div className="flex gap-3 text-gray-500">
                <button onClick={async () => { await navigator.clipboard.writeText(resultado).catch(() => {}); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }} className="flex items-center gap-1 hover:text-[var(--brand)]">
                  {copiado ? <Check size={12} /> : <Copy size={12} />} {copiado ? "Copiado" : "Copiar"}
                </button>
                <button onClick={() => baixarDocx(resultado, "Texto_revisado")} className="flex items-center gap-1 hover:text-[var(--brand)]"><FileDown size={12} /> Word</button>
                <button onClick={() => { setTexto(resultado); setResultado(""); setAlteracoes([]); }} className="flex items-center gap-1 hover:text-[var(--brand)]"><ArrowRightLeft size={12} /> Usar como original</button>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-[360px] p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
            {carregando ? (
              <span className="flex items-center gap-2 text-gray-400"><Loader2 size={14} className="animate-spin" /> Revisando...</span>
            ) : resultado || <span className="text-gray-400">O resultado aparece aqui.</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={revisar} disabled={carregando || !texto.trim()} className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50 flex items-center gap-2">
          {carregando ? <Loader2 size={15} className="animate-spin" /> : <SpellCheck size={15} />} Revisar texto
        </button>
        {erro && <span className="text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} /> {erro}</span>}
      </div>

      {alteracoes.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <p className="px-4 py-2.5 border-b border-gray-100 text-sm font-medium text-gray-900">{alteracoes.length} alteração(ões)</p>
          <ul className="divide-y divide-gray-100">
            {alteracoes.map((a, i) => (
              <li key={i} className="px-4 py-2.5 text-sm grid sm:grid-cols-[1fr_1fr_1.2fr] gap-2">
                <span className="text-red-700 line-through decoration-red-300">{a.de}</span>
                <span className="text-emerald-700">{a.para}</span>
                <span className="text-gray-500 text-xs">{a.motivo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-gray-400">O texto é enviado ao serviço de IA só para a revisão e não fica guardado no sistema.</p>
    </div>
  );
}
