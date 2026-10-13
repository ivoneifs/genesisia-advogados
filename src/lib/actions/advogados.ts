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

// O cadastro de advogados e OABs é feito só pelo administrador (painel /admin).
// O escritório pode atualizar os dados de contato, nunca a OAB.

export async function updateAdvogado(id: string, formData: FormData) {
  const escritorioId = await requireEscritorioId();
  const dados = lerFormulario(formData);
  if (!dados) return;

  // A OAB e a UF ficam travadas: só os demais dados podem ser alterados.
  const { nome, cpf, email, telefone, endereco, observacoes } = dados;
  await prisma.advogado.updateMany({
    where: { id, escritorioId },
    data: { nome, cpf, email, telefone, endereco, observacoes, ativo: formData.get("ativo") === "on" },
  });
  revalidatePath("/advogados");
  redirect("/advogados");
}

// Excluir advogado não fica disponível ao escritório: liberaria a trava da OAB.
// A remoção é feita pelo painel admin (removerOabEscritorio).
