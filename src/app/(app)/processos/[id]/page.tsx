import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Badge from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { createPrazo, deletePrazo, togglePrazoStatus } from "@/lib/actions/prazos";
import { deleteProcesso } from "@/lib/actions/processos";
import { requireEscritorioId } from "@/lib/session";
import { Pencil, Trash2, Plus, CheckCircle2, Circle } from "lucide-react";

export default async function ProcessoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const escritorioId = await requireEscritorioId();

  const processo = await prisma.processo.findFirst({
    where: { id, escritorioId },
    include: {
      cliente: true,
      responsavel: true,
      prazos: { orderBy: { dataVencimento: "asc" } },
      tarefas: { orderBy: { data: "asc" } },
      financeiros: { orderBy: { vencimento: "asc" } },
    },
  });

  if (!processo) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              {processo.numero}
            </h1>
            <Badge value={processo.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Cliente:{" "}
            <Link
              href={`/clientes/${processo.clienteId}`}
              className="text-[var(--brand)] hover:underline"
            >
              {processo.cliente.nome}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/processos/${processo.id}/editar`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium px-4 py-2.5 transition-colors"
          >
            <Pencil size={14} /> Editar
          </Link>
          <form action={deleteProcesso}>
            <input type="hidden" name="id" value={processo.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-medium px-4 py-2.5 transition-colors"
            >
              <Trash2 size={14} /> Excluir
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Info label="Área" value={processo.area ?? "—"} />
        <Info label="Tribunal" value={processo.tribunal ?? "—"} />
        <Info label="Vara" value={processo.vara ?? "—"} />
        <Info
          label="Valor da causa"
          value={
            processo.valorCausa != null
              ? formatCurrency(processo.valorCausa)
              : "—"
          }
        />
        <Info label="Parte contrária" value={processo.parteContraria ?? "—"} />
        <Info
          label="Responsável"
          value={processo.responsavel?.name ?? "—"}
        />
      </div>

      {processo.descricao && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-2">
            Descrição
          </h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {processo.descricao}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">Prazos</h2>
        </div>

        <ul className="divide-y divide-gray-100">
          {processo.prazos.map((p) => (
            <li key={p.id} className="px-5 py-3 flex items-center gap-3">
              <form action={togglePrazoStatus}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="processoId" value={processo.id} />
                <input type="hidden" name="status" value={p.status} />
                <button type="submit" className="text-gray-400 hover:text-[var(--brand)]">
                  {p.status === "CUMPRIDO" ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : (
                    <Circle size={18} />
                  )}
                </button>
              </form>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    p.status === "CUMPRIDO"
                      ? "text-gray-400 line-through"
                      : "text-gray-900"
                  }`}
                >
                  {p.titulo}
                </p>
                {p.descricao && (
                  <p className="text-xs text-gray-500">{p.descricao}</p>
                )}
              </div>
              <Badge value={p.prioridade} />
              <span className="text-xs text-gray-500 w-24 text-right shrink-0">
                {formatDate(p.dataVencimento)}
              </span>
              <form action={deletePrazo}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="processoId" value={processo.id} />
                <button
                  type="submit"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </form>
            </li>
          ))}
          {processo.prazos.length === 0 && (
            <li className="px-5 py-6 text-sm text-gray-400">
              Nenhum prazo cadastrado.
            </li>
          )}
        </ul>

        <form
          action={createPrazo}
          className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="processoId" value={processo.id} />
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Título do prazo
            </label>
            <input
              name="titulo"
              required
              placeholder="Contestação, recurso..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Vencimento
            </label>
            <input
              type="date"
              name="dataVencimento"
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Prioridade
            </label>
            <select
              name="prioridade"
              defaultValue="NORMAL"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <option value="BAIXA">Baixa</option>
              <option value="NORMAL">Normal</option>
              <option value="ALTA">Alta</option>
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            <Plus size={14} /> Adicionar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">Agenda vinculada</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {processo.tarefas.map((t) => (
              <li key={t.id} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-900">{t.titulo}</span>
                <span className="text-xs text-gray-500">
                  {formatDate(t.data)}
                </span>
              </li>
            ))}
            {processo.tarefas.length === 0 && (
              <li className="px-5 py-6 text-sm text-gray-400">
                Nenhuma tarefa vinculada.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">Financeiro vinculado</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {processo.financeiros.map((f) => (
              <li key={f.id} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-900">{f.descricao}</span>
                <span className="text-xs text-gray-500">
                  {formatCurrency(f.valor)}
                </span>
              </li>
            ))}
            {processo.financeiros.length === 0 && (
              <li className="px-5 py-6 text-sm text-gray-400">
                Nenhum lançamento vinculado.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-1 truncate">
        {value}
      </p>
    </div>
  );
}
