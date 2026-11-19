// Catálogo trabalhista — seções 8 a 13.

import { competencia, diaN, fmtComp, idadeEm, somaComp } from "../../prev/datas";
import { taxa } from "../../prev/indices";
import { arred, teto } from "../../prev/tabelas";
import { expectativaSobrevida } from "../../prev/tabelas";
import { brl, bool, dec, lerSalarios, num, pct, txt, type Calculadora, type Campo, type Saida, type Valores } from "../../prev/calc/tipos";
import { irMensal } from "../../prev/calc/secao8a11";
import { liquidar, type CriterioAtualizacao } from "../motor";
import { inssEmpregado } from "../tabelas";
import { comReflexos } from "./secoes1a7";

type Ctx = { indices: import("../../prev/indices").Indices; hoje: string };
function form(id: string, secao: number, nome: string, fundamento: string, campos: Campo[], calcular: (v: Valores, c: Ctx) => Saida): Calculadora {
  return { id, secao, nome, fundamento, modo: "form", campos, calcular };
}
const valor = (rotulo: string, v: number, memoria: string[]): Saida => ({ linhas: [{ rotulo, valor: brl(v), destaque: true }], memoria });

// ---------------------------------------------------------------------------
// Seção 8 — FGTS
// ---------------------------------------------------------------------------

const REMUN: Campo = { id: "remuneracoes", rotulo: "Remunerações (MM/AAAA valor)", tipo: "salarios", largura: "inteira" };

function depositos(id: string, nome: string, fundamento: string, aliquota: number, nota: string): Calculadora {
  return form(id, 8, nome, fundamento, [REMUN, { id: "aliquota", rotulo: "Alíquota (%)", tipo: "percentual", padrao: aliquota * 100 }, { id: "depositado", rotulo: "Total já depositado (extrato)", tipo: "moeda" }, { id: "jam", rotulo: "Atualizar pelos JAM (TR + 3% a.a.)", tipo: "checkbox", padrao: true }], (v, c) => {
    const lista = lerSalarios(txt(v, "remuneracoes"));
    const al = num(v, "aliquota", aliquota * 100) / 100;
    const hoje = competencia(c.hoje);
    let total = 0, atualizado = 0;
    const linhas = lista.map((s) => {
      const dep = s.valor * al;
      let f = 1;
      if (bool(v, "jam")) for (let m = somaComp(s.comp, 1); m < hoje; m = somaComp(m, 1)) f *= (1 + taxa(c.indices, "TR", m) / 100) * 1.0024663;
      total += dep;
      atualizado += dep * f;
      return [fmtComp(s.comp), brl(s.valor), brl(dep), dec(f, 6), brl(dep * f)];
    });
    const diferenca = atualizado - num(v, "depositado");
    return {
      linhas: [{ rotulo: "Depósitos devidos (nominal)", valor: brl(total) }, { rotulo: "Devidos atualizados", valor: brl(atualizado) }, { rotulo: "Já depositado", valor: brl(num(v, "depositado")) }, { rotulo: "Diferença a depositar", valor: brl(Math.max(0, diferenca)), destaque: true }, { rotulo: "Multa de 40% sobre a diferença", valor: brl(Math.max(0, diferenca) * 0.4) }],
      memoria: [nota, "JAM: TR mensal + juros de 3% ao ano capitalizados mensalmente (0,2466% a.m.) — Lei 8.036/90, art. 13. Em juízo, a JT aplica os índices trabalhistas (OJ 302/SDI-1)."],
      tabela: { colunas: ["Mês", "Remuneração", "Depósito", "Fator JAM", "Atualizado"], linhas },
    };
  });
}

export const TRAB_SECAO_8: Calculadora[] = [
  depositos("fgts-mensal", "Depósitos mensais de FGTS (8%)", "Lei 8.036/90, art. 15", 0.08, "8% sobre a remuneração do mês, inclusive 13º."),
  depositos("fgts-aprendiz", "Depósitos de FGTS do aprendiz (2%)", "Lei 8.036/90, art. 15, §7º", 0.02, "Contrato de aprendizagem: 2%."),
  depositos("fgts-afastamento", "FGTS durante afastamento acidentário (B91) ou serviço militar", "Lei 8.036/90, art. 15, §5º", 0.08, "Devido no afastamento por acidente de trabalho e no serviço militar obrigatório."),
  depositos("fgts-diferencas", "Diferenças de FGTS não depositado (extrato analítico)", "Lei 8.036/90; Súmula 461/TST", 0.08, "Ônus da prova da regularidade dos depósitos é do empregador (Súmula 461)."),
  form("fgts-rescisorias", 8, "FGTS sobre verbas rescisórias (saldo, 13º e aviso)", "Lei 8.036/90, art. 15; Súmula 305/TST", [{ id: "saldo", rotulo: "Saldo de salário", tipo: "moeda" }, { id: "decimo", rotulo: "13º proporcional/indenizado", tipo: "moeda" }, { id: "aviso", rotulo: "Aviso prévio indenizado", tipo: "moeda" }], (v) => {
    const b = num(v, "saldo") + num(v, "decimo") + num(v, "aviso");
    return { linhas: [{ rotulo: "Base", valor: brl(b) }, { rotulo: "FGTS (8%)", valor: brl(b * 0.08), destaque: true }], memoria: ["Incide sobre o aviso prévio indenizado (Súmula 305); não incide sobre férias indenizadas (OJ 195)."] };
  }),
  form("fgts-reflexos", 8, "FGTS sobre reflexos de verbas deferidas em juízo", "Súmula 63/TST", [{ id: "verbas", rotulo: "Total das verbas salariais deferidas (com reflexos salariais)", tipo: "moeda" }, { id: "multa", rotulo: "Com multa de 40%", tipo: "checkbox", padrao: true }], (v) => {
    const f = num(v, "verbas") * 0.08;
    return { linhas: [{ rotulo: "FGTS", valor: brl(f) }, { rotulo: "Multa de 40%", valor: brl(bool(v, "multa") ? f * 0.4 : 0) }, { rotulo: "Total", valor: brl(f * (bool(v, "multa") ? 1.4 : 1)), destaque: true }], memoria: ["Incide sobre parcelas salariais (Súmula 63)."] };
  }),
  form("multa-40", 8, "Multa de 40% sobre o FGTS (sem justa causa / rescisão indireta)", "Lei 8.036/90, art. 18, §1º; OJ 42/SDI-1", [{ id: "saldo", rotulo: "Saldo para fins rescisórios (depósitos + JAM, inclusive sacados)", tipo: "moeda" }], (v) => valor("Multa de 40%", num(v, "saldo") * 0.4, ["Calculada sobre todos os depósitos do contrato atualizados, inclusive saques (OJ 42)."])),
  form("multa-20", 8, "Multa de 20% (acordo mútuo / culpa recíproca)", "CLT, art. 484-A, I, b; Lei 8.036/90, art. 18, §2º", [{ id: "saldo", rotulo: "Saldo para fins rescisórios", tipo: "moeda" }], (v) => valor("Multa de 20%", num(v, "saldo") * 0.2, ["Acordo: 20% e saque de 80% do saldo; culpa recíproca: 20% (Súmula 14/TST)."])),
  depositos("fgts-jam", "Atualização monetária e JAM do FGTS", "Lei 8.036/90, art. 13", 0.08, "Atualização dos depósitos pela TR + 3% a.a. (ADI 5.090: a remuneração não pode ser inferior ao IPCA a partir de 2025)."),
  form("fgts-domestico", 8, "Indenização compensatória do FGTS do doméstico (3,2%)", "LC 150/2015, art. 22", [REMUN], (v) => {
    const total = lerSalarios(txt(v, "remuneracoes")).reduce((s, x) => s + x.valor, 0) * 0.032;
    return valor("Fundo de 3,2% (substitui a multa de 40%)", total, ["Depositado mensalmente; liberado ao empregado na dispensa sem justa causa e devolvido ao empregador na justa causa ou pedido de demissão."]);
  }),
];

