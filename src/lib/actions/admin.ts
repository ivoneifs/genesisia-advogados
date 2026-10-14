"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generatePassword } from "@/lib/generate-password";
import { novoTrialExpira } from "@/lib/acesso";
import { papelValido } from "@/lib/papeis";
import { UFS } from "@/lib/djen";
import { MSG_OAB_EM_USO, oabEmOutroEscritorio } from "@/lib/oab-trava";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { corValida, fonteValida, type TipoImagem } from "@/lib/marca";
import { MARCA_DIR, LIMITE_IMAGEM, arquivoMarca, tipoDaImagem } from "@/lib/marca-arquivos";

export type AdminState =
  | { error: string }
  | { success: true; email: string; password: string }
  | undefined;

const PLANOS = ["TRIAL", "BASICO", "PRO"];
const STATUSES = ["TRIAL", "ATIVO", "SUSPENSO"];

const textoOuNull = (formData: FormData, campo: string) =>
  String(formData.get(campo) ?? "").trim() || null;

/** Dados do advogado digitados pelo administrador (OAB, UF e contato). */
function lerAdvogado(formData: FormData, prefixo = "") {
  const campo = (c: string) => `${prefixo}${c}`;
  const nome = String(formData.get(campo("nome")) ?? "").trim();
  const oab = String(formData.get(campo("oab")) ?? "").replace(/\D/g, "").replace(/^0+/, "");
  const uf = String(formData.get(campo("uf")) ?? "").toUpperCase();
  return {
    nome,
    oab,
    uf,
    valido: !!nome && !!oab && oab.length <= 7 && UFS.includes(uf),
    contato: {
      cpf: textoOuNull(formData, campo("cpf")),
      email: textoOuNull(formData, campo("emailAdv")),
      telefone: textoOuNull(formData, campo("telefone")),
      endereco: textoOuNull(formData, campo("endereco")),
    },
  };
}

async function requireSuperadmin() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Acesso negado.");
  }
  return session;
}

