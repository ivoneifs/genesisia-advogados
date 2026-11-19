// Catálogo trabalhista — seções 1 a 7.

import { competencia, diaN, fmtComp, somaComp } from "../../prev/datas";
import { fatorComposto } from "../../prev/indices";
import { salarioMinimo } from "../../prev/tabelas";
import { brl, bool, dec, lerSalarios, num, txt, type Calculadora, type Campo, type Saida, type Valores } from "../../prev/calc/tipos";
import { COTA_SALARIO_FAMILIA_2026, LIMITE_BAIXA_RENDA_2026 } from "../../prev/calc/secao6e7";
import { NOMES_RESCISAO, calcularHorasExtras, calcularRescisao, salarioHora, type TipoRescisao } from "../motor";

export const SECOES_TRAB: Record<number, string> = {
  1: "Parâmetros e bases de cálculo",
  2: "Verbas rescisórias e indenizações",
  3: "Jornada, horas extras e intervalos",
  4: "Adicional noturno",
  5: "Insalubridade, periculosidade e penosidade",
  6: "Diferenças salariais e remuneração variável",
  7: "Reflexos e repercussões",
  8: "FGTS e multas rescisórias",
  9: "Estabilidades e reintegração",
  10: "Multas trabalhistas, processuais e convencionais",
  11: "Danos extrapatrimoniais e responsabilidade civil",
  12: "Descontos indevidos e devoluções",
  13: "Liquidação, atualização, juros e encargos",
};

const SAL: Campo = { id: "salario", rotulo: "Salário-base", tipo: "moeda" };
const DIVISOR: Campo = { id: "divisor", rotulo: "Divisor", tipo: "select", opcoes: ["220", "210", "200", "180", "150", "120"].map((d) => ({ valor: d, rotulo: d })), padrao: "220" };

function form(id: string, secao: number, nome: string, fundamento: string, campos: Campo[], calcular: (v: Valores, c: { indices: import("../../prev/indices").Indices; hoje: string }) => Saida): Calculadora {
  return { id, secao, nome, fundamento, modo: "form", campos, calcular };
}

/** Valor = base × percentual (adicionais, gratificações...). */
function percentual(id: string, secao: number, nome: string, fundamento: string, p: number, rotuloBase = "Base de cálculo", nota?: string): Calculadora {
  return form(id, secao, nome, fundamento, [{ id: "base", rotulo: rotuloBase, tipo: "moeda" }, { id: "pct", rotulo: "Percentual (%)", tipo: "percentual", padrao: p }, { id: "meses", rotulo: "Meses devidos", tipo: "inteiro", padrao: 1 }, { id: "reflexos", rotulo: "Calcular reflexos (13º, férias + 1/3, FGTS)", tipo: "checkbox", padrao: true }], (v) => {
    const mensal = (num(v, "base") * num(v, "pct", p)) / 100;
    return comReflexos(mensal, num(v, "meses", 1), bool(v, "reflexos"), [`${brl(num(v, "base"))} × ${num(v, "pct", p)}% = ${brl(mensal)} por mês.`, ...(nota ? [nota] : [])]);
  });
}

/** Total + reflexos padrão (13º, férias + 1/3 e FGTS 8%). */
export function comReflexos(mensal: number, meses: number, reflexos: boolean, memoria: string[] = [], multa40 = false): Saida {
  const total = mensal * meses;
  const decimo = reflexos ? total / 12 : 0;
  const ferias = reflexos ? (total / 12) * (4 / 3) : 0;
  const fgts = reflexos ? (total + decimo) * 0.08 : 0;
  const multa = reflexos && multa40 ? fgts * 0.4 : 0;
  return {
    linhas: [
      { rotulo: "Valor mensal", valor: brl(mensal) },
      { rotulo: `Principal (${meses} mês(es))`, valor: brl(total), destaque: !reflexos },
      ...(reflexos
        ? [
            { rotulo: "Reflexo em 13º salário", valor: brl(decimo) },
            { rotulo: "Reflexo em férias + 1/3", valor: brl(ferias) },
            { rotulo: "FGTS (8%)", valor: brl(fgts) },
            ...(multa40 ? [{ rotulo: "Multa de 40% do FGTS", valor: brl(multa) }] : []),
            { rotulo: "Total com reflexos", valor: brl(total + decimo + ferias + fgts + multa), destaque: true },
          ]
        : []),
    ],
    memoria: [...memoria, ...(reflexos ? ["Reflexos: 13º = principal ÷ 12; férias + 1/3 = principal ÷ 12 × 4/3; FGTS 8% sobre principal e 13º (Súmula 63/TST)."] : [])],
  };
}

// ---------------------------------------------------------------------------
// Seção 1 — bases
// ---------------------------------------------------------------------------

