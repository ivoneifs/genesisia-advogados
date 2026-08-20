"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession, requireEscritorioId } from "@/lib/session";
import { runWorkflows } from "@/lib/workflows";

export async function createPrazo(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const processoId = String(formData.get("processoId") ?? "");
  const dataVencimento = String(formData.get("dataVencimento") ?? "");
  if (!titulo || !processoId || !dataVencimento) return;

  const session = await getSession();
  const escritorioId = await requireEscritorioId();
  const prioridade = String(formData.get("prioridade") ?? "NORMAL");
  const vencimento = new Date(dataVencimento);

  await prisma.prazo.create({
    data: {
      titulo,
      processoId,
      escritorioId,
      dataVencimento: vencimento,
      descricao: String(formData.get("descricao") ?? "") || null,
      prioridade,
      responsavelId: session?.userId ?? null,
    },
  });

  if (prioridade === "ALTA") {
    await runWorkflows(escritorioId, "PRAZO_ALTA", {
      processoId,
      prazoTitulo: titulo,
      prazoVencimento: vencimento,
    });
  }

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
}

export async function togglePrazoStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const processoId = String(formData.get("processoId") ?? "");
  const status = String(formData.get("status") ?? "PENDENTE");
  if (!id) return;

  const escritorioId = await requireEscritorioId();

  await prisma.prazo.updateMany({
    where: { id, escritorioId },
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

  const escritorioId = await requireEscritorioId();
  await prisma.prazo.deleteMany({ where: { id, escritorioId } });

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
}
