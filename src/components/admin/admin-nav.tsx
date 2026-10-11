"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2 } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard, exato: true },
  { href: "/admin/escritorios", label: "Escritórios", icon: Building2 },
];

export default function AdminNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={mobile ? "flex items-center gap-1" : "space-y-1"}>
      {NAV.map(({ href, label, icon: Icon, exato }) => {
        const active = exato
          ? pathname === href
          : pathname === href || pathname?.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
              mobile ? "px-3 py-1.5" : "px-3 py-2.5"
            } ${
              active
                ? "bg-gradient-to-r from-indigo-500/25 to-violet-500/10 text-white ring-1 ring-inset ring-white/10"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={mobile ? 15 : 18} className="shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