// ---------------------------------------------------------------------------
// Seção 9 — estabilidades
// ---------------------------------------------------------------------------

function estabilidade(id: string, nome: string, fundamento: string, nota: string, mesesPadrao = 12): Calculadora {
  return form(id, 9, nome, fundamento, [{ id: "remuneracao", rotulo: "Remuneração mensal", tipo: "moeda" }, { id: "inicio", rotulo: "Início da indenização (dispensa)", tipo: "data" }, { id: "fim", rotulo: "Fim da estabilidade", tipo: "data" }, { id: "meses", rotulo: "Ou meses de estabilidade", tipo: "numero", padrao: mesesPadrao }], (v) => {
    const meses = txt(v, "inicio") && txt(v, "fim") ? Math.max(0, (diaN(txt(v, "fim")) - diaN(txt(v, "inicio")) + 1) / 30.4375) : num(v, "meses", mesesPadrao);
    const r = comReflexos(num(v, "remuneracao"), arred(meses), true, [`Período estabilitário: ${dec(meses, 2)} meses.`, nota], true);
    return r;
  });
}

export const TRAB_SECAO_9: Calculadora[] = [
  estabilidade("estab-gestante", "Estabilidade da gestante (até 5 meses após o parto)", "ADCT, art. 10, II, b; Súmula 244/TST; Tema 497/STF", "Basta a gravidez anterior à dispensa (Tema 497/STF), inclusive em contrato de experiência/aviso.", 14),
  estabilidade("estab-acidentaria", "Estabilidade acidentária (12 meses após o B91)", "Lei 8.213/91, art. 118; Súmula 378/TST", "12 meses após a cessação do auxílio-doença acidentário."),
  estabilidade("estab-cipa", "Estabilidade de cipeiro", "ADCT, art. 10, II, a; Súmula 339/TST", "Do registro da candidatura até 1 ano após o mandato.", 24),
  estabilidade("estab-sindical", "Estabilidade de dirigente sindical", "CF, art. 8º, VIII; CLT, art. 543, §3º; Súmula 369/TST", "Do registro da candidatura até 1 ano após o mandato.", 48),
  estabilidade("estab-pre-aposentadoria", "Estabilidade pré-aposentadoria (CCT/ACT)", "Norma coletiva", "Conforme a cláusula da norma coletiva."),
  estabilidade("estab-ccp", "Estabilidade de membro da Comissão de Conciliação Prévia", "CLT, art. 625-B, §1º", "Até 1 ano após o mandato.", 24),
  form("reintegracao", 9, "Salários vencidos e vincendos na reintegração", "CLT, art. 495; Súmula 396/TST", [{ id: "remuneracao", rotulo: "Remuneração", tipo: "moeda" }, { id: "dispensa", rotulo: "Dispensa", tipo: "data" }, { id: "reintegracao", rotulo: "Reintegração (ou hoje)", tipo: "data" }], (v, c) => {
    const meses = Math.max(0, (diaN(txt(v, "reintegracao") || c.hoje) - diaN(txt(v, "dispensa") || c.hoje)) / 30.4375);
    return comReflexos(num(v, "remuneracao"), arred(meses), true, [`${dec(meses, 2)} meses entre a dispensa e a reintegração, com 13º, férias + 1/3 e FGTS.`]);
  }),
  form("art496", 9, "Conversão da reintegração em indenização dobrada (art. 496)", "CLT, arts. 496 e 497", [{ id: "remuneracao", rotulo: "Remuneração", tipo: "moeda" }, { id: "anos", rotulo: "Anos de serviço (estável decenal)", tipo: "inteiro" }], (v) => valor("Indenização em dobro", num(v, "remuneracao") * num(v, "anos") * 2, ["Estabilidade decenal (pré-1988): indenização de 1 remuneração por ano, em dobro, quando a reintegração é desaconselhável (arts. 478 e 496)."])),
];

// ---------------------------------------------------------------------------
// Seção 10 — multas
// ---------------------------------------------------------------------------

