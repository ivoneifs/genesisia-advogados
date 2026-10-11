// Cliente mínimo da Evolution API (WhatsApp).
// EVOLUTION_API_URL e EVOLUTION_API_KEY (chave global) vêm do ambiente.
// EVOLUTION_INSTANCE é o número central, usado pelos escritórios que não
// conectaram um número próprio.

const BASE = (process.env.EVOLUTION_API_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.EVOLUTION_API_KEY ?? "";
export const INSTANCIA_CENTRAL = process.env.EVOLUTION_INSTANCE ?? "";

export function evolutionConfigurada(): boolean {
  return Boolean(BASE && KEY);
}

/** Nome da instância própria de um escritório. */
export function nomeInstancia(escritorioId: string) {
  return `genesis-${escritorioId}`;
}

/**
 * Normaliza um telefone brasileiro para o formato da Evolution
 * (55 + DDD + número, só dígitos). Retorna null se não parecer válido.
 */
export function normalizarWhatsapp(tel: string | null | undefined): string | null {
  if (!tel) return null;
  const t = tel.trim();
  let d = t.replace(/\D/g, "");
  // Com código de país explícito (+XX ou 00XX), só aceitamos o do Brasil.
  const internacional = t.startsWith("+") || d.startsWith("00");
  if (d.startsWith("00")) d = d.slice(2);
  if (!internacional && (d.length === 10 || d.length === 11)) d = "55" + d;
  if (!d.startsWith("55") || d.length < 12 || d.length > 13) return null;
  return d;
}

/** "5511987654321" → "(11) 98765-4321" */
export function formatarWhatsapp(n: string) {
  const d = n.startsWith("55") ? n.slice(2) : n;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return n;
}

async function chamar<T>(
  metodo: "GET" | "POST" | "DELETE",
  caminho: string,
  corpo?: unknown
): Promise<T> {
  if (!evolutionConfigurada()) {
    throw new Error("Evolution API não configurada (EVOLUTION_API_URL / EVOLUTION_API_KEY).");
  }
  const res = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const texto = await res.text();
  let json: unknown = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    // resposta não-JSON: usa o texto na mensagem de erro
  }
  if (!res.ok) {
    const msg =
      (json as { response?: { message?: unknown } } | null)?.response?.message ??
      (json as { message?: unknown } | null)?.message ??
      texto;
    throw new Error(`Evolution ${res.status}: ${String(JSON.stringify(msg)).slice(0, 300)}`);
  }
  return json as T;
}

export async function enviarTexto(instancia: string, numero: string, texto: string) {
  await chamar("POST", `/message/sendText/${encodeURIComponent(instancia)}`, {
    number: numero,
    text: texto,
  });
}

export type EstadoConexao = "open" | "connecting" | "close" | "inexistente";

export async function estadoInstancia(instancia: string): Promise<EstadoConexao> {
  try {
    const r = await chamar<{ instance?: { state?: string } }>(
      "GET",
      `/instance/connectionState/${encodeURIComponent(instancia)}`
    );
    const s = r?.instance?.state;
    return s === "open" || s === "connecting" ? s : "close";
  } catch (e) {
    if (String(e).includes("Evolution 404")) return "inexistente";
    throw e;
  }
}

/** Cria a instância (se preciso) e devolve o QR code em data URL para conectar. */
export async function qrCodeInstancia(instancia: string): Promise<string | null> {
  const estado = await estadoInstancia(instancia);
  if (estado === "inexistente") {
    const r = await chamar<{ qrcode?: { base64?: string } }>("POST", "/instance/create", {
      instanceName: instancia,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    });
    return r?.qrcode?.base64 ?? null;
  }
  if (estado === "open") return null;
  const r = await chamar<{ base64?: string }>(
    "GET",
    `/instance/connect/${encodeURIComponent(instancia)}`
  );
  return r?.base64 ?? null;
}

export async function desconectarInstancia(instancia: string) {
  await chamar("DELETE", `/instance/logout/${encodeURIComponent(instancia)}`);
}
