"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Gavel,
  Users2,
  CalendarDays,
  Wallet,
  Scale,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/processos", label: "Processos", icon: Gavel },
  { href: "/clientes", label: "Clientes", icon: Users2 },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-200">
        <div className="h-8 w-8 rounded-lg bg-[var(--brand)] text-white flex items-center justify-center">
          <Scale size={16} />
        </div>
        <span className="font-semibold text-gray-900 tracking-tight">
          Genesis IA
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
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
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="rounded-lg bg-gradient-to-br from-[var(--brand)] to-teal-600 text-white p-4 text-xs">
          <p className="font-semibold mb-1">IA Genesis</p>
          <p className="text-white/80 leading-relaxed">
            Prazos e tarefas urgentes são destacados automaticamente no seu
            dashboard.
          </p>
        </div>
      </div>
    </aside>
  );
}
