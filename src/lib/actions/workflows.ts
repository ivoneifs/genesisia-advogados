"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function createWorkflow(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const gatilho = String(formData.get("gatilho") ?? "");
  if (!nome || !gatilho) return;

  const diasAntes = parseInt(String(formData.get("diasAntes") ?? "0"), 10);

  await prisma.workflow.create({
    data: {
      nome,
      gatilho,
      diasAntes: Number.isFinite(diasAntes) ? diasAntes : 0,
    },
  });

  revalidatePath("/workflows");
}

export async function toggleWorkflow(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  await prisma.workflow.update({ where: { id }, data: { ativo: !ativo } });
  revalidatePath("/workflows");
}

export async function deleteWorkflow(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.workflow.delete({ where: { id } });
  revalidatePath("/workflows");
}
