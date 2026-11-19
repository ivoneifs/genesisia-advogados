import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSession } from "@/lib/session";
import { bloqueioApi } from "@/lib/modulos-server";
import { rateLimit } from "@/lib/rate-limit";
import { tools, executeTool } from "@/lib/ai/tools";
import {
  MAX_ANEXOS,
  cortarMeio,
  distribuirLimite,
  lerAnexo,
  lerBinario,
  type Anexo,
} from "@/lib/ai/anexos";

export const runtime = "nodejs";
// Peças longas com o processo inteiro no contexto levam alguns minutos.
export const maxDuration = 300;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

// Limites de custo: só as últimas mensagens, com tamanho máximo.
const MAX_MENSAGENS = 20;
const MAX_CARACTERES = 8000;

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
  const bloqueio = bloqueioApi(session, "assistente");
  if (bloqueio) return bloqueio;

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

  // Cada pergunta custa tokens: limita por usuário.
  const rl = rateLimit(`ia-assistente:${session.userId}`, 15, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas perguntas seguidas. Aguarde ${rl.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  // Só aceita papéis user/assistant vindos do navegador (nada de "system").
  const history = Array.isArray(body?.messages)
    ? (body.messages as unknown[])
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            !!m &&
            typeof m === "object" &&
            ((m as { role?: unknown }).role === "user" || (m as { role?: unknown }).role === "assistant") &&
            typeof (m as { content?: unknown }).content === "string"
        )
        .slice(-MAX_MENSAGENS)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CARACTERES) }))
    : null;
  if (!history || history.length === 0) {
    return NextResponse.json({ error: "mensagens inválidas" }, { status: 400 });
  }

  // Arquivos do processo enviados pelo advogado (só ids; o conteúdo fica no servidor).
  const idsAnexos: string[] = Array.isArray(body?.anexos) && !bloqueioApi(session, "assistente.anexos")
    ? [...new Set((body.anexos as unknown[]).filter((x): x is string => typeof x === "string"))].slice(0, MAX_ANEXOS)
    : [];
  const anexos = (await Promise.all(idsAnexos.map((id) => lerAnexo(escritorioId, id)))).filter(
    (a): a is Anexo => !!a
  );
  const mensagemAnexos = anexos.length ? await montarMensagemAnexos(escritorioId, anexos) : null;

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
Se a pergunta não tiver relação com o escritório (processos, clientes, prazos, financeiro, redação jurídica), responda normalmente como um assistente geral, mas de forma breve.

ANÁLISE DE DOCUMENTOS ANEXADOS
Quando houver documentos anexados (autos, petições, decisões, contratos, fotos de documentos), atue como advogado(a) sênior que leu os autos inteiros:
- Baseie-se no que está nos documentos. Cite a página ou o trecho ("fl./pág. X") ao afirmar um fato. Se algo não constar dos autos, diga que não consta — não invente partes, datas, valores, números de processo ou decisões.
- Resumos: identifique partes, número do processo, juízo/vara, classe, pedidos, valor da causa, fatos, fundamentos de cada parte, decisões proferidas (com data), fase atual, prazos em curso e próximos passos.
- Organização: quando útil, monte linha do tempo, quadro de provas, pontos controvertidos, pontos fortes e fracos e riscos.
- Peças processuais: elabore a peça completa e pronta para revisão, com endereçamento ao juízo correto, qualificação das partes conforme os autos, fatos, fundamentos jurídicos (legislação com artigos; súmulas e teses de tribunais superiores quando pertinentes), pedidos e fechamento ("Nestes termos, pede deferimento", local, data, advogado e OAB em branco para preencher). Escreva os títulos das seções em LETRAS MAIÚSCULAS em linhas próprias e não use Markdown (#, **) dentro da peça, para que ela possa ser exportada para Word. Use [PREENCHER] para dados que faltarem.
- Jurisprudência, legislação e doutrina: indique os dispositivos legais aplicáveis e as súmulas/temas que você conhece com segurança. Não invente números de acórdãos, relatores ou datas; quando citar precedente específico, marque "(conferir a referência antes de protocolar)". Para doutrina, indique autor e obra apenas quando tiver certeza.
- Se o pedido do advogado for vago, faça a análise mais útil possível e, ao final, sugira os próximos pedidos que podem ser feitos.
- Termine peças e análises lembrando, em uma linha, que é minuta gerada por IA e precisa de revisão profissional.`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...(mensagemAnexos ? [mensagemAnexos] : []),
    ...history,
  ];

  try {
    let iterations = 0;
    while (iterations < 8) {
      iterations++;

      const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: anexos.length ? 12000 : 4096,
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
      console.error("[assistente] erro na API da IA:", error.message);
      return NextResponse.json(
        { error: "O serviço de IA não respondeu. Tente novamente em instantes." },
        { status: 502 }
      );
    }
    console.error("[assistente] erro inesperado:", error);
    return NextResponse.json({ error: "Erro inesperado no assistente." }, { status: 500 });
  }
}

/** Monta a mensagem com o conteúdo dos anexos (texto, imagens e PDFs escaneados). */
async function montarMensagemAnexos(
  escritorioId: string,
  anexos: Anexo[]
): Promise<OpenAI.Chat.Completions.ChatCompletionUserMessageParam> {
  const limites = distribuirLimite(anexos.map((a) => a.texto.length));
  const partes: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `DOCUMENTOS ANEXADOS PELO ADVOGADO (${anexos.length}). Use-os como base para responder às próximas mensagens.`,
    },
  ];

  for (const [i, a] of anexos.entries()) {
    const cab = `\n=== DOCUMENTO ${i + 1}: "${a.nome}"${a.paginas ? ` — ${a.paginas} página(s)` : ""} ===`;
    if (a.tipo === "imagem" || a.tipo === "pdf-escaneado") {
      const bin = await lerBinario(escritorioId, a.id);
      if (!bin) continue;
      const dataUrl = `data:${a.mime};base64,${bin.toString("base64")}`;
      partes.push({
        type: "text",
        text: `${cab}\n(${a.tipo === "imagem" ? "imagem" : "PDF digitalizado, sem texto selecionável"}; leia o conteúdo visual)`,
      });
      partes.push(
        a.tipo === "imagem"
          ? { type: "image_url", image_url: { url: dataUrl, detail: "high" } }
          : { type: "file", file: { filename: a.nome, file_data: dataUrl } }
      );
      continue;
    }
    const { texto, cortado } = cortarMeio(a.texto, limites[i]);
    partes.push({
      type: "text",
      text: `${cab}${cortado ? "\n(documento extenso: parte do meio foi omitida; avise o advogado se precisar dela)" : ""}\n${texto}`,
    });
  }

  return { role: "user", content: partes };
}
