"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireEscritorioId } from "@/lib/session";
import {
  INSTANCIA_CENTRAL,
  desconectarInstancia,
  enviarTexto,
  nomeInstancia,
  normalizarWhatsapp,
  qrCodeInstancia,
} from "@/lib/whatsapp";

const CAMINHO = "/whatsapp";

export type WhatsappState =
  | { error: string }
  | { success: string }
  | { qr: string }
  | undefined;

function erro(e: unknown): { error: string } {
  return { error: e instanceof Error ? e.message : String(e) };
}

export async function salvarConfigWhatsapp(formData: FormData) {
  const escritorioId = await requireEscritorioId();
  const on = (k: string) => formData.get(k) === "on";
  const hora = Number(formData.get("horaResumo"));
  const data = {
    ativo: on("ativo"),
    agenda: on("agenda"),
    prazos: on("prazos"),
    publicacoes: on("publicacoes"),
    resumoDiario: on("resumoDiario"),
    clientes: on("clientes"),
    horaResumo: Number.isInteger(hora) && hora >= 5 && hora <= 12 ? hora : 7,
  };

  const antes = await prisma.configWhatsapp.findUnique({ where: { escritorioId } });
  if (data.ativo && !antes?.ativo) {
    // Ao ligar, só avisa publicações que chegarem daqui em diante.
    await prisma.publicacao.updateMany({
      where: { escritorioId, alertaEnviado: false },
      data: { alertaEnviado: true },
    });
  }
  await prisma.configWhatsapp.upsert({
    where: { escritorioId },
    create: { escritorioId, ...data },
    update: data,
  });
  revalidatePath(CAMINHO);
}

export async function salvarWhatsappUsuarios(formData: FormData) {
  const escritorioId = await requireEscritorioId();
  const usuarios = await prisma.user.findMany({
    where: { escritorioId },
    select: { id: true },
  });
  for (const u of usuarios) {
    const bruto = formData.get(`whatsapp_${u.id}`);
    if (bruto === null) continue;
    const valor = String(bruto).trim();
    await prisma.user.update({
      where: { id: u.id },
      data: { whatsapp: valor ? normalizarWhatsapp(valor) ?? valor : null },
    });
  }
  revalidatePath(CAMINHO);
}

/** Cria/reconecta a instância própria do escritório e devolve o QR code. */
export async function conectarNumeroProprio(
  _prev: WhatsappState,
  _formData: FormData
): Promise<WhatsappState> {
  const escritorioId = await requireEscritorioId();
  const instancia = nomeInstancia(escritorioId);
  try {
    const qr = await qrCodeInstancia(instancia);
    await prisma.configWhatsapp.upsert({
      where: { escritorioId },
      create: { escritorioId, instancia },
      update: { instancia },
    });
    revalidatePath(CAMINHO);
    return qr ? { qr } : { success: "Número conectado." };
  } catch (e) {
    return erro(e);
  }
}

export async function usarNumeroCentral(formData: FormData) {
  void formData;
  const escritorioId = await requireEscritorioId();
  const cfg = await prisma.configWhatsapp.findUnique({ where: { escritorioId } });
  if (cfg?.instancia) {
    await desconectarInstancia(cfg.instancia).catch(() => {});
  }
  await prisma.configWhatsapp.upsert({
    where: { escritorioId },
    create: { escritorioId, instancia: null },
    update: { instancia: null },
  });
  revalidatePath(CAMINHO);
}

export async function enviarMensagemTeste(
  _prev: WhatsappState,
  formData: FormData
): Promise<WhatsappState> {
  const escritorioId = await requireEscritorioId();
  const numero = normalizarWhatsapp(String(formData.get("numero") ?? ""));
  if (!numero) return { error: "Informe um celular com DDD, ex.: (11) 98765-4321." };

  const [cfg, escritorio] = await Promise.all([
    prisma.configWhatsapp.findUnique({ where: { escritorioId } }),
    prisma.escritorio.findUnique({ where: { id: escritorioId }, select: { nome: true } }),
  ]);
  const instancia = cfg?.instancia || INSTANCIA_CENTRAL;
  if (!instancia) return { error: "Nenhum número de WhatsApp conectado." };

  try {
    await enviarTexto(
      instancia,
      numero,
      `✅ *Teste de alertas*\nEste número vai receber os alertas do escritório ${escritorio?.nome ?? ""} pelo Genesis IA.`
    );
    await prisma.alertaEnviado.create({
      data: {
        chave: `teste:${escritorioId}:${Date.now()}`,
        tipo: "TESTE",
        destino: numero,
        escritorioId,
      },
    });
    revalidatePath(CAMINHO);
    return { success: "Mensagem de teste enviada." };
  } catch (e) {
    return erro(e);
  }
}
