"use client";

import { useActionState } from "react";
import {
  conectarNumeroProprio,
  enviarMensagemTeste,
  type WhatsappState,
} from "@/lib/actions/whatsapp";
import { QrCode, Send } from "lucide-react";

function Aviso({ state }: { state: WhatsappState }) {
  if (!state) return null;
  if ("error" in state)
    return (
      <p className="text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-200 rounded-lg px-3 py-2">
        {state.error}
      </p>
    );
  if ("success" in state)
    return (
      <p className="text-sm text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-200 rounded-lg px-3 py-2">
        {state.success}
      </p>
    );
  return null;
}

export function ConectarNumero({ conectado }: { conectado: boolean }) {
  const [state, action, pending] = useActionState<WhatsappState, FormData>(
    conectarNumeroProprio,
    undefined
  );
  return (
    <div className="space-y-3">
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 px-4 py-2 disabled:opacity-60"
        >
          <QrCode size={15} />
          {pending
            ? "Gerando QR code..."
            : conectado
              ? "Verificar conexão"
              : "Conectar número do escritório"}
        </button>
      </form>
      {state && "qr" in state && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qr} alt="QR code do WhatsApp" className="h-56 w-56" />
          <p className="text-xs text-gray-500 mt-2 max-w-56">
            No celular: WhatsApp › Aparelhos conectados › Conectar aparelho.
            Depois recarregue esta página.
          </p>
        </div>
      )}
      <Aviso state={state} />
    </div>
  );
}

export function EnviarTeste() {
  const [state, action, pending] = useActionState<WhatsappState, FormData>(
    enviarMensagemTeste,
    undefined
  );
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <input
          name="numero"
          required
          placeholder="(11) 98765-4321"
          className="flex-1 min-w-[180px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          <Send size={14} /> {pending ? "Enviando..." : "Enviar teste"}
        </button>
      </div>
      <Aviso state={state} />
    </form>
  );
}
