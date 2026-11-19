// Leitura do CNIS (Extrato Previdenciário do Meu INSS) a partir do texto do PDF.
// Extrai dados do segurado, vínculos (com datas e indicadores) e remunerações
// ou contribuições. O texto de PDF varia, então o parser é tolerante; quando
// não encontra nada, a rota /api/prev/cnis recorre à IA.

import { deBR } from "./datas";
import type { SalarioContribuicao } from "./media";
import type { Periodo, TipoPeriodo } from "./tempo";

export type VinculoCnis = {
  seq: number;
  origem: string;
  tipoFiliado: string;
  inicio: string | null;
  fim: string | null;
  indicadores: string[];
  remuneracoes: SalarioContribuicao[];
};

export type ResultadoCnis = {
  segurado: { nome?: string; cpf?: string; nit?: string; nascimento?: string; mae?: string };
  vinculos: VinculoCnis[];
  avisos: string[];
};

const NIT = String.raw`\d{3}\.\d{5}\.\d{2}-\d|\d\.\d{3}\.\d{3}\.\d{3}-\d|\d{11}`;
const DATA = String.raw`\d{2}\/\d{2}\/\d{4}`;

// Indicadores do CNIS que merecem atenção do advogado.
export const INDICADORES: Record<string, string> = {
  IEAN: "Exposição a agente nocivo (possível tempo especial — confira o PPP)",
  "PREM-EXT": "Remuneração informada fora do prazo (extemporânea)",
  PEXT: "Vínculo/remuneração extemporânea — pode exigir comprovação",
  "AVRC-DEF": "Acerto de vínculo/remuneração deferido",
  "PADM-EMPR": "Empregado com vínculo que exige comprovação",
  "IREM-INDPEND": "Remunerações com indicadores/pendências",
  "PREC-MENOR-MIN": "Recolhimento abaixo do mínimo (pode precisar complementar)",
  "PREC-FACULTCONC": "Recolhimento de facultativo concomitante",
  "IREC-LC123": "Recolhimento no plano simplificado (11%/5%) — não conta para tempo de contribuição sem complementação",
  "PRPPS": "Vínculo com regime próprio (RPPS)",
  "AEXT-VT": "Vínculo extemporâneo",
  "PVIN-IRREG": "Vínculo com irregularidade",
};

function valorBR(v: string): number {
  return Number(v.replace(/\./g, "").replace(",", "."));
}

function limparOrigem(s: string): string {
  return s
    .replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, "")
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TIPOS_FILIADO = [
  "Empregado ou Agente Público",
  "Empregado Doméstico",
  "Contribuinte Individual",
  "Facultativo",
  "Segurado Especial",
  "Trabalhador Avulso",
  "Benefício",
  "Agente Público",
  "Empregado",
];

// Tira o acento letra a letra, mantendo o tamanho (o índice vale para o texto original).
const semAcento = (x: string) => Array.from(x, (c) => c.normalize("NFD")[0]).join("").toLowerCase();

function separarTipo(origem: string): { origem: string; tipo: string } {
  for (const t of TIPOS_FILIADO) {
    const i = semAcento(origem).lastIndexOf(semAcento(t));
    if (i >= 0) return { origem: (origem.slice(0, i) + origem.slice(i + t.length)).trim(), tipo: t };
  }
  return { origem, tipo: "" };
}

