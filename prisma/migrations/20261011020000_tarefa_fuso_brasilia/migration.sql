-- Corrige o fuso das tarefas gravadas antes do ajuste de horário de Brasília.
-- Tarefas do formulário da Agenda (têm responsável) foram gravadas com o
-- horário digitado como se fosse UTC: somam-se 3 horas (BRT = UTC-3).
UPDATE "Tarefa" SET "data" = "data" + INTERVAL '3 hours'
WHERE "responsavelId" IS NOT NULL;

-- Tarefas automáticas de prazo (sem responsável) ficaram à meia-noite UTC,
-- que no Brasil vira 21h do dia anterior: passam para 9h de Brasília.
UPDATE "Tarefa" SET "data" = "data" + INTERVAL '12 hours'
WHERE "responsavelId" IS NULL AND "data" = date_trunc('day', "data");