export const TRAB_SECAO_1: Calculadora[] = [
  form("salario-hora", 1, "Salário-hora (divisores 220, 200, 180, 150, 120)", "CLT, art. 64; Súmula 431/TST", [SAL, DIVISOR], (v) => {
    const linhas = [220, 200, 180, 150, 120].map((d) => ({ rotulo: `Divisor ${d}`, valor: brl(salarioHora(num(v, "salario"), d)), destaque: d === num(v, "divisor", 220) }));
    return { linhas, memoria: ["Divisor = jornada semanal × 5 (44h → 220; 40h → 200; 36h → 180; 30h → 150; 24h → 120)."] };
  }),
  form("salario-dia", 1, "Salário-dia (base 30 ou dias do mês)", "CLT, art. 64, parágrafo único", [SAL, { id: "mes", rotulo: "Mês", tipo: "competencia" }], (v, c) => {
    const comp = txt(v, "mes") || competencia(c.hoje);
    const [a, m] = comp.split("-").map(Number);
    const dias = new Date(Date.UTC(a, m, 0)).getUTCDate();
    return { linhas: [{ rotulo: "Base 30 dias", valor: brl(num(v, "salario") / 30), destaque: true }, { rotulo: `Dias do mês (${dias})`, valor: brl(num(v, "salario") / dias) }], memoria: ["Mensalista: o salário-dia é 1/30 do salário mensal (art. 64, parágrafo único)."] };
  }),
  form("salario-minuto", 1, "Salário-minuto e conversão sexagesimal → centesimal", "Prática contábil", [SAL, DIVISOR, { id: "hhmm", rotulo: "Tempo (hh:mm)", tipo: "texto", padrao: "01:30" }], (v) => {
    const [h, m] = txt(v, "hhmm", "0:0").split(":").map((x) => Number(x) || 0);
    const centesimal = h + m / 60;
    const hora = salarioHora(num(v, "salario"), num(v, "divisor", 220));
    return { linhas: [{ rotulo: "Horas centesimais", valor: dec(centesimal, 4) }, { rotulo: "Salário-minuto", valor: brl(hora / 60) }, { rotulo: "Valor do tempo informado", valor: brl(hora * centesimal), destaque: true }], memoria: [`${h}h${String(m).padStart(2, "0")} = ${h} + ${m}/60 = ${dec(centesimal, 4)} h.`] };
  }),
  form("remuneracao-global", 1, "Remuneração global / complexo salarial", "CLT, arts. 457 e 458", [SAL, { id: "adicionais", rotulo: "Adicionais habituais", tipo: "moeda" }, { id: "comissoes", rotulo: "Comissões/prêmios habituais", tipo: "moeda" }, { id: "gratificacoes", rotulo: "Gratificações", tipo: "moeda" }, { id: "utilidades", rotulo: "Salário-utilidade", tipo: "moeda" }, { id: "gorjetas", rotulo: "Gorjetas", tipo: "moeda" }], (v) => {
    const salario = ["salario", "adicionais", "comissoes", "gratificacoes", "utilidades"].reduce((s, k) => s + num(v, k), 0);
    return { linhas: [{ rotulo: "Salário (art. 457, §1º)", valor: brl(salario) }, { rotulo: "Remuneração (com gorjetas)", valor: brl(salario + num(v, "gorjetas")), destaque: true }], memoria: ["Remuneração = salário + gorjetas; gorjetas não integram aviso, adicional noturno, HE e DSR (Súmula 354/TST)."] };
  }),
  form("media-fisica", 1, "Média física de verbas variáveis (HE, comissões, adicionais)", "Súmula 347/TST", [{ id: "quantidades", rotulo: "Quantidades por mês (uma por linha: MM/AAAA quantidade)", tipo: "salarios", largura: "inteira" }, { id: "valorAtual", rotulo: "Valor unitário atual (ex.: valor da hora extra)", tipo: "moeda" }], (v) => {
    const q = lerSalarios(txt(v, "quantidades"));
    const media = q.length ? q.reduce((s, x) => s + x.valor, 0) / q.length : 0;
    return { linhas: [{ rotulo: "Média de quantidades", valor: dec(media, 2) }, { rotulo: "Média em reais (valor atual)", valor: brl(media * num(v, "valorAtual")), destaque: true }], memoria: ["Súmula 347/TST: apura-se a média física (número de horas) e aplica-se o valor do salário-hora da época do pagamento."] };
  }),
  form("media-monetaria", 1, "Média monetária atualizada de verbas variáveis", "Súmula 45 e OJ 181/SDI-1 TST", [{ id: "valores", rotulo: "Valores por mês (MM/AAAA valor)", tipo: "salarios", largura: "inteira" }, { id: "ate", rotulo: "Atualizar até", tipo: "competencia" }], (v, c) => {
    const lista = lerSalarios(txt(v, "valores"));
    const ate = txt(v, "ate") || competencia(c.hoje);
    const atual = lista.map((x) => ({ ...x, f: x.comp < ate ? fatorComposto(c.indices, "INPC", somaComp(x.comp, 1), ate) : 1 }));
    const media = atual.length ? atual.reduce((s, x) => s + x.valor * x.f, 0) / atual.length : 0;
    return { linhas: [{ rotulo: "Média nominal", valor: brl(lista.length ? lista.reduce((s, x) => s + x.valor, 0) / lista.length : 0) }, { rotulo: "Média atualizada (INPC)", valor: brl(media), destaque: true }], memoria: ["Comissões e variáveis em valores são corrigidas monetariamente antes da média (OJ 181/SDI-1)."], tabela: { colunas: ["Mês", "Valor", "Fator", "Atualizado"], linhas: atual.map((x) => [fmtComp(x.comp), brl(x.valor), dec(x.f, 6), brl(x.valor * x.f)]) } };
  }),
  form("maior-remuneracao", 1, "Maior remuneração (base rescisória)", "CLT, art. 477; Súmula 459/STF", [{ id: "valores", rotulo: "Remunerações (MM/AAAA valor)", tipo: "salarios", largura: "inteira" }], (v) => {
    const lista = lerSalarios(txt(v, "valores")).sort((a, b) => b.valor - a.valor);
    return { linhas: [{ rotulo: "Maior remuneração", valor: lista[0] ? `${brl(lista[0].valor)} (${fmtComp(lista[0].comp)})` : "—", destaque: true }, { rotulo: "Última remuneração", valor: lista.length ? brl([...lista].sort((a, b) => (a.comp < b.comp ? 1 : -1))[0].valor) : "—" }], memoria: ["A indenização considera a maior remuneração recebida na empresa (art. 477, caput, redação anterior) — aplicação conforme a verba."] };
  }),
  form("evolucao-salarial", 1, "Evolução salarial histórica (reajustes normativos e legais)", "CCT/ACT; CLT, art. 611-A", [{ id: "inicial", rotulo: "Salário inicial", tipo: "moeda" }, { id: "reajustes", rotulo: "Reajustes (MM/AAAA percentual)", tipo: "salarios", largura: "inteira", ajuda: "Ex.: 05/2023 5,5" }], (v) => {
    let s = num(v, "inicial");
    const linhas = lerSalarios(txt(v, "reajustes")).sort((a, b) => (a.comp < b.comp ? -1 : 1)).map((r) => {
      s *= 1 + r.valor / 100;
      return [fmtComp(r.comp), `${dec(r.valor)}%`, brl(s)];
    });
    return { linhas: [{ rotulo: "Salário atual", valor: brl(s), destaque: true }], memoria: ["Reajustes aplicados em cascata sobre o salário do mês anterior."], tabela: { colunas: ["Data-base", "Reajuste", "Salário"], linhas } };
  }),
  form("piso-normativo", 1, "Piso salarial profissional / salário normativo", "CF, art. 7º, V; CCT", [{ id: "piso", rotulo: "Piso da categoria", tipo: "moeda" }, { id: "pago", rotulo: "Salário pago", tipo: "moeda" }, { id: "meses", rotulo: "Meses", tipo: "inteiro", padrao: 12 }], (v) => comReflexos(Math.max(0, num(v, "piso") - num(v, "pago")), num(v, "meses", 12), true, ["Diferença mensal = piso − salário pago."], true)),
  form("salario-minimo-pisos", 1, "Salário mínimo nacional e pisos regionais", "CF, art. 7º, IV; LC 103/2000", [{ id: "mes", rotulo: "Competência", tipo: "competencia" }, { id: "regional", rotulo: "Piso regional (se houver)", tipo: "moeda" }], (v, c) => {
    const sm = salarioMinimo(txt(v, "mes") || competencia(c.hoje));
    return { linhas: [{ rotulo: "Salário mínimo nacional", valor: brl(sm), destaque: true }, { rotulo: "Piso aplicável", valor: brl(Math.max(sm, num(v, "regional"))) }], memoria: ["Estados podem fixar pisos regionais superiores (LC 103/2000)."] };
  }),
  form("salario-familia-trab", 1, "Salário-família (cotas proporcionais e integrais)", "Lei 8.213/91, arts. 65 a 70", [{ id: "remuneracao", rotulo: "Remuneração", tipo: "moeda" }, { id: "filhos", rotulo: "Filhos até 14 anos", tipo: "inteiro" }, { id: "dias", rotulo: "Dias trabalhados no mês", tipo: "inteiro", padrao: 30 }], (v) => {
    const ok = num(v, "remuneracao") <= LIMITE_BAIXA_RENDA_2026;
    const valor = ok ? (COTA_SALARIO_FAMILIA_2026 * num(v, "filhos") * Math.min(30, num(v, "dias", 30))) / 30 : 0;
    return { linhas: [{ rotulo: "Salário-família", valor: brl(valor), destaque: true }], memoria: ["Cota proporcional aos dias no mês de admissão ou desligamento; valores de 2026."] };
  }),
  form("salario-utilidade", 1, "Salário-utilidade / in natura (alimentação, habitação, veículo)", "CLT, art. 458, §3º; Súmulas 241 e 367/TST", [SAL, { id: "alimentacao", rotulo: "Alimentação fornecida (valor real)", tipo: "moeda" }, { id: "habitacao", rotulo: "Habitação (valor real)", tipo: "moeda" }, { id: "outros", rotulo: "Outras utilidades habituais", tipo: "moeda" }], (v) => {
    const s = num(v, "salario");
    const alim = Math.min(num(v, "alimentacao"), s * 0.2);
    const hab = Math.min(num(v, "habitacao"), s * 0.25);
    const total = alim + hab + num(v, "outros");
    return { linhas: [{ rotulo: "Alimentação (limite 20%)", valor: brl(alim) }, { rotulo: "Habitação (limite 25%)", valor: brl(hab) }, { rotulo: "Salário-utilidade total", valor: brl(total), destaque: true }, { rotulo: "Remuneração com utilidades", valor: brl(s + total) }], memoria: ["Veículo e alimentação do PAT, quando indispensáveis ao trabalho, não têm natureza salarial (Súmula 367/TST; Lei 6.321/76)."] };
  }),
  form("salario-complessivo", 1, "Salário complessivo (desmembramento de verbas)", "Súmula 91/TST", [{ id: "total", rotulo: "Valor pago englobadamente", tipo: "moeda" }, { id: "partes", rotulo: "Verbas e proporções (uma por linha: nome; percentual)", tipo: "textoLongo", largura: "inteira" }], (v) => {
    const partes = txt(v, "partes").split("\n").map((l) => l.split(";")).filter((x) => x[0]?.trim());
    return { linhas: [{ rotulo: "Resultado", valor: "Cláusula nula — o valor é salário-base", destaque: true }], memoria: ["Súmula 91/TST: é nula a cláusula que fixa importância global para atender vários direitos; o valor pago é considerado salário e os direitos são devidos à parte."], tabela: { colunas: ["Verba", "Proporção", "Valor"], linhas: partes.map((p) => [p[0].trim(), `${p[1] ?? 0}%`, brl((num(v, "total") * Number(String(p[1] ?? 0).replace(",", "."))) / 100)]) } };
  }),
  form("base-insalubridade", 1, "Base de cálculo do adicional de insalubridade", "CLT, art. 192; Súmula Vinculante 4/STF; Súmula 228/TST (suspensa)", [{ id: "mes", rotulo: "Competência", tipo: "competencia" }, { id: "piso", rotulo: "Piso/salário normativo (se a CCT prever)", tipo: "moeda" }], (v, c) => {
    const sm = salarioMinimo(txt(v, "mes") || competencia(c.hoje));
    const base = num(v, "piso") || sm;
    return { linhas: [{ rotulo: "Base aplicável", valor: brl(base), destaque: true }, ...[10, 20, 40].map((g) => ({ rotulo: `Grau ${g}%`, valor: brl(base * g / 100) }))], memoria: ["O STF manteve o salário mínimo como base até edição de lei ou norma coletiva (SV 4; Rcl 6.266)."] };
  }),
  form("base-periculosidade", 1, "Base de cálculo do adicional de periculosidade", "CLT, art. 193, §1º; Súmula 191/TST", [SAL], (v) => ({ linhas: [{ rotulo: "Adicional (30% do salário-base)", valor: brl(num(v, "salario") * 0.3), destaque: true }], memoria: ["Incide sobre o salário-base, sem gratificações, prêmios ou PLR (art. 193, §1º)."] })),
  form("base-he", 1, "Base de cálculo das horas extras (Súmula 264/TST)", "Súmula 264/TST", [SAL, { id: "adicionais", rotulo: "Parcelas salariais habituais (insalubridade, periculosidade, noturno, comissões...)", tipo: "moeda" }, DIVISOR], (v) => {
    const base = num(v, "salario") + num(v, "adicionais");
    const hora = salarioHora(base, num(v, "divisor", 220));
    return { linhas: [{ rotulo: "Base", valor: brl(base) }, { rotulo: "Salário-hora", valor: brl(hora), destaque: true }, { rotulo: "Hora extra 50%", valor: brl(hora * 1.5) }, { rotulo: "Hora extra 100%", valor: brl(hora * 2) }], memoria: ["A remuneração do serviço suplementar é composta do valor da hora normal integrado por parcelas de natureza salarial (Súmula 264)."] };
  }),
];

