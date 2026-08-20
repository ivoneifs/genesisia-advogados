"use client";

import { useMemo, useState } from "react";
import { TEMPLATES } from "@/lib/templates";
import { Copy, Check, Sparkles } from "lucide-react";
import type { Cliente, Processo } from "@prisma/client";

type ProcessoComCliente = Processo & { cliente: Cliente };

export default function PecaGenerator({
  clientes,
  processos,
}: {
  clientes: Cliente[];
  processos: ProcessoComCliente[];
}) {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [clienteId, setClienteId] = useState("");
  const [processoId, setProcessoId] = useState("");
  const [copied, setCopied] = useState(false);

  const cliente = clientes.find((c) => c.id === clienteId);
  const processo = processos.find((p) => p.id === processoId);

  const texto = useMemo(() => {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
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
        </div>

        <div className="rounded-xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-4 text-xs text-gray-600 flex gap-2">
          <Sparkles size={14} className="text-[var(--brand)] shrink-0 mt-0.5" />
          <p>
            Modelo inteligente com preenchimento automático a partir dos dados
            cadastrados. Revise sempre o texto antes de protocolar.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white flex flex-col">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">Pré-visualização</h2>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(texto);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:underline"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copiado" : "Copiar texto"}
          </button>
        </div>
        <textarea
          readOnly
          value={texto}
          className="flex-1 min-h-[420px] w-full resize-none border-0 px-5 py-4 text-sm text-gray-800 leading-relaxed focus:outline-none font-mono"
        />
      </div>
    </div>
  );
}
