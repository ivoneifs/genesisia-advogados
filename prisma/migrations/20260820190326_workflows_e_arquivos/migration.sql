-- AlterTable
ALTER TABLE "Documento" ADD COLUMN "arquivoNome" TEXT;
ALTER TABLE "Documento" ADD COLUMN "arquivoTam" INTEGER;
ALTER TABLE "Documento" ADD COLUMN "arquivoTipo" TEXT;

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "gatilho" TEXT NOT NULL,
    "diasAntes" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "execucoes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
