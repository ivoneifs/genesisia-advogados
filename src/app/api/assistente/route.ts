import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/session";
import { tools, executeTool } from "@/lib/ai/tools";

export const runtime = "nodejs";

const MODEL = "claude-opus-5";

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY não configurada. Adicione a chave no arquivo .env do projeto e reinicie o servidor.",
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

  const messages: Anthropic.MessageParam[] = history.map(
    (m: { role: "user" | "assistant"; content: string }) => ({
      role: m.role,
      content: m.content,
    })
  );

  try {
    let iterations = 0;
    while (iterations < 8) {
      iterations++;

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system,
        tools,
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        return NextResponse.json({ reply: text });
      }

      messages.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        const result = await executeTool(block.name, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }

      messages.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({
      reply: "Não consegui concluir a resposta a tempo. Tente reformular a pergunta.",
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Chave de API inválida. Verifique o ANTHROPIC_API_KEY no .env." },
        { status: 401 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Limite de uso da API atingido. Tente novamente em instantes." },
        { status: 429 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Erro na API da IA: ${error.message}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "Erro inesperado no assistente." }, { status: 500 });
  }
}
