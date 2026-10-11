// Histórico de atividades do escritório (quem fez o quê e quando).
// Falhas aqui nunca derrubam a ação principal.

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export type Acao = "CRIOU" | "EDITOU" | "EXCLUIU" | "CONCLUIU" | "REABRIU";

export async function registrarAtividade(
  acao: Acao,
  entidade: string,
  descricao: string,
  entidadeId?: string | null
) {
  try {
    const s = await getSession();
    if (!s?.escritorioId) return;
    await prisma.atividade.create({
      data: {
        escritorioId: s.escritorioId,
        userId: s.userId,
        userNome: s.name,
        acao,
        entidade,
        entidadeId: entidadeId ?? null,
        descricao: descricao.slice(0, 300),
      },
    });
  } catch (e) {
    console.error("[atividade]", e);
  }
}