// ---------------------------------------------------------------------------
// Seção 2 — rescisão
// ---------------------------------------------------------------------------

const CAMPOS_RESCISAO: Campo[] = [
  { id: "tipo", rotulo: "Modalidade", tipo: "select", opcoes: Object.entries(NOMES_RESCISAO).map(([valor, rotulo]) => ({ valor, rotulo })), padrao: "sem_justa_causa" },
  { id: "admissao", rotulo: "Admissão", tipo: "data" },
  { id: "afastamento", rotulo: "Último dia trabalhado", tipo: "data" },
  SAL,
  { id: "media", rotulo: "Média de variáveis (HE, comissões, adicionais)", tipo: "moeda" },
  { id: "aviso", rotulo: "Aviso prévio", tipo: "select", opcoes: [{ valor: "indenizado", rotulo: "Indenizado" }, { valor: "trabalhado", rotulo: "Trabalhado" }, { valor: "dispensado", rotulo: "Dispensado" }, { valor: "nao_cumprido", rotulo: "Não cumprido pelo empregado" }], padrao: "indenizado" },
  { id: "vencidas", rotulo: "Férias vencidas (períodos)", tipo: "inteiro", padrao: 0 },
  { id: "dobro", rotulo: "…das quais em dobro", tipo: "inteiro", padrao: 0 },
  { id: "saldoFgts", rotulo: "Saldo do FGTS para fins rescisórios", tipo: "moeda" },
  { id: "fimPrazo", rotulo: "Termo final do contrato a prazo", tipo: "data" },
  { id: "dataBase", rotulo: "Mês da data-base (1 a 12)", tipo: "inteiro" },
  { id: "dependentes", rotulo: "Dependentes (IR)", tipo: "inteiro", padrao: 0 },
  { id: "descontos", rotulo: "Outros descontos", tipo: "moeda" },
  { id: "atraso", rotulo: "Pagamento fora do prazo (multa 477)", tipo: "checkbox" },
  { id: "art467", rotulo: "Verbas incontroversas não pagas em audiência (multa 467)", tipo: "checkbox" },
];

function rescisao(id: string, nome: string, fundamento: string, preset: Valores = {}, foco?: RegExp): Calculadora {
  return {
    id,
    secao: 2,
    nome,
    fundamento,
    modo: "form",
    campos: CAMPOS_RESCISAO.map((c) => (preset[c.id] !== undefined ? { ...c, padrao: preset[c.id] as string | number | boolean } : c)),
    calcular: (v0) => {
      const v = { ...preset, ...v0 };
      if (!txt(v, "admissao") || !txt(v, "afastamento") || txt(v, "afastamento") < txt(v, "admissao")) return { linhas: [], memoria: ["Informe admissão e último dia trabalhado."] };
      const r = calcularRescisao({
        tipo: txt(v, "tipo", "sem_justa_causa") as TipoRescisao,
        admissao: txt(v, "admissao"),
        afastamento: txt(v, "afastamento"),
        salario: num(v, "salario"),
        mediaVariaveis: num(v, "media"),
        aviso: txt(v, "aviso", "indenizado") as "indenizado",
        feriasVencidasPeriodos: num(v, "vencidas"),
        feriasEmDobro: num(v, "dobro"),
        saldoFgts: num(v, "saldoFgts"),
        fimContratoPrazo: txt(v, "fimPrazo") || undefined,
        dependentes: num(v, "dependentes"),
        atrasoPagamento: bool(v, "atraso"),
        verbasIncontroversasNaoPagas: bool(v, "art467"),
        dataBase: txt(v, "dataBase") || undefined,
        descontos: num(v, "descontos"),
      });
      const focadas = foco ? r.linhas.filter((l) => foco.test(l.verba)) : [];
      return {
        linhas: [
          ...focadas.map((l) => ({ rotulo: `${l.verba} (${l.referencia})`, valor: brl(l.valor), destaque: true })),
          { rotulo: "Total bruto", valor: brl(r.brutos) },
          { rotulo: "INSS", valor: brl(r.inss) },
          { rotulo: "IRRF", valor: brl(r.irrf) },
          { rotulo: "Líquido a receber", valor: brl(r.liquido), destaque: !foco },
          { rotulo: "FGTS do mês rescisório", valor: brl(r.fgtsRescisorio) },
          { rotulo: "Multa do FGTS", valor: brl(r.multaFgts) },
          { rotulo: "Projeção do aviso", valor: `${r.diasAviso} dias` },
        ],
        memoria: r.memoria,
        tabela: { titulo: "Termo de rescisão (TRCT)", colunas: ["Verba", "Referência", "Natureza", "Valor"], linhas: r.linhas.map((l) => [l.verba, l.referencia, l.desconto ? "desconto" : l.natureza, brl(l.desconto ? -l.valor : l.valor)]) },
      };
    },
  };
}

function simples(id: string, secao: number, nome: string, fundamento: string, campos: Campo[], f: (v: Valores) => { valor: number; memoria: string[]; rotulo?: string }, reflexos = false): Calculadora {
  return form(id, secao, nome, fundamento, campos, (v) => {
    const r = f(v);
    return reflexos ? comReflexos(r.valor, num(v, "meses", 1), true, r.memoria) : { linhas: [{ rotulo: r.rotulo ?? "Valor devido", valor: brl(r.valor), destaque: true }], memoria: r.memoria };
  });
}

