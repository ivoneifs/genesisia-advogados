"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, MessageSquareText } from "lucide-react";
import AuthShell from "@/components/auth-shell";
import {
  solicitarCodigo,
  redefinirComCodigo,
  type RecuperarState,
} from "@/lib/actions/recuperar";

const INPUT =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500";
const BOTAO =
  "w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-sm text-white font-medium py-2.5 text-sm disabled:opacity-60";

function Erro({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{msg}</p>;
}

export default function RecuperarSenhaPage() {
  const [pedido, pedirAction, pedindo] = useActionState<RecuperarState, FormData>(solicitarCodigo, undefined);
  const [troca, trocarAction, trocando] = useActionState<RecuperarState, FormData>(redefinirComCodigo, undefined);

  const estado = troca ?? pedido;
  const etapa = estado?.etapa ?? "email";

  return (
    <AuthShell>
      <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={15} /> Voltar ao login
      </Link>

      {etapa === "pronto" ? (
        <div className="space-y-4">
          <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Senha redefinida</h2>
          <p className="text-sm text-gray-500">Agora é só entrar com a nova senha.</p>
          <Link href="/login" className={`${BOTAO} block text-center`}>Ir para o login</Link>
        </div>
      ) : etapa === "codigo" && estado && "email" in estado ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Digite o código</h2>
            {pedido && "info" in pedido && pedido.info && (
              <p className="text-sm text-gray-500 mt-2 flex gap-2">
                <MessageSquareText size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                {pedido.info}
              </p>
            )}
          </div>
          <form action={trocarAction} className="space-y-4">
            <input type="hidden" name="email" value={estado.email} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required placeholder="000000" className={`${INPUT} tracking-[0.5em] text-center font-mono text-lg`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
              <input name="nova" type="password" minLength={8} required autoComplete="new-password" placeholder="Mínimo de 8 caracteres" className={INPUT} />
            </div>
            <Erro msg={troca && "error" in troca ? troca.error : undefined} />
            <button type="submit" disabled={trocando} className={BOTAO}>
              {trocando ? "Salvando..." : "Redefinir senha"}
            </button>
          </form>
          <p className="text-xs text-gray-500">
            Não recebeu? Confira se o seu WhatsApp está cadastrado em Minha conta, ou
            peça ao sócio do escritório para gerar uma nova senha em Equipe.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Esqueceu a senha?</h2>
            <p className="text-sm text-gray-500 mt-1">
              Informe seu e-mail. Enviaremos um código para o WhatsApp cadastrado na sua conta.
            </p>
          </div>
          <form action={pedirAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input name="email" type="email" required autoFocus placeholder="voce@escritorio.com.br" className={INPUT} />
            </div>
            <Erro msg={pedido && "error" in pedido ? pedido.error : undefined} />
            <button type="submit" disabled={pedindo} className={BOTAO}>
              {pedindo ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        </div>
      )}
    </AuthShell>
  );
}
