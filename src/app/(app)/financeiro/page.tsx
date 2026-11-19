import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  createFinanceiro,
  deleteFinanceiro,
  toggleFinanceiroStatus,
} from "@/lib/actions/financeiro";
import Badge from "@/components/badge";
import { Trash2, Plus, CheckCircle2, Circle, Search } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import Paginacao, { paginaDe, urlCom } from "@/components/paginacao";
import { exigirPagina } from "@/lib/usuario";
import BotaoExcluir from "@/components/botao-excluir";

const POR_PAGINA = 50;

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; status?: string; de?: string; ate?: string; p?: string }>;
}) {
  const { escritorioId } = await exigirPagina("financeiro");
  const filtros = await searchParams;
  const pagina = paginaDe(filtros.p);
  const busca = filtros.q?.trim();
  const tipo = filtros.tipo === "RECEITA" || filtros.tipo === "DESPESA" ? filtros.tipo : undefined;
  const status = filtros.status === "PAGO" || filtros.status === "PENDENTE" ? filtros.status : undefined;
  const valida = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);
  const de = valida(filtros.de);
  const ate = valida(filtros.ate);
  const where: Prisma.FinanceiroWhereInput = {
    escritorioId,
    ...(tipo ? { tipo } : {}),
    ...(status ? { status } : {}),
    ...(de || ate ? { vencimento: { ...(de ? { gte: new Date(`${de}T00:00:00Z`) } : {}), ...(ate ? { lte: new Date(`${ate}T23:59:59Z`) } : {}) } } : {}),
    ...(busca
      ? {
          OR: [
            { descricao: { contains: busca, mode: "insensitive" } },
            { cliente: { nome: { contains: busca, mode: "insensitive" } } },
            { processo: { numero: { contains: busca } } },
          ],
        }
      : {}),
  };
  const [total, lancamentos, clientes, processos, receitas, despesas, aReceber, aPagar, filtrado] =
    await Promise.all([
      prisma.financeiro.count({ where }),
      prisma.financeiro.findMany({
        where,
        orderBy: { vencimento: "asc" },
        skip: (pagina - 1) * POR_PAGINA,
        take: POR_PAGINA,
        include: { cliente: { select: { nome: true } }, processo: { select: { numero: true } } },
      }),
      prisma.cliente.findMany({ where: { escritorioId }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
      prisma.processo.findMany({
        where: { escritorioId },
        orderBy: { numero: "asc" },
        select: { id: true, numero: true },
      }),
      prisma.financeiro.aggregate({
        _sum: { valor: true },
        where: { tipo: "RECEITA", status: "PAGO", escritorioId },
      }),
      prisma.financeiro.aggregate({
        _sum: { valor: true },
        where: { tipo: "DESPESA", status: "PAGO", escritorioId },
      }),
      prisma.financeiro.aggregate({ _sum: { valor: true }, where: { tipo: "RECEITA", status: "PENDENTE", escritorioId } }),
      prisma.financeiro.aggregate({ _sum: { valor: true }, where: { tipo: "DESPESA", status: "PENDENTE", escritorioId } }),
      prisma.financeiro.groupBy({ by: ["tipo"], _sum: { valor: true }, where }),
    ]);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const filtroQs = { q: busca, tipo, status, de, ate };
  const filtrando = Object.values(filtroQs).some(Boolean);
  const somaFiltro = (t: string) => filtrado.find((x) => x.tipo === t)?._sum.valor ?? 0;

  const saldo = (receitas._sum.valor ?? 0) - (despesas._sum.valor ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-500 mt-1">
          Honorários, receitas e despesas do escritório.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Receitas recebidas</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {formatCurrency(receitas._sum.valor ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Despesas pagas</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            {formatCurrency(despesas._sum.valor ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Saldo</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(saldo)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">A receber</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700/80">
            {formatCurrency(aReceber._sum.valor ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">A pagar</p>
          <p className="mt-2 text-2xl font-semibold text-red-700/80">
            {formatCurrency(aPagar._sum.valor ?? 0)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">Novo lançamento</h2>
        </div>
        <form
          action={createFinanceiro}
          className="px-5 py-4 flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Tipo
            </label>
            <select
              name="tipo"
              defaultValue="RECEITA"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <option value="RECEITA">Receita</option>
              <option value="DESPESA">Despesa</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Descrição
            </label>
            <input
              name="descricao"
              required
              placeholder="Honorários, custas..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Valor (R$)
            </label>
            <input
              name="valor"
              required
              placeholder="0,00"
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Vencimento
            </label>
            <input
              type="date"
              name="vencimento"
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Cliente (opcional)
            </label>
            <select
              name="clienteId"
              defaultValue=""
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
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
              Processo (opcional)
            </label>
            <select
              name="processoId"
              defaultValue=""
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
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
        </form>
      </div>

      <form className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input name="q" defaultValue={busca} placeholder="Descrição, cliente ou nº do processo" className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" />
        </div>
        <select name="tipo" defaultValue={tipo ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">Receitas e despesas</option>
          <option value="RECEITA">Só receitas</option>
          <option value="DESPESA">Só despesas</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">Pagos e pendentes</option>
          <option value="PENDENTE">Pendentes</option>
          <option value="PAGO">Pagos</option>
        </select>
        <label className="text-xs text-gray-500">Vencimento de<input type="date" name="de" defaultValue={de} className="block rounded-lg border border-gray-300 px-2 py-1.5 text-sm" /></label>
        <label className="text-xs text-gray-500">até<input type="date" name="ate" defaultValue={ate} className="block rounded-lg border border-gray-300 px-2 py-1.5 text-sm" /></label>
        <button className="rounded-lg bg-gray-900 text-white text-sm font-medium px-4 py-2">Filtrar</button>
        {filtrando && <Link href="/financeiro" className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">Limpar</Link>}
      </form>
      <p className="text-xs text-gray-500 -mt-4">
        {total} lançamento(s){filtrando ? " no filtro" : ""} · receitas {formatCurrency(somaFiltro("RECEITA"))} · despesas {formatCurrency(somaFiltro("DESPESA"))}
      </p>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 font-medium"></th>
              <th className="px-5 py-3 font-medium">Descrição</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Vinculado a</th>
              <th className="px-5 py-3 font-medium">Vencimento</th>
              <th className="px-5 py-3 font-medium">Valor</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lancamentos.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <form action={toggleFinanceiroStatus}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="status" value={f.status} />
                    <button type="submit" className="text-gray-400 hover:text-[var(--brand)]">
                      {f.status === "PAGO" ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>
                  </form>
                </td>
                <td className="px-5 py-3 font-medium text-gray-900">
                  {f.descricao}
                </td>
                <td className="px-5 py-3">
                  <Badge value={f.tipo} />
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {f.cliente?.nome ?? f.processo?.numero ?? "—"}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {formatDate(f.vencimento)}
                </td>
                <td
                  className={`px-5 py-3 font-medium ${
                    f.tipo === "RECEITA" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {f.tipo === "RECEITA" ? "+" : "-"}
                  {formatCurrency(f.valor)}
                </td>
                <td className="px-5 py-3">
                  <Badge value={f.status} />
                </td>
                <td className="px-5 py-3">
                  <form action={deleteFinanceiro}>
                    <input type="hidden" name="id" value={f.id} />
                    <BotaoExcluir mensagem="Excluir este lançamento financeiro?"
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </BotaoExcluir>
                  </form>
                </td>
              </tr>
            ))}
            {lancamentos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                  {filtrando ? "Nenhum lançamento neste filtro." : "Nenhum lançamento cadastrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Paginacao pagina={pagina} totalPaginas={totalPaginas} url={(n) => urlCom("/financeiro", filtroQs, n)} />
    </div>
  );
}
