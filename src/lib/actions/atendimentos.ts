"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function createAtendimento(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!titulo || !clienteId) return;

  await prisma.atendimento.create({
    data: {
      titulo,
      clienteId,
      descricao: String(formData.get("descricao") ?? "") || null,
      processoId: String(formData.get("processoId") ?? "") || null,
    },
  });

  revalidatePath("/atendimentos");
}

export async function deleteAtendimento(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.atendimento.delete({ where: { id } });
  revalidatePath("/atendimentos");
}
