import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Exige escritório: sem isso o filtro colapsaria para `{ id }` e permitiria
  // baixar documento de qualquer tenant (IDOR).
  if (!session.escritorioId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const documento = await prisma.documento.findFirst({
    where: { id, escritorioId: session.escritorioId },
  });
  if (!documento || !documento.arquivoNome) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(UPLOAD_DIR, id));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": documento.arquivoTipo ?? "application/octet-stream",
        // filename* (RFC 5987) preserva acentos; filename é o fallback ASCII.
        "Content-Disposition": `attachment; filename="${documento.arquivoNome
          .normalize("NFD")
          .replace(/[^\x20-\x7e]/g, "")
          .replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(documento.arquivoNome)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
