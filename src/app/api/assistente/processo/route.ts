import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bloqueioApi } from "@/lib/modulos-server";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_ANEXOS, resumo, salvarAnexo, type AnexoResumo } from "@/lib/ai/anexos";
import { formatCurrency } from "@/lib/format";
import { formatAdvogado, parseAdvogados } from "@/lib/advogados";
import { papelContrario } from "@/lib/papeis-processuais";

export const runtime = "nodejs";
export const maxDuration = 120;

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const LIMITE_DOSSIE = 220_000; // caracteres do dossiê em texto
const data = (d: Date | null | undefined) => (d ? d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
// Datas "só dia" (prazo, vencimento, publicação) ficam gravadas à meia-noite UTC.
const dia = (d: Date | null | undefined) => (d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");

// Leva um processo do escritório para o Assistente IA: monta um dossiê em
// texto (dados, partes, prazos, publicações, andamentos...) e anexa os
// documentos com arquivo vinculados ao processo.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.escritorioId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const bloqueio = bloqueioApi(session, "assistente.anexos");
  if (bloqueio) return bloqueio;
  const rl = rateLimit(`ia-processo:${session.userId}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Aguarde ${rl.retryAfterSec}s.` }, { status: 429 });

  const body = await req.json().catch(() => null);
  const processoId = String(body?.processoId ?? "");
  const escritorioId = session.escritorioId;
  const p = await prisma.processo.findFirst({
    where: { id: processoId, escritorioId },
    include: {
      cliente: true,
      responsavel: { select: { name: true } },
      prazos: { orderBy: { dataVencimento: "asc" } },
      tarefas: { orderBy: { data: "desc" }, take: 60 },
      atendimentos: { orderBy: { data: "desc" }, take: 40 },
      financeiros: { orderBy: { vencimento: "asc" } },
      publicacoes: { orderBy: { dataPublicacao: "desc" }, take: 300 },
      documentos: { orderBy: { createdAt: "desc" } },
      calculos: { orderBy: { updatedAt: "desc" }, take: 20, select: { titulo: true, area: true, resumo: true, updatedAt: true } },
    },
  });
  if (!p) return NextResponse.json({ error: "Processo não encontrado." }, { status: 404 });

  const L: string[] = [];
  L.push(`DOSSIÊ DO PROCESSO ${p.numero}`, `Gerado em ${data(new Date())} pelo Genesis IA.`, "");
  L.push("DADOS DO PROCESSO");
  L.push(`Número: ${p.numero}`, `Situação: ${p.status}`, `Área/classe: ${p.area ?? "—"}`, `Tribunal: ${p.tribunal ?? "—"}`, `Vara/órgão: ${p.vara ?? "—"}`);
  L.push(`Valor da causa: ${p.valorCausa != null ? formatCurrency(p.valorCausa) : "—"}`, `Papel do cliente no processo: ${p.papelCliente ?? "não informado"}${papelContrario(p.papelCliente) ? ` (parte contrária como ${papelContrario(p.papelCliente)})` : ""}`, `Parte contrária: ${p.parteContraria ?? "—"}`, `Responsável no escritório: ${p.responsavel?.name ?? "—"}`, `Cadastrado em: ${data(p.createdAt)}`);
  const advs = parseAdvogados(p.advogados);
  if (advs.length) L.push(`Advogados no processo: ${advs.map(formatAdvogado).join("; ")}`);
  L.push("", "CLIENTE");
  L.push(`Nome: ${p.cliente.nome} (${p.cliente.tipo === "PJ" ? "pessoa jurídica" : "pessoa física"})`, `Documento: ${p.cliente.documento ?? "—"}`, `Contato: ${[p.cliente.telefone, p.cliente.email].filter(Boolean).join(" · ") || "—"}`, `Endereço: ${p.cliente.endereco ?? "—"}`);
  if (p.cliente.observacoes) L.push(`Observações do cliente: ${p.cliente.observacoes}`);
  if (p.descricao) L.push("", "DESCRIÇÃO / OBSERVAÇÕES DO PROCESSO", p.descricao);

  if (p.prazos.length) {
    L.push("", "PRAZOS");
    for (const x of p.prazos) L.push(`- ${dia(x.dataVencimento)} — ${x.titulo} [${x.status}, prioridade ${x.prioridade}]${x.descricao ? `: ${x.descricao}` : ""}`);
  }
  if (p.tarefas.length) {
    L.push("", "TAREFAS E COMPROMISSOS");
    for (const x of p.tarefas) L.push(`- ${data(x.data)} — ${x.tipo}: ${x.titulo}${x.concluida ? " (concluída)" : ""}${x.descricao ? `: ${x.descricao}` : ""}`);
  }
  if (p.atendimentos.length) {
    L.push("", "ATENDIMENTOS AO CLIENTE");
    for (const x of p.atendimentos) L.push(`- ${data(x.data)} — ${x.tipo}: ${x.titulo}${x.descricao ? `: ${x.descricao}` : ""}`);
  }
  if (p.financeiros.length) {
    L.push("", "FINANCEIRO DO PROCESSO");
    for (const x of p.financeiros) L.push(`- ${dia(x.vencimento)} — ${x.tipo} ${formatCurrency(x.valor)}: ${x.descricao} [${x.status}]`);
  }
  if (p.calculos.length) {
    L.push("", "CÁLCULOS SALVOS");
    for (const x of p.calculos) L.push(`- ${x.titulo} (${x.area === "TRABALHISTA" ? "trabalhista" : "previdenciário"}, ${data(x.updatedAt)})${(x.resumo as { destaque?: string } | null)?.destaque ? `: ${(x.resumo as { destaque?: string }).destaque}` : ""}`);
  }
  if (p.documentos.length) {
    L.push("", "DOCUMENTOS CADASTRADOS");
    for (const x of p.documentos) L.push(`- ${data(x.createdAt)} — ${x.titulo} (${x.tipo})${x.arquivoNome ? ` · arquivo ${x.arquivoNome}` : ""}${x.observacoes ? `: ${x.observacoes}` : ""}`);
  }
  if (p.publicacoes.length) {
    L.push("", `PUBLICAÇÕES E INTIMAÇÕES (${p.publicacoes.length}, da mais recente para a mais antiga)`);
    for (const x of p.publicacoes) L.push("", `[${dia(x.dataPublicacao)}${x.diario ? ` — ${x.diario}` : ""} — ${x.status}]`, x.conteudo.replace(/\s+\n/g, "\n").trim());
  }
  let dossie = L.join("\n");
  let avisoCorte = "";
  if (dossie.length > LIMITE_DOSSIE) {
    dossie = dossie.slice(0, LIMITE_DOSSIE) + "\n\n[... publicações mais antigas omitidas por tamanho ...]";
    avisoCorte = "Dossiê muito grande: as publicações mais antigas ficaram de fora.";
  }

  const anexos: AnexoResumo[] = [];
  const avisos: string[] = avisoCorte ? [avisoCorte] : [];
  const nomeArq = `Dossie_processo_${p.numero.replace(/[^\w.-]+/g, "_")}.txt`;
  anexos.push(resumo(await salvarAnexo(escritorioId, new File([dossie], nomeArq, { type: "text/plain" }))));

  // Documentos com arquivo (PDF, Word, imagem), até completar o limite de anexos.
  for (const d of p.documentos.filter((x) => x.arquivoNome)) {
    if (anexos.length >= MAX_ANEXOS) {
      avisos.push(`Limite de ${MAX_ANEXOS} anexos: alguns documentos do processo não foram levados (anexe manualmente se precisar).`);
      break;
    }
    try {
      const buf = await readFile(path.join(UPLOAD_DIR, d.id));
      anexos.push(resumo(await salvarAnexo(escritorioId, new File([buf], d.arquivoNome!, { type: d.arquivoTipo ?? "" }))));
    } catch (e) {
      avisos.push(`"${d.arquivoNome}": ${e instanceof Error ? e.message : "não foi possível ler"}`);
    }
  }

  return NextResponse.json({ processo: { id: p.id, numero: p.numero, cliente: p.cliente.nome }, anexos, avisos });
}
