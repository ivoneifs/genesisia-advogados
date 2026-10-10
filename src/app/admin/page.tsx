import Link from "next/link";
import { prisma } from "@/lib/db";
import { trialExpirado, diasRestantesTrial } from "@/lib/acesso";
import {
  Building2,
  Users2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

function fmtData(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default async function AdminDashboard() {
  const [escritorios, totalUsuarios] = await Promise.all([
    prisma.escritorio.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true } } },
    }),
    prisma.user.count({ where: { role: { not: "SUPERADMIN" } } }),
  ]);

  const ativos = escritorios.filter(
    (e) => e.status === "ATIVO" && e.ativo
  ).length;
  const emTrial = escritorios.filter(
    (e) => e.status === "TRIAL" && !trialExpirado(e)
  ).length;
  const suspensos = escritorios.filter(
    (e) => e.status === "SUSPENSO" || !e.ativo || trialExpirado(e)
  ).length;
  const trialsExpirando = escritorios.filter(
    (e) => e.status === "TRIAL" && !trialExpirado(e) && diasRestantesTrial(e) <= 7
  );

  const cards = [
    {
      label: "Escritórios",
      valor: escritorios.length,
      icon: Building2,
      cor: "text-gray-700 bg-gray-100",
    },
    {
      label: "Clientes ativos",
      valor: ativos,
      icon: CheckCircle2,
      cor: "text-emerald-700 bg-emerald-100",
    },
    {
      label: "Em teste (trial)",
      valor: emTrial,
      icon: Clock,
      cor: "text-amber-700 bg-amber-100",
    },
    {
      label: "Suspensos / expirados",
      valor: suspensos,
      icon: AlertTriangle,
      cor: "text-red-700 bg-red-100",
    },
    {
      label: "Usuários",
      valor: totalUsuarios,
      icon: Users2,
      cor: "text-indigo-700 bg-indigo-100",
    },
  ];

  const recentes = escritorios.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Painel</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visão geral da sua base de clientes (escritórios) no Genesis IA.
          </p>
        </div>
        <Link
          href="/admin/escritorios"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Gerenciar escritórios <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div
              className={`h-9 w-9 rounded-lg flex items-center justify-center ${c.cor}`}
            >
              <c.icon size={18} />
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">
              {c.valor}
            </p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {trialsExpirando.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
            <Clock size={15} /> Trials expirando em até 7 dias
          </p>
          <ul className="mt-2 space-y-1">
            {trialsExpirando.map((e) => (
              <li
                key={e.id}
                className="text-sm text-amber-900 flex items-center justify-between"
              >
                <span>{e.nome}</span>
                <span className="text-xs">
                  {diasRestantesTrial(e)} dia(s) — expira {fmtData(e.trialExpira)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-medium text-gray-900">Escritórios recentes</h2>
          <Link
            href="/admin/escritorios"
            className="text-xs font-medium text-[var(--brand)] hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {recentes.map((e) => (
            <li
              key={e.id}
              className="px-5 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {e.nome}
                </p>
                <p className="text-xs text-gray-500">
                  {e._count.users} usuário(s) · desde {fmtData(e.createdAt)}
                </p>
              </div>
              <StatusBadge
                status={e.status}
                ativo={e.ativo}
                expirado={trialExpirado(e)}
                plano={e.plano}
              />
            </li>
          ))}
          {recentes.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-gray-400">
              Nenhum escritório cadastrado ainda.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  ativo,
  expirado,
  plano,
}: {
  status: string;
  ativo: boolean;
  expirado: boolean;
  plano: string;
}) {
  let txt = status;
  let cls = "bg-gray-100 text-gray-600";
  if (!ativo || status === "SUSPENSO") {
    txt = "Suspenso";
    cls = "bg-red-100 text-red-700";
  } else if (status === "TRIAL") {
    txt = expirado ? "Trial expirado" : "Trial";
    cls = expirado ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
  } else if (status === "ATIVO") {
    txt = "Ativo";
    cls = "bg-emerald-100 text-emerald-700";
  }
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs font-medium text-gray-500">{plano}</span>
      <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${cls}`}>
        {txt}
      </span>
    </div>
  );
}
