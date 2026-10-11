-- Importação por OAB em segundo plano, com progresso
CREATE TABLE "ImportacaoOab" (
    "id" TEXT NOT NULL,
    "oab" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RODANDO',
    "baixadas" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "processos" INTEGER NOT NULL DEFAULT 0,
    "novos" INTEGER NOT NULL DEFAULT 0,
    "ativos" INTEGER NOT NULL DEFAULT 0,
    "arquivados" INTEGER NOT NULL DEFAULT 0,
    "publicacoes" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "escritorioId" TEXT NOT NULL,

    CONSTRAINT "ImportacaoOab_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ImportacaoOab_escritorioId_createdAt_idx" ON "ImportacaoOab"("escritorioId", "createdAt");
ALTER TABLE "ImportacaoOab" ADD CONSTRAINT "ImportacaoOab_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
