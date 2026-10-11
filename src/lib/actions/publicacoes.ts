"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { registrarAtividade } from "@/lib/atividade";
import { exigir } from "@/lib/usuario";
import { runWorkflows } from "@/lib/workflows";
import { requireEscritorioId } from "@/lib/session";
import { processoValido } from "@/lib/tenant";

const soDigitos = (s: string) => s.replace(/\D/g, "");

/** Acha o processo do escritório pelo id ou pelo número digitado (com ou sem máscara). */
async function resolverProcesso(formData: FormData, escritorioId: string) {
  const id = String(formData.get("processoId") ?? "");
  if (id) return processoValido(id, escritorioId);

  const numero = soDigitos(String(formData.get("processoNumero") ?? ""));
  if (!numero) return null;
  const candidatos = await prisma.processo.findMany({
    where: { escritorioId, numero: { contains: numero.slice(0, 7) } },
    select: { id: true, numero: true },
  });
  return candidatos.find((p) => soDigitos(p.numero) === numero)?.id ?? null;
}

function voltar(formData: FormData) {
  const destino = String(formData.get("voltar") ?? "");
  return destino.startsWith("/publicacoes") ? destino : "/publicacoes";
}

export async function createPublicacao(formData: FormData) {
  const conteudo = String(formData.get("conteudo") ?? "").trim();
  if (!conteudo) return;

  const escritorioId = await requireEscritorioId();
  const processoId = await resolverProcesso(formData, escritorioId);
  const data = String(formData.get("dataPublicacao") ?? "");

  await prisma.publicacao.create({
    data: {
      conteudo,
      escritorioId,
      diario: String(formData.get("diario") ?? "").trim() || null,
      // Data "só dia": meia-noite UTC (ver lib/format.ts).
      dataPublicacao: /^\d{4}-\d{2}-\d{2}$/.test(data) ? new Date(`${data}T00:00:00Z`) : null,
      processoId,
    },
  });

  await runWorkflows(escritorioId, "PUBLICACAO_NOVA", { processoId });

  revalidatePath("/publicacoes");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function updatePublicacao(id: string, formData: FormData) {
  const conteudo = String(formData.get("conteudo") ?? "").trim();
  if (!conteudo) return;

  const escritorioId = await requireEscritorioId();
  const numeroDigitado = String(formData.get("processoNumero") ?? "").trim();
  const processoId = numeroDigitado ? await resolverProcesso(formData, escritorioId) : null;
  if (numeroDigitado && !processoId) redirect(`/publicacoes/${id}/editar?erro=processo`);
  const data = String(formData.get("dataPublicacao") ?? "");
  const status = String(formData.get("status") ?? "") === "TRATADA" ? "TRATADA" : "NAO_TRATADA";

  await prisma.publicacao.updateMany({
    where: { id, escritorioId },
    data: {
      conteudo,
      diario: String(formData.get("diario") ?? "").trim() || null,
      dataPublicacao: /^\d{4}-\d{2}-\d{2}$/.test(data) ? new Date(`${data}T00:00:00Z`) : null,
      processoId,
      status,
    },
  });

  revalidatePath("/publicacoes");
  if (processoId) revalidatePath(`/processos/${processoId}`);
  redirect(`/publicacoes/${id}`);
}

export async function vincularPublicacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const escritorioId = await requireEscritorioId();
  const processoId = await resolverProcesso(formData, escritorioId);
  if (!processoId) {
    const destino = voltar(formData);
    redirect(`${destino}${destino.includes("?") ? "&" : "?"}erro=processo`);
  }

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

/** Marca como tratadas as publicações listadas na página atual. */
export async function marcarPaginaTratada(formData: FormData) {
  const ids = formData.getAll("ids").map(String).filter(Boolean).slice(0, 200);
  if (ids.length === 0) return;
  const escritorioId = await requireEscritorioId();
  await prisma.publicacao.updateMany({
    where: { id: { in: ids }, escritorioId },
    data: { status: "TRATADA" },
  });
  revalidatePath("/publicacoes");
}

export async function deletePublicacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { escritorioId } = await exigir("excluir");
  const alvo = await prisma.publicacao.findFirst({ where: { id, escritorioId }, select: { diario: true } });
  await prisma.publicacao.deleteMany({ where: { id, escritorioId } });
  if (alvo) await registrarAtividade("EXCLUIU", "Publicação", `Publicação${alvo.diario ? ` (${alvo.diario})` : ""}`, id);
  revalidatePath("/publicacoes");
  if (formData.get("voltar")) redirect(voltar(formData));
}