export const TRAB_SECAO_2: Calculadora[] = [
  rescisao("rescisao-completa", "Rescisão contratual completa (TRCT)", "CLT, arts. 477 a 487"),
  rescisao("saldo-salario", "Saldo de salário", "CLT, art. 462", {}, /Saldo de salário/),
  rescisao("aviso-trabalhado", "Aviso prévio trabalhado", "CLT, arts. 487 e 488", { aviso: "trabalhado" }),
  rescisao("aviso-indenizado", "Aviso prévio indenizado (30 dias)", "CLT, art. 487, §1º", {}, /Aviso prévio/),
  rescisao("aviso-proporcional", "Aviso prévio proporcional (Lei 12.506/2011)", "Lei 12.506/2011", {}, /Aviso prévio/),
  rescisao("aviso-acordo", "Aviso prévio no acordo mútuo (50% — art. 484-A)", "CLT, art. 484-A", { tipo: "acordo" }, /Aviso prévio/),
  rescisao("aviso-projecao", "Projeção do aviso prévio no tempo de serviço", "CLT, art. 487, §1º; OJ 82 SDI-1", {}, /indenizad/),
  rescisao("aviso-desconto", "Desconto de aviso prévio não cumprido pelo empregado", "CLT, art. 487, §2º", { tipo: "pedido_demissao", aviso: "nao_cumprido" }, /Desconto do aviso/),
  simples("decimo-integral", 2, "13º salário integral", "Lei 4.090/62", [SAL, { id: "media", rotulo: "Média de variáveis", tipo: "moeda" }], (v) => ({ valor: num(v, "salario") + num(v, "media"), memoria: ["13º = remuneração de dezembro (com média das variáveis)."] })),
  rescisao("decimo-proporcional", "13º salário proporcional (regra dos 15 dias)", "Lei 4.090/62, art. 1º, §2º", {}, /13º salário proporcional/),
  rescisao("decimo-indenizado", "13º salário indenizado (projeção do aviso)", "Lei 4.090/62; OJ 82 SDI-1", {}, /13º/),
  simples("decimo-variaveis", 2, "Diferenças de 13º sobre variáveis (1ª, 2ª parcelas e ajuste de janeiro)", "Decreto 57.155/65, art. 2º", [{ id: "pago", rotulo: "13º pago (1ª + 2ª parcelas)", tipo: "moeda" }, SAL, { id: "mediaAno", rotulo: "Média anual de variáveis (jan–dez)", tipo: "moeda" }], (v) => ({ valor: Math.max(0, num(v, "salario") + num(v, "mediaAno") - num(v, "pago")), memoria: ["Ajuste até 10 de janeiro: a média das variáveis de dezembro é recalculada com o ano completo."] })),
  simples("ferias-simples", 2, "Férias integrais simples", "CLT, arts. 129 e 130", [SAL, { id: "media", rotulo: "Média de variáveis", tipo: "moeda" }, { id: "faltas", rotulo: "Faltas injustificadas no período", tipo: "inteiro" }], (v) => {
    const f = num(v, "faltas");
    const dias = f <= 5 ? 30 : f <= 14 ? 24 : f <= 23 ? 18 : f <= 32 ? 12 : 0;
    const valor = ((num(v, "salario") + num(v, "media")) / 30) * dias * (4 / 3);
    return { valor, memoria: [`${dias} dias de férias pelas faltas (art. 130) + 1/3 constitucional.`] };
  }),
  rescisao("ferias-dobro", "Férias vencidas em dobro (art. 137)", "CLT, art. 137", { vencidas: 1, dobro: 1 }, /dobro/),
  rescisao("ferias-proporcionais", "Férias proporcionais (período aquisitivo incompleto)", "CLT, art. 147; Súmula 261/TST", {}, /Férias proporcionais|1\/3 constitucional sobre férias proporcionais/),
  rescisao("ferias-indenizadas", "Férias indenizadas (projeção do aviso)", "CLT, art. 146; OJ 82", {}, /Férias indenizadas/),
  simples("terco-ferias", 2, "Terço constitucional de férias", "CF, art. 7º, XVII", [{ id: "ferias", rotulo: "Valor das férias (simples, dobradas ou proporcionais)", tipo: "moeda" }], (v) => ({ valor: num(v, "ferias") / 3, memoria: ["1/3 incide sobre férias gozadas, indenizadas, simples, dobradas e proporcionais (Súmula 328/TST)."] })),
  simples("abono-ferias", 2, "Abono pecuniário de férias (venda de 10 dias + 1/3)", "CLT, art. 143", [SAL, { id: "media", rotulo: "Média de variáveis", tipo: "moeda" }, { id: "dias", rotulo: "Dias vendidos (até 1/3)", tipo: "inteiro", padrao: 10 }], (v) => {
    const dia = (num(v, "salario") + num(v, "media")) / 30;
    return { valor: dia * Math.min(10, num(v, "dias", 10)) * (4 / 3), memoria: ["Abono de até 1/3 das férias com o 1/3 constitucional; natureza indenizatória (art. 144)."] };
  }),
  simples("ferias-fora-prazo", 2, "Férias gozadas com pagamento fora do prazo (dobra — Súmula 450 / ADPF 501)", "CLT, art. 145; ADPF 501/STF (2022)", [{ id: "ferias", rotulo: "Valor das férias + 1/3", tipo: "moeda" }, { id: "gozadasNoPrazo", rotulo: "Gozadas dentro do período concessivo", tipo: "checkbox", padrao: true }], (v) => ({ valor: bool(v, "gozadasNoPrazo") ? 0 : num(v, "ferias"), memoria: ["O STF (ADPF 501) declarou inconstitucional a Súmula 450/TST: o simples atraso no pagamento, com gozo no prazo, não gera a dobra. A dobra permanece quando o gozo ocorre fora do período concessivo (art. 137)."] })),
  rescisao("ferias-justa-causa", "Férias proporcionais na justa causa (Convenção 132 da OIT)", "Súmula 171/TST; Convenção 132 OIT (tese)", { tipo: "justa_causa" }),
  rescisao("trintidio", "Indenização adicional do trintídio (art. 9º da Lei 7.238/84)", "Lei 7.238/84, art. 9º; Súmulas 182 e 314/TST", { dataBase: 1 }, /trintídio|Lei 7.238/),
  rescisao("art479", "Indenização por quebra antecipada de contrato a prazo (art. 479)", "CLT, art. 479", { tipo: "antecipada_empregador" }, /art\. 479/),
  rescisao("art480", "Desconto por quebra antecipada pelo empregado (art. 480)", "CLT, art. 480", { tipo: "antecipada_empregado" }, /art\. 480/),
  rescisao("experiencia", "Indenização por quebra de contrato de experiência", "CLT, arts. 443, §2º, c, e 479", { tipo: "antecipada_empregador" }, /art\. 479/),
  rescisao("safra", "Indenização de contrato de safra", "Lei 5.889/73, art. 14", { tipo: "termino_prazo" }),
  rescisao("obra-certa", "Indenização de contrato de obra certa", "Lei 2.959/56", { tipo: "termino_prazo" }),
  simples("dispensa-discriminatoria", 2, "Dispensa discriminatória — remuneração em dobro (Lei 9.029/95)", "Lei 9.029/95, art. 4º, II; Súmula 443/TST", [{ id: "remuneracao", rotulo: "Remuneração mensal", tipo: "moeda" }, { id: "meses", rotulo: "Meses de afastamento (dispensa até a decisão)", tipo: "inteiro" }], (v) => ({ valor: num(v, "remuneracao") * num(v, "meses") * 2, memoria: ["Opção do empregado: reintegração com ressarcimento integral ou percepção em dobro da remuneração do período de afastamento, corrigida e com juros."] })),
  simples("pdv", 2, "Indenização de PDV / PDI", "CLT, art. 477-B; Tema 152/STF", [{ id: "salario", rotulo: "Salário", tipo: "moeda" }, { id: "anos", rotulo: "Anos de serviço", tipo: "inteiro" }, { id: "fator", rotulo: "Salários por ano previstos no plano", tipo: "numero", padrao: 1 }, { id: "fixo", rotulo: "Valor fixo adicional", tipo: "moeda" }], (v) => ({ valor: num(v, "salario") * num(v, "anos") * num(v, "fator", 1) + num(v, "fixo"), memoria: ["PDV previsto em norma coletiva gera quitação ampla (art. 477-B; Tema 152/STF). Indenização isenta de IR (Súmula 215/STJ)."] })),
  simples("seguro-desemprego", 2, "Indenização substitutiva do seguro-desemprego (Súmula 389/TST)", "Lei 7.998/90; Súmula 389, II/TST", [{ id: "media3", rotulo: "Média dos 3 últimos salários", tipo: "moeda" }, { id: "parcelas", rotulo: "Número de parcelas (3 a 5)", tipo: "inteiro", padrao: 5 }], (v) => {
    const m = num(v, "media3");
    // Tabela 2026 (reajustada pelo INPC): faixas aproximadas — confira a Resolução do CODEFAT.
    const parcela = Math.max(1621, Math.min(2518.65, m <= 2222.17 ? m * 0.8 : m <= 3703.99 ? 1777.74 + (m - 2222.17) * 0.5 : 2518.65));
    return { valor: parcela * num(v, "parcelas", 5), memoria: [`Parcela estimada ${brl(parcela)} × ${num(v, "parcelas", 5)} (faixas do CODEFAT de 2026 — confira a resolução vigente).`, "Devida quando o empregador não entrega as guias (Súmula 389, II/TST)."] };
  }),
  simples("vale-transporte", 2, "Indenização substitutiva de vale-transporte não fornecido", "Lei 7.418/85; Súmula 460/TST", [{ id: "custoDia", rotulo: "Custo diário do transporte", tipo: "moeda" }, { id: "dias", rotulo: "Dias trabalhados", tipo: "inteiro" }, SAL], (v) => {
    const custo = num(v, "custoDia") * num(v, "dias");
    const meses = num(v, "dias") / 22;
    return { valor: Math.max(0, custo - num(v, "salario") * 0.06 * meses), memoria: ["Custo do transporte menos a participação do empregado (6% do salário-base)."] };
  }),
  simples("vale-refeicao", 2, "Indenização substitutiva de vale-refeição / cesta básica", "CCT; Lei 6.321/76", [{ id: "valorDia", rotulo: "Valor diário (ou mensal da cesta)", tipo: "moeda" }, { id: "quantidade", rotulo: "Dias (ou meses)", tipo: "inteiro" }, { id: "coparticipacao", rotulo: "Coparticipação prevista (%)", tipo: "percentual" }], (v) => ({ valor: num(v, "valorDia") * num(v, "quantidade") * (1 - num(v, "coparticipacao") / 100), memoria: ["Valor previsto na norma coletiva, descontada a coparticipação do empregado."] })),
];

// ---------------------------------------------------------------------------
// Seção 3 — jornada e horas extras
// ---------------------------------------------------------------------------

const CAMPOS_HE: Campo[] = [
  SAL,
  { id: "adicionalBase", rotulo: "Adicionais que integram a base (insalubridade etc.)", tipo: "moeda" },
  DIVISOR,
  { id: "horas", rotulo: "Horas extras por mês (centesimais)", tipo: "numero" },
  { id: "percentual", rotulo: "Adicional (%)", tipo: "percentual", padrao: 50 },
  { id: "meses", rotulo: "Meses", tipo: "inteiro", padrao: 12 },
  { id: "diasUteis", rotulo: "Dias úteis no mês", tipo: "inteiro", padrao: 25 },
  { id: "diasDescanso", rotulo: "Domingos e feriados no mês", tipo: "inteiro", padrao: 5 },
  { id: "oj394", rotulo: "DSR majorado repercute (período a partir de 20/03/2023)", tipo: "checkbox" },
  { id: "multa40", rotulo: "Incluir multa de 40% do FGTS", tipo: "checkbox", padrao: true },
];

