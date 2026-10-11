"use client";

import { useEffect, useState } from "react";
import { Newspaper, Sparkles, CalendarClock, MessageSquareText, Check } from "lucide-react";

// Demonstração animada do que o sistema faz sozinho, do DJEN ao WhatsApp.
const ETAPAS = [
  {
    icon: Newspaper,
    rotulo: "Publicação recebida",
    fonte: "DJEN · 08:02",
    texto: "Intimação no processo 1002345-67.2026.8.26.0100 para apresentar contestação.",
  },
  {
    icon: Sparkles,
    rotulo: "IA identificou o prazo",
    fonte: "Genesis IA",
    texto: "Contestação · 15 dias úteis · prioridade alta.",
  },
  {
    icon: CalendarClock,
    rotulo: "Agenda e prazos atualizados",
    fonte: "Responsável: Dra. Maria",
    texto: "Lembretes 3 dias antes, na véspera e no dia.",
  },
  {
    icon: MessageSquareText,
    rotulo: "Alerta no WhatsApp",
    fonte: "Enviado para 2 advogados",
    texto: "⚠️ Contestação vence amanhã · Proc. 1002345-67…",
  },
];

export default function FluxoAoVivo() {
  const [ativo, setAtivo] = useState(0);
  useEffect(() => {
    // Sem animação para quem prefere movimento reduzido.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setAtivo((a) => (a + 1) % (ETAPAS.length + 1)), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-[radial-gradient(closest-side,rgba(109,106,254,0.35),transparent)] blur-2xl" />
      <div className="relative rounded-[22px] border border-white/10 bg-[#0b0d14]/90 backdrop-blur-xl shadow-[0_40px_120px_-20px_rgba(109,106,254,0.45)] overflow-hidden">
        <div className="flex items-center justify-between px-5 h-11 border-b border-white/[0.06] text-[11px] font-mono uppercase tracking-[0.18em] text-white/40">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--lp-signal)] lp-pulse" /> ao vivo
          </span>
          <span>monitoramento automático</span>
        </div>
        <div className="relative p-5 space-y-3">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--lp-indigo)]/15 to-transparent lp-scan" />
          {ETAPAS.map((e, i) => {
            const feito = i < ativo;
            const agora = i === ativo;
            return (
              <div
                key={e.rotulo}
                className={`relative flex gap-4 rounded-2xl border p-4 transition-all duration-500 ${
                  agora
                    ? "border-[var(--lp-indigo)]/60 bg-[var(--lp-indigo)]/[0.08] translate-x-1"
                    : feito
                      ? "border-white/[0.07] bg-white/[0.02]"
                      : "border-white/[0.04] bg-transparent opacity-40"
                }`}
              >
                <div
                  className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                    feito
                      ? "bg-[var(--lp-signal)] text-black"
                      : agora
                        ? "bg-[var(--lp-indigo)] text-white"
                        : "bg-white/5 text-white/50"
                  }`}
                >
                  {feito ? <Check size={18} strokeWidth={3} /> : <e.icon size={18} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white">{e.rotulo}</p>
                    <p className="text-[11px] font-mono text-white/40">{e.fonte}</p>
                  </div>
                  <p className="text-[13px] text-white/60 mt-0.5 leading-snug">{e.texto}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
