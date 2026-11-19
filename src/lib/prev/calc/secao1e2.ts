// Seções 1 (tempo, carência, enquadramento) e 2 (salário de benefício e coeficientes).

import { DIAS_ANO, EC103, amd, compN, competencia, deCompN, diaN, fmtAMD, fmtComp, fmtData, hojeISO, somaComp } from "../datas";
import { fatorComposto } from "../indices";
import { calcularMedia, agruparSalarios, mediaUltimos12 } from "../media";
import { qualidadeSegurado } from "../beneficios";
import { coeficienteArt26 } from "../rgps";
import { arred, bonusFator, expectativaSobrevida, fatorConversao, fatorPrevidenciario, salarioMinimo, teto } from "../tabelas";
import { montarLinha, tempoEm, type Periodo, type TipoPeriodo } from "../tempo";
import { SEXO, brl, bool, dec, lerPeriodos, lerSalarios, num, pct, txt, type Calculadora, type Campo, type Saida, type Valores } from "./tipos";

const CAMPO_PERIODOS: Campo = {
  id: "periodos",
  rotulo: "Períodos (um por linha: dd/mm/aaaa a dd/mm/aaaa tipo)",
  tipo: "periodos",
  ajuda: "Tipos: comum, especial15, especial20, especial25. Ex.: 01/03/1995 a 31/12/2005 especial25",
  largura: "inteira",
};
const CAMPO_SALARIOS: Campo = {
  id: "salarios",
  rotulo: "Salários de contribuição (um por linha: MM/AAAA valor)",
  tipo: "salarios",
  ajuda: "Ex.: 07/1994 582,86 — cole direto do CNIS ou de uma planilha.",
  largura: "inteira",
};
const DATA_REF: Campo = { id: "data", rotulo: "Data de referência (DER/DIB)", tipo: "data" };

function periodosDe(v: Valores, extra: Partial<Periodo> = {}): Periodo[] {
  return lerPeriodos(txt(v, "periodos")).map((p, i) => ({
    id: String(i),
    inicio: p.inicio,
    fim: p.fim,
    tipo: (["comum", "especial15", "especial20", "especial25"].includes(p.tipo) ? p.tipo : "comum") as TipoPeriodo,
    ...extra,
  }));
}

function contarTempo(v: Valores, opts: { extra?: Partial<Periodo>; notas?: string[]; titulo?: string } = {}): Saida {
  const sexo = (txt(v, "sexo", "M") as "M" | "F");
  const periodos = periodosDe(v, opts.extra);
  if (!periodos.length) return { linhas: [{ rotulo: "Atenção", valor: "Informe ao menos um período válido." }], memoria: [] };
  const data = txt(v, "data") || periodos.map((p) => p.fim).sort().at(-1)!;
  const linha = montarLinha(periodos, sexo, data);
  const t = tempoEm(linha, data);
  const t103 = tempoEm(linha, EC103);
  const somaBruta = periodos.reduce((s, p) => s + diaN(p.fim) - diaN(p.inicio) + 1, 0);
  const concomitante = somaBruta - t.diasBrutos;
  const r = amd(t.diasConvertidos);
  return {
    linhas: [
      { rotulo: opts.titulo ?? "Tempo total (com conversões)", valor: fmtAMD(t.diasConvertidos), destaque: true },
      { rotulo: "Tempo bruto (sem conversão)", valor: fmtAMD(t.diasBrutos) },
      { rotulo: "Em dias", valor: `${Math.round(t.diasConvertidos)} dias` },
      { rotulo: "Em meses (EC 103 — competências)", valor: `${t.carencia} meses` },
      { rotulo: "Em anos decimais", valor: dec(t.anos, 4) },
      { rotulo: "Carência", valor: `${t.carencia} contribuições` },
      { rotulo: "Dias concomitantes descartados", valor: `${Math.round(concomitante)} dias` },
      { rotulo: "Tempo até 13/11/2019", valor: fmtAMD(t103.diasConvertidos) },
      { rotulo: "Tempo especial (15/20/25)", valor: `${fmtAMD(t.especial[15])} / ${fmtAMD(t.especial[20])} / ${fmtAMD(t.especial[25])}` },
    ],
    memoria: [
      `Contagem em dias corridos, períodos concomitantes considerados uma única vez (Lei 8.213/91, art. 96, I).`,
      `Total: ${r.anos} anos, ${r.meses} meses e ${r.dias} dias.`,
      "Tempo especial convertido em comum apenas até 13/11/2019 (EC 103/2019, art. 25, §2º).",
      ...(opts.notas ?? []),
    ],
    tabela: {
      colunas: ["Início", "Fim", "Tipo", "Dias"],
      linhas: periodos.map((p) => [fmtData(p.inicio), fmtData(p.fim), p.tipo, String(diaN(p.fim) - diaN(p.inicio) + 1)]),
    },
  };
}

/** Contagem de tempo para categorias específicas (rural, militar, aluno-aprendiz...). */
function categoria(id: string, nome: string, fundamento: string, notas: string[], extra: Partial<Periodo> = {}): Calculadora {
  return {
    id,
    secao: 1,
    nome,
    fundamento,
    modo: "form",
    campos: [SEXO, DATA_REF, CAMPO_PERIODOS],
    calcular: (v) => contarTempo(v, { extra, notas }),
  };
}

// Conversão de tempo comum em especial (antes de 28/04/1995).
const COMUM_PARA_ESPECIAL: Record<"M" | "F", Record<15 | 20 | 25, number>> = {
  M: { 15: 0.43, 20: 0.57, 25: 0.71 },
  F: { 15: 0.5, 20: 0.67, 25: 0.83 },
};

// Decreto 3.048/99, art. 70-E (LC 142): conversão entre graus de deficiência.
const TEMPOS_PCD: Record<"M" | "F", Record<string, number>> = {
  M: { grave: 25, moderada: 29, leve: 33, comum: 35 },
  F: { grave: 20, moderada: 24, leve: 28, comum: 30 },
};

