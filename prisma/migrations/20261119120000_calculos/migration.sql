-- Módulos desligados por escritório
ALTER TABLE "Escritorio" ADD COLUMN "modulosDesativados" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Cálculos previdenciários e trabalhistas
CREATE TABLE "Calculo" (
    "id" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "resumo" JSONB,
    "parecer" TEXT,
    "criadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT,
    "processoId" TEXT,
    "escritorioId" TEXT NOT NULL,
    CONSTRAINT "Calculo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Calculo_escritorioId_area_updatedAt_idx" ON "Calculo"("escritorioId", "area", "updatedAt");
ALTER TABLE "Calculo" ADD CONSTRAINT "Calculo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Calculo" ADD CONSTRAINT "Calculo_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Calculo" ADD CONSTRAINT "Calculo_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Índices econômicos (cache do Banco Central)
CREATE TABLE "IndiceMensal" (
    "serie" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "IndiceMensal_pkey" PRIMARY KEY ("serie","mes")
);
CREATE TABLE "IndiceSync" (
    "serie" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IndiceSync_pkey" PRIMARY KEY ("serie")
);
