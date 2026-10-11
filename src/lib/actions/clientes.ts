"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEscritorioId } from "@/lib/session";

export async function createCliente(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  const escritorioId = await requireEscritorioId();

  await prisma.cliente.create({
    data: {
      nome,
      escritorioId,
      tipo: String(formData.get("tipo") ?? "PF"),
      documento: String(formData.get("documento") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      telefone: String(formData.get("telefone") ?? "") || null,
      endereco: String(formData.get("endereco") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
      receberWhatsapp: formData.get("receberWhatsapp") === "on",
    },
  });

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function updateCliente(id: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  const escritorioId = await requireEscritorioId();

  await prisma.cliente.updateMany({
    where: { id, escritorioId },
    data: {
      nome,
      tipo: String(formData.get("tipo") ?? "PF"),
      documento: String(formData.get("documento") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      telefone: String(formData.get("telefone") ?? "") || null,
      endereco: String(formData.get("endereco") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
      receberWhatsapp: formData.get("receberWhatsapp") === "on",
    },
  });

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function deleteCliente(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const escritorioId = await requireEscritorioId();
  // Processos exigem cliente: exclusão bloqueada enquanto houver vínculo.
  const processos = await prisma.processo.count({ where: { clienteId: id, escritorioId } });
  if (processos > 0) redirect(`/clientes?erro=processos&n=${processos}`);

  await prisma.cliente.deleteMany({ where: { id, escritorioId } });
  revalidatePath("/clientes");
}