function salariosV(v: Valores) {
  return lerSalarios(txt(v, "salarios"));
}

function tabelaMedia(itens: ReturnType<typeof calcularMedia>["itens"]) {
  return {
    colunas: ["Competência", "Salário", "Limitado ao teto", "Fator", "Corrigido", "Situação"],
    linhas: itens.map((i) => [fmtComp(i.comp), brl(i.valor), brl(i.limitado), dec(i.fator, 6), brl(i.corrigido), i.usado ? "considerado" : i.motivo ?? "descartado"]),
  };
}

export const SECAO_1: Calculadora[] = [
  { id: "tempo-comum", secao: 1, nome: "Contagem de tempo de contribuição comum (RGPS)", fundamento: "Lei 8.213/91, art. 55", modo: "form", campos: [SEXO, DATA_REF, CAMPO_PERIODOS], calcular: (v) => contarTempo(v) },
  { id: "tempo-concomitante", secao: 1, nome: "Contagem de tempo concomitante", fundamento: "Lei 8.213/91, art. 96, I", modo: "form", campos: [SEXO, DATA_REF, CAMPO_PERIODOS], calcular: (v) => contarTempo(v, { notas: ["Concomitância: o mesmo dia não é contado duas vezes; prevalece o período mais vantajoso (especial)."] }) },
  { id: "tempo-fracionado", secao: 1, nome: "Contagem de tempo fracionado (dias/meses/anos)", modo: "form", campos: [SEXO, DATA_REF, CAMPO_PERIODOS], calcular: (v) => contarTempo(v) },
  { id: "tempo-meses", secao: 1, nome: "Contagem de tempo em meses (EC 103/2019)", fundamento: "EC 103/2019, art. 26; Decreto 10.410/2020", modo: "form", campos: [SEXO, DATA_REF, CAMPO_PERIODOS], calcular: (v) => contarTempo(v, { notas: ["Após a EC 103, o tempo de contribuição é apurado por competências com contribuição igual ou superior ao mínimo."] }) },
  { id: "carencia", secao: 1, nome: "Apuração de carência mensal", fundamento: "Lei 8.213/91, arts. 24 a 27", modo: "form", campos: [SEXO, DATA_REF, CAMPO_PERIODOS], calcular: (v) => contarTempo(v, { titulo: "Tempo", notas: ["Carência: número de competências com ao menos um dia de contribuição (art. 24)."] }) },
  ...(["graca", "graca-desemprego", "graca-120"] as const).map((id): Calculadora => ({
    id,
    secao: 1,
    nome: { graca: "Período de graça (qualidade de segurado)", "graca-desemprego": "Prorrogação do período de graça (desemprego involuntário)", "graca-120": "Prorrogação do período de graça (mais de 120 contribuições)" }[id],
    fundamento: "Lei 8.213/91, art. 15",
    modo: "form",
    campos: [
      { id: "ultima", rotulo: "Última contribuição (competência)", tipo: "competencia" },
      { id: "c120", rotulo: "Mais de 120 contribuições sem perder a qualidade", tipo: "checkbox", padrao: id === "graca-120" },
      { id: "desemprego", rotulo: "Desemprego involuntário comprovado", tipo: "checkbox", padrao: id === "graca-desemprego" },
      { id: "facultativo", rotulo: "Segurado facultativo", tipo: "checkbox" },
      { id: "data", rotulo: "Data a verificar", tipo: "data", padrao: hojeISO() },
    ],
    calcular: (v) => {
      const q = qualidadeSegurado({ ultimaContribuicao: txt(v, "ultima"), mais120Contribuicoes: bool(v, "c120"), desempregoRegistrado: bool(v, "desemprego"), facultativo: bool(v, "facultativo"), dataReferencia: txt(v, "data", hojeISO()) });
      return {
        linhas: [
          { rotulo: "Situação", valor: q.mantem ? "Mantém a qualidade de segurado" : "Perdeu a qualidade de segurado", destaque: true },
          { rotulo: "Período de graça", valor: `${q.mesesGraca} meses` },
          { rotulo: "Fim do período de graça", valor: fmtComp(q.fimGraca) },
          { rotulo: "Data da perda", valor: fmtData(q.perda) },
          { rotulo: "Dias restantes", valor: String(q.diasRestantes) },
        ],
        memoria: [...q.detalhes, "Perda no dia 16 do segundo mês seguinte ao fim do prazo (art. 15, §4º; Decreto 3.048/99, art. 14).", q.texto],
      };
    },
  })),
  ...([15, 20, 25] as const).map((n): Calculadora => ({
    id: `conv-especial-${n}`,
    secao: 1,
    nome: `Conversão de tempo especial de ${n} anos em comum (fator ${dec(fatorConversao("M", n))} / ${dec(fatorConversao("F", n))})`,
    fundamento: "Decreto 3.048/99, art. 70; EC 103/2019, art. 25, §2º",
    modo: "form",
    campos: [SEXO, { id: "inicio", rotulo: "Início", tipo: "data" }, { id: "fim", rotulo: "Fim", tipo: "data" }],
    calcular: (v) => {
      const sexo = txt(v, "sexo", "M") as "M" | "F";
      const ini = txt(v, "inicio");
      const fim = txt(v, "fim");
      if (!ini || !fim) return { linhas: [], memoria: ["Informe as datas."] };
      const ate = fim < EC103 ? fim : EC103;
      const diasAntes = Math.max(0, diaN(ate) - diaN(ini) + 1);
      const diasDepois = Math.max(0, diaN(fim) - diaN(ini) + 1 - diasAntes);
      const f = fatorConversao(sexo, n);
      const conv = diasAntes * f + diasDepois;
      return {
        linhas: [
          { rotulo: "Tempo especial", valor: fmtAMD(diasAntes + diasDepois) },
          { rotulo: "Fator", valor: dec(f) },
          { rotulo: "Tempo comum convertido", valor: fmtAMD(conv), destaque: true },
          { rotulo: "Acréscimo", valor: fmtAMD(conv - diasAntes - diasDepois) },
        ],
        memoria: [`${diasAntes} dia(s) até 13/11/2019 × ${f} + ${diasDepois} dia(s) após a EC 103 sem conversão = ${Math.round(conv)} dias.`],
      };
    },
  })),
  {
    id: "conv-comum-especial",
    secao: 1,
    nome: "Conversão de tempo comum em especial (antes da Lei 9.032/1995)",
    fundamento: "Decreto 83.080/79; Decreto 357/91, art. 64 — períodos até 28/04/1995 (ver Tema 546/STJ)",
    modo: "form",
    campos: [SEXO, { id: "alvo", rotulo: "Aposentadoria especial de", tipo: "select", opcoes: [{ valor: "25", rotulo: "25 anos" }, { valor: "20", rotulo: "20 anos" }, { valor: "15", rotulo: "15 anos" }], padrao: "25" }, { id: "inicio", rotulo: "Início", tipo: "data" }, { id: "fim", rotulo: "Fim", tipo: "data" }],
    calcular: (v) => {
      const sexo = txt(v, "sexo", "M") as "M" | "F";
      const alvo = Number(txt(v, "alvo", "25")) as 15 | 20 | 25;
      const fim = txt(v, "fim") > "1995-04-28" ? "1995-04-28" : txt(v, "fim");
      const dias = Math.max(0, diaN(fim) - diaN(txt(v, "inicio")) + 1);
      const f = COMUM_PARA_ESPECIAL[sexo][alvo];
      return {
        linhas: [{ rotulo: "Tempo comum até 28/04/1995", valor: fmtAMD(dias) }, { rotulo: "Fator", valor: dec(f) }, { rotulo: "Tempo especial equivalente", valor: fmtAMD(dias * f), destaque: true }],
        memoria: ["Só períodos até 28/04/1995. O STJ (Tema 546) exige que os requisitos da aposentadoria especial tenham sido cumpridos até essa data — avalie o caso concreto."],
      };
    },
  },
  {
    id: "conv-pcd-graus",
    secao: 1,
    nome: "Conversão entre graus de deficiência (LC 142 — grave, moderada, leve)",
    fundamento: "LC 142/2013, art. 7º; Decreto 3.048/99, art. 70-E",
    modo: "form",
    campos: [SEXO, { id: "de", rotulo: "Tempo trabalhado como", tipo: "select", opcoes: ["grave", "moderada", "leve", "comum"].map((g) => ({ valor: g, rotulo: g === "comum" ? "sem deficiência" : `deficiência ${g}` })), padrao: "comum" }, { id: "para", rotulo: "Converter para", tipo: "select", opcoes: ["grave", "moderada", "leve", "comum"].map((g) => ({ valor: g, rotulo: g === "comum" ? "tempo comum" : `deficiência ${g}` })), padrao: "leve" }, { id: "anos", rotulo: "Anos", tipo: "inteiro" }, { id: "meses", rotulo: "Meses", tipo: "inteiro" }, { id: "dias", rotulo: "Dias", tipo: "inteiro" }],
    calcular: (v) => {
      const sexo = txt(v, "sexo", "M") as "M" | "F";
      const de = TEMPOS_PCD[sexo][txt(v, "de", "comum")];
      const para = TEMPOS_PCD[sexo][txt(v, "para", "leve")];
      const fator = Math.round((para / de) * 100) / 100;
      const dias = num(v, "anos") * DIAS_ANO + num(v, "meses") * (DIAS_ANO / 12) + num(v, "dias");
      return {
        linhas: [{ rotulo: "Fator de conversão", valor: dec(fator) }, { rotulo: "Tempo convertido", valor: fmtAMD(dias * fator), destaque: true }],
        memoria: [`Fator = tempo exigido no grau de destino (${para}) ÷ tempo exigido no grau de origem (${de}) = ${dec(fator)} (tabela do art. 70-E do Decreto 3.048/99).`],
      };
    },
  },
  {
    id: "conv-comum-pcd",
    secao: 1,
    nome: "Conversão de tempo comum em tempo de pessoa com deficiência",
    fundamento: "LC 142/2013, art. 7º; Decreto 3.048/99, art. 70-E",
    modo: "form",
    campos: [SEXO, { id: "para", rotulo: "Grau da deficiência", tipo: "select", opcoes: ["grave", "moderada", "leve"].map((g) => ({ valor: g, rotulo: g })), padrao: "leve" }, { id: "anos", rotulo: "Anos de tempo comum", tipo: "inteiro" }, { id: "meses", rotulo: "Meses", tipo: "inteiro" }],
    calcular: (v) => {
      const sexo = txt(v, "sexo", "M") as "M" | "F";
      const fator = Math.round((TEMPOS_PCD[sexo][txt(v, "para", "leve")] / TEMPOS_PCD[sexo].comum) * 100) / 100;
      const dias = num(v, "anos") * DIAS_ANO + num(v, "meses") * (DIAS_ANO / 12);
      return { linhas: [{ rotulo: "Fator", valor: dec(fator) }, { rotulo: "Tempo PcD equivalente", valor: fmtAMD(dias * fator), destaque: true }], memoria: ["O tempo comum é reduzido proporcionalmente ao grau de deficiência."] };
    },
  },
  categoria("tempo-rural", "Tempo rural em regime de economia familiar (sem indenização)", "Lei 8.213/91, art. 55, §2º; Súmula 577/STJ", [
    "Tempo rural anterior a 11/1991: conta como tempo de contribuição sem indenização, mas não para carência (art. 55, §2º).",
    "Após 10/1991 só conta para aposentadoria por idade rural/híbrida, salvo indenização (art. 39, II).",
  ], { carencia: false }),
  categoria("tempo-rural-indenizado", "Tempo rural com indenização (posterior a 11/1991)", "Lei 8.212/91, art. 45-A; Lei 8.213/91, art. 39, II", ["Período posterior a 10/1991 conta para tempo de contribuição mediante indenização — calcule o valor em 'Indenização de período decadente'."]),
  categoria("tempo-pescador", "Tempo de pescador artesanal e indígena", "Lei 8.213/91, art. 11, VII; IN PRES/INSS 128/2022", ["Segurado especial: conta para benefícios de valor mínimo; para tempo de contribuição exige recolhimento facultativo/indenização."], { carencia: false }),
  categoria("tempo-magisterio", "Tempo de magistério (educação infantil, fundamental e médio)", "CF, art. 201, §8º; Lei 11.301/2006; Tema 965/STF", ["Inclui funções de direção, coordenação e assessoramento pedagógico em escola (ADI 3.772)."], { professor: true }),
  categoria("tempo-militar", "Tempo de serviço militar obrigatório e voluntário", "Lei 8.213/91, art. 55, I", ["Conta como tempo de contribuição, inclusive para carência quando houver certidão (CTC das Forças Armadas)."]),
  categoria("tempo-aluno-aprendiz", "Tempo de aluno-aprendiz (escolas técnicas)", "Súmula 18/TNU; Súmula 96/TCU", ["Exige retribuição pecuniária à conta do orçamento (ainda que indireta) e certidão da escola."], { carencia: false }),
  categoria("tempo-avulso", "Tempo de trabalhador avulso e portuário", "Lei 8.213/91, art. 11, VI", ["Comprovação pelo OGMO/sindicato; recolhimento presumido (art. 33, §5º, Lei 8.212)."]),
  categoria("tempo-garimpeiro", "Tempo de garimpeiro", "Lei 8.213/91, art. 11, V, b", ["Contribuinte individual: conta com o recolhimento comprovado."]),
  categoria("tempo-anistiado", "Tempo de anistiado político", "Lei 10.559/2002, art. 1º, III", ["O período de afastamento reconhecido pela Comissão de Anistia conta como tempo de contribuição."]),
  categoria("tempo-mandato", "Tempo de mandato eletivo", "Lei 8.213/91, art. 11, I, j; Lei 10.887/2004", ["Até 18/09/2004 só conta com recolhimento/indenização (ADI 2.010/STF; Resolução Senado 26/2005)."]),
  categoria("tempo-intercalado", "Tempo intercalado com benefício por incapacidade", "Lei 8.213/91, art. 55, II; Tema 1.125/STF", ["Conta como tempo e como carência quando intercalado com períodos de contribuição."]),
  categoria("tempo-maternidade", "Tempo em gozo de salário-maternidade", "Decreto 3.048/99, art. 19-C; ADI 2.110", ["O salário-maternidade conta como tempo de contribuição e carência."]),
  categoria("ctc-rgps-rpps", "Contagem recíproca (CTC — RGPS para RPPS)", "CF, art. 201, §9º; Lei 8.213/91, arts. 94 a 99", ["Não se admite contagem em dobro nem de tempo concomitante; tempo especial convertido só até 13/11/2019 (Tema 942/STF)."], { regime: "RGPS" }),
  categoria("ctc-rpps-rgps", "Contagem recíproca (CTC — RPPS para RGPS)", "CF, art. 201, §9º; Lei 8.213/91, art. 94", ["A certidão do RPPS (CTC) deve indicar os períodos e remunerações; não aproveitados no regime de origem."], { regime: "RPPS", servicoPublico: true }),
  categoria("ctc-militar", "Contagem recíproca de tempo militar para RGPS/RPPS", "CF, art. 201, §9º-A (EC 103/2019)", ["O tempo de serviço militar e o de contribuição ao RGPS/RPPS contam reciprocamente para inatividade militar e aposentadoria."]),
  categoria("tempo-reclamatoria", "Averbação de tempo de reclamatória trabalhista", "Lei 8.213/91, art. 55, §3º; Tema 1.188/STJ", ["Sentença trabalhista é início de prova material quando fundada em provas contemporâneas (não apenas acordo homologado)."]),
  {
    id: "abaixo-minimo",
    secao: 1,
    nome: "Validação de contribuições abaixo do salário mínimo (EC 103/2019)",
    fundamento: "EC 103/2019, art. 29; Decreto 3.048/99, art. 19-E",
    modo: "form",
    campos: [{ ...CAMPO_SALARIOS, rotulo: "Salários a partir de 11/2019 (MM/AAAA valor)" }, { id: "aliquota", rotulo: "Alíquota para complementar", tipo: "select", opcoes: [{ valor: "0.075", rotulo: "7,5% (empregado/avulso/doméstico)" }, { valor: "0.11", rotulo: "11% (plano simplificado)" }, { valor: "0.2", rotulo: "20% (contribuinte individual/facultativo)" }], padrao: "0.075" }],
    calcular: (v) => validarAbaixoMinimo(v, "validar"),
  },
  { id: "agrupar-minimo", secao: 1, nome: "Agrupamento de contribuições abaixo do mínimo (art. 29 da EC 103)", fundamento: "EC 103/2019, art. 29, III", modo: "form", campos: [{ ...CAMPO_SALARIOS, rotulo: "Salários a partir de 11/2019" }], calcular: (v) => validarAbaixoMinimo(v, "agrupar") },
  { id: "complementar-minimo", secao: 1, nome: "Complementação de contribuições abaixo do mínimo (DARF)", fundamento: "EC 103/2019, art. 29, I; Portaria RFB", modo: "form", campos: [{ ...CAMPO_SALARIOS, rotulo: "Salários a partir de 11/2019" }, { id: "aliquota", rotulo: "Alíquota", tipo: "select", opcoes: [{ valor: "0.075", rotulo: "7,5%" }, { valor: "0.11", rotulo: "11%" }, { valor: "0.2", rotulo: "20%" }], padrao: "0.075" }], calcular: (v) => validarAbaixoMinimo(v, "complementar") },
  { id: "transferir-excedente", secao: 1, nome: "Transferência de excedente de contribuição entre competências", fundamento: "EC 103/2019, art. 29, II", modo: "form", campos: [{ ...CAMPO_SALARIOS, rotulo: "Salários a partir de 11/2019" }], calcular: (v) => validarAbaixoMinimo(v, "transferir") },
];

