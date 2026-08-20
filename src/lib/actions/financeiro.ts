"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function createFinanceiro(formData: FormData) {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valorStr = String(formData.get("valor") ?? "").replace(",", ".");
  const vencimento = String(formData.get("vencimento") ?? "");
  const valor = parseFloat(valorStr);
  if (!descricao || !vencimento || !Number.isFinite(valor)) return;

  await prisma.financeiro.create({
    data: {
      descricao,
      valor,
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

  await prisma.financeiro.update({
    where: { id },
    data: { status: status === "PAGO" ? "PENDENTE" : "PAGO" },
  });

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function deleteFinanceiro(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.financeiro.delete({ where: { id } });
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}
