import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import Badge from "@/components/badge";
import {
  deletePublicacao,
  toggleTratada,
  vincularPublicacao,
} from "@/lib/actions/publicacoes";
import { requireEscritorioId } from "@/lib/session";
import { ChevronLeft, Link2, Trash2, Pencil } from "lucide-react";

export default async function PublicacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const escritorioId = await requireEscritorioId();
  const p = await prisma.publicacao.findFirst({
    where: { id, escritorioId },
    include: { processo: { select: { id: true, numero: true, cliente: { select: { nome: true } } } } },
  });
  if (!p) notFound();

  const aqui = `/publicacoes/${p.id}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/publicacoes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--brand)]">
        <ChevronLeft size={15} /> Publicações
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Publicação</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <Badge value={p.status} />
            {p.diario && <span>{p.diario}</span>}
            {p.dataPublicacao && <span>· {formatDate(p.dataPublicacao)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <form action={toggleTratada}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="status" value={p.status} />
            <button
              type="submit"
              className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2.5 transition-colors"
            >
              {p.status === "TRATADA" ? "Marcar como não tratada" : "Marcar como tratada"}
            </button>
          </form>
          <Link
            href={`/publicacoes/${p.id}/editar`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium px-4 py-2.5 transition-colors"
          >
            <Pencil size={14} /> Editar
          </Link>
          <form action={deletePublicacao}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="voltar" value="/publicacoes" />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-medium px-4 py-2.5 transition-colors"
            >
              <Trash2 size={14} /> Excluir
            </button>
          </form>
        </div>
      </div>

      {erro === "processo" && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          Processo não encontrado no escritório. Confira o número digitado.
        </p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm">
        {p.processo ? (
          <p className="text-gray-700">
            Processo:{" "}
            <Link href={`/processos/${p.processo.id}`} className="font-medium text-[var(--brand)] hover:underline">
              {p.processo.numero}
            </Link>{" "}
            · {p.processo.cliente.nome}
          </p>
        ) : (
          <form action={vincularPublicacao} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="voltar" value={aqui} />
            <Link2 size={14} className="text-gray-400" />
            <span className="text-gray-600">Vincular ao processo:</span>
            <input
              name="processoNumero"
              required
              placeholder="0000000-00.0000.0.00.0000"
              className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
            <button type="submit" className="text-[var(--brand)] font-medium hover:underline">
              Vincular
            </button>
          </form>
        )}
      </div>

      <article className="rounded-xl border border-gray-200 bg-white px-6 py-5 text-[15px] leading-7 text-gray-800 whitespace-pre-wrap break-words font-serif text-justify">
        {p.conteudo}
      </article>
    </div>
  );
}
