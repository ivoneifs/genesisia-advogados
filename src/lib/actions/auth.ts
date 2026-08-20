"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";

export type AuthState = { error?: string } | undefined;

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { escritorio: true },
  });
  if (!user) {
    return { error: "E-mail ou senha inválidos." };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { error: "E-mail ou senha inválidos." };
  }

  if (!user.ativo) {
    return { error: "Seu acesso está desativado. Fale com o administrador." };
  }
  if (user.escritorio && !user.escritorio.ativo) {
    return { error: "O acesso do seu escritório está desativado." };
  }

  await createSession({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    escritorioId: user.escritorioId,
  });
  redirect(user.role === "SUPERADMIN" ? "/admin/usuarios" : "/dashboard");
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
  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const hashed = await bcrypt.hash(password, 10);

  const escritorio = await prisma.escritorio.create({
    data: { nome: escritorioNome },
  });

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      escritorioId: escritorio.id,
    },
  });

  await createSession({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    escritorioId: user.escritorioId,
  });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
