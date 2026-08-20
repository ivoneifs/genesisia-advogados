"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession, requireEscritorioId } from "@/lib/session";

export async function createTarefa(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const data = String(formData.get("data") ?? "");
  if (!titulo || !data) return;

  const session = await getSession();
  const escritorioId = await requireEscritorioId();
  const processoId = String(formData.get("processoId") ?? "") || null;

  await prisma.tarefa.create({
    data: {
      titulo,
      data: new Date(data),
      tipo: String(formData.get("tipo") ?? "TAREFA"),
      descricao: String(formData.get("descricao") ?? "") || null,
      processoId,
      escritorioId,
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

  const escritorioId = await requireEscritorioId();

  await prisma.tarefa.updateMany({
    where: { id, escritorioId },
    data: { concluida: !concluida },
  });

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function deleteTarefa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const escritorioId = await requireEscritorioId();
  await prisma.tarefa.deleteMany({ where: { id, escritorioId } });
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}