export async function createEscritorio(
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  await requireSuperadmin();

  const escritorioNome = String(formData.get("escritorioNome") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const plano = String(formData.get("plano") ?? "BASICO");
  const status = String(formData.get("status") ?? "ATIVO");

  if (!escritorioNome || !name || !email) {
    return { error: "Preencha todos os campos." };
  }
  if (!PLANOS.includes(plano) || !STATUSES.includes(status)) {
    return { error: "Plano ou status inválido." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  // OAB do advogado (opcional aqui; pode ser vinculada depois no card).
  const adv = lerAdvogado(formData, "adv_");
  if (adv.oab || adv.nome) {
    if (!adv.valido) return { error: "Para cadastrar a OAB, informe nome, número e UF." };
    const emUso = await prisma.advogado.findFirst({ where: { oab: adv.oab, uf: adv.uf }, select: { id: true } });
    if (emUso) return { error: MSG_OAB_EM_USO };
  }

  const escolhida = String(formData.get("password") ?? "");
  if (escolhida && escolhida.length < 8) return { error: "A senha precisa ter ao menos 8 caracteres." };
  const password = escolhida || generatePassword();
  const hashed = await bcrypt.hash(password, 10);

  const escritorio = await prisma.escritorio.create({
    data: {
      nome: escritorioNome,
      plano,
      status,
      trialExpira: status === "TRIAL" ? novoTrialExpira() : null,
    },
  });

  await prisma.user.create({
    data: { name, email, password: hashed, escritorioId: escritorio.id, role: "SOCIO" },
  });
  if (adv.valido) {
    await prisma.advogado.create({
      data: { escritorioId: escritorio.id, nome: adv.nome, oab: adv.oab, uf: adv.uf, ...adv.contato },
    });
  }

  revalidatePath("/admin/escritorios");
  revalidatePath("/admin");
  return { success: true, email, password };
}

export async function createUserInEscritorio(
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  await requireSuperadmin();

  const escritorioId = String(formData.get("escritorioId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!escritorioId || !name || !email) {
    return { error: "Preencha todos os campos." };
  }

  const escritorio = await prisma.escritorio.findUnique({
    where: { id: escritorioId },
    select: { id: true },
  });
  if (!escritorio) return { error: "Escritório não encontrado." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const escolhida = String(formData.get("password") ?? "");
  if (escolhida && escolhida.length < 8) return { error: "A senha precisa ter ao menos 8 caracteres." };
  const password = escolhida || generatePassword();
  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      escritorioId,
      role: papelValido(formData.get("role")),
    },
  });

  revalidatePath("/admin/escritorios");
  return { success: true, email, password };
}

export async function updateEscritorioNome(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!id || !nome) return;

  await prisma.escritorio.update({ where: { id }, data: { nome } });
  revalidatePath("/admin/escritorios");
}

export async function updateEscritorioPlano(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const plano = String(formData.get("plano") ?? "");
  const status = String(formData.get("status") ?? "");
  const trialStr = String(formData.get("trialExpira") ?? "").trim();
  if (!id || !PLANOS.includes(plano) || !STATUSES.includes(status)) return;

  let trialExpira: Date | null = null;
  if (status === "TRIAL") {
    trialExpira = trialStr ? new Date(trialStr) : novoTrialExpira();
  }

  await prisma.escritorio.update({
    where: { id },
    data: {
      plano,
      status,
      trialExpira,
      // mantém o liga/desliga coerente com o status comercial
      ativo: status !== "SUSPENSO",
    },
  });
  revalidatePath("/admin/escritorios");
  revalidatePath("/admin");
}

export async function toggleEscritorioAtivo(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  await prisma.escritorio.update({
    where: { id },
    data: { ativo: !ativo, status: !ativo ? "ATIVO" : "SUSPENSO" },
  });
  revalidatePath("/admin/escritorios");
  revalidatePath("/admin");
}

export type ExcluirState = { error: string } | { ok: true } | undefined;

/**
 * Exclui o escritório e TODOS os dados dele (processos, publicações, clientes...).
 * Exige digitar o nome exato do escritório. Os usuários ficam desativados
 * (não são apagados) e a exclusão fica registrada no log do servidor.
 */
export async function deleteEscritorio(
  _prev: ExcluirState,
  formData: FormData
): Promise<ExcluirState> {
  const session = await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "").trim();

  const escritorio = await prisma.escritorio.findUnique({
    where: { id },
    include: { _count: { select: { processos: true, publicacoes: true, clientes: true, users: true } } },
  });
  if (!escritorio) return { error: "Escritório não encontrado." };
  if (confirmacao !== escritorio.nome.trim()) {
    return { error: "O nome digitado não confere. Nada foi excluído." };
  }

  await prisma.$transaction([
    prisma.user.updateMany({ where: { escritorioId: id }, data: { ativo: false } }),
    prisma.escritorio.delete({ where: { id } }),
  ]);
  for (const tipo of ["logo", "capa"] as const) await unlink(arquivoMarca(id, tipo)).catch(() => {});
  console.warn(
    `[admin] ESCRITÓRIO EXCLUÍDO por ${session.email} em ${new Date().toISOString()}: ` +
      `"${escritorio.nome}" (${id}) — ${escritorio._count.processos} processos, ` +
      `${escritorio._count.publicacoes} publicações, ${escritorio._count.clientes} clientes, ` +
      `${escritorio._count.users} usuários desativados`
  );
  revalidatePath("/admin/escritorios");
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleUserAtivo(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  await prisma.user.update({ where: { id }, data: { ativo: !ativo } });
  revalidatePath("/admin/escritorios");
}

export async function deleteUser(formData: FormData) {
  const session = await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  if (!id || id === session.userId) return;

  // Nunca permitir excluir outro SUPERADMIN por esta via.
  const alvo = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!alvo || alvo.role === "SUPERADMIN") return;

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/escritorios");
}

export async function resetUserPassword(
  _prevState: AdminState,
  formData: FormData
): Promise<AdminState> {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "Usuário não encontrado." };

  const password = generatePassword();
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id }, data: { password: hashed } });

  revalidatePath("/admin/escritorios");
  return { success: true, email: user.email, password };
}

export async function alterarPapelUsuario(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const alvo = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!alvo || alvo.role === "SUPERADMIN") return;
  await prisma.user.update({
    where: { id },
    data: { role: papelValido(formData.get("role")) },
  });
  revalidatePath("/admin/escritorios");
}

export type OabAdminState = { error: string } | { ok: true } | undefined;

