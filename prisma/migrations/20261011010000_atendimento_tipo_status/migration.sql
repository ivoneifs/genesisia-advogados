-- Canal e situação do atendimento (registros antigos: presencial/concluído)
ALTER TABLE "Atendimento" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'PRESENCIAL';
ALTER TABLE "Atendimento" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'CONCLUIDO';
