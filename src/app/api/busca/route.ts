import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export type ResultadoBusca = {
  tipo: "Processo" | "Cliente" | "Contato" | "Advogado" | "Documento";
  titulo: string;
  detalhe: string;
  href: string;
};

const LIMITE = 5;

// Busca rápida (Ctrl+K) em processos, clientes, contatos, advogados e documentos.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.escritorioId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ resultados: [] });

  const escritorioId = session.escritorioId;
  const contem = { contains: q, mode: "insensitive" as const };
  const digitos = q.replace(/\D/g, "");

  const [processos, clientes, contatos, advogados, documentos] = await Promise.all([
    prisma.processo.findMany({
      where: {
        escritorioId,
        OR: [
          { numero: contem },
          ...(digitos.length >= 4 ? [{ numero: { contains: digitos } }] : []),
          { parteContraria: contem },
          { cliente: { nome: contem } },
        ],
      },
      take: LIMITE,
      orderBy: { createdAt: "desc" },
      select: { id: true, numero: true, area: true, cliente: { select: { nome: true } } },
    }),
    prisma.cliente.findMany({
      where: { escritorioId, OR: [{ nome: contem }, { documento: contem }, { email: contem }] },
      take: LIMITE,
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, documento: true, telefone: true },
    }),
    prisma.contato.findMany({
      where: { escritorioId, OR: [{ nome: contem }, { empresa: contem }, { email: contem }] },
      take: LIMITE,
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, empresa: true },
    }),
    prisma.advogado.findMany({
      where: { escritorioId, OR: [{ nome: contem }, { oab: { contains: digitos || q } }] },
      take: LIMITE,
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, oab: true, uf: true },
    }),
    prisma.documento.findMany({
      where: { escritorioId, titulo: contem },
      take: LIMITE,
      orderBy: { createdAt: "desc" },
      select: { id: true, titulo: true, tipo: true },
    }),
  ]);

  const resultados: ResultadoBusca[] = [
    ...processos.map((p) => ({
      tipo: "Processo" as const,
      titulo: p.numero,
      detalhe: [p.cliente.nome, p.area].filter(Boolean).join(" · "),
      href: `/processos/${p.id}`,
    })),
    ...clientes.map((c) => ({
      tipo: "Cliente" as const,
      titulo: c.nome,
      detalhe: [c.documento, c.telefone].filter(Boolean).join(" · "),
      href: `/clientes/${c.id}`,
    })),
    ...contatos.map((c) => ({
      tipo: "Contato" as const,
      titulo: c.nome,
      detalhe: c.empresa ?? "",
      href: `/contatos/${c.id}`,
    })),
    ...advogados.map((a) => ({
      tipo: "Advogado" as const,
      titulo: a.nome,
      detalhe: `OAB ${a.oab}/${a.uf}`,
      href: `/advogados/${a.id}/editar`,
    })),
    ...documentos.map((d) => ({
      tipo: "Documento" as const,
      titulo: d.titulo,
      detalhe: d.tipo,
      href: `/documentos`,
    })),
  ];
  return NextResponse.json({ resultados });
}
