"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, registerAction, type AuthState } from "@/lib/actions/auth";
import Link from "next/link";
import AuthShell from "@/components/auth-shell";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  // Vindo da landing ("Teste grátis"), abre direto no cadastro.
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    params.get("cadastro") === "1" ? "register" : "login"
  );
  const [loginState, loginFormAction, loginPending] = useActionState<
    AuthState,
    FormData
  >(loginAction, undefined);
  const [registerState, registerFormAction, registerPending] = useActionState<
    AuthState,
    FormData
  >(registerAction, undefined);

  const state = mode === "login" ? loginState : registerState;
  const pending = mode === "login" ? loginPending : registerPending;
  const action = mode === "login" ? loginFormAction : registerFormAction;

  return (
    <AuthShell>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {mode === "login" ? "Entrar na sua conta" : "Criar conta do escritório"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {mode === "login"
                ? "Acesse o painel do seu escritório."
                : "Leva menos de um minuto."}
            </p>
          </div>

          <form action={action} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do escritório
                  </label>
                  <input
                    name="escritorioNome"
                    type="text"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                    placeholder="Silva Advogados Associados"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome completo
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                    placeholder="Dra. Maria Silva"
                  />
                </div>
              </>
            )}
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
                {mode === "login" && (
                  <Link href="/login/recuperar" className="text-xs font-medium text-indigo-600 hover:underline">
                    Esqueci minha senha
                  </Link>
                )}
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
              {pending
                ? "Aguarde..."
                : mode === "login"
                ? "Entrar"
                : "Criar conta"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            {mode === "login" ? (
              <>
                Ainda não tem conta?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  Entrar
                </button>
              </>
            )}
          </p>
    </AuthShell>
  );
}
