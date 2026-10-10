"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEscritorioId } from "@/lib/session";
import { UFS } from "@/lib/djen";

const texto = (formData: FormData, campo: string) =>
  String(formData.get(campo) ?? "").trim() || null;

function lerFormulario(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const oab = String(formData.get("oab") ?? "").replace(/\D/g, "").replace(/^0+/, "");
  const uf = String(formData.get("uf") ?? "").toUpperCase();
  if (!nome || !oab || oab.length > 7 || !UFS.includes(uf)) return null;
  return {
    nome,
    oab,
    uf,
    cpf: texto(formData, "cpf"),
    email: texto(formData, "email"),
    telefone: texto(formData, "telefone"),
    endereco: texto(formData, "endereco"),
    observacoes: texto(formData, "observacoes"),
  };
}

export async function createAdvogado(formData: FormData) {
  const escritorioId = await requireEscritorioId();
  const dados = lerFormulario(formData);
  if (!dados) return;

  // Mesma OAB/UF já cadastrada: abre o cadastro existente em vez de duplicar.
  const existente = await prisma.advogado.findUnique({
    where: { escritorioId_oab_uf: { escritorioId, oab: dados.oab, uf: dados.uf } },
    select: { id: true },
  });
  if (existente) redirect(`/advogados/${existente.id}/editar?duplicado=1`);

  await prisma.advogado.create({ data: { ...dados, escritorioId } });
  revalidatePath("/advogados");
  redirect("/advogados");
}

export async function updateAdvogado(id: string, formData: FormData) {
  const escritorioId = await requireEscritorioId();
  const dados = lerFormulario(formData);
  if (!dados) return;

  const conflito = await prisma.advogado.findFirst({
    where: { escritorioId, oab: dados.oab, uf: dados.uf, NOT: { id } },
    select: { id: true },
  });
  if (conflito) redirect(`/advogados/${id}/editar?conflito=1`);

  await prisma.advogado.updateMany({
    where: { id, escritorioId },
    data: { ...dados, ativo: formData.get("ativo") === "on" },
  });
  revalidatePath("/advogados");
  redirect("/advogados");
}

export async function deleteAdvogado(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const escritorioId = await requireEscritorioId();
  await prisma.advogado.deleteMany({ where: { id, escritorioId } });
  revalidatePath("/advogados");
  redirect("/advogados");
}
