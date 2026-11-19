import type { Prisma } from "@prisma/client";
import { GRUPOS_PAPEIS } from "@/lib/papeis-processuais";

// Arquivado/encerrado aparecem como "Inativo" na lista.
export const STATUS_INATIVOS = ["ARQUIVADO", "ENCERRADO"];

/** Filtro da lista de processos (status + busca), usado pela página e pelo CSV. */
export function whereProcessos(
  escritorioId: string,
  status: string,
  q?: string,
  papel?: string
): Prisma.ProcessoWhereInput {
  const busca = q?.trim();
  const grupo = papel?.startsWith("grupo:") ? GRUPOS_PAPEIS.find((g) => g.grupo === papel.slice(6)) : null;
  return {
    escritorioId,
    ...(grupo ? { papelCliente: { in: grupo.papeis } } : papel === "SEM" ? { papelCliente: null } : papel ? { papelCliente: papel } : {}),
    ...(status === "INATIVO"
      ? { status: { in: STATUS_INATIVOS } }
      : status !== "TODOS"
        ? { status }
        : {}),
    ...(busca
      ? {
          OR: [
            { numero: { contains: busca } },
            { parteContraria: { contains: busca, mode: "insensitive" } },
            { cliente: { nome: { contains: busca, mode: "insensitive" } } },
            { area: { contains: busca, mode: "insensitive" } },
            { vara: { contains: busca, mode: "insensitive" } },
            { papelCliente: { contains: busca, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}
