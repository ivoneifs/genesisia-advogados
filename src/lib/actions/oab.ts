"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireEscritorioId } from "@/lib/session";
import { UFS } from "@/lib/djen";
import {
  executarImportacao,
  PARADA_MS,
  resumoImportacao,
  type ImportacaoResumo,
} from "@/lib/importacao-oab";
import { MSG_OAB_NAO_VINCULADA, oabDoEscritorio } from "@/lib/oab-trava";

export type { ImportacaoResumo };

const soDigitos = (s: string) => s.replace(/\D/g, "");

export type IniciarImportacaoState = { error: string } | { id: string } | undefined;

/** Começa a importação completa da OAB em segundo plano e devolve o id para acompanhar. */
export async function iniciarImportacaoOab(
  _prev: IniciarImportacaoState,
  formData: FormData
): Promise<IniciarImportacaoState> {
  const numeroOab = soDigitos(String(formData.get("numeroOab") ?? "")).replace(/^0+/, "");
  const uf = String(formData.get("uf") ?? "").toUpperCase();
  if (!numeroOab || numeroOab.length > 7) return { error: "Informe o número da OAB." };
  if (!UFS.includes(uf)) return { error: "Selecione a UF da OAB." };

  const session = await getSession();
  const escritorioId = await requireEscritorioId();

  // Trava: só importa pela OAB vinculada ao escritório.
  if (!(await oabDoEscritorio(numeroOab, uf, escritorioId))) return { error: MSG_OAB_NAO_VINCULADA };

  // Uma importação por vez por escritório (o DJEN limita as consultas).
  const emAndamento = await prisma.importacaoOab.findFirst({
    where: { escritorioId, status: "RODANDO", updatedAt: { gt: new Date(Date.now() - PARADA_MS) } },
  });
  if (emAndamento) return { id: emAndamento.id };

  const imp = await prisma.importacaoOab.create({
    data: { escritorioId, oab: numeroOab, uf },
  });
  after(() => executarImportacao(imp.id, session?.userId ?? null));
  revalidatePath("/processos");
  return { id: imp.id };
}

export async function statusImportacaoOab(id: string): Promise<ImportacaoResumo | null> {
  const escritorioId = await requireEscritorioId();
  const imp = await prisma.importacaoOab.findFirst({ where: { id, escritorioId } });
  return imp ? resumoImportacao(imp) : null;
}
