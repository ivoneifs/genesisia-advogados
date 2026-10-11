import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Instrument_Serif } from "next/font/google";
import { getSession } from "@/lib/session";
import FluxoAoVivo from "@/components/landing/fluxo-ao-vivo";
import Reveal from "@/components/landing/reveal";
import {
  ArrowRight,
  ArrowUpRight,
  Scale,
  Newspaper,
  Sparkles,
  MessageSquareText,
  Kanban,
  Telescope,
  ShieldCheck,
  Wallet,
  Bot,
  Search,
  FileText,
  Check,
  Plus,
  MessageCircle,
} from "lucide-react";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: { absolute: "Genesis IA · Nenhum prazo perdido. Gestão jurídica com IA" },
  description:
    "Publicações do DJEN importadas pela sua OAB, prazos na agenda, alertas no WhatsApp e peças com IA. Teste grátis por 14 dias, sem cartão.",
  openGraph: {
    title: "Genesis IA · Nenhum prazo perdido.",
    description:
      "Publicações, prazos, agenda, peças com IA e alertas no WhatsApp para escritórios de advocacia.",
    type: "website",
    locale: "pt_BR",
  },
};

const CADASTRO = "/login?cadastro=1";

// WhatsApp de vendas (abre a conversa com a mensagem pronta).
const WHATSAPP_VENDAS = `https://wa.me/5574988736885?text=${encodeURIComponent(
  "Olá! Vim pelo site e quero conhecer o Plano Pro do Genesis IA."
)}`;

const RECURSOS = [
  {
    icon: Newspaper,
    titulo: "Publicações chegam sozinhas",
    texto:
      "Informe sua OAB e o Genesis importa processos e intimações do DJEN, a base oficial do CNJ. Nada de garimpar diário.",
    grande: true,
  },
  {
    icon: MessageSquareText,
    titulo: "Alertas no WhatsApp",
    texto:
      "Compromissos, prazos e um resumo diário no WhatsApp de cada advogado. Conecte o número do escritório com um QR code.",
    grande: true,
  },
  {
    icon: Sparkles,
    titulo: "Peças com IA",
    texto: "200 modelos em 10 áreas e geração assistida, com exportação para Word (.docx).",
  },
  {
    icon: Kanban,
    titulo: "Processos em kanban",
    texto: "Veja a carteira inteira por fase e mova casos com um arraste.",
  },
  {
    icon: Telescope,
    titulo: "Pesquisa em 396 fontes",
    texto: "Tribunais, legislação e bases públicas reunidas e filtráveis num só lugar.",
  },
  {
    icon: Bot,
    titulo: "Assistente jurídico",
    texto: "Pergunte, resuma e rascunhe sem sair do sistema.",
  },
  {
    icon: Wallet,
    titulo: "Financeiro do escritório",
    texto: "Honorários, contas a receber e a pagar, com visão só para os sócios.",
    grande: true,
  },
  {
    icon: ShieldCheck,
    titulo: "Equipe sob controle",
    texto: "Perfis de sócio, advogado e estagiário, e histórico de quem fez o quê.",
    grande: true,
  },
];

const PASSOS = [
  {
    n: "01",
    titulo: "Crie a conta do escritório",
    texto: "Leva um minuto. São 14 dias com tudo liberado e sem cartão de crédito.",
  },
  {
    n: "02",
    titulo: "Informe a OAB",
    texto: "Processos e publicações entram automaticamente, já organizados por cliente.",
  },
  {
    n: "03",
    titulo: "Conecte o WhatsApp",
    texto: "A partir daí, cada prazo vira lembrete no celular de quem é responsável.",
  },
];

