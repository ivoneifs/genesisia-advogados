import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import {
  createPublicacao,
  deletePublicacao,
  toggleTratada,
  vincularPublicacao,
} from "@/lib/actions/publicacoes";
import Badge from "@/components/badge";
import { Trash2, Plus, Sparkles, Link2 } from "lucide-react";
import { requireEscritorioId } from "@/lib/session";

export default async function PublicacoesPage() {
  const escritorioId = await requireEscritorioId();
  const [publicacoes, processos] = await Promise.all([
    prisma.publicacao.findMany({
      where: { escritorioId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { processo: { include: { cliente: true } } },
    }),
    prisma.processo.findMany({
      where: { escritorioId },
      orderBy: { numero: "asc" },
      select: { id: true, numero: true },
    }),
  ]);

  const naoTratadas = publicacoes.filter((p) => p.status === "NAO_TRATADA");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Publicações
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Cole abaixo as publicações recebidas e vincule ao processo
            correspondente.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] px-3 py-2 text-xs font-medium">
          <Sparkles size={14} />
          {naoTratadas.length} pendente{naoTratadas.length !== 1 && "s"} de
          tratamento
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">Nova publicação</h2>
        </div>
        <form action={createPublicacao} className="px-5 py-4 space-y-3">
          <textarea
            name="conteudo"
            required
            rows={3}
            placeholder="Cole aqui o texto da publicação/intimação..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Diário oficial
              </label>
              <input
                name="diario"
                placeholder="DJE, DOU..."
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Data da publicação
              </label>
              <input
                type="date"
                name="dataPublicacao"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>
            <div className="min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Vincular a processo (opcional)
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
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {publicacoes.map((p) => (
            <li key={p.id} className="px-5 py-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-gray-800 flex-1 whitespace-pre-wrap">
                  {p.conteudo}
                </p>
                <form action={deletePublicacao}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <Badge value={p.status} />
                {p.diario && <span>{p.diario}</span>}
                {p.dataPublicacao && <span>{formatDate(p.dataPublicacao)}</span>}
                {p.processo ? (
                  <span className="text-gray-700">
                    Proc. {p.processo.numero} · {p.processo.cliente.nome}
                  </span>
                ) : (
                  <form action={vincularPublicacao} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={p.id} />
                    <Link2 size={12} className="text-gray-400" />
                    <select
                      name="processoId"
                      defaultValue=""
                      className="rounded border border-gray-300 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                    >
                      <option value="" disabled>
                        Vincular a processo
                      </option>
                      {processos.map((proc) => (
                        <option key={proc.id} value={proc.id}>
                          {proc.numero}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="text-[var(--brand)] font-medium hover:underline"
                    >
                      Vincular
                    </button>
                  </form>
                )}
                <form action={toggleTratada} className="ml-auto">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="status" value={p.status} />
                  <button
                    type="submit"
                    className="text-[var(--brand)] font-medium hover:underline"
                  >
                    {p.status === "TRATADA"
                      ? "Marcar como não tratada"
                      : "Marcar como tratada"}
                  </button>
                </form>
              </div>
            </li>
          ))}
          {publicacoes.length === 0 && (
            <li className="px-5 py-8 text-center text-gray-400 text-sm">
              Nenhuma publicação cadastrada ainda.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
