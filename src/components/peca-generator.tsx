"use client";

import { useMemo, useState } from "react";
import { TEMPLATES } from "@/lib/templates";
import { Copy, Check, Sparkles, Wand2, AlertCircle } from "lucide-react";
import type { Cliente, Processo } from "@prisma/client";

type ProcessoComCliente = Processo & { cliente: Cliente };

const SUGESTOES_IA = [
  "Notificação de rescisão contratual por inadimplência",
  "Petição solicitando prioridade de tramitação por idade avançada",
  "Contrato de honorários com cláusula de êxito",
];

export default function PecaGenerator({
  clientes,
  processos,
}: {
  clientes: Cliente[];
  processos: ProcessoComCliente[];
}) {
  const [modo, setModo] = useState<"modelo" | "ia">("modelo");
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [clienteId, setClienteId] = useState("");
  const [processoId, setProcessoId] = useState("");
  const [copied, setCopied] = useState(false);

  const [instrucao, setInstrucao] = useState("");
  const [textoIA, setTextoIA] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cliente = clientes.find((c) => c.id === clienteId);
  const processo = processos.find((p) => p.id === processoId);

  const textoModelo = useMemo(() => {
    const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
    return template.gerar({
      clienteNome: cliente?.nome ?? "",
      clienteDocumento: cliente?.documento ?? "",
      clienteEndereco: cliente?.endereco ?? "",
      processoNumero: processo?.numero ?? "",
      processoVara: processo?.vara ?? "",
      processoTribunal: processo?.tribunal ?? "",
      parteContraria: processo?.parteContraria ?? "",
      dataExtenso: new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    });
  }, [templateId, cliente, processo]);

  async function gerarComIA(prompt?: string) {
    const texto = (prompt ?? instrucao).trim();
    if (!texto || loading) return;
    setInstrucao(texto);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pecas/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrucao: texto, clienteId, processoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao gerar o texto.");
        return;
      }
      setTextoIA(data.texto);
    } catch {
      setError("Não foi possível conectar à IA. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  const textoAtual = modo === "modelo" ? textoModelo : textoIA;

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setModo("modelo")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            modo === "modelo"
              ? "bg-[var(--brand)] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Modelo pronto
        </button>
        <button
          type="button"
          onClick={() => setModo("ia")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            modo === "ia"
              ? "bg-[var(--brand)] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Wand2 size={14} /> Gerar com IA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            {modo === "modelo" && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Modelo de peça
                </label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Cliente (auto-preenche)
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              >
                <option value="">—</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Processo (auto-preenche)
              </label>
              <select
                value={processoId}
                onChange={(e) => setProcessoId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              >
                <option value="">—</option>
                {processos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.numero}
                  </option>
                ))}
              </select>
            </div>

            {modo === "ia" && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  O que você precisa?
                </label>
                <textarea
                  value={instrucao}
                  onChange={(e) => setInstrucao(e.target.value)}
                  rows={4}
                  placeholder="Ex: redija uma notificação extrajudicial cobrando aluguel em atraso..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUGESTOES_IA.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => gerarComIA(s)}
                      className="text-[11px] rounded-full border border-gray-200 px-2.5 py-1 text-gray-500 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => gerarComIA()}
                  disabled={loading || !instrucao.trim()}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium py-2 transition-colors disabled:opacity-50"
                >
                  <Wand2 size={14} /> {loading ? "Gerando..." : "Gerar texto"}
                </button>
                {error && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-4 text-xs text-gray-600 flex gap-2">
            <Sparkles size={14} className="text-[var(--brand)] shrink-0 mt-0.5" />
            <p>
              {modo === "modelo"
                ? "Modelo com preenchimento automático a partir dos dados cadastrados."
                : "Texto gerado por IA a partir da sua descrição e dos dados do cliente/processo."}{" "}
              Revise sempre antes de protocolar.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white flex flex-col">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Pré-visualização</h2>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(textoAtual);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              disabled={!textoAtual}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:underline disabled:opacity-40 disabled:no-underline"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copiado" : "Copiar texto"}
            </button>
          </div>
          <textarea
            readOnly={modo === "modelo"}
            value={
              modo === "ia" && loading ? "Gerando com IA..." : textoAtual
            }
            onChange={(e) => modo === "ia" && setTextoIA(e.target.value)}
            placeholder={
              modo === "ia"
                ? "Descreva o que você precisa ao lado e clique em Gerar texto."
                : ""
            }
            className="flex-1 min-h-[420px] w-full resize-none border-0 px-5 py-4 text-sm text-gray-800 leading-relaxed focus:outline-none font-mono"
          />
        </div>
      </div>
    </div>
  );
}
