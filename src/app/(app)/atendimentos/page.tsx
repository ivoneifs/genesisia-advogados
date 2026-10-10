import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDateTimeBR } from "@/lib/format";
import {
  deleteAtendimento,
  toggleAtendimentoStatus,
} from "@/lib/actions/atendimentos";
import {
  TIPOS_ATENDIMENTO,
  STATUS_ATENDIMENTO,
  labelTipo,
  labelStatus,
} from "@/lib/atendimentos";
import {
  Trash2,
  Plus,
  Pencil,
  Search,
  ChevronDown,
  CheckCircle2,
  RotateCcw,
  MessageCircle,
  Phone,
  Mail,
  Video,
  Users,
} from "lucide-react";
import { requireEscritorioId } from "@/lib/session";

const ICONE_TIPO = {
  PRESENCIAL: Users,
  TELEFONE: Phone,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  VIDEO: Video,
} as const;

export default async function AtendimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tipo?: string }>;
}) {
  const { q, status, tipo } = await searchParams;
  const escritorioId = await requireEscritorioId();

  const filtroStatus = STATUS_ATENDIMENTO.some((s) => s.value === status) ? status : undefined;
  const filtroTipo = TIPOS_ATENDIMENTO.some((t) => t.value === tipo) ? tipo : undefined;
  const busca = q?.trim();

  const [atendimentos, abertos, total] = await Promise.all([
    prisma.atendimento.findMany({
      where: {
        escritorioId,
        ...(filtroStatus ? { status: filtroStatus } : {}),
        ...(filtroTipo ? { tipo: filtroTipo } : {}),
        ...(busca
          ? {
              OR: [
                { titulo: { contains: busca, mode: "insensitive" } },
                { descricao: { contains: busca, mode: "insensitive" } },
                { cliente: { nome: { contains: busca, mode: "insensitive" } } },
                { processo: { numero: { contains: busca } } },
              ],
            }
          : {}),
      },
      orderBy: { data: "desc" },
      include: { cliente: true, processo: true },
    }),
    prisma.atendimento.count({ where: { escritorioId, status: "ABERTO" } }),
    prisma.atendimento.count({ where: { escritorioId } }),
  ]);

  const select =
    "appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Atendimentos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Histórico de contatos e interações com os clientes · {total} no total
            {abertos > 0 && (
              <>
                {" · "}
                <Link
                  href="/atendimentos?status=ABERTO"
                  className="text-amber-600 font-medium hover:underline"
                >
                  {abertos} em aberto
                </Link>
              </>
            )}
          </p>
        </div>
        <Link
          href="/atendimentos/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          <Plus size={16} /> Novo atendimento
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por assunto, cliente, detalhes ou nº do processo"
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <div className="relative">
          <select name="status" defaultValue={filtroStatus ?? ""} className={select}>
            <option value="">TODAS AS SITUAÇÕES</option>
            {STATUS_ATENDIMENTO.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label.toUpperCase()}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
        <div className="relative">
          <select name="tipo" defaultValue={filtroTipo ?? ""} className={select}>
            <option value="">TODOS OS CANAIS</option>
            {TIPOS_ATENDIMENTO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label.toUpperCase()}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          Pesquisar
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-3 border-b border-gray-100 text-xs text-gray-500">
          {atendimentos.length} atendimento{atendimentos.length !== 1 && "s"}
        </div>
        <ul className="divide-y divide-gray-100">
          {atendimentos.map((a) => {
            const Icone = ICONE_TIPO[a.tipo as keyof typeof ICONE_TIPO] ?? Users;
            const aberto = a.status === "ABERTO";
            return (
              <li key={a.id} className="px-5 py-4 flex items-start gap-3 hover:bg-gray-50">
                <span
                  title={labelTipo(a.tipo)}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500"
                >
                  <Icone size={15} />
                </span>
                <Link href={`/atendimentos/${a.id}/editar`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                    {a.titulo}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                        aberto
                          ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                      }`}
                    >
                      {labelStatus(a.status)}
                    </span>
                  </p>
                  {a.descricao && (
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2 whitespace-pre-line">
                      {a.descricao}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {a.cliente.nome}
                    {a.processo && ` · Proc. ${a.processo.numero}`} · {labelTipo(a.tipo)} ·{" "}
                    {formatDateTimeBR(a.data)}
                  </p>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  <form action={toggleAtendimentoStatus}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      title={aberto ? "Marcar como concluído" : "Reabrir"}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                    >
                      {aberto ? <CheckCircle2 size={15} /> : <RotateCcw size={14} />}
                    </button>
                  </form>
                  <Link
                    href={`/atendimentos/${a.id}/editar`}
                    title="Editar"
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil size={14} />
                  </Link>
                  <form action={deleteAtendimento}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      title="Excluir"
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
          {atendimentos.length === 0 && (
            <li className="px-5 py-10 text-center text-gray-400 text-sm">
              {total === 0 ? (
                <>
                  Nenhum atendimento registrado ainda.{" "}
                  <Link href="/atendimentos/novo" className="text-[var(--brand)] underline">
                    Registrar o primeiro
                  </Link>
                </>
              ) : (
                "Nenhum atendimento encontrado com esses filtros."
              )}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
