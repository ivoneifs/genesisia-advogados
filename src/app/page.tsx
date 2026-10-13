import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Chakra_Petch } from "next/font/google";
import { getSession } from "@/lib/session";
import RadarHud from "@/components/landing/radar-hud";
import Calculadora from "@/components/landing/calculadora";
import Reveal from "@/components/landing/reveal";
import {
  ArrowRight,
  Scale,
  Newspaper,
  Sparkles,
  MessageSquareText,
  Kanban,
  Telescope,
  ShieldCheck,
  Wallet,
  Bot,
  Check,
  X,
  Plus,
  MessageCircle,
  Lock,
  Fingerprint,
  History,
  Users,
  Zap,
} from "lucide-react";

const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: { absolute: "Genesis IA · O escritório que não perde prazo" },
  description:
    "Publicações do DJEN capturadas pela sua OAB, prazos calculados por IA, alertas no WhatsApp e 200 peças prontas. Teste grátis por 7 dias, sem cartão.",
  openGraph: {
    title: "Genesis IA · O escritório que não perde prazo",
    description:
      "Inteligência artificial que vigia publicações, organiza prazos e avisa no WhatsApp. 7 dias grátis.",
    type: "website",
    locale: "pt_BR",
  },
};


// WhatsApp de vendas (abre a conversa com a mensagem pronta).
const whats = (msg: string) => `https://wa.me/5574988259925?text=${encodeURIComponent(msg)}`;
const WHATSAPP_VENDAS = whats("Olá! Vim pelo site e quero conhecer o Genesis IA.");
const WHATSAPP_DEMO = whats("Olá! Quero agendar uma demonstração do Genesis IA para o meu escritório.");
const WHATSAPP_PRO = whats("Olá! Quero contratar o Plano Pro do Genesis IA.");
// O acesso é liberado pela equipe, que cadastra o escritório e a OAB.
const WHATSAPP_TESTE = whats("Olá! Quero liberar os 7 dias grátis do Genesis IA para o meu escritório.");

const MODULOS = [
  {
    icon: Newspaper,
    tag: "DJEN · CNJ",
    titulo: "Publicações chegam sozinhas",
    texto:
      "Informe a OAB e o Genesis importa processos e intimações do Diário de Justiça Eletrônico Nacional. Sem garimpar diário, sem planilha.",
    grande: true,
  },
  {
    icon: MessageSquareText,
    tag: "WhatsApp",
    titulo: "Alerta no celular de quem responde",
    texto:
      "Prazos em D-3, na véspera e no dia, compromissos e um resumo diário, direto no WhatsApp de cada advogado.",
    grande: true,
  },
  { icon: Sparkles, tag: "IA", titulo: "200 peças com IA", texto: "Modelos em 10 áreas, geração assistida e exportação para Word." },
  { icon: Kanban, tag: "Fluxo", titulo: "Processos em kanban", texto: "A carteira inteira por fase. Mova um caso com um arraste." },
  { icon: Telescope, tag: "Pesquisa", titulo: "396 fontes públicas", texto: "Tribunais, legislação e bases oficiais num só painel." },
  { icon: Bot, tag: "Assistente", titulo: "Assistente jurídico", texto: "Pergunte, resuma e rascunhe sem sair do sistema." },
  {
    icon: Wallet,
    tag: "Financeiro",
    titulo: "Honorários sob controle",
    texto: "Contas a receber e a pagar, visíveis só para os sócios.",
    grande: true,
  },
  {
    icon: Users,
    tag: "Equipe",
    titulo: "Cada um vê o que precisa",
    texto: "Perfis de sócio, advogado e estagiário, com histórico de quem fez o quê.",
    grande: true,
  },
];

const PASSOS = [
  { n: "01", t: "Peça seu acesso", d: "Chame no WhatsApp. Liberamos 7 dias com tudo incluído, sem cartão de crédito." },
  { n: "02", t: "Receba com sua OAB", d: "Cadastramos o escritório e a sua OAB. Processos e publicações entram sozinhos." },
  { n: "03", t: "Conecte o WhatsApp", d: "Leia um QR code. Cada prazo vira alerta no celular do responsável." },
];

