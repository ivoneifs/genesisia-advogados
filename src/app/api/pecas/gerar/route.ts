import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { pecaPorId, ESTRUTURA } from "@/lib/biblioteca-pecas";
import { parseAdvogados, formatAdvogado } from "@/lib/advogados";
import { formatCurrency } from "@/lib/format";

export const runtime = "nodejs";
export const maxDuration = 180;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// Padrão de redação e formatação das minutas. As convenções de formatação
// (títulos em maiúsculas, parágrafos numerados, alíneas) são as que o
// exportador .docx (src/lib/exportar-docx.ts) reconhece.
const PADRAO_REDACAO = `Você é um advogado sênior brasileiro, com mais de 20 anos de prática forense e consultiva, que redige minutas de peças e documentos jurídicos para outros advogados revisarem e assinarem, no sistema Genesis IA.

QUALIDADE TÉCNICA
- Redija em português do Brasil, com linguagem jurídica formal, técnica, clara e persuasiva, no padrão de um escritório de excelência. Evite prolixidade, repetições e chavões vazios.
- Siga o rito e a estrutura próprios da peça pedida, com todos os requisitos legais de admissibilidade (ex.: CPC, art. 319, para a petição inicial; tempestividade, preparo e cabimento para recursos; CLT, art. 840, § 1º, para a reclamação trabalhista).
- Desenvolva a fundamentação jurídica em tópicos, ligando os fatos às normas aplicáveis (Constituição, códigos, leis especiais) e aos princípios pertinentes. Antecipe e rebata as teses contrárias mais prováveis.
- Formule pedidos certos, determinados e completos (CPC, arts. 322 e 324), incluindo, quando cabíveis: tutela de urgência, citação/intimação, procedência, condenação em custas e honorários, produção de provas, gratuidade da justiça, prioridade de tramitação e indicação do valor da causa.

FIDELIDADE (REGRA ABSOLUTA)
- Nunca invente fatos, nomes, números de documentos, de OAB, de processos, datas ou valores. Use apenas os dados fornecidos; o que faltar fica entre colchetes, ex.: [CPF], [data do contrato], [valor].
- Cite somente dispositivos legais e súmulas de cuja existência e conteúdo você tenha certeza. Não cite número de processo, relator ou data de julgado específico; onde um precedente fortaleceria a tese, escreva: [inserir precedente do STJ/TJ sobre o tema].

FORMATAÇÃO (TEXTO PURO, SEM MARKDOWN)
- Não use asteriscos, cerquilhas nem outra marcação Markdown.
- Primeira linha: o endereçamento, em letras maiúsculas (ex.: EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE [COMARCA]).
- Títulos de seção em linha própria, em letras maiúsculas e numerados em romanos (ex.: I – DOS FATOS; II – DO DIREITO; III – DOS PEDIDOS).
- Parágrafos de desenvolvimento numerados sequencialmente (1., 2., 3., ...).
- Pedidos e requerimentos em alíneas: a), b), c), ...
- Uma linha em branco entre parágrafos.
- Encerramento: "Termos em que, pede deferimento.", local e data, e assinatura com nome do advogado e OAB.

Retorne apenas o texto da minuta, sem comentários antes ou depois.`;

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

  // Cada geração custa tokens: limita por usuário.
  const rl = rateLimit(`ia-pecas:${session.userId}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas gerações seguidas. Aguarde ${rl.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const clienteId = String(body?.clienteId ?? "") || null;
  const processoId = String(body?.processoId ?? "") || null;
  const peca = body?.pecaId ? pecaPorId(String(body.pecaId)) : undefined;
  const detalhes = String(body?.detalhes ?? "").trim().slice(0, 8000);
  // Peça da biblioteca: a instrução é montada aqui, a partir do catálogo.
  const instrucao = peca
    ? [
        `Redija a peça "${peca.nome}" (área: ${peca.area}).`,
        `Fundamento legal de referência: ${peca.base}.`,
        `Estrutura esperada: ${ESTRUTURA[peca.tipo]}`,
        detalhes
          ? `Fatos e detalhes do caso informados pelo advogado:\n${detalhes}`
          : "O advogado não informou os fatos: use placeholders entre colchetes para fatos, datas e valores.",
      ].join("\n\n")
    : String(body?.instrucao ?? "").trim().slice(0, 8000);

  if (!instrucao) {
    return NextResponse.json({ error: "Descreva o que você precisa." }, { status: 400 });
  }

  const escritorioId = session.escritorioId;

  const [cliente, processo, escritorio] = await Promise.all([
    clienteId
      ? prisma.cliente.findFirst({ where: { id: clienteId, escritorioId } })
      : null,
    processoId
      ? prisma.processo.findFirst({
          where: { id: processoId, escritorioId },
          include: { cliente: true },
        })
      : null,
    prisma.escritorio.findUnique({
      where: { id: escritorioId },
      select: { nome: true },
    }),
  ]);

  const advogadosProcesso = processo ? parseAdvogados(processo.advogados) : [];
  const contexto = [
    escritorio ? `Escritório: ${escritorio.nome}.` : "",
    `Advogado(a) que assinará: ${session.name} (OAB: [nº OAB/UF]).`,
    cliente
      ? `Cliente: ${cliente.nome} (${cliente.tipo === "PJ" ? "pessoa jurídica" : "pessoa física"})${
          cliente.documento ? `, ${cliente.tipo === "PJ" ? "CNPJ" : "CPF"} ${cliente.documento}` : ""
        }${cliente.endereco ? `, endereço: ${cliente.endereco}` : ""}${
          cliente.email ? `, e-mail: ${cliente.email}` : ""
        }${cliente.telefone ? `, telefone: ${cliente.telefone}` : ""}.`
      : "",
    processo
      ? [
          `Processo nº ${processo.numero}`,
          `cliente ${processo.cliente.nome}`,
          processo.area ? `classe/área: ${processo.area}` : "",
          processo.tribunal ? `tribunal: ${processo.tribunal}` : "",
          processo.vara ? `órgão/vara: ${processo.vara}` : "",
          processo.parteContraria ? `parte contrária: ${processo.parteContraria}` : "",
          processo.valorCausa != null ? `valor da causa: ${formatCurrency(processo.valorCausa)}` : "",
          advogadosProcesso.length
            ? `advogados no processo: ${advogadosProcesso.map(formatAdvogado).join("; ")}`
            : "",
        ]
          .filter(Boolean)
          .join(", ") + "."
      : "",
    processo?.descricao ? `Observações do processo:\n${processo.descricao}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const system = `${PADRAO_REDACAO}

Data de hoje: ${today}.

Dados do cadastro para usar no documento:
${contexto}`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: peca ? 8000 : 4000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: instrucao },
      ],
    });

    const texto = (response.choices[0]?.message?.content ?? "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/^#+\s*/gm, "")
      .trim();
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
