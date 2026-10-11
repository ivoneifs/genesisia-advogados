"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, Gavel, Users2, BookUser, UserRound, Paperclip, CornerDownLeft } from "lucide-react";
import type { ResultadoBusca } from "@/app/api/busca/route";

const ICONE = {
  Processo: Gavel,
  Cliente: Users2,
  Contato: BookUser,
  Advogado: UserRound,
  Documento: Paperclip,
};

export default function BuscaGlobal() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atalho Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (aberto) setTimeout(() => inputRef.current?.focus(), 0);
  }, [aberto]);

  useEffect(() => {
    const termo = q.trim();
    if (termo.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setCarregando(true);
      try {
        const r = await fetch(`/api/busca?q=${encodeURIComponent(termo)}`, { signal: ctrl.signal });
        const j = await r.json();
        setResultados(j.resultados ?? []);
        setSel(0);
      } catch {
        // cancelada ou falhou: mantém o que havia
      } finally {
        setCarregando(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  function fechar() {
    setAberto(false);
    setQ("");
    setResultados([]);
  }

  function abrir(r: ResultadoBusca) {
    fechar();
    router.push(r.href);
  }

  const lista = q.trim().length >= 2 ? resultados : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm text-gray-500 h-9 px-2.5 sm:pr-2 sm:w-64"
      >
        <Search size={15} />
        <span className="hidden sm:block flex-1 text-left">Buscar...</span>
        <kbd className="hidden sm:block text-[10px] font-medium text-gray-400 bg-white ring-1 ring-slate-200 rounded px-1.5 py-0.5">
          Ctrl K
        </kbd>
      </button>

      {aberto && createPortal(
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-start justify-center p-4 pt-[10vh]"
          onClick={fechar}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 border-b border-slate-100">
              <Search size={17} className="text-gray-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") fechar();
                  else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSel((s) => Math.min(s + 1, lista.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSel((s) => Math.max(s - 1, 0));
                  } else if (e.key === "Enter" && lista[sel]) abrir(lista[sel]);
                }}
                placeholder="Processo, cliente, contato, advogado ou documento"
                className="flex-1 h-14 text-sm outline-none placeholder:text-gray-400"
              />
              <kbd className="text-[10px] text-gray-400 ring-1 ring-slate-200 rounded px-1.5 py-0.5">Esc</kbd>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {q.trim().length < 2 ? (
                <p className="px-3 py-8 text-center text-sm text-gray-400">
                  Digite ao menos 2 caracteres.
                </p>
              ) : carregando && lista.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-gray-400">Buscando...</p>
              ) : lista.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-gray-400">Nada encontrado.</p>
              ) : (
                <ul>
                  {lista.map((r, i) => {
                    const Icon = ICONE[r.tipo];
                    return (
                      <li key={r.href + r.titulo + i}>
                        <button
                          type="button"
                          onMouseEnter={() => setSel(i)}
                          onClick={() => abrir(r)}
                          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                            i === sel ? "bg-indigo-50" : ""
                          }`}
                        >
                          <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                            i === sel ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-gray-500"
                          }`}>
                            <Icon size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-gray-900 truncate">{r.titulo}</span>
                            <span className="block text-xs text-gray-500 truncate">
                              {r.tipo}{r.detalhe ? ` · ${r.detalhe}` : ""}
                            </span>
                          </span>
                          {i === sel && <CornerDownLeft size={14} className="text-gray-400" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
