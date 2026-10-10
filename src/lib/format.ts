export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Datas "só dia" (prazos, vencimentos, publicações) são gravadas à meia-noite
// UTC; por isso formatDate/daysUntil as leem em UTC.
export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntil(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  // "Hoje" é o dia corrente em Brasília; o alvo é o dia gravado (UTC).
  const hoje = Date.parse(`${toInputDateTimeBR(new Date()).slice(0, 10)}T00:00:00Z`);
  const alvo = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((alvo - hoje) / (1000 * 60 * 60 * 24));
}

// Data/hora no fuso de Brasília (o servidor roda em UTC). O Brasil não tem
// horário de verão desde 2019, então o offset é fixo em -03:00.
const FUSO_BR = "America/Sao_Paulo";

export function formatDateTimeBR(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", {
    timeZone: FUSO_BR,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Valor para <input type="datetime-local"> (AAAA-MM-DDTHH:mm, horário de Brasília). */
export function toInputDateTimeBR(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO_BR,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Converte o valor de um datetime-local (horário de Brasília) em Date; null se inválido. */
export function parseInputDateTimeBR(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Data (dd/mm/aaaa) de um instante, no fuso de Brasília. */
export function formatDateBR(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { timeZone: FUSO_BR });
}

/** Instante da meia-noite (Brasília) do dia de hoje + `dias`. */
export function inicioDoDiaBR(dias = 0): Date {
  const hoje = toInputDateTimeBR(new Date()).slice(0, 10);
  return new Date(Date.parse(`${hoje}T00:00:00-03:00`) + dias * 86_400_000);
}

/**
 * Hoje (dia de Brasília) + `dias`, no formato das datas "só dia"
 * (meia-noite UTC), para comparar com prazos e vencimentos.
 */
export function diaBRSoDia(dias = 0): Date {
  const hoje = toInputDateTimeBR(new Date()).slice(0, 10);
  return new Date(Date.parse(`${hoje}T00:00:00Z`) + dias * 86_400_000);
}
