import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";

function Bar({
  label,
  value,
  max,
  color,
  display,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  display: string;
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, 3) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span className="font-medium text-gray-900">{display}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default async function IndicadoresPage() {
  const [
    porArea,
    porStatus,
    prazosPorStatus,
    financeiroPorTipo,
    totalProcessos,
    totalPrazos,
  ] = await Promise.all([
    prisma.processo.groupBy({ by: ["area"], _count: { _all: true } }),
    prisma.processo.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.prazo.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.financeiro.groupBy({
      by: ["tipo", "status"],
      _sum: { valor: true },
    }),
    prisma.processo.count(),
    prisma.prazo.count(),
  ]);

  const maxArea = Math.max(...porArea.map((a) => a._count._all), 1);
  const maxPrazo = Math.max(...prazosPorStatus.map((p) => p._count._all), 1);

  const receitaPaga =
    financeiroPorTipo.find((f) => f.tipo === "RECEITA" && f.status === "PAGO")
      ?._sum.valor ?? 0;
  const receitaPendente =
    financeiroPorTipo
      .filter((f) => f.tipo === "RECEITA" && f.status !== "PAGO")
      .reduce((acc, f) => acc + (f._sum.valor ?? 0), 0) ?? 0;
  const despesaPaga =
    financeiroPorTipo.find((f) => f.tipo === "DESPESA" && f.status === "PAGO")
      ?._sum.valor ?? 0;
  const maxFinanceiro = Math.max(receitaPaga, receitaPendente, despesaPaga, 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Indicadores</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visão analítica do escritório.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total de processos</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {totalProcessos}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total de prazos</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {totalPrazos}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Saldo financeiro</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(receitaPaga - despesaPaga)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="font-medium text-gray-900">Processos por área</h2>
          <div className="space-y-3">
            {porArea.map((a) => (
              <Bar
                key={a.area ?? "outro"}
                label={a.area ?? "Não informado"}
                value={a._count._all}
                max={maxArea}
                color="var(--brand)"
                display={String(a._count._all)}
              />
            ))}
            {porArea.length === 0 && (
              <p className="text-sm text-gray-400">Sem dados ainda.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="font-medium text-gray-900">Processos por status</h2>
          <div className="space-y-3">
            {porStatus.map((s) => (
              <Bar
                key={s.status}
                label={s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                value={s._count._all}
                max={totalProcessos || 1}
                color="var(--accent)"
                display={String(s._count._all)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="font-medium text-gray-900">Prazos por status</h2>
          <div className="space-y-3">
            {prazosPorStatus.map((p) => (
              <Bar
                key={p.status}
                label={p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                value={p._count._all}
                max={maxPrazo}
                color="#f59e0b"
                display={String(p._count._all)}
              />
            ))}
            {prazosPorStatus.length === 0 && (
              <p className="text-sm text-gray-400">Sem dados ainda.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="font-medium text-gray-900">Financeiro</h2>
          <div className="space-y-3">
            <Bar
              label="Receitas recebidas"
              value={receitaPaga}
              max={maxFinanceiro}
              color="#10b981"
              display={formatCurrency(receitaPaga)}
            />
            <Bar
              label="Receitas pendentes"
              value={receitaPendente}
              max={maxFinanceiro}
              color="#f59e0b"
              display={formatCurrency(receitaPendente)}
            />
            <Bar
              label="Despesas pagas"
              value={despesaPaga}
              max={maxFinanceiro}
              color="#ef4444"
              display={formatCurrency(despesaPaga)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