function validarAbaixoMinimo(v: Valores, modo: "validar" | "agrupar" | "complementar" | "transferir"): Saida {
  const ag = agruparSalarios(salariosV(v));
  const comps = [...ag.keys()].filter((c) => c >= "2019-11").sort();
  const aliquota = num(v, "aliquota", 0.075);
  const linhasTab: string[][] = [];
  let abaixo = 0;
  let complemento = 0;
  // Transferência: excedente (acima do mínimo) de uma competência completa outra do mesmo ano.
  const excedentePorAno = new Map<string, number>();
  for (const c of comps) {
    const sm = salarioMinimo(c);
    const valor = ag.get(c)!;
    if (valor > sm) excedentePorAno.set(c.slice(0, 4), (excedentePorAno.get(c.slice(0, 4)) ?? 0) + (valor - sm));
  }
  let agrupadas = 0;
  let somaAbaixo = 0;
  for (const c of comps) {
    const sm = salarioMinimo(c);
    const valor = ag.get(c)!;
    let situacao = "válida";
    if (valor < sm) {
      abaixo++;
      const falta = sm - valor;
      somaAbaixo += valor;
      if (modo === "transferir") {
        const disp = excedentePorAno.get(c.slice(0, 4)) ?? 0;
        if (disp >= falta) {
          excedentePorAno.set(c.slice(0, 4), disp - falta);
          situacao = `completada com excedente de ${brl(falta)}`;
        } else situacao = `faltam ${brl(falta - disp)}`;
      } else {
        complemento += falta * aliquota;
        situacao = `abaixo do mínimo — complemento ${brl(falta * aliquota)}`;
      }
    }
    linhasTab.push([fmtComp(c), brl(valor), brl(sm), situacao]);
  }
  if (modo === "agrupar") {
    // Quantas competências mínimas se formam agrupando as abaixo do mínimo.
    const smRef = salarioMinimo(comps.at(-1) ?? competencia(hojeISO()));
    agrupadas = Math.floor(somaAbaixo / smRef);
  }
  return {
    linhas: [
      { rotulo: "Competências analisadas", valor: String(comps.length) },
      { rotulo: "Abaixo do salário mínimo", valor: String(abaixo), destaque: true },
      ...(modo === "complementar" || modo === "validar" ? [{ rotulo: "Total a complementar (DARF/GPS)", valor: brl(complemento), destaque: modo === "complementar" }] : []),
      ...(modo === "agrupar" ? [{ rotulo: "Competências válidas após agrupar", valor: String(agrupadas), destaque: true }] : []),
    ],
    memoria: [
      "Após 13/11/2019, só conta a competência com contribuição sobre ao menos um salário mínimo (EC 103, art. 29).",
      "O segurado pode: I — complementar; II — usar o excedente de outra competência; III — agrupar contribuições inferiores (Decreto 3.048, art. 19-E).",
      ...(modo === "complementar" ? [`Complemento = (salário mínimo − salário de contribuição) × ${pct(aliquota)}, por competência, acrescido de juros e multa se pago fora do prazo.`] : []),
    ],
    tabela: { colunas: ["Competência", "Salário", "Mínimo", "Situação"], linhas: linhasTab },
  };
}

