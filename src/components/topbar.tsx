"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

export default function Topbar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 lg:px-8">
      <div className="md:hidden font-semibold text-gray-900">Genesis IA</div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
          <span className="text-sm font-medium text-gray-700">{name}</span>
        </div>
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
  );
}