const ANTES = [
  "Conferir diário por diário, todo dia, à mão",
  "Prazos em planilha e na memória de alguém",
  "Lembrete que depende de um post-it",
  "Peça começando do zero no Word",
  "Ninguém sabe quem alterou o quê",
];
const DEPOIS = [
  "Publicações capturadas automaticamente pela OAB",
  "Prazos calculados pela IA e lançados na agenda",
  "Alerta no WhatsApp do advogado responsável",
  "200 modelos e IA gerando a minuta em segundos",
  "Histórico completo e perfis de acesso",
];

const MARQUEE = [
  "DJEN · CNJ",
  "DataJud · CNJ",
  "Alertas no WhatsApp",
  "200 peças com IA",
  "Exportação .docx",
  "396 fontes de pesquisa",
  "Kanban de processos",
  "Busca Ctrl+K",
  "Financeiro do escritório",
  "Perfis de acesso",
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
    p: "O que acontece depois dos 7 dias?",
    r: "Para continuar, você contrata o Plano Pro. Se não quiser seguir, é só não contratar: não há cobrança automática, porque não pedimos cartão no teste.",
  },
  {
    p: "Como funciona o pagamento do Plano Pro?",
    r: "Pagamento único de R$ 4.000, com 6 meses de suporte total incluídos. Depois desse período, o suporte segue por R$ 300 por mês.",
  },
];

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--nx-cyan)]">
      <span className="h-px w-6 bg-[var(--nx-cyan)]" />
      {children}
    </p>
  );
}

