// Perfis de acesso dentro de um escritório. Funções puras: usadas tanto no
// servidor (bloqueio) quanto nos componentes (esconder o que não pode).

export const PAPEIS = ["SOCIO", "ADVOGADO", "ESTAGIARIO"] as const;
export type Papel = (typeof PAPEIS)[number];

export const PAPEL_LABEL: Record<string, string> = {
  SOCIO: "Sócio / administrador",
  ADVOGADO: "Advogado(a)",
  ESTAGIARIO: "Estagiário(a)",
  SUPERADMIN: "Superadmin",
};

export const PAPEL_DESCRICAO: Record<string, string> = {
  SOCIO: "Acesso total: financeiro, equipe, WhatsApp e histórico de atividades.",
  ADVOGADO: "Processos, agenda, peças e clientes. Sem financeiro e sem gestão da equipe.",
  ESTAGIARIO: "Como advogado, mas não pode excluir registros.",
};

export type Permissao = "financeiro" | "gerenciar" | "excluir";

export function pode(papel: string | null | undefined, p: Permissao): boolean {
  if (papel === "SOCIO") return true;
  if (p === "excluir") return papel === "ADVOGADO";
  return false;
}

export function papelValido(v: unknown): Papel {
  return PAPEIS.includes(v as Papel) ? (v as Papel) : "ADVOGADO";
}