export const TRAB_SECAO_10: Calculadora[] = [
  form("multa-477", 10, "Multa do art. 477, §8º (atraso na rescisão — 1 salário)", "CLT, art. 477, §§6º e 8º", [{ id: "salario", rotulo: "Salário", tipo: "moeda" }], (v) => valor("Multa", num(v, "salario"), ["Devida quando a rescisão não é paga em 10 dias do término; não se aplica na rescisão por justa causa reconhecida, mas é devida mesmo com reconhecimento judicial do vínculo (Súmula 462/TST)."])),
  form("multa-467", 10, "Multa do art. 467 (50% sobre verbas incontroversas)", "CLT, art. 467", [{ id: "verbas", rotulo: "Verbas rescisórias incontroversas não pagas na 1ª audiência", tipo: "moeda" }], (v) => valor("Multa de 50%", num(v, "verbas") * 0.5, ["Inclui a multa de 40% do FGTS quando incontroversa."])),
  form("multa-convencional", 10, "Multa convencional / normativa", "CLT, art. 613, VIII; Súmula 384/TST", [{ id: "valor", rotulo: "Valor da multa por infração", tipo: "moeda" }, { id: "infracoes", rotulo: "Número de infrações / instrumentos", tipo: "inteiro", padrao: 1 }, { id: "limite", rotulo: "Limite (obrigação principal)", tipo: "moeda" }], (v) => {
    const bruto = num(v, "valor") * num(v, "infracoes", 1);
    const lim = num(v, "limite");
    return valor("Multa convencional", lim ? Math.min(lim, bruto) : bruto, ["Uma multa por instrumento normativo descumprido (Súmula 384, I); limitada ao valor da obrigação principal (art. 412 CC; OJ 54)."]);
  }),
  form("ma-fe", 10, "Litigância de má-fé (1% a 10% — art. 793-C)", "CLT, art. 793-C", [{ id: "causa", rotulo: "Valor corrigido da causa", tipo: "moeda" }, { id: "pct", rotulo: "Percentual (1 a 10)", tipo: "percentual", padrao: 5 }], (v) => valor("Multa", (num(v, "causa") * Math.min(10, Math.max(1, num(v, "pct", 5)))) / 100, ["Mais indenização dos prejuízos e honorários; se o valor da causa for irrisório, até 2 tetos do RGPS (§2º)."])),
  form("ed-protelatorios", 10, "Embargos de declaração protelatórios (art. 1.026, §2º)", "CPC, art. 1.026, §§2º e 3º", [{ id: "causa", rotulo: "Valor atualizado da causa", tipo: "moeda" }, { id: "reiteracao", rotulo: "Reiteração", tipo: "checkbox" }], (v) => valor("Multa", num(v, "causa") * (bool(v, "reiteracao") ? 0.1 : 0.02), ["Até 2% do valor atualizado da causa; na reiteração, até 10%."])),
  form("ato-atentatorio", 10, "Ato atentatório à dignidade da justiça (art. 774)", "CPC, art. 774, parágrafo único", [{ id: "debito", rotulo: "Valor atualizado do débito", tipo: "moeda" }, { id: "pct", rotulo: "Percentual (até 20)", tipo: "percentual", padrao: 20 }], (v) => valor("Multa", (num(v, "debito") * Math.min(20, num(v, "pct", 20))) / 100, ["Até 20% do débito em execução, revertida ao exequente."])),
  form("art523", 10, "Multa de 10% do art. 523, §1º (discussão na JT)", "CPC, art. 523, §1º; Tema 4 IRR/TST", [{ id: "debito", rotulo: "Valor da condenação", tipo: "moeda" }], (v) => ({ linhas: [{ rotulo: "Multa de 10%", valor: brl(num(v, "debito") * 0.1), destaque: true }, { rotulo: "Honorários de 10% (CPC)", valor: brl(num(v, "debito") * 0.1) }], memoria: ["O TST (Tema 4 IRR) decidiu que a multa do art. 523 é inaplicável ao processo do trabalho — use apenas como tese/argumentação."] })),
  form("astreintes-trab", 10, "Astreintes por obrigação de fazer (CTPS, PPP, guias)", "CPC, arts. 536 e 537; CLT, art. 769", [{ id: "multa", rotulo: "Multa diária", tipo: "moeda" }, { id: "inicio", rotulo: "Início do descumprimento", tipo: "data" }, { id: "fim", rotulo: "Cumprimento (ou hoje)", tipo: "data" }, { id: "limite", rotulo: "Limite", tipo: "moeda" }], (v, c) => {
    const dias = Math.max(0, diaN(txt(v, "fim") || c.hoje) - diaN(txt(v, "inicio") || c.hoje) + 1);
    const b = dias * num(v, "multa");
    return valor(`Multa (${dias} dias)`, num(v, "limite") ? Math.min(b, num(v, "limite")) : b, ["O juízo pode reduzir a multa vincenda excessiva (art. 537, §1º)."]);
  }),
  form("multa-ctps", 10, "Multa por falta de registro em CTPS (art. 47 — administrativa)", "CLT, art. 47 (Lei 13.467/2017)", [{ id: "empregados", rotulo: "Empregados sem registro", tipo: "inteiro", padrao: 1 }, { id: "porte", rotulo: "Porte", tipo: "select", opcoes: [{ valor: "geral", rotulo: "Demais empresas (R$ 3.000)" }, { valor: "me", rotulo: "ME/EPP (R$ 800)" }], padrao: "geral" }, { id: "reincidente", rotulo: "Reincidente (em dobro)", tipo: "checkbox" }], (v) => valor("Multa administrativa", num(v, "empregados", 1) * (txt(v, "porte") === "me" ? 800 : 3000) * (bool(v, "reincidente") ? 2 : 1), ["Aplicada pela fiscalização do trabalho, não na reclamação."])),
];

// ---------------------------------------------------------------------------
// Seção 11 — danos
// ---------------------------------------------------------------------------

const GRAUS: Record<string, [number, string]> = { leve: [3, "leve (até 3×)"], media: [5, "média (até 5×)"], grave: [20, "grave (até 20×)"], gravissima: [50, "gravíssima (até 50×)"] };

function pensaoMensal(v: Valores, parcelaUnica: boolean, c: Ctx): Saida {
  const rem = num(v, "remuneracao");
  const perda = num(v, "perda", 100) / 100;
  const nasc = txt(v, "nascimento");
  const inicio = txt(v, "inicio") || c.hoje;
  const idade = nasc ? idadeEm(nasc, inicio) : 40;
  const limiteIdade = num(v, "ateIdade") || idade + (expectativaSobrevida(inicio, idade).valor ?? 30);
  const meses = Math.max(0, Math.round((limiteIdade - idade) * 12));
  const mensal = rem * perda * (13 / 12) * (txt(v, "tipo") === "morte" ? 2 / 3 : 1);
  const total = mensal * meses;
  const i = Math.pow(1 + num(v, "taxa", 6) / 100, 1 / 12) - 1;
  const vp = i ? mensal * ((1 - Math.pow(1 + i, -meses)) / i) : total;
  return {
    linhas: [
      { rotulo: "Pensão mensal (com 13º diluído)", valor: brl(mensal), destaque: !parcelaUnica },
      { rotulo: "Duração", valor: `${meses} meses (até ${dec(limiteIdade, 1)} anos)` },
      { rotulo: "Soma nominal", valor: brl(total) },
      { rotulo: `Valor presente (deságio de ${num(v, "taxa", 6)}% a.a.)`, valor: brl(vp), destaque: parcelaUnica },
    ],
    memoria: [
      `Remuneração ${brl(rem)} × perda de ${pct(perda, 0)}${txt(v, "tipo") === "morte" ? " × 2/3 (dedução das despesas pessoais da vítima)" : ""} × 13/12.`,
      "Termo final: expectativa de vida pela tábua do IBGE (ou idade informada).",
      parcelaUnica ? "Parcela única com redutor (art. 950, parágrafo único, CC): a jurisprudência do TST aplica deságio entre 20% e 30% ou desconto financeiro — ajuste a taxa." : "Pensão mensal: exige constituição de capital ou inclusão em folha (art. 533 CPC).",
    ],
  };
}

