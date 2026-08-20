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

  const { id } = await params;
  const documento = await prisma.documento.findFirst({
    where: { id, escritorioId: session.escritorioId ?? undefined },
  });
  if (!documento || !documento.arquivoNome) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(UPLOAD_DIR, id));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": documento.arquivoTipo ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          documento.arquivoNome
        )}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
