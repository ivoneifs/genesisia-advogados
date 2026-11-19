import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight, Copy, FileText, Filter, Search, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { duplicarCalculo, excluirCalculo, type Area } from "@/lib/actions/calculos";
import BotaoExcluir from "@/components/botao-excluir";

export type FiltrosCalculo = { q?: string; cliente?: string; tipo?: string; de?: string; ate?: string; p?: string };

const POR_PAGINA = 25;
const INPUT = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]";

/** Lista de cálculos salvos com filtros por cliente, tipo, período e busca. */
export default async function ListaCalculos({
  area,
  escritorioId,
  rotaBase,
  filtros,
  nomeTipo,
  urlCalculo,
}: {
  area: Area;
  escritorioId: string;
  rotaBase: string;
  filtros: FiltrosCalculo;
  nomeTipo: (tipo: string) => string;
  urlCalculo: (c: { id: string; tipo: string }) => string;
}) {
  const pagina = Math.max(1, Number.parseInt(filtros.p ?? "1", 10) || 1);
  const busca = filtros.q?.trim();
  const where: Prisma.CalculoWhereInput = {
    escritorioId,
    area,
    ...(filtros.cliente ? { clienteId: filtros.cliente } : {}),
    ...(filtros.tipo === "COMPLETO" ? { tipo: { startsWith: "COMPLETO" } } : filtros.tipo === "FERRAMENTA" ? { NOT: { tipo: { startsWith: "COMPLETO" } } } : filtros.tipo ? { tipo: filtros.tipo } : {}),
    ...(filtros.de || filtros.ate
      ? { updatedAt: { ...(filtros.de ? { gte: new Date(`${filtros.de}T00:00:00-03:00`) } : {}), ...(filtros.ate ? { lte: new Date(`${filtros.ate}T23:59:59-03:00`) } : {}) } }
      : {}),
    ...(busca
      ? { OR: [{ titulo: { contains: busca, mode: "insensitive" } }, { cliente: { nome: { contains: busca, mode: "insensitive" } } }, { cliente: { documento: { contains: busca } } }] }
      : {}),
  };
  const [total, calculos, clientes] = await Promise.all([
    prisma.calculo.count({ where }),
    prisma.calculo.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: { id: true, titulo: true, tipo: true, updatedAt: true, resumo: true, criadoPor: true, cliente: { select: { id: true, nome: true } } },
    }),
    prisma.cliente.findMany({
      where: { escritorioId, calculos: { some: { area } } },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
      take: 500,
    }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const url = (p: number) => {
    const sp = new URLSearchParams(Object.entries({ ...filtros, p: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `${rotaBase}?${sp}#calculos`;
  };
  const filtrando = !!(busca || filtros.cliente || filtros.tipo || filtros.de || filtros.ate);

  return (
    <section id="calculos" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Meus cálculos</h2>
        <span className="text-xs text-gray-500">{total} cálculo(s){totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}</span>
      </div>
      <form className="grid sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto_auto] gap-2 items-end rounded-xl border border-gray-200 bg-white p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input name="q" defaultValue={busca} placeholder="Título, cliente ou CPF" className={`${INPUT} w-full pl-8`} />
        </div>
        <select name="cliente" defaultValue={filtros.cliente ?? ""} className={INPUT}>
          <option value="">Todos os clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select name="tipo" defaultValue={filtros.tipo ?? ""} className={INPUT}>
          <option value="">Todos os tipos</option>
          <option value="COMPLETO">Cálculos completos</option>
          <option value="FERRAMENTA">Calculadoras</option>
        </select>
        <input type="date" name="de" defaultValue={filtros.de} className={INPUT} title="Atualizado desde" />
        <input type="date" name="ate" defaultValue={filtros.ate} className={INPUT} title="Atualizado até" />
        <div className="flex gap-2">
          <button className="flex items-center gap-1 rounded-lg bg-[var(--brand)] text-white text-sm px-3 py-2"><Filter size={14} /> Filtrar</button>
          {filtrando && <Link href={`${rotaBase}#calculos`} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">Limpar</Link>}
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr><th className="px-3 py-2 text-left">Cálculo</th><th className="px-3 py-2 text-left">Cliente</th><th className="px-3 py-2 text-left">Resultado</th><th className="px-3 py-2 text-left">Atualizado</th><th className="px-3 py-2 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {calculos.map((c) => {
              const destaque = (c.resumo as { destaque?: string } | null)?.destaque;
              return (
                <tr key={c.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2">
                    <Link href={urlCalculo(c)} className="font-medium text-gray-900 hover:text-[var(--brand)]">{c.titulo}</Link>
                    <p className="text-[11px] text-gray-500">{nomeTipo(c.tipo)}</p>
                  </td>
                  <td className="px-3 py-2">{c.cliente ? <Link href={`${rotaBase}?cliente=${c.cliente.id}#calculos`} className="hover:text-[var(--brand)]">{c.cliente.nome}</Link> : <span className="text-gray-400">—</span>}</td>
                  <td className="px-3 py-2 text-xs text-gray-700 max-w-[260px] truncate">{destaque ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{c.updatedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}{c.criadoPor && <span className="block">{c.criadoPor}</span>}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/relatorio/calculo/${c.id}`} target="_blank" title="Relatório" className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-[var(--brand)]"><FileText size={15} /></Link>
                      <form action={duplicarCalculo}><input type="hidden" name="id" value={c.id} /><button title="Duplicar" className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-[var(--brand)]"><Copy size={15} /></button></form>
                      <form action={excluirCalculo}><input type="hidden" name="id" value={c.id} /><BotaoExcluir mensagem={`Excluir o cálculo "${c.titulo}"?`} className="p-1.5 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></BotaoExcluir></form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!calculos.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">{filtrando ? "Nenhum cálculo com esses filtros." : "Nenhum cálculo salvo ainda."}</td></tr>}
          </tbody>
        </table>
      </div>
      {totalPaginas > 1 && (
        <div className="flex justify-end gap-2">
          {pagina > 1 && <Link href={url(pagina - 1)} className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"><ChevronLeft size={14} /> Anterior</Link>}
          {pagina < totalPaginas && <Link href={url(pagina + 1)} className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm">Próxima <ChevronRight size={14} /></Link>}
        </div>
      )}
    </section>
  );
}
