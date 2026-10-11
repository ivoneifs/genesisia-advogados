import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { Plus, RefreshCw, Search, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import ProcessosToolbar from "@/components/processos-toolbar";
import ImportarOabForm from "@/components/importar-oab-form";
import { requireEscritorioId } from "@/lib/session";
import { parseAdvogados, formatOab } from "@/lib/advogados";
import { STATUS_INATIVOS, whereProcessos } from "@/lib/processos-filtro";

const POR_PAGINA = 50;

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; p?: string }>;
}) {
  const { status, q, p: paginaParam } = await searchParams;
  const currentStatus = status ?? "TODOS";
  const pagina = Math.max(1, Number.parseInt(paginaParam ?? "1", 10) || 1);
  const escritorioId = await requireEscritorioId();
  const where = whereProcessos(escritorioId, currentStatus, q);

  const [total, processos] = await Promise.all([
    prisma.processo.count({ where }),
    prisma.processo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { cliente: true, prazos: { orderBy: { dataVencimento: "desc" }, take: 1 } },
    }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const filtroQs = { status: currentStatus, ...(q ? { q } : {}) };
  const urlPagina = (n: number) =>
    `/processos?${new URLSearchParams({ ...filtroQs, p: String(n) })}`;

  const statusOptions = [
    { value: "TODOS", label: "Todos" },
    { value: "ATIVO", label: "Ativos" },
    { value: "INATIVO", label: "Inativos" },
    { value: "ARQUIVADO", label: "Arquivados" },
    { value: "ENCERRADO", label: "Encerrados" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">
          Processos e casos
        </h1>
        <div className="flex items-center gap-2">
          <ProcessosToolbar csvHref={`/api/processos/csv?${new URLSearchParams(filtroQs)}`} />
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

      <ImportarOabForm />

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
          {total.toLocaleString("pt-BR")} processo{total !== 1 && "s"} e caso
          {total !== 1 && "s"}
          {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 font-medium">Título</th>
              <th className="px-5 py-3 font-medium">Cliente / Pasta</th>
              <th className="px-5 py-3 font-medium">Ação / Foro</th>
              <th className="px-5 py-3 font-medium">Advogados</th>
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
                    <SituacaoTag status={p.status} /> {p.cliente.nome}
                    {p.parteContraria && (
                      <span className="font-normal text-gray-500">
                        {" "}
                        x {p.parteContraria}
                      </span>
                    )}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Processo ·{" "}
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
                <td className="px-5 py-3 text-xs">
                  <AdvogadosCell json={p.advogados} />
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {p.prazos[0] ? formatDate(p.prazos[0].dataVencimento) : "—"}
                </td>
              </tr>
            ))}
            {processos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                  Nenhum processo encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {totalPaginas > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            {pagina > 1 ? (
              <Link
                href={urlPagina(pagina - 1)}
                className="inline-flex items-center gap-1 text-gray-600 hover:text-[var(--brand)]"
              >
                <ChevronLeft size={15} /> Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-500">
              Página {pagina} de {totalPaginas}
            </span>
            {pagina < totalPaginas ? (
              <Link
                href={urlPagina(pagina + 1)}
                className="inline-flex items-center gap-1 text-gray-600 hover:text-[var(--brand)]"
              >
                Próxima <ChevronRight size={15} />
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AdvogadosCell({ json }: { json: unknown }) {
  const advogados = parseAdvogados(json);
  if (advogados.length === 0) return <span className="text-gray-400">—</span>;
  const visiveis = advogados.slice(0, 3);
  return (
    <ul className="space-y-0.5">
      {visiveis.map((a) => (
        <li key={`${a.oab}/${a.uf}`}>
          <span className="text-gray-700">{a.nome}</span>{" "}
          <span className="text-gray-400 whitespace-nowrap">{formatOab(a)}</span>
        </li>
      ))}
      {advogados.length > visiveis.length && (
        <li className="text-gray-400">
          +{advogados.length - visiveis.length} advogado
          {advogados.length - visiveis.length !== 1 && "s"}
        </li>
      )}
    </ul>
  );
}

function SituacaoTag({ status }: { status: string }) {
  const inativo = STATUS_INATIVOS.includes(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset align-middle ${
        inativo
          ? "bg-gray-100 text-gray-600 ring-gray-500/20"
          : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      }`}
    >
      {inativo ? "Inativo" : "Ativo"}
    </span>
  );
}