function he(id: string, secao: number, nome: string, fundamento: string, preset: Valores = {}, notas: string[] = []): Calculadora {
  return {
    id,
    secao,
    nome,
    fundamento,
    modo: "form",
    campos: CAMPOS_HE.map((c) => (preset[c.id] !== undefined ? { ...c, padrao: preset[c.id] as string | number | boolean } : c)),
    calcular: (v0) => {
      const v = { ...preset, ...v0 };
      const r = calcularHorasExtras({ salario: num(v, "salario"), divisor: num(v, "divisor", 220), adicionalBase: num(v, "adicionalBase"), horasMes: num(v, "horas"), percentual: num(v, "percentual", 50), meses: num(v, "meses", 12), diasUteis: num(v, "diasUteis", 25), diasDescanso: num(v, "diasDescanso", 5), noturno: bool(v, "noturno"), oj394Nova: bool(v, "oj394"), incluirFgtsMulta: bool(v, "multa40") });
      return {
        linhas: [
          { rotulo: "Salário-hora", valor: brl(r.hora) },
          { rotulo: "Valor da hora extra", valor: brl(r.valorHora) },
          { rotulo: "Horas extras (principal)", valor: brl(r.total) },
          { rotulo: "Reflexo em DSR", valor: brl(r.totalDsr) },
          { rotulo: "Reflexo em férias + 1/3", valor: brl(r.ferias) },
          { rotulo: "Reflexo em 13º", valor: brl(r.decimo) },
          { rotulo: "FGTS (8%)", valor: brl(r.fgts) },
          ...(r.multa ? [{ rotulo: "Multa de 40%", valor: brl(r.multa) }] : []),
          { rotulo: "Total", valor: brl(r.totalGeral), destaque: true },
        ],
        memoria: [...r.memoria, ...notas],
      };
    },
  };
}

function intervalo(id: string, nome: string, fundamento: string, minutosPadrao: number, notas: string[], preReformaPadrao = false): Calculadora {
  return form(id, 3, nome, fundamento, [SAL, DIVISOR, { id: "minutos", rotulo: "Minutos suprimidos por dia", tipo: "inteiro", padrao: minutosPadrao }, { id: "dias", rotulo: "Dias no período", tipo: "inteiro", padrao: 22 }, { id: "meses", rotulo: "Meses", tipo: "inteiro", padrao: 12 }, { id: "pre", rotulo: "Período anterior a 11/11/2017 (hora integral + reflexos)", tipo: "checkbox", padrao: preReformaPadrao }, { id: "percentual", rotulo: "Adicional (%)", tipo: "percentual", padrao: 50 }], (v) => {
    const hora = salarioHora(num(v, "salario"), num(v, "divisor", 220));
    const pre = bool(v, "pre");
    const minutos = num(v, "minutos", minutosPadrao);
    const horasDia = pre && id === "intrajornada" && minutos > 0 ? 1 : minutos / 60;
    const mensal = hora * (1 + num(v, "percentual", 50) / 100) * horasDia * num(v, "dias", 22);
    return comReflexos(mensal, num(v, "meses", 12), pre, [`${pre && id === "intrajornada" ? "Pré-reforma: hora integral do intervalo (Súmula 437, I)" : `${minutos} min/dia suprimidos`} × ${num(v, "dias", 22)} dias × hora com adicional (${brl(hora * (1 + num(v, "percentual", 50) / 100))}).`, pre ? "Natureza salarial (reflexos) para o período anterior à Lei 13.467/2017." : "Após a Reforma: natureza indenizatória, só o período suprimido (art. 71, §4º).", ...notas]);
  });
}

function tempoFracao(id: string, nome: string, fundamento: string, fracao: number, nota: string): Calculadora {
  return form(id, 3, nome, fundamento, [SAL, DIVISOR, { id: "horas", rotulo: "Horas no mês", tipo: "numero" }, { id: "meses", rotulo: "Meses", tipo: "inteiro", padrao: 12 }, { id: "reflexos", rotulo: "Reflexos", tipo: "checkbox", padrao: true }], (v) => {
    const mensal = salarioHora(num(v, "salario"), num(v, "divisor", 220)) * fracao * num(v, "horas");
    return comReflexos(mensal, num(v, "meses", 12), bool(v, "reflexos"), [`Hora normal × ${dec(fracao, 4)} × ${num(v, "horas")} h = ${brl(mensal)} por mês.`, nota]);
  });
}

