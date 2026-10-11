"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEscritorioId } from "@/lib/session";
import { clienteValido, processoValido } from "@/lib/tenant";
import { parseInputDateTimeBR } from "@/lib/format";
import { tipoValido, statusValido } from "@/lib/atendimentos";

// Lê e valida os campos do formulário; null se faltar o obrigatório ou se
// cliente/processo não forem do escritório.
async function lerFormulario(formData: FormData, escritorioId: string) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!titulo || !clienteId) return null;

  const clienteOk = await clienteValido(clienteId, escritorioId);
  if (!clienteOk) return null;
  const processoOk = await processoValido(
    String(formData.get("processoId") ?? "") || null,
    escritorioId
  );

  return {
    titulo,
    clienteId: clienteOk,
    processoId: processoOk,
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    tipo: tipoValido(String(formData.get("tipo") ?? "")),
    status: statusValido(String(formData.get("status") ?? "")),
    data: parseInputDateTimeBR(String(formData.get("data") ?? "")) ?? new Date(),
  };
}

export async function createAtendimento(formData: FormData) {
  const escritorioId = await requireEscritorioId();
  const dados = await lerFormulario(formData, escritorioId);
  if (!dados) return;

  await prisma.atendimento.create({ data: { ...dados, escritorioId } });

  revalidatePath("/atendimentos");
  redirect("/atendimentos");
}

export async function updateAtendimento(id: string, formData: FormData) {
  const escritorioId = await requireEscritorioId();
  const dados = await lerFormulario(formData, escritorioId);
  if (!dados) return;

  await prisma.atendimento.updateMany({
    where: { id, escritorioId },
    data: dados,
  });

  revalidatePath("/atendimentos");
  redirect("/atendimentos");
}

export async function toggleAtendimentoStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const escritorioId = await requireEscritorioId();
  const atual = await prisma.atendimento.findFirst({
    where: { id, escritorioId },
    select: { status: true },
  });
  if (!atual) return;
  await prisma.atendimento.updateMany({
    where: { id, escritorioId },
    data: { status: atual.status === "ABERTO" ? "CONCLUIDO" : "ABERTO" },
  });
  revalidatePath("/atendimentos");
}

export async function deleteAtendimento(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const escritorioId = await requireEscritorioId();
  await prisma.atendimento.deleteMany({ where: { id, escritorioId } });
  revalidatePath("/atendimentos");
  redirect("/atendimentos");
}
