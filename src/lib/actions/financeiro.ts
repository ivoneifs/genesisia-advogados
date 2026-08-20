"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireEscritorioId } from "@/lib/session";

export async function createFinanceiro(formData: FormData) {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valorStr = String(formData.get("valor") ?? "").replace(",", ".");
  const vencimento = String(formData.get("vencimento") ?? "");
  const valor = parseFloat(valorStr);
  if (!descricao || !vencimento || !Number.isFinite(valor)) return;

  const escritorioId = await requireEscritorioId();

  await prisma.financeiro.create({
    data: {
      descricao,
      valor,
      escritorioId,
      vencimento: new Date(vencimento),
      tipo: String(formData.get("tipo") ?? "RECEITA"),
      status: String(formData.get("status") ?? "PENDENTE"),
      clienteId: String(formData.get("clienteId") ?? "") || null,
      processoId: String(formData.get("processoId") ?? "") || null,
    },
  });

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function toggleFinanceiroStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "PENDENTE");
  if (!id) return;

  const escritorioId = await requireEscritorioId();

  await prisma.financeiro.updateMany({
    where: { id, escritorioId },
    data: { status: status === "PAGO" ? "PENDENTE" : "PAGO" },
  });

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function deleteFinanceiro(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const escritorioId = await requireEscritorioId();
  await prisma.financeiro.deleteMany({ where: { id, escritorioId } });
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}
