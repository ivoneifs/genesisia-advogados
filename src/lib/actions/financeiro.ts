"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { registrarAtividade } from "@/lib/atividade";
import { exigir } from "@/lib/usuario";
import { clienteValido, processoValido } from "@/lib/tenant";

export async function createFinanceiro(formData: FormData) {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valorStr = String(formData.get("valor") ?? "").replace(",", ".");
  const vencimento = String(formData.get("vencimento") ?? "");
  const valor = parseFloat(valorStr);
  if (!descricao || !vencimento || !Number.isFinite(valor)) return;

  const { escritorioId } = await exigir("financeiro");
  const clienteOk = await clienteValido(
    String(formData.get("clienteId") ?? "") || null,
    escritorioId
  );
  const processoOk = await processoValido(
    String(formData.get("processoId") ?? "") || null,
    escritorioId
  );

  await prisma.financeiro.create({
    data: {
      descricao,
      valor,
      escritorioId,
      vencimento: new Date(vencimento),
      tipo: String(formData.get("tipo") ?? "RECEITA"),
      status: String(formData.get("status") ?? "PENDENTE"),
      clienteId: clienteOk,
      processoId: processoOk,
    },
  });
  await registrarAtividade("CRIOU", "Lançamento", `${descricao} (R$ ${valor.toFixed(2).replace(".", ",")})`);

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function toggleFinanceiroStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "PENDENTE");
  if (!id) return;

  const { escritorioId } = await exigir("financeiro");

  await prisma.financeiro.updateMany({
    where: { id, escritorioId },
    data: { status: status === "PAGO" ? "PENDENTE" : "PAGO" },
  });
  const lanc = await prisma.financeiro.findFirst({ where: { id, escritorioId }, select: { descricao: true } });
  if (lanc) await registrarAtividade(status === "PAGO" ? "REABRIU" : "CONCLUIU", "Lançamento", lanc.descricao, id);

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function deleteFinanceiro(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { escritorioId } = await exigir("financeiro");
  const alvo = await prisma.financeiro.findFirst({ where: { id, escritorioId }, select: { descricao: true } });
  await prisma.financeiro.deleteMany({ where: { id, escritorioId } });
  if (alvo) await registrarAtividade("EXCLUIU", "Lançamento", alvo.descricao, id);
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}
