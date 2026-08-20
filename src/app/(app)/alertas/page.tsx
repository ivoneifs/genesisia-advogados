import Link from "next/link";
import { prisma } from "@/lib/db";
import { daysUntil, formatDate } from "@/lib/format";
import {
  AlertTriangle,
  CalendarClock,
  Newspaper,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { requireEscritorioId } from "@/lib/session";

export default async function AlertasPage() {
  const escritorioId = await requireEscritorioId();
  const now = new Date();
  const in3 = new Date();
  in3.setDate(in3.getDate() + 3);

  const [prazosUrgentes, financeiroAtrasado, publicacoesPendentes] =
    await Promise.all([
      prisma.prazo.findMany({
        where: { status: "PENDENTE", dataVencimento: { lt: in3 }, escritorioId },
        orderBy: { dataVencimento: "asc" },
        include: { processo: { include: { cliente: true } } },
      }),
      prisma.financeiro.findMany({
        where: { status: { not: "PAGO" }, vencimento: { lt: now }, escritorioId },
        orderBy: { vencimento: "asc" },
      }),
      prisma.publicacao.findMany({
        where: { status: "NAO_TRATADA", escritorioId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const totalAlertas =
    prazosUrgentes.length + financeiroAtrasado.length + publicacoesPendentes.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Alertas</h1>
        <p className="text-sm text-gray-500 mt-1">
          {totalAlertas === 0
            ? "Tudo em dia por aqui."
            : `${totalAlertas} item${totalAlertas !== 1 ? "s" : ""} exigem sua atenção.`}
        </p>
      </div>

      {totalAlertas === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={28} className="text-emerald-500" />
          <p className="text-sm text-gray-500">
            Nenhum alerta pendente no momento.
          </p>
        </div>
      )}

      {prazosUrgentes.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/40">
          <div className="px-5 py-4 border-b border-red-200 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600" />
            <h2 className="font-medium text-gray-900">
              Prazos vencidos ou próximos (3 dias)
            </h2>
          </div>
          <ul className="divide-y divide-red-100">
            {prazosUrgentes.map((p) => {
              const d = daysUntil(p.dataVencimento);
              return (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <CalendarClock size={15} className="text-red-500 shrink-0" />
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
                  <span className="text-xs font-medium text-red-600 shrink-0">
                    {d < 0 ? `${Math.abs(d)}d atrasado` : d === 0 ? "hoje" : `em ${d}d`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {financeiroAtrasado.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40">
          <div className="px-5 py-4 border-b border-amber-200 flex items-center gap-2">
            <Wallet size={16} className="text-amber-600" />
            <h2 className="font-medium text-gray-900">
              Lançamentos financeiros atrasados
            </h2>
          </div>
          <ul className="divide-y divide-amber-100">
            {financeiroAtrasado.map((f) => (
              <li key={f.id} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-900">{f.descricao}</span>
                <span className="text-xs text-amber-700">
                  venceu em {formatDate(f.vencimento)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {publicacoesPendentes.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40">
          <div className="px-5 py-4 border-b border-blue-200 flex items-center gap-2">
            <Newspaper size={16} className="text-blue-600" />
            <h2 className="font-medium text-gray-900">
              Publicações não tratadas
            </h2>
          </div>
          <ul className="divide-y divide-blue-100">
            {publicacoesPendentes.map((p) => (
              <li key={p.id} className="px-5 py-3">
                <Link
                  href="/publicacoes"
                  className="text-sm text-gray-800 hover:text-[var(--brand)] line-clamp-2"
                >
                  {p.conteudo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
