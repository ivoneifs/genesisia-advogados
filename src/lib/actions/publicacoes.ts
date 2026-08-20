"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { runWorkflows } from "@/lib/workflows";

export async function createPublicacao(formData: FormData) {
  const conteudo = String(formData.get("conteudo") ?? "").trim();
  if (!conteudo) return;

  const processoId = String(formData.get("processoId") ?? "") || null;

  await prisma.publicacao.create({
    data: {
      conteudo,
      diario: String(formData.get("diario") ?? "") || null,
      dataPublicacao: formData.get("dataPublicacao")
        ? new Date(String(formData.get("dataPublicacao")))
        : null,
      processoId,
    },
  });

  await runWorkflows("PUBLICACAO_NOVA", { processoId });

  revalidatePath("/publicacoes");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function vincularPublicacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const processoId = String(formData.get("processoId") ?? "");
  if (!id || !processoId) return;

  await prisma.publicacao.update({
    where: { id },
    data: { processoId, status: "TRATADA" },
  });

  revalidatePath("/publicacoes");
  revalidatePath(`/processos/${processoId}`);
}

export async function toggleTratada(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "NAO_TRATADA");
  if (!id) return;

  await prisma.publicacao.update({
    where: { id },
    data: { status: status === "TRATADA" ? "NAO_TRATADA" : "TRATADA" },
  });

  revalidatePath("/publicacoes");
}

export async function deletePublicacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.publicacao.delete({ where: { id } });
  revalidatePath("/publicacoes");
}
