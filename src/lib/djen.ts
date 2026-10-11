// Consulta ao DJEN (Diário de Justiça Eletrônico Nacional / CNJ) por OAB.
// API pública: https://comunicaapi.pje.jus.br — limite de ~20 requisições/min.
// Cada item é uma comunicação (intimação/edital); agrupamos por processo.

import type { Advogado } from "@/lib/advogados";

const API = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const POR_PAGINA = 100;
const MAX_PAGINAS = 15; // até 1.500 comunicações por busca

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

type ComunicacaoApi = {
  data_disponibilizacao: string; // YYYY-MM-DD
  siglaTribunal: string | null;
  tipoComunicacao: string | null;
  nomeOrgao: string | null;
  texto: string | null;
  numero_processo: string;
  numeroprocessocommascara: string | null;
  nomeClasse: string | null;
  link: string | null;
  meiocompleto: string | null;
  destinatarios?: { nome: string; polo: string }[];
  destinatarioadvogados?: {
    advogado?: { nome: string; numero_oab: string; uf_oab: string } | null;
  }[];
};

export type ComunicacaoDjen = {
  data: Date;
  tipo: string;
  texto: string;
  diario: string;
};

export type ProcessoDjen = {
  numero: string; // com máscara CNJ
  tribunal: string | null;
  vara: string | null;
  classe: string | null;
  poloAtivo: string[];
  poloPassivo: string[];
  advogados: Advogado[];
  comunicacoes: ComunicacaoDjen[]; // mais recente primeiro
};

export type ResultadoDjen = {
  processos: ProcessoDjen[];
  totalComunicacoes: number;
  incompleto: boolean; // parou antes do fim (limite de páginas ou de requisições)
};

function mascaraCnj(n: string) {
  const d = n.replace(/\D/g, "");
  if (d.length !== 20) return n;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`;
}

function capitalizar(s: string) {
  return s
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/ (De|Da|Do|Das|Dos|E|Em|Por|Para) /g, (m) => m.toLowerCase());
}

export type OpcoesBusca = {
  /** Máximo de páginas de 100 comunicações (padrão: 15). */
  maxPaginas?: number;
  /** Ao bater no limite do DJEN, espera 1 minuto e continua (importação em segundo plano). */
  esperarLimite?: boolean;
  /** Chamado a cada página baixada. */
  aoProgresso?: (baixadas: number, total: number) => void | Promise<void>;
};

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function buscarProcessosPorOab(
  numeroOab: string,
  uf: string,
  opcoes: OpcoesBusca = {}
): Promise<ResultadoDjen> {
  const maxPaginas = opcoes.maxPaginas ?? MAX_PAGINAS;
  const itens: ComunicacaoApi[] = [];
  let incompleto = false;

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const url = `${API}?numeroOab=${encodeURIComponent(numeroOab)}&ufOab=${uf}&itensPorPagina=${POR_PAGINA}&pagina=${pagina}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 429 && opcoes.esperarLimite) {
      await espera(65_000);
      pagina--;
      continue;
    }
    if (res.status === 429) {
      if (pagina === 1) {
        throw new Error("O DJEN limitou as consultas. Aguarde 1 minuto e tente de novo.");
      }
      incompleto = true;
      break;
    }
    if (!res.ok) throw new Error(`O DJEN respondeu com erro (HTTP ${res.status}).`);

    const json = (await res.json()) as { count?: number; items?: ComunicacaoApi[] };
    const page = json.items ?? [];
    itens.push(...page);
    if (page.length < POR_PAGINA || itens.length >= (json.count ?? 0)) break;
    await opcoes.aoProgresso?.(itens.length, json.count ?? itens.length);
    if (pagina === maxPaginas) incompleto = true;
    // ~17 consultas por minuto: abaixo do limite do DJEN (20/min).
    if (opcoes.esperarLimite) await espera(3_500);
  }

  const porNumero = new Map<string, ProcessoDjen>();
  for (const it of itens) {
    if (!it.numero_processo) continue;
    const numero = it.numeroprocessocommascara || mascaraCnj(it.numero_processo);
    let p = porNumero.get(numero);
    if (!p) {
      p = {
        numero,
        tribunal: it.siglaTribunal,
        vara: it.nomeOrgao,
        classe: it.nomeClasse ? capitalizar(it.nomeClasse) : null,
        poloAtivo: [],
        poloPassivo: [],
        advogados: [],
        comunicacoes: [],
      };
      porNumero.set(numero, p);
    }
    for (const d of it.destinatarios ?? []) {
      const lista = d.polo === "P" ? p.poloPassivo : p.poloAtivo;
      if (d.nome && !lista.includes(d.nome)) lista.push(d.nome);
    }
    for (const da of it.destinatarioadvogados ?? []) {
      const a = da.advogado;
      if (!a?.nome || !a.numero_oab) continue;
      const oab = a.numero_oab.trim();
      const uf = (a.uf_oab ?? "").trim().toUpperCase();
      if (!p.advogados.some((x) => x.oab === oab && x.uf === uf)) {
        p.advogados.push({ nome: a.nome.trim(), oab, uf });
      }
    }
    p.comunicacoes.push({
      data: new Date(`${it.data_disponibilizacao}T12:00:00Z`),
      tipo: it.tipoComunicacao ?? "Comunicação",
      texto: it.texto ?? "",
      diario: [it.siglaTribunal, it.meiocompleto ?? "DJEN"].filter(Boolean).join(" · "),
    });
  }

  const processos = [...porNumero.values()];
  for (const p of processos) {
    p.comunicacoes.sort((a, b) => b.data.getTime() - a.data.getTime());
  }
  processos.sort(
    (a, b) => b.comunicacoes[0].data.getTime() - a.comunicacoes[0].data.getTime()
  );

  return { processos, totalComunicacoes: itens.length, incompleto };
}

