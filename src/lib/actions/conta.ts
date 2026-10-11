"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { normalizarWhatsapp } from "@/lib/whatsapp";

export type ContaState = { error?: string; success?: string } | undefined;

const SENHA_MINIMA = 8;

export async function alterarMinhaSenha(
  _prev: ContaState,
  formData: FormData
): Promise<ContaState> {
  const session = await getSession();
  if (!session) return { error: "Sessão expirada. Entre novamente." };

  const atual = String(formData.get("atual") ?? "");
  const nova = String(formData.get("nova") ?? "");
  const confirma = String(formData.get("confirma") ?? "");
  if (nova.length < SENHA_MINIMA) {
    return { error: `A nova senha deve ter pelo menos ${SENHA_MINIMA} caracteres.` };
  }
  if (nova !== confirma) return { error: "A confirmação não confere com a nova senha." };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !(await bcrypt.compare(atual, user.password))) {
    return { error: "A senha atual está incorreta." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(nova, 10) },
  });
  return { success: "Senha alterada com sucesso." };
}

export async function salvarMeusDados(
  _prev: ContaState,
  formData: FormData
): Promise<ContaState> {
  const session = await getSession();
  if (!session) return { error: "Sessão expirada. Entre novamente." };

  const name = String(formData.get("name") ?? "").trim();
  const whatsappBruto = String(formData.get("whatsapp") ?? "").trim();
  if (!name) return { error: "Informe seu nome." };
  const whatsapp = whatsappBruto ? normalizarWhatsapp(whatsappBruto) : null;
  if (whatsappBruto && !whatsapp) {
    return { error: "WhatsApp inválido. Use DDD + número, ex.: (11) 98765-4321." };
  }
  await prisma.user.update({ where: { id: session.userId }, data: { name, whatsapp } });
  revalidatePath("/", "layout");
  return { success: "Dados atualizados." };
}