const CAMPOS_PENSAO: Campo[] = [
  { id: "remuneracao", rotulo: "Remuneração mensal da vítima", tipo: "moeda" },
  { id: "perda", rotulo: "Perda da capacidade (%) — tabela SUSEP/CIF", tipo: "percentual", padrao: 100 },
  { id: "nascimento", rotulo: "Nascimento da vítima", tipo: "data" },
  { id: "inicio", rotulo: "Início da pensão", tipo: "data" },
  { id: "ateIdade", rotulo: "Até a idade (vazio = expectativa IBGE)", tipo: "numero" },
  { id: "taxa", rotulo: "Taxa de desconto anual (%)", tipo: "percentual", padrao: 6 },
];

export const TRAB_SECAO_11: Calculadora[] = [
  form("dano-moral", 11, "Danos morais (art. 223-G / ADI 6.050)", "CLT, art. 223-G, §1º; ADI 6.050/STF", [{ id: "salario", rotulo: "Último salário contratual", tipo: "moeda" }, { id: "grau", rotulo: "Natureza da ofensa", tipo: "select", opcoes: Object.entries(GRAUS).map(([valor, [, rotulo]]) => ({ valor, rotulo })), padrao: "media" }, { id: "reincidencia", rotulo: "Reincidência (dobro — §3º)", tipo: "checkbox" }], (v) => {
    const [mult] = GRAUS[txt(v, "grau", "media")];
    const teto = num(v, "salario") * mult * (bool(v, "reincidencia") ? 2 : 1);
    return { linhas: [{ rotulo: "Parâmetro orientativo", valor: `até ${brl(teto)}`, destaque: true }], memoria: ["O STF (ADI 6.050, 2023) considerou os limites do art. 223-G como critérios orientativos, admitindo valores superiores conforme o caso.", "Fixe considerando os incisos do art. 223-G (natureza do bem, intensidade, extensão, situação das partes)."] };
  }),
  form("dano-estetico", 11, "Danos estéticos", "Súmula 387/STJ; CC, art. 949", [{ id: "salario", rotulo: "Último salário", tipo: "moeda" }, { id: "grau", rotulo: "Gravidade", tipo: "select", opcoes: Object.entries(GRAUS).map(([valor, [, rotulo]]) => ({ valor, rotulo })), padrao: "grave" }], (v) => valor("Parâmetro orientativo", num(v, "salario") * GRAUS[txt(v, "grau", "grave")][0], ["Cumulável com dano moral (Súmula 387/STJ)."])),
  form("dano-existencial", 11, "Dano existencial (jornada exaustiva / supressão de lazer)", "CLT, art. 223-B; jurisprudência do TST", [{ id: "salario", rotulo: "Último salário", tipo: "moeda" }, { id: "grau", rotulo: "Gravidade", tipo: "select", opcoes: Object.entries(GRAUS).map(([valor, [, rotulo]]) => ({ valor, rotulo })), padrao: "media" }], (v) => valor("Parâmetro orientativo", num(v, "salario") * GRAUS[txt(v, "grau", "media")][0], ["O TST exige prova do prejuízo ao projeto de vida ou ao convívio social, não bastando a jornada excessiva."])),
  form("perda-chance", 11, "Perda de uma chance", "CC, arts. 186 e 927", [{ id: "beneficio", rotulo: "Vantagem esperada", tipo: "moeda" }, { id: "probabilidade", rotulo: "Probabilidade séria e real (%)", tipo: "percentual", padrao: 50 }], (v) => valor("Indenização", (num(v, "beneficio") * num(v, "probabilidade", 50)) / 100, ["Indeniza-se a chance perdida (vantagem × probabilidade), não o resultado."])),
  form("danos-emergentes", 11, "Danos materiais emergentes (despesas médicas, próteses...)", "CC, arts. 402 e 949", [{ id: "despesas", rotulo: "Despesas (uma por linha: MM/AAAA valor)", tipo: "salarios", largura: "inteira" }], (v) => {
    const l = lerSalarios(txt(v, "despesas"));
    return { linhas: [{ rotulo: "Total de despesas", valor: brl(l.reduce((s, x) => s + x.valor, 0)), destaque: true }], memoria: ["Comprovadas por notas e recibos; correção desde cada desembolso (Súmula 43/STJ)."], tabela: { colunas: ["Mês", "Valor"], linhas: l.map((x) => [fmtComp(x.comp), brl(x.valor)]) } };
  }),
  form("lucros-cessantes", 11, "Lucros cessantes (diferença entre INSS e remuneração)", "CC, arts. 402 e 950", [{ id: "remuneracao", rotulo: "Remuneração", tipo: "moeda" }, { id: "beneficio", rotulo: "Benefício do INSS", tipo: "moeda" }, { id: "meses", rotulo: "Meses de afastamento", tipo: "inteiro" }], (v) => valor("Lucros cessantes", Math.max(0, num(v, "remuneracao") - num(v, "beneficio")) * num(v, "meses") * (13 / 12), ["Parte da jurisprudência não deduz o benefício previdenciário (naturezas distintas — art. 121 da Lei 8.213); ajuste conforme o entendimento adotado."])),
  form("pensao-vitalicia", 11, "Pensão mensal por incapacidade laborativa", "CC, art. 950", [...CAMPOS_PENSAO, { id: "tipo", rotulo: "Tipo", tipo: "select", opcoes: [{ valor: "incapacidade", rotulo: "Incapacidade" }], padrao: "incapacidade" }], (v, c) => pensaoMensal(v, false, c)),
  form("pensao-parcela-unica", 11, "Pensão em parcela única com deságio (art. 950, parágrafo único)", "CC, art. 950, parágrafo único; OJ 22 SDI-2", [...CAMPOS_PENSAO, { id: "tipo", rotulo: "Tipo", tipo: "select", opcoes: [{ valor: "incapacidade", rotulo: "Incapacidade" }], padrao: "incapacidade" }], (v, c) => pensaoMensal(v, true, c)),
  form("pensao-morte-acidente", 11, "Pensão por morte em acidente de trabalho (2/3 da remuneração)", "CC, art. 948, II", [...CAMPOS_PENSAO, { id: "tipo", rotulo: "Tipo", tipo: "select", opcoes: [{ valor: "morte", rotulo: "Morte" }], padrao: "morte" }], (v, c) => pensaoMensal(v, false, c)),
  form("capital-garantidor", 11, "Constituição de capital garantidor (art. 533 CPC)", "CPC, art. 533; Súmula 313/STJ", [{ id: "pensao", rotulo: "Pensão mensal", tipo: "moeda" }, { id: "rendimento", rotulo: "Rendimento real anual do capital (%)", tipo: "percentual", padrao: 6 }], (v) => {
    const i = Math.pow(1 + num(v, "rendimento", 6) / 100, 1 / 12) - 1;
    return valor("Capital necessário", i ? (num(v, "pensao") * (13 / 12)) / i : 0, ["Capital cuja renda assegure o pagamento da pensão (perpetuidade); pode ser substituído por inclusão em folha ou fiança bancária (§2º)."]);
  }),
];

