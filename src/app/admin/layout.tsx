import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";
import AdminNav from "@/components/admin/admin-nav";
import { Scale, LogOut, ShieldCheck } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPERADMIN") redirect("/dashboard");

  return (
    <div className="admin-theme min-h-screen flex bg-[var(--background)]">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white sticky top-0 h-screen">
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-white/10 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
            <Scale size={16} />
          </div>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight">Genesis IA</p>
            <p className="text-[11px] text-white/50">Console administrativo</p>
          </div>
        </div>

        <div className="flex-1 px-3 py-5 overflow-y-auto">
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Gestão
          </p>
          <AdminNav />
        </div>

        <div className="p-3 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="h-8 w-8 shrink-0 rounded-full bg-white/10 ring-1 ring-inset ring-white/15 flex items-center justify-center">
              <ShieldCheck size={15} />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-sm font-medium truncate">{session.name}</p>
              <p className="text-[11px] text-white/50 truncate">
                {session.email}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Sair"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <LogOut size={15} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior no celular (a lateral some abaixo de md) */}
        <header className="md:hidden bg-gradient-to-r from-slate-950 to-indigo-950 text-white px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale size={16} />
              <span className="font-semibold tracking-tight">Genesis IA</span>
              <span className="text-[11px] text-white/50">Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/70 max-w-[140px] truncate">
                {session.name}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  title="Sair"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
                >
                  <LogOut size={15} />
                </button>
              </form>
            </div>
          </div>
          <AdminNav mobile />
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
