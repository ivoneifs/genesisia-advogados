import { prisma } from "@/lib/db";
import CriarEscritorioForm from "@/components/admin/criar-escritorio-form";
import EscritorioCard from "@/components/admin/escritorio-card";

export const dynamic = "force-dynamic";

export default async function AdminEscritoriosPage() {
  const escritorios = await prisma.escritorio.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        where: { role: { not: "SUPERADMIN" } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Escritórios e usuários
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Cadastre clientes, defina plano/status e gerencie os acessos de cada
          escritório.
        </p>
      </div>

      <CriarEscritorioForm />

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
              createdAt: e.createdAt,
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
          <div className="rounded-xl border border-dashed border-gray-300 px-5 py-10 text-center text-sm text-gray-400">
            Nenhum escritório cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  );
}
