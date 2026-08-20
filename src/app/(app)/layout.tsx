import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "SUPERADMIN") redirect("/admin/usuarios");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { escritorio: true },
  });

  if (!user || !user.ativo || !user.escritorio || !user.escritorio.ativo) {
    redirect("/login?inativo=1");
  }

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar name={session.name} escritorioNome={user.escritorio.nome} />
        <main className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
