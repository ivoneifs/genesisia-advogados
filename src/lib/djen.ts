// Consulta ao DJEN (Diário de Justiça Eletrônico Nacional / CNJ) por OAB.
// API pública: https://comunicaapi.pje.jus.br — limite de ~20 requisições/min.
// Cada item é uma comunicação (intimação/edital); agrupamos por processo.

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

export async function buscarProcessosPorOab(
  numeroOab: string,
  uf: string
): Promise<ResultadoDjen> {
  const itens: ComunicacaoApi[] = [];
  let incompleto = false;

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const url = `${API}?numeroOab=${encodeURIComponent(numeroOab)}&ufOab=${uf}&itensPorPagina=${POR_PAGINA}&pagina=${pagina}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
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
    if (pagina === MAX_PAGINAS) incompleto = true;
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
        comunicacoes: [],
      };
      porNumero.set(numero, p);
    }
    for (const d of it.destinatarios ?? []) {
      const lista = d.polo === "P" ? p.poloPassivo : p.poloAtivo;
      if (d.nome && !lista.includes(d.nome)) lista.push(d.nome);
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
