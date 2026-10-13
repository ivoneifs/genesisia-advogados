"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, ChevronDown, UserCog } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { MenuCelular, type MarcaMenu } from "@/components/sidebar";
import { BotoesLetras } from "@/components/tamanho-letras";
import BuscaGlobal from "@/components/busca-global";
import { PAPEL_LABEL } from "@/lib/papeis";

export default function Topbar({
  name,
  papel,
  escritorioNome,
  marca,
  tamanhoFonte,
}: {
  name: string;
  papel: string;
  escritorioNome?: string;
  marca: MarcaMenu;
  tamanhoFonte: number;
}) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    if (!menu) return;
    const fechar = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [menu]);

  return (
    <header className="h-16 sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur flex items-center justify-between gap-3 px-4 lg:px-8">
      <div className="flex items-center gap-2 min-w-0">
        <MenuCelular papel={papel} marca={marca} />
        {escritorioNome && (
          <span className="hidden sm:block text-sm font-medium text-gray-500 truncate">
            {escritorioNome}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <BuscaGlobal />
        <BotoesLetras padrao={tamanhoFonte} />
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-slate-100"
          >
            <div className="h-8 w-8 rounded-full bg-[var(--brand)] text-white flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
            <span className="hidden sm:block text-left leading-tight">
              <span className="block text-sm font-medium text-gray-800 max-w-[160px] truncate">{name}</span>
              <span className="block text-[11px] text-gray-500">{PAPEL_LABEL[papel] ?? papel}</span>
            </span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl ring-1 ring-slate-200 p-1.5 z-40">
              <div className="px-3 py-2 sm:hidden">
                <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                <p className="text-xs text-gray-500">{PAPEL_LABEL[papel] ?? papel}</p>
              </div>
              <Link
                href="/conta"
                onClick={() => setMenu(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-slate-100"
              >
                <UserCog size={15} /> Minha conta
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={15} /> Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
