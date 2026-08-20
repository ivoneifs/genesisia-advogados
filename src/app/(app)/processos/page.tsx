import Link from "next/link";
import { prisma } from "@/lib/db";
import Badge from "@/components/badge";
import { Plus } from "lucide-react";

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const processos = await prisma.processo.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { cliente: true, _count: { select: { prazos: true } } },
  });

  const filters = [
    { label: "Todos", value: undefined },
    { label: "Ativos", value: "ATIVO" },
    { label: "Arquivados", value: "ARQUIVADO" },
    { label: "Encerrados", value: "ENCERRADO" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Processos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {processos.length} processo{processos.length !== 1 && "s"}{" "}
            encontrado{processos.length !== 1 && "s"}.
          </p>
        </div>
        <Link
          href="/processos/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          <Plus size={16} /> Novo processo
        </Link>
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/processos?status=${f.value}` : "/processos"}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border ${
              status === f.value ||
              (!status && !f.value)
                ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 font-medium">Número</th>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Área</th>
              <th className="px-5 py-3 font-medium">Tribunal / Vara</th>
              <th className="px-5 py-3 font-medium">Prazos</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {processos.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <Link
                    href={`/processos/${p.id}`}
                    className="font-medium text-gray-900 hover:text-[var(--brand)]"
                  >
                    {p.numero}
                  </Link>
                </td>
                <td className="px-5 py-3 text-gray-600">{p.cliente.nome}</td>
                <td className="px-5 py-3 text-gray-600">{p.area ?? "—"}</td>
                <td className="px-5 py-3 text-gray-600">
                  {[p.tribunal, p.vara].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {p._count.prazos}
                </td>
                <td className="px-5 py-3">
                  <Badge value={p.status} />
                </td>
              </tr>
            ))}
            {processos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
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
