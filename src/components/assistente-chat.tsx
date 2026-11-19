"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bot,
  Send,
  User,
  Sparkles,
  AlertCircle,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  Loader2,
  Copy,
  Check,
  FileDown,
  RotateCcw,
  UploadCloud,
  Wand2,
} from "lucide-react";
import { baixarDocx } from "@/lib/exportar-docx";

type Message = { role: "user" | "assistant"; content: string; meta?: string };

const AREAS_IA: [string, string][] = [
  ["", "Especialista automático"],
  ["civel", "Cível e processo civil"],
  ["familia", "Família e sucessões"],
  ["consumidor", "Consumidor"],
  ["trabalhista", "Trabalhista"],
  ["previdenciario", "Previdenciário"],
  ["penal", "Penal e processo penal"],
  ["tributario", "Tributário"],
  ["administrativo", "Administrativo e constitucional"],
  ["empresarial", "Empresarial"],
  ["imobiliario", "Imobiliário e contratos"],
  ["digital", "Digital e LGPD"],
];

const FORMATOS_RELATORIO: [string, string][] = [
  ["relatorio", "Relatório jurídico"],
  ["cliente", "Relatório para o cliente"],
  ["parecer", "Parecer formal"],
  ["executivo", "Resumo executivo"],
];

type Anexo = {
  id: string;
  nome: string;
  tipo: "pdf" | "pdf-escaneado" | "word" | "imagem" | "texto";
  tamanho: number;
  paginas: number | null;
  caracteres: number;
};

type Envio = { chave: string; nome: string };

const MAX_ANEXOS = 5;
const ACEITOS = ".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.webp,image/*,application/pdf";

const SUGESTOES = [
  "Quais prazos vencem essa semana?",
  "Me dê um resumo do processo mais recente",
  "Como está o financeiro do escritório?",
  "Redija uma notificação extrajudicial simples",
];

const ACOES_ANEXO = [
  {
    rotulo: "Resumir o processo",
    texto:
      "Leia os documentos anexados e faça um resumo completo do processo: partes, número, juízo, pedidos, valor da causa, fatos, teses de cada parte, decisões proferidas, fase atual e próximos passos.",
  },
  {
    rotulo: "Linha do tempo",
    texto:
      "Monte a linha do tempo do processo anexado, em ordem cronológica, com data, ato processual, quem praticou e a página onde consta.",
  },
  {
    rotulo: "Pontos fortes e fracos",
    texto:
      "Analise o processo anexado e liste os pontos fortes e fracos do nosso cliente, os pontos controvertidos, as provas existentes e as que faltam, e os principais riscos.",
  },
  {
    rotulo: "Prazos e próximos passos",
    texto:
      "Com base nos documentos anexados, identifique a última decisão ou intimação, os prazos processuais em curso (com o fundamento legal) e as providências recomendadas.",
  },
  {
    rotulo: "Jurisprudência e legislação",
    texto:
      "Indique a legislação (com artigos), as súmulas e os temas de tribunais superiores e a doutrina que embasam a tese do nosso cliente no processo anexado, explicando como cada um se aplica ao caso concreto.",
  },
];

const PECAS = [
  "Contestação",
  "Réplica / Impugnação à contestação",
  "Petição inicial",
  "Recurso de apelação",
  "Contrarrazões de apelação",
  "Agravo de instrumento",
  "Embargos de declaração",
  "Recurso inominado",
  "Recurso especial",
  "Recurso ordinário trabalhista",
  "Memoriais / Alegações finais",
  "Manifestação sobre laudo pericial",
  "Petição de cumprimento de sentença",
  "Impugnação ao cumprimento de sentença",
  "Exceção de pré-executividade",
  "Petição intermediária (manifestação)",
  "Pedido de tutela de urgência",
  "Habeas corpus",
  "Resposta à acusação",
  "Parecer jurídico",
  "Notificação extrajudicial",
  "Acordo / Minuta de transação",
];

