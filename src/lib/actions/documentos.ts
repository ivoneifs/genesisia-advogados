"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function createDocumento(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;

  await prisma.documento.create({
    data: {
      titulo,
      tipo: String(formData.get("tipo") ?? "OUTRO"),
      observacoes: String(formData.get("observacoes") ?? "") || null,
      processoId: String(formData.get("processoId") ?? "") || null,
      clienteId: String(formData.get("clienteId") ?? "") || null,
    },
  });

  revalidatePath("/documentos");
}

export async function deleteDocumento(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.documento.delete({ where: { id } });
  revalidatePath("/documentos");
}
