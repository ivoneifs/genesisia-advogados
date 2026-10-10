// Validação de posse: garante que um clienteId/processoId informado num
// formulário realmente pertence ao escritório da sessão. Evita que um
// usuário referencie registros de outro tenant (vazamento via include).

import { prisma } from "@/lib/db";

/** Retorna o id se o cliente pertence ao escritório; senão null. */
export async function clienteValido(
  id: string | null | undefined,
  escritorioId: string
): Promise<string | null> {
  if (!id) return null;
  const c = await prisma.cliente.findFirst({
    where: { id, escritorioId },
    select: { id: true },
  });
  return c ? c.id : null;
}

/** Retorna o id se o processo pertence ao escritório; senão null. */
export async function processoValido(
  id: string | null | undefined,
  escritorioId: string
): Promise<string | null> {
  if (!id) return null;
  const p = await prisma.processo.findFirst({
    where: { id, escritorioId },
    select: { id: true },
  });
  return p ? p.id : null;
}
