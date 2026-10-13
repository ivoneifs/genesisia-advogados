// Trava de OAB: cada escritório só trabalha com as OABs vinculadas a ele.
// Quem cadastra escritório, advogado e OAB é o administrador, com os dados
// passados pelo advogado. Uma OAB pertence a um único escritório, para ninguém
// importar processos e publicações de outro advogado.

import { prisma } from "@/lib/db";

export const SUPORTE_WHATSAPP = `https://wa.me/5574988259925?text=${encodeURIComponent(
  "Olá! Preciso incluir ou alterar uma OAB do meu escritório no Genesis IA."
)}`;

export const MSG_OAB_EM_USO =
  "Esta OAB já está vinculada a outro escritório. Se ela é sua, fale com o suporte.";
export const MSG_OAB_NAO_VINCULADA =
  "Só é possível importar pela OAB cadastrada no seu escritório.";

/** A OAB/UF já pertence a outro escritório? */
export async function oabEmOutroEscritorio(oab: string, uf: string, escritorioId: string) {
  const outro = await prisma.advogado.findFirst({
    where: { oab, uf, NOT: { escritorioId } },
    select: { id: true },
  });
  return !!outro;
}

/** A OAB/UF está vinculada a este escritório? */
export async function oabDoEscritorio(oab: string, uf: string, escritorioId: string) {
  const a = await prisma.advogado.findUnique({
    where: { escritorioId_oab_uf: { escritorioId, oab, uf } },
    select: { id: true },
  });
  return !!a;
}
