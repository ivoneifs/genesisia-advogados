"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireEscritorioId } from "@/lib/session";

export async function createWorkflow(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const gatilho = String(formData.get("gatilho") ?? "");
  if (!nome || !gatilho) return;

  const escritorioId = await requireEscritorioId();
  const diasAntes = parseInt(String(formData.get("diasAntes") ?? "0"), 10);

  await prisma.workflow.create({
    data: {
      nome,
      gatilho,
      escritorioId,
      diasAntes: Number.isFinite(diasAntes) ? diasAntes : 0,
    },
  });

  revalidatePath("/workflows");
}

export async function toggleWorkflow(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  const escritorioId = await requireEscritorioId();
  await prisma.workflow.updateMany({
    where: { id, escritorioId },
    data: { ativo: !ativo },
  });
  revalidatePath("/workflows");
}

export async function deleteWorkflow(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const escritorioId = await requireEscritorioId();
  await prisma.workflow.deleteMany({ where: { id, escritorioId } });
  revalidatePath("/workflows");
}
