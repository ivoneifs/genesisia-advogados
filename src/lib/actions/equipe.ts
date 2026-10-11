"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigir } from "@/lib/usuario";
import { generatePassword } from "@/lib/generate-password";
import { papelValido, PAPEL_LABEL } from "@/lib/papeis";
import { registrarAtividade } from "@/lib/atividade";
import { normalizarWhatsapp } from "@/lib/whatsapp";

export type EquipeState =
  | { error: string }
  | { success: true; email: string; password: string }
  | undefined;

const CAMINHO = "/equipe";

/** Usuário do mesmo escritório (nunca superadmin). */
async function membro(id: string, escritorioId: string) {
  return prisma.user.findFirst({
    where: { id, escritorioId, role: { not: "SUPERADMIN" } },
  });
}

export async function convidarMembro(
  _prev: EquipeState,
  formData: FormData
): Promise<EquipeState> {
  const { escritorioId } = await exigir("gerenciar");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = papelValido(formData.get("role"));
  const whatsappBruto = String(formData.get("whatsapp") ?? "").trim();
  if (!name || !email) return { error: "Informe nome e e-mail." };

  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "Já existe uma conta com este e-mail." };
  }
  const password = generatePassword();
  await prisma.user.create({
    data: {
      name,
      email,
      role,
      escritorioId,
      password: await bcrypt.hash(password, 10),
      whatsapp: whatsappBruto ? normalizarWhatsapp(whatsappBruto) : null,
    },
  });
  await registrarAtividade("CRIOU", "Usuário", `${name} (${PAPEL_LABEL[role]})`);
  revalidatePath(CAMINHO);
  return { success: true, email, password };
}

export async function alterarPapelMembro(formData: FormData) {
  const eu = await exigir("gerenciar");
  const id = String(formData.get("id") ?? "");
  const alvo = await membro(id, eu.escritorioId);
  if (!alvo || alvo.id === eu.id) return; // ninguém rebaixa a si mesmo
  const role = papelValido(formData.get("role"));
  await prisma.user.update({ where: { id }, data: { role } });
  await registrarAtividade("EDITOU", "Usuário", `${alvo.name} agora é ${PAPEL_LABEL[role]}`, id);
  revalidatePath(CAMINHO);
}

export async function alternarAtivoMembro(formData: FormData) {
  const eu = await exigir("gerenciar");
  const id = String(formData.get("id") ?? "");
  const alvo = await membro(id, eu.escritorioId);
  if (!alvo || alvo.id === eu.id) return;
  await prisma.user.update({ where: { id }, data: { ativo: !alvo.ativo } });
  await registrarAtividade(
    "EDITOU",
    "Usuário",
    `${alvo.name} ${alvo.ativo ? "desativado" : "reativado"}`,
    id
  );
  revalidatePath(CAMINHO);
}

export async function redefinirSenhaMembro(
  _prev: EquipeState,
  formData: FormData
): Promise<EquipeState> {
  const eu = await exigir("gerenciar");
  const id = String(formData.get("id") ?? "");
  const alvo = await membro(id, eu.escritorioId);
  if (!alvo) return { error: "Usuário não encontrado." };
  const password = generatePassword();
  await prisma.user.update({
    where: { id },
    data: { password: await bcrypt.hash(password, 10) },
  });
  await registrarAtividade("EDITOU", "Usuário", `Nova senha gerada para ${alvo.name}`, id);
  return { success: true, email: alvo.email, password };
}
