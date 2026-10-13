"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type AuthState } from "@/lib/actions/auth";
import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import { whatsapp } from "@/lib/contato";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

// Pedido de acesso: o administrador cadastra o escritório e a OAB.
const WHATSAPP_ACESSO = whatsapp("Olá! Quero solicitar acesso ao Genesis IA para o meu escritório.");

function Login() {
  // Vindo da landing ("Teste grátis"): mostra como pedir o acesso.
  const params = useSearchParams();
  const pedindoAcesso = params.get("cadastro") === "1";
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, undefined);

  return (
    <AuthShell>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Entrar na sua conta</h2>
            <p className="text-sm text-gray-500 mt-1">Acesse o painel do seu escritório.</p>
          </div>

          {pedindoAcesso && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              O acesso é liberado pela nossa equipe, que cadastra o escritório e a sua OAB.{" "}
              <a href={WHATSAPP_ACESSO} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                Solicite pelo WhatsApp (74) 98825-9925
              </a>{" "}
              e receba o login com 7 dias grátis.
            </div>
          )}

          <form action={action} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                placeholder="voce@escritorio.com.br"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <Link href="/login/recuperar" className="text-xs font-medium text-indigo-600 hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-sm shadow-indigo-500/25 transition-colors text-white font-medium py-2.5 text-sm disabled:opacity-60"
            >
              {pending ? "Aguarde..." : "Entrar"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Ainda não tem acesso?{" "}
            <a href={WHATSAPP_ACESSO} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">
              Solicite pelo WhatsApp
            </a>
          </p>
    </AuthShell>
  );
}
