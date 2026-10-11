import { readFileSync } from "node:fs";
import path from "node:path";

// Identificador do build atual (muda a cada deploy). Usado para detectar abas
// abertas com a versão anterior e recarregá-las sozinhas.
let cache: string | null = null;

export function versaoApp(): string {
  if (cache) return cache;
  try {
    cache = readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    cache = "dev";
  }
  return cache;
}
