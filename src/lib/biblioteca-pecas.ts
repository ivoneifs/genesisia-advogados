// Biblioteca das peças mais usadas no dia a dia da advocacia, por área.
// Cada peça orienta a IA (fundamento legal + tipo de estrutura); a minuta é
// gerada em /api/pecas/gerar com os fatos informados e os dados do cadastro.

export type TipoPeca =
  | "inicial"
  | "defesa"
  | "recurso"
  | "requerimento"
  | "contrato"
  | "extrajudicial";

export type PecaBiblioteca = {
  id: string;
  nome: string;
  area: string;
  tipo: TipoPeca;
  base: string; // fundamento legal de referência
};

export const AREAS = [
  "Cível",
  "Família e Sucessões",
  "Consumidor",
  "Contratos e Extrajudicial",
  "Trabalhista",
  "Previdenciário",
  "Criminal",
  "Tributário",
  "Administrativo e Constitucional",
] as const;

type Item = [id: string, nome: string, tipo: TipoPeca, base: string];

const POR_AREA: Record<(typeof AREAS)[number], Item[]> = {
  "Cível": [
    ["civ-inicial-comum", "Petição inicial — procedimento comum", "inicial", "CPC, arts. 319 e 320"],
    ["civ-cobranca", "Ação de cobrança", "inicial", "CC, arts. 389 e 395; CPC, art. 319"],
    ["civ-monitoria", "Ação monitória", "inicial", "CPC, arts. 700 a 702"],
    ["civ-execucao-titulo", "Execução de título extrajudicial", "inicial", "CPC, arts. 783, 784 e 824"],
    ["civ-cumprimento", "Cumprimento de sentença", "requerimento", "CPC, arts. 523 e seguintes"],
    ["civ-impugnacao-cumprimento", "Impugnação ao cumprimento de sentença", "defesa", "CPC, art. 525"],
    ["civ-embargos-execucao", "Embargos à execução", "defesa", "CPC, arts. 914 a 917"],
    ["civ-indenizacao", "Ação de indenização por danos morais e materiais", "inicial", "CF, art. 5º, V e X; CC, arts. 186 e 927"],
    ["civ-obrigacao-fazer", "Ação de obrigação de fazer com tutela de urgência", "inicial", "CPC, arts. 300, 497 e 536"],
    ["civ-tutela-antecedente", "Tutela antecipada requerida em caráter antecedente", "inicial", "CPC, art. 303"],
    ["civ-contestacao", "Contestação", "defesa", "CPC, arts. 335 a 342"],
    ["civ-reconvencao", "Contestação com reconvenção", "defesa", "CPC, art. 343"],
    ["civ-replica", "Réplica (impugnação à contestação)", "requerimento", "CPC, arts. 350 e 351"],
    ["civ-embargos-declaracao", "Embargos de declaração", "recurso", "CPC, arts. 1.022 a 1.026"],
    ["civ-apelacao", "Apelação", "recurso", "CPC, arts. 1.009 a 1.014"],
    ["civ-contrarrazoes-apelacao", "Contrarrazões de apelação", "recurso", "CPC, art. 1.010, § 1º"],
    ["civ-agravo-instrumento", "Agravo de instrumento", "recurso", "CPC, arts. 1.015 a 1.020"],
    ["civ-resp", "Recurso especial", "recurso", "CF, art. 105, III; CPC, art. 1.029"],
    ["civ-re", "Recurso extraordinário", "recurso", "CF, art. 102, III; CPC, arts. 1.029 e 1.035"],
    ["civ-despejo", "Ação de despejo por falta de pagamento c/c cobrança", "inicial", "Lei 8.245/91, arts. 9º, 59 e 62"],
    ["civ-usucapiao", "Ação de usucapião", "inicial", "CC, arts. 1.238 a 1.242; CPC, art. 246, § 3º"],
    ["civ-reintegracao-posse", "Ação de reintegração de posse com pedido liminar", "inicial", "CC, art. 1.210; CPC, arts. 554 a 566"],
    ["civ-inexistencia-debito", "Ação declaratória de inexistência de débito c/c danos morais", "inicial", "CPC, arts. 19 e 20; CC, art. 927"],
    ["civ-pre-executividade", "Exceção de pré-executividade", "defesa", "Súmula 393 do STJ; CPC, art. 803"],
    ["civ-embargos-terceiro", "Embargos de terceiro", "inicial", "CPC, arts. 674 a 681"],
  ],
  "Família e Sucessões": [
    ["fam-divorcio-consensual", "Divórcio consensual", "inicial", "CF, art. 226, § 6º; CPC, arts. 731 a 733"],
    ["fam-divorcio-litigioso", "Divórcio litigioso c/c partilha", "inicial", "CF, art. 226, § 6º; CPC, arts. 693 a 699"],
    ["fam-alimentos", "Ação de alimentos com pedido de alimentos provisórios", "inicial", "Lei 5.478/68; CC, art. 1.694"],
    ["fam-revisional-alimentos", "Ação revisional de alimentos", "inicial", "CC, art. 1.699; Lei 5.478/68, art. 13"],
    ["fam-exoneracao-alimentos", "Ação de exoneração de alimentos", "inicial", "CC, art. 1.699; Súmula 358 do STJ"],
    ["fam-execucao-alimentos", "Execução de alimentos (rito da prisão)", "inicial", "CPC, arts. 528 e 911"],
    ["fam-guarda-visitas", "Ação de guarda e regulamentação de visitas", "inicial", "CC, arts. 1.583 a 1.589; ECA"],
    ["fam-paternidade", "Investigação de paternidade c/c alimentos", "inicial", "Lei 8.560/92; CC, art. 1.694"],
    ["fam-uniao-estavel", "Reconhecimento e dissolução de união estável c/c partilha", "inicial", "CC, arts. 1.723 a 1.727"],
    ["fam-inventario", "Abertura de inventário judicial", "inicial", "CPC, arts. 610 a 616"],
    ["fam-alvara", "Pedido de alvará judicial", "requerimento", "Lei 6.858/80; CPC, art. 725, VII"],
    ["fam-curatela", "Ação de curatela (interdição)", "inicial", "CPC, arts. 747 a 758; Lei 13.146/15"],
  ],
  "Consumidor": [
    ["con-negativacao", "Ação por negativação indevida c/c danos morais", "inicial", "CDC, arts. 6º, 14 e 43; Súmula 385 do STJ"],
    ["con-repeticao-indebito", "Ação de repetição de indébito (devolução em dobro)", "inicial", "CDC, art. 42, parágrafo único"],
    ["con-vicio-produto", "Ação por vício do produto", "inicial", "CDC, art. 18"],
    ["con-voo", "Ação por cancelamento ou atraso de voo", "inicial", "CDC, art. 14; Resolução ANAC 400/2016"],
    ["con-revisional-bancario", "Ação revisional de contrato bancário", "inicial", "CDC, arts. 6º, V, e 51; CPC, art. 330, § 2º"],
    ["con-plano-saude", "Ação contra plano de saúde (negativa de cobertura) com tutela de urgência", "inicial", "Lei 9.656/98; Súmula 608 do STJ; CPC, art. 300"],
    ["con-juizado", "Reclamação no Juizado Especial Cível", "inicial", "Lei 9.099/95, art. 14"],
  ],
  "Contratos e Extrajudicial": [
    ["ext-notificacao", "Notificação extrajudicial", "extrajudicial", "CC, art. 397, parágrafo único"],
    ["ext-honorarios", "Contrato de honorários advocatícios", "contrato", "Lei 8.906/94, art. 22; Código de Ética da OAB"],
    ["ext-procuracao", "Procuração ad judicia et extra", "extrajudicial", "CPC, art. 105; CC, art. 653"],
    ["ext-substabelecimento", "Substabelecimento", "extrajudicial", "CC, art. 667; CPC, art. 105"],
    ["ext-prestacao-servicos", "Contrato de prestação de serviços", "contrato", "CC, arts. 593 a 609"],
    ["ext-locacao", "Contrato de locação residencial", "contrato", "Lei 8.245/91"],
    ["ext-compra-venda-imovel", "Contrato de compra e venda de imóvel", "contrato", "CC, arts. 481 a 504"],
    ["ext-confissao-divida", "Termo de acordo e confissão de dívida", "contrato", "CC, art. 840; CPC, art. 784, III"],
  ],
  "Trabalhista": [
    ["trab-reclamacao", "Reclamação trabalhista", "inicial", "CLT, art. 840, § 1º"],
    ["trab-contestacao", "Contestação trabalhista", "defesa", "CLT, art. 847"],
    ["trab-recurso-ordinario", "Recurso ordinário", "recurso", "CLT, art. 895"],
    ["trab-contrarrazoes-ro", "Contrarrazões ao recurso ordinário", "recurso", "CLT, art. 900"],
    ["trab-recurso-revista", "Recurso de revista", "recurso", "CLT, art. 896"],
    ["trab-embargos-declaracao", "Embargos de declaração trabalhistas", "recurso", "CLT, art. 897-A"],
    ["trab-agravo-peticao", "Agravo de petição", "recurso", "CLT, art. 897, a"],
    ["trab-embargos-execucao", "Embargos à execução trabalhista", "defesa", "CLT, art. 884"],
    ["trab-acordo-extrajudicial", "Homologação de acordo extrajudicial", "requerimento", "CLT, arts. 855-B a 855-E"],
    ["trab-consignacao", "Ação de consignação em pagamento (verbas rescisórias)", "inicial", "CPC, arts. 539 e seguintes; CLT, art. 769"],
    ["trab-rescisao-indireta", "Reclamação com pedido de rescisão indireta", "inicial", "CLT, art. 483"],
    ["trab-vinculo", "Reclamação com reconhecimento de vínculo empregatício", "inicial", "CLT, arts. 2º e 3º"],
  ],
  "Previdenciário": [
    ["prev-requerimento", "Requerimento administrativo de aposentadoria ao INSS", "requerimento", "Lei 8.213/91; EC 103/2019"],
    ["prev-recurso-crps", "Recurso administrativo ao CRPS", "recurso", "Decreto 3.048/99, art. 305"],
    ["prev-aposentadoria-idade", "Ação de concessão de aposentadoria por idade", "inicial", "Lei 8.213/91, art. 48; EC 103/2019, art. 18"],
    ["prev-aposentadoria-especial", "Ação de aposentadoria especial", "inicial", "Lei 8.213/91, arts. 57 e 58"],
    ["prev-auxilio-incapacidade", "Ação de restabelecimento de auxílio por incapacidade temporária", "inicial", "Lei 8.213/91, arts. 59 a 63"],
    ["prev-incapacidade-permanente", "Ação de aposentadoria por incapacidade permanente", "inicial", "Lei 8.213/91, art. 42"],
    ["prev-bpc-loas", "Ação de benefício assistencial (BPC/LOAS)", "inicial", "CF, art. 203, V; Lei 8.742/93, art. 20"],
    ["prev-pensao-morte", "Ação de concessão de pensão por morte", "inicial", "Lei 8.213/91, arts. 74 a 79"],
    ["prev-salario-maternidade", "Ação de salário-maternidade", "inicial", "Lei 8.213/91, arts. 71 a 73"],
    ["prev-revisao", "Ação de revisão de benefício previdenciário", "inicial", "Lei 8.213/91, art. 103"],
  ],
  "Criminal": [
    ["crim-resposta-acusacao", "Resposta à acusação", "defesa", "CPP, arts. 396 e 396-A"],
    ["crim-liberdade-provisoria", "Pedido de liberdade provisória", "requerimento", "CF, art. 5º, LXVI; CPP, arts. 310 e 321"],
    ["crim-revogacao-preventiva", "Pedido de revogação de prisão preventiva", "requerimento", "CPP, arts. 312 e 316"],
    ["crim-habeas-corpus", "Habeas corpus", "inicial", "CF, art. 5º, LXVIII; CPP, arts. 647 a 667"],
    ["crim-relaxamento", "Pedido de relaxamento de prisão em flagrante", "requerimento", "CF, art. 5º, LXV; CPP, art. 310, I"],
    ["crim-memoriais", "Alegações finais por memoriais", "defesa", "CPP, art. 403, § 3º"],
    ["crim-apelacao", "Apelação criminal (interposição e razões)", "recurso", "CPP, arts. 593 e 600"],
    ["crim-rese", "Recurso em sentido estrito", "recurso", "CPP, arts. 581 a 592"],
    ["crim-queixa-crime", "Queixa-crime", "inicial", "CPP, arts. 41 e 44"],
    ["crim-restituicao", "Pedido de restituição de coisa apreendida", "requerimento", "CPP, arts. 118 a 120"],
    ["crim-revisao-criminal", "Revisão criminal", "inicial", "CPP, arts. 621 a 631"],
    ["crim-progressao", "Pedido de progressão de regime", "requerimento", "LEP (Lei 7.210/84), art. 112"],
    ["crim-livramento", "Pedido de livramento condicional", "requerimento", "CP, art. 83; LEP, art. 131"],
    ["crim-defesa-drogas", "Defesa prévia — Lei de Drogas", "defesa", "Lei 11.343/06, art. 55"],
    ["crim-noticia-crime", "Notícia-crime / requerimento de instauração de inquérito", "requerimento", "CPP, art. 5º, II e § 3º"],
  ],
  "Tributário": [
    ["trib-anulatoria", "Ação anulatória de débito fiscal", "inicial", "CTN, arts. 151 e 156; Lei 6.830/80, art. 38"],
    ["trib-embargos-execucao-fiscal", "Embargos à execução fiscal", "defesa", "Lei 6.830/80, art. 16"],
    ["trib-pre-executividade", "Exceção de pré-executividade em execução fiscal", "defesa", "Súmula 393 do STJ"],
    ["trib-repeticao", "Ação de repetição de indébito tributário", "inicial", "CTN, arts. 165 a 168"],
    ["trib-ms", "Mandado de segurança em matéria tributária", "inicial", "Lei 12.016/09; CTN, art. 151, IV"],
  ],
  "Administrativo e Constitucional": [
    ["adm-ms", "Mandado de segurança com pedido liminar", "inicial", "CF, art. 5º, LXIX; Lei 12.016/09"],
    ["adm-habeas-data", "Habeas data", "inicial", "CF, art. 5º, LXXII; Lei 9.507/97"],
    ["adm-acao-popular", "Ação popular", "inicial", "CF, art. 5º, LXXIII; Lei 4.717/65"],
    ["adm-medicamentos", "Ação de fornecimento de medicamento contra o Poder Público", "inicial", "CF, art. 196; Tema 106 do STJ"],
    ["adm-recurso", "Recurso administrativo", "recurso", "Lei 9.784/99, arts. 56 a 65"],
    ["adm-defesa-pad", "Defesa escrita em processo administrativo disciplinar", "defesa", "Lei 8.112/90, art. 161, § 1º; CF, art. 5º, LV"],
  ],
};

