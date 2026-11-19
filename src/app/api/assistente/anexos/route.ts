import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { bloqueioApi } from "@/lib/modulos-server";
import { rateLimit } from "@/lib/rate-limit";
import { ErroAnexo, excluirAnexo, resumo, salvarAnexo } from "@/lib/ai/anexos";

export const runtime = "nodejs";
export const maxDuration = 120;

// Envio de um arquivo do processo para o Assistente IA.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.escritorioId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const bloqueio = bloqueioApi(session, "assistente.anexos");
  if (bloqueio) return bloqueio;

  const rl = rateLimit(`ia-anexo:${session.userId}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitos envios seguidos. Aguarde ${rl.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  try {
    const anexo = await salvarAnexo(session.escritorioId, arquivo);
    return NextResponse.json({ anexo: resumo(anexo) });
  } catch (e) {
    if (e instanceof ErroAnexo) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[assistente] erro ao salvar anexo:", e);
    return NextResponse.json({ error: "Erro ao processar o arquivo." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.escritorioId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id") ?? "";
  await excluirAnexo(session.escritorioId, id);
  return NextResponse.json({ ok: true });
}
