// Anexos do Assistente IA: o advogado envia o processo (PDF, Word, imagem ou
// texto), o servidor extrai o texto uma vez e guarda no volume persistente
// /app/uploads. Nas perguntas seguintes o navegador manda só os ids, e o
// servidor injeta o conteúdo no contexto da IA.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_DIR = path.join(process.cwd(), "uploads", "assistente");

export const LIMITE_ARQUIVO = 20 * 1024 * 1024; // igual ao next.config.ts
export const LIMITE_IMAGEM = 8 * 1024 * 1024;
export const MAX_ANEXOS = 5;
// Contexto do gpt-4o: 128k tokens. Reserva espaço para o histórico e a resposta.
export const MAX_CARACTERES_TOTAL = 240_000;
// PDF com menos texto que isso por página é tratado como escaneado.
const MIN_CARACTERES_POR_PAGINA = 40;
// Arquivos ficam disponíveis por 7 dias; depois são apagados.
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

export type TipoAnexo = "pdf" | "pdf-escaneado" | "word" | "imagem" | "texto";

export type Anexo = {
  id: string;
  nome: string;
  tipo: TipoAnexo;
  mime: string;
  tamanho: number;
  paginas: number | null;
  texto: string; // vazio para imagem e PDF escaneado
  criadoEm: string;
};

export type AnexoResumo = Omit<Anexo, "texto"> & { caracteres: number };

const ID_RE = /^[0-9a-f-]{36}$/;

function dirEscritorio(escritorioId: string) {
  // O id do escritório vem da sessão (cuid), mas sanitiza por precaução.
  return path.join(BASE_DIR, escritorioId.replace(/[^\w-]/g, ""));
}

export function resumo(a: Anexo): AnexoResumo {
  const { texto, ...resto } = a;
  return { ...resto, caracteres: texto.length };
}

function extensao(nome: string) {
  return nome.toLowerCase().split(".").pop() ?? "";
}

function detectarTipo(nome: string, mime: string): TipoAnexo | null {
  const ext = extensao(nome);
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (
    ext === "docx" ||
    ext === "doc" ||
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "word";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext) || /^image\/(png|jpe?g|webp|gif)$/.test(mime))
    return "imagem";
  if (["txt", "md", "rtf", "html", "htm"].includes(ext) || mime.startsWith("text/")) return "texto";
  return null;
}

function mimeImagem(nome: string, mime: string) {
  if (/^image\/(png|jpe?g|webp|gif)$/.test(mime)) return mime;
  const ext = extensao(nome);
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
}

function limparTexto(t: string) {
  return t
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extrairPdf(buf: Buffer) {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const paginas = (text as string[]).map(
    (p, i) => `[Página ${i + 1}]\n${limparTexto(p)}`
  );
  const util = (text as string[]).join("").replace(/\s+/g, "").length;
  return { paginas: totalPages, texto: paginas.join("\n\n"), util };
}

async function extrairWord(buf: Buffer, nome: string) {
  if (extensao(nome) === "doc") {
    const WordExtractor = (await import("word-extractor")).default;
    const doc = await new WordExtractor().extract(buf);
    return limparTexto(doc.getBody());
  }
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return limparTexto(value);
}

function extrairTextoSimples(buf: Buffer, nome: string) {
  let t = buf.toString("utf8");
  const ext = extensao(nome);
  if (ext === "html" || ext === "htm") t = t.replace(/<[^>]+>/g, " ");
  if (ext === "rtf") t = t.replace(/\\[a-z]+-?\d* ?|[{}]/g, "");
  return limparTexto(t);
}

/** Apaga anexos com mais de 7 dias (chamado a cada novo envio). */
async function limparAntigos(dir: string) {
  const agora = Date.now();
  const arquivos = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    arquivos.map(async (f) => {
      const p = path.join(dir, f);
      const s = await stat(p).catch(() => null);
      if (s && agora - s.mtimeMs > VALIDADE_MS) await rm(p, { force: true });
    })
  );
}

export class ErroAnexo extends Error {}

