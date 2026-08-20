"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function createTarefa(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const data = String(formData.get("data") ?? "");
  if (!titulo || !data) return;

  const session = await getSession();
  const processoId = String(formData.get("processoId") ?? "") || null;

  await prisma.tarefa.create({
    data: {
      titulo,
      data: new Date(data),
      tipo: String(formData.get("tipo") ?? "TAREFA"),
      descricao: String(formData.get("descricao") ?? "") || null,
      processoId,
      responsavelId: session?.userId ?? null,
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  if (processoId) revalidatePath(`/processos/${processoId}`);
}

export async function toggleTarefa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const concluida = formData.get("concluida") === "true";
  if (!id) return;

  await prisma.tarefa.update({
    where: { id },
    data: { concluida: !concluida },
  });

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function deleteTarefa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.tarefa.delete({ where: { id } });
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}
