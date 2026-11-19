"use client";

import { useActionState, useState } from "react";
import { Check, Loader2, ToggleRight } from "lucide-react";
import { GRUPOS_MODULOS, IDS_VALIDOS } from "@/lib/modulos";
import { salvarModulos, type ModulosState } from "@/lib/actions/admin";

export default function ModulosEscritorio({
  id,
  nome,
  desativados,
  onFechar,
}: {
  id: string;
  nome: string;
  desativados: string[];
  onFechar: () => void;
}) {
  const [ligados, setLigados] = useState<Set<string>>(
    () => new Set([...IDS_VALIDOS].filter((m) => !desativados.includes(m)))
  );
  const [estado, acao, salvando] = useActionState<ModulosState, FormData>(salvarModulos, undefined);

  const alternar = (mid: string, filhos: string[] = []) =>
    setLigados((atual) => {
      const novo = new Set(atual);
      if (novo.has(mid)) {
        novo.delete(mid);
      } else {
        novo.add(mid);
        filhos.forEach((f) => novo.add(f));
      }
      return novo;
    });

  const todos = (ligar: boolean) => setLigados(ligar ? new Set(IDS_VALIDOS) : new Set());

  return (
    <form action={acao} className="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-4">
      <input type="hidden" name="id" value={id} />
      {[...ligados].map((m) => (
        <input key={m} type="hidden" name="ligado" value={m} />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ToggleRight size={16} className="text-[var(--brand)]" /> Módulos e funções — {nome}
          </p>
          <p className="text-xs text-gray-500">
            Desmarque para esconder do menu e bloquear o acesso (inclusive por link direto e pela API).
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button type="button" onClick={() => todos(true)} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 hover:bg-slate-100">
            Ligar tudo
          </button>
          <button type="button" onClick={() => todos(false)} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 hover:bg-slate-100">
            Desligar tudo
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {GRUPOS_MODULOS.map((g) => (
          <div key={g.titulo} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{g.titulo}</p>
            <div className="space-y-2">
              {g.modulos.map((m) => {
                const ligado = ligados.has(m.id);
                const filhos = (m.funcoes ?? []).map((f) => f.id);
                return (
                  <div key={m.id}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ligado}
                        onChange={() => alternar(m.id, filhos)}
                        className="h-4 w-4 accent-[var(--brand)]"
                      />
                      {m.nome}
                    </label>
                    {m.funcoes && (
                      <div className="ml-6 mt-1 space-y-1">
                        {m.funcoes.map((f) => (
                          <label
                            key={f.id}
                            className={`flex items-center gap-2 text-xs cursor-pointer ${ligado ? "text-gray-600" : "text-gray-300"}`}
                          >
                            <input
                              type="checkbox"
                              disabled={!ligado}
                              checked={ligado && ligados.has(f.id)}
                              onChange={() => alternar(f.id)}
                              className="h-3.5 w-3.5 accent-[var(--brand)]"
                            />
                            {f.nome}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-1.5 shadow-sm disabled:opacity-60 flex items-center gap-1.5"
        >
          {salvando && <Loader2 size={14} className="animate-spin" />} Salvar para este escritório
        </button>
        <button
          type="submit"
          name="aplicarTodos"
          value="1"
          disabled={salvando}
          onClick={(e) => {
            if (!confirm("Aplicar esta mesma configuração de módulos a TODOS os escritórios?")) e.preventDefault();
          }}
          className="rounded-lg border border-slate-300 bg-white text-sm font-medium px-4 py-1.5 hover:bg-slate-100 disabled:opacity-60"
        >
          Aplicar a todos os escritórios
        </button>
        <button type="button" onClick={onFechar} className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-slate-200/60">
          Fechar
        </button>
        {estado && "ok" in estado && (
          <span className="text-xs text-emerald-700 flex items-center gap-1">
            <Check size={13} /> Salvo{estado.todos ? ` em ${estado.todos} escritórios` : ""}.
          </span>
        )}
        {estado && "error" in estado && <span className="text-xs text-red-600">{estado.error}</span>}
      </div>
    </form>
  );
}
