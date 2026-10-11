import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";
import { Scale, LogOut, ShieldCheck, LayoutDashboard, Building2 } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPERADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[var(--brand)] text-white flex items-center justify-center">
            <Scale size={16} />
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">
            Genesis IA
          </span>
          <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] bg-[var(--brand)]/10 rounded-full px-2 py-0.5">
            <ShieldCheck size={12} /> Administração
          </span>
        </div>
        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-1 mr-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors"
            >
              <LayoutDashboard size={15} /> Painel
            </Link>
            <Link
              href="/admin/escritorios"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Building2 size={15} /> Escritórios
            </Link>
          </nav>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sair"
              className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