const FAQ = [
  {
    p: "Preciso instalar alguma coisa?",
    r: "Não. O Genesis IA funciona no navegador, no computador e no celular.",
  },
  {
    p: "De onde vêm as publicações?",
    r: "Do DJEN (Diário de Justiça Eletrônico Nacional), a base pública oficial do CNJ, consultada pela OAB dos advogados do escritório. O andamento de cada processo é conferido também no DataJud.",
  },
  {
    p: "Como funcionam os alertas no WhatsApp?",
    r: "Você conecta o WhatsApp do escritório lendo um QR code dentro do sistema. Os lembretes de compromissos, os prazos (3 dias antes, na véspera e no dia) e o resumo diário vão para o responsável e para os advogados do processo.",
  },
  {
    p: "Quem do escritório vê o quê?",
    r: "Há três perfis: sócio (acesso total, inclusive financeiro), advogado e estagiário (sem exclusões). Cada escritório só enxerga os próprios dados, e todas as alterações ficam registradas.",
  },
  {
    p: "O que acontece depois dos 14 dias?",
    r: "Para continuar, você contrata o Plano Pro. Se não quiser seguir, é só não contratar: não há cobrança automática, porque não pedimos cartão no teste.",
  },
  {
    p: "Como funciona o pagamento do Plano Pro?",
    r: "R$ 4.000 à vista ou 10x de R$ 500, com 12 meses de suporte total incluídos. A partir do 13º mês, o contrato segue com mensalidade de R$ 500.",
  },
];

