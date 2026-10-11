"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  desconectarNumero,
  enviarMensagemTeste,
  iniciarConexao,
  statusConexao,
  type ConexaoState,
  type WhatsappState,
} from "@/lib/actions/whatsapp";
import type { CodigosConexao, PerfilConectado } from "@/lib/whatsapp";
import { CheckCircle2, Loader2, QrCode, RefreshCw, Send, Smartphone, Unplug } from "lucide-react";

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]";

function fmt(n: string | null | undefined) {
  if (!n) return "";
  const d = n.startsWith("55") ? n.slice(2) : n;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return n;
}

type Fase =
  | { tipo: "form" }
  | { tipo: "aguardando"; numero: string; codigos: CodigosConexao }
  | { tipo: "conectado"; perfil: PerfilConectado | null };

export function ConexaoWhatsapp({
  conectado,
  aguardando,
  perfil,
  numeroSalvo,
}: {
  conectado: boolean;
  aguardando: boolean;
  perfil: PerfilConectado | null;
  numeroSalvo: string | null;
}) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>(
    conectado
      ? { tipo: "conectado", perfil }
      : aguardando && numeroSalvo
        ? { tipo: "aguardando", numero: numeroSalvo, codigos: { qr: null, pairingCode: null } }
        : { tipo: "form" }
  );
  const [state, action, pending] = useActionState<ConexaoState, FormData>(iniciarConexao, undefined);
  const [stateAntes, setStateAntes] = useState<ConexaoState>(undefined);
  const [desconectando, startDesconectar] = useTransition();

  // Resultado do formulário → passa para a fase de aguardar a leitura.
  if (state !== stateAntes) {
    setStateAntes(state);
    if (state?.etapa === "aguardando") {
      setFase({ tipo: "aguardando", numero: state.numero, codigos: state.codigos });
    }
  }

  // Enquanto aguarda: confere a conexão a cada 3s e renova o QR a cada ~20s.
  const aguardandoAgora = fase.tipo === "aguardando";
  useEffect(() => {
    if (!aguardandoAgora) return;
    let vivo = true;
    let tique = 0;
    const checar = async () => {
      const precisaCodigo = tique % 7 === 0;
      tique++;
      const s = await statusConexao(precisaCodigo);
      if (!vivo) return;
      if (s.estado === "open") {
        setFase({ tipo: "conectado", perfil: s.perfil ?? null });
        router.refresh();
      } else if (s.codigos) {
        const codigos = s.codigos;
        setFase((f) => (f.tipo === "aguardando" ? { ...f, codigos } : f));
      }
    };
    checar();
    const id = setInterval(checar, 3000);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [aguardandoAgora, router]);

  function desconectar(confirmar: boolean) {
    if (confirmar && !confirm("Desconectar o WhatsApp do escritório? Os alertas voltam a sair pelo número central, se houver.")) return;
    startDesconectar(async () => {
      await desconectarNumero();
      setFase({ tipo: "form" });
      router.refresh();
    });
  }

  if (fase.tipo === "conectado") {
    const p = fase.perfil;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl bg-emerald-50/60 ring-1 ring-inset ring-emerald-200 p-4">
          {p?.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.foto} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Smartphone size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" /> WhatsApp conectado
            </p>
            <p className="text-sm text-gray-700 truncate">
              {p?.nome ?? "Número do escritório"}
              {p?.numero ? ` · ${fmt(p.numero)}` : numeroSalvo ? ` · ${fmt(numeroSalvo)}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => desconectar(true)}
            disabled={desconectando}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <Unplug size={15} /> {desconectando ? "Desconectando..." : "Desconectar"}
          </button>
        </div>
        <EnviarTeste />
      </div>
    );
  }

  if (fase.tipo === "aguardando") {
    const { qr, pairingCode } = fase.codigos;
    return (
      <div className="grid gap-6 md:grid-cols-[auto_1fr] items-start">
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-3 w-fit mx-auto">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code para conectar o WhatsApp" className="h-60 w-60" />
          ) : (
            <div className="h-60 w-60 flex items-center justify-center text-gray-400">
              <Loader2 size={28} className="animate-spin" />
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Conectar {fmt(fase.numero)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Aguardando a leitura. Esta tela atualiza sozinha.
            </p>
          </div>
          <ol className="text-sm text-gray-700 space-y-1.5 list-decimal list-inside">
            <li>Abra o WhatsApp no celular do escritório.</li>
            <li>Toque em <b>Mais opções ⋮</b> ou <b>Configurações</b> › <b>Aparelhos conectados</b>.</li>
            <li>Toque em <b>Conectar aparelho</b> e aponte a câmera para o QR code.</li>
          </ol>
          {pairingCode && (
            <div className="rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 p-3">
              <p className="text-xs text-gray-500">
                Ou, no mesmo celular: <b>Conectar com número de telefone</b> e digite o código:
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.3em] text-gray-900">
                {pairingCode.slice(0, 4)}-{pairingCode.slice(4)}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => desconectar(false)}
              disabled={desconectando}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <form action={action}>
              <input type="hidden" name="numero" value={fase.numero} />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-slate-100"
              >
                <RefreshCw size={14} className={pending ? "animate-spin" : ""} /> Gerar novo QR
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3 max-w-md">
      <label className="block text-xs font-medium text-gray-600">
        WhatsApp do escritório
      </label>
      <div className="flex gap-2">
        <input
          name="numero"
          required
          inputMode="tel"
          defaultValue={fmt(numeroSalvo)}
          placeholder="(11) 98765-4321"
          className={INPUT}
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 shrink-0 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-medium px-4 py-2 shadow-sm disabled:opacity-60"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
          {pending ? "Gerando..." : "Conectar"}
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Os alertas passam a sair deste número. Use um WhatsApp do escritório (de preferência o Business).
      </p>
      {state?.etapa === "erro" && (
        <p className="text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function EnviarTeste() {
  const [state, action, pending] = useActionState<WhatsappState, FormData>(
    enviarMensagemTeste,
    undefined
  );
  return (
    <form action={action} className="space-y-2">
      <p className="text-sm font-medium text-gray-900">Enviar mensagem de teste</p>
      <div className="flex gap-2 flex-wrap">
        <input
          name="numero"
          required
          inputMode="tel"
          placeholder="Para: (11) 98765-4321"
          className={`${INPUT} flex-1 min-w-[180px]`}
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          <Send size={14} /> {pending ? "Enviando..." : "Enviar teste"}
        </button>
      </div>
      {state && "error" in state && (
        <p className="text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-200 rounded-lg px-3 py-2">{state.success}</p>
      )}
    </form>
  );
}
