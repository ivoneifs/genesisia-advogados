import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.escritorioId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
  const instrucao = String(body?.instrucao ?? "").trim();
  const clienteId = String(body?.clienteId ?? "") || null;
  const processoId = String(body?.processoId ?? "") || null;

  if (!instrucao) {
    return NextResponse.json({ error: "Descreva o que você precisa." }, { status: 400 });
  }

  const escritorioId = session.escritorioId;

  const [cliente, processo] = await Promise.all([
    clienteId
      ? prisma.cliente.findFirst({ where: { id: clienteId, escritorioId } })
      : null,
    processoId
      ? prisma.processo.findFirst({
          where: { id: processoId, escritorioId },
          include: { cliente: true },
        })
      : null,
  ]);

  const contexto = [
    cliente
      ? `Cliente: ${cliente.nome} (${cliente.tipo})${
          cliente.documento ? `, documento ${cliente.documento}` : ""
        }${cliente.endereco ? `, endereço ${cliente.endereco}` : ""}.`
      : "",
    processo
      ? `Processo nº ${processo.numero}, cliente ${processo.cliente.nome}, área ${
          processo.area ?? "não informada"
        }, tribunal ${processo.tribunal ?? "—"}, vara ${
          processo.vara ?? "—"
        }, parte contrária ${processo.parteContraria ?? "—"}.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const system = `Você é um assistente jurídico que redige minutas de peças e documentos para advogados brasileiros, no sistema Genesis IA.
Escreva em português do Brasil, em linguagem jurídica formal e objetiva, seguindo as convenções usuais de peças processuais e instrumentos jurídicos brasileiros.
Use placeholders entre colchetes (ex: [OAB], [valor]) para qualquer dado que não tenha sido fornecido — nunca invente números de OAB, valores, datas ou nomes que não foram passados.
Retorne apenas o texto da minuta, pronto para revisão, sem comentários introdutórios ou explicações antes ou depois.
Data de hoje, se necessário: ${today}.
${contexto ? `\nDados disponíveis para usar no documento:\n${contexto}` : ""}`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 3000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: instrucao },
      ],
    });

    const texto = response.choices[0]?.message?.content ?? "";
    return NextResponse.json({ texto });
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
    return NextResponse.json({ error: "Erro inesperado ao gerar o texto." }, { status: 500 });
  }
}
