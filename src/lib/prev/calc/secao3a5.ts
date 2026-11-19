// Seções 3, 4 e 5: simuladores rápidos de cada regra de aposentadoria do RGPS.
// Montam um histórico sintético a partir dos números informados e avaliam a
// regra com o mesmo motor do cálculo completo (lib/prev/rgps).

import { DIAS_ANO, EC103, competencia, deDiaN, diaN, fmtData, idadeEm, somaComp } from "../datas";
import { incapacidadePermanente } from "../beneficios";
import { calcularMedia, limitarRenda, type SalarioContribuicao } from "../media";
import { REGRAS_RGPS, avaliarRegra, type GrauPcd, type ResultadoRegra } from "../rgps";
import { arred, salarioMinimo } from "../tabelas";
import { montarLinha, type Periodo, type TipoPeriodo } from "../tempo";
import { SEXO, brl, bool, lerSalarios, num, pct, txt, type Calculadora, type Campo, type Saida, type Valores } from "./tipos";

const CAMPOS_REGRA: Campo[] = [
  SEXO,
  { id: "nascimento", rotulo: "Data de nascimento", tipo: "data", obrigatorio: true },
  { id: "der", rotulo: "DER (data do requerimento)", tipo: "data", obrigatorio: true },
  { id: "filiacao", rotulo: "Primeira filiação ao RGPS", tipo: "data", ajuda: "Define se o segurado tem direito às transições (filiado até 13/11/2019)." },
  { id: "tAnos", rotulo: "Tempo total na DER — anos", tipo: "inteiro" },
  { id: "tMeses", rotulo: "meses", tipo: "inteiro" },
  { id: "t0Anos", rotulo: "Tempo em 13/11/2019 — anos", tipo: "inteiro" },
  { id: "t0Meses", rotulo: "meses", tipo: "inteiro" },
  { id: "tipo", rotulo: "Natureza do tempo", tipo: "select", opcoes: [{ valor: "comum", rotulo: "Comum" }, { valor: "especial25", rotulo: "Especial 25 anos" }, { valor: "especial20", rotulo: "Especial 20 anos" }, { valor: "especial15", rotulo: "Especial 15 anos" }], padrao: "comum" },
  { id: "professor", rotulo: "Todo o tempo é de magistério", tipo: "checkbox" },
  { id: "pcd", rotulo: "Grau de deficiência (LC 142)", tipo: "select", opcoes: [{ valor: "", rotulo: "Sem deficiência" }, { valor: "leve", rotulo: "Leve" }, { valor: "moderada", rotulo: "Moderada" }, { valor: "grave", rotulo: "Grave" }], padrao: "" },
  { id: "media", rotulo: "Média dos salários (valor atual)", tipo: "moeda" },
];

/** Monta períodos e salários sintéticos a partir dos números do formulário. */
function historico(v: Valores) {
  const der = txt(v, "der");
  const total = (num(v, "tAnos") + num(v, "tMeses") / 12) * DIAS_ANO;
  const t0 = Math.min(total, (num(v, "t0Anos") + num(v, "t0Meses") / 12) * DIAS_ANO);
  const tipo = txt(v, "tipo", "comum") as TipoPeriodo;
  const extra: Partial<Periodo> = { tipo, professor: bool(v, "professor"), pcd: !!txt(v, "pcd") };
  const periodos: Periodo[] = [];
  const antes = der <= EC103 ? total : t0;
  const fimA = der <= EC103 ? der : EC103;
  if (antes > 0) periodos.push({ id: "a", inicio: deDiaN(diaN(fimA) - Math.round(antes) + 1), fim: fimA, tipo, ...extra });
  const depois = total - antes;
  if (der > EC103 && depois > 0) {
    const inicioB = Math.max(diaN(EC103) + 1, diaN(der) - Math.round(depois) + 1);
    periodos.push({ id: "b", inicio: deDiaN(inicioB), fim: der, tipo, ...extra });
  }
  // Filiação informada mais antiga que o tempo (ex.: períodos sem contribuição).
  const filiacao = txt(v, "filiacao");
  if (filiacao && periodos.length && filiacao < periodos[0].inicio) {
    periodos.unshift({ id: "f", inicio: filiacao, fim: filiacao, tipo: "comum", carencia: false });
  }
  const media = num(v, "media");
  const salarios: SalarioContribuicao[] = [];
  if (media > 0) {
    for (const p of periodos) {
      for (let c = competencia(p.inicio) < "1994-07" ? "1994-07" : competencia(p.inicio); c <= competencia(p.fim); c = somaComp(c, 1)) {
        salarios.push({ comp: c, valor: media });
      }
    }
  }
  return { periodos, salarios };
}