// ---------------------------------------------------------------------------
// Seção 12 — descontos
// ---------------------------------------------------------------------------

function devolucao(id: string, nome: string, fundamento: string, nota: string, limitePct?: number): Calculadora {
  return form(id, 12, nome, fundamento, [{ id: "descontos", rotulo: "Descontos (MM/AAAA valor)", tipo: "salarios", largura: "inteira" }, ...(limitePct !== undefined ? [{ id: "salario", rotulo: "Salário-base", tipo: "moeda" as const }] : [])], (v) => {
    const l = lerSalarios(txt(v, "descontos"));
    const limite = limitePct !== undefined ? num(v, "salario") * limitePct : 0;
    const dev = l.reduce((s, x) => s + (limitePct !== undefined ? Math.max(0, x.valor - limite) : x.valor), 0);
    return { linhas: [{ rotulo: "Devolução", valor: brl(dev), destaque: true }], memoria: [nota], tabela: { colunas: ["Mês", "Descontado", "Devolver"], linhas: l.map((x) => [fmtComp(x.comp), brl(x.valor), brl(limitePct !== undefined ? Math.max(0, x.valor - limite) : x.valor)]) } };
  });
}

export const TRAB_SECAO_12: Calculadora[] = [
  devolucao("dev-assistencial", "Devolução de contribuição assistencial/confederativa sem autorização", "CLT, arts. 545, 578 e 611-B, XXVI; Tema 935/STF; PN 119/TST", "O STF (Tema 935, 2023) admite a contribuição assistencial a todos da categoria, assegurado o direito de oposição; sem oportunidade de oposição, a devolução é devida."),
  devolucao("dev-quebra-caixa", "Devolução de descontos por quebra de caixa / estoque sem dolo", "CLT, art. 462, §1º", "Desconto só é lícito com dolo ou com previsão contratual de culpa (art. 462, §1º)."),
  devolucao("dev-danos", "Devolução de descontos por danos sem previsão contratual", "CLT, art. 462, §1º", "Dano culposo só pode ser descontado com previsão contratual."),
  devolucao("dev-vt", "Devolução de vale-transporte acima de 6%", "Lei 7.418/85, art. 4º, parágrafo único", "A participação do empregado é limitada a 6% do salário-base.", 0.06),
  devolucao("dev-pat", "Devolução de desconto de alimentação (PAT) acima de 20%", "Decreto 10.854/2021, art. 171", "A participação do trabalhador no PAT é limitada a 20% do custo do benefício.", 0.2),
  form("limite-descontos-rescisao", 12, "Limite de descontos na rescisão (1 remuneração — art. 477, §5º)", "CLT, art. 477, §5º", [{ id: "remuneracao", rotulo: "Remuneração", tipo: "moeda" }, { id: "descontos", rotulo: "Descontos pretendidos", tipo: "moeda" }], (v) => ({ linhas: [{ rotulo: "Desconto permitido", valor: brl(Math.min(num(v, "remuneracao"), num(v, "descontos"))), destaque: true }, { rotulo: "Excesso a devolver", valor: brl(Math.max(0, num(v, "descontos") - num(v, "remuneracao"))) }], memoria: ["Compensação no pagamento das verbas rescisórias limitada a um mês de remuneração."] })),
];

// ---------------------------------------------------------------------------
// Seção 13 — liquidação
// ---------------------------------------------------------------------------

const CAMPOS_LIQ: Campo[] = [
  { id: "verbas", rotulo: "Verbas devidas por mês (MM/AAAA valor)", tipo: "salarios", largura: "inteira", ajuda: "Uma linha por competência com o valor nominal das diferenças salariais deferidas." },
  { id: "ajuizamento", rotulo: "Ajuizamento", tipo: "data" },
  { id: "dataCalculo", rotulo: "Atualizar até", tipo: "data" },
  { id: "criterio", rotulo: "Critério de atualização", tipo: "select", opcoes: [{ valor: "tst2024", rotulo: "TST 2024: IPCA-E + TR → Selic → IPCA + taxa legal (Lei 14.905)" }, { valor: "adc58", rotulo: "ADC 58 pura: IPCA-E + TR → Selic até hoje" }, { valor: "ipcae_1", rotulo: "IPCA-E + juros de 1% a.m." }, { valor: "tr_1", rotulo: "TR + juros de 1% a.m. (histórico)" }], padrao: "tst2024" },
  { id: "prescricao", rotulo: "Prescrição quinquenal", tipo: "checkbox", padrao: true },
  { id: "multa40", rotulo: "FGTS com multa de 40%", tipo: "checkbox", padrao: true },
  { id: "honorarios", rotulo: "Honorários sucumbenciais (%)", tipo: "percentual", padrao: 10 },
  { id: "custas", rotulo: "Custas (%)", tipo: "percentual", padrao: 2 },
  { id: "periciais", rotulo: "Honorários periciais", tipo: "moeda" },
  { id: "pagos", rotulo: "Valores pagos a abater (OJ 415)", tipo: "moeda" },
  { id: "depositos", rotulo: "Depósitos recursais / alvarás", tipo: "moeda" },
  { id: "dependentes", rotulo: "Dependentes (IR)", tipo: "inteiro", padrao: 0 },
];

