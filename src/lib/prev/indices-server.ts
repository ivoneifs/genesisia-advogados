import { prisma } from "@/lib/db";
import { CODIGO_SGS, type Indices, type SerieIndice } from "./indices";

const VALIDADE_MS = 12 * 3600_000;
const SERIES = Object.keys(CODIGO_SGS) as SerieIndice[];

async function baixarSerie(serie: SerieIndice): Promise<{ mes: string; valor: number }[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${CODIGO_SGS[serie]}/dados?formato=json&dataInicial=01/07/1994`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
  if (!res.ok) throw new Error(`BCB ${serie}: HTTP ${res.status}`);
  const dados = (await res.json()) as { data: string; valor: string }[];
  return dados
    .map((d) => {
      const [, m, a] = d.data.split("/");
      return { mes: `${a}-${m}`, valor: Number(d.valor) };
    })
    .filter((d) => Number.isFinite(d.valor));
}

async function sincronizar(serie: SerieIndice) {
  const dados = await baixarSerie(serie);
  if (dados.length < 12) throw new Error(`BCB ${serie}: resposta vazia`);
  await prisma.$transaction([
    prisma.indiceMensal.deleteMany({ where: { serie } }),
    prisma.indiceMensal.createMany({ data: dados.map((d) => ({ serie, ...d })) }),
    prisma.indiceSync.upsert({
      where: { serie },
      create: { serie, atualizadoEm: new Date() },
      update: { atualizadoEm: new Date() },
    }),
  ]);
}

let emAndamento: Promise<void> | null = null;

/** Atualiza do Banco Central se o cache tiver mais de 12 h (falha silenciosa). */
export async function atualizarIndices(forcar = false) {
  if (emAndamento) return emAndamento;
  emAndamento = (async () => {
    const syncs = await prisma.indiceSync.findMany();
    const vencidas = SERIES.filter((s) => {
      const r = syncs.find((x) => x.serie === s);
      return forcar || !r || Date.now() - r.atualizadoEm.getTime() > VALIDADE_MS;
    });
    for (const s of vencidas) {
      try {
        await sincronizar(s);
      } catch (e) {
        console.error("[indices] falha ao atualizar", s, e);
      }
    }
  })().finally(() => {
    emAndamento = null;
  });
  return emAndamento;
}

export async function obterIndices(): Promise<{ indices: Indices; atualizadoEm: Record<string, string> }> {
  await atualizarIndices();
  const [linhas, syncs] = await Promise.all([prisma.indiceMensal.findMany(), prisma.indiceSync.findMany()]);
  const indices: Indices = {};
  for (const l of linhas) {
    const s = l.serie as SerieIndice;
    (indices[s] ??= {})[l.mes] = l.valor;
  }
  return {
    indices,
    atualizadoEm: Object.fromEntries(syncs.map((s) => [s.serie, s.atualizadoEm.toISOString()])),
  };
}
