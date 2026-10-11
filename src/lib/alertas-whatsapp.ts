// Motor dos alertas por WhatsApp. Roda a cada poucos minutos (ver
// instrumentation.ts) e decide, para cada escritório com alertas ligados, o
// que precisa ser avisado e a quem. A tabela AlertaEnviado (chave única)
// garante que o mesmo alerta nunca sai duas vezes.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { motivoBloqueio } from "@/lib/acesso";
import {
  diaBRSoDia,
  formatDate,
  formatDateTimeBR,
  inicioDoDiaBR,
  toInputDateTimeBR,
} from "@/lib/format";
import {
  INSTANCIA_CENTRAL,
  enviarTexto,
  evolutionConfigurada,
  normalizarWhatsapp,
} from "@/lib/whatsapp";

type Destino = { numero: string; nome: string };

const TIPO_TAREFA: Record<string, string> = {
  AUDIENCIA: "Audiência",
  REUNIAO: "Reunião",
  TAREFA: "Tarefa",
  PRAZO: "Prazo",
};

// Pausa entre mensagens para não parecer disparo em massa ao WhatsApp.
const INTERVALO_MS = 1500;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

function agoraBR() {
  const s = toInputDateTimeBR(new Date()); // AAAA-MM-DDTHH:mm
  return { dia: s.slice(0, 10), hora: Number(s.slice(11, 13)) };
}

function soDigitos(s: unknown) {
  return String(s ?? "").replace(/\D/g, "");
}

/** OABs (dígitos+UF) listadas no JSON `advogados` de um processo. */
function oabsDoProcesso(advogados: Prisma.JsonValue | null | undefined): Set<string> {
  const set = new Set<string>();
  if (Array.isArray(advogados)) {
    for (const a of advogados) {
      if (a && typeof a === "object" && !Array.isArray(a)) {
        const oab = soDigitos((a as Record<string, unknown>).oab).replace(/^0+/, "");
        const uf = String((a as Record<string, unknown>).uf ?? "").toUpperCase();
        if (oab) set.add(`${oab}/${uf}`);
      }
    }
  }
  return set;
}

function unicos(lista: Destino[]): Destino[] {
  const vistos = new Map<string, Destino>();
  for (const d of lista) if (!vistos.has(d.numero)) vistos.set(d.numero, d);
  return [...vistos.values()];
}

type Contexto = {
  escritorioId: string;
  escritorioNome: string;
  instancia: string;
  usuarios: (Destino & { id: string })[];
  advogados: (Destino & { chaveOab: string })[];
};

/** Quem recebe um alerta interno: responsável + advogados do processo; senão, todos. */
function destinosInternos(
  ctx: Contexto,
  responsavelId: string | null,
  advogadosProcesso: Prisma.JsonValue | null | undefined
): Destino[] {
  const lista: Destino[] = [];
  const resp = ctx.usuarios.find((u) => u.id === responsavelId);
  if (resp) lista.push(resp);
  const oabs = oabsDoProcesso(advogadosProcesso);
  for (const a of ctx.advogados) if (oabs.has(a.chaveOab)) lista.push(a);
  if (lista.length === 0) lista.push(...ctx.usuarios, ...ctx.advogados);
  return unicos(lista);
}

