// Importação completa de processos e publicações do DJEN por OAB.
// Roda em segundo plano (depois da resposta ao navegador) e grava o
// progresso em ImportacaoOab, que a tela consulta a cada poucos segundos.

import { prisma } from "@/lib/db";
import { buscarProcessosPorOab } from "@/lib/djen";
import { processosEncerrados } from "@/lib/datajud";

// Processos importados entram vinculados a este cliente até o advogado
// reclassificar (o DJEN não informa qual das partes é o cliente).
const CLIENTE_IMPORTADOS = "Importados via OAB (a classificar)";
export const PREFIXO_IMPORTADO = "Importado do DJEN";
// Até ~10.000 comunicações por OAB.
const MAX_PAGINAS = 100;

const soDigitos = (s: string) => s.replace(/\D/g, "");

export type ImportacaoResumo = {
  id: string;
  oab: string;
  uf: string;
  status: string; // RODANDO | CONCLUIDA | ERRO | INTERROMPIDA
  baixadas: number;
  total: number;
  processos: number;
  novos: number;
  ativos: number;
  arquivados: number;
  publicacoes: number;
  erro: string | null;
};

// Sem atualização há mais que isso, a importação foi interrompida (ex.: deploy).
export const PARADA_MS = 3 * 60_000;

export function resumoImportacao(i: {
  id: string; oab: string; uf: string; status: string; baixadas: number; total: number;
  processos: number; novos: number; ativos: number; arquivados: number; publicacoes: number;
  erro: string | null; updatedAt: Date;
}): ImportacaoResumo {
  const parada = i.status === "RODANDO" && Date.now() - i.updatedAt.getTime() > PARADA_MS;
  const { updatedAt, ...resto } = i;
  void updatedAt;
  return { ...resto, status: parada ? "INTERROMPIDA" : i.status };
}

/** Última importação do escritório (para retomar o acompanhamento ao abrir a página). */
export async function ultimaImportacao(escritorioId: string): Promise<ImportacaoResumo | null> {
  const imp = await prisma.importacaoOab.findFirst({
    where: { escritorioId },
    orderBy: { createdAt: "desc" },
  });
  return imp ? resumoImportacao(imp) : null;
}


export async function executarImportacao(importacaoId: string, userId: string | null) {
  const imp = await prisma.importacaoOab.findUnique({ where: { id: importacaoId } });
  if (!imp) return;
  const { escritorioId, oab: numeroOab, uf } = imp;
  const oab = `${numeroOab}/${uf}`;

  try {
    const resultado = await buscarProcessosPorOab(numeroOab, uf, {
      maxPaginas: MAX_PAGINAS,
      esperarLimite: true,
      aoProgresso: (baixadas, total) =>
        prisma.importacaoOab
          .update({ where: { id: importacaoId }, data: { baixadas, total } })
          .then(() => undefined),
    });

    // Cadastra o advogado da OAB (para assinatura das peças e alertas).
    const nome = resultado.processos
      .flatMap((p) => p.advogados)
      .find((a) => soDigitos(a.oab).replace(/^0+/, "") === numeroOab.replace(/^0+/, "") && a.uf === uf)?.nome;
    if (nome) {
      await prisma.advogado.upsert({
        where: { escritorioId_oab_uf: { escritorioId, oab: numeroOab, uf } },
        create: { escritorioId, oab: numeroOab, uf, nome },
        update: {},
      });
    }

    // Situação no DataJud (CNJ): baixados/arquivados entram como ARQUIVADO.
    const encerrados = await processosEncerrados(resultado.processos).catch(
      () => new Set<string>()
    );
    const statusDe = (numero: string) =>
      encerrados.has(soDigitos(numero)) ? "ARQUIVADO" : "ATIVO";

    const existentes = await prisma.processo.findMany({
      where: { escritorioId },
      select: { id: true, numero: true, status: true, descricao: true },
    });
    const idPorNumero = new Map(existentes.map((p) => [soDigitos(p.numero), p.id]));
    const existentePorId = new Map(existentes.map((p) => [p.id, p]));
    const criadosAgora = new Set<string>();

    let clienteId: string | null = null;
    for (const p of resultado.processos) {
      const existenteId = idPorNumero.get(soDigitos(p.numero));
      if (existenteId) {
        // Atualiza advogados e arquiva os importados que o DataJud indica como
        // baixados. Status editado à mão é preservado.
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
          responsavelId: userId,
        },
        select: { id: true },
      });
      idPorNumero.set(soDigitos(p.numero), criado.id);
      criadosAgora.add(criado.id);
    }

    // Publicações: grava as comunicações que ainda não existem em cada processo.
    const processoIds = resultado.processos.map((p) => idPorNumero.get(soDigitos(p.numero))!);
    const jaGravadas = await prisma.publicacao.findMany({
      where: { escritorioId, processoId: { in: processoIds } },
      select: { processoId: true, dataPublicacao: true, conteudo: true },
    });
    const chave = (processoId: string, data: Date | null, conteudo: string) =>
      `${processoId}|${data?.toISOString().slice(0, 10)}|${conteudo}`;
    const vistas = new Set(jaGravadas.map((x) => chave(x.processoId!, x.dataPublicacao, x.conteudo)));

    const novas = [];
    for (const p of resultado.processos) {
      const processoId = idPorNumero.get(soDigitos(p.numero))!;
      for (const c of p.comunicacoes) {
        const conteudo = `${c.tipo}: ${c.texto}`.trim();
        const k = chave(processoId, c.data, conteudo);
        if (vistas.has(k)) continue;
        vistas.add(k);
        novas.push({
          escritorioId,
          processoId,
          conteudo,
          diario: c.diario,
          dataPublicacao: c.data,
          // Histórico de processo recém-importado não vira alerta no WhatsApp.
          alertaEnviado: criadosAgora.has(processoId),
        });
      }
    }
    for (let i = 0; i < novas.length; i += 500) {
      await prisma.publicacao.createMany({ data: novas.slice(i, i + 500) });
    }

    const arquivados = resultado.processos.filter((p) => statusDe(p.numero) === "ARQUIVADO").length;
    await prisma.importacaoOab.update({
      where: { id: importacaoId },
      data: {
        status: "CONCLUIDA",
        processos: resultado.processos.length,
        novos: criadosAgora.size,
        ativos: resultado.processos.length - arquivados,
        arquivados,
        publicacoes: novas.length,
        erro: resultado.incompleto ? "Limite de páginas atingido: vieram as publicações mais recentes." : null,
      },
    });
  } catch (e) {
    console.error(`[importacao-oab] ${oab}:`, e);
    await prisma.importacaoOab
      .update({
        where: { id: importacaoId },
        data: { status: "ERRO", erro: (e instanceof Error ? e.message : String(e)).slice(0, 300) },
      })
      .catch(() => {});
  }
}