function saidaRegra(r: ResultadoRegra, extra: string[] = []): Saida {
  const linhas = [
    { rotulo: "Situação", valor: !r.aplicavel ? `Não se aplica — ${r.motivoNaoAplicavel}` : r.cumpre ? "Requisitos cumpridos" : "Requisitos ainda não cumpridos", destaque: true },
    ...r.requisitos.map((q) => ({ rotulo: `${q.ok ? "✔" : "✘"} ${q.nome}`, valor: `exigido ${q.exigido} · atual ${q.atual}` })),
  ];
  if (r.aplicavel) {
    linhas.push({ rotulo: "Coeficiente", valor: pct(r.coeficiente) });
    if (r.fator) linhas.push({ rotulo: "Fator previdenciário", valor: `${r.fator.valor.toFixed(4)}${r.fator.aplicado ? "" : " (não aplicado)"}` });
    linhas.push({ rotulo: "RMI estimada", valor: brl(r.rmiNaDer || r.rmi), destaque: true });
  }
  return { linhas, memoria: [`Fundamento: ${r.fundamento}.`, `Requisitos verificados em ${fmtData(r.dataAvaliacao)}.`, ...r.memoria, ...extra], avisos: r.observacoes };
}

function simuladorRegra(idRegra: string, secao: number, nome: string, preset: Valores = {}): Calculadora {
  const def = REGRAS_RGPS.find((d) => d.id === idRegra)!;
  return {
    id: `regra-${idRegra}${preset.tipo && preset.tipo !== "comum" ? `-${preset.tipo}` : ""}${preset.pcd ? `-${preset.pcd}` : ""}`,
    secao,
    nome,
    fundamento: def.fundamento,
    modo: "form",
    aba: "regras",
    campos: CAMPOS_REGRA.map((c) => (preset[c.id] !== undefined ? { ...c, padrao: preset[c.id] as string | number | boolean } : c)),
    calcular: (v, ctx) => {
      const vals = { ...preset, ...v };
      if (!txt(vals, "nascimento") || !txt(vals, "der")) return { linhas: [], memoria: ["Informe nascimento e DER."] };
      const { periodos, salarios } = historico(vals);
      const sexo = txt(vals, "sexo", "M") as "M" | "F";
      const r = avaliarRegra(def, {
        segurado: { nome: "", sexo, nascimento: txt(vals, "nascimento"), der: txt(vals, "der"), pcdGrau: (txt(vals, "pcd") || null) as GrauPcd | null },
        linha: montarLinha(periodos, sexo, txt(vals, "der")),
        salarios,
        indices: ctx.indices,
      });
      return saidaRegra(r, ["Simulação a partir dos totais informados. Para o cálculo exato use o cálculo completo com o CNIS."]);
    },
  };
}

// ---- Regras que não estão no motor principal ----

const CAMPOS_IDADE_RURAL: Campo[] = [
  SEXO,
  { id: "nascimento", rotulo: "Nascimento", tipo: "data" },
  { id: "der", rotulo: "DER", tipo: "data" },
  { id: "rural", rotulo: "Meses de atividade rural", tipo: "inteiro" },
  { id: "urbano", rotulo: "Meses de contribuição urbana", tipo: "inteiro" },
  { id: "media", rotulo: "Média dos salários urbanos (híbrida)", tipo: "moeda" },
];

