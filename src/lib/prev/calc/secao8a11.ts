// Seções 8 (contribuições e planejamento financeiro), 9 (revisões),
// 10 (judiciais) e 11 (internacional e previdência privada).

import { compN, competencia, deCompN, diaN, fmtComp, fmtData, somaComp, somaDias } from "../datas";
import { fatorComposto, somaTaxas, taxa } from "../indices";
import { calcularMedia, evoluirRenda, reajusteAnual } from "../media";
import { coeficienteArt26 } from "../rgps";
import { arred, salarioMinimo, teto } from "../tabelas";
import { brl, bool, dec, lerSalarios, num, pct, txt, type Calculadora, type Campo, type Saida, type Valores } from "./tipos";

type Ctx = { indices: import("../indices").Indices; hoje: string };
const SAL: Campo = { id: "salarios", rotulo: "Salários de contribuição (MM/AAAA valor)", tipo: "salarios", largura: "inteira" };

function ia(id: string, secao: number, nome: string, fundamento: string, descricao?: string): Calculadora {
  return { id, secao, nome, fundamento, descricao, modo: "ia" };
}
function motor(id: string, secao: number, nome: string, fundamento: string, aba: Calculadora["aba"]): Calculadora {
  return { id, secao, nome, fundamento, modo: "motor", aba };
}

// ---- Contribuições em atraso ----

function selicAcumulada(ctx: Ctx, de: string, ate: string) {
  return somaTaxas(ctx.indices, "SELIC", de, ate);
}

function contribuicaoAtraso(v: Valores, ctx: Ctx, aliquotaPadrao: number, titulo: string): Saida {
  const pagamento = txt(v, "pagamento") || ctx.hoje;
  const aliquota = num(v, "aliquota", aliquotaPadrao * 100) / 100;
  const lista = lerSalarios(txt(v, "salarios"));
  const linhas: string[][] = [];
  let total = 0;
  for (const s of lista) {
    const principal = s.valor * aliquota;
    const vencimento = `${somaComp(s.comp, 1)}-15`;
    const dias = Math.max(0, diaN(pagamento) - diaN(vencimento));
    const multa = Math.min(0.2, dias * 0.0033);
    // Juros: Selic acumulada do mês seguinte ao vencimento até o anterior ao pagamento + 1% no mês do pagamento.
    const jurosPct = dias > 0 ? selicAcumulada(ctx, somaComp(competencia(vencimento), 1), somaComp(competencia(pagamento), -1)) + 1 : 0;
    const juros = (principal * jurosPct) / 100;
    const t = principal + principal * multa + juros;
    total += t;
    linhas.push([fmtComp(s.comp), brl(s.valor), brl(principal), pct(multa), `${dec(jurosPct)}%`, brl(t)]);
  }
  return {
    linhas: [{ rotulo: titulo, valor: brl(total), destaque: true }, { rotulo: "Competências", valor: String(lista.length) }],
    memoria: ["Vencimento no dia 15 do mês seguinte; multa de 0,33% por dia, limitada a 20%; juros pela Selic acumulada + 1% no mês do pagamento (Lei 8.212/91, art. 35; Lei 9.430/96, art. 61)."],
    tabela: { colunas: ["Competência", "Base", "Contribuição", "Multa", "Juros", "Total"], linhas },
  };
}

function indenizacao(v: Valores, ctx: Ctx, semJuros: boolean): Saida {
  const data = txt(v, "data") || ctx.hoje;
  let base = num(v, "base");
  const memoria: string[] = [];
  if (!base) {
    const m = calcularMedia({ salarios: lerSalarios(txt(v, "salarios")), dib: data, indices: ctx.indices, criterio: "80" });
    base = m.media;
    memoria.push(`Base: média dos 80% maiores salários desde 07/1994 corrigidos (${brl(m.media)}), limitada ao teto (Lei 8.212, art. 45-A, §1º, I).`);
  }
  base = Math.max(base, salarioMinimo(competencia(data)));
  const meses = num(v, "meses");
  const principal = base * 0.2 * meses;
  const jurosPct = semJuros ? 0 : Math.min(50, num(v, "mesesAtraso", meses) * 0.5);
  const juros = (principal * jurosPct) / 100;
  const multa = semJuros ? 0 : principal * 0.1;
  memoria.push(semJuros ? "Período anterior a 10/1996 (MP 1.523/96): sem juros e multa (Súmula 47/TNU; jurisprudência do STJ)." : "Juros de 0,5% ao mês, limitados a 50%, e multa de 10% (art. 45-A, §2º).");
  return {
    linhas: [{ rotulo: "Base mensal (20%)", valor: brl(base * 0.2) }, { rotulo: "Principal", valor: brl(principal) }, { rotulo: "Juros", valor: brl(juros) }, { rotulo: "Multa", valor: brl(multa) }, { rotulo: "Total da indenização", valor: brl(principal + juros + multa), destaque: true }],
    memoria,
  };
}

function complementacao(de: number, para: number): Calculator {
  return (v, ctx) => {
    const r = contribuicaoAtraso({ ...v, aliquota: String((para - de) * 100) }, ctx, para - de, "Total da complementação");
    r.memoria.unshift(`Complemento = salário de contribuição × ${pct(para - de, 0)} (diferença entre ${pct(para, 0)} e ${pct(de, 0)}), com juros Selic e multa se fora do prazo (Lei 8.212, art. 21, §3º).`);
    return r;
  };
}
type Calculator = NonNullable<Calculadora["calcular"]>;

// ---- Análises financeiras ----

function fluxoAposentadoria(v: Valores) {
  const custoMensal = num(v, "custo");
  const mesesContrib = num(v, "mesesContrib");
  const beneficio = num(v, "beneficio");
  const anosRecebendo = num(v, "expectativa", 25);
  const taxaAnual = num(v, "taxa", 6) / 100;
  const i = Math.pow(1 + taxaAnual, 1 / 12) - 1;
  const fluxo: number[] = [];
  for (let m = 0; m < mesesContrib; m++) fluxo.push(-custoMensal);
  for (let m = 0; m < anosRecebendo * 12; m++) fluxo.push(beneficio * (13 / 12));
  return { custoMensal, mesesContrib, beneficio, anosRecebendo, i, fluxo, custoTotal: custoMensal * mesesContrib };
}

function vpl(fluxo: number[], i: number) {
  return fluxo.reduce((s, f, t) => s + f / Math.pow(1 + i, t), 0);
}