export const TRAB_SECAO_3: Calculadora[] = [
  form("cartao-ponto", 3, "Apuração de cartões de ponto (minutos residuais)", "CLT, art. 58, §1º; Súmula 366/TST", [{ id: "marcacoes", rotulo: "Marcações (uma por dia: dd/mm entrada saída entrada saída)", tipo: "textoLongo", largura: "inteira", padrao: "02/01 07:52 12:00 13:00 17:15" }, { id: "jornada", rotulo: "Jornada diária contratual (hh:mm)", tipo: "texto", padrao: "08:00" }], (v) => {
    const [jh, jm] = txt(v, "jornada", "08:00").split(":").map(Number);
    const jornada = jh * 60 + (jm || 0);
    let extras = 0;
    const linhas = txt(v, "marcacoes").split("\n").filter((l) => l.trim()).map((l) => {
      const p = l.trim().split(/\s+/);
      const mins = p.slice(1).map((h) => { const [a, b] = h.split(":").map(Number); return a * 60 + (b || 0); });
      let trab = 0;
      for (let i = 0; i + 1 < mins.length; i += 2) trab += mins[i + 1] - mins[i];
      const dif = trab - jornada;
      const conta = Math.abs(dif) > 10 ? dif : 0; // tolerância de 10 min/dia (art. 58, §1º)
      extras += Math.max(0, conta);
      return [p[0], `${Math.floor(trab / 60)}h${String(trab % 60).padStart(2, "0")}`, `${dif >= 0 ? "+" : ""}${dif} min`, conta > 0 ? `${conta} min extra` : "dentro da tolerância"];
    });
    return { linhas: [{ rotulo: "Horas extras apuradas", valor: `${Math.floor(extras / 60)}h${String(extras % 60).padStart(2, "0")} (${dec(extras / 60, 2)} h centesimais)`, destaque: true }], memoria: ["Variações de até 5 minutos por marcação, limitadas a 10 minutos diários, não são computadas; ultrapassado o limite, conta-se todo o tempo excedente (Súmula 366/TST)."], tabela: { colunas: ["Dia", "Trabalhado", "Diferença", "Situação"], linhas } };
  }),
  he("he-50", 3, "Horas extras 50% (dias úteis)", "CF, art. 7º, XVI; CLT, art. 59"),
  he("he-convencional", 3, "Horas extras 60%, 70%, 75%, 80% (convencionais)", "CCT/ACT", { percentual: 70 }),
  he("he-100", 3, "Horas extras 100% (domingos e feriados)", "Lei 605/49, art. 9º; Súmula 146/TST", { percentual: 100 }),
  he("he-12x36", 3, "Horas extras em escala 12x36 (feriados e prorrogações)", "CLT, art. 59-A; Súmula 444/TST", { divisor: "210", percentual: 50 }, ["12x36: feriados e prorrogação noturna já compensados após a Reforma (art. 59-A, parágrafo único); antes, feriado em dobro (Súmula 444). Divisor usual 210."]),
  he("he-turnos", 3, "Turnos ininterruptos de revezamento (acima da 6ª hora — divisor 180)", "CF, art. 7º, XIV; Súmula 423/TST", { divisor: "180" }),
  he("he-bancario", 3, "Bancário (7ª e 8ª horas — divisor 180/220)", "CLT, art. 224; Súmula 124 e Tema 2 IRR/TST", { divisor: "180" }, ["Divisor 180 (6h) ou 220 (8h, cargo de confiança do §2º) — Tema 2 IRR/TST."]),
  he("he-digitador", 3, "Digitador / telemarketing (acima da 6ª hora / 36ª semanal)", "NR-17, Anexo II; CLT, art. 227 por analogia", { divisor: "180" }),
  he("he-motorista", 3, "Motorista profissional (Lei 13.103/2015)", "CLT, arts. 235-A a 235-H", {}, ["Jornada de 8h + até 2h extras (ou 4h por norma coletiva); tempo de espera e reserva têm cálculos próprios nesta seção."]),
  form("he-comissionista", 3, "Adicional de horas extras sobre comissões (Súmula 340 e OJ 397)", "Súmula 340/TST; OJ 397/SDI-1", [{ id: "comissoes", rotulo: "Comissões do mês", tipo: "moeda" }, { id: "horasTrab", rotulo: "Horas trabalhadas no mês (normais + extras)", tipo: "numero", padrao: 250 }, { id: "horasExtras", rotulo: "Horas extras", tipo: "numero" }, { id: "fixo", rotulo: "Parte fixa do salário", tipo: "moeda" }, DIVISOR, { id: "meses", rotulo: "Meses", tipo: "inteiro", padrao: 12 }], (v) => {
    const adicionalComissao = (num(v, "comissoes") / (num(v, "horasTrab") || 1)) * 0.5 * num(v, "horasExtras");
    const fixo = salarioHora(num(v, "fixo"), num(v, "divisor", 220)) * 1.5 * num(v, "horasExtras");
    return comReflexos(adicionalComissao + fixo, num(v, "meses", 12), true, ["Comissionista puro: só o adicional de 50% sobre o valor-hora das comissões (comissões ÷ horas trabalhadas) — Súmula 340.", "Comissionista misto: parte fixa com hora + adicional; parte variável só o adicional (OJ 397)."]);
  }),
  he("compensacao-sumula85", 3, "Descaracterização do acordo de compensação (Súmula 85, IV)", "Súmula 85, III e IV/TST", { percentual: 50 }, ["Horas destinadas à compensação: só o adicional; as que ultrapassam a jornada semanal: hora + adicional (Súmula 85, IV). Informe aqui as horas que ultrapassam a jornada semanal e use o cálculo de adicional para as demais."]),
  he("banco-horas", 3, "Descaracterização do banco de horas", "CLT, art. 59, §§2º e 5º", { percentual: 50 }, ["Banco de horas inválido: horas excedentes pagas como extras (hora + adicional). A Súmula 85 não se aplica ao banco de horas (item V)."]),
  he("in-itinere", 3, "Horas in itinere (períodos anteriores à Reforma)", "CLT, art. 58, §2º (redação anterior); Súmula 90/TST", { percentual: 50 }, ["Somente até 10/11/2017 (Lei 13.467/2017 suprimiu o direito)."]),
  he("tempo-disposicao", 3, "Tempo à disposição (uniforme, deslocamento interno, espera)", "CLT, art. 4º e §2º; Súmula 429/TST", { percentual: 50 }, ["Após a Reforma, troca de uniforme não é tempo à disposição quando não obrigatória no local (art. 4º, §2º, VIII)."]),
  intervalo("intrajornada", "Intervalo intrajornada suprimido (art. 71, §4º)", "CLT, art. 71, §4º; Súmula 437/TST", 60, []),
  intervalo("interjornadas", "Intervalo interjornadas suprimido (11 horas — art. 66)", "CLT, art. 66; OJ 355/SDI-1", 60, ["Horas subtraídas do intervalo de 11h pagas como extras (OJ 355)."], true),
  intervalo("art384", "Intervalo do art. 384 da CLT (15 min da mulher — pré-Reforma)", "CLT, art. 384 (revogado); Tema 528/STF", 15, ["Devido até 10/11/2017 antes da jornada extraordinária."], true),
  intervalo("intervalo-digitador", "Intervalo de digitador (10 min a cada 90 min — art. 72)", "CLT, art. 72; Súmula 346/TST", 40, ["Ex.: jornada de 6h = 4 intervalos de 10 min."], true),
  intervalo("intervalo-termico", "Intervalo térmico / câmaras frias (art. 253)", "CLT, art. 253; Súmula 438/TST", 60, ["20 min a cada 1h40 de trabalho em ambiente artificialmente frio."], true),
  intervalo("intervalo-minas", "Intervalo de minas de subsolo (15 min a cada 3 horas — art. 298)", "CLT, art. 298", 30, [], true),
  intervalo("intervalo-amamentacao", "Intervalo de amamentação suprimido (2 × 30 min — art. 396)", "CLT, art. 396", 60, ["Até a criança completar 6 meses."], true),
  intervalo("intervalo-rural", "Intervalo rural / usos e costumes (Lei 5.889/73, art. 5º)", "Lei 5.889/73, art. 5º; Decreto 73.626/74", 60, []),
  tempoFracao("tempo-espera", "Tempo de espera do motorista (30% — art. 235-C, §9º)", "CLT, art. 235-C, §§8º e 9º; ADI 5.322/STF", 0.3, "O STF (ADI 5.322, 2023) declarou inconstitucional a exclusão do tempo de espera da jornada; pode configurar hora extra integral."),
  tempoFracao("tempo-reserva", "Tempo de reserva do motorista (30% — art. 235-E)", "CLT, art. 235-E, §6º", 0.3, "Revezamento com veículo em movimento; tempo de reserva remunerado na razão de 30% da hora normal."),
  tempoFracao("sobreaviso", "Horas de sobreaviso (1/3 da hora normal)", "CLT, art. 244, §2º; Súmula 428/TST", 1 / 3, "Uso de celular por si só não caracteriza sobreaviso; exige estado de disponibilidade com restrição (Súmula 428)."),
  tempoFracao("prontidao", "Horas de prontidão (2/3 da hora normal)", "CLT, art. 244, §3º", 2 / 3, "Empregado nas dependências da empresa aguardando ordens; até 12 horas."),
  form("supressao-he", 3, "Supressão de horas extras habituais (Súmula 291)", "Súmula 291/TST", [{ id: "mediaHoras", rotulo: "Média mensal de horas extras dos últimos 12 meses", tipo: "numero" }, { id: "valorHora", rotulo: "Valor da hora extra na supressão", tipo: "moeda" }, { id: "anos", rotulo: "Anos (ou fração ≥ 6 meses) de prestação habitual", tipo: "inteiro" }], (v) => {
    const valor = num(v, "mediaHoras") * num(v, "valorHora") * num(v, "anos");
    return { linhas: [{ rotulo: "Indenização", valor: brl(valor), destaque: true }], memoria: ["Um mês das horas suprimidas (média dos últimos 12 meses × valor da hora) por ano de prestação acima de 1 ano."] };
  }),
  he("domingos-feriados", 3, "Domingos e feriados trabalhados sem folga (pagamento em dobro)", "Lei 605/49, art. 9º; Súmula 146/TST", { percentual: 100 }),
  he("feriados", 3, "Feriados municipais, estaduais e nacionais trabalhados", "Lei 605/49; Lei 9.093/95", { percentual: 100 }),
];

// ---------------------------------------------------------------------------
// Seção 4 — adicional noturno
// ---------------------------------------------------------------------------

function noturno(id: string, nome: string, fundamento: string, pctPadrao: number, ficta: boolean, nota: string): Calculadora {
  return form(id, 4, nome, fundamento, [SAL, { id: "adicionalBase", rotulo: "Adicionais na base (periculosidade etc.)", tipo: "moeda" }, DIVISOR, { id: "horas", rotulo: "Horas noturnas por mês (relógio)", tipo: "numero" }, { id: "pct", rotulo: "Adicional (%)", tipo: "percentual", padrao: pctPadrao }, { id: "meses", rotulo: "Meses", tipo: "inteiro", padrao: 12 }, { id: "diasUteis", rotulo: "Dias úteis", tipo: "inteiro", padrao: 25 }, { id: "diasDescanso", rotulo: "Domingos/feriados", tipo: "inteiro", padrao: 5 }], (v) => {
    const hora = salarioHora(num(v, "salario") + num(v, "adicionalBase"), num(v, "divisor", 220));
    const horas = ficta ? num(v, "horas") * (60 / 52.5) : num(v, "horas");
    const mensal = hora * (num(v, "pct", pctPadrao) / 100) * horas;
    const dsr = (mensal / (num(v, "diasUteis", 25) || 1)) * num(v, "diasDescanso", 5);
    const r = comReflexos(mensal + dsr, num(v, "meses", 12), true, [`Hora ${brl(hora)} × ${num(v, "pct", pctPadrao)}% × ${dec(horas, 2)} h${ficta ? " (convertidas pela hora ficta de 52min30s — fator 1,142857)" : " (sem redução ficta)"} = ${brl(mensal)}; DSR ${brl(dsr)}.`, nota]);
    return r;
  });
}