// ---------------------------------------------------------------------------
// Seção 2
// ---------------------------------------------------------------------------

function mediaCalc(criterio: "100" | "80", divisor?: "60" | "108"): Calculadora["calcular"] {
  return (v, ctx) => {
    const dib = txt(v, "data") || ctx.hoje;
    const m = calcularMedia({ salarios: salariosV(v), dib, indices: ctx.indices, criterio, aplicarDivisorMinimo: divisor === "60", primeiraFiliacao: txt(v, "filiacao") || "1990-01-01" });
    let media = m.media;
    let divisorUsado = m.divisor;
    const memoria = [`Salários corrigidos pelo INPC até ${fmtComp(somaComp(competencia(dib), -1))} e limitados ao teto de cada competência.`];
    if (divisor === "108" && m.usados < 108) {
      divisorUsado = 108;
      media = m.soma / 108;
      memoria.push(`Divisor mínimo de 108 (Lei 8.213, art. 135-A, incluído pela Lei 14.331/2022 — filiados até 07/1994, aposentadorias com DIB a partir de 05/05/2022, exceto por incapacidade): soma ÷ 108.`);
    }
    return {
      linhas: [
        { rotulo: "Média (salário de benefício)", valor: brl(media), destaque: true },
        { rotulo: "Soma corrigida", valor: brl(m.soma) },
        { rotulo: "Divisor", valor: String(divisorUsado) },
        { rotulo: "Salários considerados", valor: `${m.usados} de ${m.quantidade}` },
      ],
      memoria: [...memoria, ...m.avisos],
      tabela: tabelaMedia(m.itens),
    };
  };
}

