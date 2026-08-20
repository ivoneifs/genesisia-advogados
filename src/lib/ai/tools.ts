import type OpenAI from "openai";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";

export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "buscar_processos",
      description:
        "Busca processos do escritório por número, nome do cliente ou parte contrária. Retorna número, cliente, área, status e prazos pendentes.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Termo de busca (número, cliente ou parte contrária). Deixe vazio para listar os mais recentes.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detalhe_processo",
      description:
        "Retorna todos os detalhes de um processo específico: dados gerais, prazos, tarefas da agenda e lançamentos financeiros vinculados.",
      parameters: {
        type: "object",
        properties: {
          numero: { type: "string", description: "Número do processo (pode ser parcial)" },
        },
        required: ["numero"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_prazos",
      description:
        "Lista prazos pendentes do escritório, ordenados por vencimento. Útil para responder 'quais meus prazos essa semana' ou 'o que está atrasado'.",
      parameters: {
        type: "object",
        properties: {
          apenas_atrasados: {
            type: "boolean",
            description: "Se true, retorna apenas prazos já vencidos.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_clientes",
      description: "Busca clientes cadastrados por nome. Retorna dados de contato e quantos processos cada um tem.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nome ou parte do nome do cliente." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resumo_financeiro",
      description:
        "Retorna o resumo financeiro do escritório: receitas recebidas, receitas pendentes e despesas pagas.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export async function executeTool(
  escritorioId: string,
  name: string,
  input: unknown
): Promise<string> {
  const args = (input ?? {}) as Record<string, unknown>;

  switch (name) {
    case "buscar_processos": {
      const query = String(args.query ?? "").trim();
      const processos = await prisma.processo.findMany({
        where: {
          escritorioId,
          ...(query
            ? {
                OR: [
                  { numero: { contains: query } },
                  { parteContraria: { contains: query } },
                  { cliente: { nome: { contains: query } } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          cliente: true,
          prazos: { where: { status: "PENDENTE" }, orderBy: { dataVencimento: "asc" } },
        },
      });

      if (processos.length === 0) return "Nenhum processo encontrado.";

      return processos
        .map(
          (p) =>
            `- ${p.numero} | Cliente: ${p.cliente.nome} | Área: ${p.area ?? "—"} | Status: ${p.status}` +
            (p.prazos.length
              ? ` | Prazos pendentes: ${p.prazos
                  .map((pr) => `${pr.titulo} (${formatDate(pr.dataVencimento)})`)
                  .join(", ")}`
              : "")
        )
        .join("\n");
    }

    case "detalhe_processo": {
      const numero = String(args.numero ?? "").trim();
      const processo = await prisma.processo.findFirst({
        where: { numero: { contains: numero }, escritorioId },
        include: {
          cliente: true,
          prazos: { orderBy: { dataVencimento: "asc" } },
          tarefas: { orderBy: { data: "asc" } },
          financeiros: { orderBy: { vencimento: "asc" } },
        },
      });

      if (!processo) return `Nenhum processo encontrado com número contendo "${numero}".`;

      const linhas = [
        `Processo ${processo.numero} — ${processo.status}`,
        `Cliente: ${processo.cliente.nome}`,
        `Área: ${processo.area ?? "—"} | Tribunal: ${processo.tribunal ?? "—"} | Vara: ${processo.vara ?? "—"}`,
        `Parte contrária: ${processo.parteContraria ?? "—"}`,
        processo.valorCausa != null ? `Valor da causa: ${formatCurrency(processo.valorCausa)}` : "",
        processo.descricao ? `Descrição: ${processo.descricao}` : "",
        "",
        "Prazos:",
        ...(processo.prazos.length
          ? processo.prazos.map(
              (pr) => `  - ${pr.titulo} | ${pr.status} | ${pr.prioridade} | vence ${formatDate(pr.dataVencimento)}`
            )
          : ["  (nenhum)"]),
        "",
        "Agenda:",
        ...(processo.tarefas.length
          ? processo.tarefas.map((t) => `  - ${t.titulo} | ${formatDate(t.data)} | ${t.concluida ? "concluída" : "pendente"}`)
          : ["  (nenhuma)"]),
        "",
        "Financeiro:",
        ...(processo.financeiros.length
          ? processo.financeiros.map(
              (f) => `  - ${f.descricao} | ${f.tipo} | ${formatCurrency(f.valor)} | ${f.status}`
            )
          : ["  (nenhum)"]),
      ];

      return linhas.filter(Boolean).join("\n");
    }

    case "buscar_prazos": {
      const apenasAtrasados = Boolean(args.apenas_atrasados);
      const prazos = await prisma.prazo.findMany({
        where: {
          status: "PENDENTE",
          escritorioId,
          ...(apenasAtrasados ? { dataVencimento: { lt: new Date() } } : {}),
        },
        orderBy: { dataVencimento: "asc" },
        take: 20,
        include: { processo: { include: { cliente: true } } },
      });

      if (prazos.length === 0) return "Nenhum prazo pendente encontrado.";

      return prazos
        .map(
          (p) =>
            `- ${p.titulo} | vence ${formatDate(p.dataVencimento)} | prioridade ${p.prioridade} | processo ${p.processo.numero} (${p.processo.cliente.nome})`
        )
        .join("\n");
    }

    case "buscar_clientes": {
      const query = String(args.query ?? "").trim();
      const clientes = await prisma.cliente.findMany({
        where: { escritorioId, ...(query ? { nome: { contains: query } } : {}) },
        take: 10,
        orderBy: { nome: "asc" },
        include: { _count: { select: { processos: true } } },
      });

      if (clientes.length === 0) return "Nenhum cliente encontrado.";

      return clientes
        .map(
          (c) =>
            `- ${c.nome} (${c.tipo}) | ${c.email ?? "sem e-mail"} | ${c.telefone ?? "sem telefone"} | ${c._count.processos} processo(s)`
        )
        .join("\n");
    }

    case "resumo_financeiro": {
      const [receitasPagas, receitasPendentes, despesasPagas] = await Promise.all([
        prisma.financeiro.aggregate({ _sum: { valor: true }, where: { tipo: "RECEITA", status: "PAGO", escritorioId } }),
        prisma.financeiro.aggregate({ _sum: { valor: true }, where: { tipo: "RECEITA", status: { not: "PAGO" }, escritorioId } }),
        prisma.financeiro.aggregate({ _sum: { valor: true }, where: { tipo: "DESPESA", status: "PAGO", escritorioId } }),
      ]);

      return [
        `Receitas recebidas: ${formatCurrency(receitasPagas._sum.valor ?? 0)}`,
        `Receitas pendentes: ${formatCurrency(receitasPendentes._sum.valor ?? 0)}`,
        `Despesas pagas: ${formatCurrency(despesasPagas._sum.valor ?? 0)}`,
        `Saldo: ${formatCurrency((receitasPagas._sum.valor ?? 0) - (despesasPagas._sum.valor ?? 0))}`,
      ].join("\n");
    }

    default:
      return `Ferramenta desconhecida: ${name}`;
  }
}
