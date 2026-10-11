import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigirPagina } from "@/lib/usuario";
import { formatDateTimeBR } from "@/lib/format";
import { Plus, Pencil, Trash2, CheckCircle2, RotateCcw, History } from "lucide-react";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

const ACAO = {
  CRIOU: { label: "criou", icon: Plus, cls: "bg-emerald-50 text-emerald-700" },
  EDITOU: { label: "editou", icon: Pencil, cls: "bg-indigo-50 text-indigo-700" },
  EXCLUIU: { label: "excluiu", icon: Trash2, cls: "bg-red-50 text-red-700" },
  CONCLUIU: { label: "concluiu", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700" },
  REABRIU: { label: "reabriu", icon: RotateCcw, cls: "bg-amber-50 text-amber-700" },
} as const;

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; usuario?: string }>;
}) {
  const { escritorioId } = await exigirPagina("gerenciar");
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const usuario = sp.usuario || undefined;
  const where = { escritorioId, ...(usuario ? { userId: usuario } : {}) };

  const [total, itens, usuarios] = await Promise.all([
    prisma.atividade.count({ where }),
    prisma.atividade.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.user.findMany({
      where: { escritorioId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (p: number) =>
    `/atividades?pagina=${p}${usuario ? `&usuario=${usuario}` : ""}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Atividades</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quem criou, alterou ou excluiu registros no escritório.
          </p>
        </div>
        <form className="flex items-center gap-2">
          <select
            name="usuario"
            defaultValue={usuario ?? ""}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Todas as pessoas</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-sm font-medium text-gray-700">
            Filtrar
          </button>
        </form>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {itens.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <History size={28} className="mx-auto text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">Nenhuma atividade registrada ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {itens.map((a) => {
              const cfg = ACAO[a.acao as keyof typeof ACAO] ?? ACAO.EDITOU;
              return (
                <li key={a.id} className="px-5 py-3 flex items-start gap-3">
                  <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${cfg.cls}`}>
                    <cfg.icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{a.userNome}</span> {cfg.label}{" "}
                      <span className="text-gray-500">{a.entidade.toLowerCase()}</span>
                    </p>
                    <p className="text-sm text-gray-600 truncate">{a.descricao}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{formatDateTimeBR(a.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {paginas > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Página {pagina} de {paginas} · {total} registros</span>
          <div className="flex gap-2">
            {pagina > 1 && <Link href={link(pagina - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50">Anterior</Link>}
            {pagina < paginas && <Link href={link(pagina + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50">Próxima</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
