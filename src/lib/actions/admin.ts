"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generatePassword } from "@/lib/generate-password";

export type AdminState =
  | { error: string }
  | { success: true; email: string; password: string }
  | undefined;

async function requireSuperadmin() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Acesso negado.");
  }
  return session;
}

export async function createEscritorio(
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  await requireSuperadmin();

  const escritorioNome = String(formData.get("escritorioNome") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!escritorioNome || !name || !email) {
    return { error: "Preencha todos os campos." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const password = generatePassword();
  const hashed = await bcrypt.hash(password, 10);

  const escritorio = await prisma.escritorio.create({
    data: { nome: escritorioNome },
  });

  await prisma.user.create({
    data: { name, email, password: hashed, escritorioId: escritorio.id },
  });

  revalidatePath("/admin/usuarios");
  return { success: true, email, password };
}

export async function createUserInEscritorio(
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  await requireSuperadmin();

  const escritorioId = String(formData.get("escritorioId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!escritorioId || !name || !email) {
    return { error: "Preencha todos os campos." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const password = generatePassword();
  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, password: hashed, escritorioId },
  });

  revalidatePath("/admin/usuarios");
  return { success: true, email, password };
}

export async function updateEscritorioNome(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!id || !nome) return;

  await prisma.escritorio.update({ where: { id }, data: { nome } });
  revalidatePath("/admin/usuarios");
}

export async function toggleEscritorioAtivo(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  await prisma.escritorio.update({ where: { id }, data: { ativo: !ativo } });
  revalidatePath("/admin/usuarios");
}

export async function deleteEscritorio(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.escritorio.delete({ where: { id } });
  revalidatePath("/admin/usuarios");
}

export async function toggleUserAtivo(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  await prisma.user.update({ where: { id }, data: { ativo: !ativo } });
  revalidatePath("/admin/usuarios");
}

export async function deleteUser(formData: FormData) {
  const session = await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  if (!id || id === session.userId) return;

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/usuarios");
}

export async function resetUserPassword(
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "Usuário não encontrado." };

  const password = generatePassword();
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id }, data: { password: hashed } });

  revalidatePath("/admin/usuarios");
  return { success: true, email: user.email, password };
}
