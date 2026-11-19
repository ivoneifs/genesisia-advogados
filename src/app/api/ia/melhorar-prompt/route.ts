import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { clienteIA, erroIA, semChave } from "@/lib/ai/openai";
import { MELHORAR_PROMPT, MODELO_IA, NOMES_AREA, detectarAreas } from "@/lib/ai/especialista";
import { bloqueioIAApoio } from "@/lib/ai/acesso-ia";

export const runtime = "nodejs";
export const maxDuration = 60;

// Reescreve o pedido do advogado como uma instrução completa para a IA.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.escritorioId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const bloqueio = bloqueioIAApoio(session);
  if (bloqueio) return bloqueio;
  const rl = rateLimit(`ia-prompt:${session.userId}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Aguarde ${rl.retryAfterSec}s.` }, { status: 429 });
  const client = clienteIA();
  if (!client) return semChave();

  const body = await req.json().catch(() => null);
  const texto = String(body?.texto ?? "").trim().slice(0, 8000);
  if (texto.length < 3) return NextResponse.json({ error: "Escreva o pedido primeiro." }, { status: 400 });
  const destino = String(body?.destino ?? "assistente"); // assistente | peca | calculo
  const peca = String(body?.peca ?? "").slice(0, 200);
  const anexos = (Array.isArray(body?.anexos) ? body.anexos : []).map(String).slice(0, 5);
  const areas = detectarAreas(`${texto} ${peca}`).map((a) => NOMES_AREA[a]);

  try {
    const r = await client.chat.completions.create({
      model: MODELO_IA,
      temperature: 0.3,
      max_tokens: 2500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MELHORAR_PROMPT },
        {
          role: "user",
          content: [
            `PEDIDO ORIGINAL DO ADVOGADO:\n${texto}`,
            `Onde será usado: ${destino === "peca" ? `geração da peça "${peca || "escolhida"}" (o texto é a descrição dos fatos e do que se pede)` : destino === "calculo" ? "análise de um cálculo jurídico" : "assistente jurídico (chat)"}.`,
            anexos.length ? `Documentos anexados: ${anexos.join("; ")}.` : "",
            areas.length ? `Área provável: ${areas.join(" e ")}.` : "",
          ].filter(Boolean).join("\n\n"),
        },
      ],
    });
    const json = JSON.parse(r.choices[0]?.message?.content || "{}");
    return NextResponse.json({ prompt: String(json.prompt ?? texto), perguntas: Array.isArray(json.perguntas) ? json.perguntas.slice(0, 5).map(String) : [] });
  } catch (e) {
    return erroIA(e, "melhorar-prompt");
  }
}