function formatarTamanho(b: number) {
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function descricaoAnexo(a: Anexo) {
  const partes = [formatarTamanho(a.tamanho)];
  if (a.paginas) partes.push(`${a.paginas} pág.`);
  if (a.tipo === "pdf-escaneado") partes.push("digitalizado");
  if (a.tipo === "imagem") partes.push("imagem");
  return partes.join(" · ");
}

// Markdown mínimo: títulos (#) e negrito (**).
function negrito(linha: string): ReactNode[] {
  return linha.split(/(\*\*[^*]+\*\*)/g).map((t, i) =>
    t.startsWith("**") && t.endsWith("**") && t.length > 4 ? (
      <strong key={i}>{t.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{t}</Fragment>
    )
  );
}

function Texto({ conteudo }: { conteudo: string }) {
  return (
    <>
      {conteudo.split("\n").map((linha, i) => {
        const titulo = linha.match(/^#{1,4}\s+(.*)$/);
        if (titulo)
          return (
            <div key={i} className="font-semibold text-gray-900 mt-2">
              {negrito(titulo[1])}
            </div>
          );
        return (
          <div key={i} className={linha.trim() ? "" : "h-3"}>
            {negrito(linha)}
          </div>
        );
      })}
    </>
  );
}

function tituloDocx(mensagens: Message[], indice: number) {
  const pergunta = [...mensagens.slice(0, indice)].reverse().find((m) => m.role === "user")?.content ?? "";
  const peca = PECAS.find((p) => pergunta.toLowerCase().includes(p.split(" /")[0].toLowerCase()));
  return peca ?? "Analise_Genesis_IA";
}

export default function AssistenteChat({ anexosAtivos = true }: { anexosAtivos?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [area, setArea] = useState("");
  const [revisao, setRevisao] = useState(false);
  const [melhorando, setMelhorando] = useState(false);
  const [dicas, setDicas] = useState<string[]>([]);
  const [gerandoRelatorio, setGerandoRelatorio] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [enviando, setEnviando] = useState<Envio[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [copiado, setCopiado] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function enviarArquivos(lista: FileList | File[]) {
    const arquivos = Array.from(lista);
    const vagas = MAX_ANEXOS - anexos.length - enviando.length;
    if (arquivos.length > vagas) {
      setError(`Você pode anexar até ${MAX_ANEXOS} arquivos por conversa.`);
    } else {
      setError(null);
    }
    await Promise.all(
      arquivos.slice(0, Math.max(0, vagas)).map(async (arquivo) => {
        const chave = `${arquivo.name}-${arquivo.size}-${Math.random()}`;
        setEnviando((e) => [...e, { chave, nome: arquivo.name }]);
        try {
          if (arquivo.size > 20 * 1024 * 1024) {
            throw new Error(`"${arquivo.name}" tem mais de 20 MB.`);
          }
          const fd = new FormData();
          fd.append("arquivo", arquivo);
          const res = await fetch("/api/assistente/anexos", { method: "POST", body: fd });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(`"${arquivo.name}": ${data.error ?? "erro ao enviar."}`);
          setAnexos((a) => [...a, data.anexo as Anexo]);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao enviar o arquivo.");
        } finally {
          setEnviando((e) => e.filter((x) => x.chave !== chave));
        }
      })
    );
  }

  function removerAnexo(id: string) {
    setAnexos((a) => a.filter((x) => x.id !== id));
    fetch(`/api/assistente/anexos?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  function novaConversa() {
    anexos.forEach((a) => removerAnexo(a.id));
    setMessages([]);
    setInput("");
    setError(null);
  }

  function preencher(texto: string) {
    setInput(texto);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(texto.length, texto.length);
    });
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading || enviando.length) return;

    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), anexos: anexos.map((a) => a.id), area: area || undefined, revisao }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Erro ao consultar o assistente.");
        return;
      }

      const meta = [data.areas?.length ? `Especialista: ${data.areas.join(" e ")}` : "", data.revisado ? "revisado por revisor sênior" : ""].filter(Boolean).join(" · ");
      setMessages([...next, { role: "assistant", content: data.reply, meta }]);
      setDicas([]);
    } catch {
      setError("Não foi possível conectar ao assistente. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  async function melhorarPedido() {
    const texto = input.trim();
    if (!texto || melhorando) return;
    setMelhorando(true);
    setError(null);
    try {
      const res = await fetch("/api/ia/melhorar-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, destino: "assistente", anexos: anexos.map((a) => a.nome) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao melhorar o pedido.");
      setInput(data.prompt);
      setDicas(data.perguntas ?? []);
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao melhorar o pedido.");
    } finally {
      setMelhorando(false);
    }
  }

  async function gerarRelatorio(i: number, formato: string) {
    setGerandoRelatorio(i);
    setError(null);
    try {
      const res = await fetch("/api/ia/relatorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: messages[i].content, formato }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar o relatório.");
      const nome = FORMATOS_RELATORIO.find(([v]) => v === formato)?.[1] ?? "Relatório";
      setMessages((m) => [...m, { role: "assistant", content: data.relatorio, meta: `${nome} gerado a partir da resposta anterior` }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar o relatório.");
    } finally {
      setGerandoRelatorio(null);
    }
  }

  async function copiar(i: number, texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(i);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      /* navegador sem permissão de área de transferência */
    }
  }

  const temAnexos = anexos.length > 0;

  return (
    <div
      className={`relative rounded-xl border bg-white flex flex-col h-[calc(100vh-220px)] min-h-[520px] ${
        arrastando ? "border-[var(--brand)] ring-2 ring-[var(--brand)]/30" : "border-gray-200"
      }`}
      onDragOver={(e) => {
        if (!anexosAtivos || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setArrastando(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        if (e.dataTransfer.files.length) enviarArquivos(e.dataTransfer.files);
      }}
    >
      {arrastando && (
        <div className="absolute inset-0 z-10 rounded-xl bg-white/90 flex flex-col items-center justify-center gap-2 text-[var(--brand)] pointer-events-none">
          <UploadCloud size={36} />
          <p className="font-medium">Solte os arquivos do processo aqui</p>
          <p className="text-xs text-gray-500">PDF, DOC, DOCX, TXT ou imagens · até 20 MB cada</p>
        </div>
      )}

      {(messages.length > 0 || temAnexos) && (
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
          <p className="text-xs text-gray-500">
            {temAnexos
              ? `${anexos.length} documento(s) em análise nesta conversa`
              : "Conversa com o assistente"}
          </p>
          <button
            onClick={novaConversa}
            className="text-xs flex items-center gap-1 text-gray-500 hover:text-[var(--brand)]"
          >
            <RotateCcw size={12} /> Nova conversa
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="min-h-full flex flex-col items-center justify-center text-center gap-4 px-2 sm:px-6">
            <div className="h-12 w-12 rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center">
              <Bot size={24} />
            </div>
            <div>
              <p className="font-medium text-gray-900">Assistente Genesis IA</p>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                {temAnexos
                  ? "Documentos prontos. Escolha uma ação abaixo ou diga o que você precisa."
                  : "Pergunte sobre seus processos, prazos, clientes e financeiro, ou anexe os autos para a IA analisar e redigir a peça."}
              </p>
            </div>

            {!temAnexos && anexosAtivos && (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full max-w-md rounded-xl border-2 border-dashed border-gray-300 hover:border-[var(--brand)] hover:bg-[var(--brand)]/5 px-4 py-5 text-sm text-gray-600 transition-colors"
              >
                <UploadCloud size={22} className="mx-auto mb-1.5 text-[var(--brand)]" />
                <span className="font-medium text-gray-800">Enviar processo para análise</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Clique ou arraste · PDF, DOC, DOCX, TXT ou imagens · até 5 arquivos
                </span>
              </button>
            )}

            {temAnexos ? (
              <div className="w-full max-w-xl space-y-3">
                <div className="flex flex-wrap justify-center gap-2">
                  {ACOES_ANEXO.map((a) => (
                    <button
                      key={a.rotulo}
                      onClick={() => send(a.texto)}
                      disabled={!!enviando.length}
                      className="text-xs rounded-full border border-gray-200 px-3 py-1.5 text-gray-600 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors disabled:opacity-50"
                    >
                      {a.rotulo}
                    </button>
                  ))}
                </div>
                <SeletorPeca onEscolher={preencher} />
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs rounded-full border border-gray-200 px-3 py-1.5 text-gray-600 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                m.role === "user"
                  ? "bg-gray-100 text-gray-600"
                  : "bg-[var(--brand)]/10 text-[var(--brand)]"
              }`}
            >
              {m.role === "user" ? <User size={15} /> : <Bot size={15} />}
            </div>
            <div className="max-w-[85%] sm:max-w-[75%] min-w-0">
              <div
                className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                  m.role === "user"
                    ? "bg-[var(--brand)] text-white whitespace-pre-wrap"
                    : "bg-gray-50 text-gray-800"
                }`}
              >
                {m.role === "user" ? m.content : <Texto conteudo={m.content} />}
              </div>
              {m.role === "assistant" && (
                <div className="flex gap-3 mt-1.5 ml-1 text-xs text-gray-500">
                  <button
                    onClick={() => copiar(i, m.content)}
                    className="flex items-center gap-1 hover:text-[var(--brand)]"
                  >
                    {copiado === i ? <Check size={12} /> : <Copy size={12} />}
                    {copiado === i ? "Copiado" : "Copiar"}
                  </button>
                  <button
                    onClick={() => baixarDocx(m.content, tituloDocx(messages, i))}
                    className="flex items-center gap-1 hover:text-[var(--brand)]"
                  >
                    <FileDown size={12} /> Baixar Word (.docx)
                  </button>
                  <select
                    value=""
                    disabled={gerandoRelatorio !== null}
                    onChange={(e) => e.target.value && gerarRelatorio(i, e.target.value)}
                    className="bg-transparent text-xs text-gray-500 hover:text-[var(--brand)] cursor-pointer focus:outline-none"
                    title="Transformar esta resposta em relatório"
                  >
                    <option value="">{gerandoRelatorio === i ? "Gerando relatório..." : "Transformar em relatório ▾"}</option>
                    {FORMATOS_RELATORIO.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                  </select>
                </div>
              )}
              {m.role === "assistant" && m.meta && <p className="ml-1 mt-0.5 text-[10px] text-violet-600">{m.meta}</p>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center shrink-0">
              <Bot size={15} />
            </div>
            <div className="rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400 flex items-center gap-1.5">
              <Sparkles size={13} className="animate-pulse" />
              {temAnexos ? "analisando os documentos... (peças longas podem levar até 2 minutos)" : "pensando..."}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {(temAnexos || enviando.length > 0) && (
        <div className="border-t border-gray-100 px-3 pt-2.5 flex flex-wrap gap-2">
          {anexos.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 pl-2 pr-1 py-1 text-xs max-w-[260px]"
              title={a.nome}
            >
              {a.tipo === "imagem" ? (
                <ImageIcon size={14} className="text-[var(--brand)] shrink-0" />
              ) : (
                <FileText size={14} className="text-[var(--brand)] shrink-0" />
              )}
              <div className="min-w-0">
                <p className="truncate text-gray-800">{a.nome}</p>
                <p className="text-[10px] text-gray-500">{descricaoAnexo(a)}</p>
              </div>
              <button
                onClick={() => removerAnexo(a.id)}
                className="p-1 rounded hover:bg-gray-200 text-gray-500"
                aria-label={`Remover ${a.nome}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {enviando.map((e) => (
            <div
              key={e.chave}
              className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-xs text-gray-500 max-w-[260px]"
            >
              <Loader2 size={14} className="animate-spin shrink-0" />
              <span className="truncate">Lendo {e.nome}...</span>
            </div>
          ))}
        </div>
      )}

      {temAnexos && messages.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap items-center gap-1.5">
          {ACOES_ANEXO.map((a) => (
            <button
              key={a.rotulo}
              onClick={() => send(a.texto)}
              disabled={loading}
              className="text-[11px] rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-50"
            >
              {a.rotulo}
            </button>
          ))}
          <SeletorPeca onEscolher={preencher} compacto />
        </div>
      )}

      <div className="px-3 pt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <select value={area} onChange={(e) => setArea(e.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs" title="Área de especialidade da IA">
          {AREAS_IA.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <label className="flex items-center gap-1.5 cursor-pointer" title="Um segundo advogado sênior revisa a resposta antes de entregar (mais preciso, demora um pouco mais)">
          <input type="checkbox" checked={revisao} onChange={(e) => setRevisao(e.target.checked)} className="accent-[var(--brand)]" />
          Revisão dupla (mais precisa)
        </label>
        {dicas.length > 0 && (
          <span className="text-[11px] text-violet-700">Para um resultado melhor, informe: {dicas.join("; ")}</span>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-3 flex items-end gap-2"
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACEITOS}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) enviarArquivos(e.target.files);
            e.target.value = "";
          }}
        />
        {anexosAtivos && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={anexos.length + enviando.length >= MAX_ANEXOS}
          title="Anexar processo (PDF, DOC, DOCX, imagens)"
          className="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:text-[var(--brand)] hover:border-[var(--brand)] disabled:opacity-40"
        >
          <Paperclip size={16} />
        </button>
        )}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={input.length > 120 ? 3 : 1}
          placeholder={
            temAnexos
              ? "Diga o que você precisa: ex. elabore a contestação, resuma a sentença..."
              : "Pergunte algo ou anexe o processo..."
          }
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] max-h-40"
        />
        <button
          type="button"
          onClick={melhorarPedido}
          disabled={melhorando || !input.trim()}
          title="Melhorar pedido: a IA reescreve seu pedido de forma completa e detalhada"
          className="h-10 px-2.5 flex items-center gap-1 justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-xs font-medium hover:bg-violet-100 disabled:opacity-40"
        >
          {melhorando ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          <span className="hidden sm:inline">Melhorar pedido</span>
        </button>
        <button
          type="submit"
          disabled={loading || !input.trim() || enviando.length > 0}
          className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white transition-colors disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function SeletorPeca({
  onEscolher,
  compacto = false,
}: {
  onEscolher: (texto: string) => void;
  compacto?: boolean;
}) {
  return (
    <select
      value=""
      onChange={(e) => {
        const peca = e.target.value;
        if (!peca) return;
        onEscolher(
          `Com base no processo anexado, elabore a peça "${peca}" completa, em favor do nosso cliente, com fatos, fundamentos jurídicos (legislação, súmulas e jurisprudência aplicáveis) e pedidos. Observações: `
        );
      }}
      className={
        compacto
          ? "text-[11px] rounded-full border border-[var(--brand)]/40 bg-white px-2.5 py-1 text-[var(--brand)]"
          : "w-full max-w-sm mx-auto block text-sm rounded-lg border border-[var(--brand)]/40 bg-white px-3 py-2 text-[var(--brand)] font-medium"
      }
    >
      <option value="">{compacto ? "Criar peça..." : "✍️ Criar uma peça a partir do processo..."}</option>
      {PECAS.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}