export default async function Home() {
  const session = await getSession();
  if (session) redirect(session.role === "SUPERADMIN" ? "/admin" : "/dashboard");

  return (
    <div className={`lp lp-grain min-h-screen overflow-x-hidden ${serif.variable}`}>
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <nav className="mt-4 flex h-14 items-center justify-between rounded-2xl border border-white/[0.08] bg-[#05060a]/70 px-4 backdrop-blur-xl">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#6d6afe] to-[#9b5cff] flex items-center justify-center shadow-[0_0_24px_rgba(109,106,254,0.6)]">
                <Scale size={16} className="text-white" />
              </span>
              <span className="font-semibold tracking-tight">Genesis IA</span>
            </Link>
            <div className="hidden md:flex items-center gap-7 text-sm text-[var(--lp-mute)]">
              <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
              <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
              <a href="#planos" className="hover:text-white transition-colors">Planos</a>
              <a href="#seguranca" className="hover:text-white transition-colors">Segurança</a>
              <a href="#faq" className="hover:text-white transition-colors">Dúvidas</a>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:block px-3 py-2 text-sm text-[var(--lp-mute)] hover:text-white">
                Entrar
              </Link>
              <Link
                href={CADASTRO}
                className="group inline-flex items-center gap-1.5 rounded-xl bg-[var(--lp-signal)] px-4 py-2 text-sm font-semibold text-black transition hover:shadow-[0_0_30px_rgba(200,255,77,0.5)]"
              >
                Teste grátis
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-36 pb-24 sm:pt-44">
        <div className="lp-grid absolute inset-0 -z-0" />
        <div className="absolute left-1/2 top-[-280px] -translate-x-1/2 h-[620px] w-[1100px] rounded-full bg-[radial-gradient(closest-side,rgba(109,106,254,0.28),transparent)] blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="lp-rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-[var(--lp-mute)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--lp-signal)] lp-pulse" />
              Gestão jurídica com inteligência artificial
            </p>
            <h1
              className="lp-rise mt-7 font-[family-name:var(--font-serif)] text-[clamp(3rem,7.5vw,6.5rem)] leading-[0.92] tracking-[-0.02em]"
              style={{ animationDelay: "120ms" }}
            >
              Nenhum prazo
              <br />
              <em className="bg-gradient-to-r from-white via-[#b9b7ff] to-[#6d6afe] bg-clip-text text-transparent">
                perdido.
              </em>
              <span className="block text-white/35">Nunca mais.</span>
            </h1>
            <p
              className="lp-rise mt-7 max-w-xl text-lg leading-relaxed text-[var(--lp-mute)]"
              style={{ animationDelay: "240ms" }}
            >
              O Genesis IA busca suas publicações no DJEN, transforma intimações em prazos
              na agenda e avisa a pessoa certa no WhatsApp. Você advoga; o sistema vigia.
            </p>
            <div className="lp-rise mt-10 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: "360ms" }}>
              <Link
                href={CADASTRO}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--lp-signal)] px-7 py-4 text-base font-semibold text-black transition hover:shadow-[0_0_50px_rgba(200,255,77,0.45)]"
              >
                Começar teste grátis de 14 dias
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-6 py-4 text-base text-white/80 transition hover:border-white/25 hover:bg-white/[0.04]"
              >
                Ver como funciona
              </a>
            </div>
            <ul className="lp-rise mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--lp-mute)]" style={{ animationDelay: "480ms" }}>
              {["Sem cartão de crédito", "Tudo liberado no teste", "Funciona no celular"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check size={15} className="text-[var(--lp-signal)]" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-rise" style={{ animationDelay: "300ms" }}>
            <FluxoAoVivo />
          </div>
        </div>
      </section>

      {/* FONTES */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 py-8 sm:px-8 md:flex-row md:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/40">
            Conectado a fontes oficiais e públicas
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-medium text-white/55">
            <span>DJEN · CNJ</span>
            <span>DataJud · CNJ</span>
            <span>WhatsApp</span>
            <span>Microsoft Word (.docx)</span>
            <span>396 fontes de pesquisa</span>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="relative py-28">
        <div className="mx-auto max-w-5xl px-5 text-center sm:px-8">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--lp-signal)]">O problema</p>
            <h2 className="mt-5 font-[family-name:var(--font-serif)] text-[clamp(2.2rem,5vw,4rem)] leading-[1.02]">
              Um prazo perdido custa um cliente.
              <br />
              <em className="text-white/40">E às vezes a reputação inteira.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--lp-mute)]">
              Diários conferidos à mão, planilhas, agendas soltas e lembretes que dependem
              da memória de alguém. O Genesis IA junta tudo e trabalha 24 horas por dia
              para que nada escape.
            </p>
          </Reveal>
        </div>
      </section>

      {/* RECURSOS (bento) */}
      <section id="recursos" className="relative pb-28 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 className="max-w-xl font-[family-name:var(--font-serif)] text-[clamp(2.2rem,4.5vw,3.6rem)] leading-[1.02]">
              O escritório inteiro,
              <em className="text-[#b9b7ff]"> num só lugar.</em>
            </h2>
            <p className="max-w-sm text-[var(--lp-mute)]">
              Do primeiro atendimento ao honorário recebido: processos, agenda, peças,
              documentos, clientes e financeiro conversam entre si.
            </p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RECURSOS.map((r, i) => (
              <Reveal
                key={r.titulo}
                delay={(i % 4) * 80}
                className={r.grande ? "sm:col-span-2" : ""}
              >
                <div
                  className={`group relative h-full overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-7 transition duration-500 hover:border-[var(--lp-indigo)]/50 ${
                    r.grande ? "min-h-[240px]" : "min-h-[220px]"
                  }`}
                >
                  <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--lp-indigo)]/0 blur-3xl transition duration-700 group-hover:bg-[var(--lp-indigo)]/25" />
                  <div className="relative flex h-full flex-col">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#b9b7ff] transition group-hover:bg-[var(--lp-indigo)] group-hover:text-white">
                      <r.icon size={20} />
                    </span>
                    <h3 className={`mt-auto pt-10 font-medium tracking-tight ${r.grande ? "text-2xl" : "text-lg"}`}>
                      {r.titulo}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--lp-mute)]">{r.texto}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="relative overflow-hidden border-y border-white/[0.06] py-28 scroll-mt-24">
        <div className="lp-orbit absolute -right-[300px] top-1/2 h-[700px] w-[700px] -translate-y-1/2 rounded-full border border-dashed border-white/[0.07]" />
        <div className="lp-orbit absolute -right-[180px] top-1/2 h-[460px] w-[460px] -translate-y-1/2 rounded-full border border-white/[0.05]" style={{ animationDirection: "reverse" }} />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--lp-signal)]">Como funciona</p>
            <h2 className="mt-5 max-w-2xl font-[family-name:var(--font-serif)] text-[clamp(2.2rem,4.5vw,3.6rem)] leading-[1.02]">
              Três passos e o sistema
              <em className="text-white/40"> começa a vigiar por você.</em>
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {PASSOS.map((p, i) => (
              <Reveal key={p.n} delay={i * 120}>
                <div className="relative h-full rounded-3xl border border-white/[0.08] bg-[#07080d] p-8">
                  <span className="font-[family-name:var(--font-serif)] text-7xl leading-none text-transparent [-webkit-text-stroke:1px_rgba(185,183,255,0.5)]">
                    {p.n}
                  </span>
                  <h3 className="mt-8 text-xl font-medium">{p.titulo}</h3>
                  <p className="mt-2 text-[var(--lp-mute)]">{p.texto}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DESTAQUE: busca + peças */}
      <section className="py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
          <Reveal>
            <div className="rounded-3xl border border-white/[0.08] bg-[#0b0d14] p-3 shadow-[0_30px_100px_-30px_rgba(109,106,254,0.5)]">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
                <Search size={17} className="text-white/40" />
                <span className="text-white/80">carlos pereira</span>
                <span className="ml-auto rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/40">Ctrl K</span>
              </div>
              <div className="mt-2 space-y-1">
                {[
                  { icon: Kanban, t: "1002345-67.2026.8.26.0100", d: "Processo · Cível · prazo em 3 dias" },
                  { icon: FileText, t: "Contestação — Carlos Pereira.docx", d: "Peça gerada com IA" },
                  { icon: MessageSquareText, t: "Carlos Pereira", d: "Cliente · lembrete de audiência enviado" },
                ].map((x, i) => (
                  <div key={x.t} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${i === 0 ? "bg-[var(--lp-indigo)]/15" : ""}`}>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${i === 0 ? "bg-[var(--lp-indigo)] text-white" : "bg-white/5 text-white/50"}`}>
                      <x.icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{x.t}</p>
                      <p className="truncate text-xs text-white/45">{x.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--lp-signal)]">Velocidade</p>
            <h2 className="mt-5 font-[family-name:var(--font-serif)] text-[clamp(2.2rem,4.5vw,3.6rem)] leading-[1.02]">
              Tudo a um atalho
              <em className="text-[#b9b7ff]"> de distância.</em>
            </h2>
            <p className="mt-6 text-lg text-[var(--lp-mute)]">
              Aperte Ctrl+K e encontre qualquer processo, cliente, contato ou documento em
              segundos. Gere a peça com IA, revise e baixe em Word, sem copiar e colar entre
              sistemas.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "200 modelos de peças em 10 áreas do direito",
                "Exportação para .docx com o advogado que assina",
                "Pesquisa organizada em 396 fontes públicas",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-white/80">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--lp-signal)]/15">
                    <Check size={12} className="text-[var(--lp-signal)]" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* SEGURANÇA */}
      <section id="seguranca" className="scroll-mt-24 pb-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-gradient-to-br from-[#0d0e1a] to-[#05060a] p-8 sm:p-14">
              <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_80%_20%,rgba(109,106,254,0.25),transparent_60%)]" />
              <div className="relative grid gap-12 lg:grid-cols-[1fr_1.2fr]">
                <div>
                  <ShieldCheck size={32} className="text-[var(--lp-signal)]" />
                  <h2 className="mt-6 font-[family-name:var(--font-serif)] text-[clamp(2rem,4vw,3.2rem)] leading-[1.05]">
                    Sigilo profissional
                    <em className="text-white/40"> levado a sério.</em>
                  </h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  {[
                    { t: "Dados isolados", d: "Cada escritório só acessa os próprios processos, clientes e documentos." },
                    { t: "Perfis de acesso", d: "Sócio, advogado e estagiário, cada um com o que precisa ver." },
                    { t: "Histórico completo", d: "Quem criou, alterou ou excluiu cada registro, com data e hora." },
                    { t: "Senhas protegidas", d: "Criptografadas, com proteção contra tentativas repetidas e recuperação pelo WhatsApp." },
                  ].map((x) => (
                    <div key={x.t} className="border-l border-white/10 pl-5">
                      <p className="font-medium">{x.t}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--lp-mute)]">{x.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="scroll-mt-24 pb-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--lp-signal)]">Planos</p>
            <h2 className="mt-5 font-[family-name:var(--font-serif)] text-[clamp(2.2rem,4.5vw,3.6rem)] leading-[1.02]">
              Um investimento,
              <em className="text-white/40"> um ano inteiro de tranquilidade.</em>
            </h2>
          </Reveal>
          <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <div className="flex h-full flex-col rounded-3xl border border-white/[0.08] bg-[#07080d] p-8">
                <p className="text-sm font-medium text-white/70">Teste grátis</p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-[family-name:var(--font-serif)] text-6xl">R$ 0</span>
                  <span className="text-[var(--lp-mute)]">por 14 dias</span>
                </p>
                <p className="mt-3 text-sm text-[var(--lp-mute)]">
                  Use o sistema completo com os seus processos antes de decidir.
                </p>
                <ul className="mt-8 space-y-3 text-sm text-white/80">
                  {["Todos os recursos liberados", "Sem cartão de crédito", "Sem cobrança automática"].map((t) => (
                    <li key={t} className="flex items-center gap-3">
                      <Check size={16} className="text-white/50" /> {t}
                    </li>
                  ))}
                </ul>
                <Link
                  href={CADASTRO}
                  className="mt-auto pt-10"
                >
                  <span className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-6 py-3.5 font-medium text-white transition hover:border-white/30 hover:bg-white/[0.04]">
                    Começar grátis <ArrowRight size={16} />
                  </span>
                </Link>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="relative h-full overflow-hidden rounded-3xl border border-[var(--lp-indigo)]/50 bg-gradient-to-b from-[#12123a] to-[#07080d] p-8 shadow-[0_40px_120px_-30px_rgba(109,106,254,0.6)]">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--lp-indigo)]/30 blur-3xl" />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[#b9b7ff]">Plano Pro</p>
                    <span className="rounded-full bg-[var(--lp-signal)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-black">
                      Completo
                    </span>
                  </div>
                  <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-[family-name:var(--font-serif)] text-6xl sm:text-7xl">R$ 4.000</span>
                    <span className="text-[var(--lp-mute)]">à vista</span>
                  </p>
                  <p className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--lp-signal)]/30 bg-[var(--lp-signal)]/10 px-3 py-1 text-sm text-white">
                    ou <b className="text-[var(--lp-signal)]">10x de R$ 500</b>
                  </p>
                  <p className="mt-3 text-sm text-white/70">
                    À vista, equivale a <b className="text-white">R$ 333 por mês</b> no primeiro ano, com{" "}
                    <b className="text-white">12 meses de suporte total</b> incluídos.
                  </p>
                  <ul className="mt-8 grid gap-3 text-sm text-white/85 sm:grid-cols-2">
                    {[
                      "Publicações do DJEN pela OAB",
                      "Alertas no WhatsApp",
                      "200 peças com IA e exportação .docx",
                      "Pesquisa em 396 fontes",
                      "Agenda, prazos e kanban",
                      "Financeiro do escritório",
                      "Equipe com perfis de acesso",
                      "Suporte total por 12 meses",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--lp-signal)]/15">
                          <Check size={12} className="text-[var(--lp-signal)]" strokeWidth={3} />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/70">
                    Após o primeiro ano: <b className="text-white">R$ 500/mês</b>, conforme contrato.
                  </div>
                  <Link
                    href={CADASTRO}
                    className="group mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--lp-signal)] px-6 py-4 font-semibold text-black transition hover:shadow-[0_0_50px_rgba(200,255,77,0.45)]"
                  >
                    Começar pelo teste grátis
                    <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                  <a
                    href={WHATSAPP_VENDAS}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-6 py-3.5 font-medium text-white transition hover:border-[#25d366]/60 hover:bg-[#25d366]/10"
                  >
                    <MessageCircle size={17} className="text-[#25d366]" />
                    Falar com um especialista
                  </a>
                  <p className="mt-3 text-center text-xs text-[var(--lp-mute)]">
                    Teste 14 dias ou contrate direto pelo WhatsApp.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 pb-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <h2 className="font-[family-name:var(--font-serif)] text-[clamp(2.2rem,4.5vw,3.6rem)] leading-[1.02]">
              Perguntas
              <em className="text-white/40"> frequentes.</em>
            </h2>
            <p className="mt-4 text-[var(--lp-mute)]">Não encontrou o que procurava? Comece o teste e fale com a gente pelo suporte dentro do sistema.</p>
          </Reveal>
          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {FAQ.map((f) => (
              <details key={f.p} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium [&::-webkit-details-marker]:hidden">
                  {f.p}
                  <Plus size={20} className="shrink-0 text-white/40 transition-transform duration-300 group-open:rotate-45 group-open:text-[var(--lp-signal)]" />
                </summary>
                <p className="mt-4 max-w-2xl leading-relaxed text-[var(--lp-mute)]">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-5 pb-24 sm:px-8">
        <Reveal>
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-[var(--lp-signal)] px-8 py-20 text-center text-black sm:py-28">
            <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(black_1px,transparent_1px),linear-gradient(90deg,black_1px,transparent_1px)] [background-size:40px_40px]" />
            <div className="relative">
              <h2 className="mx-auto max-w-3xl font-[family-name:var(--font-serif)] text-[clamp(2.6rem,6vw,5.2rem)] leading-[0.95]">
                Seu próximo prazo já está
                <em> correndo.</em>
              </h2>
              <p className="mx-auto mt-6 max-w-lg text-lg text-black/65">
                Configure hoje e receba amanhã o primeiro resumo do dia no WhatsApp.
              </p>
              <Link
                href={CADASTRO}
                className="group mt-10 inline-flex items-center gap-2 rounded-2xl bg-black px-8 py-4 text-base font-semibold text-white transition hover:scale-[1.02]"
              >
                Começar teste grátis de 14 dias
                <ArrowUpRight size={18} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <p className="mt-4 text-sm text-black/55">
                Sem cartão de crédito ·{" "}
                <a href={WHATSAPP_VENDAS} target="_blank" rel="noopener noreferrer" className="font-medium text-black underline underline-offset-4">
                  ou fale com a gente no WhatsApp
                </a>
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* WhatsApp flutuante */}
      <a
        href={WHATSAPP_VENDAS}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        className="group fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25d366] py-3.5 pl-3.5 pr-3.5 text-black shadow-[0_10px_40px_-5px_rgba(37,211,102,0.6)] transition-all hover:pr-5"
      >
        <MessageCircle size={24} strokeWidth={2.2} />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-[180px]">
          Falar com especialista
        </span>
      </a>

      {/* RODAPÉ */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-white/40 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <Scale size={15} /> Genesis IA · Gestão jurídica inteligente
          </div>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-white">Entrar</Link>
            <Link href={CADASTRO} className="hover:text-white">Criar conta</Link>
          </div>
          <p>© {new Date().getFullYear()} Genesis IA</p>
        </div>
      </footer>
    </div>
  );
}
