// Arquivos de logo e capa dos escritórios, no volume persistente /app/uploads.
import path from "node:path";
import type { TipoImagem } from "@/lib/marca";

export const MARCA_DIR = path.join(process.cwd(), "uploads", "marca");
export const LIMITE_IMAGEM = { logo: 2 * 1024 * 1024, capa: 5 * 1024 * 1024 };

export const arquivoMarca = (escritorioId: string, tipo: TipoImagem) =>
  path.join(MARCA_DIR, `${escritorioId}-${tipo}`);

/**
 * Identifica PNG, JPEG ou WebP pelos primeiros bytes (não confia na extensão).
 * SVG fica de fora: pode carregar script.
 */
export function tipoDaImagem(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

