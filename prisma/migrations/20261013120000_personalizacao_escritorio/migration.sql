-- Personalização visual por escritório (logo, nome do topo, cores e tamanho das letras)
ALTER TABLE "Escritorio" ADD COLUMN "nomeTopo" TEXT;
ALTER TABLE "Escritorio" ADD COLUMN "logoVersao" TEXT;
ALTER TABLE "Escritorio" ADD COLUMN "logoTipo" TEXT;
ALTER TABLE "Escritorio" ADD COLUMN "capaVersao" TEXT;
ALTER TABLE "Escritorio" ADD COLUMN "capaTipo" TEXT;
ALTER TABLE "Escritorio" ADD COLUMN "corPrimaria" TEXT;
ALTER TABLE "Escritorio" ADD COLUMN "corMenu" TEXT;
ALTER TABLE "Escritorio" ADD COLUMN "tamanhoFonte" INTEGER NOT NULL DEFAULT 100;
