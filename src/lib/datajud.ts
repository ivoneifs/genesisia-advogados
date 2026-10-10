// Situação (ativo/arquivado) de processos pela API pública DataJud (CNJ).
// https://datajud-wiki.cnj.jus.br/api-publica — índice por tribunal.
// A chave pública é divulgada pelo CNJ e pode mudar: DATAJUD_API_KEY sobrescreve.

const API_KEY =
  process.env.DATAJUD_API_KEY ||
  "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

// Códigos da Tabela Processual Unificada (movimentos).
const ENCERRA = new Set([22, 246, 861]); // Baixa definitiva, Arquivamento definitivo, Arquivamento
const REABRE = new Set([893, 849]); // Desarquivamento, Reativação

const LOTE = 100;

type Movimento = { codigo?: number; dataHora?: string };
type Hit = { _source: { numeroProcesso: string; movimentos?: Movimento[] } };

const soDigitos = (s: string) => s.replace(/\D/g, "");

/** true se a última movimentação de encerramento não foi seguida de reabertura. */
function encerrado(movimentos: Movimento[]): boolean {
  const ordenados = [...movimentos].sort((a, b) =>
    (a.dataHora ?? "").localeCompare(b.dataHora ?? "")
  );
  let fechado = false;
  for (const m of ordenados) {
    if (m.codigo == null) continue;
    if (ENCERRA.has(m.codigo)) fechado = true;
    else if (REABRE.has(m.codigo)) fechado = false;
  }
  return fechado;
}

async function consultarTribunal(sigla: string, numeros: string[]): Promise<Hit[]> {
  const res = await fetch(
    `https://api-publica.datajud.cnj.jus.br/api_publica_${sigla.toLowerCase()}/_search`,
    {
      method: "POST",
      headers: {
        Authorization: `APIKey ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        size: numeros.length * 3, // um processo pode ter registro por grau
        query: { terms: { numeroProcesso: numeros } },
        _source: ["numeroProcesso", "movimentos.codigo", "movimentos.dataHora"],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    }
  );
  if (!res.ok) throw new Error(`DataJud ${sigla}: HTTP ${res.status}`);
  const json = (await res.json()) as { hits?: { hits?: Hit[] } };
  return json.hits?.hits ?? [];
}

/**
 * Retorna os números (só dígitos) dos processos encerrados: todos os registros
 * do processo no DataJud (um por grau) com baixa/arquivamento definitivo.
 * Processos não encontrados ou de tribunais que falharem ficam de fora
 * (são tratados como ativos).
 */
export async function processosEncerrados(
  processos: { numero: string; tribunal: string | null }[]
): Promise<Set<string>> {
  const porTribunal = new Map<string, string[]>();
  for (const p of processos) {
    if (!p.tribunal) continue;
    const lista = porTribunal.get(p.tribunal) ?? [];
    lista.push(soDigitos(p.numero));
    porTribunal.set(p.tribunal, lista);
  }

  const consultas: Promise<Hit[]>[] = [];
  for (const [sigla, numeros] of porTribunal) {
    for (let i = 0; i < numeros.length; i += LOTE) {
      consultas.push(consultarTribunal(sigla, numeros.slice(i, i + LOTE)));
    }
  }

  // Por processo: encerrado só se TODOS os registros (graus) estiverem encerrados.
  const situacao = new Map<string, boolean>();
  for (const r of await Promise.allSettled(consultas)) {
    if (r.status !== "fulfilled") {
      console.error("[datajud]", r.reason);
      continue;
    }
    for (const h of r.value) {
      const n = soDigitos(h._source.numeroProcesso);
      const fechado = encerrado(h._source.movimentos ?? []);
      situacao.set(n, (situacao.get(n) ?? true) && fechado);
    }
  }

  return new Set([...situacao].filter(([, fechado]) => fechado).map(([n]) => n));
}
