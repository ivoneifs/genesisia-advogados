-- Cadastro de advogados do escritório
CREATE TABLE "Advogado" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "oab" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "escritorioId" TEXT NOT NULL,

    CONSTRAINT "Advogado_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Advogado_escritorioId_oab_uf_key" ON "Advogado"("escritorioId", "oab", "uf");

ALTER TABLE "Advogado" ADD CONSTRAINT "Advogado_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
