// Cliente OpenAI compartilhado e tradução de erros para mensagens ao usuário.
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const MODELO = process.env.OPENAI_MODEL || "gpt-4o";

export function clienteIA(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey }) : null;
}

export function semChave() {
  return NextResponse.json({ error: "IA não configurada (OPENAI_API_KEY)." }, { status: 503 });
}

export function erroIA(error: unknown, origem: string) {
  if (error instanceof OpenAI.AuthenticationError)
    return NextResponse.json({ error: "Chave da IA inválida." }, { status: 401 });
  if (error instanceof OpenAI.RateLimitError)
    return NextResponse.json({ error: "Limite de uso da IA atingido. Tente em instantes." }, { status: 429 });
  console.error(`[${origem}] erro na IA:`, error);
  return NextResponse.json({ error: "O serviço de IA não respondeu. Tente novamente." }, { status: 502 });
}
