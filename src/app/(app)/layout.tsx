import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { motivoBloqueio } from "@/lib/acesso";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import AvisoPermissao from "@/components/aviso-permissao";
import { Suspense } from "react";
import { marcaDoEscritorio } from "@/lib/marca";
import { AplicarTamanhoLetras } from "@/components/tamanho-letras";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "SUPERADMIN") redirect("/admin");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { escritorio: true },
  });

  if (!user || !user.ativo || !user.escritorio) {
    redirect("/login?inativo=1");
  }
  if (motivoBloqueio(user.escritorio)) {
    redirect("/login?inativo=1");
  }

  const marca = marcaDoEscritorio(user.escritorio);
  const menu = { nomeTopo: marca.nomeTopo, logoUrl: marca.logoUrl, corMenu: marca.corMenu };

  return (
    <div className="min-h-screen flex bg-[var(--background)]" style={marca.estilo}>
      <AplicarTamanhoLetras padrao={marca.tamanhoFonte} />
      <Sidebar papel={user.role} marca={menu} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          name={user.name}
          papel={user.role}
          escritorioNome={user.escritorio.nome}
          marca={menu}
          tamanhoFonte={marca.tamanhoFonte}
        />
        <main className="flex-1 px-4 py-6 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
        <Suspense>
          <AvisoPermissao />
        </Suspense>
      </div>
    </div>
  );
}
