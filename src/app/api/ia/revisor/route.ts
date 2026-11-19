import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { bloqueioApi } from "@/lib/modulos-server";
import { rateLimit } from "@/lib/rate-limit";
import { clienteIA, erroIA, MODELO, semChave } from "@/lib/ai/openai";
import { MELHORAR_PROMPT, promptRelatorio } from "@/lib/ai/especialista";

export const runtime = "nodejs";
export const maxDuration = 180;

const MODOS: Record<string, string> = {
  corrigir: "Corrija APENAS ortografia, acentuação, pontuação, concordância, regência e crase. Não mude o estilo, o vocabulário nem a estrutura.",
  melhorar: "Corrija os erros e melhore a clareza, a coesão e a fluidez, eliminando repetições e ambiguidades, sem alterar o sentido nem acrescentar fatos.",
  juridico: "Corrija e reescreva em linguagem jurídica formal e técnica, adequada a peças processuais, mantendo todos os fatos, pedidos e dados.",
  simplificar: "Corrija e reescreva em linguagem simples e acessível ao cliente leigo, sem juridiquês, mantendo o conteúdo.",
  resumir: "Corrija e produza um resumo objetivo do texto, preservando as informações essenciais.",
  prompt: "",
  relatorio: "",
  cliente: "",
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.escritorioId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const bloqueio = bloqueioApi(session, "revisor");
  if (bloqueio) return bloqueio;
  const rl = rateLimit(`revisor:${session.userId}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Aguarde ${rl.retryAfterSec}s.` }, { status: 429 });
  const client = clienteIA();
  if (!client) return semChave();

  const body = await req.json().catch(() => null);
  const texto = String(body?.texto ?? "").slice(0, 60_000);
  const modo = String(body?.modo) in MODOS ? String(body.modo) : "corrigir";
  if (texto.trim().length < 3) return NextResponse.json({ error: "Digite ou cole o texto." }, { status: 400 });

  try {
    if (modo === "prompt") {
      const r = await client.chat.completions.create({
        model: MODELO,
        max_tokens: 2500,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: MELHORAR_PROMPT }, { role: "user", content: `PEDIDO ORIGINAL:\n${texto}` }],
      });
      const json = JSON.parse(r.choices[0].message.content || "{}");
      const perguntas: string[] = Array.isArray(json.perguntas) ? json.perguntas.map(String) : [];
      return NextResponse.json({ texto: String(json.prompt ?? ""), alteracoes: perguntas.map((p) => ({ de: "", para: p, motivo: "Informação que melhoraria o resultado" })) });
    }
    if (modo === "relatorio" || modo === "cliente") {
      const r = await client.chat.completions.create({
        model: MODELO,
        max_tokens: 8000,
        temperature: 0.3,
        messages: [{ role: "system", content: promptRelatorio(modo) }, { role: "user", content: `CONTEÚDO:\n${texto}` }],
      });
      const rel = (r.choices[0].message.content ?? "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/gm, "").trim();
      return NextResponse.json({ texto: rel, alteracoes: [] });
    }
    const r = await client.chat.completions.create({
      model: MODELO,
      max_tokens: 12000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você é revisor(a) de textos em português do Brasil (norma culta, Acordo Ortográfico vigente), especializado em textos jurídicos.
${MODOS[modo]}
Preserve nomes próprios, números, datas, citações legais e a formatação de parágrafos.
Responda SOMENTE com JSON: {"texto": "<texto final>", "alteracoes": [{"de": "<trecho original>", "para": "<trecho novo>", "motivo": "<explicação curta>"}]} — liste até 40 alterações relevantes.`,
        },
        { role: "user", content: texto },
      ],
    });
    const json = JSON.parse(r.choices[0].message.content || "{}");
    return NextResponse.json({ texto: String(json.texto ?? ""), alteracoes: Array.isArray(json.alteracoes) ? json.alteracoes.slice(0, 40) : [] });
  } catch (e) {
    return erroIA(e, "revisor");
  }
}
