"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

// Plano Pro: pagamento único.
const PLANO = 4000;
const SEMANAS_MES = 4.33;

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Faixa({
  rotulo,
  valor,
  exibido,
  min,
  max,
  passo,
  onChange,
}: {
  rotulo: string;
  valor: number;
  exibido: string;
  min: number;
  max: number;
  passo: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-4 text-sm text-white/75">
        {rotulo}
        <b className="nx-display text-lg font-semibold text-white">{exibido}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="nx-range mt-3"
      />
    </label>
  );
}

export default function Calculadora({ cadastro, whatsapp }: { cadastro: string; whatsapp: string }) {
  const [advogados, setAdvogados] = useState(3);
  const [horas, setHoras] = useState(5);
  const [valorHora, setValorHora] = useState(250);

  const horasMes = Math.round(advogados * horas * SEMANAS_MES);
  const custoMes = Math.round(horasMes * valorHora);
  // Em quantos dias o trabalho manual evitado paga o plano.
  const diasRetorno = Math.max(1, Math.ceil((PLANO / custoMes) * 30));

  return (
    <div className="nx-frame nx-card grid overflow-hidden rounded-3xl lg:grid-cols-2">
      <div className="space-y-8 p-7 sm:p-10">
        <Faixa
          rotulo="Advogados no escritório"
          valor={advogados}
          exibido={String(advogados)}
          min={1}
          max={30}
          passo={1}
          onChange={setAdvogados}
        />
        <Faixa
          rotulo="Horas por semana, por advogado, conferindo diários e prazos"
          valor={horas}
          exibido={`${horas} h`}
          min={1}
          max={20}
          passo={1}
          onChange={setHoras}
        />
        <Faixa
          rotulo="Quanto vale uma hora do seu trabalho"
          valor={valorHora}
          exibido={brl(valorHora)}
          min={100}
          max={1500}
          passo={50}
          onChange={setValorHora}
        />
        <p className="text-xs leading-relaxed text-[var(--nx-mute)]">
          Estimativa feita só com os números que você informou. Não inclui o custo de um prazo perdido.
        </p>
      </div>

      <div className="relative flex flex-col justify-between gap-8 border-t border-[var(--nx-line)] bg-[radial-gradient(circle_at_70%_0%,rgba(62,240,255,0.14),transparent_60%)] p-7 sm:p-10 lg:border-l lg:border-t-0">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--nx-amber)]">
            Custo do trabalho manual
          </p>
          <p className="nx-display mt-3 text-[clamp(2.6rem,6vw,4.2rem)] font-semibold leading-none text-white">
            {brl(custoMes)}
            <span className="ml-2 text-base font-normal text-[var(--nx-mute)]">/mês</span>
          </p>
          <p className="mt-3 text-white/70">
            São <b className="text-white">{horasMes} horas por mês</b> do escritório conferindo publicações e
            montando agenda, tempo que o Genesis IA faz sozinho.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--nx-cyan)]/30 bg-[var(--nx-cyan)]/[0.06] p-5">
          <p className="text-sm text-white/70">Genesis IA, Plano Pro: {brl(PLANO)} em pagamento único</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="text-sm text-white/80">o investimento se paga em</span>
            <span className="nx-display text-3xl font-semibold text-[var(--nx-cyan)]">
              {diasRetorno} {diasRetorno === 1 ? "dia" : "dias"}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a href={cadastro} target="_blank" rel="noopener noreferrer" className="nx-btn inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold">
            Liberar 7 dias grátis <ArrowRight size={17} />
          </a>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="nx-btn-wa inline-flex flex-1 items-center justify-center rounded-xl px-6 py-3.5 font-medium"
          >
            Falar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