export const BIBLIOTECA: PecaBiblioteca[] = AREAS.flatMap((area) =>
  POR_AREA[area].map(([id, nome, tipo, base]) => ({ id, nome, area, tipo, base }))
);

export function pecaPorId(id: string): PecaBiblioteca | undefined {
  return BIBLIOTECA.find((p) => p.id === id);
}

/** Roteiro de estrutura por tipo de peça, usado no prompt da IA. */
export const ESTRUTURA: Record<TipoPeca, string> = {
  inicial:
    "endereçamento ao juízo competente; qualificação completa das partes; dos fatos; do direito (com o fundamento legal e jurisprudência pertinente); da tutela de urgência, se cabível; dos pedidos, numerados; das provas; do valor da causa; fecho com local, data e assinatura do advogado (nome e OAB).",
  defesa:
    "endereçamento; referência ao processo e às partes; síntese da acusação ou da inicial; preliminares cabíveis; mérito, rebatendo ponto a ponto; provas; pedidos, numerados; fecho com local, data e assinatura (nome e OAB).",
  recurso:
    "petição de interposição dirigida ao juízo de origem (quando couber), com tempestividade e preparo; razões ao tribunal: síntese do processo, cabimento e pressupostos de admissibilidade, razões para reforma ou anulação, prequestionamento quando cabível; pedido final; fecho com local, data e assinatura (nome e OAB).",
  requerimento:
    "endereçamento; referência ao processo ou procedimento e às partes; exposição objetiva dos fatos; fundamento legal; pedido claro e específico; documentos anexos; fecho com local, data e assinatura (nome e OAB).",
  contrato:
    "título; qualificação completa das partes; cláusulas numeradas (objeto, obrigações, preço e pagamento, prazo, rescisão, multa, foro); local e data; assinaturas das partes e de duas testemunhas.",
  extrajudicial:
    "título; qualificação de quem emite e do destinatário; texto objetivo com o fundamento legal; prazo e consequências, quando houver; local, data e assinatura.",
};
