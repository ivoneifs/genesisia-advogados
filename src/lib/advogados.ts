// Advogados de um processo (gravados em Processo.advogados como JSON).

export type Advogado = { nome: string; oab: string; uf: string };

/** Lê o JSON do banco com segurança (ignora formatos inesperados). */
export function parseAdvogados(json: unknown): Advogado[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (a): a is Advogado =>
      !!a &&
      typeof a === "object" &&
      typeof (a as Advogado).nome === "string" &&
      typeof (a as Advogado).oab === "string" &&
      typeof (a as Advogado).uf === "string"
  );
}

export function formatOab(a: Advogado): string {
  return `OAB ${a.oab}/${a.uf}`;
}

export function formatAdvogado(a: Advogado): string {
  return `${a.nome} (${formatOab(a)})`;
}
