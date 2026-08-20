"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export async function createContato(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  await prisma.contato.create({
    data: {
      nome,
      tipo: String(formData.get("tipo") ?? "OUTRO"),
      email: String(formData.get("email") ?? "") || null,
      telefone: String(formData.get("telefone") ?? "") || null,
      empresa: String(formData.get("empresa") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
    },
  });

  revalidatePath("/contatos");
  redirect("/contatos");
}

export async function updateContato(id: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  await prisma.contato.update({
    where: { id },
    data: {
      nome,
      tipo: String(formData.get("tipo") ?? "OUTRO"),
      email: String(formData.get("email") ?? "") || null,
      telefone: String(formData.get("telefone") ?? "") || null,
      empresa: String(formData.get("empresa") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
    },
  });

  revalidatePath("/contatos");
  redirect("/contatos");
}

export async function deleteContato(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.contato.delete({ where: { id } });
  revalidatePath("/contatos");
}
