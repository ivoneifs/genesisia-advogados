import type { Prisma } from "@prisma/client";

// Arquivado/encerrado aparecem como "Inativo" na lista.
export const STATUS_INATIVOS = ["ARQUIVADO", "ENCERRADO"];

/** Filtro da lista de processos (status + busca), usado pela página e pelo CSV. */
export function whereProcessos(
  escritorioId: string,
  status: string,
  q?: string
): Prisma.ProcessoWhereInput {
  const busca = q?.trim();
  return {
    escritorioId,
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
          ],
        }
      : {}),
  };
}
