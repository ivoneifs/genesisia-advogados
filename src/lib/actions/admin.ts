"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generatePassword } from "@/lib/generate-password";
import { novoTrialExpira } from "@/lib/acesso";

export type AdminState =
  | { error: string }
  | { success: true; email: string; password: string }
  | undefined;

const PLANOS = ["TRIAL", "BASICO", "PRO"];
const STATUSES = ["TRIAL", "ATIVO", "SUSPENSO"];

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
  const plano = String(formData.get("plano") ?? "BASICO");
  const status = String(formData.get("status") ?? "ATIVO");

  if (!escritorioNome || !name || !email) {
    return { error: "Preencha todos os campos." };
  }
  if (!PLANOS.includes(plano) || !STATUSES.includes(status)) {
    return { error: "Plano ou status inválido." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const password = generatePassword();
  const hashed = await bcrypt.hash(password, 10);

  const escritorio = await prisma.escritorio.create({
    data: {
      nome: escritorioNome,
      plano,
      status,
      trialExpira: status === "TRIAL" ? novoTrialExpira() : null,
    },
  });

  await prisma.user.create({
    data: { name, email, password: hashed, escritorioId: escritorio.id },
  });

  revalidatePath("/admin/escritorios");
  revalidatePath("/admin");
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

  const escritorio = await prisma.escritorio.findUnique({
    where: { id: escritorioId },
    select: { id: true },
  });
  if (!escritorio) return { error: "Escritório não encontrado." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const password = generatePassword();
  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, password: hashed, escritorioId },
  });

  revalidatePath("/admin/escritorios");
  return { success: true, email, password };
}

export async function updateEscritorioNome(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!id || !nome) return;

  await prisma.escritorio.update({ where: { id }, data: { nome } });
  revalidatePath("/admin/escritorios");
}

export async function updateEscritorioPlano(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const plano = String(formData.get("plano") ?? "");
  const status = String(formData.get("status") ?? "");
  const trialStr = String(formData.get("trialExpira") ?? "").trim();
  if (!id || !PLANOS.includes(plano) || !STATUSES.includes(status)) return;

  let trialExpira: Date | null = null;
  if (status === "TRIAL") {
    trialExpira = trialStr ? new Date(trialStr) : novoTrialExpira();
  }

  await prisma.escritorio.update({
    where: { id },
    data: {
      plano,
      status,
      trialExpira,
      // mantém o liga/desliga coerente com o status comercial
      ativo: status !== "SUSPENSO",
    },
  });
  revalidatePath("/admin/escritorios");
  revalidatePath("/admin");
}

export async function toggleEscritorioAtivo(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  await prisma.escritorio.update({
    where: { id },
    data: { ativo: !ativo, status: !ativo ? "ATIVO" : "SUSPENSO" },
  });
  revalidatePath("/admin/escritorios");
  revalidatePath("/admin");
}

export async function deleteEscritorio(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.escritorio.delete({ where: { id } });
  revalidatePath("/admin/escritorios");
  revalidatePath("/admin");
}

export async function toggleUserAtivo(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  await prisma.user.update({ where: { id }, data: { ativo: !ativo } });
  revalidatePath("/admin/escritorios");
}

export async function deleteUser(formData: FormData) {
  const session = await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  if (!id || id === session.userId) return;

  // Nunca permitir excluir outro SUPERADMIN por esta via.
  const alvo = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!alvo || alvo.role === "SUPERADMIN") return;

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/escritorios");
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

  revalidatePath("/admin/escritorios");
  return { success: true, email: user.email, password };
}
