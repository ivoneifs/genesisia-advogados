import Link from "next/link";
import { prisma } from "@/lib/db";
import { createContato, deleteContato } from "@/lib/actions/contatos";
import { Trash2, Plus, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import Paginacao, { paginaDe, urlCom } from "@/components/paginacao";
import { requireEscritorioId } from "@/lib/session";
import BotaoExcluir from "@/components/botao-excluir";

const TIPOS = [
  { value: "ADVOGADO", label: "Advogado(a) parceiro(a)" },
  { value: "PERITO", label: "Perito" },
  { value: "CORRESPONDENTE", label: "Correspondente" },
  { value: "PARTE_CONTRARIA", label: "Parte contrária" },
  { value: "OUTRO", label: "Outro" },
];

const POR_PAGINA = 50;

export default async function ContatosPage({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string; p?: string }> }) {
  const escritorioId = await requireEscritorioId();
  const filtros = await searchParams;
  const pagina = paginaDe(filtros.p);
  const busca = filtros.q?.trim();
  const tipo = TIPOS.some((t) => t.value === filtros.tipo) ? filtros.tipo : undefined;
  const where: Prisma.ContatoWhereInput = {
    escritorioId,
    ...(tipo ? { tipo } : {}),
    ...(busca
      ? {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            { empresa: { contains: busca, mode: "insensitive" } },
            { email: { contains: busca, mode: "insensitive" } },
            { telefone: { contains: busca } },
          ],
        }
      : {}),
  };
  const [total, contatos] = await Promise.all([
    prisma.contato.count({ where }),
    prisma.contato.findMany({ where, orderBy: { nome: "asc" }, skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const filtroQs = { q: busca, tipo };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Contatos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Agenda de contatos do escritório — parceiros, peritos,
          correspondentes e partes contrárias.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">Novo contato</h2>
        </div>
        <form
          action={createContato}
          className="px-5 py-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Nome
            </label>
            <input
              name="nome"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Tipo
            </label>
            <select
              name="tipo"
              defaultValue="OUTRO"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Empresa/Escritório
            </label>
            <input
              name="empresa"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Telefone
            </label>
            <input
              name="telefone"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            <Plus size={14} /> Adicionar
          </button>
        </form>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" name="q" defaultValue={busca} placeholder="Nome, empresa, e-mail ou telefone" className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" />
        </div>
        <select name="tipo" defaultValue={tipo ?? ""} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm">
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button className="rounded-lg bg-gray-900 text-white text-sm font-medium px-4 py-2.5">Pesquisar</button>
        <span className="text-xs text-gray-500">{total} contato(s)</span>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Empresa</th>
              <th className="px-5 py-3 font-medium">Contato</th>
              <th className="px-5 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contatos.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">
                  <Link
                    href={`/contatos/${c.id}`}
                    className="hover:text-[var(--brand)]"
                  >
                    {c.nome}
                  </Link>
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {TIPOS.find((t) => t.value === c.tipo)?.label ?? c.tipo}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {c.empresa ?? "—"}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {c.email || c.telefone || "—"}
                </td>
                <td className="px-5 py-3">
                  <form action={deleteContato} className="flex justify-end">
                    <input type="hidden" name="id" value={c.id} />
                    <BotaoExcluir mensagem="Excluir este contato?"
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </BotaoExcluir>
                  </form>
                </td>
              </tr>
            ))}
            {contatos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                  {busca || tipo ? "Nenhum contato encontrado." : "Nenhum contato cadastrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Paginacao pagina={pagina} totalPaginas={totalPaginas} url={(n) => urlCom("/contatos", filtroQs, n)} />
    </div>
  );
}
