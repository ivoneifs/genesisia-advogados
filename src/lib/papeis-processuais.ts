// Papel (qualificação/posição) do cliente do escritório no processo.
// Usado no cadastro do processo, nos filtros de Processos e Clientes e no
// contexto da IA (peças e Assistente), para escrever do lado certo.

export type GrupoPapel = { grupo: string; exemplo: string; papeis: string[] };

export const GRUPOS_PAPEIS: GrupoPapel[] = [
  {
    grupo: "Relação com o escritório",
    exemplo: "Ex.: Outorgante numa procuração; Consulente num parecer; Assistido pela Defensoria/advocacia pro bono.",
    papeis: ["Cliente", "Constituinte", "Outorgante", "Mandante", "Consulente", "Assistido", "Representado", "Patrocinado", "Interessado", "Parte", "Contratante"],
  },
  {
    grupo: "Polo ativo (quem pede)",
    exemplo: "Ex.: Autor na ação de indenização; Reclamante na reclamação trabalhista; Impetrante no mandado de segurança.",
    papeis: ["Autor", "Requerente", "Reclamante", "Demandante", "Postulante", "Suplicante", "Impetrante", "Notificante"],
  },
  {
    grupo: "Polo passivo (contra quem se pede)",
    exemplo: "Ex.: Réu na ação de cobrança; Reclamado na Justiça do Trabalho; Requerido na tutela de urgência.",
    papeis: ["Réu", "Requerido", "Reclamado", "Demandado", "Notificado"],
  },
  {
    grupo: "Criminal",
    exemplo: "Ex.: Investigado no inquérito; Denunciado/Acusado na ação penal; Paciente no habeas corpus; Querelante na queixa-crime.",
    papeis: ["Acusado", "Denunciado", "Querelado", "Investigado", "Indiciado", "Paciente", "Querelante", "Assistente de Acusação"],
  },
  {
    grupo: "Execução e embargos",
    exemplo: "Ex.: Exequente no cumprimento de sentença; Executado na execução fiscal; Embargante nos embargos à execução.",
    papeis: ["Exequente", "Executado", "Embargante", "Embargado"],
  },
  {
    grupo: "Recursos",
    exemplo: "Ex.: Apelante quando o cliente recorre da sentença; Agravado quando a outra parte agrava; Recorrente no REsp/RE.",
    papeis: ["Apelante", "Apelado", "Agravante", "Agravado", "Recorrente", "Recorrido"],
  },
  {
    grupo: "Terceiros e intervenções",
    exemplo: "Ex.: Litisconsorte ao lado do autor; Terceiro interessado em embargos de terceiro; Interveniente no contrato.",
    papeis: ["Terceiro Interessado", "Litisconsorte", "Interveniente"],
  },
  {
    grupo: "Família, sucessões e incapazes",
    exemplo: "Ex.: Inventariante no inventário; Espólio como parte após o falecimento; Curatelado na interdição.",
    papeis: ["Inventariante", "Espólio", "Curatelado", "Tutelado"],
  },
  {
    grupo: "Oitivas",
    exemplo: "Ex.: cliente ouvido como Testemunha ou Declarante em audiência ou inquérito.",
    papeis: ["Relator", "Declarante", "Testemunha"],
  },
];

export const PAPEIS = GRUPOS_PAPEIS.flatMap((g) => g.papeis);

export function papelValido(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return PAPEIS.includes(s) ? s : null;
}

export function grupoDoPapel(papel: string | null | undefined): string | null {
  if (!papel) return null;
  return GRUPOS_PAPEIS.find((g) => g.papeis.includes(papel))?.grupo ?? null;
}

/** Papel usual da parte contrária, para a IA (ex.: Reclamante → Reclamado). */
const OPOSTOS: Record<string, string> = {
  Autor: "Réu", Requerente: "Requerido", Reclamante: "Reclamado", Demandante: "Demandado", Impetrante: "Impetrado (autoridade coatora)",
  Notificante: "Notificado", Réu: "Autor", Requerido: "Requerente", Reclamado: "Reclamante", Demandado: "Demandante", Notificado: "Notificante",
  Exequente: "Executado", Executado: "Exequente", Embargante: "Embargado", Embargado: "Embargante", Apelante: "Apelado", Apelado: "Apelante",
  Agravante: "Agravado", Agravado: "Agravante", Recorrente: "Recorrido", Recorrido: "Recorrente", Querelante: "Querelado", Querelado: "Querelante",
  Acusado: "Ministério Público (acusação)", Denunciado: "Ministério Público (acusação)", Paciente: "Autoridade coatora",
};

export function papelContrario(papel: string | null | undefined): string | null {
  return papel ? OPOSTOS[papel] ?? null : null;
}
