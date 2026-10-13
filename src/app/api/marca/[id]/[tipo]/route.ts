import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { arquivoMarca } from "@/lib/marca-arquivos";

// Logo e capa do escritório: só para quem é do escritório ou superadmin.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tipo: string }> }
) {
  const { id, tipo } = await params;
  if (tipo !== "logo" && tipo !== "capa") return new NextResponse(null, { status: 404 });

  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });
  if (session.role !== "SUPERADMIN" && session.escritorioId !== id) {
    return new NextResponse(null, { status: 403 });
  }

  const e = await prisma.escritorio.findUnique({
    where: { id },
    select: { logoTipo: true, capaTipo: true },
  });
  const contentType = tipo === "logo" ? e?.logoTipo : e?.capaTipo;
  if (!contentType) return new NextResponse(null, { status: 404 });

  try {
    const buf = await readFile(arquivoMarca(id, tipo));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        // A URL leva ?v=<versão>: trocar a imagem muda a URL.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
