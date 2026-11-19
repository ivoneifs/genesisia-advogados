"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Calculator, Search, Sparkles, Workflow } from "lucide-react";
import type { Calculadora } from "@/lib/prev/calc/tipos";

type Item = Pick<Calculadora, "id" | "secao" | "nome" | "fundamento" | "modo" | "aba">;

/** Catálogo pesquisável de calculadoras, agrupado por seção. */
export default function CatalogoCalculadoras({
  itens,
  secoes,
  rotaBase,
  motorBase,
}: {
  itens: Item[];
  secoes: Record<number, string>;
  rotaBase: string;
  /** URL do cálculo completo (recebe ?aba=). */
  motorBase: string;
}) {
  const urlMotor = (aba?: string) => `${motorBase}?${new URLSearchParams({ ...(aba ? { aba } : {}), ...(aba === "rpps" ? { regime: "RPPS" } : {}) })}`;
  const [q, setQ] = useState("");
  const [secao, setSecao] = useState<number | null>(null);
  const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const filtrados = useMemo(() => {
    const termo = normal(q.trim());
    return itens.filter((c) => (secao === null || c.secao === secao) && (!termo || normal(`${c.nome} ${c.fundamento ?? ""}`).includes(termo)));
  }, [itens, q, secao]);
  const grupos = [...new Set(filtrados.map((c) => c.secao))].sort((a, b) => a - b);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Calculadoras <span className="text-sm font-normal text-gray-500">({itens.length})</span></h2>
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cálculo (ex.: fator, pensão, teto...)" className="w-full rounded-lg border border-gray-300 bg-white pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setSecao(null)} className={`text-xs rounded-full px-3 py-1 border ${secao === null ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white border-gray-200 text-gray-600"}`}>Todas</button>
        {Object.entries(secoes).map(([n, nome]) => (
          <button key={n} onClick={() => setSecao(Number(n))} className={`text-xs rounded-full px-3 py-1 border ${secao === Number(n) ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white border-gray-200 text-gray-600"}`}>{n}. {nome}</button>
        ))}
      </div>
      {grupos.map((g) => (
        <div key={g}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">{g}. {secoes[g]}</p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {filtrados.filter((c) => c.secao === g).map((c) => (
              <Link key={c.id} href={c.modo === "motor" ? urlMotor(c.aba) : `${rotaBase}/ferramentas/${c.id}`} className="group rounded-xl border border-gray-200 bg-white px-3 py-2.5 hover:border-[var(--brand)] hover:shadow-sm transition">
                <p className="text-sm font-medium text-gray-900 group-hover:text-[var(--brand)] flex items-start gap-1.5">
                  {c.modo === "ia" ? <Sparkles size={14} className="mt-0.5 shrink-0 text-violet-500" /> : c.modo === "motor" ? <Workflow size={14} className="mt-0.5 shrink-0 text-indigo-500" /> : <Calculator size={14} className="mt-0.5 shrink-0 text-[var(--brand)]" />}
                  {c.nome}
                </p>
                {c.fundamento && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 pl-5">{c.fundamento}</p>}
              </Link>
            ))}
          </div>
        </div>
      ))}
      {!filtrados.length && <p className="text-sm text-gray-500">Nenhum cálculo encontrado.</p>}
      <p className="text-[11px] text-gray-400 flex flex-wrap gap-3">
        <span className="flex items-center gap-1"><Calculator size={11} /> cálculo direto</span>
        <span className="flex items-center gap-1"><Workflow size={11} /> abre o cálculo completo</span>
        <span className="flex items-center gap-1"><Bot size={11} /> assistido por IA</span>
      </p>
    </section>
  );
}
