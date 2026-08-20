import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSession } from "@/lib/session";
import { tools, executeTool } from "@/lib/ai/tools";

export const runtime = "nodejs";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.escritorioId) {
    return NextResponse.json(
      { error: "Assistente disponível apenas para usuários de um escritório." },
      { status: 403 }
    );
  }
  const escritorioId = session.escritorioId;

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY não configurada. Adicione a chave no arquivo .env do projeto e reinicie o servidor.",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const history = Array.isArray(body?.messages) ? body.messages : null;
  if (!history || history.length === 0) {
    return NextResponse.json({ error: "mensagens inválidas" }, { status: 400 });
  }

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const system = `Você é o assistente de IA do Genesis IA, sistema de gestão jurídica do escritório de ${session.name}.
Hoje é ${today}.
Responda de forma direta e profissional, em português do Brasil.
Use as ferramentas disponíveis para consultar processos, prazos, clientes e financeiro reais do escritório antes de responder perguntas sobre esses dados — nunca invente números de processo, nomes ou valores.
Quando ajudar a redigir textos jurídicos, deixe claro que é uma minuta e deve ser revisada por um(a) advogado(a) antes de protocolar.
Se a pergunta não tiver relação com o escritório (processos, clientes, prazos, financeiro, redação jurídica), responda normalmente como um assistente geral, mas de forma breve.`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...history.map((m: { role: "user" | "assistant"; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    let iterations = 0;
    while (iterations < 8) {
      iterations++;

      const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 4096,
        messages,
        tools,
      });

      const choice = response.choices[0];
      const message = choice.message;

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return NextResponse.json({ reply: message.content ?? "" });
      }

      messages.push(message);

      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;
        let args: unknown = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          args = {};
        }
        const result = await executeTool(escritorioId, call.function.name, args);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }
    }

    return NextResponse.json({
      reply: "Não consegui concluir a resposta a tempo. Tente reformular a pergunta.",
    });
  } catch (error) {
    if (error instanceof OpenAI.AuthenticationError) {
      return NextResponse.json(
        { error: "Chave de API inválida. Verifique o OPENAI_API_KEY no .env." },
        { status: 401 }
      );
    }
    if (error instanceof OpenAI.RateLimitError) {
      return NextResponse.json(
        { error: "Limite de uso da API atingido. Tente novamente em instantes." },
        { status: 429 }
      );
    }
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `Erro na API da IA: ${error.message}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "Erro inesperado no assistente." }, { status: 500 });
  }
}
