"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireEscritorioId } from "@/lib/session";
import { clienteValido, processoValido } from "@/lib/tenant";

export async function createAtendimento(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!titulo || !clienteId) return;

  const escritorioId = await requireEscritorioId();

  // Garante que cliente/processo informados são do próprio escritório.
  const clienteOk = await clienteValido(clienteId, escritorioId);
  if (!clienteOk) return;
  const processoOk = await processoValido(
    String(formData.get("processoId") ?? "") || null,
    escritorioId
  );

  await prisma.atendimento.create({
    data: {
      titulo,
      clienteId: clienteOk,
      escritorioId,
      descricao: String(formData.get("descricao") ?? "") || null,
      processoId: processoOk,
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
