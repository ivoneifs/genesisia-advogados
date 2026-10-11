"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { registrarAtividade } from "@/lib/atividade";
import { exigir } from "@/lib/usuario";
import { getSession, requireEscritorioId } from "@/lib/session";
import { parseInputDateTimeBR } from "@/lib/format";
import { processoValido } from "@/lib/tenant";

export async function createTarefa(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  // datetime-local digitado em horário de Brasília.
  const data = parseInputDateTimeBR(String(formData.get("data") ?? ""));
  if (!titulo || !data) return;

  const session = await getSession();
  const escritorioId = await requireEscritorioId();
  const processoId = await processoValido(
    String(formData.get("processoId") ?? "") || null,
    escritorioId
  );

  await prisma.tarefa.create({
    data: {
      titulo,
      data,
      tipo: String(formData.get("tipo") ?? "TAREFA"),
      descricao: String(formData.get("descricao") ?? "") || null,
      processoId,
      escritorioId,
      responsavelId: session?.userId ?? null,
    },
  });

  await registrarAtividade("CRIOU", "Compromisso", titulo);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  if (processoId) revalidatePath(`/processos/${processoId}`);
}

export async function toggleTarefa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const concluida = formData.get("concluida") === "true";
  if (!id) return;

  const escritorioId = await requireEscritorioId();

  await prisma.tarefa.updateMany({
    where: { id, escritorioId },
    data: { concluida: !concluida },
  });
  const tarefa = await prisma.tarefa.findFirst({ where: { id, escritorioId }, select: { titulo: true } });
  if (tarefa) await registrarAtividade(concluida ? "REABRIU" : "CONCLUIU", "Compromisso", tarefa.titulo, id);

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function deleteTarefa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { escritorioId } = await exigir("excluir");
  const alvo = await prisma.tarefa.findFirst({ where: { id, escritorioId }, select: { titulo: true } });
  await prisma.tarefa.deleteMany({ where: { id, escritorioId } });
  if (alvo) await registrarAtividade("EXCLUIU", "Compromisso", alvo.titulo, id);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}
