import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import Badge from "@/components/badge";
import {
  Gavel,
  CalendarClock,
  Wallet,
  ListChecks,
  AlertTriangle,
} from "lucide-react";
import { requireEscritorioId } from "@/lib/session";

export default async function DashboardPage() {
  const escritorioId = await requireEscritorioId();
  const now = new Date();
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);

  const [
    processosAtivos,
    prazosPendentes,
    tarefasHoje,
    aReceber,
    proximosPrazos,
    proximasTarefas,
    processosRecentes,
  ] = await Promise.all([
    prisma.processo.count({ where: { status: "ATIVO", escritorioId } }),
    prisma.prazo.count({ where: { status: "PENDENTE", escritorioId } }),
    prisma.tarefa.count({
      where: {
        concluida: false,
        escritorioId,
        data: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
      },
    }),
    prisma.financeiro.aggregate({
      _sum: { valor: true },
      where: { tipo: "RECEITA", status: { not: "PAGO" }, escritorioId },
    }),
    prisma.prazo.findMany({
      where: { status: "PENDENTE", escritorioId },
      orderBy: { dataVencimento: "asc" },
      take: 6,
      include: { processo: { include: { cliente: true } } },
    }),
    prisma.tarefa.findMany({
      where: { concluida: false, data: { gte: now }, escritorioId },
      orderBy: { data: "asc" },
      take: 6,
      include: { processo: true },
    }),
    prisma.processo.findMany({
      where: { escritorioId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { cliente: true },
    }),
  ]);

  const stats = [
    {
      label: "Processos ativos",
      value: processosAtivos,
      icon: Gavel,
      href: "/processos",
    },
    {
      label: "Prazos pendentes",
      value: prazosPendentes,
      icon: CalendarClock,
      href: "/agenda",
    },
    {
      label: "Tarefas de hoje",
      value: tarefasHoje,
      icon: ListChecks,
      href: "/agenda",
    },
    {
      label: "A receber",
      value: formatCurrency(aReceber._sum.valor ?? 0),
      icon: Wallet,
      href: "/financeiro",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Área de trabalho
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Visão geral do seu escritório hoje, {formatDate(now)}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{label}</span>
              <Icon size={18} className="text-[var(--brand)]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">
              {value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-gray-900">Próximos prazos</h2>
            <Link
              href="/agenda"
              className="text-xs text-[var(--brand)] hover:underline"
            >
              Ver agenda
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {proximosPrazos.length === 0 && (
              <li className="px-5 py-6 text-sm text-gray-400">
                Nenhum prazo pendente.
              </li>
            )}
            {proximosPrazos.map((p) => {
              const d = daysUntil(p.dataVencimento);
              const urgent = d <= 2;
              return (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                  {urgent ? (
                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                  ) : (
                    <CalendarClock size={16} className="text-gray-400 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/processos/${p.processoId}`}
                      className="text-sm font-medium text-gray-900 hover:text-[var(--brand)] truncate block"
                    >
                      {p.titulo}
                    </Link>
                    <p className="text-xs text-gray-500 truncate">
                      {p.processo.cliente.nome} · Proc. {p.processo.numero}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      urgent ? "text-red-600" : "text-gray-500"
                    }`}
                  >
                    {d < 0
                      ? `${Math.abs(d)}d atrasado`
                      : d === 0
                      ? "hoje"
                      : `em ${d}d`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-gray-900">Próximas tarefas</h2>
            <Link
              href="/agenda"
              className="text-xs text-[var(--brand)] hover:underline"
            >
              Ver agenda
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {proximasTarefas.length === 0 && (
              <li className="px-5 py-6 text-sm text-gray-400">
                Nenhuma tarefa agendada.
              </li>
            )}
            {proximasTarefas.map((t) => (
              <li key={t.id} className="px-5 py-3 flex items-center gap-3">
                <ListChecks size={16} className="text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {t.titulo}
                  </p>
                  {t.processo && (
                    <p className="text-xs text-gray-500 truncate">
                      Proc. {t.processo.numero}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500 shrink-0">
                  {formatDate(t.data)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-medium text-gray-900">Processos recentes</h2>
          <Link
            href="/processos"
            className="text-xs text-[var(--brand)] hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Número</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Área</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processosRecentes.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/processos/${p.id}`}
                      className="font-medium text-gray-900 hover:text-[var(--brand)]"
                    >
                      {p.numero}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{p.cliente.nome}</td>
                  <td className="px-5 py-3 text-gray-600">{p.area ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge value={p.status} />
                  </td>
                </tr>
              ))}
              {processosRecentes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-gray-400">
                    Nenhum processo cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