/** Registra e envia. Retorna false se a chave já existia (alerta já enviado). */
async function enviar(
  ctx: Contexto,
  tipo: string,
  chave: string,
  destino: Destino,
  texto: string
): Promise<boolean> {
  try {
    await prisma.alertaEnviado.create({
      data: {
        chave,
        tipo,
        destino: destino.numero,
        nome: destino.nome,
        escritorioId: ctx.escritorioId,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
    throw e;
  }
  try {
    await enviarTexto(ctx.instancia, destino.numero, texto);
  } catch (e) {
    await prisma.alertaEnviado.update({
      where: { chave },
      data: { ok: false, erro: String(e instanceof Error ? e.message : e).slice(0, 500) },
    });
  }
  await espera(INTERVALO_MS);
  return true;
}

const rodape = (ctx: Contexto) => `\n\n_${ctx.escritorioNome} · Genesis IA_`;

async function alertasAgenda(ctx: Contexto, avisarClientes: boolean, hora: number) {
  const agora = new Date();
  const tarefas = await prisma.tarefa.findMany({
    where: {
      escritorioId: ctx.escritorioId,
      concluida: false,
      data: { gt: agora, lte: new Date(agora.getTime() + 24 * 3600_000) },
    },
    include: {
      processo: {
        select: {
          numero: true,
          advogados: true,
          cliente: { select: { nome: true, telefone: true, receberWhatsapp: true } },
        },
      },
    },
  });

  for (const t of tarefas) {
    const faltaMin = (t.data.getTime() - agora.getTime()) / 60_000;
    // Até 1h antes: lembrete curto. Antes disso: lembrete do dia anterior,
    // só em horário comercial (7h–21h).
    const etapa = faltaMin <= 60 ? "1h" : "24h";
    if (etapa === "24h" && (hora < 7 || hora >= 21)) continue;

    const tipo = TIPO_TAREFA[t.tipo] ?? "Compromisso";
    const quando = formatDateTimeBR(t.data);
    const linhas = [
      etapa === "1h" ? `⏰ *Em breve: ${tipo}*` : `📅 *Lembrete: ${tipo}*`,
      `*${t.titulo}*`,
      `🗓 ${quando}`,
    ];
    if (t.processo) linhas.push(`⚖️ Processo ${t.processo.numero}`);
    if (t.descricao) linhas.push("", t.descricao.slice(0, 300));
    const texto = linhas.join("\n") + rodape(ctx);

    for (const d of destinosInternos(ctx, t.responsavelId, t.processo?.advogados)) {
      await enviar(ctx, "AGENDA", `agenda:${t.id}:${etapa}:${d.numero}`, d, texto);
    }

    // Cliente: só audiências e reuniões, um aviso na véspera/no dia.
    const cli = t.processo?.cliente;
    const numeroCli = normalizarWhatsapp(cli?.telefone);
    if (
      avisarClientes &&
      etapa === "24h" &&
      cli?.receberWhatsapp &&
      numeroCli &&
      (t.tipo === "AUDIENCIA" || t.tipo === "REUNIAO")
    ) {
      const msg =
        `Olá, ${cli.nome.split(" ")[0]}! Passando para lembrar do seu compromisso:\n\n` +
        `*${tipo}* — ${quando}` +
        (t.processo ? `\nProcesso ${t.processo.numero}` : "") +
        `\n\nEm caso de dúvida, fale com o escritório ${ctx.escritorioNome}.`;
      await enviar(ctx, "AGENDA", `agenda-cliente:${t.id}:${numeroCli}`, {
        numero: numeroCli,
        nome: cli.nome,
      }, msg);
    }
  }
}

async function alertasPrazos(ctx: Contexto) {
  // Prazos são datas "só dia" (meia-noite UTC): avisa no dia, na véspera e 3 dias antes.
  const etapas = [0, 1, 3];
  const prazos = await prisma.prazo.findMany({
    where: {
      escritorioId: ctx.escritorioId,
      status: "PENDENTE",
      dataVencimento: { in: etapas.map((n) => diaBRSoDia(n)) },
    },
    include: { processo: { select: { numero: true, advogados: true } } },
  });

  for (const p of prazos) {
    const n = etapas.find(
      (e) => diaBRSoDia(e).getTime() === p.dataVencimento.getTime()
    );
    if (n === undefined) continue;
    const quando = n === 0 ? "*vence HOJE*" : n === 1 ? "vence *amanhã*" : `vence em *${n} dias*`;
    const texto =
      `${n === 0 ? "🚨" : "⚠️"} *Prazo processual*\n` +
      `*${p.titulo}* ${quando} (${formatDate(p.dataVencimento)})\n` +
      `⚖️ Processo ${p.processo.numero}` +
      (p.prioridade === "ALTA" ? "\n🔴 Prioridade alta" : "") +
      rodape(ctx);
    for (const d of destinosInternos(ctx, p.responsavelId, p.processo.advogados)) {
      await enviar(ctx, "PRAZO", `prazo:${p.id}:D${n}:${d.numero}`, d, texto);
    }
  }
}

async function alertasPublicacoes(ctx: Contexto) {
  const novas = await prisma.publicacao.findMany({
    where: { escritorioId: ctx.escritorioId, alertaEnviado: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      diario: true,
      dataPublicacao: true,
      processo: { select: { numero: true } },
    },
  });
  if (novas.length === 0) return;

  // Marca antes de enviar: se o envio falhar, não reenvia em loop.
  await prisma.publicacao.updateMany({
    where: { id: { in: novas.map((p) => p.id) } },
    data: { alertaEnviado: true },
  });

  const linhas = novas.slice(0, 8).map((p) => {
    const data = p.dataPublicacao ? formatDate(p.dataPublicacao) : "";
    return `• ${p.processo?.numero ?? "Sem processo vinculado"}${p.diario ? ` — ${p.diario}` : ""}${data ? ` (${data})` : ""}`;
  });
  if (novas.length > 8) linhas.push(`• … e mais ${novas.length - 8}`);
  const texto =
    `📰 *${novas.length} nova(s) publicação(ões)*\n\n${linhas.join("\n")}\n\n` +
    `Confira em Publicações no Genesis IA.` +
    rodape(ctx);

  const lote = novas[0].id;
  for (const d of unicos([...ctx.usuarios, ...ctx.advogados])) {
    await enviar(ctx, "PUBLICACOES", `pub:${lote}:${d.numero}`, d, texto);
  }
}

async function resumoDiario(ctx: Contexto, dia: string, hora: number) {
  const [tarefas, prazos, publicacoes] = await Promise.all([
    prisma.tarefa.findMany({
      where: {
        escritorioId: ctx.escritorioId,
        concluida: false,
        data: { gte: inicioDoDiaBR(0), lt: inicioDoDiaBR(1) },
      },
      orderBy: { data: "asc" },
      select: { titulo: true, data: true, tipo: true },
    }),
    prisma.prazo.findMany({
      where: {
        escritorioId: ctx.escritorioId,
        status: "PENDENTE",
        dataVencimento: { lte: diaBRSoDia(0) },
      },
      orderBy: { dataVencimento: "asc" },
      select: { titulo: true, dataVencimento: true, processo: { select: { numero: true } } },
    }),
    prisma.publicacao.count({
      where: { escritorioId: ctx.escritorioId, status: "NAO_TRATADA" },
    }),
  ]);
  if (tarefas.length === 0 && prazos.length === 0 && publicacoes === 0) return;

  const hojeSoDia = diaBRSoDia(0).getTime();
  const partes = [`☀️ *${hora < 12 ? "Bom dia" : "Boa tarde"}! Resumo de hoje*`];
  if (tarefas.length) {
    partes.push(
      "",
      `📅 *Agenda (${tarefas.length})*`,
      ...tarefas.slice(0, 10).map(
        (t) => `• ${formatDateTimeBR(t.data).slice(-5)} — ${TIPO_TAREFA[t.tipo] ?? "Compromisso"}: ${t.titulo}`
      )
    );
  }
  if (prazos.length) {
    partes.push(
      "",
      `⚠️ *Prazos vencendo hoje ou atrasados (${prazos.length})*`,
      ...prazos.slice(0, 10).map(
        (p) =>
          `• ${p.titulo} — ${p.processo.numero}${p.dataVencimento.getTime() < hojeSoDia ? ` (atrasado desde ${formatDate(p.dataVencimento)})` : ""}`
      )
    );
  }
  if (publicacoes) partes.push("", `📰 ${publicacoes} publicação(ões) não tratada(s)`);
  const texto = partes.join("\n") + rodape(ctx);

  for (const d of unicos([...ctx.usuarios, ...ctx.advogados])) {
    await enviar(ctx, "RESUMO", `resumo:${dia}:${d.numero}`, d, texto);
  }
}

let rodando = false;

/** Uma passada completa por todos os escritórios. */
export async function processarAlertas() {
  if (rodando || !evolutionConfigurada()) return;
  rodando = true;
  try {
    const { dia, hora } = agoraBR();
    const configs = await prisma.configWhatsapp.findMany({
      where: { ativo: true },
      include: { escritorio: true },
    });

    for (const cfg of configs) {
      const instancia = cfg.instancia || INSTANCIA_CENTRAL;
      if (!instancia || motivoBloqueio(cfg.escritorio)) continue;

      const [usuarios, advogados] = await Promise.all([
        prisma.user.findMany({
          where: { escritorioId: cfg.escritorioId, ativo: true, whatsapp: { not: null } },
          select: { id: true, name: true, whatsapp: true },
        }),
        prisma.advogado.findMany({
          where: { escritorioId: cfg.escritorioId, ativo: true, telefone: { not: null } },
          select: { nome: true, telefone: true, oab: true, uf: true },
        }),
      ]);

      const ctx: Contexto = {
        escritorioId: cfg.escritorioId,
        escritorioNome: cfg.escritorio.nome,
        instancia,
        usuarios: usuarios.flatMap((u) => {
          const numero = normalizarWhatsapp(u.whatsapp);
          return numero ? [{ id: u.id, nome: u.name, numero }] : [];
        }),
        advogados: advogados.flatMap((a) => {
          const numero = normalizarWhatsapp(a.telefone);
          return numero
            ? [{ nome: a.nome, numero, chaveOab: `${a.oab.replace(/^0+/, "")}/${a.uf.toUpperCase()}` }]
            : [];
        }),
      };

      try {
        if (cfg.agenda) await alertasAgenda(ctx, cfg.clientes, hora);
        if (hora >= 7 && hora < 21) {
          if (cfg.prazos && hora >= cfg.horaResumo) await alertasPrazos(ctx);
          if (cfg.publicacoes) await alertasPublicacoes(ctx);
          // Janela de 3h para não perder o resumo se o servidor reiniciar na hora.
          if (cfg.resumoDiario && hora >= cfg.horaResumo && hora < cfg.horaResumo + 3) {
            await resumoDiario(ctx, dia, hora);
          }
        }
      } catch (e) {
        console.error(`[alertas-whatsapp] escritório ${cfg.escritorioId}:`, e);
      }
    }
  } finally {
    rodando = false;
  }
}
