"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  LifeBuoy,
  Bot,
  UserRound,
  Telescope,
  MessageSquareText,
  UsersRound,
  History,
  Menu,
  X,
} from "lucide-react";
import { pode, type Permissao } from "@/lib/papeis";

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  perm?: Permissao;
};

const SECOES: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Principal",
    itens: [
      { href: "/dashboard", label: "Área de trabalho", icon: LayoutDashboard },
      { href: "/assistente", label: "Assistente IA", icon: Bot, badge: "IA" },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/alertas", label: "Alertas", icon: Bell },
    ],
  },
  {
    titulo: "Jurídico",
    itens: [
      { href: "/processos", label: "Processos e casos", icon: Gavel },
      { href: "/kanban", label: "Gestão kanban", icon: Kanban },
      { href: "/publicacoes", label: "Publicações", icon: Newspaper },
      { href: "/pecas", label: "Criação de peças", icon: Sparkles, badge: "IA" },
      { href: "/documentos", label: "Documentos", icon: Paperclip },
      { href: "/pesquisa", label: "Pesquisa", icon: Telescope },
    ],
  },
  {
    titulo: "Relacionamento",
    itens: [
      { href: "/clientes", label: "Clientes", icon: Users2 },
      { href: "/atendimentos", label: "Atendimentos", icon: MessageCircle },
      { href: "/contatos", label: "Contatos", icon: BookUser },
      { href: "/advogados", label: "Advogados", icon: UserRound },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { href: "/financeiro", label: "Financeiro", icon: Wallet, perm: "financeiro" },
      { href: "/indicadores", label: "Indicadores", icon: BarChart3 },
      { href: "/workflows", label: "Workflows", icon: Workflow },
      { href: "/equipe", label: "Equipe", icon: UsersRound, perm: "gerenciar" },
      { href: "/whatsapp", label: "WhatsApp", icon: MessageSquareText, perm: "gerenciar" },
      { href: "/atividades", label: "Atividades", icon: History, perm: "gerenciar" },
    ],
  },
];

/** Marca do escritório no menu (definida pelo admin). */
export type MarcaMenu = { nomeTopo: string; logoUrl: string | null; corMenu: string | null };

function Logo({ marca }: { marca: MarcaMenu }) {
  return (
    <div className="h-16 flex items-center gap-2.5 px-6 border-b border-white/10 shrink-0">
      {marca.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={marca.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain bg-white/10" />
      ) : (
        <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white">
          <Scale size={16} />
        </div>
      )}
      <span className="font-semibold tracking-tight text-white leading-tight line-clamp-2">{marca.nomeTopo}</span>
    </div>
  );
}

// Cor do menu escolhida pelo admin: degradê da cor para um tom mais escuro.
const fundoMenu = (marca: MarcaMenu) =>
  marca.corMenu
    ? { background: `linear-gradient(180deg, ${marca.corMenu}, color-mix(in srgb, ${marca.corMenu} 65%, black))` }
    : undefined;

function Navegacao({ papel, onNavegar }: { papel: string; onNavegar?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {SECOES.map((secao) => {
          const itens = secao.itens.filter((i) => !i.perm || pode(papel, i.perm));
          if (itens.length === 0) return null;
          return (
            <div key={secao.titulo}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                {secao.titulo}
              </p>
              <div className="space-y-0.5">
                {itens.map(({ href, label, icon: Icon, badge }) => {
                  const active = pathname === href || pathname?.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onNavegar}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-gradient-to-r from-indigo-500/25 to-violet-500/10 text-white ring-1 ring-inset ring-white/10"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon size={17} className="shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      {badge && (
                        <span className="text-[10px] font-semibold bg-violet-400/20 text-violet-200 px-1.5 py-0.5 rounded">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 shrink-0">
        <Link
          href="/suporte"
          onClick={onNavegar}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white"
        >
          <LifeBuoy size={17} />
          Suporte
        </Link>
      </div>
    </>
  );
}

const FUNDO = "bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950";

export default function Sidebar({ papel, marca }: { papel: string; marca: MarcaMenu }) {
  return (
    <aside className={`hidden md:flex w-64 shrink-0 flex-col sticky top-0 h-screen ${FUNDO}`} style={fundoMenu(marca)}>
      <Logo marca={marca} />
      <Navegacao papel={papel} />
    </aside>
  );
}

/** Botão de menu + gaveta lateral para telas pequenas. */
export function MenuCelular({ papel, marca }: { papel: string; marca: MarcaMenu }) {
  const [aberto, setAberto] = useState(false);

  // Trava a rolagem do fundo enquanto o menu está aberto (cada link fecha o menu).
  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        className="md:hidden h-9 w-9 -ml-2 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
      >
        <Menu size={20} />
      </button>
      {aberto && createPortal(
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setAberto(false)} />
          <aside className={`relative w-72 max-w-[85vw] h-full flex flex-col shadow-2xl ${FUNDO}`} style={fundoMenu(marca)}>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 h-8 w-8 flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
            >
              <X size={18} />
            </button>
            <Logo marca={marca} />
            <Navegacao papel={papel} onNavegar={() => setAberto(false)} />
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}
