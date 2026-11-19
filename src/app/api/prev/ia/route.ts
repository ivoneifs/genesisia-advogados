import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { bloqueioApi } from "@/lib/modulos-server";
import { rateLimit } from "@/lib/rate-limit";
import { clienteIA, erroIA, MODELO, semChave } from "@/lib/ai/openai";
import { promptEspecialista } from "@/lib/ai/especialista";

export const runtime = "nodejs";
export const maxDuration = 300;

// IA dos módulos de cálculo: parecer, petição, assistente de cálculos e
// calculadoras assistidas. Recebe o resumo do cálculo montado no navegador.

const TAREFAS: Record<string, string> = {
  parecer: "Redija um PARECER TÉCNICO-JURÍDICO completo sobre o cálculo: identificação, objeto, dados considerados, análise de cada regra/verba (requisitos, valores), conclusão com a opção mais vantajosa, riscos e recomendações.",
  planejamento: "Redija um PLANEJAMENTO PREVIDENCIÁRIO para o cliente: situação atual, cenários de aposentadoria com datas e valores, comparação financeira (inclusive ponto de equilíbrio), recomendação fundamentada e próximos passos (documentos, PPP, contribuições).",
  "peticao-concessao": "Redija a PETIÇÃO INICIAL de concessão do benefício mais vantajoso contra o INSS, com fatos, direito (legislação e jurisprudência), cálculo da RMI, atrasados, valor da causa e pedidos (inclusive tutela de urgência quando cabível e reafirmação da DER — Tema 995/STJ).",
  "peticao-revisao": "Redija a PETIÇÃO INICIAL de revisão do benefício, demonstrando o erro, o recálculo, as diferenças e o valor da causa, observando decadência e prescrição.",
  "recurso-administrativo": "Redija o RECURSO ADMINISTRATIVO ao CRPS contra o indeferimento/concessão incorreta, apontando os erros do INSS e os documentos.",
  "peticao-trabalhista": "Redija a PETIÇÃO INICIAL trabalhista com fatos, fundamentos (CLT, súmulas e OJs do TST), pedidos líquidos conforme o cálculo (CLT, art. 840, §1º) e valor da causa.",
  "impugnacao-calculos": "Redija a IMPUGNAÇÃO/MANIFESTAÇÃO SOBRE CÁLCULOS de liquidação, apontando as divergências e apresentando a conta correta.",
  calculadora: "Faça o cálculo pedido com base nos dados informados, mostrando a memória de cálculo passo a passo, os índices e a legislação aplicados, e o resultado final destacado. Quando depender de tabelas históricas oficiais que você não tenha com segurança, diga exatamente qual tabela consultar e deixe o campo indicado.",
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.escritorioId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const area = body?.area === "TRABALHISTA" ? "trabalhista" : "previdenciario";
  const bloqueio = bloqueioApi(session, `${area}.parecer`);
  if (bloqueio) return bloqueio;
  const rl = rateLimit(`calc-ia:${session.userId}`, 12, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Aguarde ${rl.retryAfterSec}s.` }, { status: 429 });
  const client = clienteIA();
  if (!client) return semChave();

  const acao = String(body?.acao ?? "parecer");
  const contexto = String(body?.contexto ?? "").slice(0, 120_000);
  const cliente = String(body?.cliente ?? "").slice(0, 200);
  const hoje = new Date().toLocaleDateString("pt-BR");
  const especialidade = area === "trabalhista" ? "direito e cálculos trabalhistas (CLT, TST, liquidação de sentença)" : "direito previdenciário (RGPS e RPPS) e cálculos previdenciários";

  const tarefa = acao === "assistente" ? "chat" : acao.startsWith("peticao") || acao === "recurso-administrativo" || acao === "impugnacao-calculos" ? "peca" : "analise";
  const system = `${promptEspecialista({ areas: [area === "trabalhista" ? "trabalhista" : "previdenciario"], tarefa })}

Você também é perito(a) contábil especialista em ${especialidade}, atuando no sistema Genesis IA do escritório. Hoje é ${hoje}.
Escreva em português do Brasil, com linguagem técnica e clara. Use SOMENTE os dados do cálculo fornecido; não invente números, datas ou nomes. Quando citar jurisprudência, prefira súmulas e temas repetitivos que você conhece com segurança e, para precedentes específicos, marque "(conferir)".
Em peças processuais, escreva títulos em MAIÚSCULAS em linhas próprias e não use Markdown (#, **), para exportação ao Word; use [PREENCHER] para dados ausentes.
Termine lembrando, em uma linha, que o conteúdo é gerado por IA e deve ser revisado por profissional habilitado.`;

  try {
    if (acao === "assistente") {
      const historico = (Array.isArray(body?.messages) ? body.messages : [])
        .filter((m: { role?: string; content?: unknown }) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-16)
        .map((m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: m.content.slice(0, 8000) }));
      if (!historico.length) return NextResponse.json({ error: "mensagem vazia" }, { status: 400 });
      const r = await client.chat.completions.create({
        model: MODELO,
        max_tokens: 4000,
        messages: [
          { role: "system", content: `${system}\nVocê é o ASSISTENTE DE CÁLCULOS: explique resultados, aponte inconsistências nos dados, sugira regras/teses mais vantajosas, documentos a obter e próximos passos. Seja direto.` },
          { role: "user", content: `DADOS DO CÁLCULO ABERTO${cliente ? ` (cliente: ${cliente})` : ""}:\n${contexto || "(nenhum cálculo aberto)"}` },
          ...historico,
        ],
      });
      return NextResponse.json({ texto: r.choices[0].message.content ?? "" });
    }

    const tarefa = TAREFAS[acao];
    if (!tarefa) return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    const extra = String(body?.instrucoes ?? "").slice(0, 4000);
    const r = await client.chat.completions.create({
      model: MODELO,
      max_tokens: 12000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${tarefa}\n${cliente ? `Cliente: ${cliente}\n` : ""}${extra ? `Orientações do advogado: ${extra}\n` : ""}\nDADOS E RESULTADOS DO CÁLCULO:\n${contexto}` },
      ],
    });
    return NextResponse.json({ texto: r.choices[0].message.content ?? "" });
  } catch (e) {
    return erroIA(e, "calc-ia");
  }
}
