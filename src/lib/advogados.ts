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

export type AdvogadoAssinatura = {
  nome: string;
  oab: string;
  uf: string;
  email?: string | null;
};

/**
 * Preenche nos modelos fixos os marcadores do advogado que assina.
 * Linhas que falam de outro advogado (ex.: o substabelecido) ficam intactas.
 */
export function assinarModelo(texto: string, a: AdvogadoAssinatura): string {
  const oab = `OAB/${a.uf} nº ${a.oab}`;
  return texto
    .split("\n")
    .map((linha) => {
      if (/novo advogado/i.test(linha)) return linha;
      let l = linha
        .replace(/\[Nome do\(a\) advogado\(a\)\]|\[Nome do Advogado(?: Substabelecente)?\]/g, a.nome)
        .replace(/OAB\/\[UF\] (?:nº )?\[número\]/g, oab)
        .replace(/na OAB sob o nº \[OAB\]/g, `na OAB/${a.uf} sob o nº ${a.oab}`);
      if (a.email) l = l.replace(/\[e-mail do advogado\/cliente\]/g, a.email);
      return l;
    })
    .join("\n");
}
