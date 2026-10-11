-- Alertas por WhatsApp (Evolution API)
ALTER TABLE "User" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "receberWhatsapp" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Publicacao" ADD COLUMN "alertaEnviado" BOOLEAN NOT NULL DEFAULT false;
-- As publicações que já existem não geram alerta (seriam milhares de avisos).
UPDATE "Publicacao" SET "alertaEnviado" = true;

CREATE TABLE "ConfigWhatsapp" (
    "id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "instancia" TEXT,
    "agenda" BOOLEAN NOT NULL DEFAULT true,
    "prazos" BOOLEAN NOT NULL DEFAULT true,
    "publicacoes" BOOLEAN NOT NULL DEFAULT true,
    "resumoDiario" BOOLEAN NOT NULL DEFAULT true,
    "clientes" BOOLEAN NOT NULL DEFAULT false,
    "horaResumo" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "escritorioId" TEXT NOT NULL,

    CONSTRAINT "ConfigWhatsapp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConfigWhatsapp_escritorioId_key" ON "ConfigWhatsapp"("escritorioId");
ALTER TABLE "ConfigWhatsapp" ADD CONSTRAINT "ConfigWhatsapp_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AlertaEnviado" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "nome" TEXT,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "erro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "escritorioId" TEXT NOT NULL,

    CONSTRAINT "AlertaEnviado_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AlertaEnviado_chave_key" ON "AlertaEnviado"("chave");
CREATE INDEX "AlertaEnviado_escritorioId_createdAt_idx" ON "AlertaEnviado"("escritorioId", "createdAt");
ALTER TABLE "AlertaEnviado" ADD CONSTRAINT "AlertaEnviado_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
