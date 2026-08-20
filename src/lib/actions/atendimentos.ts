"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireEscritorioId } from "@/lib/session";

export async function createAtendimento(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!titulo || !clienteId) return;

  const escritorioId = await requireEscritorioId();

  await prisma.atendimento.create({
    data: {
      titulo,
      clienteId,
      escritorioId,
      descricao: String(formData.get("descricao") ?? "") || null,
      processoId: String(formData.get("processoId") ?? "") || null,
    },
  });

  revalidatePath("/atendimentos");
}

export async function deleteAtendimento(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const escritorioId = await requireEscritorioId();
  await prisma.atendimento.deleteMany({ where: { id, escritorioId } });
  revalidatePath("/atendimentos");
}
