import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { Plus, RefreshCw, Search, ChevronDown } from "lucide-react";
import ProcessosToolbar from "@/components/processos-toolbar";
import { requireEscritorioId } from "@/lib/session";

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const currentStatus = status ?? "ATIVO";
  const escritorioId = await requireEscritorioId();

  const processos = await prisma.processo.findMany({
    where: {
      escritorioId,
      ...(currentStatus !== "TODOS" ? { status: currentStatus } : {}),
      ...(q
        ? {
            OR: [
              { numero: { contains: q } },
              { parteContraria: { contains: q } },
              { cliente: { nome: { contains: q } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { cliente: true, prazos: { orderBy: { dataVencimento: "desc" }, take: 1 } },
  });

  const statusOptions = [
    { value: "ATIVO", label: "Ativos" },
    { value: "ARQUIVADO", label: "Arquivados" },
    { value: "ENCERRADO", label: "Encerrados" },
    { value: "TODOS", label: "Todos" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">
          Processos e casos
        </h1>
        <div className="flex items-center gap-2">
          <ProcessosToolbar
            rows={processos.map((p) => ({
              numero: p.numero,
              cliente: p.cliente.nome,
              area: p.area ?? "",
              status: p.status,
              tribunal: [p.tribunal, p.vara].filter(Boolean).join(" - "),
            }))}
          />
          <Link
            href="/processos"
            title="Atualizar"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw size={15} />
          </Link>
          <Link
            href="/processos/novo"
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white transition-colors"
          >
            <Plus size={17} />
          </Link>
        </div>
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
            placeholder="Digite algo para pesquisar"
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <div className="relative">
          <select
            name="status"
            defaultValue={currentStatus}
            className="appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            {statusOptions.map((s) => (
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
        <button
          type="submit"
          className="rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          Pesquisar
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 text-xs text-gray-500">
          {processos.length} processo{processos.length !== 1 && "s"} e caso
          {processos.length !== 1 && "s"}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 font-medium">Título</th>
              <th className="px-5 py-3 font-medium">Cliente / Pasta</th>
              <th className="px-5 py-3 font-medium">Ação / Foro</th>
              <th className="px-5 py-3 font-medium">Últ. mov.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {processos.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 align-top">
                <td className="px-5 py-3">
                  <Link
                    href={`/processos/${p.id}`}
                    className="font-medium text-gray-900 hover:text-[var(--brand)] block"
                  >
                    {p.cliente.nome}
                    {p.parteContraria && (
                      <span className="font-normal text-gray-500">
                        {" "}
                        x {p.parteContraria}
                      </span>
                    )}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Processo {currentStatus === "TODOS" ? "" : "ativo"} ·{" "}
                    <span className="underline">{p.numero}</span>
                  </p>
                </td>
                <td className="px-5 py-3 text-gray-600">{p.cliente.nome}</td>
                <td className="px-5 py-3 text-gray-600">
                  <p>{p.area ?? "—"}</p>
                  <p className="text-xs text-gray-400">
                    {[p.tribunal, p.vara].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {p.prazos[0] ? formatDate(p.prazos[0].dataVencimento) : "—"}
                </td>
              </tr>
            ))}
            {processos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-gray-400">
                  Nenhum processo encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
