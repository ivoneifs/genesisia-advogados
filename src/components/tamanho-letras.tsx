"use client";

import { useEffect, useState } from "react";
import { TAMANHOS_FONTE } from "@/lib/marca";

// Tamanho das letras: o padrão vem do escritório (definido pelo admin) e cada
// usuário pode aumentar ou diminuir no próprio navegador (A− / A+).
const CHAVE = "genesis-fonte";
const EVENTO = "genesis-fonte";
const PASSOS = TAMANHOS_FONTE.map((t) => t.valor);

const preferencia = () => {
  const v = Number(localStorage.getItem(CHAVE));
  return PASSOS.includes(v) ? v : null;
};
// O Tailwind usa rem: mudar a fonte do <html> escala o sistema inteiro.
const aplicar = (pct: number) => {
  document.documentElement.style.fontSize = pct === 100 ? "" : `${pct}%`;
};

/** Aplica o tamanho das letras enquanto o usuário está dentro do app. */
export function AplicarTamanhoLetras({ padrao }: { padrao: number }) {
  useEffect(() => {
    const atualizar = () => aplicar(preferencia() ?? padrao);
    atualizar();
    window.addEventListener(EVENTO, atualizar);
    return () => {
      window.removeEventListener(EVENTO, atualizar);
      aplicar(100);
    };
  }, [padrao]);
  return null;
}

/** Botões A− e A+ do topo. */
export function BotoesLetras({ padrao }: { padrao: number }) {
  const [atual, setAtual] = useState(padrao);
  useEffect(() => {
    const atualizar = () => setAtual(preferencia() ?? padrao);
    atualizar();
    window.addEventListener(EVENTO, atualizar);
    return () => window.removeEventListener(EVENTO, atualizar);
  }, [padrao]);

  const mudar = (delta: number) => {
    const i = Math.min(PASSOS.length - 1, Math.max(0, PASSOS.indexOf(atual) + delta));
    localStorage.setItem(CHAVE, String(PASSOS[i]));
    window.dispatchEvent(new Event(EVENTO));
  };
  const botao =
    "h-8 min-w-8 px-1.5 flex items-center justify-center rounded-md text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none";

  return (
    <div className="hidden sm:flex items-center rounded-lg bg-slate-100 p-0.5" title="Tamanho das letras">
      <button type="button" onClick={() => mudar(-1)} disabled={atual === PASSOS[0]} aria-label="Diminuir letras" className={`${botao} text-xs font-semibold`}>
        A−
      </button>
      <button type="button" onClick={() => mudar(1)} disabled={atual === PASSOS[PASSOS.length - 1]} aria-label="Aumentar letras" className={`${botao} text-base font-semibold`}>
        A+
      </button>
    </div>
  );
}