function tir(fluxo: number[]) {
  let lo = -0.99, hi = 1;
  if (vpl(fluxo, lo) * vpl(fluxo, hi) > 0) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (vpl(fluxo, lo) * vpl(fluxo, mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

const CAMPOS_FIN: Campo[] = [
  { id: "custo", rotulo: "Contribuição mensal (custo)", tipo: "moeda" },
  { id: "mesesContrib", rotulo: "Meses de contribuição a pagar", tipo: "inteiro" },
  { id: "beneficio", rotulo: "Benefício mensal esperado", tipo: "moeda" },
  { id: "expectativa", rotulo: "Anos de recebimento (expectativa de sobrevida)", tipo: "numero", padrao: 25 },
  { id: "taxa", rotulo: "Taxa de desconto anual (%)", tipo: "percentual", padrao: 6 },
];

function analiseFinanceira(foco: "payback" | "roi" | "vpl" | "tir"): Calculator {
  return (v) => {
    const f = fluxoAposentadoria(v);
    const recebidoTotal = f.beneficio * (13 / 12) * f.anosRecebendo * 12;
    const payback = f.beneficio ? Math.ceil(f.custoTotal / (f.beneficio * (13 / 12))) : 0;
    const roi = f.custoTotal ? (recebidoTotal - f.custoTotal) / f.custoTotal : 0;
    const v1 = vpl(f.fluxo, f.i);
    const t = tir(f.fluxo);
    const tirAnual = t !== null ? Math.pow(1 + t, 12) - 1 : null;
    const destaque = { payback: 0, roi: 1, vpl: 2, tir: 3 }[foco];
    const linhas = [
      { rotulo: "Payback (meses de benefício para recuperar o custo)", valor: `${payback} meses (${dec(payback / 12, 1)} anos)` },
      { rotulo: "ROI", valor: pct(roi) },
      { rotulo: "VPL", valor: brl(v1) },
      { rotulo: "TIR (ao ano)", valor: tirAnual !== null ? pct(tirAnual) : "indefinida" },
    ].map((l, k) => ({ ...l, destaque: k === destaque }));
    return {
      linhas: [{ rotulo: "Custo total das contribuições", valor: brl(f.custoTotal) }, { rotulo: "Total a receber", valor: brl(recebidoTotal) }, ...linhas],
      memoria: ["Fluxo mensal: contribuições negativas até a aposentadoria e benefícios (com 13º) durante a expectativa de sobrevida; valores em moeda constante.", "VPL descontado pela taxa informada; TIR obtida por bissecção."],
    };
  };
}

// ---- IR (tabela mensal 2026 com a redução da Lei 15.270/2025) ----

const TABELA_IR: { ate: number; aliquota: number; deducao: number }[] = [
  { ate: 2428.8, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
  { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
  { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
  { ate: Infinity, aliquota: 0.275, deducao: 908.73 },
];

export function irMensal(base: number, aplicarReducao2026 = true): number {
  const faixa = TABELA_IR.find((f) => base <= f.ate)!;
  let ir = Math.max(0, base * faixa.aliquota - faixa.deducao);
  if (aplicarReducao2026) {
    if (base <= 5000) ir = 0;
    else if (base <= 7350) ir = Math.max(0, ir - (978.62 - 0.133145 * base));
  }
  return arred(ir);
}

// ---------------------------------------------------------------------------

export const SECAO_8: Calculadora[] = [
  { id: "contrib-atraso", secao: 8, nome: "Contribuição em atraso (até 5 anos — Selic e multa)", fundamento: "Lei 8.212/91, art. 35; Lei 9.430/96, art. 61", modo: "form", campos: [{ id: "pagamento", rotulo: "Data do pagamento", tipo: "data" }, { id: "aliquota", rotulo: "Alíquota (%)", tipo: "percentual", padrao: 20 }, SAL], calcular: (v, c) => contribuicaoAtraso(v, c, 0.2, "Total a recolher") },
  { id: "indenizacao-decadente", secao: 8, nome: "Indenização de período superior a 5 anos (art. 45-A)", fundamento: "Lei 8.212/91, art. 45-A", modo: "form", campos: [{ id: "data", rotulo: "Data do cálculo", tipo: "data" }, { id: "meses", rotulo: "Meses a indenizar", tipo: "inteiro" }, { id: "mesesAtraso", rotulo: "Meses de atraso para juros", tipo: "inteiro" }, { id: "base", rotulo: "Base (vazio = média dos 80% maiores)", tipo: "moeda" }, SAL], calcular: (v, c) => indenizacao(v, c, false) },
  { id: "indenizacao-pre1996", secao: 8, nome: "Indenização de período anterior a 10/1996 (sem juros e multa)", fundamento: "MP 1.523/96; Lei 8.212/91, art. 45-A", modo: "form", campos: [{ id: "data", rotulo: "Data do cálculo", tipo: "data" }, { id: "meses", rotulo: "Meses a indenizar", tipo: "inteiro" }, { id: "base", rotulo: "Base (vazio = média dos 80% maiores)", tipo: "moeda" }, SAL], calcular: (v, c) => indenizacao(v, c, true) },
  { id: "complemento-11-20", secao: 8, nome: "Complementação de 11% (plano simplificado) para 20%", fundamento: "Lei 8.212/91, art. 21, §3º", modo: "form", campos: [{ id: "pagamento", rotulo: "Data do pagamento", tipo: "data" }, SAL], calcular: complementacao(0.11, 0.2) },
  { id: "complemento-5-20", secao: 8, nome: "Complementação de 5% (MEI / baixa renda) para 20%", fundamento: "Lei 8.212/91, art. 21, §§2º, II, e 3º", modo: "form", campos: [{ id: "pagamento", rotulo: "Data do pagamento", tipo: "data" }, SAL], calcular: complementacao(0.05, 0.2) },
  { id: "complemento-5-11", secao: 8, nome: "Complementação de 5% (MEI) para 11%", fundamento: "Lei 8.212/91, art. 21, §3º", modo: "form", campos: [{ id: "pagamento", rotulo: "Data do pagamento", tipo: "data" }, SAL], calcular: complementacao(0.05, 0.11) },
  {
    id: "contrib-reclamatoria",
    secao: 8,
    nome: "Contribuição previdenciária sobre reclamatória trabalhista",
    fundamento: "Lei 8.212/91, arts. 20, 22 e 43; Súmula 368/TST",
    modo: "form",
    campos: [{ id: "verbas", rotulo: "Verbas salariais (base de incidência) — total", tipo: "moeda" }, { id: "meses", rotulo: "Meses de competência", tipo: "inteiro", padrao: 1 }, { id: "rat", rotulo: "RAT ajustado (%)", tipo: "percentual", padrao: 2 }, { id: "terceiros", rotulo: "Terceiros (%)", tipo: "percentual", padrao: 5.8 }],
    calcular: (v) => {
      const meses = Math.max(1, num(v, "meses", 1));
      const mensal = num(v, "verbas") / meses;
      const faixas = [[1621, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]] as const;
      let ant = 0, emp = 0;
      for (const [ate, al] of faixas) { if (mensal <= ant) break; emp += (Math.min(mensal, ate) - ant) * al; ant = ate; }
      const empregado = emp * meses;
      const empresa = num(v, "verbas") * (0.2 + num(v, "rat", 2) / 100 + num(v, "terceiros", 5.8) / 100);
      return { linhas: [{ rotulo: "Cota do empregado", valor: brl(empregado) }, { rotulo: "Cota patronal + RAT + terceiros", valor: brl(empresa) }, { rotulo: "Total", valor: brl(empregado + empresa), destaque: true }], memoria: ["Cota do empregado pela tabela progressiva mês a mês (regime de competência — Súmula 368/TST); patronal de 20% + RAT + terceiros. Valores de 2026."] };
    },
  },
  {
    id: "retencao-11",
    secao: 8,
    nome: "Retenção de 11% sobre cessão de mão de obra",
    fundamento: "Lei 8.212/91, art. 31",
    modo: "form",
    campos: [{ id: "nota", rotulo: "Valor bruto da nota fiscal", tipo: "moeda" }, { id: "deducoes", rotulo: "Materiais/equipamentos discriminados", tipo: "moeda" }, { id: "aliquota", rotulo: "Alíquota (%)", tipo: "percentual", padrao: 11 }],
    calcular: (v) => {
      const base = Math.max(0, num(v, "nota") - num(v, "deducoes"));
      return { linhas: [{ rotulo: "Base de cálculo", valor: brl(base) }, { rotulo: "Retenção", valor: brl(base * num(v, "aliquota", 11) / 100), destaque: true }], memoria: ["11% sobre o valor bruto da nota, deduzidos materiais e equipamentos discriminados (IN RFB 2.110/2022). Desoneradas: 3,5%."] };
    },
  },
  {
    id: "restituicao-teto",
    secao: 8,
    nome: "Restituição de contribuições acima do teto (PER/DCOMP)",
    fundamento: "Lei 8.212/91, art. 28, §5º; CTN, arts. 165 e 168",
    modo: "form",
    campos: [{ id: "pagas", rotulo: "Contribuições pagas no mês (soma dos vínculos) — uma linha por mês: MM/AAAA valor", tipo: "salarios", largura: "inteira" }],
    calcular: (v, c) => {
      const lista = lerSalarios(txt(v, "pagas"));
      let total = 0;
      const linhas = lista.map((s) => {
        // Contribuição máxima do empregado: aplicação da tabela sobre o teto.
        const faixas = [[salarioMinimo(s.comp), 0.075], [2902.84, 0.09], [4354.27, 0.12], [teto(s.comp), 0.14]] as const;
        let ant = 0, max = 0;
        for (const [ate, al] of faixas) { max += (Math.min(teto(s.comp), ate) - ant) * al; ant = ate; }
        const excesso = Math.max(0, s.valor - max);
        const corrigido = excesso * (1 + selicAcumulada(c, somaComp(s.comp, 1), somaComp(competencia(c.hoje), -1)) / 100 + 0.01);
        total += corrigido;
        return [fmtComp(s.comp), brl(s.valor), brl(max), brl(excesso), brl(corrigido)];
      });
      return { linhas: [{ rotulo: "Total a restituir (Selic)", valor: brl(total), destaque: true }], memoria: ["Contribuição do empregado com vários vínculos é limitada à incidência sobre o teto; o excesso é restituível em até 5 anos, corrigido pela Selic (Lei 9.250/95, art. 39, §4º). Contribuição máxima estimada com as faixas de 2026 proporcionais ao teto de cada competência — confira a tabela oficial do mês."], tabela: { colunas: ["Competência", "Pago", "Máximo devido", "Excesso", "Com Selic"], linhas } };
    },
  },
  motor("projecao-minimo", 8, "Projeção de contribuições futuras — cenário salário mínimo", "Planejamento previdenciário", "planejamento"),
  motor("projecao-teto", 8, "Projeção de contribuições futuras — cenário teto", "Planejamento previdenciário", "planejamento"),
  motor("projecao-otimizada", 8, "Projeção de contribuições futuras — cenário otimizado", "Planejamento previdenciário", "planejamento"),
  { id: "payback", secao: 8, nome: "Payback previdenciário (tempo de recuperação do investimento)", modo: "form", campos: CAMPOS_FIN, calcular: analiseFinanceira("payback") },
  { id: "roi", secao: 8, nome: "ROI previdenciário (retorno sobre as contribuições)", modo: "form", campos: CAMPOS_FIN, calcular: analiseFinanceira("roi") },
  { id: "vpl", secao: 8, nome: "VPL (valor presente líquido) da aposentadoria", modo: "form", campos: CAMPOS_FIN, calcular: analiseFinanceira("vpl") },
  { id: "tir", secao: 8, nome: "TIR (taxa interna de retorno) previdenciária", modo: "form", campos: CAMPOS_FIN, calcular: analiseFinanceira("tir") },
  motor("comparativo-regras", 8, "Comparativo financeiro entre regras de transição (melhor benefício)", "EC 103/2019; Tema 334/STF (direito ao melhor benefício)", "planejamento"),
  {
    id: "imediata-postergada",
    secao: 8,
    nome: "Aposentadoria imediata × postergada",
    modo: "form",
    campos: [{ id: "agora", rotulo: "Renda se aposentar agora", tipo: "moeda" }, { id: "depois", rotulo: "Renda se esperar", tipo: "moeda" }, { id: "meses", rotulo: "Meses de espera", tipo: "inteiro" }, { id: "custo", rotulo: "Contribuição mensal durante a espera", tipo: "moeda" }],
    calcular: (v) => {
      const agora = num(v, "agora"), depois = num(v, "depois"), meses = num(v, "meses");
      const perdido = agora * meses * (13 / 12) + num(v, "custo") * meses;
      const ganho = (depois - agora) * (13 / 12);
      const equilibrio = ganho > 0 ? Math.ceil(perdido / ganho) : null;
      return {
        linhas: [{ rotulo: "Valor deixado de receber + custo", valor: brl(perdido) }, { rotulo: "Ganho mensal ao esperar", valor: brl(depois - agora) }, { rotulo: "Ponto de equilíbrio", valor: equilibrio ? `${equilibrio} meses após aposentar (${dec(equilibrio / 12, 1)} anos)` : "esperar não compensa", destaque: true }],
        memoria: ["Compara o que se deixa de receber durante a espera com o ganho mensal posterior (com 13º), em moeda constante."],
      };
    },
  },
  ia("desaposentacao", 8, "Impacto financeiro da desaposentação / reaposentação (análise histórica)", "STF, Tema 503 (RE 661.256) e Tema 1.065: inviáveis no RGPS"),
];

export const SECAO_9: Calculadora[] = [
  ia("revisao-vida-toda", 9, "Revisão da Vida Toda (análise de impacto)", "STF, ADIs 2.110 e 2.111 (2024): regra de transição do art. 3º da Lei 9.876/99 é obrigatória — tese superada", "Simula o impacto de incluir salários anteriores a 07/1994, apenas para fins históricos/negociais."),
  {
    id: "revisao-teto",
    secao: 9,
    nome: "Revisão do teto (EC 20/1998 e EC 41/2003)",
    fundamento: "STF, RE 564.354 (Tema 76) e RE 937.595 (Tema 930)",
    modo: "form",
    campos: [{ id: "dib", rotulo: "DIB", tipo: "data" }, { id: "sb", rotulo: "Salário de benefício sem limitação ao teto", tipo: "moeda" }, { id: "coef", rotulo: "Coeficiente (%)", tipo: "percentual", padrao: 100 }, { id: "rendaAtual", rotulo: "Renda paga hoje", tipo: "moeda" }],
    calcular: (v, c) => {
      const dib = txt(v, "dib");
      if (!dib) return { linhas: [], memoria: ["Informe a DIB."] };
      const tetoDib = teto(competencia(dib < "1994-07-01" ? "1994-07-01" : dib));
      const indice = num(v, "sb") / tetoDib;
      const coef = num(v, "coef", 100) / 100;
      const hoje = competencia(c.hoje);
      const revista = Math.min(teto(hoje), num(v, "rendaAtual") * Math.max(1, indice));
      return {
        linhas: [{ rotulo: "Índice teto (SB ÷ teto na DIB)", valor: dec(indice, 4) }, { rotulo: "Renda revista", valor: brl(revista * (coef < 1 ? 1 : 1)), destaque: true }, { rotulo: "Diferença mensal", valor: brl(revista - num(v, "rendaAtual")), destaque: true }],
        memoria: ["Benefícios limitados ao teto na concessão podem ser readequados aos novos tetos das EC 20/98 (R$ 1.200,00) e EC 41/03 (R$ 2.400,00).", "Método simplificado do índice teto: renda atual × (SB sem limite ÷ teto da DIB), limitada ao teto atual. Para benefícios anteriores a 1991 (buraco negro), use a análise assistida por IA.", indice <= 1 ? "Índice ≤ 1: o benefício não foi limitado ao teto — sem direito à revisão." : "Índice > 1: há excedente a recuperar."],
      };
    },
  },
  ia("revisao-buraco-negro", 9, "Revisão do buraco negro (DIB de 05/10/1988 a 04/04/1991)", "Lei 8.213/91, art. 144; STF, Tema 930"),
  ia("revisao-buraco-verde", 9, "Revisão do buraco verde (DIB de 05/04/1991 a 31/12/1993)", "Lei 8.870/94, art. 26"),
  ia("revisao-irsm", 9, "Revisão do IRSM de fevereiro/1994 (39,67%)", "Lei 10.999/2004; MP 201/2004"),
  {
    id: "revisao-29ii",
    secao: 9,
    nome: "Revisão do art. 29, II (descarte dos 20% menores — auxílio-doença/invalidez)",
    fundamento: "Lei 8.213/91, art. 29, II; Decreto 3.048/99 (redação anterior); ACP 0002320-59.2012.4.03.6183",
    modo: "form",
    campos: [{ id: "dib", rotulo: "DIB", tipo: "data" }, { id: "rmiPaga", rotulo: "RMI concedida", tipo: "moeda" }, { id: "coef", rotulo: "Coeficiente do benefício (%)", tipo: "percentual", padrao: 91 }, SAL],
    calcular: (v, c) => {
      const dib = txt(v, "dib") || c.hoje;
      const m = calcularMedia({ salarios: lerSalarios(txt(v, "salarios")), dib, indices: c.indices, criterio: "80" });
      const devida = Math.max(salarioMinimo(competencia(dib)), Math.min(teto(competencia(dib)), (m.media * num(v, "coef", 91)) / 100));
      return {
        linhas: [{ rotulo: "Média dos 80% maiores", valor: brl(m.media) }, { rotulo: "RMI devida", valor: brl(devida), destaque: true }, { rotulo: "RMI concedida", valor: brl(num(v, "rmiPaga")) }, { rotulo: "Diferença na DIB", valor: brl(devida - num(v, "rmiPaga")), destaque: true }],
        memoria: ["Benefícios por incapacidade (DIB de 29/11/1999 a 2009) calculados com todos os salários, sem descartar os 20% menores. Use a aba Atrasados do cálculo completo para as diferenças.", "Atenção à decadência (10 anos) e aos acordos da ACP."],
      };
    },
  },
  ia("revisao-ortn", 9, "Revisão da ORTN/OTN (24 salários anteriores aos 12 últimos)", "Lei 6.423/77; Súmula 7/TRF3"),
  ia("revisao-urv", 9, "Revisão da URV (conversão de cruzeiro real para real em 1994)", "Lei 8.880/94, art. 20"),
  {
    id: "revisao-indice-teto",
    secao: 9,
    nome: "Revisão do índice teto / subteto",
    fundamento: "Lei 8.880/94, art. 21, §3º; Lei 8.870/94, art. 26",
    modo: "form",
    campos: [{ id: "sb", rotulo: "Salário de benefício sem limite", tipo: "moeda" }, { id: "tetoDib", rotulo: "Teto na DIB", tipo: "moeda" }, { id: "renda", rotulo: "Renda limitada no primeiro reajuste", tipo: "moeda" }],
    calcular: (v) => {
      const idx = num(v, "sb") / (num(v, "tetoDib") || 1);
      return { linhas: [{ rotulo: "Índice de reposição", valor: dec(idx, 4), destaque: true }, { rotulo: "Renda após incorporação (sem limitar)", valor: brl(num(v, "renda") * idx) }], memoria: ["A diferença entre a média e o teto é incorporada no primeiro reajuste, limitada ao teto vigente."] };
    },
  },
  {
    id: "revisao-primeiro-reajuste",
    secao: 9,
    nome: "Revisão do primeiro reajuste (proporcionalidade no primeiro ano)",
    fundamento: "Lei 8.213/91, art. 41-A",
    modo: "form",
    campos: [{ id: "dib", rotulo: "DIB", tipo: "data" }, { id: "rmi", rotulo: "RMI", tipo: "moeda" }, { id: "pago", rotulo: "Renda paga após o 1º reajuste", tipo: "moeda" }],
    calcular: (v, c) => {
      const dib = txt(v, "dib");
      if (!dib) return { linhas: [], memoria: ["Informe a DIB."] };
      const ano = Number(dib.slice(0, 4)) + 1;
      const r = reajusteAnual(c.indices, ano, dib);
      const devida = num(v, "rmi") * (1 + r);
      return { linhas: [{ rotulo: `Reajuste proporcional em 01/${ano}`, valor: pct(r) }, { rotulo: "Renda devida", valor: brl(devida), destaque: true }, { rotulo: "Diferença mensal", valor: brl(devida - num(v, "pago")) }], memoria: ["Primeiro reajuste proporcional: INPC acumulado do mês de início até dezembro (art. 41-A)."] };
    },
  },
  ia("revisao-equivalencia", 9, "Revisão da equivalência salarial (art. 58 do ADCT)", "ADCT, art. 58 — benefícios anteriores a 05/10/1988, até 12/1991"),
  motor("revisao-especial", 9, "Inclusão de tempo especial (PPP/LTCAT)", "Lei 8.213/91, art. 57", "revisao"),
  motor("revisao-rural", 9, "Inclusão de tempo rural", "Lei 8.213/91, art. 55, §2º", "revisao"),
  motor("revisao-militar", 9, "Inclusão de tempo militar / aluno-aprendiz", "Lei 8.213/91, art. 55, I", "revisao"),
  motor("revisao-reclamatoria", 9, "Inclusão de verbas de reclamatória trabalhista", "Tema 1.188/STJ", "revisao"),
  motor("revisao-concomitantes", 9, "Soma integral de atividades concomitantes (Tema 1.070/STJ)", "Tema 1.070/STJ", "revisao"),
  motor("revisao-cnis", 9, "Erro material no CNIS (salários zerados ou subestimados)", "Lei 8.213/91, art. 29-A", "revisao"),
  motor("revisao-divisor", 9, "Erro na aplicação do divisor mínimo", "Lei 9.876/99, art. 3º, §2º", "revisao"),
  motor("revisao-fator", 9, "Erro no fator previdenciário (expectativa IBGE)", "Lei 8.213/91, art. 29, §8º", "revisao"),
  motor("revisao-dib", 9, "Erro na DIB — melhor benefício", "STF, Tema 334", "revisao"),
  {
    id: "revisao-25",
    secao: 9,
    nome: "Acréscimo de 25% na incapacidade permanente (grande invalidez)",
    fundamento: "Lei 8.213/91, art. 45; Tema 982/STF (restrito à aposentadoria por incapacidade)",
    modo: "form",
    campos: [{ id: "renda", rotulo: "Renda atual", tipo: "moeda" }],
    calcular: (v) => ({ linhas: [{ rotulo: "Acréscimo mensal", valor: brl(num(v, "renda") * 0.25), destaque: true }, { rotulo: "Renda total", valor: brl(num(v, "renda") * 1.25) }], memoria: ["Devido ao aposentado por incapacidade que necessita de assistência permanente de outra pessoa; pode superar o teto. O STF (Tema 1.095) afastou a extensão a outras aposentadorias."] }),
  },
  {
    id: "revisao-transformacao",
    secao: 9,
    nome: "Transformação de auxílio-doença em aposentadoria por incapacidade",
    fundamento: "Lei 8.213/91, art. 43; Súmula 557/STJ",
    modo: "form",
    campos: [{ id: "media", rotulo: "Média (salário de benefício)", tipo: "moeda" }, { id: "anos", rotulo: "Anos de contribuição", tipo: "numero" }, { id: "sexo", rotulo: "Sexo", tipo: "select", opcoes: [{ valor: "M", rotulo: "Masculino" }, { valor: "F", rotulo: "Feminino" }], padrao: "M" }],
    calcular: (v) => {
      const auxilio = num(v, "media") * 0.91;
      const apos = num(v, "media") * coeficienteArt26(num(v, "anos"), txt(v, "sexo") === "F" ? 15 : 20);
      return { linhas: [{ rotulo: "Auxílio (91%)", valor: brl(auxilio) }, { rotulo: "Aposentadoria (60% + 2%)", valor: brl(apos), destaque: true }, { rotulo: "Diferença", valor: brl(apos - auxilio) }], memoria: ["Após a EC 103 a aposentadoria por incapacidade comum pode ser menor que o auxílio — atenção à tese da irredutibilidade."] };
    },
  },
  {
    id: "revisao-acidentaria",
    secao: 9,
    nome: "Transformação de previdenciário em acidentário (B31→B91 / B32→B92)",
    fundamento: "Lei 8.213/91, arts. 19 a 21-A; EC 103, art. 26, §3º, II",
    modo: "form",
    campos: [{ id: "media", rotulo: "Média", tipo: "moeda" }, { id: "anos", rotulo: "Anos de contribuição", tipo: "numero" }, { id: "sexo", rotulo: "Sexo", tipo: "select", opcoes: [{ valor: "M", rotulo: "Masculino" }, { valor: "F", rotulo: "Feminino" }], padrao: "M" }],
    calcular: (v) => {
      const b32 = num(v, "media") * coeficienteArt26(num(v, "anos"), txt(v, "sexo") === "F" ? 15 : 20);
      const b92 = num(v, "media");
      return { linhas: [{ rotulo: "B32 (previdenciária)", valor: brl(b32) }, { rotulo: "B92 (acidentária, 100%)", valor: brl(b92), destaque: true }, { rotulo: "Diferença mensal", valor: brl(b92 - b32), destaque: true }], memoria: ["O nexo acidentário (NTEP/CAT) gera 100% da média, estabilidade e depósitos de FGTS no auxílio (B91)."] };
    },
  },
  motor("revisao-pensao-derivada", 9, "Revisão de pensão derivada de aposentadoria revisável", "Lei 8.213/91, art. 75; prazo decadencial próprio (Tema 1.057/STJ)", "revisao"),
];

const CAMPOS_RRA: Campo[] = [
  { id: "total", rotulo: "Total recebido acumuladamente (tributável)", tipo: "moeda" },
  { id: "meses", rotulo: "Número de meses a que se refere", tipo: "inteiro" },
  { id: "molestia", rotulo: "Portador de moléstia grave (isento)", tipo: "checkbox" },
  { id: "maior65", rotulo: "Aposentado com 65+ anos (parcela isenta)", tipo: "checkbox" },
];

function rra(v: Valores): Saida {
  const total = num(v, "total");
  const meses = Math.max(1, num(v, "meses", 1));
  if (bool(v, "molestia")) return { linhas: [{ rotulo: "IR", valor: "Isento (moléstia grave)", destaque: true }], memoria: ["Lei 7.713/88, art. 6º, XIV: proventos de aposentadoria/pensão de portador de moléstia grave são isentos, inclusive os atrasados."] };
  const isenta65 = bool(v, "maior65") ? 1903.98 : 0;
  const mensal = Math.max(0, total / meses - isenta65);
  const irMes = irMensal(mensal);
  const ir = irMes * meses;
  return {
    linhas: [{ rotulo: "Base mensal (total ÷ meses)", valor: brl(mensal) }, { rotulo: "IR por mês", valor: brl(irMes) }, { rotulo: "IR total (RRA)", valor: brl(ir), destaque: true }, { rotulo: "Alíquota efetiva", valor: pct(total ? ir / total : 0) }],
    memoria: ["RRA (art. 12-A da Lei 7.713/88): imposto = tabela mensal aplicada à média mensal × número de meses (IN RFB 1.500/2014).", "Tabela de 2026 com a redução da Lei 15.270/2025 (isenção até R$ 5.000 e redução parcial até R$ 7.350) — confira a legislação vigente.", ...(isenta65 ? ["Parcela isenta de R$ 1.903,98 por mês para aposentados com 65+ anos."] : [])],
  };
}

export const SECAO_10: Calculadora[] = [
  motor("valor-causa", 10, "Valor da causa (vencidas + 12 vincendas)", "CPC, art. 292, §§1º e 2º", "atrasados"),
  {
    id: "jef-competencia",
    secao: 10,
    nome: "Competência do JEF (60 salários mínimos)",
    fundamento: "Lei 10.259/2001, art. 3º",
    modo: "form",
    campos: [{ id: "valor", rotulo: "Valor da causa", tipo: "moeda" }, { id: "data", rotulo: "Data do ajuizamento", tipo: "data" }],
    calcular: (v, c) => {
      const lim = salarioMinimo(competencia(txt(v, "data") || c.hoje)) * 60;
      const ok = num(v, "valor") <= lim;
      return { linhas: [{ rotulo: "Limite (60 SM)", valor: brl(lim) }, { rotulo: "Competência", valor: ok ? "Juizado Especial Federal" : "Vara federal comum (ou renúncia ao excedente)", destaque: true }, { rotulo: "Excedente", valor: brl(Math.max(0, num(v, "valor") - lim)) }], memoria: ["Valor da causa: parcelas vencidas + 12 vincendas (Tema 1.030/STJ)."] };
    },
  },
  {
    id: "jef-renuncia",
    secao: 10,
    nome: "Renúncia ao excedente de 60 salários mínimos (JEF)",
    fundamento: "Lei 10.259/2001, arts. 3º e 17, §4º; Tema 1.030/STJ",
    modo: "form",
    campos: [{ id: "valor", rotulo: "Valor da causa", tipo: "moeda" }, { id: "data", rotulo: "Data do ajuizamento", tipo: "data" }],
    calcular: (v, c) => {
      const lim = salarioMinimo(competencia(txt(v, "data") || c.hoje)) * 60;
      const ren = Math.max(0, num(v, "valor") - lim);
      return { linhas: [{ rotulo: "Valor renunciado", valor: brl(ren), destaque: true }, { rotulo: "Valor mantido", valor: brl(Math.min(lim, num(v, "valor"))) }], memoria: ["A renúncia deve ser expressa e alcança apenas as parcelas vencidas até o ajuizamento + 12 vincendas; as posteriores não são renunciadas."] };
    },
  },
  {
    id: "rmi-rma",
    secao: 10,
    nome: "Evolução da RMI até a renda mensal atual (RMA)",
    fundamento: "Lei 8.213/91, art. 41-A",
    modo: "form",
    campos: [{ id: "dib", rotulo: "DIB", tipo: "data" }, { id: "rmi", rotulo: "RMI", tipo: "moeda" }, { id: "ate", rotulo: "Até (competência)", tipo: "competencia" }],
    calcular: (v, c) => {
      const dib = txt(v, "dib");
      if (!dib) return { linhas: [], memoria: ["Informe a DIB."] };
      const ate = txt(v, "ate") || competencia(c.hoje);
      const linhas: string[][] = [];
      let renda = num(v, "rmi");
      for (let ano = Number(dib.slice(0, 4)) + 1; ano <= Number(ate.slice(0, 4)); ano++) {
        const r = reajusteAnual(c.indices, ano, dib);
        renda = evoluirRenda(num(v, "rmi"), dib, `${ano}-01`, c.indices);
        linhas.push([`01/${ano}`, pct(r), brl(renda)]);
      }
      return { linhas: [{ rotulo: "Renda mensal atual", valor: brl(renda), destaque: true }], memoria: ["Reajustes anuais pelo INPC (primeiro proporcional); benefícios no piso acompanham o salário mínimo."], tabela: { colunas: ["Reajuste", "Índice", "Renda"], linhas } };
    },
  },
  {
    id: "reajustes",
    secao: 10,
    nome: "Reajustes anuais do RGPS (INPC; IGP-DI/IPC-r/IRSM históricos)",
    fundamento: "Lei 8.213/91, art. 41-A; Lei 11.430/2006",
    modo: "form",
    campos: [{ id: "de", rotulo: "Ano inicial", tipo: "inteiro", padrao: 2007 }],
    calcular: (v, c) => {
      const linhas: string[][] = [];
      for (let ano = Math.max(1995, num(v, "de", 2007)); ano <= Number(c.hoje.slice(0, 4)); ano++) {
        linhas.push([String(ano), pct(fatorComposto(c.indices, "INPC", `${ano - 1}-01`, `${ano - 1}-12`) - 1)]);
      }
      return { linhas: [{ rotulo: "Anos", valor: String(linhas.length) }], memoria: ["Reajuste integral = INPC acumulado de janeiro a dezembro do ano anterior (desde 2006). Antes disso houve IGP-DI, IPC-r e IRSM — use a análise assistida para esses períodos."], tabela: { colunas: ["Ano", "Reajuste (INPC)"], linhas } };
    },
  },
  motor("parcelas-atrasadas", 10, "Parcelas atrasadas mês a mês (diferenças devidas)", "Manual de Cálculos da Justiça Federal", "atrasados"),
  motor("prescricao", 10, "Prescrição quinquenal (Súmula 85/STJ)", "Lei 8.213/91, art. 103, parágrafo único", "atrasados"),
  {
    id: "decadencia",
    secao: 10,
    nome: "Decadência decenal (art. 103 da Lei 8.213/91)",
    fundamento: "Lei 8.213/91, art. 103; Temas 313 e 975/STF",
    modo: "form",
    campos: [{ id: "primeiro", rotulo: "Data do recebimento da 1ª prestação (ou ciência do indeferimento)", tipo: "data" }, { id: "data", rotulo: "Data de hoje / ajuizamento", tipo: "data" }],
    calcular: (v, c) => {
      const p = txt(v, "primeiro");
      if (!p) return { linhas: [], memoria: ["Informe a data."] };
      const inicio = `${somaComp(competencia(p), 1)}-01`;
      const fim = somaDias(`${Number(inicio.slice(0, 4)) + 10}${inicio.slice(4)}`, -1);
      const hoje = txt(v, "data") || c.hoje;
      return { linhas: [{ rotulo: "Início do prazo", valor: fmtData(inicio) }, { rotulo: "Decai em", valor: fmtData(fim), destaque: true }, { rotulo: "Situação", valor: hoje <= fim ? `Dentro do prazo (${diaN(fim) - diaN(hoje)} dias restantes)` : "Decadência consumada" }], memoria: ["Prazo de 10 anos contado do dia 1º do mês seguinte ao recebimento da primeira prestação (art. 103). Não atinge questões não apreciadas pelo INSS (Tema 975/STJ)."] };
    },
  },
  motor("abatimento-inacumulaveis", 10, "Abatimento de benefícios inacumuláveis recebidos", "Lei 8.213/91, art. 124", "atrasados"),
  motor("tema-1013", 10, "Remuneração recebida em atividade (Tema 1.013/STJ — sem abatimento)", "Tema 1.013/STJ", "atrasados"),
  motor("manual-jf", 10, "Atualização pelo Manual de Cálculos da Justiça Federal", "Resolução CJF 784/2022", "atrasados"),
  motor("correcao-inpc", 10, "Correção monetária pelo INPC (Lei 11.430/2006)", "Tema 905/STJ", "atrasados"),
  motor("correcao-ipcae", 10, "Correção monetária pelo IPCA-E (Tema 810/STF)", "Tema 810/STF", "atrasados"),
  motor("juros-mora", 10, "Juros de mora (1%, 0,5% e poupança — Lei 11.960/2009)", "Lei 9.494/97, art. 1º-F", "atrasados"),
  motor("selic-ec113", 10, "Selic única (EC 113/2021 — correção + juros)", "EC 113/2021, art. 3º", "atrasados"),
  motor("honorarios-sucumbencia", 10, "Honorários sucumbenciais (Súmula 111/STJ — até a sentença)", "CPC, art. 85, §3º; Súmula 111/STJ", "atrasados"),
  {
    id: "honorarios-contratuais",
    secao: 10,
    nome: "Honorários contratuais (destaque de honorários)",
    fundamento: "Lei 8.906/94, art. 22, §4º; Resolução CJF 822/2023",
    modo: "form",
    campos: [{ id: "valor", rotulo: "Valor da condenação", tipo: "moeda" }, { id: "perc", rotulo: "Percentual contratado (%)", tipo: "percentual", padrao: 30 }],
    calcular: (v) => {
      const h = num(v, "valor") * num(v, "perc", 30) / 100;
      return { linhas: [{ rotulo: "Honorários destacados", valor: brl(h), destaque: true }, { rotulo: "Líquido ao cliente", valor: brl(num(v, "valor") - h) }], memoria: ["O destaque exige juntada do contrato antes da expedição do requisitório."] };
    },
  },
  { id: "ir-rra", secao: 10, nome: "IR sobre rendimentos recebidos acumuladamente (RRA — art. 12-A)", fundamento: "Lei 7.713/88, art. 12-A; IN RFB 1.500/2014", modo: "form", campos: CAMPOS_RRA, calcular: rra },
  { id: "ir-molestia", secao: 10, nome: "Isenção de IR por moléstia grave", fundamento: "Lei 7.713/88, art. 6º, XIV; Súmula 627/STJ", modo: "form", campos: CAMPOS_RRA.map((c) => (c.id === "molestia" ? { ...c, padrao: true } : c)), calcular: rra },
  { id: "ir-65", secao: 10, nome: "Isenção de IR para maiores de 65 anos (dupla faixa)", fundamento: "Lei 7.713/88, art. 6º, XV", modo: "form", campos: CAMPOS_RRA.map((c) => (c.id === "maior65" ? { ...c, padrao: true } : c)), calcular: rra },
  {
    id: "pss",
    secao: 10,
    nome: "Contribuição (PSS) sobre atrasados de RPPS",
    fundamento: "Lei 10.887/2004, art. 16-A; EC 103, art. 11",
    modo: "form",
    campos: [{ id: "valor", rotulo: "Valor bruto dos atrasados", tipo: "moeda" }, { id: "meses", rotulo: "Meses a que se referem", tipo: "inteiro", padrao: 1 }, { id: "aposentado", rotulo: "Inativo/pensionista (incide só acima do teto RGPS)", tipo: "checkbox" }],
    calcular: (v) => {
      const meses = Math.max(1, num(v, "meses", 1));
      const mensal = num(v, "valor") / meses;
      const base = bool(v, "aposentado") ? Math.max(0, mensal - 8475.55) : mensal;
      const pss = base * 0.11 * meses;
      return { linhas: [{ rotulo: "PSS (11%)", valor: brl(pss), destaque: true }, { rotulo: "Líquido", valor: brl(num(v, "valor") - pss) }], memoria: ["Retenção de 11% na expedição do requisitório (art. 16-A); com as alíquotas progressivas da EC 103 o cálculo exato é por competência."] };
    },
  },
  {
    id: "rpv-precatorio",
    secao: 10,
    nome: "Separação de valores para RPV e precatório",
    fundamento: "CF, art. 100, §3º; Lei 10.259/2001, art. 17, §1º",
    modo: "form",
    campos: [{ id: "principal", rotulo: "Crédito do autor", tipo: "moeda" }, { id: "honorarios", rotulo: "Honorários sucumbenciais", tipo: "moeda" }, { id: "data", rotulo: "Data", tipo: "data" }],
    calcular: (v, c) => {
      const lim = salarioMinimo(competencia(txt(v, "data") || c.hoje)) * 60;
      const tipo = (x: number) => (x <= lim ? "RPV (pagamento em até 60 dias)" : "Precatório");
      return { linhas: [{ rotulo: "Limite federal da RPV", valor: brl(lim) }, { rotulo: "Crédito do autor", valor: tipo(num(v, "principal")), destaque: true }, { rotulo: "Honorários", valor: tipo(num(v, "honorarios")) }], memoria: ["Honorários sucumbenciais são requisitados de forma autônoma (Súmula Vinculante 47). O autor pode renunciar ao excedente para receber por RPV."] };
    },
  },
  {
    id: "atualizacao-requisitorio",
    secao: 10,
    nome: "Atualização de RPV e precatório (período de graça constitucional)",
    fundamento: "CF, art. 100, §§5º e 12; EC 113/2021; Súmula Vinculante 17",
    modo: "form",
    campos: [{ id: "valor", rotulo: "Valor requisitado", tipo: "moeda" }, { id: "base", rotulo: "Data-base da conta", tipo: "competencia" }, { id: "ate", rotulo: "Atualizar até", tipo: "competencia" }],
    calcular: (v, c) => {
      const de = txt(v, "base") || competencia(c.hoje);
      const ate = txt(v, "ate") || competencia(c.hoje);
      const selic = somaTaxas(c.indices, "SELIC", somaComp(de, 1), ate);
      const ipca = fatorComposto(c.indices, "IPCA", somaComp(de, 1), ate);
      return {
        linhas: [{ rotulo: "Pela Selic (EC 113)", valor: brl(num(v, "valor") * (1 + selic / 100)), destaque: true }, { rotulo: "Pelo IPCA (correção apenas — período de graça)", valor: brl(num(v, "valor") * ipca) }],
        memoria: ["No período de graça (expedição até o fim do exercício seguinte) não incidem juros (SV 17), apenas correção. A EC 136/2025 alterou a atualização de precatórios (IPCA + juros limitados) — confira o regime aplicável ao seu tribunal."],
      };
    },
  },
  {
    id: "astreintes",
    secao: 10,
    nome: "Tutela específica e multa diária (astreintes)",
    fundamento: "CPC, arts. 497, 536 e 537",
    modo: "form",
    campos: [{ id: "multa", rotulo: "Multa diária", tipo: "moeda" }, { id: "inicio", rotulo: "Início do descumprimento", tipo: "data" }, { id: "fim", rotulo: "Fim (cumprimento)", tipo: "data" }, { id: "limite", rotulo: "Limite fixado (opcional)", tipo: "moeda" }],
    calcular: (v, c) => {
      const dias = Math.max(0, diaN(txt(v, "fim") || c.hoje) - diaN(txt(v, "inicio") || c.hoje) + 1);
      const bruto = dias * num(v, "multa");
      const lim = num(v, "limite");
      return { linhas: [{ rotulo: "Dias de descumprimento", valor: String(dias) }, { rotulo: "Multa acumulada", valor: brl(lim ? Math.min(lim, bruto) : bruto), destaque: true }], memoria: ["O juiz pode modificar o valor ou a periodicidade da multa vincenda (art. 537, §1º)."] };
    },
  },
  {
    id: "devolucao-692",
    secao: 10,
    nome: "Devolução de valores recebidos (boa-fé/má-fé — Tema 692/STJ)",
    fundamento: "Tema 692/STJ (revisado em 2022); Lei 8.213/91, art. 115",
    modo: "form",
    campos: [{ id: "valor", rotulo: "Valor recebido indevidamente", tipo: "moeda" }, { id: "renda", rotulo: "Renda atual do benefício", tipo: "moeda" }, { id: "perc", rotulo: "Desconto mensal máximo (%)", tipo: "percentual", padrao: 30 }, { id: "boaFe", rotulo: "Recebido de boa-fé por erro da administração", tipo: "checkbox" }],
    calcular: (v) => {
      if (bool(v, "boaFe")) return { linhas: [{ rotulo: "Devolução", valor: "Indevida (boa-fé + erro administrativo)", destaque: true }], memoria: ["Tema 979/STJ: não se devolvem valores recebidos de boa-fé por erro da administração, salvo erro material/operacional evidente."] };
      const desconto = num(v, "renda") * num(v, "perc", 30) / 100;
      const parcelas = desconto ? Math.ceil(num(v, "valor") / desconto) : 0;
      return { linhas: [{ rotulo: "Desconto mensal", valor: brl(desconto) }, { rotulo: "Número de parcelas", valor: String(parcelas), destaque: true }], memoria: ["Tutela revogada: devolução devida (Tema 692/STJ), com desconto de até 30% do benefício (art. 115, §3º)."] };
    },
  },
];

export const SECAO_11: Calculadora[] = [
  {
    id: "totalizacao",
    secao: 11,
    nome: "Benefício por acordo internacional (totalização de tempo)",
    fundamento: "Acordos bilaterais e multilaterais (Mercosul, Ibero-Americano); Decreto 3.048/99, arts. 380 a 382",
    modo: "form",
    campos: [{ id: "brasil", rotulo: "Tempo no Brasil (anos)", tipo: "numero" }, { id: "exterior", rotulo: "Tempo no exterior (anos)", tipo: "numero" }, { id: "teorico", rotulo: "Benefício teórico (como se todo o tempo fosse no Brasil)", tipo: "moeda" }],
    calcular: (v) => {
      const b = num(v, "brasil"), e = num(v, "exterior");
      const prop = b + e ? b / (b + e) : 0;
      return { linhas: [{ rotulo: "Tempo totalizado", valor: `${dec(b + e, 2)} anos` }, { rotulo: "Proporção brasileira (pro rata)", valor: pct(prop) }, { rotulo: "Benefício efetivo (Brasil)", valor: brl(num(v, "teorico") * prop), destaque: true }], memoria: ["Benefício efetivo = benefício teórico × tempo no Brasil ÷ tempo total. Pode ficar abaixo do mínimo (art. 35 da Lei 8.213 não se aplica ao pro rata)."] };
    },
  },
  { id: "pro-rata", secao: 11, nome: "Prorratização de benefício internacional (pro rata temporis)", fundamento: "Acordos internacionais de previdência", modo: "form", campos: [{ id: "brasil", rotulo: "Tempo no Brasil (anos)", tipo: "numero" }, { id: "exterior", rotulo: "Tempo no exterior (anos)", tipo: "numero" }, { id: "teorico", rotulo: "Benefício teórico", tipo: "moeda" }], calcular: (v, c) => SECAO_11[0].calcular!(v, c) },
  { id: "teorico-efetivo", secao: 11, nome: "Benefício teórico e efetivo (Mercosul / Ibero-Americano)", fundamento: "Acordo Multilateral do Mercosul; Convenção Ibero-Americana", modo: "form", campos: [{ id: "brasil", rotulo: "Tempo no Brasil (anos)", tipo: "numero" }, { id: "exterior", rotulo: "Tempo nos demais países (anos)", tipo: "numero" }, { id: "teorico", rotulo: "Benefício teórico", tipo: "moeda" }], calcular: (v, c) => SECAO_11[0].calcular!(v, c) },
  {
    id: "reserva-matematica",
    secao: 11,
    nome: "Reserva matemática em previdência privada (PGBL / VGBL / fundos de pensão)",
    fundamento: "LC 109/2001; Resolução CNSP 463/2022",
    modo: "form",
    campos: [{ id: "saldo", rotulo: "Saldo atual", tipo: "moeda" }, { id: "aporte", rotulo: "Aporte mensal", tipo: "moeda" }, { id: "anos", rotulo: "Anos de acumulação", tipo: "numero" }, { id: "taxa", rotulo: "Rentabilidade anual (%)", tipo: "percentual", padrao: 8 }, { id: "taxaAdm", rotulo: "Taxa de administração anual (%)", tipo: "percentual", padrao: 1 }],
    calcular: (v) => {
      const i = Math.pow(1 + (num(v, "taxa", 8) - num(v, "taxaAdm", 1)) / 100, 1 / 12) - 1;
      const n = Math.round(num(v, "anos") * 12);
      const fv = num(v, "saldo") * Math.pow(1 + i, n) + (i ? num(v, "aporte") * ((Math.pow(1 + i, n) - 1) / i) : num(v, "aporte") * n);
      const aportado = num(v, "saldo") + num(v, "aporte") * n;
      return { linhas: [{ rotulo: "Reserva projetada", valor: brl(fv), destaque: true }, { rotulo: "Total aportado", valor: brl(aportado) }, { rotulo: "Rendimento", valor: brl(fv - aportado) }], memoria: ["Juros compostos mensais com rentabilidade líquida da taxa de administração."] };
    },
  },
  {
    id: "renda-efpc",
    secao: 11,
    nome: "Renda mensal vitalícia ou temporária (previdência complementar)",
    fundamento: "LC 109/2001",
    modo: "form",
    campos: [{ id: "reserva", rotulo: "Reserva acumulada", tipo: "moeda" }, { id: "anos", rotulo: "Prazo (anos) — use a expectativa de sobrevida para vitalícia", tipo: "numero", padrao: 25 }, { id: "taxa", rotulo: "Taxa de juros atuarial anual (%)", tipo: "percentual", padrao: 4 }],
    calcular: (v) => {
      const i = Math.pow(1 + num(v, "taxa", 4) / 100, 1 / 12) - 1;
      const n = Math.round(num(v, "anos", 25) * 12);
      const renda = i ? (num(v, "reserva") * i) / (1 - Math.pow(1 + i, -n)) : num(v, "reserva") / n;
      return { linhas: [{ rotulo: "Renda mensal", valor: brl(renda), destaque: true }], memoria: ["Anuidade financeira (renda certa). A renda vitalícia efetiva usa a tábua do plano (ex.: AT-2000/BR-EMS)."] };
    },
  },
  {
    id: "portabilidade-resgate",
    secao: 11,
    nome: "Portabilidade e resgate de previdência complementar",
    fundamento: "LC 109/2001, arts. 14 e 15; Lei 11.053/2004",
    modo: "form",
    campos: [{ id: "saldo", rotulo: "Saldo", tipo: "moeda" }, { id: "contribuicoes", rotulo: "Total aportado", tipo: "moeda" }, { id: "anos", rotulo: "Anos de acumulação (regressiva)", tipo: "numero" }, { id: "plano", rotulo: "Plano", tipo: "select", opcoes: [{ valor: "PGBL", rotulo: "PGBL (IR sobre o total)" }, { valor: "VGBL", rotulo: "VGBL (IR sobre o rendimento)" }], padrao: "PGBL" }],
    calcular: (v) => {
      const base = txt(v, "plano") === "VGBL" ? Math.max(0, num(v, "saldo") - num(v, "contribuicoes")) : num(v, "saldo");
      const reg = aliquotaRegressiva(num(v, "anos"));
      return { linhas: [{ rotulo: "Base tributável", valor: brl(base) }, { rotulo: `IR regressivo (${pct(reg, 0)})`, valor: brl(base * reg) }, { rotulo: "IR progressivo (retenção de 15%)", valor: brl(base * 0.15) }, { rotulo: "Portabilidade", valor: "Sem incidência de IR", destaque: true }], memoria: ["A portabilidade entre planos não é tributada; no resgate, PGBL tributa o valor total e VGBL só o rendimento."] };
    },
  },
  {
    id: "regressiva-progressiva",
    secao: 11,
    nome: "Tributação regressiva × progressiva na previdência privada",
    fundamento: "Lei 11.053/2004, art. 1º",
    modo: "form",
    campos: [{ id: "renda", rotulo: "Benefício mensal da previdência privada", tipo: "moeda" }, { id: "outras", rotulo: "Outras rendas tributáveis mensais", tipo: "moeda" }, { id: "anos", rotulo: "Anos de acumulação", tipo: "numero" }],
    calcular: (v) => {
      const reg = aliquotaRegressiva(num(v, "anos"));
      const irReg = num(v, "renda") * reg;
      const irProg = irMensal(num(v, "renda") + num(v, "outras")) - irMensal(num(v, "outras"));
      return {
        linhas: [{ rotulo: `Regressiva (${pct(reg, 0)})`, valor: `${brl(irReg)}/mês` }, { rotulo: "Progressiva (tabela)", valor: `${brl(irProg)}/mês` }, { rotulo: "Mais vantajosa", valor: irReg <= irProg ? "Regressiva" : "Progressiva", destaque: true }],
        memoria: ["Regressiva: 35% (até 2 anos), 30%, 25%, 20%, 15% e 10% (acima de 10 anos), definitiva.", "Progressiva: tabela mensal do IR somada às demais rendas, com ajuste na declaração."],
      };
    },
  },
];

function aliquotaRegressiva(anos: number) {
  if (anos <= 2) return 0.35;
  if (anos <= 4) return 0.3;
  if (anos <= 6) return 0.25;
  if (anos <= 8) return 0.2;
  if (anos <= 10) return 0.15;
  return 0.1;
}

export { compN, deCompN, taxa };
