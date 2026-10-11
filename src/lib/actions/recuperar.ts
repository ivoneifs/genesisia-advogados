"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import {
  INSTANCIA_CENTRAL,
  enviarTexto,
  evolutionConfigurada,
  normalizarWhatsapp,
} from "@/lib/whatsapp";

export type RecuperarState =
  | { etapa: "email"; error?: string }
  | { etapa: "codigo"; email: string; info?: string; error?: string }
  | { etapa: "pronto" }
  | undefined;

const VALIDADE_MIN = 15;
const MAX_TENTATIVAS = 5;
const SENHA_MINIMA = 8;

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "?";
}

export async function solicitarCodigo(
  _prev: RecuperarState,
  formData: FormData
): Promise<RecuperarState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { etapa: "email", error: "Informe seu e-mail." };

  if (
    !rateLimit(`recuperar:${await ip()}`, 5, 15 * 60_000).ok ||
    !rateLimit(`recuperar:${email}`, 3, 15 * 60_000).ok
  ) {
    return { etapa: "email", error: "Muitas solicitações. Aguarde alguns minutos." };
  }

  // Resposta igual exista ou não a conta (não revela e-mails cadastrados).
  const resposta: RecuperarState = {
    etapa: "codigo",
    email,
    info: "Se este e-mail tiver um WhatsApp cadastrado, enviamos um código de 6 dígitos. Ele vale por 15 minutos.",
  };

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, ativo: true, whatsapp: true, escritorioId: true },
    });
    const numero = normalizarWhatsapp(user?.whatsapp);
    if (!user || !user.ativo || !numero || !evolutionConfigurada()) return resposta;

    const cfg = user.escritorioId
      ? await prisma.configWhatsapp.findUnique({ where: { escritorioId: user.escritorioId } })
      : null;
    const instancia = cfg?.instancia || INSTANCIA_CENTRAL;
    if (!instancia) return resposta;

    const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await prisma.recuperacaoSenha.updateMany({
      where: { userId: user.id, usado: false },
      data: { usado: true },
    });
    await prisma.recuperacaoSenha.create({
      data: {
        userId: user.id,
        codigoHash: await bcrypt.hash(codigo, 10),
        expira: new Date(Date.now() + VALIDADE_MIN * 60_000),
      },
    });
    await enviarTexto(
      instancia,
      numero,
      `🔐 *Genesis IA*\nSeu código para redefinir a senha é: *${codigo}*\n\nEle vale por ${VALIDADE_MIN} minutos. Se não foi você, ignore esta mensagem.`
    );
  } catch (e) {
    console.error("[recuperar-senha]", e);
  }
  return resposta;
}

export async function redefinirComCodigo(
  _prev: RecuperarState,
  formData: FormData
): Promise<RecuperarState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const codigo = String(formData.get("codigo") ?? "").replace(/\D/g, "");
  const nova = String(formData.get("nova") ?? "");
  const erro = (error: string): RecuperarState => ({ etapa: "codigo", email, error });

  if (codigo.length !== 6) return erro("O código tem 6 dígitos.");
  if (nova.length < SENHA_MINIMA) return erro(`A nova senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`);
  if (!rateLimit(`recuperar-codigo:${await ip()}`, 10, 15 * 60_000).ok) {
    return erro("Muitas tentativas. Aguarde alguns minutos.");
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const pedido = user
    ? await prisma.recuperacaoSenha.findFirst({
        where: { userId: user.id, usado: false, expira: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      })
    : null;
  if (!user || !pedido || pedido.tentativas >= MAX_TENTATIVAS) {
    return erro("Código inválido ou expirado. Solicite um novo.");
  }
  if (!(await bcrypt.compare(codigo, pedido.codigoHash))) {
    await prisma.recuperacaoSenha.update({
      where: { id: pedido.id },
      data: { tentativas: { increment: 1 } },
    });
    return erro("Código incorreto.");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(nova, 10) } }),
    prisma.recuperacaoSenha.update({ where: { id: pedido.id }, data: { usado: true } }),
  ]);
  return { etapa: "pronto" };
}