function idadeRural(v: Valores, hibrida: boolean): Saida {
  const sexo = txt(v, "sexo", "M");
  const der = txt(v, "der");
  const nasc = txt(v, "nascimento");
  if (!der || !nasc) return { linhas: [], memoria: ["Informe nascimento e DER."] };
  const idade = idadeEm(nasc, der);
  const rural = num(v, "rural");
  const urbano = num(v, "urbano");
  const idadeMin = hibrida ? (sexo === "M" ? 65 : der > EC103 ? Math.min(62, 60 + Math.max(0, Number(der.slice(0, 4)) - 2019) * 0.5) : 60) : sexo === "M" ? 60 : 55;
  const meses = hibrida ? rural + urbano : rural;
  const ok = idade + 1e-9 >= idadeMin && meses >= 180;
  let rmi = salarioMinimo(competencia(der));
  const memoria: string[] = [];
  if (hibrida) {
    const media = num(v, "media");
    const anos = Math.floor(meses / 12);
    const coef = der > EC103 ? 0.6 + 0.02 * Math.max(0, anos - (sexo === "M" ? 20 : 15)) : Math.min(1, 0.7 + 0.01 * anos);
    rmi = limitarRenda(media * coef, der).valor;
    memoria.push("Híbrida: soma tempo rural (inclusive remoto, Tema 1.007/STJ) e urbano; idade urbana.", `Renda: média ${brl(media)} × ${pct(coef)} (o tempo rural sem contribuição entra como salário mínimo na média).`);
  } else {
    memoria.push("Segurado especial: idade reduzida em 5 anos e renda de um salário mínimo (Lei 8.213, arts. 39, I, e 48, §1º).");
  }
  return {
    linhas: [
      { rotulo: "Situação", valor: ok ? "Requisitos cumpridos" : "Requisitos não cumpridos", destaque: true },
      { rotulo: `${idade + 1e-9 >= idadeMin ? "✔" : "✘"} Idade`, valor: `exigida ${idadeMin} · atual ${idade.toFixed(2)}` },
      { rotulo: `${meses >= 180 ? "✔" : "✘"} Carência/atividade`, valor: `exigida 180 meses · atual ${meses}` },
      { rotulo: "RMI estimada", valor: brl(rmi), destaque: true },
    ],
    memoria,
  };
}

const CAMPOS_INCAP: Campo[] = [
  SEXO,
  { id: "dib", rotulo: "DIB", tipo: "data" },
  { id: "anos", rotulo: "Anos completos de contribuição", tipo: "numero" },
  { id: "media", rotulo: "Média dos salários", tipo: "moeda" },
  { id: "grande", rotulo: "Necessita assistência permanente (+25%)", tipo: "checkbox" },
];

function incap(v: Valores, modo: "comum" | "acidentaria" | "grave" | "pre", ctx: { indices: import("../indices").Indices; hoje: string }): Saida {
  const dib = txt(v, "dib") || ctx.hoje;
  const media = num(v, "media");
  const salarios = media ? [{ comp: somaComp(competencia(dib), -1), valor: media }] : [];
  const r = incapacidadePermanente({ salarios, dib: modo === "pre" ? (dib > EC103 ? EC103 : dib) : dib, indices: ctx.indices, sexo: txt(v, "sexo", "M") as "M" | "F", anosContribuicao: num(v, "anos"), acidentaria: modo === "acidentaria" || modo === "grave", grandeInvalidez: bool(v, "grande") });
  return {
    linhas: [{ rotulo: "Coeficiente", valor: pct(r.coeficiente) }, { rotulo: "RMI", valor: brl(r.rmi), destaque: true }, ...(r.acrescimo25 ? [{ rotulo: "Acréscimo de 25%", valor: brl(r.acrescimo25) }, { rotulo: "Total", valor: brl(r.total), destaque: true }] : [])],
    memoria: [
      ...r.memoria,
      ...(modo === "grave" ? ["Doença grave/incurável com 100%: tese judicial (inconstitucionalidade do art. 26, §2º, III, da EC 103 para essas hipóteses — tema em discussão). Confirme a jurisprudência do seu TRF."] : []),
    ],
  };
}