export const TRAB_SECAO_4: Calculadora[] = [
  form("hora-ficta", 4, "Redução ficta da hora noturna (52min30s / fator 1,142857)", "CLT, art. 73, §1º", [{ id: "horaInicio", rotulo: "Início (hh:mm)", tipo: "texto", padrao: "22:00" }, { id: "horaFim", rotulo: "Fim (hh:mm)", tipo: "texto", padrao: "05:00" }], (v) => {
    const m = (h: string) => { const [a, b] = h.split(":").map(Number); return (Number.isFinite(a) ? a : 0) * 60 + (Number.isFinite(b) ? b : 0); };
    let dur = m(txt(v, "horaFim", "05:00")) - m(txt(v, "horaInicio", "22:00"));
    if (dur < 0) dur += 1440;
    return { linhas: [{ rotulo: "Horas de relógio", valor: dec(dur / 60, 2) }, { rotulo: "Horas noturnas fictas", valor: dec(dur / 52.5, 4), destaque: true }], memoria: ["Cada 52min30s noturnos equivalem a 1 hora: 7 horas de relógio (22h–5h) = 8 horas fictas."] };
  }),
  noturno("noturno-urbano", "Adicional noturno urbano (20% — 22h às 5h)", "CLT, art. 73", 20, true, "Súmula 60, I: o adicional pago com habitualidade integra o salário."),
  noturno("noturno-prorrogacao", "Prorrogação da hora noturna após as 5h (Súmula 60, II)", "Súmula 60, II/TST", 20, true, "Cumprida integralmente a jornada noturna e prorrogada, o adicional incide sobre as horas prorrogadas."),
  noturno("noturno-lavoura", "Adicional noturno rural na lavoura (25% — 21h às 5h)", "Lei 5.889/73, art. 7º", 25, false, "Sem redução ficta da hora."),
  noturno("noturno-pecuaria", "Adicional noturno rural na pecuária (25% — 20h às 4h)", "Lei 5.889/73, art. 7º", 25, false, "Sem redução ficta da hora."),
  noturno("noturno-advogado", "Adicional noturno de advogado (25%)", "Lei 8.906/94, art. 20, §3º", 25, false, "Advogado empregado: trabalho das 20h às 5h com adicional de 25%."),
  noturno("noturno-portuario", "Adicional noturno de portuário", "Lei 4.860/65, art. 4º; OJ 60/SDI-1", 20, false, "Hora noturna de 60 minutos para o portuário (OJ 60/SDI-1)."),
  he("he-noturna", 4, "Hora extra noturna (hora + 20% + 50%)", "CLT, art. 73; OJ 97/SDI-1", { noturno: true }, ["OJ 97: o adicional noturno integra a base das horas extras noturnas."]),
  intervalo("intrajornada-noturno", "Intervalo intrajornada noturno (com adicional noturno)", "CLT, arts. 71 e 73", 60, ["Inclua o adicional noturno na base do salário-hora (OJ 97)."]),
];

// ---------------------------------------------------------------------------
// Seção 5 — adicionais
// ---------------------------------------------------------------------------

export const TRAB_SECAO_5: Calculadora[] = [
  percentual("insalubridade-10", 5, "Insalubridade grau mínimo (10%)", "CLT, art. 192; NR-15", 10, "Salário mínimo (ou piso normativo)"),
  percentual("insalubridade-20", 5, "Insalubridade grau médio (20%)", "CLT, art. 192; NR-15", 20, "Salário mínimo (ou piso normativo)"),
  percentual("insalubridade-40", 5, "Insalubridade grau máximo (40%)", "CLT, art. 192; NR-15", 40, "Salário mínimo (ou piso normativo)"),
  form("insalubridade-diferenca", 5, "Diferenças de grau de insalubridade (ex.: 20% → 40%)", "CLT, art. 192", [{ id: "base", rotulo: "Base (salário mínimo)", tipo: "moeda", padrao: 1621 }, { id: "pago", rotulo: "Grau pago (%)", tipo: "percentual", padrao: 20 }, { id: "devido", rotulo: "Grau devido (%)", tipo: "percentual", padrao: 40 }, { id: "meses", rotulo: "Meses", tipo: "inteiro", padrao: 12 }], (v) => comReflexos((num(v, "base") * (num(v, "devido", 40) - num(v, "pago", 20))) / 100, num(v, "meses", 12), true, ["Diferença mensal = base × (grau devido − grau pago)."], true)),
  form("insalubridade-proporcional", 5, "Insalubridade proporcional aos dias trabalhados", "CLT, art. 192", [{ id: "base", rotulo: "Base", tipo: "moeda", padrao: 1621 }, { id: "pct", rotulo: "Grau (%)", tipo: "percentual", padrao: 20 }, { id: "dias", rotulo: "Dias trabalhados no mês", tipo: "inteiro", padrao: 15 }], (v) => ({ linhas: [{ rotulo: "Adicional proporcional", valor: brl((num(v, "base") * num(v, "pct", 20)) / 100 / 30 * num(v, "dias", 15)), destaque: true }], memoria: ["Adicional mensal ÷ 30 × dias de exposição no mês (admissão, demissão, afastamentos)."] })),
  percentual("periculosidade", 5, "Periculosidade (30% sobre o salário-base — art. 193)", "CLT, art. 193, §1º", 30, "Salário-base"),
  percentual("periculosidade-eletricitario", 5, "Periculosidade de eletricitário (base remuneratória — Súmula 191)", "Súmula 191, II e III/TST; Lei 12.740/12", 30, "Remuneração (contratos até 08/12/2012) ou salário-base", "Contratos anteriores à Lei 12.740/2012: base = totalidade das parcelas salariais (Súmula 191, II)."),
  percentual("periculosidade-motociclista", 5, "Periculosidade de motociclista (art. 193, §4º)", "CLT, art. 193, §4º; Portaria MTE 1.565/2014", 30, "Salário-base"),
  percentual("periculosidade-vigilante", 5, "Periculosidade de vigilante / segurança patrimonial", "CLT, art. 193, II; Anexo 3 da NR-16", 30, "Salário-base"),
  percentual("periculosidade-radiacao", 5, "Periculosidade por radiação ionizante", "OJ 345/SDI-1; Portaria MTE 518/2003", 30, "Salário-base"),
  percentual("periculosidade-inflamaveis", 5, "Periculosidade por inflamáveis e explosivos", "CLT, art. 193, I; NR-16; Súmula 364/TST", 30, "Salário-base"),
  form("insalubridade-x-periculosidade", 5, "Opção pelo adicional mais benéfico (Tema 17 IRR/TST)", "CLT, art. 193, §2º; Tema 17 IRR/TST", [{ id: "salario", rotulo: "Salário-base", tipo: "moeda" }, { id: "baseInsal", rotulo: "Base da insalubridade (SM)", tipo: "moeda", padrao: 1621 }, { id: "grau", rotulo: "Grau de insalubridade (%)", tipo: "percentual", padrao: 40 }], (v) => {
    const ins = (num(v, "baseInsal") * num(v, "grau", 40)) / 100;
    const per = num(v, "salario") * 0.3;
    return { linhas: [{ rotulo: "Insalubridade", valor: brl(ins) }, { rotulo: "Periculosidade", valor: brl(per) }, { rotulo: "Mais benéfico", valor: per >= ins ? "Periculosidade" : "Insalubridade", destaque: true }], memoria: ["Os adicionais não se acumulam, ainda que por fatos geradores distintos (Tema 17 IRR/TST); o empregado opta pelo mais vantajoso."] };
  }),
  percentual("penosidade", 5, "Adicional de penosidade (previsão normativa)", "CF, art. 7º, XXIII; CCT", 20, "Base prevista na norma"),
  percentual("risco-portuario", 5, "Adicional de risco portuário (40% — Lei 4.860/65)", "Lei 4.860/65, art. 14; OJ 316/SDI-1", 40, "Salário-hora × horas"),
];

// ---------------------------------------------------------------------------
// Seção 6 — diferenças salariais
// ---------------------------------------------------------------------------

function diferenca(id: string, nome: string, fundamento: string, nota: string, rotuloDevido = "Salário devido (paradigma/função)", rotuloPago = "Salário pago"): Calculadora {
  return form(id, 6, nome, fundamento, [{ id: "devido", rotulo: rotuloDevido, tipo: "moeda" }, { id: "pago", rotulo: rotuloPago, tipo: "moeda" }, { id: "meses", rotulo: "Meses", tipo: "inteiro", padrao: 12 }, { id: "multa40", rotulo: "Multa de 40% do FGTS", tipo: "checkbox", padrao: true }], (v) => comReflexos(Math.max(0, num(v, "devido") - num(v, "pago")), num(v, "meses", 12), true, ["Diferença mensal = salário devido − salário pago, com reflexos.", nota], bool(v, "multa40")));
}

