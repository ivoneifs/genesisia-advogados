-- Advogados do processo (nome, OAB, UF) importados do DJEN
ALTER TABLE "Processo" ADD COLUMN "advogados" JSONB;