export const SECAO_3: Calculadora[] = [
  simuladorRegra("art19", 3, "Aposentadoria programada urbana (regra geral)"),
  simuladorRegra("art19-prof", 3, "Aposentadoria programada do professor", { professor: true }),
  { id: "idade-rural", secao: 3, nome: "Aposentadoria por idade do trabalhador rural", fundamento: "Lei 8.213/91, arts. 39, I, 48, §§1º e 2º; CF, art. 201, §7º, II", modo: "form", campos: CAMPOS_IDADE_RURAL, calcular: (v) => idadeRural(v, false) },
  { id: "idade-hibrida", secao: 3, nome: "Aposentadoria por idade híbrida (rural + urbano)", fundamento: "Lei 8.213/91, art. 48, §3º; Tema 1.007/STJ", modo: "form", campos: CAMPOS_IDADE_RURAL, calcular: (v) => idadeRural(v, true) },
  simuladorRegra("art19-especial", 3, "Aposentadoria especial de 15 anos (mineração subterrânea)", { tipo: "especial15" }),
  simuladorRegra("art19-especial", 3, "Aposentadoria especial de 20 anos (amianto e mineração)", { tipo: "especial20" }),
  simuladorRegra("art19-especial", 3, "Aposentadoria especial de 25 anos (agentes nocivos)", { tipo: "especial25" }),
  { id: "incap-comum", secao: 3, nome: "Incapacidade permanente comum (60% + 2%)", fundamento: "EC 103/2019, art. 26, §2º, III", modo: "form", campos: CAMPOS_INCAP, calcular: (v, c) => incap(v, "comum", c) },
  { id: "incap-acidentaria", secao: 3, nome: "Incapacidade permanente acidentária (100% da média)", fundamento: "EC 103/2019, art. 26, §3º, II", modo: "form", campos: CAMPOS_INCAP, calcular: (v, c) => incap(v, "acidentaria", c) },
  { id: "incap-grave", secao: 3, nome: "Incapacidade permanente por doença grave/incurável (100% — tese)", fundamento: "Lei 8.213/91, art. 151; tese de inconstitucionalidade do art. 26, §2º, III, EC 103", modo: "form", campos: CAMPOS_INCAP, calcular: (v, c) => incap(v, "grave", c) },
  simuladorRegra("pcd-tempo", 3, "PcD por tempo — grau grave (25/20 anos)", { pcd: "grave" }),
  simuladorRegra("pcd-tempo", 3, "PcD por tempo — grau moderado (29/24 anos)", { pcd: "moderada" }),
  simuladorRegra("pcd-tempo", 3, "PcD por tempo — grau leve (33/28 anos)", { pcd: "leve" }),
  simuladorRegra("pcd-idade", 3, "PcD por idade (60/55 anos)", { pcd: "leve" }),
];

export const SECAO_4: Calculadora[] = [
  simuladorRegra("art15", 4, "Transição por pontos (art. 15)"),
  simuladorRegra("art15-prof", 4, "Transição por pontos do professor", { professor: true }),
  simuladorRegra("art16", 4, "Transição da idade mínima progressiva (art. 16)"),
  simuladorRegra("art16-prof", 4, "Idade mínima progressiva do professor", { professor: true }),
  simuladorRegra("art17", 4, "Transição do pedágio de 50% (art. 17)"),
  simuladorRegra("art20", 4, "Transição do pedágio de 100% (art. 20)"),
  simuladorRegra("art20-prof", 4, "Pedágio de 100% do professor", { professor: true }),
  simuladorRegra("art18", 4, "Transição por idade urbana (art. 18)"),
  simuladorRegra("art21", 4, "Transição da aposentadoria especial por pontos (art. 21)", { tipo: "especial25" }),
];

const CAMPOS_PRE_EC20: Campo[] = [SEXO, { id: "tAnos", rotulo: "Tempo de serviço em 16/12/1998 — anos", tipo: "inteiro" }, { id: "tMeses", rotulo: "meses", tipo: "inteiro" }, { id: "media", rotulo: "Média dos últimos 36 salários", tipo: "moeda" }];

