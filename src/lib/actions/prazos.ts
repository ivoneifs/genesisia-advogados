"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { registrarAtividade } from "@/lib/atividade";
import { exigir } from "@/lib/usuario";
import { getSession, requireEscritorioId } from "@/lib/session";
import { processoValido } from "@/lib/tenant";
import { runWorkflows } from "@/lib/workflows";

export async function createPrazo(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const processoId = String(formData.get("processoId") ?? "");
  const dataVencimento = String(formData.get("dataVencimento") ?? "");
  if (!titulo || !processoId || !dataVencimento) return;

  const session = await getSession();
  const escritorioId = await requireEscritorioId();

  const processoOk = await processoValido(processoId, escritorioId);
  if (!processoOk) return;

  const prioridade = String(formData.get("prioridade") ?? "NORMAL");
  const vencimento = new Date(dataVencimento);

  await prisma.prazo.create({
    data: {
      titulo,
      processoId: processoOk,
      escritorioId,
      dataVencimento: vencimento,
      descricao: String(formData.get("descricao") ?? "") || null,
      prioridade,
      responsavelId: session?.userId ?? null,
    },
  });

  await registrarAtividade("CRIOU", "Prazo", `${titulo} (vence ${vencimento.toLocaleDateString("pt-BR", { timeZone: "UTC" })})`, processoOk);

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
  const prazo = await prisma.prazo.findFirst({ where: { id, escritorioId }, select: { titulo: true } });
  if (prazo) await registrarAtividade(status === "CUMPRIDO" ? "REABRIU" : "CONCLUIU", "Prazo", prazo.titulo, id);

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
}

export async function deletePrazo(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const processoId = String(formData.get("processoId") ?? "");
  if (!id) return;

  const { escritorioId } = await exigir("excluir");
  const alvo = await prisma.prazo.findFirst({ where: { id, escritorioId }, select: { titulo: true } });
  await prisma.prazo.deleteMany({ where: { id, escritorioId } });
  if (alvo) await registrarAtividade("EXCLUIU", "Prazo", alvo.titulo, id);

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
}
