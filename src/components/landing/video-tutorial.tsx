"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

export const VIDEO_TUTORIAL = "/videos/genesis-ia-tutorial.mp4";

// Início de cada parte do vídeo (segundos).
const CAPITULOS = [
  { t: 18, titulo: "Acesso ao sistema" },
  { t: 38, titulo: "Área de trabalho" },
  { t: 71, titulo: "Processos e importação pela OAB" },
  { t: 103, titulo: "Publicações" },
  { t: 124, titulo: "Agenda e prazos" },
  { t: 146, titulo: "Alertas e WhatsApp" },
  { t: 168, titulo: "Criação de peças com IA" },
  { t: 191, titulo: "Clientes e atendimentos" },
  { t: 207, titulo: "Kanban e financeiro" },
  { t: 229, titulo: "Advogados e equipe" },
  { t: 249, titulo: "Painel do administrador" },
];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Vídeo tutorial com capítulos clicáveis. */
export default function VideoTutorial() {
  const video = useRef<HTMLVideoElement>(null);
  const [atual, setAtual] = useState(-1);

  const irPara = (t: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = t;
    v.play().catch(() => {});
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="nx-frame nx-card overflow-hidden rounded-2xl">
        <video
          ref={video}
          src={VIDEO_TUTORIAL}
          poster="/videos/genesis-ia-tutorial.jpg"
          controls
          preload="metadata"
          playsInline
          onTimeUpdate={(e) => {
            const t = e.currentTarget.currentTime;
            setAtual(CAPITULOS.findLastIndex((c) => t >= c.t));
          }}
          className="aspect-video w-full bg-black"
        />
      </div>
      <ol className="nx-card max-h-[420px] space-y-1 overflow-y-auto rounded-2xl p-3">
        <li className="px-2 pb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--nx-mute)]">Capítulos</li>
        {CAPITULOS.map((c, i) => (
          <li key={c.t}>
            <button
              type="button"
              onClick={() => irPara(c.t)}
              className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition ${
                i === atual ? "bg-[var(--nx-cyan)]/10 text-white" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span className="w-10 shrink-0 font-mono text-xs text-[var(--nx-cyan)]">{mmss(c.t)}</span>
              <span className="flex-1">{c.titulo}</span>
              {i === atual && <Play size={12} className="text-[var(--nx-cyan)]" />}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
