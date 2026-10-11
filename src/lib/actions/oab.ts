"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireEscritorioId } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { consultarAdvogado, UFS } from "@/lib/djen";
import {
  executarImportacao,
  PARADA_MS,
  resumoImportacao,
  type ImportacaoResumo,
} from "@/lib/importacao-oab";

export type { ImportacaoResumo };

const soDigitos = (s: string) => s.replace(/\D/g, "");

export type AdvogadoOabResult =
  | { error: string }
  | {
      nome: string | null;
      oab: string;
      uf: string;
      totalPublicacoes: number;
      tribunais: string[];
      ultimaPublicacao: string | null; // ISO
    };

/** Consulta rápida dos dados do advogado (nome, tribunais, publicações) no DJEN. */
export async function consultarAdvogadoOab(
  numeroOabBruto: string,
  ufBruta: string
): Promise<AdvogadoOabResult> {
  const numeroOab = soDigitos(numeroOabBruto);
  const uf = ufBruta.toUpperCase();
  if (!numeroOab || numeroOab.length > 7 || !UFS.includes(uf)) {
    return { error: "Informe o número e a UF da OAB." };
  }

  const escritorioId = await requireEscritorioId();
  const rl = rateLimit(`oab-consulta:${escritorioId}`, 8, 60_000);
  if (!rl.ok) {
    return { error: `Muitas consultas seguidas. Aguarde ${rl.retryAfterSec}s.` };
  }

  try {
    const a = await consultarAdvogado(numeroOab, uf);
    return { ...a, ultimaPublicacao: a.ultimaPublicacao?.toISOString() ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao consultar o DJEN." };
  }
}

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
