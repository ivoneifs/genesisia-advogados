"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction, type AuthState } from "@/lib/actions/auth";
import { Scale, Sparkles, CalendarClock, Users2, Wallet } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
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
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[var(--brand-dark)] via-[var(--brand)] to-teal-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_60%,white,transparent_30%)]" />
        <div className="relative flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur">
            <Scale size={22} />
          </div>
          <span className="text-xl font-semibold tracking-tight">Genesis IA</span>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-semibold leading-tight max-w-md">
            A gestão jurídica que acompanha o ritmo da sua advocacia.
          </h1>
          <p className="text-white/80 max-w-md">
            Processos, prazos, agenda, clientes e financeiro em um só lugar —
            com destaque inteligente do que exige sua atenção agora.
          </p>
          <ul className="space-y-3 pt-2">
            <li className="flex items-center gap-3 text-white/90">
              <CalendarClock size={18} /> Prazos e audiências sem risco de perda
            </li>
            <li className="flex items-center gap-3 text-white/90">
              <Users2 size={18} /> Clientes e processos centralizados
            </li>
            <li className="flex items-center gap-3 text-white/90">
              <Wallet size={18} /> Honorários e financeiro sob controle
            </li>
            <li className="flex items-center gap-3 text-white/90">
              <Sparkles size={18} /> Painel inteligente prioriza o que importa
            </li>
          </ul>
        </div>

        <p className="relative text-sm text-white/60">
          © {new Date().getFullYear()} Genesis IA — gestão jurídica inteligente.
        </p>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-[var(--brand)] text-white flex items-center justify-center">
              <Scale size={18} />
            </div>
            <span className="text-lg font-semibold">Genesis IA</span>
          </div>

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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                placeholder="voce@escritorio.com.br"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
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
              className="w-full rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors text-white font-medium py-2.5 text-sm disabled:opacity-60"
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
                  className="text-[var(--brand)] font-medium hover:underline"
                >
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-[var(--brand)] font-medium hover:underline"
                >
                  Entrar
                </button>
              </>
            )}
          </p>

          <div className="rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-xs text-gray-500">
            <span className="font-medium text-gray-600">Demo:</span>{" "}
            demo@genesisia.com.br / demo123
          </div>
        </div>
      </div>
    </div>
  );
}
