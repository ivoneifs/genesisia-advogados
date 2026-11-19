-- Papel do cliente no processo (Autor, Réu, Reclamante...)
ALTER TABLE "Processo" ADD COLUMN "papelCliente" TEXT;
CREATE INDEX "Processo_escritorioId_papelCliente_idx" ON "Processo"("escritorioId", "papelCliente");