/** Cadastra (ou atualiza) a OAB e os dados do advogado em um escritório. */
export async function adicionarOabEscritorio(
  _prev: OabAdminState,
  formData: FormData
): Promise<OabAdminState> {
  await requireSuperadmin();
  const escritorioId = String(formData.get("escritorioId") ?? "");
  const adv = lerAdvogado(formData);
  if (!escritorioId || !adv.valido) return { error: "Informe nome, número e UF da OAB." };
  if (await oabEmOutroEscritorio(adv.oab, adv.uf, escritorioId)) return { error: MSG_OAB_EM_USO };
  // Mesma OAB no mesmo escritório: atualiza os dados (é assim que o admin corrige).
  await prisma.advogado.upsert({
    where: { escritorioId_oab_uf: { escritorioId, oab: adv.oab, uf: adv.uf } },
    create: { escritorioId, oab: adv.oab, uf: adv.uf, nome: adv.nome, ...adv.contato },
    update: { nome: adv.nome, ...adv.contato, ativo: true },
  });
  revalidatePath("/admin/escritorios");
  return { ok: true };
}

/** Desvincula a OAB do escritório (libera para ser usada em outro). */
export async function removerOabEscritorio(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.advogado.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/escritorios");
}

export type EditarUsuarioState = { error: string } | { ok: true } | undefined;

/** Edita nome, e-mail de login e, se informada, a senha de qualquer usuário. */
export async function editarUsuario(
  _prev: EditarUsuarioState,
  formData: FormData
): Promise<EditarUsuarioState> {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!id || !name || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Informe nome e um e-mail válido." };
  if (password && password.length < 8) return { error: "A senha precisa ter ao menos 8 caracteres." };

  const outro = await prisma.user.findFirst({ where: { email, NOT: { id } }, select: { id: true } });
  if (outro) return { error: "Já existe outra conta com este e-mail." };

  await prisma.user.update({
    where: { id },
    data: { name, email, ...(password ? { password: await bcrypt.hash(password, 10) } : {}) },
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export type MarcaState = { error: string } | { ok: true } | undefined;

async function gravarImagem(
  escritorioId: string,
  tipo: TipoImagem,
  arquivo: FormDataEntryValue | null
): Promise<{ error: string } | { contentType: string; versao: string } | null> {
  if (!(arquivo instanceof File) || arquivo.size === 0) return null;
  if (arquivo.size > LIMITE_IMAGEM[tipo]) {
    return { error: `A imagem de ${tipo} passa de ${LIMITE_IMAGEM[tipo] / 1024 / 1024} MB.` };
  }
  const buf = Buffer.from(await arquivo.arrayBuffer());
  const contentType = tipoDaImagem(buf);
  if (!contentType) return { error: "Envie a imagem em PNG, JPG ou WebP." };
  await mkdir(MARCA_DIR, { recursive: true });
  await writeFile(arquivoMarca(escritorioId, tipo), buf);
  return { contentType, versao: Date.now().toString(36) };
}

/** Personalização do escritório: nome do topo, logo, capa, cores e letras. */
export async function salvarMarca(_prev: MarcaState, formData: FormData): Promise<MarcaState> {
  await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  const atual = await prisma.escritorio.findUnique({ where: { id }, select: { id: true } });
  if (!atual) return { error: "Escritório não encontrado." };

  const data: Record<string, string | number | null> = {
    nomeTopo: String(formData.get("nomeTopo") ?? "").trim().slice(0, 60) || null,
    corPrimaria: formData.get("usarCorPrimaria") ? corValida(formData.get("corPrimaria")) : null,
    corMenu: formData.get("usarCorMenu") ? corValida(formData.get("corMenu")) : null,
    tamanhoFonte: fonteValida(Number(formData.get("tamanhoFonte"))),
  };

  for (const tipo of ["logo", "capa"] as const) {
    if (formData.get(`remover_${tipo}`)) {
      await unlink(arquivoMarca(id, tipo)).catch(() => {});
      data[`${tipo}Versao`] = null;
      data[`${tipo}Tipo`] = null;
      continue;
    }
    const r = await gravarImagem(id, tipo, formData.get(tipo));
    if (r && "error" in r) return { error: r.error };
    if (r) {
      data[`${tipo}Versao`] = r.versao;
      data[`${tipo}Tipo`] = r.contentType;
    }
  }

  await prisma.escritorio.update({ where: { id }, data });
  revalidatePath("/", "layout");
  return { ok: true };
}
