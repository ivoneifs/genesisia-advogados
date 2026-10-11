// Usuário logado lido do banco (o JWT pode estar desatualizado quanto ao
// perfil), e bloqueio de ações conforme o perfil.

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { pode, type Permissao } from "@/lib/papeis";

export const usuarioAtual = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, escritorioId: true, whatsapp: true },
  });
});

/**
 * Garante a permissão; senão volta para a página de origem com
 * ?sem-permissao=1 (o layout mostra o aviso). Retorna o usuário.
 */
export async function exigir(p: Permissao) {
  const u = await usuarioAtual();
  if (!u || !u.escritorioId) redirect("/login");
  if (!pode(u.role, p)) {
    const h = await headers();
    let destino = "/dashboard";
    try {
      const ref = new URL(h.get("referer") ?? "");
      destino = ref.pathname;
    } catch {
      // sem referer: volta ao início
    }
    redirect(`${destino}?sem-permissao=1`);
  }
  return { ...u, escritorioId: u.escritorioId };
}

/** Para páginas: sem permissão, volta ao início com o aviso. */
export async function exigirPagina(p: Permissao) {
  const u = await usuarioAtual();
  if (!u || !u.escritorioId) redirect("/login");
  if (!pode(u.role, p)) redirect("/dashboard?sem-permissao=1");
  return { ...u, escritorioId: u.escritorioId };
}