export async function salvarAnexo(escritorioId: string, arquivo: File): Promise<Anexo> {
  if (arquivo.size === 0) throw new ErroAnexo("Arquivo vazio.");
  if (arquivo.size > LIMITE_ARQUIVO) throw new ErroAnexo("Arquivo maior que 20 MB.");

  const nome = (arquivo.name || "arquivo").slice(0, 200);
  let tipo = detectarTipo(nome, arquivo.type);
  if (!tipo)
    throw new ErroAnexo("Formato não suportado. Envie PDF, DOC, DOCX, TXT ou imagem (JPG, PNG, WEBP).");
  if (tipo === "imagem" && arquivo.size > LIMITE_IMAGEM)
    throw new ErroAnexo("Imagem maior que 8 MB. Reduza a resolução e envie de novo.");

  const buf = Buffer.from(await arquivo.arrayBuffer());
  let texto = "";
  let paginas: number | null = null;
  let mime = arquivo.type || "application/octet-stream";

  try {
    if (tipo === "pdf") {
      mime = "application/pdf";
      const r = await extrairPdf(buf);
      paginas = r.paginas;
      if (r.util < MIN_CARACTERES_POR_PAGINA * Math.max(1, r.paginas)) {
        tipo = "pdf-escaneado"; // sem camada de texto: a IA lê as páginas como imagem
      } else {
        texto = r.texto;
      }
    } else if (tipo === "word") {
      texto = await extrairWord(buf, nome);
    } else if (tipo === "texto") {
      texto = extrairTextoSimples(buf, nome);
    } else {
      mime = mimeImagem(nome, arquivo.type);
    }
  } catch (e) {
    console.error("[assistente] falha ao ler anexo:", e);
    throw new ErroAnexo("Não foi possível ler o arquivo. Ele pode estar protegido por senha ou corrompido.");
  }

  if ((tipo === "word" || tipo === "texto") && !texto)
    throw new ErroAnexo("O arquivo não tem texto legível.");

  const anexo: Anexo = {
    id: randomUUID(),
    nome,
    tipo,
    mime,
    tamanho: arquivo.size,
    paginas,
    texto,
    criadoEm: new Date().toISOString(),
  };

  const dir = dirEscritorio(escritorioId);
  await mkdir(dir, { recursive: true });
  await limparAntigos(dir);
  await writeFile(path.join(dir, `${anexo.id}.json`), JSON.stringify(anexo));
  if (tipo === "imagem" || tipo === "pdf-escaneado") {
    await writeFile(path.join(dir, `${anexo.id}.bin`), buf);
  }
  return anexo;
}

export async function lerAnexo(escritorioId: string, id: string): Promise<Anexo | null> {
  if (!ID_RE.test(id)) return null;
  try {
    const raw = await readFile(path.join(dirEscritorio(escritorioId), `${id}.json`), "utf8");
    return JSON.parse(raw) as Anexo;
  } catch {
    return null;
  }
}

export async function lerBinario(escritorioId: string, id: string): Promise<Buffer | null> {
  if (!ID_RE.test(id)) return null;
  return readFile(path.join(dirEscritorio(escritorioId), `${id}.bin`)).catch(() => null);
}

export async function excluirAnexo(escritorioId: string, id: string) {
  if (!ID_RE.test(id)) return;
  const dir = dirEscritorio(escritorioId);
  await rm(path.join(dir, `${id}.json`), { force: true });
  await rm(path.join(dir, `${id}.bin`), { force: true });
}

/**
 * Corta um texto grande mantendo o começo (petição inicial, documentos) e o
 * final (decisões e andamentos mais recentes), que costumam ser o que importa.
 */
export function cortarMeio(texto: string, limite: number): { texto: string; cortado: boolean } {
  if (texto.length <= limite) return { texto, cortado: false };
  const inicio = Math.floor(limite * 0.55);
  const fim = limite - inicio;
  return {
    texto:
      texto.slice(0, inicio) +
      `\n\n[... trecho intermediário omitido por tamanho: ${texto.length - limite} caracteres ...]\n\n` +
      texto.slice(-fim),
    cortado: true,
  };
}

/** Divide o limite total de caracteres entre os anexos de texto. */
export function distribuirLimite(tamanhos: number[], total = MAX_CARACTERES_TOTAL): number[] {
  const limites = tamanhos.map(() => 0);
  let restante = total;
  let pendentes = tamanhos.map((t, i) => ({ t, i })).filter((x) => x.t > 0);
  while (pendentes.length && restante > 0) {
    const cota = Math.floor(restante / pendentes.length);
    const proximos: typeof pendentes = [];
    for (const p of pendentes) {
      const falta = p.t - limites[p.i];
      if (falta <= cota) {
        limites[p.i] += falta;
        restante -= falta;
      } else {
        limites[p.i] += cota;
        restante -= cota;
        proximos.push(p);
      }
    }
    // Todos receberam a cota inteira: o limite acabou.
    if (proximos.length === pendentes.length) break;
    pendentes = proximos;
  }
  return limites;
}
