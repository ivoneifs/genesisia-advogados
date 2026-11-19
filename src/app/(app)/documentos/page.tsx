import { prisma } from "@/lib/db";
import { formatDateBR } from "@/lib/format";
import { createDocumento, deleteDocumento } from "@/lib/actions/documentos";
import { Trash2, Plus, FileText, Download, Paperclip, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import Paginacao, { paginaDe, urlCom } from "@/components/paginacao";
import { requireEscritorioId } from "@/lib/session";
import BotaoExcluir from "@/components/botao-excluir";

const TIPOS = [
  { value: "PETICAO", label: "Petição" },
  { value: "CONTRATO", label: "Contrato" },
  { value: "PROCURACAO", label: "Procuração" },
  { value: "COMPROVANTE", label: "Comprovante" },
  { value: "OUTRO", label: "Outro" },
];

const POR_PAGINA = 50;

export default async function DocumentosPage({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string; arquivo?: string; p?: string }> }) {
  const escritorioId = await requireEscritorioId();
  const filtros = await searchParams;
  const pagina = paginaDe(filtros.p);
  const busca = filtros.q?.trim();
  const tipo = TIPOS.some((t) => t.value === filtros.tipo) ? filtros.tipo : undefined;
  const arquivo = filtros.arquivo === "com" || filtros.arquivo === "sem" ? filtros.arquivo : undefined;
  const where: Prisma.DocumentoWhereInput = {
    escritorioId,
    ...(tipo ? { tipo } : {}),
    ...(arquivo === "com" ? { arquivoNome: { not: null } } : arquivo === "sem" ? { arquivoNome: null } : {}),
    ...(busca
      ? {
          OR: [
            { titulo: { contains: busca, mode: "insensitive" } },
            { observacoes: { contains: busca, mode: "insensitive" } },
            { arquivoNome: { contains: busca, mode: "insensitive" } },
            { cliente: { nome: { contains: busca, mode: "insensitive" } } },
            { processo: { numero: { contains: busca } } },
          ],
        }
      : {}),
  };
  const [total, documentos, processos, clientes] = await Promise.all([
    prisma.documento.count({ where }),
    prisma.documento.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { processo: { select: { numero: true } }, cliente: { select: { nome: true } } },
    }),
    prisma.processo.findMany({
      where: { escritorioId },
      orderBy: { numero: "asc" },
      select: { id: true, numero: true },
    }),
    prisma.cliente.findMany({ where: { escritorioId }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const filtroQs = { q: busca, tipo, arquivo };

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

      <form className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" name="q" defaultValue={busca} placeholder="Título, arquivo, cliente ou nº do processo" className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" />
        </div>
        <select name="tipo" defaultValue={tipo ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm">
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select name="arquivo" defaultValue={arquivo ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm">
          <option value="">Com e sem arquivo</option>
          <option value="com">Só com arquivo</option>
          <option value="sem">Só sem arquivo</option>
        </select>
        <button className="rounded-lg bg-gray-900 text-white text-sm font-medium px-4 py-2.5">Pesquisar</button>
        <span className="text-xs text-gray-500">{total} documento(s)</span>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
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
                  {formatDateBR(d.createdAt)}
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
                      <BotaoExcluir mensagem="Excluir este documento? O arquivo anexado também será apagado."
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </BotaoExcluir>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {documentos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                  {busca || tipo || arquivo ? "Nenhum documento encontrado." : "Nenhum documento cadastrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Paginacao pagina={pagina} totalPaginas={totalPaginas} url={(n) => urlCom("/documentos", filtroQs, n)} />
    </div>
  );
}
