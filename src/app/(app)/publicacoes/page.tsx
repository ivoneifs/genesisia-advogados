import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import {
  createPublicacao,
  deletePublicacao,
  toggleTratada,
  vincularPublicacao,
  marcarPaginaTratada,
} from "@/lib/actions/publicacoes";
import Badge from "@/components/badge";
import {
  Trash2,
  Plus,
  Sparkles,
  Link2,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Eye,
  Pencil,
} from "lucide-react";
import { requireEscritorioId } from "@/lib/session";

const POR_PAGINA = 30;
const TAMANHO_PREVIA = 700;

const botao =
  "inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors";

const FILTROS = [
  { value: "NAO_TRATADA", label: "Não tratadas" },
  { value: "TRATADA", label: "Tratadas" },
  { value: "TODAS", label: "Todas" },
];

export default async function PublicacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; p?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const status = FILTROS.some((f) => f.value === params.status) ? params.status! : "NAO_TRATADA";
  const q = params.q?.trim() ?? "";
  const pagina = Math.max(1, Number.parseInt(params.p ?? "1", 10) || 1);
  const escritorioId = await requireEscritorioId();

  const where: Prisma.PublicacaoWhereInput = {
    escritorioId,
    ...(status !== "TODAS" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { conteudo: { contains: q, mode: "insensitive" } },
            { diario: { contains: q, mode: "insensitive" } },
            { processo: { numero: { contains: q } } },
          ],
        }
      : {}),
  };

  const [total, pendentes, publicacoes] = await Promise.all([
    prisma.publicacao.count({ where }),
    prisma.publicacao.count({ where: { escritorioId, status: "NAO_TRATADA" } }),
    prisma.publicacao.findMany({
      where,
      orderBy: [{ dataPublicacao: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      // Sem o conteúdo: pode ter centenas de KB. A prévia vem abaixo.
      select: {
        id: true,
        status: true,
        diario: true,
        dataPublicacao: true,
        processo: { select: { id: true, numero: true, cliente: { select: { nome: true } } } },
      },
    }),
  ]);

  const ids = publicacoes.map((p) => p.id);
  const previas = ids.length
    ? await prisma.$queryRaw<{ id: string; previa: string; tamanho: number }[]>`
        SELECT id, left(conteudo, ${TAMANHO_PREVIA}) AS previa, length(conteudo)::int AS tamanho
        FROM "Publicacao" WHERE id IN (${Prisma.join(ids)})`
    : [];
  const previaPorId = new Map(previas.map((p) => [p.id, p]));

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const urlPagina = (n: number) =>
    `/publicacoes?${new URLSearchParams({ status, ...(q ? { q } : {}), p: String(n) })}`;
  const urlAtual = urlPagina(pagina);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Publicações</h1>
          <p className="text-sm text-gray-500 mt-1">
            Intimações e publicações dos processos. As importadas pela OAB entram
            aqui automaticamente.
          </p>
        </div>
        <Link
          href="/publicacoes?status=NAO_TRATADA"
          className="flex items-center gap-2 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] px-3 py-2 text-xs font-medium"
        >
          <Sparkles size={14} />
          {pendentes.toLocaleString("pt-BR")} pendente{pendentes !== 1 && "s"} de tratamento
        </Link>
      </div>

      {params.erro === "processo" && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          Processo não encontrado no escritório. Confira o número digitado.
        </p>
      )}

      <form className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar no texto, diário ou nº do processo"
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <div className="relative">
          <select
            name="status"
            defaultValue={status}
            className="appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            {FILTROS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label.toUpperCase()}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          Pesquisar
        </button>
      </form>

      <details className="rounded-xl border border-gray-200 bg-white group">
        <summary className="px-5 py-4 cursor-pointer list-none flex items-center gap-2 font-medium text-gray-900">
          <Plus size={16} /> Adicionar publicação manualmente
          <ChevronDown size={14} className="ml-auto text-gray-400 group-open:rotate-180 transition-transform" />
        </summary>
        <form action={createPublicacao} className="px-5 pb-4 space-y-3 border-t border-gray-100 pt-4">
          <textarea
            name="conteudo"
            required
            rows={4}
            placeholder="Cole aqui o texto da publicação/intimação..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Diário oficial</label>
              <input
                name="diario"
                placeholder="DJE, DOU..."
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data da publicação</label>
              <input
                type="date"
                name="dataPublicacao"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>
            <div className="min-w-[240px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Nº do processo (opcional)
              </label>
              <input
                name="processoNumero"
                placeholder="0000000-00.0000.0.00.0000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </form>
      </details>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap text-xs text-gray-500">
          <span>
            {total.toLocaleString("pt-BR")} publicaç{total !== 1 ? "ões" : "ão"}
            {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
          </span>
          {status !== "TRATADA" && publicacoes.some((p) => p.status === "NAO_TRATADA") && (
            <form action={marcarPaginaTratada}>
              {publicacoes
                .filter((p) => p.status === "NAO_TRATADA")
                .map((p) => (
                  <input key={p.id} type="hidden" name="ids" value={p.id} />
                ))}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 font-medium text-[var(--brand)] hover:underline"
              >
                <CheckCheck size={14} /> Marcar todas desta página como tratadas
              </button>
            </form>
          )}
        </div>
        <ul className="divide-y divide-gray-100">
          {publicacoes.map((p) => {
            const previa = previaPorId.get(p.id);
            const cortada = (previa?.tamanho ?? 0) > TAMANHO_PREVIA;
            return (
              <li key={p.id} className="px-5 py-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {previa?.previa}
                      {cortada && "…"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/publicacoes/${p.id}`}
                      className={`${botao} hover:bg-gray-50 hover:text-[var(--brand)]`}
                    >
                      <Eye size={13} /> Abrir
                    </Link>
                    <Link
                      href={`/publicacoes/${p.id}/editar`}
                      className={`${botao} hover:bg-gray-50 hover:text-[var(--brand)]`}
                    >
                      <Pencil size={13} /> Editar
                    </Link>
                    <form action={deletePublicacao}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="voltar" value={urlAtual} />
                      <button
                        type="submit"
                        className={`${botao} hover:bg-red-50 hover:text-red-600 hover:border-red-200`}
                      >
                        <Trash2 size={13} /> Excluir
                      </button>
                    </form>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <Badge value={p.status} />
                  {p.diario && <span>{p.diario}</span>}
                  {p.dataPublicacao && <span>{formatDate(p.dataPublicacao)}</span>}
                  {p.processo ? (
                    <Link
                      href={`/processos/${p.processo.id}`}
                      className="text-gray-700 hover:text-[var(--brand)] hover:underline"
                    >
                      Proc. {p.processo.numero} · {p.processo.cliente.nome}
                    </Link>
                  ) : (
                    <form action={vincularPublicacao} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="voltar" value={urlAtual} />
                      <Link2 size={12} className="text-gray-400" />
                      <input
                        name="processoNumero"
                        required
                        placeholder="Nº do processo"
                        className="w-48 rounded border border-gray-300 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                      />
                      <button type="submit" className="text-[var(--brand)] font-medium hover:underline">
                        Vincular
                      </button>
                    </form>
                  )}
                  <form action={toggleTratada} className="ml-auto">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="status" value={p.status} />
                    <button type="submit" className="text-[var(--brand)] font-medium hover:underline">
                      {p.status === "TRATADA" ? "Marcar como não tratada" : "Marcar como tratada"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
          {publicacoes.length === 0 && (
            <li className="px-5 py-8 text-center text-gray-400 text-sm">
              {total === 0 && !q && status === "NAO_TRATADA"
                ? "Nenhuma publicação pendente. 🎉"
                : "Nenhuma publicação encontrada."}
            </li>
          )}
        </ul>
        {totalPaginas > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            {pagina > 1 ? (
              <Link href={urlPagina(pagina - 1)} className="inline-flex items-center gap-1 text-gray-600 hover:text-[var(--brand)]">
                <ChevronLeft size={15} /> Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-500">
              Página {pagina} de {totalPaginas}
            </span>
            {pagina < totalPaginas ? (
              <Link href={urlPagina(pagina + 1)} className="inline-flex items-center gap-1 text-gray-600 hover:text-[var(--brand)]">
                Próxima <ChevronRight size={15} />
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
