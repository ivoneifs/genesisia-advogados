import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updatePublicacao, deletePublicacao } from "@/lib/actions/publicacoes";
import { requireEscritorioId } from "@/lib/session";
import { ChevronLeft, Trash2 } from "lucide-react";

const campo =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]";

export default async function EditarPublicacaoPage({
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
    include: { processo: { select: { numero: true } } },
  });
  if (!p) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href={`/publicacoes/${p.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--brand)]"
      >
        <ChevronLeft size={15} /> Voltar à publicação
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold text-gray-900">Editar publicação</h1>
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

      {erro === "processo" && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          Processo não encontrado no escritório. Confira o número digitado.
        </p>
      )}

      <form action={updatePublicacao.bind(null, p.id)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Diário oficial</label>
            <input name="diario" defaultValue={p.diario ?? ""} placeholder="DJE, DOU..." className={campo} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data da publicação</label>
            <input
              type="date"
              name="dataPublicacao"
              defaultValue={p.dataPublicacao?.toISOString().slice(0, 10) ?? ""}
              className={campo}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Situação</label>
            <select name="status" defaultValue={p.status} className={campo}>
              <option value="NAO_TRATADA">Não tratada</option>
              <option value="TRATADA">Tratada</option>
            </select>
          </div>
          <div className="sm:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nº do processo vinculado (deixe em branco para desvincular)
            </label>
            <input
              name="processoNumero"
              defaultValue={p.processo?.numero ?? ""}
              placeholder="0000000-00.0000.0.00.0000"
              className={campo}
            />
          </div>
          <div className="sm:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto da publicação</label>
            <textarea
              name="conteudo"
              required
              rows={16}
              defaultValue={p.conteudo}
              className={`${campo} font-serif leading-7`}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-5 py-2.5 transition-colors"
          >
            Salvar alterações
          </button>
          <Link
            href={`/publicacoes/${p.id}`}
            className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium px-5 py-2.5 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