const CAMPOS_MEDIA: Campo[] = [{ id: "data", rotulo: "DIB (início do benefício)", tipo: "data" }, { id: "filiacao", rotulo: "Primeira filiação", tipo: "data" }, CAMPO_SALARIOS];

export const SECAO_2: Calculadora[] = [
  { id: "media-100", secao: 2, nome: "Média de 100% dos salários desde 07/1994 (EC 103/2019)", fundamento: "EC 103/2019, art. 26", modo: "form", campos: CAMPOS_MEDIA, calcular: mediaCalc("100") },
  { id: "media-80", secao: 2, nome: "Média dos 80% maiores salários desde 07/1994 (Lei 9.876/1999)", fundamento: "Lei 8.213/91, art. 29, I e II (redação da Lei 9.876/99)", modo: "form", campos: CAMPOS_MEDIA, calcular: mediaCalc("80") },
  {
    id: "media-36",
    secao: 2,
    nome: "Média dos últimos 36 salários de contribuição (regra anterior a 1999)",
    fundamento: "Lei 8.213/91, art. 29 (redação original)",
    modo: "form",
    campos: [{ id: "data", rotulo: "DIB", tipo: "data" }, CAMPO_SALARIOS],
    calcular: (v, ctx) => {
      const dib = txt(v, "data") || ctx.hoje;
      const ultima = somaComp(competencia(dib), -1);
      const ag = agruparSalarios(salariosV(v));
      const janela = [...ag.keys()].filter((c) => c <= ultima && compN(c) > compN(ultima) - 48).sort().slice(-36);
      const itens = janela.map((c, i) => {
        // Os 24 primeiros são corrigidos; os 12 últimos, não (art. 202 da CF original).
        const corrige = i < janela.length - 12;
        const f = corrige ? fatorComposto(ctx.indices, "INPC", somaComp(c, 1), ultima) : 1;
        return { c, valor: Math.min(ag.get(c)!, teto(c)), f };
      });
      const soma = itens.reduce((s, x) => s + x.valor * x.f, 0);
      return {
        linhas: [{ rotulo: "Média dos últimos 36", valor: brl(itens.length ? soma / 36 : 0), destaque: true }, { rotulo: "Salários no período de 48 meses", valor: String(itens.length) }],
        memoria: ["Últimos 36 salários num período de até 48 meses; os 24 mais antigos corrigidos, os 12 últimos sem correção; divisor 36.", "Para períodos anteriores a 07/1994 informe os valores já convertidos em reais e os índices oficiais (ORTN/OTN/BTN/INPC/IRSM) — o sistema aplica o INPC disponível."],
        tabela: { colunas: ["Competência", "Valor", "Fator"], linhas: itens.map((x) => [fmtComp(x.c), brl(x.valor), dec(x.f, 6)]) },
      };
    },
  },
  {
    id: "media-12",
    secao: 2,
    nome: "Média dos últimos 12 salários (salário-maternidade / auxílio-doença)",
    fundamento: "Lei 8.213/91, arts. 29, §10, e 73, III",
    modo: "form",
    campos: [{ id: "data", rotulo: "DIB", tipo: "data" }, CAMPO_SALARIOS],
    calcular: (v, ctx) => {
      const m = mediaUltimos12(salariosV(v), txt(v, "data") || ctx.hoje, ctx.indices);
      return { linhas: [{ rotulo: "Média dos últimos 12", valor: brl(m), destaque: true }], memoria: ["Média aritmética simples dos 12 últimos salários de contribuição, corrigidos e limitados ao teto."] };
    },
  },
  { id: "divisor-60", secao: 2, nome: "Divisor mínimo de 60% do período básico de cálculo (Lei 9.876/1999)", fundamento: "Lei 9.876/99, art. 3º, §2º", modo: "form", campos: CAMPOS_MEDIA, calcular: mediaCalc("80", "60") },
  { id: "divisor-108", secao: 2, nome: "Divisor mínimo de 108 contribuições (Lei 14.331/2022)", fundamento: "Lei 8.213/91, art. 135-A", modo: "form", campos: CAMPOS_MEDIA, calcular: mediaCalc("100", "108") },
  ...(["fator", "fator-bonus5", "fator-bonus10"] as const).map((id): Calculadora => ({
    id,
    secao: 2,
    nome: { fator: "Fator previdenciário (idade, tempo e expectativa de sobrevida)", "fator-bonus5": "Fator previdenciário com bônus de 5 anos (mulheres e professores)", "fator-bonus10": "Fator previdenciário com bônus de 10 anos (professoras)" }[id],
    fundamento: "Lei 8.213/91, art. 29, §§7º a 9º",
    modo: "form",
    campos: [
      { ...SEXO, padrao: id === "fator" ? "M" : "F" },
      { id: "professor", rotulo: "Professor(a) com tempo exclusivo de magistério", tipo: "checkbox", padrao: id === "fator-bonus10" },
      { id: "nascimento", rotulo: "Nascimento", tipo: "data" },
      { id: "data", rotulo: "DER/DIB", tipo: "data" },
      { id: "anos", rotulo: "Tempo de contribuição — anos", tipo: "inteiro" },
      { id: "meses", rotulo: "meses", tipo: "inteiro" },
      { id: "dias", rotulo: "dias", tipo: "inteiro" },
      { id: "es", rotulo: "Expectativa de sobrevida (vazio = tábua IBGE)", tipo: "numero" },
    ],
    calcular: (v, ctx) => {
      const sexo = txt(v, "sexo", "M") as "M" | "F";
      const data = txt(v, "data") || ctx.hoje;
      const nasc = txt(v, "nascimento");
      if (!nasc) return { linhas: [], memoria: ["Informe a data de nascimento."] };
      const idade = (diaN(data) - diaN(nasc)) / DIAS_ANO;
      const tc = num(v, "anos") + num(v, "meses") / 12 + num(v, "dias") / DIAS_ANO;
      const bonus = bonusFator(sexo, bool(v, "professor"));
      const tab = expectativaSobrevida(data, idade);
      const es = num(v, "es") || tab.valor || 0;
      const f = es ? fatorPrevidenciario(tc + bonus, idade, es) : 0;
      return {
        linhas: [
          { rotulo: "Fator previdenciário", valor: dec(f, 4), destaque: true },
          { rotulo: "Idade", valor: dec(idade, 4) },
          { rotulo: "Tempo + bônus", valor: `${dec(tc, 4)} + ${bonus}` },
          { rotulo: "Expectativa de sobrevida", valor: `${dec(es, 1)} (tábua IBGE ${tab.tabua}${num(v, "es") ? ", informada manualmente" : ""})` },
          { rotulo: "Efeito sobre a média", valor: f >= 1 ? `+${pct(f - 1)}` : `−${pct(1 - f)}` },
        ],
        memoria: [`f = (Tc × 0,31 / Es) × [1 + (Id + Tc × 0,31) / 100] = (${dec(tc + bonus, 4)} × 0,31 / ${dec(es, 1)}) × [1 + (${dec(idade, 4)} + ${dec(tc + bonus, 4)} × 0,31) / 100] = ${dec(f, 4)}.`, ...(tab.aproximada ? ["Tábua mais recente disponível usada por aproximação."] : [])],
      };
    },
  })),
  {
    id: "coef-pos",
    secao: 2,
    nome: "Coeficiente pós-reforma (60% + 2% ao ano excedente a 20/15 anos)",
    fundamento: "EC 103/2019, art. 26, §2º",
    modo: "form",
    campos: [SEXO, { id: "anos", rotulo: "Anos completos de contribuição", tipo: "inteiro" }, { id: "media", rotulo: "Média", tipo: "moeda" }, { id: "especial15", rotulo: "Especial de 15 anos (limiar 15 para ambos)", tipo: "checkbox" }],
    calcular: (v) => {
      const limiar = bool(v, "especial15") ? 15 : txt(v, "sexo") === "F" ? 15 : 20;
      const c = coeficienteArt26(num(v, "anos"), limiar);
      return { linhas: [{ rotulo: "Coeficiente", valor: pct(c), destaque: true }, { rotulo: "Renda (média × coeficiente)", valor: brl(num(v, "media") * c) }], memoria: [`60% + 2% × (${num(v, "anos")} − ${limiar}) = ${pct(c)}.`] };
    },
  },
  {
    id: "coef-idade",
    secao: 2,
    nome: "Coeficiente da aposentadoria por idade antiga (70% + 1% por grupo de 12)",
    fundamento: "Lei 8.213/91, art. 50",
    modo: "form",
    campos: [{ id: "contrib", rotulo: "Número de contribuições", tipo: "inteiro" }, { id: "media", rotulo: "Salário de benefício", tipo: "moeda" }],
    calcular: (v) => {
      const g = Math.floor(num(v, "contrib") / 12);
      const c = Math.min(1, 0.7 + g * 0.01);
      return { linhas: [{ rotulo: "Coeficiente", valor: pct(c), destaque: true }, { rotulo: "Renda", valor: brl(num(v, "media") * c) }], memoria: [`70% + 1% × ${g} grupo(s) de 12 = ${pct(c)} (máximo 100%).`] };
    },
  },
  {
    id: "coef-proporcional",
    secao: 2,
    nome: "Coeficiente da aposentadoria proporcional (70% + 5% por ano excedente)",
    fundamento: "EC 20/1998, art. 9º, §1º, II",
    modo: "form",
    campos: [{ id: "excedente", rotulo: "Anos completos além do tempo + pedágio", tipo: "inteiro" }, { id: "media", rotulo: "Salário de benefício", tipo: "moeda" }],
    calcular: (v) => {
      const c = Math.min(1, 0.7 + 0.05 * num(v, "excedente"));
      return { linhas: [{ rotulo: "Coeficiente", valor: pct(c), destaque: true }, { rotulo: "Renda", valor: brl(num(v, "media") * c) }], memoria: [`70% + 5% × ${num(v, "excedente")} = ${pct(c)} (máximo 100%).`] };
    },
  },
  {
    id: "teto-piso",
    secao: 2,
    nome: "Limitação ao teto e adequação ao piso (salário mínimo)",
    fundamento: "Lei 8.213/91, arts. 29, §2º, 33 e 135",
    modo: "form",
    campos: [{ id: "valor", rotulo: "Valor calculado", tipo: "moeda" }, { id: "data", rotulo: "DIB", tipo: "data" }],
    calcular: (v, ctx) => {
      const c = competencia(txt(v, "data") || ctx.hoje);
      const val = num(v, "valor");
      const t = teto(c);
      const sm = salarioMinimo(c);
      const final = Math.min(t, Math.max(sm, val));
      return { linhas: [{ rotulo: "Teto na data", valor: brl(t) }, { rotulo: "Salário mínimo", valor: brl(sm) }, { rotulo: "Valor final", valor: brl(final), destaque: true }, { rotulo: "Excedente glosado pelo teto", valor: brl(Math.max(0, val - t)) }], memoria: ["O excedente glosado pelo teto pode ser recuperado nas revisões do teto (EC 20/98 e 41/03), conforme o caso."] };
    },
  },
  {
    id: "concomitantes-soma",
    secao: 2,
    nome: "Soma de salários em atividades concomitantes (Lei 13.846/2019 / Tema 1.070)",
    fundamento: "Lei 8.213/91, art. 32 (redação da Lei 13.846/2019); Tema 1.070/STJ",
    modo: "form",
    campos: [{ id: "data", rotulo: "DIB", tipo: "data" }, { ...CAMPO_SALARIOS, rotulo: "Salários de TODOS os vínculos (repita a competência para cada vínculo)" }],
    calcular: (v, ctx) => {
      const r = mediaCalc("100")!(v, ctx);
      r.memoria.unshift("Competências repetidas foram somadas e limitadas ao teto (soma integral das atividades concomitantes).");
      return r;
    },
  },
  {
    id: "concomitantes-principal",
    secao: 2,
    nome: "Atividades concomitantes: principal + percentual da secundária (regra antiga)",
    fundamento: "Lei 8.213/91, art. 32, II (redação original)",
    modo: "form",
    campos: [{ id: "sbPrincipal", rotulo: "SB da atividade principal", tipo: "moeda" }, { id: "sbSecundaria", rotulo: "SB da atividade secundária", tipo: "moeda" }, { id: "mesesSec", rotulo: "Meses de contribuição na secundária", tipo: "inteiro" }, { id: "mesesExigidos", rotulo: "Meses exigidos para o benefício (ex.: 420)", tipo: "inteiro", padrao: 420 }],
    calcular: (v) => {
      const perc = Math.min(1, num(v, "mesesSec") / (num(v, "mesesExigidos") || 1));
      const sb = num(v, "sbPrincipal") + num(v, "sbSecundaria") * perc;
      return { linhas: [{ rotulo: "Percentual da secundária", valor: pct(perc) }, { rotulo: "Salário de benefício", valor: brl(sb), destaque: true }], memoria: ["SB = SB principal + SB secundária × (meses na secundária ÷ meses exigidos). Para DIB a partir de 18/06/2019 (ou 04/2003, Tema 1.070) aplica-se a soma integral."] };
    },
  },
  {
    id: "descarte",
    secao: 2,
    nome: "Descarte de contribuições menores (art. 26, §6º da EC 103)",
    fundamento: "EC 103/2019, art. 26, §6º",
    modo: "form",
    campos: [SEXO, { id: "data", rotulo: "DIB", tipo: "data" }, { id: "minimo", rotulo: "Tempo mínimo exigido pela regra (anos)", tipo: "inteiro", padrao: 15 }, { id: "anos", rotulo: "Tempo de contribuição total (anos)", tipo: "numero" }, { id: "tipoCoef", rotulo: "Cálculo da renda", tipo: "select", opcoes: [{ valor: "art26", rotulo: "60% + 2% (art. 26)" }, { valor: "100", rotulo: "100% da média" }], padrao: "art26" }, CAMPO_SALARIOS],
    calcular: (v, ctx) => otimizarDescarte(v, ctx, false),
  },
  {
    id: "descarte-otimizado",
    secao: 2,
    nome: "Otimização matemática do descarte de salários (maior RMI)",
    fundamento: "EC 103/2019, art. 26, §6º",
    modo: "form",
    campos: [SEXO, { id: "data", rotulo: "DIB", tipo: "data" }, { id: "minimo", rotulo: "Tempo mínimo exigido pela regra (anos)", tipo: "inteiro", padrao: 15 }, { id: "anos", rotulo: "Tempo de contribuição total (anos)", tipo: "numero" }, { id: "tipoCoef", rotulo: "Cálculo da renda", tipo: "select", opcoes: [{ valor: "art26", rotulo: "60% + 2% (art. 26)" }, { valor: "100", rotulo: "100% da média" }], padrao: "art26" }, CAMPO_SALARIOS],
    calcular: (v, ctx) => otimizarDescarte(v, ctx, true),
  },
];

