"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { registrarAtividade } from "@/lib/atividade";
import { exigir } from "@/lib/usuario";
import { requireEscritorioId } from "@/lib/session";
import { clienteValido, processoValido } from "@/lib/tenant";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function createDocumento(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;

  const escritorioId = await requireEscritorioId();
  const processoOk = await processoValido(
    String(formData.get("processoId") ?? "") || null,
    escritorioId
  );
  const clienteOk = await clienteValido(
    String(formData.get("clienteId") ?? "") || null,
    escritorioId
  );
  const arquivo = formData.get("arquivo");
  const id = randomUUID();

  let arquivoNome: string | null = null;
  let arquivoTipo: string | null = null;
  let arquivoTam: number | null = null;

  // Mesmo limite do next.config.ts (serverActions.bodySizeLimit).
  if (arquivo instanceof File && arquivo.size > 20 * 1024 * 1024) return;

  if (arquivo instanceof File && arquivo.size > 0) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, id), buffer);
    arquivoNome = arquivo.name;
    arquivoTipo = arquivo.type || "application/octet-stream";
    arquivoTam = arquivo.size;
  }

  await prisma.documento.create({
    data: {
      id,
      titulo,
      escritorioId,
      tipo: String(formData.get("tipo") ?? "OUTRO"),
      observacoes: String(formData.get("observacoes") ?? "") || null,
      processoId: processoOk,
      clienteId: clienteOk,
      arquivoNome,
      arquivoTipo,
      arquivoTam,
    },
  });
  await registrarAtividade("CRIOU", "Documento", titulo, id);

  revalidatePath("/documentos");
}

export async function deleteDocumento(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { escritorioId } = await exigir("excluir");
  const documento = await prisma.documento.findFirst({ where: { id, escritorioId } });
  if (!documento) return;

  await prisma.documento.delete({ where: { id } });
  await registrarAtividade("EXCLUIU", "Documento", documento.titulo, id);

  if (documento.arquivoNome) {
    await unlink(path.join(UPLOAD_DIR, id)).catch(() => {});
  }

  revalidatePath("/documentos");
}
