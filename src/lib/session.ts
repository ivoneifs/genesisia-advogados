import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionSecret as secret } from "@/lib/secret";
import { prisma } from "@/lib/db";
import { motivoBloqueio } from "@/lib/acesso";

const COOKIE_NAME = "genesis_session";

export type SessionPayload = {
  userId: string;
  name: string;
  email: string;
  role: string;
  escritorioId: string | null;
  /** Módulos/funções desligados pelo superadmin (lib/modulos.ts). Só vem do banco. */
  desativados?: string[];
};

export async function createSession(payload: SessionPayload) {
  const { userId, name, email, role, escritorioId } = payload;
  const token = await new SignJWT({ userId, name, email, role, escritorioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Só confere a assinatura do cookie, sem olhar o banco. */
export async function lerTokenSessao(): Promise<(SessionPayload & { iat?: number }) | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload & { iat?: number };
  } catch {
    return null;
  }
}

/**
 * Sessão válida AGORA: o cookie dura 30 dias, então confere no banco a cada
 * requisição. Usuário desativado, escritório suspenso/teste vencido ou senha
 * trocada depois do login derrubam a sessão em ações e APIs, não só nas
 * páginas. Perfil e escritório vêm do banco (o JWT pode estar desatualizado).
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = await lerTokenSessao();
  if (!token?.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: token.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      ativo: true,
      escritorioId: true,
      senhaAlteradaEm: true,
      escritorio: {
        select: { ativo: true, status: true, trialExpira: true, modulosDesativados: true },
      },
    },
  });
  if (!user || !user.ativo) return null;
  if (user.senhaAlteradaEm && (token.iat ?? 0) < Math.floor(user.senhaAlteradaEm.getTime() / 1000)) {
    return null;
  }
  if (user.role !== "SUPERADMIN" && (!user.escritorio || motivoBloqueio(user.escritorio))) {
    return null;
  }
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    escritorioId: user.escritorioId,
    desativados: user.escritorio?.modulosDesativados ?? [],
  };
});

export async function requireEscritorioId(): Promise<string> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.escritorioId) redirect("/admin/usuarios");
  return session.escritorioId;
}

export { COOKIE_NAME };
