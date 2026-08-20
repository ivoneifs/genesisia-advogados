import Link from "next/link";
import { prisma } from "@/lib/db";
import { deleteCliente } from "@/lib/actions/clientes";
import { Plus, Trash2, Pencil } from "lucide-react";

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { processos: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {clientes.length} cliente{clientes.length !== 1 && "s"} cadastrado
            {clientes.length !== 1 && "s"}.
          </p>
        </div>
        <Link
          href="/clientes/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          <Plus size={16} /> Novo cliente
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
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
                  {c.nome}
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
                      <button
                        type="submit"
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
