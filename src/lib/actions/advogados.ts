"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { registrarAtividade } from "@/lib/atividade";
import { requireEscritorioId } from "@/lib/session";
import { UFS } from "@/lib/djen";
import { oabEmOutroEscritorio, podeCadastrarOab } from "@/lib/oab-trava";

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

  // Trava: só a primeira OAB é cadastrada pelo escritório; as demais, pelo suporte.
  if (!(await podeCadastrarOab(escritorioId))) redirect("/advogados?travada=1");
  if (await oabEmOutroEscritorio(dados.oab, dados.uf, escritorioId)) {
    redirect("/advogados/novo?emuso=1");
  }

  await prisma.advogado.create({ data: { ...dados, escritorioId } });
  await registrarAtividade("CRIOU", "Advogado", `${dados.nome} (OAB ${dados.oab}/${dados.uf})`);
  revalidatePath("/advogados");
  redirect("/advogados");
}

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
