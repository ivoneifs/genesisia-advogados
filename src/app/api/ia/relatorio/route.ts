import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { clienteIA, erroIA, semChave } from "@/lib/ai/openai";
import { FORMATOS_RELATORIO, MODELO_IA, promptRelatorio } from "@/lib/ai/especialista";
import { bloqueioIAApoio } from "@/lib/ai/acesso-ia";

export const runtime = "nodejs";
export const maxDuration = 180;

// Transforma um texto (resposta da IA, anotações, análise) em relatório profissional.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.escritorioId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const bloqueio = bloqueioIAApoio(session);
  if (bloqueio) return bloqueio;
  const rl = rateLimit(`ia-relatorio:${session.userId}`, 12, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Aguarde ${rl.retryAfterSec}s.` }, { status: 429 });
  const client = clienteIA();
  if (!client) return semChave();

  const body = await req.json().catch(() => null);
  const texto = String(body?.texto ?? "").trim().slice(0, 60_000);
  const formato = String(body?.formato ?? "relatorio");
  if (texto.length < 20) return NextResponse.json({ error: "Conteúdo muito curto para virar relatório." }, { status: 400 });
  if (!(formato in FORMATOS_RELATORIO)) return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  const extra = String(body?.contexto ?? "").slice(0, 2000);

  try {
    const r = await client.chat.completions.create({
      model: MODELO_IA,
      temperature: 0.3,
      max_tokens: 8000,
      messages: [
        { role: "system", content: promptRelatorio(formato) },
        { role: "user", content: `${extra ? `Dados de identificação: ${extra}\n\n` : ""}CONTEÚDO:\n${texto}` },
      ],
    });
    const relatorio = (r.choices[0]?.message?.content ?? "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/gm, "").trim();
    return NextResponse.json({ relatorio });
  } catch (e) {
    return erroIA(e, "relatorio");
  }
}
