import { prisma } from "@/lib/db";
import CriarEscritorioForm from "@/components/admin/criar-escritorio-form";
import EscritorioCard from "@/components/admin/escritorio-card";

export default async function AdminUsuariosPage() {
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
          Gerencie os escritórios que usam o Genesis IA e o acesso de cada
          usuário.
        </p>
      </div>

      <CriarEscritorioForm />

      <div className="space-y-4">
        {escritorios.map((e) => (
          <EscritorioCard key={e.id} escritorio={e} />
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
