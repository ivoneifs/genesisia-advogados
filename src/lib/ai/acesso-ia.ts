import { NextResponse } from "next/server";
import type { SessionPayload } from "@/lib/session";
import { ativo } from "@/lib/modulos";

/** Ferramentas de IA de apoio (prompt, relatório): exigem ao menos um módulo de IA ligado. */
export function bloqueioIAApoio(session: SessionPayload): NextResponse | null {
  const mods = ["assistente", "pecas", "revisor", "previdenciario.parecer", "trabalhista.parecer"];
  if (mods.some((m) => ativo(session.desativados, m))) return null;
  return NextResponse.json({ error: "Recursos de IA desativados para este escritório." }, { status: 403 });
}
