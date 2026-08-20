"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, User, Sparkles, AlertCircle } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const SUGESTOES = [
  "Quais prazos vencem essa semana?",
  "Me dê um resumo do processo mais recente",
  "Como está o financeiro do escritório?",
  "Redija uma notificação extrajudicial simples",
];

export default function AssistenteChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao consultar o assistente.");
        return;
      }

      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Não foi possível conectar ao assistente. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white flex flex-col h-[calc(100vh-220px)] min-h-[480px]">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-6">
            <div className="h-12 w-12 rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center">
              <Bot size={24} />
            </div>
            <div>
              <p className="font-medium text-gray-900">Assistente Genesis IA</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Pergunte sobre seus processos, prazos, clientes e financeiro, ou
                peça ajuda para redigir um texto.
              </p>
            </div>
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
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                m.role === "user"
                  ? "bg-gray-100 text-gray-600"
                  : "bg-[var(--brand)]/10 text-[var(--brand)]"
              }`}
            >
              {m.role === "user" ? <User size={15} /> : <Bot size={15} />}
            </div>
            <div
              className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === "user"
                  ? "bg-[var(--brand)] text-white"
                  : "bg-gray-50 text-gray-800"
              }`}
            >
              {m.content}
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
              pensando...
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-gray-100 p-3 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Pergunte algo sobre o escritório..."
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] max-h-32"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white transition-colors disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
