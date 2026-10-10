// Regras de acesso de um escritório (status comercial + trial).
// Centraliza a decisão para login e layout usarem a mesma lógica.

export type EscritorioAcesso = {
  ativo: boolean;
  status: string; // TRIAL | ATIVO | SUSPENSO
  trialExpira: Date | null;
};

export const TRIAL_DIAS = 14;

export function trialExpirado(e: EscritorioAcesso): boolean {
  if (e.status !== "TRIAL") return false;
  if (!e.trialExpira) return false;
  return e.trialExpira.getTime() < Date.now();
}

/**
 * Retorna null se o escritório pode acessar, ou uma mensagem explicando
 * o bloqueio (desativado, suspenso ou trial expirado).
 */
export function motivoBloqueio(e: EscritorioAcesso): string | null {
  if (!e.ativo || e.status === "SUSPENSO") {
    return "O acesso do seu escritório está suspenso. Fale com o suporte.";
  }
  if (trialExpirado(e)) {
    return "Seu período de teste terminou. Fale com o suporte para ativar o plano.";
  }
  return null;
}

/** Dias restantes de trial (0 se não for trial ou já expirou). */
export function diasRestantesTrial(e: EscritorioAcesso): number {
  if (e.status !== "TRIAL" || !e.trialExpira) return 0;
  const ms = e.trialExpira.getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function novoTrialExpira(dias = TRIAL_DIAS): Date {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
}