function liquidacao(id: string, nome: string, fundamento: string, preset: Valores = {}, notas: string[] = []): Calculadora {
  return {
    id,
    secao: 13,
    nome,
    fundamento,
    modo: "form",
    campos: CAMPOS_LIQ.map((c) => (preset[c.id] !== undefined ? { ...c, padrao: preset[c.id] as string | number | boolean } : c)),
    calcular: (v0, c) => {
      const v = { ...preset, ...v0 };
      const verbas = lerSalarios(txt(v, "verbas"));
      if (!verbas.length || !txt(v, "ajuizamento")) return { linhas: [], memoria: ["Informe as verbas mensais e a data do ajuizamento."] };
      const r = liquidar({
        verbas: verbas.map((x) => ({ comp: x.comp, valor: x.valor })),
        ajuizamento: txt(v, "ajuizamento"),
        dataCalculo: txt(v, "dataCalculo") || c.hoje,
        criterio: txt(v, "criterio", "tst2024") as CriterioAtualizacao,
        prescricao: bool(v, "prescricao"),
        multaFgts40: bool(v, "multa40"),
        honorariosPct: num(v, "honorarios", 10),
        custasPct: num(v, "custas", 2),
        honorariosPericiais: num(v, "periciais"),
        pagos: num(v, "pagos"),
        depositosRecursais: num(v, "depositos"),
        dependentes: num(v, "dependentes"),
      }, c.indices);
      return {
        linhas: [
          { rotulo: "Principal nominal", valor: brl(r.principal) },
          { rotulo: "Principal corrigido", valor: brl(r.corrigido) },
          { rotulo: "Juros (TR / taxa legal / 1%)", valor: brl(r.juros) },
          { rotulo: "Selic (fase judicial)", valor: brl(r.selic) },
          { rotulo: "FGTS + multa", valor: brl(r.fgts + r.multaFgts) },
          { rotulo: "Bruto devido ao reclamante", valor: brl(r.bruto), destaque: true },
          { rotulo: "INSS cota empregado (mês a mês)", valor: brl(r.inssEmpregado) },
          { rotulo: `IRRF (RRA — ${r.meses} meses)`, valor: brl(r.irrf) },
          { rotulo: "Valores pagos abatidos", valor: brl(num(v, "pagos")) },
          { rotulo: "Líquido do reclamante", valor: brl(r.liquidoAutor), destaque: true },
          { rotulo: "Honorários sucumbenciais", valor: brl(r.honorarios) },
          { rotulo: "Custas", valor: brl(r.custas) },
          { rotulo: "INSS patronal estimado (20%)", valor: brl(r.patronal) },
          { rotulo: "Total devido pela reclamada", valor: brl(r.totalReclamada), destaque: true },
          { rotulo: "Saldo após depósitos/alvarás", valor: brl(r.saldoAposDepositos) },
          ...(r.prescrito ? [{ rotulo: "Parcelas prescritas (excluídas)", valor: brl(r.prescrito) }] : []),
        ],
        memoria: [
          "ADC 58/STF: fase pré-judicial com IPCA-E + juros do art. 39, caput, da Lei 8.177/91 (TR); a partir do ajuizamento, Selic.",
          "TST (2024, E-ED-RR-713-03.2010.5.04.0029): desde 30/08/2024 (Lei 14.905/2024), IPCA + juros pela taxa legal (Selic − IPCA, nunca negativa).",
          "INSS do empregado calculado mês a mês pela tabela de cada competência (Súmula 368, III/TST); IRRF pelo RRA sem os juros de mora (OJ 400/SDI-1; Tema 808/STF).",
          "Honorários de 5% a 15% (art. 791-A); custas de 2%, limitadas a 4 tetos do RGPS (art. 789).",
          ...notas,
        ],
        tabela: { titulo: "Demonstrativo de atualização", colunas: ["Comp.", "Verba", "Valor", "Fator correção", "Corrigido", "Juros %", "Juros", "Selic %", "Selic", "Total"], linhas: r.linhas },
      };
    },
  };
}

