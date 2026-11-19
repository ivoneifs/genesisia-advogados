// Catálogo de módulos e funções que o superadmin liga/desliga por escritório.
// O banco guarda só o que está DESLIGADO (Escritorio.modulosDesativados), então
// todo módulo novo nasce ligado para os escritórios que já existem.

export type Modulo = {
  id: string;
  nome: string;
  rota?: string; // prefixo de URL protegido por este módulo
  funcoes?: { id: string; nome: string }[];
};

export type GrupoModulos = { titulo: string; modulos: Modulo[] };

export const GRUPOS_MODULOS: GrupoModulos[] = [
  {
    titulo: "Principal",
    modulos: [
      { id: "assistente", nome: "Assistente IA", rota: "/assistente", funcoes: [{ id: "assistente.anexos", nome: "Envio de processos (PDF, Word, imagens)" }] },
      { id: "revisor", nome: "Revisor de textos (IA)", rota: "/revisor" },
      { id: "agenda", nome: "Agenda", rota: "/agenda" },
      { id: "alertas", nome: "Alertas", rota: "/alertas" },
    ],
  },
  {
    titulo: "Jurídico",
    modulos: [
      { id: "processos", nome: "Processos e casos", rota: "/processos" },
      { id: "kanban", nome: "Gestão kanban", rota: "/kanban" },
      { id: "publicacoes", nome: "Publicações", rota: "/publicacoes" },
      { id: "pecas", nome: "Criação de peças", rota: "/pecas" },
      { id: "documentos", nome: "Documentos", rota: "/documentos" },
      { id: "pesquisa", nome: "Pesquisa", rota: "/pesquisa" },
    ],
  },
  {
    titulo: "Cálculos",
    modulos: [
      {
        id: "previdenciario",
        nome: "Cálculos previdenciários",
        rota: "/previdenciario",
        funcoes: [
          { id: "previdenciario.cnis", nome: "Importação do CNIS" },
          { id: "previdenciario.aposentadoria", nome: "Análise de aposentadoria e RMI" },
          { id: "previdenciario.planejamento", nome: "Planejamento previdenciário" },
          { id: "previdenciario.atrasados", nome: "Atrasados, revisão e valor da causa" },
          { id: "previdenciario.beneficios", nome: "Incapacidade, pensão e auxílio-acidente" },
          { id: "previdenciario.ferramentas", nome: "Ferramentas (fator, qualidade de segurado, acúmulo, datas)" },
          { id: "previdenciario.rpps", nome: "Servidor público (RPPS) e militares" },
          { id: "previdenciario.parecer", nome: "Parecer, petição e assistente de cálculos (IA)" },
        ],
      },
      {
        id: "trabalhista",
        nome: "Cálculos trabalhistas",
        rota: "/trabalhista",
        funcoes: [
          { id: "trabalhista.rescisao", nome: "Rescisão contratual" },
          { id: "trabalhista.horas", nome: "Horas extras, noturno e reflexos" },
          { id: "trabalhista.adicionais", nome: "Insalubridade, periculosidade e diferenças salariais" },
          { id: "trabalhista.liquidacao", nome: "Liquidação de sentença (IPCA-E/Selic)" },
          { id: "trabalhista.ferramentas", nome: "Ferramentas (INSS, IRRF, FGTS, férias, 13º)" },
          { id: "trabalhista.parecer", nome: "Parecer e petição com IA" },
        ],
      },
    ],
  },
  {
    titulo: "Relacionamento",
    modulos: [
      { id: "clientes", nome: "Clientes", rota: "/clientes" },
      { id: "atendimentos", nome: "Atendimentos", rota: "/atendimentos" },
      { id: "contatos", nome: "Contatos", rota: "/contatos" },
      { id: "advogados", nome: "Advogados", rota: "/advogados" },
    ],
  },
  {
    titulo: "Gestão",
    modulos: [
      { id: "financeiro", nome: "Financeiro", rota: "/financeiro" },
      { id: "indicadores", nome: "Indicadores", rota: "/indicadores" },
      { id: "workflows", nome: "Workflows", rota: "/workflows" },
      { id: "whatsapp", nome: "WhatsApp", rota: "/whatsapp" },
      { id: "atividades", nome: "Atividades", rota: "/atividades" },
    ],
  },
];

export const TODOS_MODULOS = GRUPOS_MODULOS.flatMap((g) => g.modulos);
export const IDS_VALIDOS = new Set(
  TODOS_MODULOS.flatMap((m) => [m.id, ...(m.funcoes ?? []).map((f) => f.id)])
);

/** Está ligado? Uma função depende também do módulo pai. */
export function ativo(desativados: readonly string[] | null | undefined, id: string): boolean {
  const lista = desativados ?? [];
  if (lista.includes(id)) return false;
  const pai = id.includes(".") ? id.split(".")[0] : null;
  return pai ? !lista.includes(pai) : true;
}

/** Módulo que protege uma URL (ou null se a página não depende de módulo). */
export function moduloDaRota(pathname: string): Modulo | null {
  for (const m of TODOS_MODULOS) {
    if (m.rota && (pathname === m.rota || pathname.startsWith(m.rota + "/"))) return m;
  }
  return null;
}

/** Rotas de API que pertencem a um módulo/função. */
export function moduloDaApi(pathname: string): string | null {
  if (pathname.startsWith("/api/assistente/anexos")) return "assistente.anexos";
  if (pathname.startsWith("/api/assistente")) return "assistente";
  if (pathname.startsWith("/api/pecas")) return "pecas";
  if (pathname.startsWith("/api/prev/parecer")) return "previdenciario.parecer";
  if (pathname.startsWith("/api/prev/cnis")) return "previdenciario.cnis";
  if (pathname.startsWith("/api/prev")) return "previdenciario";
  if (pathname.startsWith("/api/trab/parecer")) return "trabalhista.parecer";
  if (pathname.startsWith("/api/trab")) return "trabalhista";
  if (pathname.startsWith("/api/ia/revisor")) return "revisor";
  return null;
}

export function limparLista(ids: unknown[]): string[] {
  return [...new Set(ids.filter((x): x is string => typeof x === "string" && IDS_VALIDOS.has(x)))];
}
