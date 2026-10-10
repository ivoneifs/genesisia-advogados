import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { whereProcessos } from "@/lib/processos-filtro";
import { parseAdvogados, formatAdvogado } from "@/lib/advogados";

export const runtime = "nodejs";

// Exporta todos os processos do filtro atual (não só a página visível).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.escritorioId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "TODOS";
  const q = req.nextUrl.searchParams.get("q") ?? undefined;

  const processos = await prisma.processo.findMany({
    where: whereProcessos(session.escritorioId, status, q),
    orderBy: { createdAt: "desc" },
    select: {
      numero: true,
      area: true,
      status: true,
      tribunal: true,
      vara: true,
      parteContraria: true,
      advogados: true,
      cliente: { select: { nome: true } },
    },
  });

  const celula = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const linhas = [
    ["Número", "Cliente", "Parte contrária", "Área", "Status", "Tribunal/Vara", "Advogados"].join(";"),
    ...processos.map((p) =>
      [
        p.numero,
        p.cliente.nome,
        p.parteContraria,
        p.area,
        p.status,
        [p.tribunal, p.vara].filter(Boolean).join(" - "),
        parseAdvogados(p.advogados).map(formatAdvogado).join("; "),
      ]
        .map(celula)
        .join(";")
    ),
  ];

  return new NextResponse("﻿" + linhas.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="processos.csv"',
    },
  });
}
