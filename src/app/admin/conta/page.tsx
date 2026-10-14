import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/ui";
import EditarUsuario from "@/components/admin/editar-usuario";

export const dynamic = "force-dynamic";

export default async function AdminContaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const eu = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true },
  });
  if (!eu) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader titulo="Minha conta" descricao="Nome, e-mail de login e senha do administrador." />
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <EditarUsuario usuario={eu} />
      </div>
    </div>
  );
}