function otimizarDescarte(v: Valores, ctx: { indices: import("../indices").Indices; hoje: string }, completo: boolean): Saida {
  const dib = txt(v, "data") || ctx.hoje;
  const m = calcularMedia({ salarios: salariosV(v), dib, indices: ctx.indices, criterio: "100" });
  const validos = m.itens.filter((i) => i.usado).sort((a, b) => a.corrigido - b.corrigido);
  const anosTotal = num(v, "anos") || validos.length / 12;
  const minimo = num(v, "minimo", 15);
  const limiar = txt(v, "sexo") === "F" ? 15 : 20;
  const usaArt26 = txt(v, "tipoCoef", "art26") === "art26";
  const maxDescarte = Math.max(0, Math.floor((anosTotal - minimo) * 12));
  let melhor = { k: 0, rmi: 0, media: 0, coef: 0 };
  const linhas: string[][] = [];
  let soma = validos.reduce((s, i) => s + i.corrigido, 0);
  for (let k = 0; k <= Math.min(maxDescarte, validos.length - 1); k++) {
    if (k > 0) soma -= validos[k - 1].corrigido;
    const n = validos.length - k;
    const media = soma / n;
    const anos = anosTotal - k / 12;
    const coef = usaArt26 ? coeficienteArt26(anos, limiar) : 1;
    const rmi = media * coef;
    if (rmi > melhor.rmi + 0.005) melhor = { k, rmi, media, coef };
    if (completo && (k % 12 === 0 || k === maxDescarte)) linhas.push([String(k), brl(media), pct(coef), brl(rmi)]);
  }
  return {
    linhas: [
      { rotulo: "Descartar", valor: `${melhor.k} menor(es) salário(s)`, destaque: true },
      { rotulo: "Média sem descarte", valor: brl(m.media) },
      { rotulo: "Média com descarte", valor: brl(melhor.media) },
      { rotulo: "Coeficiente resultante", valor: pct(melhor.coef) },
      { rotulo: "RMI otimizada", valor: brl(arred(melhor.rmi)), destaque: true },
      { rotulo: "Ganho mensal", valor: brl(melhor.rmi - m.media * (usaArt26 ? coeficienteArt26(anosTotal, limiar) : 1)) },
    ],
    memoria: [
      "Podem ser excluídas da média as contribuições que resultem em redução do valor, mantido o tempo mínimo exigido; o período excluído não conta para nenhum outro fim (art. 26, §6º).",
      "Cada salário descartado reduz o tempo em 1 mês, o que pode diminuir o coeficiente — a otimização testa todas as quantidades possíveis.",
    ],
    tabela: completo ? { titulo: "Simulação por quantidade descartada", colunas: ["Descartados", "Média", "Coeficiente", "RMI"], linhas } : undefined,
  };
}

export { deCompN };
