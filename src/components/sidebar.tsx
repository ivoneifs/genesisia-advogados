"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  CalendarDays,
  Workflow,
  BookUser,
  MessageCircle,
  Gavel,
  Newspaper,
  Wallet,
  Sparkles,
  Paperclip,
  BarChart3,
  Bell,
  Users2,
  Scale,
  Lock,
  LifeBuoy,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Área de trabalho", icon: LayoutDashboard },
  { href: "/kanban", label: "Gestão kanban", icon: Kanban },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/workflows", label: "Workflows", icon: Workflow, locked: true },
  { href: "/contatos", label: "Contatos", icon: BookUser },
  { href: "/atendimentos", label: "Atendimentos", icon: MessageCircle },
  { href: "/processos", label: "Processos e casos", icon: Gavel },
  { href: "/clientes", label: "Clientes", icon: Users2 },
  { href: "/publicacoes", label: "Publicações", icon: Newspaper },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/pecas", label: "Criação de peças", icon: Sparkles, badge: "IA" },
  { href: "/documentos", label: "Documentos", icon: Paperclip },
  { href: "/indicadores", label: "Indicadores", icon: BarChart3 },
  { href: "/alertas", label: "Alertas", icon: Bell },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-200 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-[var(--brand)] text-white flex items-center justify-center">
          <Scale size={16} />
        </div>
        <span className="font-semibold text-gray-900 tracking-tight">
          Genesis IA
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, locked, badge }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[var(--brand)]/10 text-[var(--brand)]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {badge && (
                <span className="text-[10px] font-semibold bg-[var(--brand)]/10 text-[var(--brand)] px-1.5 py-0.5 rounded">
                  {badge}
                </span>
              )}
              {locked && <Lock size={13} className="text-gray-400 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-3 shrink-0">
        <div className="rounded-lg bg-gradient-to-br from-[var(--brand)] to-teal-600 text-white p-4 text-xs">
          <p className="font-semibold mb-1">IA Genesis</p>
          <p className="text-white/80 leading-relaxed">
            Prazos e tarefas urgentes são destacados automaticamente no seu
            dashboard.
          </p>
        </div>
        <Link
          href="/suporte"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <LifeBuoy size={18} />
          Suporte
        </Link>
      </div>
    </aside>
  );
}
