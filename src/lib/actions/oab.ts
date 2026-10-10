"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession, requireEscritorioId } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { buscarProcessosPorOab, UFS } from "@/lib/djen";

export type ImportOabState =
  | { error: string }
  | {
      success: true;
      oab: string;
      encontrados: number;
      novos: number;
      publicacoes: number;
      incompleto: boolean;
    }
  | undefined;

// Processos importados entram vinculados a este cliente até o advogado
// reclassificar (o DJEN não informa qual das partes é o cliente).
const CLIENTE_IMPORTADOS = "Importados via OAB (a classificar)";

const soDigitos = (s: string) => s.replace(/\D/g, "");

export async function importarProcessosPorOab(
  _prev: ImportOabState,
  formData: FormData
): Promise<ImportOabState> {
  const numeroOab = soDigitos(String(formData.get("numeroOab") ?? ""));
  const uf = String(formData.get("uf") ?? "").toUpperCase();
  if (!numeroOab || numeroOab.length > 7) return { error: "Informe o número da OAB." };
  if (!UFS.includes(uf)) return { error: "Selecione a UF da OAB." };

  const session = await getSession();
  const escritorioId = await requireEscritorioId();
  // O DJEN permite ~20 req/min no total; uma busca pode usar várias.
  const rl = rateLimit(`oab:${escritorioId}`, 3, 60_000);
  if (!rl.ok) {
    return { error: `Aguarde ${rl.retryAfterSec}s antes de uma nova busca.` };
  }

  let resultado;
  try {
    resultado = await buscarProcessosPorOab(numeroOab, uf);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Falha ao consultar o DJEN.",
    };
  }

  const oab = `${numeroOab}/${uf}`;
  if (resultado.processos.length === 0) {
    return {
      success: true,
      oab,
      encontrados: 0,
      novos: 0,
      publicacoes: 0,
      incompleto: false,
    };
  }

  // Processos que o escritório já tem (compara só os dígitos do número CNJ).
  const existentes = await prisma.processo.findMany({
    where: { escritorioId },
    select: { id: true, numero: true },
  });
  const idPorNumero = new Map(existentes.map((p) => [soDigitos(p.numero), p.id]));

  let novos = 0;
  let clienteId: string | null = null;
  for (const p of resultado.processos) {
    const existenteId = idPorNumero.get(soDigitos(p.numero));
    if (existenteId) {
      // Mantém a lista de advogados atualizada também nos que já existiam.
      if (p.advogados.length) {
        await prisma.processo.updateMany({
          where: { id: existenteId, escritorioId },
          data: { advogados: p.advogados },
        });
      }
      continue;
    }

    if (!clienteId) {
      const cliente =
        (await prisma.cliente.findFirst({
          where: { escritorioId, nome: CLIENTE_IMPORTADOS },
          select: { id: true },
        })) ??
        (await prisma.cliente.create({
          data: { escritorioId, nome: CLIENTE_IMPORTADOS, tipo: "PF" },
          select: { id: true },
        }));
      clienteId = cliente.id;
    }

    const partes = [
      p.poloAtivo.length ? `Polo ativo: ${p.poloAtivo.join(", ")}` : null,
      p.poloPassivo.length ? `Polo passivo: ${p.poloPassivo.join(", ")}` : null,
    ].filter(Boolean);

    const criado = await prisma.processo.create({
      data: {
        numero: p.numero,
        escritorioId,
        clienteId,
        status: "ATIVO",
        area: p.classe,
        tribunal: p.tribunal,
        vara: p.vara,
        parteContraria: p.poloPassivo.join(", ") || null,
        descricao: [`Importado do DJEN pela OAB ${oab}.`, ...partes].join("\n"),
        advogados: p.advogados,
        responsavelId: session?.userId ?? null,
      },
      select: { id: true },
    });
    idPorNumero.set(soDigitos(p.numero), criado.id);
    novos++;
  }

  // Publicações: grava as comunicações que ainda não existem em cada processo.
  const processoIds = resultado.processos.map(
    (p) => idPorNumero.get(soDigitos(p.numero))!
  );
  const jaGravadas = await prisma.publicacao.findMany({
    where: { escritorioId, processoId: { in: processoIds } },
    select: { processoId: true, dataPublicacao: true, conteudo: true },
  });
  const chave = (processoId: string, data: Date | null, conteudo: string) =>
    `${processoId}|${data?.toISOString().slice(0, 10)}|${conteudo}`;
  const vistas = new Set(
    jaGravadas.map((x) => chave(x.processoId!, x.dataPublicacao, x.conteudo))
  );

  const novasPublicacoes = [];
  for (const p of resultado.processos) {
    const processoId = idPorNumero.get(soDigitos(p.numero))!;
    for (const c of p.comunicacoes) {
      const conteudo = `${c.tipo}: ${c.texto}`.trim();
      const k = chave(processoId, c.data, conteudo);
      if (vistas.has(k)) continue;
      vistas.add(k);
      novasPublicacoes.push({
        escritorioId,
        processoId,
        conteudo,
        diario: c.diario,
        dataPublicacao: c.data,
      });
    }
  }
  if (novasPublicacoes.length) {
    await prisma.publicacao.createMany({ data: novasPublicacoes });
  }

  revalidatePath("/processos");
  revalidatePath("/publicacoes");
  revalidatePath("/dashboard");

  return {
    success: true,
    oab,
    encontrados: resultado.processos.length,
    novos,
    publicacoes: novasPublicacoes.length,
    incompleto: resultado.incompleto,
  };
}
