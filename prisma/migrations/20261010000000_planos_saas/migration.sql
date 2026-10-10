-- Planos / status / trial no Escritorio (SaaS)
ALTER TABLE "Escritorio" ADD COLUMN "plano" TEXT NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "Escritorio" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "Escritorio" ADD COLUMN "trialExpira" TIMESTAMP(3);

-- Escritórios que já existiam passam a ser clientes ativos (não trial)
UPDATE "Escritorio" SET "status" = 'ATIVO', "plano" = 'BASICO' WHERE "createdAt" < NOW();