export const SECAO_5: Calculadora[] = [
  simuladorRegra("da-atc", 5, "Tempo de contribuição integral com fator previdenciário (Lei 9.876/99)"),
  simuladorRegra("da-atc", 5, "Tempo de contribuição pela regra 85/95 progressiva (Lei 13.183/2015)"),
  simuladorRegra("da-proporcional", 5, "Tempo de contribuição proporcional (EC 20/98 — pedágio 40%)"),
  {
    id: "atc-pre-ec20",
    secao: 5,
    nome: "Tempo de serviço anterior à EC 20/1998 (integral e proporcional)",
    fundamento: "Lei 8.213/91, arts. 52 e 53 (redação original); EC 20/98, art. 3º",
    modo: "form",
    campos: CAMPOS_PRE_EC20,
    calcular: (v) => {
      const sexo = txt(v, "sexo", "M");
      const anos = num(v, "tAnos") + num(v, "tMeses") / 12;
      const minimo = sexo === "M" ? 30 : 25;
      const integral = sexo === "M" ? 35 : 30;
      const ok = anos + 1e-9 >= minimo;
      const coef = anos >= integral ? 1 : Math.min(1, 0.7 + 0.06 * Math.floor(anos - minimo + 1e-9));
      return {
        linhas: [
          { rotulo: "Situação em 16/12/1998", valor: ok ? "Direito adquirido" : "Sem direito adquirido", destaque: true },
          { rotulo: "Coeficiente", valor: pct(ok ? coef : 0) },
          { rotulo: "RMI (sem fator previdenciário)", valor: brl(ok ? num(v, "media") * coef : 0), destaque: true },
        ],
        memoria: ["Até a EC 20/98: 70% + 6% por ano completo acima de 30/25 anos, até 100% aos 35/30; média dos últimos 36 salários, sem fator previdenciário.", "A renda deve ser reajustada da DIB hipotética (16/12/1998) até a DER pelos índices oficiais."],
      };
    },
  },
  simuladorRegra("da-idade", 5, "Aposentadoria por idade urbana (regra anterior à EC 103)"),
  {
    id: "idade-compulsoria",
    secao: 5,
    nome: "Aposentadoria por idade compulsória (requerida pela empresa — 70/65 anos)",
    fundamento: "Lei 8.213/91, art. 51",
    modo: "form",
    campos: [SEXO, { id: "nascimento", rotulo: "Nascimento", tipo: "data" }, { id: "der", rotulo: "Data do requerimento", tipo: "data" }, { id: "contrib", rotulo: "Contribuições", tipo: "inteiro" }, { id: "media", rotulo: "Média", tipo: "moeda" }],
    calcular: (v) => {
      const idade = txt(v, "nascimento") && txt(v, "der") ? idadeEm(txt(v, "nascimento"), txt(v, "der")) : 0;
      const exigida = txt(v, "sexo") === "F" ? 65 : 70;
      const coef = Math.min(1, 0.7 + 0.01 * Math.floor(num(v, "contrib") / 12));
      return {
        linhas: [{ rotulo: "Idade", valor: `${idade.toFixed(2)} (exigida ${exigida})` }, { rotulo: "Carência", valor: `${num(v, "contrib")} de 180` }, { rotulo: "Coeficiente", valor: pct(coef) }, { rotulo: "RMI", valor: brl(arred(num(v, "media") * coef)), destaque: true }],
        memoria: ["A empresa pode requerer a aposentadoria do empregado que cumpriu a carência e completou 70 (H) ou 65 (M) anos; é garantida a indenização trabalhista (art. 51)."],
      };
    },
  },
  simuladorRegra("da-especial", 5, "Aposentadoria especial pura sem idade mínima (antes da EC 103)", { tipo: "especial25" }),
  {
    id: "invalidez-pre",
    secao: 5,
    nome: "Aposentadoria por invalidez integral (100% da média dos 80% maiores)",
    fundamento: "Lei 8.213/91, art. 44 (redação anterior à EC 103)",
    modo: "form",
    campos: [{ id: "dib", rotulo: "DIB (até 13/11/2019)", tipo: "data" }, { id: "salarios", rotulo: "Salários (MM/AAAA valor)", tipo: "salarios", largura: "inteira" }],
    calcular: (v, ctx) => {
      const dib = txt(v, "dib") || EC103;
      const m = calcularMedia({ salarios: lerSalarios(txt(v, "salarios")), dib, indices: ctx.indices, criterio: "80" });
      const r = limitarRenda(m.media, dib);
      return { linhas: [{ rotulo: "Média dos 80% maiores", valor: brl(m.media) }, { rotulo: "RMI (100%)", valor: brl(r.valor), destaque: true }], memoria: ["Benefício com DIB até 13/11/2019: 100% do salário de benefício, sem fator previdenciário.", ...m.avisos] };
    },
  },
  simuladorRegra("da-professor", 5, "Professor com fator previdenciário (antes da EC 103)", { professor: true }),
  simuladorRegra("da-professor", 5, "Professor pela regra de pontos 81/91 (Lei 13.183/2015)", { professor: true }),
];

// Ids únicos (regras repetidas com o mesmo preset).
for (const lista of [SECAO_3, SECAO_4, SECAO_5]) {
  const vistos = new Map<string, number>();
  for (const c of lista) {
    const n = vistos.get(c.id) ?? 0;
    vistos.set(c.id, n + 1);
    if (n) c.id = `${c.id}-${n + 1}`;
  }
}
