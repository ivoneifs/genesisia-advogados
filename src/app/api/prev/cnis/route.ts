import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { bloqueioApi } from "@/lib/modulos-server";
import { rateLimit } from "@/lib/rate-limit";
import { lerCnis, type ResultadoCnis } from "@/lib/prev/cnis";
import { clienteIA, MODELO } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const maxDuration = 180;

const LIMITE = 20 * 1024 * 1024;

async function textoDoPdf(buf: Buffer): Promise<string> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).join("\n");
}

const PROMPT_IA = `Você extrai dados de documentos previdenciários do INSS (CNIS/Extrato Previdenciário, carta de concessão, HISCRE, CTPS).
Responda SOMENTE com JSON no formato:
{"segurado":{"nome":"","cpf":"","nit":"","nascimento":"AAAA-MM-DD"},
 "vinculos":[{"seq":1,"origem":"empresa ou tipo","tipoFiliado":"Empregado|Contribuinte Individual|Benefício|...","inicio":"AAAA-MM-DD","fim":"AAAA-MM-DD ou null","indicadores":["IEAN"],
   "remuneracoes":[{"comp":"AAAA-MM","valor":1234.56}]}],
 "beneficio":{"especie":"","dib":"AAAA-MM-DD","rmi":0}}
Não invente dados: omita o que não constar. Valores numéricos em reais com ponto decimal.`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.escritorioId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const bloqueio = bloqueioApi(session, "previdenciario.cnis");
  if (bloqueio) return bloqueio;
  const rl = rateLimit(`cnis:${session.userId}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Aguarde ${rl.retryAfterSec}s.` }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  const forcarIA = form?.get("ia") === "1";
  if (!(arquivo instanceof File) || !arquivo.size) return NextResponse.json({ error: "Envie o PDF do CNIS." }, { status: 400 });
  if (arquivo.size > LIMITE) return NextResponse.json({ error: "Arquivo maior que 20 MB." }, { status: 400 });

  const buf = Buffer.from(await arquivo.arrayBuffer());
  const ehPdf = arquivo.type === "application/pdf" || arquivo.name.toLowerCase().endsWith(".pdf");
  const ehImagem = /^image\/(png|jpe?g|webp)$/.test(arquivo.type);
  if (!ehPdf && !ehImagem) return NextResponse.json({ error: "Formato não suportado: envie PDF ou imagem." }, { status: 400 });

  let texto = "";
  if (ehPdf) {
    try {
      texto = await textoDoPdf(buf);
    } catch {
      return NextResponse.json({ error: "Não foi possível ler o PDF (protegido ou corrompido)." }, { status: 400 });
    }
  }

  let resultado: ResultadoCnis | null = null;
  let fonte: "leitor" | "ia" = "leitor";
  if (texto && !forcarIA) {
    resultado = lerCnis(texto);
    if (!resultado.vinculos.length) resultado = null;
  }

  if (!resultado) {
    const client = clienteIA();
    if (!client) return NextResponse.json({ error: "Não reconheci o formato e a IA não está configurada." }, { status: 422 });
    fonte = "ia";
    try {
      const conteudo: import("openai").default.Chat.Completions.ChatCompletionContentPart[] = texto.replace(/\s+/g, "").length > 200
        ? [{ type: "text", text: texto.slice(0, 180_000) }]
        : ehImagem
          ? [{ type: "image_url", image_url: { url: `data:${arquivo.type};base64,${buf.toString("base64")}`, detail: "high" } }]
          : [{ type: "file", file: { filename: arquivo.name, file_data: `data:application/pdf;base64,${buf.toString("base64")}` } }];
      const r = await client.chat.completions.create({
        model: MODELO,
        max_tokens: 16000,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: PROMPT_IA }, { role: "user", content: conteudo }],
      });
      const json = JSON.parse(r.choices[0].message.content || "{}");
      resultado = {
        segurado: json.segurado ?? {},
        vinculos: (Array.isArray(json.vinculos) ? json.vinculos : []).map((v: Record<string, unknown>, i: number) => ({
          seq: Number(v.seq) || i + 1,
          origem: String(v.origem ?? "Vínculo"),
          tipoFiliado: String(v.tipoFiliado ?? ""),
          inicio: typeof v.inicio === "string" ? v.inicio : null,
          fim: typeof v.fim === "string" ? v.fim : null,
          indicadores: Array.isArray(v.indicadores) ? v.indicadores.map(String) : [],
          remuneracoes: (Array.isArray(v.remuneracoes) ? v.remuneracoes : [])
            .map((x: { comp?: unknown; valor?: unknown }) => ({ comp: String(x.comp ?? ""), valor: Number(x.valor) }))
            .filter((x: { comp: string; valor: number }) => /^\d{4}-\d{2}$/.test(x.comp) && x.valor > 0),
        })),
        avisos: ["Dados extraídos por IA: confira datas e valores com o documento original."],
      };
    } catch (e) {
      console.error("[cnis] IA:", e);
      return NextResponse.json({ error: "Não foi possível extrair os dados do documento." }, { status: 502 });
    }
  }
  return NextResponse.json({ resultado, fonte });
}