export const TRAB_SECAO_6: Calculadora[] = [
  diferenca("equiparacao", "Equiparação salarial (art. 461)", "CLT, art. 461; Súmula 6/TST", "Requisitos: mesma função, mesmo empregador e estabelecimento, diferença de tempo na função ≤ 2 anos e na empresa ≤ 4 anos (pós-Reforma)."),
  diferenca("desvio-funcao", "Desvio de função (OJ 125/SDI-1)", "OJ 125/SDI-1", "O desvio gera só diferenças salariais, não reenquadramento.", "Salário da função exercida"),
  percentual("acumulo-funcao", 6, "Acúmulo de função (plus salarial)", "CLT, art. 456, parágrafo único; Lei 6.615/78, art. 13", 20, "Salário-base", "Sem previsão legal ou normativa, o plus é arbitrado (jurisprudência entre 10% e 40%)."),
  diferenca("salario-substituicao", "Salário substituição (Súmula 159)", "Súmula 159/TST", "Devido enquanto perdurar a substituição não eventual.", "Salário do substituído"),
  diferenca("reenquadramento", "Reenquadramento e progressão em PCS", "Súmula 452/TST", "Prescrição parcial em progressões não concedidas (Súmula 452).", "Salário do nível devido"),
  diferenca("reajuste-cct", "Reajustes de CCT/ACT não concedidos", "CLT, art. 611; CCT", "Aplique o reajuste da norma sobre o salário da data-base.", "Salário reajustado devido"),
  diferenca("comissoes-estornadas", "Comissões não pagas ou estornadas indevidamente", "CLT, art. 466; Lei 3.207/57", "Estorno só por insolvência do comprador (art. 7º da Lei 3.207/57).", "Comissões devidas"),
  diferenca("comissoes-prazo", "Comissões sobre vendas a prazo pós-rescisão (art. 466)", "CLT, art. 466, §2º", "As comissões são devidas mesmo após a cessação do contrato, conforme as parcelas pagas.", "Comissões das parcelas recebidas"),
  diferenca("premios", "Diferenças de prêmios / bônus / gratificações habituais", "CLT, art. 457, §§2º e 4º", "Após a Reforma, prêmios por desempenho superior não integram a remuneração (art. 457, §2º).", "Valor devido"),
  percentual("gorjetas", 6, "Integração de gorjetas (Súmula 354)", "CLT, art. 457, §3º; Súmula 354/TST", 100, "Média mensal das gorjetas", "Gorjetas integram 13º, férias e FGTS, mas não aviso, adicional noturno, HE e DSR."),
  percentual("diarias", 6, "Integração de ajuda de custo e diárias (excedentes a 50% — pré-Reforma)", "CLT, art. 457, §2º (redação anterior); Súmula 101/TST", 100, "Diárias mensais", "Até 10/11/2017 integravam o salário quando excedentes a 50% do salário."),
  percentual("quebra-caixa", 6, "Integração de quebra de caixa (Súmula 247)", "Súmula 247/TST", 100, "Valor mensal da quebra de caixa"),
  percentual("transferencia", 6, "Adicional de transferência provisória (25%)", "CLT, art. 469, §3º; OJ 113/SDI-1", 25, "Salário"),
  diferenca("gratificacao-funcao", "Gratificação de função (incorporação — Súmula 372, pré-Reforma)", "Súmula 372/TST; CLT, art. 468, §2º", "Gratificação recebida por 10+ anos até 11/11/2017 incorpora; após a Reforma, não (art. 468, §2º).", "Gratificação devida", "Gratificação paga"),
  diferenca("plr", "Diferenças de PLR (Lei 10.101/2000)", "Lei 10.101/2000; Súmula 451/TST", "PLR não integra a remuneração (sem reflexos — desmarque); rescisão antecipada dá direito proporcional (Súmula 451).", "PLR devida", "PLR paga"),
  percentual("direito-arena", 6, "Direito de arena (atletas — Lei Pelé)", "Lei 9.615/98, art. 42, §1º", 5, "Receita dos direitos de transmissão (cota do atleta)", "5% da receita de transmissão, divididos entre os atletas; natureza civil."),
  percentual("luvas-bichos", 6, "Luvas e bichos (atletas profissionais)", "Lei 9.615/98, art. 31, §1º", 100, "Valor pago", "Luvas e bichos habituais têm natureza salarial e geram reflexos."),
];

// ---------------------------------------------------------------------------
// Seção 7 — reflexos
// ---------------------------------------------------------------------------

function reflexo(id: string, nome: string, fundamento: string, alvo: "dsr" | "ferias" | "13" | "aviso" | "fgts" | "todos", nota: string): Calculadora {
  return form(id, 7, nome, fundamento, [{ id: "media", rotulo: "Média mensal da verba (ou total no período)", tipo: "moeda" }, { id: "meses", rotulo: "Meses", tipo: "inteiro", padrao: 12 }, { id: "diasUteis", rotulo: "Dias úteis", tipo: "inteiro", padrao: 25 }, { id: "diasDescanso", rotulo: "Domingos/feriados", tipo: "inteiro", padrao: 5 }, { id: "diasAviso", rotulo: "Dias de aviso prévio", tipo: "inteiro", padrao: 30 }], (v) => {
    const m = num(v, "media");
    const meses = num(v, "meses", 12);
    const dsr = (m / (num(v, "diasUteis", 25) || 1)) * num(v, "diasDescanso", 5) * meses;
    const total = m * meses;
    const ferias = (total / 12) * (4 / 3);
    const decimo = total / 12;
    const aviso = (m / 30) * num(v, "diasAviso", 30);
    const fgts = (total + decimo + aviso) * 0.08;
    const tudo = [
      { k: "dsr", rotulo: "Reflexo em DSR", valor: dsr },
      { k: "ferias", rotulo: "Reflexo em férias + 1/3", valor: ferias },
      { k: "13", rotulo: "Reflexo em 13º", valor: decimo },
      { k: "aviso", rotulo: "Reflexo em aviso prévio", valor: aviso },
      { k: "fgts", rotulo: "Reflexo em FGTS (8%)", valor: fgts },
      { k: "fgts", rotulo: "Multa de 40% sobre o FGTS", valor: fgts * 0.4 },
    ];
    const lista = alvo === "todos" ? tudo : tudo.filter((x) => x.k === alvo);
    return { linhas: [...lista.map((x) => ({ rotulo: x.rotulo, valor: brl(x.valor) })), { rotulo: "Total dos reflexos", valor: brl(lista.reduce((s, x) => s + x.valor, 0)), destaque: true }], memoria: [nota] };
  });
}

export const TRAB_SECAO_7: Calculadora[] = [
  reflexo("reflexo-he-dsr", "Reflexos de horas extras em DSR", "Súmula 172/TST; Lei 605/49, art. 7º", "dsr", "DSR = (verba do mês ÷ dias úteis) × domingos e feriados."),
  reflexo("reflexo-noturno-dsr", "Reflexos do adicional noturno em DSR", "Súmula 60/TST; Lei 605/49", "dsr", "O adicional noturno habitual integra o DSR."),
  reflexo("reflexo-comissoes-dsr", "Reflexos de comissões e prêmios em DSR", "Súmula 27/TST", "dsr", "Comissionista tem direito ao DSR sobre as comissões (Súmula 27)."),
  reflexo("reflexo-ferias", "Reflexos de variáveis em férias + 1/3", "CLT, art. 142, §§5º e 6º", "ferias", "Média duodecimal das variáveis no período aquisitivo × 4/3."),
  reflexo("reflexo-13", "Reflexos de variáveis em 13º", "Súmula 45/TST", "13", "Média das variáveis do ano ÷ 12 por avo."),
  reflexo("reflexo-aviso", "Reflexos de variáveis em aviso prévio indenizado", "CLT, art. 487, §§3º e 5º", "aviso", "Média dos últimos 12 meses no aviso (art. 487, §3º)."),
  reflexo("reflexo-fgts", "Reflexos de variáveis em FGTS + 40%", "Súmula 63/TST", "fgts", "FGTS sobre a verba e seus reflexos salariais (não sobre férias indenizadas — OJ 195)."),
  form("oj394", 7, "OJ 394 da SDI-1 (DSR majorado — bis in idem)", "OJ 394/SDI-1; IncJulgRREmbRep-10169-57.2013 (20/03/2023)", [{ id: "he", rotulo: "Horas extras do período", tipo: "moeda" }, { id: "dsr", rotulo: "DSR sobre HE", tipo: "moeda" }, { id: "periodo", rotulo: "Período", tipo: "select", opcoes: [{ valor: "antes", rotulo: "Até 19/03/2023 (OJ 394 original)" }, { valor: "depois", rotulo: "A partir de 20/03/2023 (nova tese)" }], padrao: "depois" }], (v) => {
    const base = txt(v, "periodo") === "antes" ? num(v, "he") : num(v, "he") + num(v, "dsr");
    return { linhas: [{ rotulo: "Base dos reflexos em férias, 13º, aviso e FGTS", valor: brl(base), destaque: true }, { rotulo: "Férias + 1/3", valor: brl((base / 12) * (4 / 3)) }, { rotulo: "13º", valor: brl(base / 12) }], memoria: ["Até 19/03/2023, o DSR majorado pelas HE não repercute nas demais verbas (OJ 394). Para as horas extras trabalhadas a partir de 20/03/2023, o TST passou a admitir a repercussão."] };
  }),
  reflexo("reflexo-adicionais-he", "Reflexos de insalubridade/periculosidade em HE e adicional noturno", "Súmulas 132 e 139/TST; OJ 47/SDI-1", "todos", "O adicional integra a base de cálculo das horas extras e do adicional noturno."),
  reflexo("reflexo-equiparacao", "Reflexos de equiparação / desvio de função em todas as verbas", "Súmula 6/TST", "todos", "Diferenças salariais refletem em todas as verbas salariais e rescisórias."),
];

export { diaN };
