import Link from "next/link";
import { prisma } from "@/lib/db";
import { trialExpirado, diasRestantesTrial } from "@/lib/acesso";
import { formatDate, formatDateBR } from "@/lib/format";
import {
  Avatar,
  PageHeader,
  PlanoTag,
  StatusBadge,
  PLANO_LABEL,
} from "@/components/admin/ui";
import {
  Building2,
  Users2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [escritorios, totalUsuarios] = await Promise.all([
    prisma.escritorio.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true } } },
    }),
    prisma.user.count({ where: { role: { not: "SUPERADMIN" } } }),
  ]);

  const total = escritorios.length;
  const ativos = escritorios.filter(
    (e) => e.status === "ATIVO" && e.ativo
  ).length;
  const emTrial = escritorios.filter(
    (e) => e.status === "TRIAL" && e.ativo && !trialExpirado(e)
  ).length;
  const suspensos = escritorios.filter(
    (e) => e.status === "SUSPENSO" || !e.ativo || trialExpirado(e)
  ).length;
  const trialsExpirando = escritorios
    .filter(
      (e) =>
        e.status === "TRIAL" &&
        e.ativo &&
        !trialExpirado(e) &&
        diasRestantesTrial(e) <= 7
    )
    .sort((a, b) => diasRestantesTrial(a) - diasRestantesTrial(b));

  const porPlano = ["PRO", "BASICO", "TRIAL"].map((p) => ({
    plano: p,
    qtd: escritorios.filter((e) => e.plano === p).length,
  }));

  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const kpis = [
    {
      label: "Escritórios",
      valor: total,
      nota: `${totalUsuarios} usuário(s) no total`,
      icon: Building2,
      cor: "text-[var(--brand)] bg-[var(--brand)]/10",
    },
    {
      label: "Clientes ativos",
      valor: ativos,
      nota: `${pct(ativos)}% da base`,
      icon: CheckCircle2,
      cor: "text-emerald-700 bg-emerald-50",
    },
    {
      label: "Em teste",
      valor: emTrial,
      nota: trialsExpirando.length
        ? `${trialsExpirando.length} expira(m) em até 7 dias`
        : "Nenhum expirando esta semana",
      icon: Clock,
      cor: "text-amber-700 bg-amber-50",
    },
    {
      label: "Suspensos ou expirados",
      valor: suspensos,
      nota: suspensos ? "Sem acesso ao sistema" : "Nenhum bloqueado",
      icon: AlertTriangle,
      cor: "text-red-700 bg-red-50",
    },
  ];

  const recentes = escritorios.slice(0, 6);
  const hoje = new Date().toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Visão geral"
        descricao={`Sua base de clientes no Genesis IA · ${hoje}`}
      >
        <Link
          href="/admin/escritorios"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-medium px-4 py-2 shadow-sm shadow-indigo-500/25 transition-colors"
        >
          Gerenciar escritórios <ArrowRight size={15} />
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{k.label}</p>
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center ${k.cor}`}
              >
                <k.icon size={16} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
              {k.valor}
            </p>
            <p className="mt-1 text-xs text-gray-500">{k.nota}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Escritórios recentes</h2>
            <Link
              href="/admin/escritorios"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
            >
              Ver todos <ArrowUpRight size={13} />
            </Link>
          </div>
          {recentes.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Building2 size={28} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                Nenhum escritório cadastrado ainda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 bg-gray-50/70">
                    <th className="px-5 py-2.5 font-medium">Escritório</th>
                    <th className="px-3 py-2.5 font-medium">Plano</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium text-right">
                      Usuários
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentes.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar nome={e.nome} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {e.nome}
                            </p>
                            <p className="text-xs text-gray-500">
                              Desde {formatDateBR(e.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <PlanoTag plano={e.plano} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          status={e.status}
                          ativo={e.ativo}
                          expirado={trialExpirado(e)}
                        />
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-700">
                        {e._count.users}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-5">
            <h2 className="font-semibold text-gray-900">Distribuição por plano</h2>
            <div className="mt-4 space-y-3">
              {porPlano.map((p) => (
                <div key={p.plano}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {PLANO_LABEL[p.plano]}
                    </span>
                    <span className="tabular-nums text-gray-900 font-medium">
                      {p.qtd}{" "}
                      <span className="text-xs text-gray-400 font-normal">
                        ({pct(p.qtd)}%)
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{
                        width: `${pct(p.qtd)}%`,
                        opacity: p.plano === "PRO" ? 1 : p.plano === "BASICO" ? 0.7 : 0.4,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={16} className="text-amber-600" /> Trials expirando
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Nos próximos 7 dias</p>
            {trialsExpirando.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">
                Nenhum trial vence nesta semana.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {trialsExpirando.map((e) => {
                  const dias = diasRestantesTrial(e);
                  return (
                    <li
                      key={e.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {e.nome}
                        </p>
                        <p className="text-xs text-gray-500">
                          Expira em{" "}
                          {e.trialExpira ? formatDate(e.trialExpira) : "—"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-semibold rounded-md px-2 py-0.5 tabular-nums ${
                          dias <= 2
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {dias} {dias === 1 ? "dia" : "dias"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Users2 size={17} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Usuários cadastrados</p>
              <p className="text-lg font-semibold text-gray-900 tabular-nums">
                {totalUsuarios}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
