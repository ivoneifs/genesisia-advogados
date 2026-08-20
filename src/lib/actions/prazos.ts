"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { runWorkflows } from "@/lib/workflows";

export async function createPrazo(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const processoId = String(formData.get("processoId") ?? "");
  const dataVencimento = String(formData.get("dataVencimento") ?? "");
  if (!titulo || !processoId || !dataVencimento) return;

  const session = await getSession();
  const prioridade = String(formData.get("prioridade") ?? "NORMAL");
  const vencimento = new Date(dataVencimento);

  await prisma.prazo.create({
    data: {
      titulo,
      processoId,
      dataVencimento: vencimento,
      descricao: String(formData.get("descricao") ?? "") || null,
      prioridade,
      responsavelId: session?.userId ?? null,
    },
  });

  if (prioridade === "ALTA") {
    await runWorkflows("PRAZO_ALTA", {
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
