import Link from "next/link";
import { prisma } from "@/lib/db";
import { deleteCliente } from "@/lib/actions/clientes";
import { requireEscritorioId } from "@/lib/session";
import { Plus, Trash2, Pencil, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Prisma } from "@prisma/client";
import BotaoExcluir from "@/components/botao-excluir";
import { GRUPOS_PAPEIS } from "@/lib/papeis-processuais";

const POR_PAGINA = 50;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; n?: string; q?: string; p?: string; papel?: string }>;
}) {
  const { erro, n, q, p: paginaParam, papel } = await searchParams;
  const grupoPapel = papel?.startsWith("grupo:") ? GRUPOS_PAPEIS.find((g) => g.grupo === papel.slice(6)) : null;
  const filtroPapel: Prisma.ClienteWhereInput = grupoPapel
    ? { processos: { some: { papelCliente: { in: grupoPapel.papeis } } } }
    : papel
      ? { processos: { some: { papelCliente: papel } } }
      : {};
  const pagina = Math.max(1, Number.parseInt(paginaParam ?? "1", 10) || 1);
  const busca = q?.trim();
  const escritorioId = await requireEscritorioId();
  const where: Prisma.ClienteWhereInput = {
    escritorioId,
    ...filtroPapel,
    ...(busca
      ? {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            { documento: { contains: busca } },
            { email: { contains: busca, mode: "insensitive" } },
            { telefone: { contains: busca } },
          ],
        }
      : {}),
  };
  const [total, clientes] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { _count: { select: { processos: true } } },
    }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const urlPagina = (num: number) =>
    `/clientes?${new URLSearchParams({ ...(busca ? { q: busca } : {}), ...(papel ? { papel } : {}), p: String(num) })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} cliente{total !== 1 && "s"} {busca ? "encontrado" : "cadastrado"}
            {total !== 1 && "s"}
            {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}.
          </p>
        </div>
        <Link
          href="/clientes/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          <Plus size={16} /> Novo cliente
        </Link>
      </div>

      {erro === "processos" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Este cliente tem {n ?? "alguns"} processo{n !== "1" && "s"} vinculado
          {n !== "1" && "s"} e não pode ser excluído. Exclua os processos ou
          vincule-os a outro cliente antes.
        </p>
      )}

      <form className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            name="q"
            defaultValue={busca}
            placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone"
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <select
          name="papel"
          defaultValue={papel ?? ""}
          title="Clientes que figuram neste papel em algum processo"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] max-w-[240px]"
        >
          <option value="">Papel nos processos: todos</option>
          {GRUPOS_PAPEIS.map((g) => (
            <optgroup key={g.grupo} label={g.grupo}>
              <option value={`grupo:${g.grupo}`}>Todo o grupo: {g.grupo}</option>
              {g.papeis.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          Pesquisar
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Documento</th>
              <th className="px-5 py-3 font-medium">Contato</th>
              <th className="px-5 py-3 font-medium">Processos</th>
              <th className="px-5 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">
                  <Link href={`/clientes/${c.id}`} className="hover:text-[var(--brand)]">
                    {c.nome}
                  </Link>
                </td>
                <td className="px-5 py-3 text-gray-600">{c.tipo}</td>
                <td className="px-5 py-3 text-gray-600">
                  {c.documento ?? "—"}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {c.email || c.telefone || "—"}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {c._count.processos}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <Pencil size={14} />
                    </Link>
                    <form action={deleteCliente}>
                      <input type="hidden" name="id" value={c.id} />
                      <BotaoExcluir mensagem="Excluir este cliente?"
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </BotaoExcluir>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  {busca ? "Nenhum cliente encontrado para essa busca." : "Nenhum cliente cadastrado ainda."}
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
