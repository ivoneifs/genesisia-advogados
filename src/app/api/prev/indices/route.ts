import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { bloqueioApi } from "@/lib/modulos-server";
import { obterIndices } from "@/lib/prev/indices-server";

export const runtime = "nodejs";

// Índices econômicos (INPC, IPCA, IPCA-E, Selic) do Banco Central, em cache.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!session.escritorioId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b1 = bloqueioApi(session, "previdenciario");
  const b2 = bloqueioApi(session, "trabalhista");
  if (b1 && b2) return b1;
  const dados = await obterIndices();
  return NextResponse.json(dados, { headers: { "Cache-Control": "private, max-age=3600" } });
}