export type AdvogadoDjen = {
  nome: string | null; // null se a OAB não aparece em nenhuma publicação
  oab: string;
  uf: string;
  totalPublicacoes: number;
  tribunais: string[];
  ultimaPublicacao: Date | null;
};

const semZerosEsquerda = (s: string) => s.replace(/\D/g, "").replace(/^0+/, "");

/** Dados do advogado a partir das publicações do DJEN (1 requisição). */
export async function consultarAdvogado(numeroOab: string, uf: string): Promise<AdvogadoDjen> {
  const url = `${API}?numeroOab=${encodeURIComponent(numeroOab)}&ufOab=${uf}&itensPorPagina=${POR_PAGINA}&pagina=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 429) {
    throw new Error("O DJEN limitou as consultas. Aguarde 1 minuto.");
  }
  if (!res.ok) throw new Error(`O DJEN respondeu com erro (HTTP ${res.status}).`);

  const json = (await res.json()) as { count?: number; items?: ComunicacaoApi[] };
  const itens = json.items ?? [];
  const alvo = semZerosEsquerda(numeroOab);

  let nome: string | null = null;
  const tribunais = new Set<string>();
  let ultima: string | null = null;
  for (const it of itens) {
    if (it.siglaTribunal) tribunais.add(it.siglaTribunal);
    if (!ultima || it.data_disponibilizacao > ultima) ultima = it.data_disponibilizacao;
    if (nome) continue;
    for (const da of it.destinatarioadvogados ?? []) {
      const a = da.advogado;
      if (
        a?.nome &&
        semZerosEsquerda(a.numero_oab ?? "") === alvo &&
        (a.uf_oab ?? "").toUpperCase() === uf
      ) {
        nome = a.nome.trim();
        break;
      }
    }
  }

  return {
    nome,
    oab: numeroOab,
    uf,
    totalPublicacoes: json.count ?? itens.length,
    tribunais: [...tribunais].sort(),
    ultimaPublicacao: ultima ? new Date(`${ultima}T12:00:00Z`) : null,
  };
}
