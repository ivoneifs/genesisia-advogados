import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  daysUntil,
  formatDate,
  formatCurrency,
  formatDateTimeBR,
  diaBRSoDia,
} from "@/lib/format";
import {
  AlertTriangle,
  CalendarClock,
  CalendarX2,
  Newspaper,
  Wallet,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { requireEscritorioId } from "@/lib/session";

// Cada bloco mostra no máximo este número de itens (o total aparece no título).
const LIMITE = 20;
const LIMITE_PUBLICACOES = 10;

export default async function AlertasPage() {
  const escritorioId = await requireEscritorioId();
  // Prazos/vencimentos são datas "só dia" (meia-noite UTC): compara pelo dia de Brasília.
  const hoje = diaBRSoDia();
  const limitePrazos = diaBRSoDia(4); // vencidos, hoje e próximos 3 dias

  const wherePrazos = { status: "PENDENTE", dataVencimento: { lt: limitePrazos }, escritorioId };
  const whereFinanceiro = { status: { not: "PAGO" }, vencimento: { lt: hoje }, escritorioId };
  const whereTarefas = { concluida: false, data: { lt: new Date() }, escritorioId };
  const wherePublicacoes = { status: "NAO_TRATADA", escritorioId };

  const [
    totalPrazos,
    prazosUrgentes,
    totalFinanceiro,
    financeiroAtrasado,
    totalTarefas,
    tarefasAtrasadas,
    totalPublicacoes,
    publicacoesRecentes,
  ] = await Promise.all([
    prisma.prazo.count({ where: wherePrazos }),
    prisma.prazo.findMany({
      where: wherePrazos,
      orderBy: { dataVencimento: "asc" },
      take: LIMITE,
      include: { processo: { include: { cliente: true } } },
    }),
    prisma.financeiro.count({ where: whereFinanceiro }),
    prisma.financeiro.findMany({
      where: whereFinanceiro,
      orderBy: { vencimento: "asc" },
      take: LIMITE,
    }),
    prisma.tarefa.count({ where: whereTarefas }),
    prisma.tarefa.findMany({
      where: whereTarefas,
      orderBy: { data: "asc" },
      take: LIMITE,
      include: { processo: { select: { numero: true } } },
    }),
    prisma.publicacao.count({ where: wherePublicacoes }),
    // Sem o conteúdo (pode ter centenas de KB); a prévia vem abaixo via SQL.
    prisma.publicacao.findMany({
      where: wherePublicacoes,
      orderBy: [{ dataPublicacao: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: LIMITE_PUBLICACOES,
      select: {
        id: true,
        diario: true,
        dataPublicacao: true,
        processo: { select: { numero: true } },
      },
    }),
  ]);

  const ids = publicacoesRecentes.map((p) => p.id);
  const previas = ids.length
    ? await prisma.$queryRaw<{ id: string; previa: string }[]>`
        SELECT id, left(conteudo, 240) AS previa
        FROM "Publicacao" WHERE id IN (${Prisma.join(ids)})`
    : [];
  const previaPorId = new Map(previas.map((p) => [p.id, p.previa]));

  const totalAlertas = totalPrazos + totalFinanceiro + totalTarefas + totalPublicacoes;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Alertas</h1>
        <p className="text-sm text-gray-500 mt-1">
          {totalAlertas === 0
            ? "Tudo em dia por aqui."
            : `${totalAlertas.toLocaleString("pt-BR")} ite${
                totalAlertas !== 1 ? "ns exigem" : "m exige"
              } sua atenção.`}
        </p>
      </div>

      {totalAlertas > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Resumo href="#prazos" label="Prazos urgentes" valor={totalPrazos} cor="text-red-600" />
          <Resumo href="#agenda" label="Compromissos atrasados" valor={totalTarefas} cor="text-orange-600" />
          <Resumo href="#financeiro" label="Financeiro atrasado" valor={totalFinanceiro} cor="text-amber-600" />
          <Resumo href="#publicacoes" label="Publicações pendentes" valor={totalPublicacoes} cor="text-blue-600" />
        </div>
      )}

      {totalAlertas === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={28} className="text-emerald-500" />
          <p className="text-sm text-gray-500">Nenhum alerta pendente no momento.</p>
        </div>
      )}

      {totalPrazos > 0 && (
        <Bloco
          id="prazos"
          cor="red"
          icone={<AlertTriangle size={16} className="text-red-600" />}
          titulo="Prazos vencidos ou próximos (3 dias)"
          total={totalPrazos}
          mostrados={prazosUrgentes.length}
          verTodos={{ href: "/agenda", label: "Ver na Agenda" }}
        >
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
                    {p.processo.cliente.nome} · Proc. {p.processo.numero} · vence{" "}
                    {formatDate(p.dataVencimento)}
                  </p>
                </div>
                <span className="text-xs font-medium text-red-600 shrink-0">
                  {d < 0 ? `${Math.abs(d)}d atrasado` : d === 0 ? "hoje" : `em ${d}d`}
                </span>
              </li>
            );
          })}
        </Bloco>
      )}

      {totalTarefas > 0 && (
        <Bloco
          id="agenda"
          cor="orange"
          icone={<CalendarX2 size={16} className="text-orange-600" />}
          titulo="Compromissos da agenda atrasados"
          total={totalTarefas}
          mostrados={tarefasAtrasadas.length}
          verTodos={{ href: "/agenda", label: "Abrir Agenda" }}
        >
          {tarefasAtrasadas.map((t) => (
            <li key={t.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">{t.titulo}</p>
                {t.processo && (
                  <p className="text-xs text-gray-500">Proc. {t.processo.numero}</p>
                )}
              </div>
              <span className="text-xs text-orange-700 shrink-0">
                {formatDateTimeBR(t.data)}
              </span>
            </li>
          ))}
        </Bloco>
      )}

      {totalFinanceiro > 0 && (
        <Bloco
          id="financeiro"
          cor="amber"
          icone={<Wallet size={16} className="text-amber-600" />}
          titulo="Lançamentos financeiros atrasados"
          total={totalFinanceiro}
          mostrados={financeiroAtrasado.length}
          verTodos={{ href: "/financeiro", label: "Abrir Financeiro" }}
        >
          {financeiroAtrasado.map((f) => (
            <li key={f.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-900 truncate">
                {f.descricao}{" "}
                <span className="text-gray-500">· {formatCurrency(f.valor)}</span>
              </span>
              <span className="text-xs text-amber-700 shrink-0">
                venceu em {formatDate(f.vencimento)}
              </span>
            </li>
          ))}
        </Bloco>
      )}

      {totalPublicacoes > 0 && (
        <Bloco
          id="publicacoes"
          cor="blue"
          icone={<Newspaper size={16} className="text-blue-600" />}
          titulo="Publicações não tratadas"
          total={totalPublicacoes}
          mostrados={publicacoesRecentes.length}
          verTodos={{ href: "/publicacoes?status=NAO_TRATADA", label: "Ver todas em Publicações" }}
        >
          {publicacoesRecentes.map((p) => (
            <li key={p.id} className="px-5 py-3">
              <Link
                href={`/publicacoes/${p.id}`}
                className="text-sm text-gray-800 hover:text-[var(--brand)] line-clamp-2"
              >
                {previaPorId.get(p.id)}
              </Link>
              <p className="text-xs text-gray-500 mt-0.5">
                {[
                  p.diario,
                  p.dataPublicacao ? formatDate(p.dataPublicacao) : null,
                  p.processo ? `Proc. ${p.processo.numero}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </Bloco>
      )}
    </div>
  );
}

const CORES = {
  red: { borda: "border-red-200", fundo: "bg-red-50/40", divisor: "divide-red-100" },
  orange: { borda: "border-orange-200", fundo: "bg-orange-50/40", divisor: "divide-orange-100" },
  amber: { borda: "border-amber-200", fundo: "bg-amber-50/40", divisor: "divide-amber-100" },
  blue: { borda: "border-blue-200", fundo: "bg-blue-50/40", divisor: "divide-blue-100" },
} as const;

function Bloco({
  id,
  cor,
  icone,
  titulo,
  total,
  mostrados,
  verTodos,
  children,
}: {
  id: string;
  cor: keyof typeof CORES;
  icone: React.ReactNode;
  titulo: string;
  total: number;
  mostrados: number;
  verTodos: { href: string; label: string };
  children: React.ReactNode;
}) {
  const c = CORES[cor];
  return (
    <div id={id} className={`rounded-xl border ${c.borda} ${c.fundo} scroll-mt-6`}>
      <div className={`px-5 py-4 border-b ${c.borda} flex items-center gap-2 flex-wrap`}>
        {icone}
        <h2 className="font-medium text-gray-900">
          {titulo} ({total.toLocaleString("pt-BR")})
        </h2>
        <Link
          href={verTodos.href}
          className="ml-auto inline-flex items-center gap-0.5 text-xs font-medium text-[var(--brand)] hover:underline"
        >
          {verTodos.label} <ChevronRight size={13} />
        </Link>
      </div>
      <ul className={`divide-y ${c.divisor}`}>{children}</ul>
      {total > mostrados && (
        <p className="px-5 py-2.5 text-xs text-gray-500 border-t border-gray-100">
          Mostrando {mostrados} de {total.toLocaleString("pt-BR")}.{" "}
          <Link href={verTodos.href} className="text-[var(--brand)] hover:underline">
            {verTodos.label}
          </Link>
        </p>
      )}
    </div>
  );
}

function Resumo({ href, label, valor, cor }: { href: string; label: string; valor: number; cor: string }) {
  return (
    <a href={href} className="rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-[var(--brand)] transition-colors">
      <p className={`text-2xl font-semibold ${valor > 0 ? cor : "text-gray-300"}`}>
        {valor.toLocaleString("pt-BR")}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </a>
  );
}
