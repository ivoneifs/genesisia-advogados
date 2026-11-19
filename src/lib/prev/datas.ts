// Datas do módulo previdenciário. Tudo em UTC e no formato "AAAA-MM-DD"
// (dia) ou "AAAA-MM" (competência), para não sofrer com fuso horário.

export const DIA_MS = 86_400_000;
export const DIAS_ANO = 365.25;
export const DIAS_MES = DIAS_ANO / 12;

// Marcos legais.
export const EC20 = "1998-12-16";
export const LEI_9876 = "1999-11-28";
export const EC103 = "2019-11-13"; // último dia das regras antigas
export const INICIO_PBC = "1994-07"; // Plano Real: início do período básico de cálculo

export function valida(iso: string | null | undefined): iso is string {
  return !!iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(iso + "T00:00:00Z"));
}

/** Número do dia (dias desde 1970-01-01). */
export function diaN(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, d) / DIA_MS);
}

export function deDiaN(n: number): string {
  return new Date(n * DIA_MS).toISOString().slice(0, 10);
}

export function hojeISO(): string {
  const agora = new Date();
  // Data de Brasília (UTC-3).
  return new Date(agora.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
}

export function somaDias(iso: string, dias: number): string {
  return deDiaN(diaN(iso) + dias);
}

export function somaMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}

export function somaAnos(iso: string, anos: number): string {
  const inteiros = Math.floor(anos);
  const meses = Math.round((anos - inteiros) * 12);
  return somaMeses(iso, inteiros * 12 + meses);
}

/** Idade (anos com fração) numa data. */
export function idadeEm(nascimento: string, data: string): number {
  const [an, mn, dn] = nascimento.split("-").map(Number);
  const [a, m, d] = data.split("-").map(Number);
  let anos = a - an;
  if (m < mn || (m === mn && d < dn)) anos--;
  const aniversario = somaAnos(nascimento, anos);
  const proximo = somaAnos(nascimento, anos + 1);
  return anos + (diaN(data) - diaN(aniversario)) / (diaN(proximo) - diaN(aniversario));
}

/** Data em que a pessoa completa uma idade (anos, aceita meio ano). */
export function dataDaIdade(nascimento: string, anos: number): string {
  return somaAnos(nascimento, anos);
}

export function competencia(iso: string): string {
  return iso.slice(0, 7);
}

export function compN(comp: string): number {
  const [a, m] = comp.split("-").map(Number);
  return a * 12 + (m - 1);
}

export function deCompN(n: number): string {
  const a = Math.floor(n / 12);
  const m = (n % 12) + 1;
  return `${a}-${String(m).padStart(2, "0")}`;
}

export function somaComp(comp: string, meses: number): string {
  return deCompN(compN(comp) + meses);
}

export function ultimoDiaComp(comp: string): string {
  const [a, m] = comp.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}

/**
 * Converte dias em anos/meses/dias (ano de 365,25 dias, mês de 30,4375).
 * Tolerância de 2 dias para que períodos de anos exatos não apareçam como
 * "14a 11m 29d" por causa da média dos anos bissextos.
 */
export function amd(dias: number): { anos: number; meses: number; dias: number } {
  const total = Math.max(0, dias);
  const tol = 2 / DIAS_ANO;
  const anos = Math.floor(total / DIAS_ANO + tol);
  const resto = Math.max(0, total - anos * DIAS_ANO);
  let meses = Math.floor(resto / DIAS_MES + 2 / DIAS_MES);
  let d = Math.max(0, Math.floor(resto - meses * DIAS_MES));
  if (d >= 30) {
    meses++;
    d = 0;
  }
  if (meses >= 12) return { anos: anos + 1, meses: 0, dias: d };
  return { anos, meses, dias: d };
}

export function fmtAMD(dias: number): string {
  const { anos, meses, dias: d } = amd(dias);
  return `${anos}a ${meses}m ${d}d`;
}

export function fmtData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return d ? `${d}/${m}/${a}` : `${m}/${a}`;
}

export function fmtComp(comp: string): string {
  const [a, m] = comp.split("-");
  return `${m}/${a}`;
}

/** "dd/mm/aaaa" → "aaaa-mm-dd" (ou null). */
export function deBR(br: string): string | null {
  const m = br.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return valida(iso) ? iso : null;
}

export function anosParaDias(anos: number) {
  return anos * DIAS_ANO;
}