export const TRAB_SECAO_13: Calculadora[] = [
  liquidacao("liquidacao", "Liquidação de sentença completa (padrão PJe-Calc)", "CLT, arts. 879 e 880; ADC 58; Lei 14.905/2024"),
  liquidacao("abatimento-oj415", "Abatimento de valores pagos sob o mesmo título (OJ 415)", "OJ 415/SDI-1", {}, ["OJ 415: a dedução é global, pelo total pago no período, e não limitada ao mês."]),
  liquidacao("prescricao-trab", "Limitação temporal (prescrição quinquenal e bienal)", "CF, art. 7º, XXIX; Súmula 308/TST", {}, ["Bienal: ação em até 2 anos da extinção do contrato; quinquenal: alcança as parcelas anteriores a 5 anos do ajuizamento."]),
  liquidacao("ipcae-pre", "Correção pré-judicial pelo IPCA-E (ADC 58)", "ADC 58 e 59/STF", { criterio: "adc58" }),
  liquidacao("tr-juros-pre", "Juros pré-judiciais pela TR (art. 39, caput, Lei 8.177/91)", "Lei 8.177/91, art. 39, caput; ADC 58 (embargos)", { criterio: "adc58" }),
  liquidacao("selic-judicial", "Selic na fase judicial (ADC 58)", "ADC 58/STF", { criterio: "adc58" }),
  liquidacao("ipca-14905", "Correção pelo IPCA após a Lei 14.905/2024", "CC, art. 389, parágrafo único (Lei 14.905/2024)", { criterio: "tst2024" }),
  liquidacao("taxa-legal", "Taxa legal de juros (Selic − IPCA) após a Lei 14.905/2024", "CC, art. 406, §1º (Lei 14.905/2024)", { criterio: "tst2024" }),
  liquidacao("juros-1", "Juros de mora de 1% ao mês (casos específicos)", "Lei 8.177/91, art. 39, §1º (histórico); Fazenda: Lei 9.494/97", { criterio: "ipcae_1" }),
  form("inss-empregado-mes", 13, "INSS cota do empregado (tabela progressiva mês a mês)", "Lei 8.212/91, art. 20; Súmula 368, III/TST", [{ id: "verbas", rotulo: "Verbas salariais por mês (MM/AAAA valor)", tipo: "salarios", largura: "inteira" }], (v) => {
    const l = lerSalarios(txt(v, "verbas"));
    let t = 0;
    const linhas = l.map((x) => { const r = inssEmpregado(x.valor, x.comp); t += r.valor; return [fmtComp(x.comp), brl(x.valor), pct(r.aliquotaEfetiva), brl(r.valor)]; });
    return { linhas: [{ rotulo: "INSS do empregado", valor: brl(t), destaque: true }], memoria: ["Regime de competência: tabela vigente em cada mês, respeitado o teto (Súmula 368, III). Some os salários já pagos no mês para apurar a faixa correta."], tabela: { colunas: ["Mês", "Base", "Alíquota efetiva", "INSS"], linhas } };
  }),
  form("inss-patronal", 13, "INSS cota patronal (20% + RAT/FAP + terceiros)", "Lei 8.212/91, art. 22", [{ id: "base", rotulo: "Verbas salariais deferidas", tipo: "moeda" }, { id: "rat", rotulo: "RAT × FAP (%)", tipo: "percentual", padrao: 2 }, { id: "terceiros", rotulo: "Terceiros / Sistema S (%)", tipo: "percentual", padrao: 5.8 }, { id: "simples", rotulo: "Optante do Simples (anexos I a III, V) / filantrópica", tipo: "checkbox" }], (v) => {
    const b = num(v, "base");
    if (bool(v, "simples")) return valor("Cota patronal", 0, ["Empresas do Simples Nacional (exceto anexo IV) e entidades beneficentes certificadas são isentas da cota patronal (LC 123/2006, art. 13; Lei 12.101/2009)."]);
    return { linhas: [{ rotulo: "Patronal (20%)", valor: brl(b * 0.2) }, { rotulo: "RAT/FAP", valor: brl((b * num(v, "rat", 2)) / 100) }, { rotulo: "Terceiros", valor: brl((b * num(v, "terceiros", 5.8)) / 100) }, { rotulo: "Total", valor: brl(b * (0.2 + num(v, "rat", 2) / 100 + num(v, "terceiros", 5.8) / 100)), destaque: true }], memoria: ["Atualizada pelos critérios previdenciários (Selic) a partir da prestação de serviços (art. 43, §2º, Lei 8.212)."] };
  }),
  form("isencao-simples", 13, "Isenção de cota patronal (Simples Nacional / filantrópicas)", "LC 123/2006, art. 13, VI; Lei 12.101/2009", [{ id: "base", rotulo: "Verbas salariais", tipo: "moeda" }, { id: "anexo", rotulo: "Anexo do Simples", tipo: "select", opcoes: ["I", "II", "III", "IV", "V"].map((a) => ({ valor: a, rotulo: `Anexo ${a}` })), padrao: "III" }], (v) => valor(txt(v, "anexo") === "IV" ? "Cota patronal devida (anexo IV)" : "Cota patronal (isenta)", txt(v, "anexo") === "IV" ? num(v, "base") * 0.2 : 0, ["Empresas do anexo IV recolhem a cota patronal à parte (LC 123, art. 18, §5º-C)."])),
  form("irrf-rra", 13, "IRRF sobre rendimentos acumulados (RRA — art. 12-A)", "Lei 7.713/88, art. 12-A; IN RFB 1.500/2014", [{ id: "base", rotulo: "Verbas tributáveis (sem juros)", tipo: "moeda" }, { id: "meses", rotulo: "Número de meses", tipo: "inteiro" }, { id: "inss", rotulo: "INSS do empregado a deduzir", tipo: "moeda" }, { id: "dependentes", rotulo: "Dependentes", tipo: "inteiro" }], (v) => {
    const meses = Math.max(1, num(v, "meses", 1));
    const base = Math.max(0, num(v, "base") - num(v, "inss") - num(v, "dependentes") * 189.59 * meses);
    const irMes = irMensal(base / meses);
    return { linhas: [{ rotulo: "Base mensal", valor: brl(base / meses) }, { rotulo: "IR mensal", valor: brl(irMes) }, { rotulo: "IRRF total", valor: brl(irMes * meses), destaque: true }], memoria: ["Tabela progressiva acumulada: faixas multiplicadas pelo número de meses; juros de mora excluídos (OJ 400; Tema 808/STF)."] };
  }),
  form("irrf-tabela-acumulada", 13, "Tabela progressiva acumulada do IRRF (× número de meses)", "IN RFB 1.500/2014, art. 36", [{ id: "meses", rotulo: "Número de meses", tipo: "inteiro", padrao: 12 }], (v) => {
    const n = Math.max(1, num(v, "meses", 12));
    const faixas = [[2428.8, 0, 0], [2826.65, 7.5, 182.16], [3751.05, 15, 394.16], [4664.68, 22.5, 675.49], [Infinity, 27.5, 908.73]];
    return { linhas: [{ rotulo: "Meses", valor: String(n), destaque: true }], memoria: ["Faixas e deduções da tabela mensal multiplicadas pelo número de meses (tabela de 2025/2026, sem a redução da Lei 15.270/2025)."], tabela: { colunas: ["Até", "Alíquota", "Dedução"], linhas: faixas.map(([ate, al, ded]) => [ate === Infinity ? "acima" : brl((ate as number) * n), `${al}%`, brl((ded as number) * n)]) } };
  }),
  form("juros-fora-ir", 13, "Exclusão dos juros de mora da base do IRRF (Tema 808 / OJ 400)", "Tema 808/STF; OJ 400/SDI-1", [{ id: "principal", rotulo: "Principal corrigido tributável", tipo: "moeda" }, { id: "juros", rotulo: "Juros de mora", tipo: "moeda" }], (v) => ({ linhas: [{ rotulo: "Base do IRRF", valor: brl(num(v, "principal")), destaque: true }, { rotulo: "Juros (não tributáveis)", valor: brl(num(v, "juros")) }], memoria: ["Juros de mora por atraso no pagamento de remuneração não incidem IR (Tema 808/STF)."] })),
  form("verbas-isentas", 13, "Verbas indenizatórias isentas de INSS e IRRF", "Lei 8.212/91, art. 28, §9º; Lei 7.713/88, art. 6º", [{ id: "ferias", rotulo: "Férias indenizadas + 1/3", tipo: "moeda" }, { id: "aviso", rotulo: "Aviso prévio indenizado", tipo: "moeda" }, { id: "fgts", rotulo: "FGTS + 40%", tipo: "moeda" }, { id: "danos", rotulo: "Danos morais/materiais", tipo: "moeda" }, { id: "outras", rotulo: "Outras indenizatórias (art. 477, 479, estabilidade...)", tipo: "moeda" }], (v) => valor("Total de verbas isentas", ["ferias", "aviso", "fgts", "danos", "outras"].reduce((s, k) => s + num(v, k), 0), ["Aviso prévio indenizado: isento de INSS (Tema 478/STJ) e de IR (Súmula 215/STJ, por analogia, e Lei 7.713, art. 6º, V)."])),
  form("honorarios-791a", 13, "Honorários sucumbenciais (5% a 15% — art. 791-A)", "CLT, art. 791-A", [{ id: "base", rotulo: "Valor da liquidação / proveito econômico", tipo: "moeda" }, { id: "pct", rotulo: "Percentual", tipo: "percentual", padrao: 10 }], (v) => valor("Honorários", (num(v, "base") * Math.min(15, Math.max(5, num(v, "pct", 10)))) / 100, ["Sobre o valor que resultar da liquidação, o proveito econômico ou o valor da causa."])),
  form("honorarios-reciprocos", 13, "Honorários sucumbenciais recíprocos", "CLT, art. 791-A, §§3º e 4º; ADI 5.766/STF", [{ id: "procedente", rotulo: "Valor dos pedidos procedentes", tipo: "moeda" }, { id: "improcedente", rotulo: "Valor dos pedidos improcedentes", tipo: "moeda" }, { id: "pct", rotulo: "Percentual", tipo: "percentual", padrao: 10 }, { id: "justica", rotulo: "Reclamante com justiça gratuita", tipo: "checkbox", padrao: true }], (v) => {
    const p = num(v, "pct", 10) / 100;
    return { linhas: [{ rotulo: "Devidos pela reclamada", valor: brl(num(v, "procedente") * p) }, { rotulo: "Devidos pelo reclamante", valor: brl(num(v, "improcedente") * p), destaque: true }], memoria: [bool(v, "justica") ? "Beneficiário da justiça gratuita: obrigação sob condição suspensiva por 2 anos (ADI 5.766 — vedado o desconto do crédito obtido no processo)." : "Vedada a compensação entre os honorários (§3º)."] };
  }),
  form("honorarios-periciais", 13, "Honorários periciais (contábeis, médicos, engenharia)", "CLT, art. 790-B; Resolução CSJT 247/2019", [{ id: "valor", rotulo: "Valor arbitrado", tipo: "moeda" }, { id: "sucumbente", rotulo: "Sucumbente no objeto da perícia", tipo: "select", opcoes: [{ valor: "reclamada", rotulo: "Reclamada" }, { valor: "reclamante", rotulo: "Reclamante" }], padrao: "reclamada" }, { id: "justica", rotulo: "Reclamante com justiça gratuita", tipo: "checkbox", padrao: true }], (v) => ({ linhas: [{ rotulo: "Honorários periciais", valor: brl(num(v, "valor")), destaque: true }, { rotulo: "Responsável", valor: txt(v, "sucumbente") === "reclamante" && bool(v, "justica") ? "União (ADI 5.766)" : txt(v, "sucumbente") === "reclamante" ? "Reclamante" : "Reclamada" }], memoria: ["A parte sucumbente na pretensão objeto da perícia paga; beneficiário da gratuidade não paga com créditos do processo (ADI 5.766)."] })),
  form("custas", 13, "Custas processuais (2% — art. 789)", "CLT, art. 789", [{ id: "valor", rotulo: "Valor da condenação ou do acordo", tipo: "moeda" }, { id: "data", rotulo: "Data", tipo: "data" }], (v, c) => {
    const lim = 4 * teto(competencia(txt(v, "data") || c.hoje));
    const custas = Math.max(10.64, Math.min(num(v, "valor") * 0.02, lim));
    return valor("Custas", custas, [`2% com mínimo de R$ 10,64 e máximo de 4 tetos do RGPS (${brl(lim)}).`]);
  }),
  form("responsabilidade-subsidiaria", 13, "Responsabilidade subsidiária/solidária (por período)", "Súmula 331/TST; CLT, art. 2º, §2º", [{ id: "total", rotulo: "Total da condenação", tipo: "moeda" }, { id: "inicio", rotulo: "Início do contrato", tipo: "data" }, { id: "fim", rotulo: "Fim do contrato", tipo: "data" }, { id: "tomInicio", rotulo: "Início da prestação ao tomador", tipo: "data" }, { id: "tomFim", rotulo: "Fim da prestação ao tomador", tipo: "data" }], (v) => {
    const datas = ["inicio", "fim", "tomInicio", "tomFim"].map((k) => txt(v, k));
    if (datas.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) return { linhas: [], memoria: ["Informe as quatro datas."] };
    const tot = diaN(txt(v, "fim")) - diaN(txt(v, "inicio")) + 1;
    const ini = Math.max(diaN(txt(v, "inicio")), diaN(txt(v, "tomInicio")));
    const fim = Math.min(diaN(txt(v, "fim")), diaN(txt(v, "tomFim")));
    const prop = tot > 0 ? Math.max(0, fim - ini + 1) / tot : 0;
    return { linhas: [{ rotulo: "Proporção do período", valor: pct(prop) }, { rotulo: "Responsabilidade do tomador (estimativa linear)", valor: brl(num(v, "total") * prop), destaque: true }], memoria: ["A responsabilidade subsidiária limita-se ao período da prestação de serviços ao tomador (Súmula 331, VI). A apuração exata considera as verbas de cada período; a proporção linear é estimativa."] };
  }),
  form("rateio-acordo", 13, "Rateio de acordo judicial (verbas salariais × indenizatórias)", "CLT, arts. 832, §3º, e 43 da Lei 8.212; OJ 376/SDI-1", [{ id: "valor", rotulo: "Valor do acordo", tipo: "moeda" }, { id: "salarial", rotulo: "Percentual de verbas salariais (%)", tipo: "percentual", padrao: 40 }, { id: "meses", rotulo: "Meses de referência (INSS/IR)", tipo: "inteiro", padrao: 12 }], (v, c) => {
    const sal = (num(v, "valor") * num(v, "salarial", 40)) / 100;
    const ind = num(v, "valor") - sal;
    const meses = Math.max(1, num(v, "meses", 12));
    const inss = inssEmpregado(sal / meses, competencia(c.hoje)).valor * meses;
    return { linhas: [{ rotulo: "Verbas salariais", valor: brl(sal) }, { rotulo: "Verbas indenizatórias", valor: brl(ind) }, { rotulo: "INSS do empregado (estimado)", valor: brl(inss) }, { rotulo: "INSS patronal (20%)", valor: brl(sal * 0.2) }, { rotulo: "Líquido ao reclamante", valor: brl(num(v, "valor") - inss), destaque: true }], memoria: ["A discriminação deve guardar proporção com os pedidos (OJ 376); sem discriminação, o INSS incide sobre o total (art. 43, parágrafo único)."] };
  }),
  form("saldo-execucao", 13, "Saldo remanescente da execução (alvarás e depósitos)", "CLT, art. 899; Súmula 128/TST", [{ id: "debito", rotulo: "Débito atualizado", tipo: "moeda" }, { id: "depositos", rotulo: "Depósitos recursais (atualizados)", tipo: "moeda" }, { id: "alvaras", rotulo: "Alvarás já liberados", tipo: "moeda" }, { id: "penhoras", rotulo: "Valores penhorados", tipo: "moeda" }], (v) => valor("Saldo remanescente", num(v, "debito") - num(v, "depositos") - num(v, "alvaras") - num(v, "penhoras"), ["Atualize o débito até a data de cada levantamento e abata pelo valor atualizado (deduz-se primeiro dos juros, depois do principal — CC, art. 354)."])),
];

export { somaComp };
