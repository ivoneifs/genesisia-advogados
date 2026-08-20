import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { createDocumento, deleteDocumento } from "@/lib/actions/documentos";
import { Trash2, Plus, FileText, Download, Paperclip } from "lucide-react";
import { requireEscritorioId } from "@/lib/session";

const TIPOS = [
  { value: "PETICAO", label: "Petição" },
  { value: "CONTRATO", label: "Contrato" },
  { value: "PROCURACAO", label: "Procuração" },
  { value: "COMPROVANTE", label: "Comprovante" },
  { value: "OUTRO", label: "Outro" },
];

export default async function DocumentosPage() {
  const escritorioId = await requireEscritorioId();
  const [documentos, processos, clientes] = await Promise.all([
    prisma.documento.findMany({
      where: { escritorioId },
      orderBy: { createdAt: "desc" },
      include: { processo: true, cliente: true },
    }),
    prisma.processo.findMany({
      where: { escritorioId },
      orderBy: { numero: "asc" },
      select: { id: true, numero: true },
    }),
    prisma.cliente.findMany({ where: { escritorioId }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Documentos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registro de documentos do escritório, vinculados a processos ou
          clientes.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">Novo documento</h2>
        </div>
        <form
          action={createDocumento}
          className="px-5 py-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Título
            </label>
            <input
              name="titulo"
              required
              placeholder="Procuração assinada, contrato..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Tipo
            </label>
            <select
              name="tipo"
              defaultValue="OUTRO"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Cliente (opcional)
            </label>
            <select
              name="clienteId"
              defaultValue=""
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
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Processo (opcional)
            </label>
            <select
              name="processoId"
              defaultValue=""
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
          <div className="min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Arquivo (opcional)
            </label>
            <input
              type="file"
              name="arquivo"
              className="w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            <Plus size={14} /> Adicionar
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 font-medium">Documento</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Vinculado a</th>
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {documentos.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-400 shrink-0" />
                    {d.titulo}
                    {d.arquivoNome && (
                      <Paperclip size={12} className="text-gray-400 shrink-0" />
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {TIPOS.find((t) => t.value === d.tipo)?.label ?? d.tipo}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {d.processo?.numero ?? d.cliente?.nome ?? "—"}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {formatDate(d.createdAt)}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {d.arquivoNome && (
                      <a
                        href={`/api/documentos/${d.id}`}
                        title="Baixar arquivo"
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      >
                        <Download size={14} />
                      </a>
                    )}
                    <form action={deleteDocumento}>
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        type="submit"
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {documentos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                  Nenhum documento cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
