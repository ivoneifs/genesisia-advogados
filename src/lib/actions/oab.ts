"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession, requireEscritorioId } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { buscarProcessosPorOab, UFS } from "@/lib/djen";
import { processosEncerrados } from "@/lib/datajud";

export type ImportOabState =
  | { error: string }
  | {
      success: true;
      oab: string;
      encontrados: number;
      ativos: number;
      arquivados: number;
      novos: number;
      publicacoes: number;
      incompleto: boolean;
    }
  | undefined;

// Processos importados entram vinculados a este cliente até o advogado
// reclassificar (o DJEN não informa qual das partes é o cliente).
const CLIENTE_IMPORTADOS = "Importados via OAB (a classificar)";
const PREFIXO_IMPORTADO = "Importado do DJEN";

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
      ativos: 0,
      arquivados: 0,
      novos: 0,
      publicacoes: 0,
      incompleto: false,
    };
  }

  // Situação no DataJud (CNJ): baixados/arquivados entram como ARQUIVADO,
  // e a lista (filtro padrão "Ativos") mostra só os ativos. Se o DataJud
  // falhar ou não conhecer o processo, ele fica ATIVO.
  const encerrados = await processosEncerrados(resultado.processos).catch(
    () => new Set<string>()
  );
  const statusDe = (numero: string) =>
    encerrados.has(soDigitos(numero)) ? "ARQUIVADO" : "ATIVO";

  // Processos que o escritório já tem (compara só os dígitos do número CNJ).
  const existentes = await prisma.processo.findMany({
    where: { escritorioId },
    select: { id: true, numero: true, status: true, descricao: true },
  });
  const idPorNumero = new Map(existentes.map((p) => [soDigitos(p.numero), p.id]));
  const existentePorId = new Map(existentes.map((p) => [p.id, p]));

  let novos = 0;
  let clienteId: string | null = null;
  for (const p of resultado.processos) {
    const existenteId = idPorNumero.get(soDigitos(p.numero));
    if (existenteId) {
      // Atualiza advogados e, nos que vieram da importação e seguem ATIVO,
      // arquiva se o DataJud indicar baixa. Status editado à mão é preservado.
      const atual = existentePorId.get(existenteId)!;
      const arquivar =
        atual.status === "ATIVO" &&
        !!atual.descricao?.startsWith(PREFIXO_IMPORTADO) &&
        statusDe(p.numero) === "ARQUIVADO";
      if (p.advogados.length || arquivar) {
        await prisma.processo.updateMany({
          where: { id: existenteId, escritorioId },
          data: {
            ...(p.advogados.length ? { advogados: p.advogados } : {}),
            ...(arquivar ? { status: "ARQUIVADO" } : {}),
          },
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
        status: statusDe(p.numero),
        area: p.classe,
        tribunal: p.tribunal,
        vara: p.vara,
        parteContraria: p.poloPassivo.join(", ") || null,
        descricao: [`${PREFIXO_IMPORTADO} pela OAB ${oab}.`, ...partes].join("\n"),
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
    arquivados: resultado.processos.filter((p) => statusDe(p.numero) === "ARQUIVADO").length,
    ativos: resultado.processos.filter((p) => statusDe(p.numero) === "ATIVO").length,
    novos,
    publicacoes: novasPublicacoes.length,
    incompleto: resultado.incompleto,
  };
}
