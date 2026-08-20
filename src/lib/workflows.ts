import { prisma } from "@/lib/db";

export const GATILHOS = [
  {
    value: "PRAZO_ALTA",
    label: "Prazo de alta prioridade cadastrado",
    descricao:
      'Cria automaticamente uma tarefa "Preparar" alguns dias antes do vencimento.',
  },
  {
    value: "PUBLICACAO_NOVA",
    label: "Nova publicação recebida",
    descricao: "Cria uma tarefa para revisar a publicação no mesmo dia.",
  },
  {
    value: "PROCESSO_ENCERRADO",
    label: "Processo arquivado ou encerrado",
    descricao:
      "Cria uma tarefa para conferir pendências financeiras do processo.",
  },
] as const;

type Gatilho = (typeof GATILHOS)[number]["value"];

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export async function runWorkflows(
  gatilho: Gatilho,
  ctx: {
    processoId?: string | null;
    prazoTitulo?: string;
    prazoVencimento?: Date;
    processoNumero?: string;
  }
) {
  const workflows = await prisma.workflow.findMany({
    where: { gatilho, ativo: true },
  });

  for (const wf of workflows) {
    let titulo = "";
    let data = new Date();

    if (gatilho === "PRAZO_ALTA" && ctx.prazoVencimento) {
      titulo = `Preparar: ${ctx.prazoTitulo ?? "prazo"}`;
      data = addDays(ctx.prazoVencimento, -wf.diasAntes);
    } else if (gatilho === "PUBLICACAO_NOVA") {
      titulo = "Revisar publicação recebida";
      data = new Date();
    } else if (gatilho === "PROCESSO_ENCERRADO") {
      titulo = `Conferir pendências financeiras — ${ctx.processoNumero ?? ""}`;
      data = addDays(new Date(), wf.diasAntes || 2);
    } else {
      continue;
    }

    await prisma.tarefa.create({
      data: {
        titulo,
        data,
        tipo: "TAREFA",
        processoId: ctx.processoId ?? null,
      },
    });

    await prisma.workflow.update({
      where: { id: wf.id },
      data: { execucoes: { increment: 1 } },
    });
  }
}
