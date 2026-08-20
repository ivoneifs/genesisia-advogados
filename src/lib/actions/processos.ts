"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

function parseValor(v: FormDataEntryValue | null) {
  const s = String(v ?? "").replace(",", ".").trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export async function createProcesso(formData: FormData) {
  const numero = String(formData.get("numero") ?? "").trim();
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!numero || !clienteId) return;

  const session = await getSession();

  const processo = await prisma.processo.create({
    data: {
      numero,
      clienteId,
      area: String(formData.get("area") ?? "") || null,
      status: String(formData.get("status") ?? "ATIVO"),
      tribunal: String(formData.get("tribunal") ?? "") || null,
      vara: String(formData.get("vara") ?? "") || null,
      parteContraria: String(formData.get("parteContraria") ?? "") || null,
      valorCausa: parseValor(formData.get("valorCausa")),
      descricao: String(formData.get("descricao") ?? "") || null,
      responsavelId: session?.userId ?? null,
    },
  });

  revalidatePath("/processos");
  redirect(`/processos/${processo.id}`);
}

export async function updateProcesso(id: string, formData: FormData) {
  const numero = String(formData.get("numero") ?? "").trim();
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!numero || !clienteId) return;

  await prisma.processo.update({
    where: { id },
    data: {
      numero,
      clienteId,
      area: String(formData.get("area") ?? "") || null,
      status: String(formData.get("status") ?? "ATIVO"),
      tribunal: String(formData.get("tribunal") ?? "") || null,
      vara: String(formData.get("vara") ?? "") || null,
      parteContraria: String(formData.get("parteContraria") ?? "") || null,
      valorCausa: parseValor(formData.get("valorCausa")),
      descricao: String(formData.get("descricao") ?? "") || null,
    },
  });

  revalidatePath("/processos");
  revalidatePath(`/processos/${id}`);
  redirect(`/processos/${id}`);
}

export async function moveProcessoStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;

  await prisma.processo.update({ where: { id }, data: { status } });

  revalidatePath("/kanban");
  revalidatePath("/processos");
  revalidatePath(`/processos/${id}`);
}

export async function deleteProcesso(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.processo.delete({ where: { id } });
  revalidatePath("/processos");
  redirect("/processos");
}
