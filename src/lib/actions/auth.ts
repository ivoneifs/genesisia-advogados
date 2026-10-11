"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { rateLimit, rateLimitReset } from "@/lib/rate-limit";
import { motivoBloqueio, novoTrialExpira } from "@/lib/acesso";

export type AuthState = { error?: string } | undefined;

const SENHA_MINIMA = 8;

async function clientKey(suffix: string): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconhecido";
  return `login:${ip}:${suffix}`;
}

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  // Anti brute-force: por IP+e-mail e por IP.
  const limited =
    !rateLimit(await clientKey(email), 5, 60_000).ok ||
    !rateLimit(await clientKey("all"), 20, 60_000).ok;
  if (limited) {
    return { error: "Muitas tentativas. Aguarde um minuto e tente novamente." };
  }

  // Toda a interação com o banco fica no try; o redirect() de sucesso
  // acontece FORA, porque ele sinaliza via exceção de controle do Next.
  let destino: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { escritorio: true },
    });
    if (!user) return { error: "E-mail ou senha inválidos." };

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return { error: "E-mail ou senha inválidos." };

    if (!user.ativo) {
      return { error: "Seu acesso está desativado. Fale com o administrador." };
    }
    if (user.escritorio) {
      const bloqueio = motivoBloqueio(user.escritorio);
      if (bloqueio) return { error: bloqueio };
    }

    rateLimitReset(await clientKey(email));
    await createSession({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      escritorioId: user.escritorioId,
    });
    destino = user.role === "SUPERADMIN" ? "/admin" : "/dashboard";
  } catch (err) {
    console.error("[login] erro inesperado:", err);
    return {
      error:
        "Não foi possível entrar agora (falha de conexão com o servidor). Tente novamente em instantes.",
    };
  }

  redirect(destino ?? "/dashboard");
}

export async function registerAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const escritorioNome = String(formData.get("escritorioNome") ?? "").trim();

  if (!name || !email || !password || !escritorioNome) {
    return { error: "Preencha todos os campos." };
  }
  if (password.length < SENHA_MINIMA) {
    return { error: `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.` };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { error: "Já existe uma conta com este e-mail." };

    const hashed = await bcrypt.hash(password, 10);

    const escritorio = await prisma.escritorio.create({
      data: {
        nome: escritorioNome,
        plano: "TRIAL",
        status: "TRIAL",
        trialExpira: novoTrialExpira(),
      },
    });

    const user = await prisma.user.create({
      data: { name, email, password: hashed, escritorioId: escritorio.id, role: "SOCIO" },
    });

    await createSession({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      escritorioId: user.escritorioId,
    });
  } catch (err) {
    console.error("[register] erro inesperado:", err);
    return {
      error: "Não foi possível criar a conta agora. Tente novamente em instantes.",
    };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
