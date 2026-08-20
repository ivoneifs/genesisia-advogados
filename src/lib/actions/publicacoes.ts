"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { runWorkflows } from "@/lib/workflows";
import { requireEscritorioId } from "@/lib/session";

export async function createPublicacao(formData: FormData) {
  const conteudo = String(formData.get("conteudo") ?? "").trim();
  if (!conteudo) return;

  const escritorioId = await requireEscritorioId();
  const processoId = String(formData.get("processoId") ?? "") || null;

  await prisma.publicacao.create({
    data: {
      conteudo,
      escritorioId,
      diario: String(formData.get("diario") ?? "") || null,
      dataPublicacao: formData.get("dataPublicacao")
        ? new Date(String(formData.get("dataPublicacao")))
        : null,
      processoId,
    },
  });

  await runWorkflows(escritorioId, "PUBLICACAO_NOVA", { processoId });

  revalidatePath("/publicacoes");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function vincularPublicacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const processoId = String(formData.get("processoId") ?? "");
  if (!id || !processoId) return;

  const escritorioId = await requireEscritorioId();

  await prisma.publicacao.updateMany({
    where: { id, escritorioId },
    data: { processoId, status: "TRATADA" },
  });

  revalidatePath("/publicacoes");
  revalidatePath(`/processos/${processoId}`);
}

export async function toggleTratada(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "NAO_TRATADA");
  if (!id) return;

  const escritorioId = await requireEscritorioId();

  await prisma.publicacao.updateMany({
    where: { id, escritorioId },
    data: { status: status === "TRATADA" ? "NAO_TRATADA" : "TRATADA" },
  });

  revalidatePath("/publicacoes");
}

export async function deletePublicacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const escritorioId = await requireEscritorioId();
  await prisma.publicacao.deleteMany({ where: { id, escritorioId } });
  revalidatePath("/publicacoes");
}