export default async function Home() {
  const session = await getSession();
  if (session) redirect(session.role === "SUPERADMIN" ? "/admin" : "/dashboard");

  return (
    <div className={`nx nx-scanlines min-h-screen overflow-x-hidden ${display.variable}`}>
      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <nav className="mt-3 flex h-14 items-center justify-between rounded-2xl border border-[var(--nx-line)] bg-[#02040a]/75 px-4 backdrop-blur-xl">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--nx-cyan)] to-[var(--nx-blue)] shadow-[0_0_24px_rgba(62,240,255,0.55)]">
                <Scale size={16} className="text-[#001218]" />
              </span>
              <span className="nx-display text-lg font-semibold">
                Genesis<span className="text-[var(--nx-cyan)]"> IA</span>
              </span>
            </Link>
            <div className="hidden items-center gap-7 text-sm text-[var(--nx-mute)] md:flex">
              <a href="#modulos" className="transition-colors hover:text-white">Módulos</a>
              <a href="#como-funciona" className="transition-colors hover:text-white">Como funciona</a>
              <a href="#calculadora" className="transition-colors hover:text-white">Calculadora</a>
              <a href="#planos" className="transition-colors hover:text-white">Planos</a>
              <a href="#faq" className="transition-colors hover:text-white">Dúvidas</a>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden px-3 py-2 text-sm text-[var(--nx-mute)] hover:text-white sm:block">
                Entrar
              </Link>
              <a href={WHATSAPP_TESTE} target="_blank" rel="noopener noreferrer" className="nx-btn inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold">
                7 dias grátis <ArrowRight size={15} />
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden pb-20 pt-32 sm:pt-40">
        <div className="nx-grid absolute inset-0" />
        <div className="absolute left-1/2 top-[-320px] h-[700px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(43,107,255,0.35),transparent)] blur-3xl" />
        <div className="nx-floor absolute inset-x-[-20%] bottom-0 h-[45%] opacity-40" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="min-w-0">
            <p className="lp-rise inline-flex items-center gap-2 rounded-full border border-[var(--nx-cyan)]/30 bg-[var(--nx-cyan)]/[0.06] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--nx-cyan)] sm:text-[11px]">
              <Zap size={12} /> Inteligência artificial para advocacia
            </p>
            <h1
              className="lp-rise nx-display mt-7 text-[clamp(2.5rem,5.2vw,4.7rem)] font-bold leading-[0.98]"
              style={{ animationDelay: "120ms" }}
            >
              Seu escritório <span className="nx-glow">nunca mais</span> perde um prazo.
            </h1>
            <p className="lp-rise mt-7 max-w-xl text-lg leading-relaxed text-[var(--nx-mute)]" style={{ animationDelay: "240ms" }}>
              O Genesis IA vigia o DJEN 24 horas por dia, transforma cada intimação em prazo na agenda e
              avisa o advogado certo no WhatsApp. <span className="text-white">Você advoga. A IA vigia.</span>
            </p>
            <div className="lp-rise mt-10 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "360ms" }}>
              <a href={WHATSAPP_TESTE} target="_blank" rel="noopener noreferrer" className="nx-btn inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-xl px-7 py-4 text-base font-semibold">
                Liberar 7 dias grátis <ArrowRight size={18} />
              </a>
              <a
                href={WHATSAPP_DEMO}
                target="_blank"
                rel="noopener noreferrer"
                className="nx-btn-wa inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-medium"
              >
                <MessageCircle size={18} className="text-[var(--nx-wa)]" /> Agendar demonstração
              </a>
            </div>
            <ul className="lp-rise mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--nx-mute)]" style={{ animationDelay: "480ms" }}>
              {["Sem cartão de crédito", "Pronto em 5 minutos", "Computador e celular"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check size={15} className="text-[var(--nx-cyan)]" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-rise min-w-0" style={{ animationDelay: "300ms" }}>
            <RadarHud />
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="relative border-y border-[var(--nx-line)] bg-[var(--nx-cyan)]/[0.02] py-5">
        <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
          <div className="nx-marquee flex shrink-0 gap-12 pr-12">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="flex items-center gap-12 whitespace-nowrap font-mono text-xs uppercase tracking-[0.2em] text-white/50">
                {m}
                <span className="h-1 w-1 rotate-45 bg-[var(--nx-cyan)]" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="relative py-28">
        <div className="mx-auto max-w-5xl px-5 text-center sm:px-8">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--nx-amber)]">⚠ Alerta de risco</p>
            <h2 className="nx-display mt-5 text-[clamp(2.1rem,5vw,4rem)] font-semibold leading-[1.02]">
              Um prazo perdido custa um cliente.
              <br />
              <span className="text-white/35">Às vezes, a reputação inteira.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--nx-mute)]">
              Diários conferidos à mão, prazos em planilha e lembretes que dependem da memória de alguém.
              Basta um dia corrido para uma intimação passar. O Genesis IA não tem dia corrido.
            </p>
          </Reveal>
        </div>
      </section>

      {/* MÓDULOS */}
      <section id="modulos" className="scroll-mt-24 pb-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Rotulo>Módulos</Rotulo>
              <h2 className="nx-display mt-5 max-w-xl text-[clamp(2.1rem,4.5vw,3.5rem)] font-semibold leading-[1.02]">
                O escritório inteiro <span className="nx-glow">num só painel.</span>
              </h2>
            </div>
            <p className="max-w-sm text-[var(--nx-mute)]">
              Do primeiro atendimento ao honorário recebido. Processos, agenda, peças, clientes e financeiro
              conectados.
            </p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULOS.map((m, i) => (
              <Reveal key={m.titulo} delay={(i % 4) * 80} className={m.grande ? "sm:col-span-2" : ""}>
                <div className="nx-frame nx-card group relative h-full min-h-[230px] overflow-hidden rounded-2xl p-7 transition duration-500 hover:border-[var(--nx-cyan)]/40">
                  <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--nx-cyan)]/0 blur-3xl transition duration-700 group-hover:bg-[var(--nx-cyan)]/20" />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--nx-cyan)]/25 bg-[var(--nx-cyan)]/[0.06] text-[var(--nx-cyan)] transition group-hover:bg-[var(--nx-cyan)] group-hover:text-black">
                        <m.icon size={20} />
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">{m.tag}</span>
                    </div>
                    <h3 className={`nx-display mt-auto pt-10 font-semibold ${m.grande ? "text-2xl" : "text-lg"}`}>{m.titulo}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--nx-mute)]">{m.texto}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="relative scroll-mt-24 overflow-hidden border-y border-[var(--nx-line)] py-28">
        <div className="nx-spin-slow absolute -right-[280px] top-1/2 h-[680px] w-[680px] -translate-y-1/2 rounded-full border border-dashed border-[var(--nx-cyan)]/15" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <Rotulo>Como funciona</Rotulo>
            <h2 className="nx-display mt-5 max-w-2xl text-[clamp(2.1rem,4.5vw,3.5rem)] font-semibold leading-[1.02]">
              Três passos. <span className="text-white/35">Depois, a IA trabalha sozinha.</span>
            </h2>
          </Reveal>
          <div className="relative mt-16 grid gap-6 md:grid-cols-3">
            <div className="absolute left-0 right-0 top-[52px] hidden h-px overflow-hidden bg-[var(--nx-line)] md:block">
              <div className="nx-beam-x absolute inset-y-0 w-1/3" />
            </div>
            {PASSOS.map((p, i) => (
              <Reveal key={p.n} delay={i * 140}>
                <div className="nx-frame nx-card relative h-full rounded-2xl p-8">
                  <span className="nx-display text-6xl font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(62,240,255,0.6)]">
                    {p.n}
                  </span>
                  <h3 className="nx-display mt-8 text-xl font-semibold">{p.t}</h3>
                  <p className="mt-2 text-[var(--nx-mute)]">{p.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12 text-center">
            <a href={WHATSAPP_TESTE} target="_blank" rel="noopener noreferrer" className="nx-btn inline-flex whitespace-nowrap items-center gap-2 rounded-xl px-7 py-4 font-semibold">
              Pedir meu acesso agora <ArrowRight size={18} />
            </a>
          </Reveal>
        </div>
      </section>

      {/* ANTES x DEPOIS */}
      <section className="py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal className="text-center">
            <Rotulo>Antes e depois</Rotulo>
            <h2 className="nx-display mt-5 text-[clamp(2.1rem,4.5vw,3.5rem)] font-semibold leading-[1.02]">
              A rotina do escritório, <span className="nx-glow">reprogramada.</span>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.015] p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/40">Sem o Genesis IA</p>
                <ul className="mt-6 space-y-4">
                  {ANTES.map((t) => (
                    <li key={t} className="flex items-start gap-3 text-white/50">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                        <X size={12} className="text-red-400" strokeWidth={3} />
                      </span>
                      <span className="line-through decoration-white/20">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="nx-frame h-full rounded-2xl border border-[var(--nx-cyan)]/30 bg-gradient-to-b from-[var(--nx-cyan)]/[0.08] to-transparent p-8 shadow-[0_30px_100px_-40px_rgba(62,240,255,0.6)]">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--nx-cyan)]">Com o Genesis IA</p>
                <ul className="mt-6 space-y-4">
                  {DEPOIS.map((t) => (
                    <li key={t} className="flex items-start gap-3 text-white">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--nx-cyan)]/15">
                        <Check size={12} className="text-[var(--nx-cyan)]" strokeWidth={3} />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CALCULADORA */}
      <section id="calculadora" className="scroll-mt-24 pb-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="mb-12 max-w-2xl">
            <Rotulo>Calculadora</Rotulo>
            <h2 className="nx-display mt-5 text-[clamp(2.1rem,4.5vw,3.5rem)] font-semibold leading-[1.02]">
              Quanto custa <span className="text-[var(--nx-amber)]">vigiar prazos à mão?</span>
            </h2>
            <p className="mt-4 text-[var(--nx-mute)]">Ajuste com a realidade do seu escritório.</p>
          </Reveal>
          <Reveal>
            <Calculadora cadastro={WHATSAPP_TESTE} whatsapp={WHATSAPP_VENDAS} />
          </Reveal>
        </div>
      </section>

      {/* SEGURANÇA */}
      <section id="seguranca" className="scroll-mt-24 pb-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="nx-frame relative overflow-hidden rounded-3xl border border-[var(--nx-line)] bg-gradient-to-br from-[#06102a] to-[#02040a] p-8 sm:p-14">
              <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_80%_20%,rgba(43,107,255,0.3),transparent_60%)]" />
              <div className="relative grid gap-12 lg:grid-cols-[1fr_1.2fr]">
                <div>
                  <ShieldCheck size={34} className="text-[var(--nx-cyan)]" />
                  <h2 className="nx-display mt-6 text-[clamp(2rem,4vw,3.1rem)] font-semibold leading-[1.05]">
                    Sigilo profissional <span className="text-white/35">em nível de cofre.</span>
                  </h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  {[
                    { i: Lock, t: "Dados isolados", d: "Cada escritório só acessa os próprios processos, clientes e documentos." },
                    { i: Users, t: "Perfis de acesso", d: "Sócio, advogado e estagiário, cada um com o que precisa ver." },
                    { i: History, t: "Histórico completo", d: "Quem criou, alterou ou excluiu cada registro, com data e hora." },
                    { i: Fingerprint, t: "OAB travada", d: "Cada OAB pertence a um único escritório: ninguém importa os processos de outro advogado." },
                  ].map((x) => (
                    <div key={x.t} className="border-l border-[var(--nx-cyan)]/25 pl-5">
                      <x.i size={18} className="text-[var(--nx-cyan)]" />
                      <p className="mt-3 font-medium">{x.t}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--nx-mute)]">{x.d}</p>
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
            <Rotulo>Planos</Rotulo>
            <h2 className="nx-display mt-5 text-[clamp(2.1rem,4.5vw,3.5rem)] font-semibold leading-[1.02]">
              Pague uma vez. <span className="text-white/35">Pare de perder prazo para sempre.</span>
            </h2>
          </Reveal>
          <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <div className="nx-card flex h-full flex-col rounded-3xl p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">Teste grátis</p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="nx-display text-6xl font-bold">R$ 0</span>
                  <span className="text-[var(--nx-mute)]">por 7 dias</span>
                </p>
                <p className="mt-3 text-sm text-[var(--nx-mute)]">Use com os seus processos reais antes de decidir.</p>
                <ul className="mt-8 space-y-3 text-sm text-white/80">
                  {["Todos os módulos liberados", "Sem cartão de crédito", "Sem cobrança automática"].map((t) => (
                    <li key={t} className="flex items-center gap-3">
                      <Check size={16} className="text-white/50" /> {t}
                    </li>
                  ))}
                </ul>
                <a href={WHATSAPP_TESTE} target="_blank" rel="noopener noreferrer"
                  className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 font-medium transition hover:border-[var(--nx-cyan)]/50 hover:bg-[var(--nx-cyan)]/[0.05]"
                  style={{ marginTop: "2.5rem" }}
                >
                  Começar grátis <ArrowRight size={16} />
                </a>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="nx-frame relative h-full overflow-hidden rounded-3xl border border-[var(--nx-cyan)]/45 bg-gradient-to-b from-[#06213a] to-[#02040a] p-8 shadow-[0_40px_140px_-30px_rgba(62,240,255,0.55)]">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--nx-cyan)]/20 blur-3xl" />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--nx-cyan)]">Plano Pro</p>
                    <span className="rounded-full bg-[var(--nx-amber)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-black">
                      Completo
                    </span>
                  </div>
                  <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="nx-display text-6xl font-bold sm:text-7xl">R$ 4.000</span>
                    <span className="text-[var(--nx-mute)]">pagamento único</span>
                  </p>
                  <p className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--nx-cyan)]/30 bg-[var(--nx-cyan)]/10 px-3 py-1 text-sm">
                    <b className="text-[var(--nx-cyan)]">6 meses de suporte total</b> incluídos
                  </p>
                  <p className="mt-3 text-sm text-white/70">
                    Um único pagamento ativa o escritório inteiro, com suporte total nos primeiros 6 meses.
                  </p>
                  <ul className="mt-8 grid gap-3 text-sm text-white/85 sm:grid-cols-2">
                    {[
                      "Publicações do DJEN pela OAB",
                      "Alertas no WhatsApp",
                      "200 peças com IA e .docx",
                      "Pesquisa em 396 fontes",
                      "Agenda, prazos e kanban",
                      "Financeiro do escritório",
                      "Equipe com perfis de acesso",
                      "Suporte total por 6 meses",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--nx-cyan)]/15">
                          <Check size={12} className="text-[var(--nx-cyan)]" strokeWidth={3} />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/70">
                    Após os 6 meses: suporte por <b className="text-white">R$ 300/mês</b>, conforme contrato.
                  </div>
                  <a
                    href={WHATSAPP_PRO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nx-btn mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 font-semibold"
                  >
                    <MessageCircle size={18} /> Contratar pelo WhatsApp
                  </a>
                  <a href={WHATSAPP_TESTE} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 font-medium transition hover:border-[var(--nx-cyan)]/50"
                  >
                    Ou testar 7 dias grátis antes <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
          <Reveal className="mx-auto mt-10 flex max-w-3xl items-center gap-5 rounded-2xl border border-[var(--nx-line)] bg-white/[0.02] p-6">
            <ShieldCheck size={40} className="shrink-0 text-[var(--nx-amber)]" />
            <p className="text-sm text-white/75">
              <b className="text-white">Risco zero no teste.</b> Não pedimos cartão. Se em 7 dias o Genesis IA não
              provar o valor no seu escritório, você simplesmente não contrata.
            </p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 pb-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <Rotulo>Dúvidas</Rotulo>
            <h2 className="nx-display mt-5 text-[clamp(2.1rem,4.5vw,3.5rem)] font-semibold leading-[1.02]">
              Perguntas <span className="text-white/35">frequentes.</span>
            </h2>
            <p className="mt-4 text-[var(--nx-mute)]">Ficou alguma dúvida? Um especialista responde no WhatsApp.</p>
            <a
              href={WHATSAPP_VENDAS}
              target="_blank"
              rel="noopener noreferrer"
              className="nx-btn-wa mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 font-medium"
            >
              <MessageCircle size={17} className="text-[var(--nx-wa)]" /> (74) 98825-9925
            </a>
          </Reveal>
          <div className="divide-y divide-[var(--nx-line)] border-y border-[var(--nx-line)]">
            {FAQ.map((f) => (
              <details key={f.p} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium [&::-webkit-details-marker]:hidden">
                  {f.p}
                  <Plus size={20} className="shrink-0 text-white/40 transition-transform duration-300 group-open:rotate-45 group-open:text-[var(--nx-cyan)]" />
                </summary>
                <p className="mt-4 max-w-2xl leading-relaxed text-[var(--nx-mute)]">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-5 pb-28 sm:px-8">
        <Reveal>
          <div className="nx-frame relative mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-[var(--nx-cyan)]/30 bg-[#020a18] px-8 py-20 text-center sm:py-28">
            <div className="nx-floor absolute inset-x-[-20%] bottom-0 h-1/2 opacity-60" />
            <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(62,240,255,0.35),transparent)] blur-2xl" />
            <div className="relative">
              <h2 className="nx-display mx-auto max-w-3xl text-[clamp(2.4rem,6vw,5rem)] font-bold leading-[0.95]">
                Seu próximo prazo <span className="nx-glow">já está correndo.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-lg text-lg text-white/65">
                Configure hoje e receba amanhã o primeiro resumo do dia no WhatsApp.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <a href={WHATSAPP_TESTE} target="_blank" rel="noopener noreferrer" className="nx-btn inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-semibold">
                  Liberar 7 dias grátis <ArrowRight size={18} />
                </a>
                <a
                  href={WHATSAPP_DEMO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nx-btn-wa inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-xl px-7 py-4 text-base font-medium"
                >
                  <MessageCircle size={18} className="text-[var(--nx-wa)]" /> Falar com especialista
                </a>
              </div>
              <p className="mt-5 text-sm text-white/45">Sem cartão de crédito · Sem cobrança automática</p>
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
        className="group fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-[var(--nx-wa)] p-3.5 text-black shadow-[0_10px_40px_-5px_rgba(37,211,102,0.7)] transition-all hover:pr-5 sm:bottom-6 sm:right-6"
      >
        <span className="nx-ping absolute inset-0 rounded-full bg-[var(--nx-wa)]/40" />
        <MessageCircle size={24} strokeWidth={2.2} className="relative" />
        <span className="relative max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-[180px]">
          Falar com especialista
        </span>
      </a>

      {/* Barra fixa no celular */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--nx-line)] bg-[#02040a]/90 p-3 backdrop-blur-xl sm:hidden">
        <a href={WHATSAPP_TESTE} target="_blank" rel="noopener noreferrer" className="nx-btn flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold">
          Liberar 7 dias grátis <ArrowRight size={17} />
        </a>
      </div>

      {/* RODAPÉ */}
      <footer className="border-t border-[var(--nx-line)] pb-20 sm:pb-0">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-white/40 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <Scale size={15} /> Genesis IA · Gestão jurídica inteligente
          </div>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-white">Entrar</Link>
            <a href={WHATSAPP_TESTE} target="_blank" rel="noopener noreferrer" className="hover:text-white">Criar conta</a>
            <a href={WHATSAPP_VENDAS} target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp</a>
          </div>
          <p>© {new Date().getFullYear()} Genesis IA</p>
        </div>
      </footer>
    </div>
  );
}