export function lerCnis(texto: string): ResultadoCnis {
  const t = texto.replace(/\r/g, "").replace(/[ \t]+/g, " ");
  const avisos: string[] = [];
  const segurado: ResultadoCnis["segurado"] = {};

  const nome = t.match(/Nome:\s*([A-ZÀ-Ú][A-ZÀ-Ú' .-]{3,80}?)(?:\s+(?:Data|CPF|Nome da m|NIT)|\n)/i);
  if (nome) segurado.nome = nome[1].trim();
  const cpf = t.match(/CPF:\s*(\d{3}\.\d{3}\.\d{3}-\d{2})/i);
  if (cpf) segurado.cpf = cpf[1];
  const nit = t.match(new RegExp(String.raw`NIT:\s*(${NIT})`, "i"));
  if (nit) segurado.nit = nit[1];
  const nasc = t.match(new RegExp(String.raw`Data de nascimento:\s*(${DATA})`, "i"));
  if (nasc) segurado.nascimento = deBR(nasc[1]) ?? undefined;
  const mae = t.match(/Nome da m[ãa]e:\s*([A-ZÀ-Ú][A-ZÀ-Ú' .-]{3,80}?)(?:\s+(?:Data|CPF|NIT)|\n)/i);
  if (mae) segurado.mae = mae[1].trim();

  // Cabeçalhos de vínculo: "Seq NIT ... dd/mm/aaaa [dd/mm/aaaa]"
  const reCab = new RegExp(String.raw`(?:^|\n)\s*(\d{1,3})\s+(${NIT})\s+([^\n]*?)(${DATA})(?:\s+(${DATA}))?`, "g");
  const cabecalhos: { idx: number; fimIdx: number; m: RegExpExecArray }[] = [];
  let m: RegExpExecArray | null;
  while ((m = reCab.exec(t))) cabecalhos.push({ idx: m.index, fimIdx: reCab.lastIndex, m });

  const vinculos: VinculoCnis[] = [];
  cabecalhos.forEach((c, i) => {
    const bloco = t.slice(c.fimIdx, i + 1 < cabecalhos.length ? cabecalhos[i + 1].idx : t.length);
    const { origem, tipo } = separarTipo(limparOrigem(c.m[3]));
    const remuneracoes: SalarioContribuicao[] = [];
    // Contribuições: "MM/AAAA dd/mm/aaaa contribuição salário" ou remuneração: "MM/AAAA valor"
    const reRem = new RegExp(String.raw`(?:^|\s)(\d{2})\/(\d{4})\s+(?:(${DATA})\s+)?([\d.]+,\d{2})(?:\s+([\d.]+,\d{2}))?`, "g");
    let r: RegExpExecArray | null;
    while ((r = reRem.exec(bloco))) {
      const mes = Number(r[1]);
      if (mes < 1 || mes > 12) continue;
      const comp = `${r[2]}-${r[1]}`;
      const valor = r[3] && r[5] ? valorBR(r[5]) : valorBR(r[4]);
      if (valor > 0) remuneracoes.push({ comp, valor, origem: origem.slice(0, 60) });
    }
    const indicadores = [...new Set((bloco.match(/\b[A-Z]{3,5}(?:-[A-Z0-9]{2,12})+\b|\bIEAN\b/g) ?? []).filter((x) => x in INDICADORES || /^P[A-Z]+-/.test(x)))];
    vinculos.push({
      seq: Number(c.m[1]),
      origem: origem || "Vínculo",
      tipoFiliado: tipo,
      inicio: deBR(c.m[4]),
      fim: c.m[5] ? deBR(c.m[5]) : null,
      indicadores,
      remuneracoes,
    });
  });

  if (!vinculos.length) avisos.push("Nenhum vínculo reconhecido no texto do CNIS.");
  for (const v of vinculos) {
    if (!v.fim) {
      const ultima = v.remuneracoes.map((r) => r.comp).sort().at(-1);
      avisos.push(`Vínculo ${v.seq} (${v.origem}) sem data fim${ultima ? `: considerada a última remuneração (${ultima.slice(5)}/${ultima.slice(0, 4)})` : ""}.`);
      if (ultima) {
        const [a, mm] = ultima.split("-").map(Number);
        v.fim = new Date(Date.UTC(a, mm, 0)).toISOString().slice(0, 10);
      }
    }
  }
  return { segurado, vinculos, avisos };
}

/** Converte o resultado em períodos e salários do cálculo. */
export function cnisParaCalculo(r: ResultadoCnis): { periodos: Periodo[]; salarios: SalarioContribuicao[]; avisos: string[] } {
  const periodos: Periodo[] = [];
  const salarios: SalarioContribuicao[] = [];
  const avisos = [...r.avisos];
  for (const v of r.vinculos) {
    if (!v.inicio || !v.fim) continue;
    const especial = v.indicadores.includes("IEAN");
    const beneficio = /benef/i.test(v.tipoFiliado) || /benef[ií]cio|aux[ií]lio|aposentadoria/i.test(v.origem);
    const tipo: TipoPeriodo = especial ? "especial25" : "comum";
    periodos.push({
      id: `cnis-${v.seq}`,
      inicio: v.inicio,
      fim: v.fim,
      tipo,
      descricao: `${v.seq}. ${v.origem}${v.tipoFiliado ? ` — ${v.tipoFiliado}` : ""}`,
      carencia: !beneficio,
      regime: v.indicadores.includes("PRPPS") ? "RPPS" : "RGPS",
    });
    if (especial) avisos.push(`Vínculo ${v.seq} tem indicador IEAN: marcado como especial (25 anos) — confirme pelo PPP/LTCAT.`);
    if (beneficio) avisos.push(`Vínculo ${v.seq} é benefício: conta como tempo se intercalado com contribuições; carência desmarcada — revise.`);
    for (const ind of v.indicadores) if (INDICADORES[ind] && ind !== "IEAN") avisos.push(`Vínculo ${v.seq}: ${ind} — ${INDICADORES[ind]}.`);
    salarios.push(...v.remuneracoes);
  }
  return { periodos, salarios, avisos };
}
