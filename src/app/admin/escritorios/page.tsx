import Link from "next/link";
import { prisma } from "@/lib/db";
import { trialExpirado } from "@/lib/acesso";
import CriarEscritorioForm from "@/components/admin/criar-escritorio-form";
import EscritorioCard from "@/components/admin/escritorio-card";
import { PageHeader } from "@/components/admin/ui";
import { urlImagem } from "@/lib/marca";
import { Search, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

const FILTROS = [
  { valor: "", label: "Todos" },
  { valor: "ATIVO", label: "Ativos" },
  { valor: "TRIAL", label: "Em teste" },
  { valor: "BLOQUEADO", label: "Suspensos / expirados" },
];

export default async function AdminEscritoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "" } = await searchParams;
  const busca = q.trim();

  const todos = await prisma.escritorio.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        where: { role: { not: "SUPERADMIN" } },
        orderBy: { createdAt: "asc" },
      },
      advogados: { orderBy: { nome: "asc" }, select: { id: true, nome: true, oab: true, uf: true } },
    },
  });

  const bloqueado = (e: (typeof todos)[number]) =>
    !e.ativo || e.status === "SUSPENSO" || trialExpirado(e);

  const contagem: Record<string, number> = {
    "": todos.length,
    ATIVO: todos.filter((e) => e.status === "ATIVO" && !bloqueado(e)).length,
    TRIAL: todos.filter((e) => e.status === "TRIAL" && !bloqueado(e)).length,
    BLOQUEADO: todos.filter(bloqueado).length,
  };

  const termo = busca.toLowerCase();
  const escritorios = todos.filter((e) => {
    if (status === "BLOQUEADO" && !bloqueado(e)) return false;
    if ((status === "ATIVO" || status === "TRIAL") && (e.status !== status || bloqueado(e)))
      return false;
    if (!termo) return true;
    return (
      e.nome.toLowerCase().includes(termo) ||
      e.users.some(
        (u) =>
          u.name.toLowerCase().includes(termo) ||
          u.email.toLowerCase().includes(termo)
      )
    );
  });

  const href = (s: string) => {
    const p = new URLSearchParams();
    if (busca) p.set("q", busca);
    if (s) p.set("status", s);
    const qs = p.toString();
    return `/admin/escritorios${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Escritórios"
        descricao="Cadastre clientes, defina plano e status e gerencie os acessos de cada escritório."
      >
        <CriarEscritorioForm />
      </PageHeader>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {FILTROS.map((f) => {
            const ativo = status === f.valor;
            return (
              <Link
                key={f.valor}
                href={href(f.valor)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  ativo
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {f.label}
                <span
                  className={`text-xs tabular-nums rounded-md px-1.5 ${
                    ativo
                      ? "bg-[var(--brand)]/10 text-[var(--brand)]"
                      : "bg-slate-200/70 text-gray-500"
                  }`}
                >
                  {contagem[f.valor]}
                </span>
              </Link>
            );
          })}
        </div>

        <form className="relative w-full lg:w-80">
          {status && <input type="hidden" name="status" value={status} />}
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            name="q"
            defaultValue={busca}
            placeholder="Buscar por escritório, nome ou e-mail"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]"
          />
        </form>
      </div>

      <div className="space-y-4">
        {escritorios.map((e) => (
          <EscritorioCard
            key={e.id}
            escritorio={{
              id: e.id,
              nome: e.nome,
              ativo: e.ativo,
              plano: e.plano,
              status: e.status,
              trialExpira: e.trialExpira ? e.trialExpira.toISOString() : null,
              trialExpirado: trialExpirado(e),
              createdAt: e.createdAt.toISOString(),
              oabs: e.advogados,
              marca: {
                nomeTopo: e.nomeTopo,
                logoUrl: urlImagem(e.id, "logo", e.logoVersao),
                capaUrl: urlImagem(e.id, "capa", e.capaVersao),
                corPrimaria: e.corPrimaria,
                corMenu: e.corMenu,
                tamanhoFonte: e.tamanhoFonte,
              },
              users: e.users.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                ativo: u.ativo,
              })),
            }}
          />
        ))}
        {escritorios.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-5 py-14 text-center">
            <Building2 size={28} className="mx-auto text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-700">
              {todos.length === 0
                ? "Nenhum escritório cadastrado ainda"
                : "Nenhum escritório encontrado"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {todos.length === 0
                ? "Use o botão “Novo escritório” para cadastrar o primeiro cliente."
                : "Ajuste a busca ou o filtro."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
