"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search, UserRound, X } from "lucide-react";
import { buscarClientes, criarClienteRapido, type ClienteOpcao } from "@/lib/actions/calculos";

/** Seleciona o cliente do cálculo, com busca e cadastro rápido. */
export default function ClienteSelect({
  valor,
  onChange,
}: {
  valor: ClienteOpcao | null;
  onChange: (c: ClienteOpcao | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const [opcoes, setOpcoes] = useState<ClienteOpcao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ nome: "", documento: "", telefone: "", email: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    const t = setTimeout(async () => {
      setBuscando(true);
      const r = await buscarClientes(q).catch(() => []);
      if (vivo) {
        setOpcoes(r);
        setBuscando(false);
      }
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [q, aberto]);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  async function cadastrar() {
    setSalvando(true);
    setErro(null);
    const r = await criarClienteRapido(form);
    setSalvando(false);
    if ("error" in r) return setErro(r.error);
    onChange(r);
    setNovo(false);
    setAberto(false);
    setForm({ nome: "", documento: "", telefone: "", email: "" });
  }

  return (
    <div ref={caixa} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
      {valor ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <UserRound size={15} className="text-[var(--brand)]" />
          <span className="flex-1 truncate">{valor.nome}{valor.documento ? ` · ${valor.documento}` : ""}</span>
          <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-700" aria-label="Remover cliente"><X size={14} /></button>
        </div>
      ) : (
        <button type="button" onClick={() => setAberto(true)} className="w-full flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 hover:border-[var(--brand)]">
          <Search size={14} /> Selecionar ou cadastrar cliente
        </button>
      )}

      {aberto && (
        <div className="absolute z-30 mt-1 w-full min-w-[300px] rounded-xl border border-gray-200 bg-white shadow-xl p-2">
          {!novo ? (
            <>
              <div className="flex items-center gap-2 border-b border-gray-100 px-2 pb-2">
                <Search size={14} className="text-gray-400" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou CPF..." className="flex-1 text-sm focus:outline-none" />
                {buscando && <Loader2 size={13} className="animate-spin text-gray-400" />}
              </div>
              <ul className="max-h-56 overflow-y-auto py-1">
                {opcoes.map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => { onChange(o); setAberto(false); }} className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-gray-50">
                      {o.nome} {o.documento && <span className="text-xs text-gray-400">· {o.documento}</span>}
                    </button>
                  </li>
                ))}
                {!buscando && !opcoes.length && <li className="px-2 py-2 text-xs text-gray-400">Nenhum cliente encontrado.</li>}
              </ul>
              <button type="button" onClick={() => { setNovo(true); setForm((f) => ({ ...f, nome: q })); }} className="w-full flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand)]/5">
                <Plus size={14} /> Cadastrar novo cliente
              </button>
            </>
          ) : (
            <div className="space-y-2 p-1">
              <p className="text-sm font-medium text-gray-900">Novo cliente</p>
              {(["nome", "documento", "telefone", "email"] as const).map((k) => (
                <input
                  key={k}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  placeholder={{ nome: "Nome completo *", documento: "CPF", telefone: "Telefone/WhatsApp", email: "E-mail" }[k]}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
              ))}
              {erro && <p className="text-xs text-red-600">{erro}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={cadastrar} disabled={salvando} className="rounded-lg bg-[var(--brand)] text-white text-sm px-3 py-1.5 disabled:opacity-50 flex items-center gap-1">
                  {salvando && <Loader2 size={13} className="animate-spin" />} Salvar cliente
                </button>
                <button type="button" onClick={() => setNovo(false)} className="text-sm text-gray-500 px-2">Voltar</button>
              </div>
              <p className="text-[11px] text-gray-400">O cadastro completo fica em Clientes.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
