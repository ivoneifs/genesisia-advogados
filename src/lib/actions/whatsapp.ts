"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigir } from "@/lib/usuario";
import {
  INSTANCIA_CENTRAL,
  apagarInstancia,
  codigosInstancia,
  criarInstancia,
  enviarTexto,
  estadoInstancia,
  nomeInstancia,
  normalizarWhatsapp,
  perfilInstancia,
  type CodigosConexao,
  type PerfilConectado,
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
  const { escritorioId } = await exigir("gerenciar");
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
  const { escritorioId } = await exigir("gerenciar");
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

export type ConexaoState =
  | { etapa: "aguardando"; numero: string; codigos: CodigosConexao }
  | { etapa: "erro"; error: string }
  | undefined;

/**
 * Conecta o número do escritório: cria (ou recria, se o número mudou) a
 * instância na Evolution e devolve o QR code e o código de pareamento.
 */
export async function iniciarConexao(
  _prev: ConexaoState,
  formData: FormData
): Promise<ConexaoState> {
  const { escritorioId } = await exigir("gerenciar");
  const numero = normalizarWhatsapp(String(formData.get("numero") ?? ""));
  if (!numero) {
    return { etapa: "erro", error: "Informe o WhatsApp do escritório com DDD, ex.: (11) 98765-4321." };
  }
  const instancia = nomeInstancia(escritorioId);
  try {
    const cfg = await prisma.configWhatsapp.findUnique({ where: { escritorioId } });
    const estado = await estadoInstancia(instancia);
    let codigos: CodigosConexao;
    if (estado !== "inexistente" && cfg?.numero === numero && estado !== "open") {
      codigos = await codigosInstancia(instancia);
    } else {
      // Número novo (ou instância antiga): começa do zero para gerar o código de pareamento.
      if (estado !== "inexistente") await apagarInstancia(instancia);
      codigos = await criarInstancia(instancia, numero);
    }
    // A instância só passa a enviar alertas depois de conectada (ver statusConexao);
    // até lá os alertas seguem pelo número central.
    await prisma.configWhatsapp.upsert({
      where: { escritorioId },
      create: { escritorioId, numero },
      update: { instancia: null, numero },
    });
    return { etapa: "aguardando", numero, codigos };
  } catch (e) {
    return { etapa: "erro", error: erro(e).error };
  }
}

export type StatusConexao = {
  estado: "open" | "connecting" | "close" | "inexistente" | "erro";
  codigos?: CodigosConexao;
  perfil?: PerfilConectado | null;
};

/** Consultado pela tela a cada poucos segundos enquanto aguarda a leitura do QR. */
export async function statusConexao(atualizarCodigos: boolean): Promise<StatusConexao> {
  const { escritorioId } = await exigir("gerenciar");
  const instancia = nomeInstancia(escritorioId);
  try {
    const estado = await estadoInstancia(instancia);
    if (estado === "open") {
      await prisma.configWhatsapp.upsert({
        where: { escritorioId },
        create: { escritorioId, instancia },
        update: { instancia },
      });
      return { estado, perfil: await perfilInstancia(instancia).catch(() => null) };
    }
    if (estado === "connecting" && atualizarCodigos) {
      return { estado, codigos: await codigosInstancia(instancia) };
    }
    return { estado };
  } catch {
    return { estado: "erro" };
  }
}

/** Desconecta e remove o número do escritório (volta ao número central, se houver). */
export async function desconectarNumero() {
  const { escritorioId } = await exigir("gerenciar");
  await apagarInstancia(nomeInstancia(escritorioId)).catch(() => {});
  await prisma.configWhatsapp.upsert({
    where: { escritorioId },
    create: { escritorioId },
    update: { instancia: null, numero: null },
  });
  revalidatePath(CAMINHO);
}

export async function enviarMensagemTeste(
  _prev: WhatsappState,
  formData: FormData
): Promise<WhatsappState> {
  const { escritorioId } = await exigir("gerenciar");
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
