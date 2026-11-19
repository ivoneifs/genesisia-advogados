"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { registrarAtividade } from "@/lib/atividade";
import { exigir } from "@/lib/usuario";
import { getSession } from "@/lib/session";
import { ativo } from "@/lib/modulos";
import { clienteValido, processoValido } from "@/lib/tenant";

export type Area = "PREVIDENCIARIO" | "TRABALHISTA";
const MODULO: Record<Area, string> = { PREVIDENCIARIO: "previdenciario", TRABALHISTA: "trabalhista" };
const ROTA: Record<Area, string> = { PREVIDENCIARIO: "/previdenciario", TRABALHISTA: "/trabalhista" };
const LIMITE_JSON = 3_000_000; // ~3 MB por cálculo

async function sessaoModulo(area: Area) {
  const session = await getSession();
  if (!session?.escritorioId) throw new Error("Sessão expirada. Entre novamente.");
  if (!ativo(session.desativados, MODULO[area])) throw new Error("Módulo desativado para este escritório.");
  return { ...session, escritorioId: session.escritorioId };
}

export type SalvarCalculoInput = {
  id?: string | null;
  area: Area;
  tipo: string;
  titulo: string;
  dados: unknown;
  resumo?: unknown;
  parecer?: string | null;
  clienteId?: string | null;
  processoId?: string | null;
};

export async function salvarCalculo(input: SalvarCalculoInput): Promise<{ id: string } | { error: string }> {
  try {
    if (input.area !== "PREVIDENCIARIO" && input.area !== "TRABALHISTA") return { error: "Área inválida." };
    const s = await sessaoModulo(input.area);
    const titulo = String(input.titulo ?? "").trim().slice(0, 200) || "Cálculo sem título";
    const dadosJson = JSON.stringify(input.dados ?? {});
    if (dadosJson.length > LIMITE_JSON) return { error: "Cálculo grande demais para salvar." };
    const clienteId = await clienteValido(input.clienteId || null, s.escritorioId);
    const processoId = await processoValido(input.processoId || null, s.escritorioId);
    const data = {
      titulo,
      tipo: String(input.tipo).slice(0, 60),
      dados: JSON.parse(dadosJson) as Prisma.InputJsonValue,
      resumo: (input.resumo ?? undefined) as Prisma.InputJsonValue | undefined,
      parecer: input.parecer === undefined ? undefined : input.parecer?.slice(0, 200_000) ?? null,
      clienteId,
      processoId,
    };
    if (input.id) {
      const atual = await prisma.calculo.findFirst({ where: { id: input.id, escritorioId: s.escritorioId }, select: { id: true } });
      if (!atual) return { error: "Cálculo não encontrado." };
      await prisma.calculo.update({ where: { id: input.id }, data });
      revalidatePath(ROTA[input.area]);
      return { id: input.id };
    }
    const novo = await prisma.calculo.create({
      data: { ...data, area: input.area, criadoPor: s.name, escritorioId: s.escritorioId },
    });
    await registrarAtividade("CRIOU", "Cálculo", titulo, novo.id);
    revalidatePath(ROTA[input.area]);
    return { id: novo.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao salvar." };
  }
}

export async function duplicarCalculo(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const session = await getSession();
  if (!session?.escritorioId) redirect("/login");
  const c = await prisma.calculo.findFirst({ where: { id, escritorioId: session.escritorioId } });
  if (!c) return;
  const novo = await prisma.calculo.create({
    data: {
      area: c.area,
      tipo: c.tipo,
      titulo: `${c.titulo} (cópia)`.slice(0, 200),
      dados: c.dados as Prisma.InputJsonValue,
      resumo: (c.resumo ?? undefined) as Prisma.InputJsonValue | undefined,
      parecer: c.parecer,
      clienteId: c.clienteId,
      processoId: c.processoId,
      criadoPor: session.name,
      escritorioId: session.escritorioId,
    },
  });
  await registrarAtividade("CRIOU", "Cálculo", novo.titulo, novo.id);
  revalidatePath(ROTA[c.area as Area] ?? "/previdenciario");
}

export async function excluirCalculo(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { escritorioId } = await exigir("excluir");
  const c = await prisma.calculo.findFirst({ where: { id, escritorioId } });
  if (!c) return;
  await prisma.calculo.delete({ where: { id } });
  await registrarAtividade("EXCLUIU", "Cálculo", c.titulo, id);
  revalidatePath(ROTA[c.area as Area] ?? "/previdenciario");
}

// ---- Clientes: busca e cadastro rápido dentro dos cálculos ----

export type ClienteOpcao = { id: string; nome: string; documento: string | null };

export async function buscarClientes(q: string): Promise<ClienteOpcao[]> {
  const session = await getSession();
  if (!session?.escritorioId) return [];
  const termo = String(q ?? "").trim().slice(0, 80);
  return prisma.cliente.findMany({
    where: {
      escritorioId: session.escritorioId,
      ...(termo
        ? { OR: [{ nome: { contains: termo, mode: "insensitive" } }, { documento: { contains: termo.replace(/\D/g, "") || termo } }] }
        : {}),
    },
    orderBy: { nome: "asc" },
    take: 20,
    select: { id: true, nome: true, documento: true },
  });
}

export async function criarClienteRapido(input: {
  nome: string;
  documento?: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
}): Promise<ClienteOpcao | { error: string }> {
  const session = await getSession();
  if (!session?.escritorioId) return { error: "Sessão expirada." };
  const nome = String(input.nome ?? "").trim().slice(0, 150);
  if (nome.length < 2) return { error: "Informe o nome do cliente." };
  const c = await prisma.cliente.create({
    data: {
      nome,
      tipo: "PF",
      documento: String(input.documento ?? "").trim().slice(0, 30) || null,
      telefone: String(input.telefone ?? "").trim().slice(0, 30) || null,
      email: String(input.email ?? "").trim().slice(0, 120) || null,
      observacoes: String(input.observacoes ?? "").trim().slice(0, 2000) || null,
      escritorioId: session.escritorioId,
    },
    select: { id: true, nome: true, documento: true },
  });
  await registrarAtividade("CRIOU", "Cliente", nome, c.id);
  revalidatePath("/clientes");
  return c;
}
