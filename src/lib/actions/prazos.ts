"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function createPrazo(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const processoId = String(formData.get("processoId") ?? "");
  const dataVencimento = String(formData.get("dataVencimento") ?? "");
  if (!titulo || !processoId || !dataVencimento) return;

  const session = await getSession();

  await prisma.prazo.create({
    data: {
      titulo,
      processoId,
      dataVencimento: new Date(dataVencimento),
      descricao: String(formData.get("descricao") ?? "") || null,
      prioridade: String(formData.get("prioridade") ?? "NORMAL"),
      responsavelId: session?.userId ?? null,
    },
  });

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
}

export async function togglePrazoStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const processoId = String(formData.get("processoId") ?? "");
  const status = String(formData.get("status") ?? "PENDENTE");
  if (!id) return;

  await prisma.prazo.update({
    where: { id },
    data: { status: status === "CUMPRIDO" ? "PENDENTE" : "CUMPRIDO" },
  });

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
}

export async function deletePrazo(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const processoId = String(formData.get("processoId") ?? "");
  if (!id) return;

  await prisma.prazo.delete({ where: { id } });

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
}
