// Seções 6 (demais benefícios e assistenciais) e 7 (RPPS e militares).

import { EC103, competencia, fmtData, idadeEm, somaComp } from "../datas";
import { acumulo, auxilioAcidente, duracaoPensaoConjuge, incapacidadeTemporaria, pensaoPorMorte } from "../beneficios";
import { calcularMedia, limitarRenda, mediaUltimos12 } from "../media";
import { abonoPermanencia, beneficioEspecial, contribuicaoProgressiva, FAIXAS_SERVIDOR_2026 } from "../rpps";
import { coeficienteArt26 } from "../rgps";
import { arred, salarioMinimo, teto } from "../tabelas";
import { SEXO, brl, bool, dec, lerSalarios, num, pct, txt, type Calculadora, type Campo, type Saida, type Valores } from "./tipos";

// Portaria Interministerial MPS/MF 13/2026.
export const LIMITE_BAIXA_RENDA_2026 = 1980.38;
export const COTA_SALARIO_FAMILIA_2026 = 67.54;

const SAL: Campo = { id: "salarios", rotulo: "Salários de contribuição (MM/AAAA valor)", tipo: "salarios", largura: "inteira" };
const DIB: Campo = { id: "dib", rotulo: "DIB / fato gerador", tipo: "data" };
const salV = (v: Valores) => lerSalarios(txt(v, "salarios"));

function ia(id: string, secao: number, nome: string, fundamento: string, descricao?: string): Calculadora {
  return { id, secao, nome, fundamento, descricao, modo: "ia" };
}

function incapTemp(v: Valores, ctx: { indices: import("../indices").Indices; hoje: string }, acidentario: boolean): Saida {
  const r = incapacidadeTemporaria(salV(v), txt(v, "dib") || ctx.hoje, ctx.indices);
  return {
    linhas: [{ rotulo: "Média", valor: brl(r.media) }, { rotulo: "91% da média", valor: brl(r.bruto) }, { rotulo: "Média dos 12 últimos (limite)", valor: brl(r.mediaUltimos12) }, { rotulo: "RMI", valor: brl(r.rmi), destaque: true }],
    memoria: [...r.memoria, ...(acidentario ? ["Acidentário (B91): dispensa carência, gera estabilidade de 12 meses (Lei 8.213, art. 118) e FGTS durante o afastamento."] : ["Comum (B31): carência de 12 contribuições, salvo as doenças da Portaria Interministerial 22/2022."])],
  };
}

function pensao(v: Valores, modo: "pos" | "invalido" | "pre"): Saida {
  const obito = txt(v, "obito") || (modo === "pre" ? EC103 : "2024-01-01");
  const r = pensaoPorMorte({ baseCalculo: num(v, "base"), dependentes: Math.max(1, num(v, "dependentes", 1)), dependenteInvalido: modo === "invalido", obito });
  const conj = txt(v, "nascConjuge") ? duracaoPensaoConjuge(idadeEm(txt(v, "nascConjuge"), obito), bool(v, "c18"), bool(v, "uniao2")) : null;
  return {
    linhas: [
      { rotulo: "Cota familiar", valor: pct(r.cota) },
      { rotulo: "Valor da pensão", valor: brl(r.valor), destaque: true },
      { rotulo: "Por dependente", valor: brl(r.porDependente) },
      ...(conj ? [{ rotulo: "Duração para o cônjuge/companheiro", valor: conj.texto }] : []),
    ],
    memoria: [...r.memoria, "Após a EC 103, as cotas cessadas não revertem aos demais dependentes (art. 23, §1º), salvo quando restarem 5 ou mais."],
  };
}

const CAMPOS_PENSAO: Campo[] = [
  { id: "obito", rotulo: "Data do óbito", tipo: "data" },
  { id: "base", rotulo: "Aposentadoria recebida ou a que teria direito por incapacidade", tipo: "moeda" },
  { id: "dependentes", rotulo: "Número de dependentes", tipo: "inteiro", padrao: 1 },
  { id: "nascConjuge", rotulo: "Nascimento do cônjuge/companheiro(a)", tipo: "data" },
  { id: "c18", rotulo: "Instituidor com 18+ contribuições", tipo: "checkbox", padrao: true },
  { id: "uniao2", rotulo: "Casamento/união há 2+ anos", tipo: "checkbox", padrao: true },
];

function salarioMaternidade(v: Valores, tipo: "empregada" | "ci" | "domestica" | "especial" | "graca", ctx: { indices: import("../indices").Indices; hoje: string }): Saida {
  const data = txt(v, "data") || ctx.hoje;
  const sm = salarioMinimo(competencia(data));
  let mensal = 0;
  const memoria: string[] = [];
  if (tipo === "empregada") {
    mensal = num(v, "remuneracao");
    memoria.push("Empregada e avulsa: remuneração integral, paga pela empresa e compensada (Lei 8.213, art. 72); limitada ao subsídio de ministro do STF.");
  } else if (tipo === "domestica") {
    mensal = Math.min(num(v, "remuneracao"), teto(competencia(data)));
    memoria.push("Doméstica: último salário de contribuição, limitado ao teto (art. 73, I).");
  } else if (tipo === "especial") {
    mensal = sm;
    memoria.push("Segurada especial: um salário mínimo (art. 39, parágrafo único).");
  } else {
    // CI, facultativa, MEI e desempregada em período de graça: 1/12 da soma dos 12 últimos SC em até 15 meses.
    const sal = salV(v);
    const ultima = somaComp(competencia(data), -1);
    const janela = sal.filter((s) => s.comp <= ultima && s.comp > somaComp(ultima, -15)).sort((a, b) => (a.comp < b.comp ? -1 : 1)).slice(-12);
    const soma = janela.reduce((s, x) => s + Math.min(x.valor, teto(x.comp)), 0);
    mensal = soma / 12;
    memoria.push(`1/12 da soma dos ${janela.length} último(s) salário(s) de contribuição apurados em até 15 meses (art. 73, III): ${brl(soma)} ÷ 12.`);
    if (tipo === "graca") memoria.push("Desempregada em período de graça: o benefício é pago diretamente pelo INSS (art. 97 do Decreto 3.048).");
  }
  mensal = Math.max(mensal, sm);
  const dias = num(v, "dias", 120);
  return {
    linhas: [{ rotulo: "Valor mensal", valor: brl(arred(mensal)), destaque: true }, { rotulo: "Duração", valor: `${dias} dias` }, { rotulo: "Total do benefício", valor: brl(arred((mensal / 30) * dias)), destaque: true }],
    memoria: [...memoria, "Valor mínimo de um salário mínimo; 120 dias (adoção e guarda também)."],
  };
}

function bpcRenda(v: Valores): Saida {
  const data = txt(v, "data") || "2026-01-01";
  const sm = salarioMinimo(competencia(data));
  const renda = num(v, "renda");
  const membros = Math.max(1, num(v, "membros", 1));
  const deducoes = num(v, "deducoes");
  const perCapita = (renda - deducoes) / membros;
  const quarto = sm / 4;
  const meio = sm / 2;
  return {
    linhas: [
      { rotulo: "Renda per capita", valor: brl(perCapita), destaque: true },
      { rotulo: "Limite de 1/4 do SM", valor: `${brl(quarto)} — ${perCapita <= quarto ? "atende" : "não atende"}` },
      { rotulo: "Até 1/2 do SM (avaliação de vulnerabilidade)", valor: `${brl(meio)} — ${perCapita <= meio ? "pode atender" : "não atende"}` },
      { rotulo: "Valor do BPC", valor: brl(sm) },
    ],
    memoria: [
      "Lei 8.742/93, art. 20, §3º: renda per capita igual ou inferior a 1/4 do salário mínimo; o §11-A admite até 1/2 com avaliação de vulnerabilidade (Lei 14.176/2021).",
      "Não entram na renda: BPC/benefício de até 1 SM de idoso ou PcD do grupo (art. 20, §14); podem ser deduzidos gastos com medicamentos, fraldas, alimentação especial e consultas não fornecidos pelo SUS (art. 20-B).",
      `Deduções informadas: ${brl(deducoes)}.`,
    ],
  };
}

export const SECAO_6: Calculadora[] = [
  { id: "aux-incap", secao: 6, nome: "Auxílio por incapacidade temporária comum (91% do SB)", fundamento: "Lei 8.213/91, art. 61", modo: "form", campos: [DIB, SAL], calcular: (v, c) => incapTemp(v, c, false) },
  { id: "aux-incap-acid", secao: 6, nome: "Auxílio por incapacidade temporária acidentário (B91)", fundamento: "Lei 8.213/91, arts. 19 a 21 e 61", modo: "form", campos: [DIB, SAL], calcular: (v, c) => incapTemp(v, c, true) },
  { id: "aux-incap-limite12", secao: 6, nome: "Limitação do auxílio-doença à média dos últimos 12 salários (Lei 13.135/2015)", fundamento: "Lei 8.213/91, art. 29, §10", modo: "form", campos: [DIB, SAL], calcular: (v, c) => incapTemp(v, c, false) },
  {
    id: "aux-acidente",
    secao: 6,
    nome: "Auxílio-acidente (50% do salário de benefício)",
    fundamento: "Lei 8.213/91, art. 86",
    modo: "form",
    campos: [DIB, SAL],
    calcular: (v, c) => {
      const r = auxilioAcidente(salV(v), txt(v, "dib") || c.hoje, c.indices);
      return { linhas: [{ rotulo: "Média", valor: brl(r.media) }, { rotulo: "Auxílio-acidente", valor: brl(r.rmi), destaque: true }], memoria: [...r.memoria, "Cessa com a aposentadoria (Súmula 507/STJ: só acumula se a lesão e a aposentadoria forem anteriores a 11/11/1997)."] };
    },
  },
  {
    id: "aux-acidente-antigo",
    secao: 6,
    nome: "Auxílio-acidente 30%, 40% ou 60% (regras antigas)",
    fundamento: "Lei 8.213/91, art. 86 (redação original, até a Lei 9.032/95)",
    modo: "form",
    campos: [{ id: "sb", rotulo: "Salário de benefício / salário de contribuição do dia do acidente", tipo: "moeda" }, { id: "perc", rotulo: "Percentual", tipo: "select", opcoes: [{ valor: "0.3", rotulo: "30% (redução da capacidade)" }, { valor: "0.4", rotulo: "40% (exige maior esforço)" }, { valor: "0.6", rotulo: "60% (impede a atividade)" }], padrao: "0.3" }],
    calcular: (v) => ({ linhas: [{ rotulo: "Auxílio-acidente", valor: brl(num(v, "sb") * num(v, "perc", 0.3)), destaque: true }], memoria: ["Acidentes até 28/04/1995. O STF (Tema 388) não admite a majoração para 50% de benefícios anteriores à Lei 9.032/95."] }),
  },
  { id: "pensao-pos", secao: 6, nome: "Pensão por morte pós-reforma (50% + 10% por dependente)", fundamento: "EC 103/2019, art. 23; Lei 8.213/91, art. 77", modo: "form", campos: CAMPOS_PENSAO, calcular: (v) => pensao(v, "pos") },
  { id: "pensao-invalido", secao: 6, nome: "Pensão com dependente inválido ou com deficiência grave (100%)", fundamento: "EC 103/2019, art. 23, §2º", modo: "form", campos: CAMPOS_PENSAO, calcular: (v) => pensao(v, "invalido") },
  {
    id: "pensao-policial",
    secao: 6,
    nome: "Pensão por morte de policial por agressão em serviço",
    fundamento: "EC 103/2019, art. 10, §6º; LC 51/1985",
    modo: "form",
    campos: [{ id: "remuneracao", rotulo: "Remuneração do cargo do policial", tipo: "moeda" }, { id: "dependentes", rotulo: "Dependentes", tipo: "inteiro", padrao: 1 }],
    calcular: (v) => ({ linhas: [{ rotulo: "Pensão (integral)", valor: brl(num(v, "remuneracao")), destaque: true }, { rotulo: "Por dependente", valor: brl(num(v, "remuneracao") / Math.max(1, num(v, "dependentes", 1))) }], memoria: ["Policial (federal, civil do DF, penal federal, legislativo) morto por agressão sofrida no exercício ou em razão da função: pensão vitalícia ao cônjuge equivalente à remuneração do cargo (EC 103, art. 10, §6º)."] }),
  },
  { id: "pensao-pre", secao: 6, nome: "Pensão por morte pré-reforma (100% da aposentadoria)", fundamento: "Lei 8.213/91, art. 75 (redação da Lei 9.528/97)", modo: "form", campos: CAMPOS_PENSAO, calcular: (v) => pensao(v, "pre") },
  {
    id: "pensao-rateio",
    secao: 6,
    nome: "Rateio de pensão por morte entre dependentes",
    fundamento: "Lei 8.213/91, art. 77",
    modo: "form",
    campos: [{ id: "valor", rotulo: "Valor total da pensão", tipo: "moeda" }, { id: "nomes", rotulo: "Dependentes (um por linha: nome; data de nascimento dd/mm/aaaa; relação)", tipo: "textoLongo", largura: "inteira" }, { id: "obito", rotulo: "Óbito", tipo: "data" }],
    calcular: (v) => {
      const deps = txt(v, "nomes").split("\n").map((l) => l.split(";").map((s) => s.trim())).filter((x) => x[0]);
      const cota = num(v, "valor") / Math.max(1, deps.length);
      return {
        linhas: [{ rotulo: "Cota individual", valor: brl(cota), destaque: true }],
        memoria: ["A pensão é rateada em partes iguais entre os dependentes habilitados.", "Filhos e equiparados: cota até 21 anos, salvo inválido ou com deficiência."],
        tabela: { colunas: ["Dependente", "Relação", "Cota"], linhas: deps.map((d) => [d[0], d[2] ?? "", brl(cota)]) },
      };
    },
  },
  {
    id: "pensao-reversao",
    secao: 6,
    nome: "Reversão de cota de pensão (cessação de dependente)",
    fundamento: "Lei 8.213/91, art. 77, §1º; EC 103/2019, art. 23, §1º",
    modo: "form",
    campos: [{ id: "obito", rotulo: "Óbito do instituidor", tipo: "data" }, { id: "base", rotulo: "Aposentadoria-base", tipo: "moeda" }, { id: "antes", rotulo: "Dependentes antes da cessação", tipo: "inteiro", padrao: 3 }, { id: "depois", rotulo: "Dependentes que permanecem", tipo: "inteiro", padrao: 2 }],
    calcular: (v) => {
      const pos = txt(v, "obito") > EC103;
      const base = num(v, "base");
      const antes = Math.max(1, num(v, "antes", 1));
      const depois = Math.max(1, num(v, "depois", 1));
      const valorAntes = pos ? base * Math.min(1, 0.5 + 0.1 * antes) : base;
      const valorDepois = pos ? base * Math.min(1, 0.5 + 0.1 * depois) : base;
      return {
        linhas: [{ rotulo: "Pensão antes", valor: brl(valorAntes) }, { rotulo: "Pensão depois", valor: brl(valorDepois), destaque: true }, { rotulo: "Cota de cada remanescente", valor: brl(valorDepois / depois) }],
        memoria: [pos ? "Óbito após a EC 103: a cota de 10% do dependente que perde a qualidade não reverte; a pensão é recalculada." : "Óbito até 13/11/2019: a cota cessada reverte aos demais (art. 77, §1º)."],
      };
    },
  },
  ia("pensao-excombatente", 6, "Pensão vitalícia de ex-combatente", "Lei 8.059/1990; ADCT, art. 53", "Pensão especial equivalente à deixada por segundo-tenente das Forças Armadas."),
  ia("pensoes-especiais", 6, "Pensões especiais (Talidomida, Hanseníase, Zika, Césio-137)", "Leis 7.070/82, 11.520/07, 13.985/20 e 9.425/96"),
  {
    id: "reclusao-pos",
    secao: 6,
    nome: "Auxílio-reclusão pós-reforma (limitado a 1 salário mínimo)",
    fundamento: "EC 103/2019, art. 27, §1º; Lei 8.213/91, art. 80",
    modo: "form",
    campos: [{ id: "prisao", rotulo: "Data da prisão", tipo: "data" }, SAL],
    calcular: (v, c) => {
      const data = txt(v, "prisao") || c.hoje;
      const media12 = mediaUltimos12(salV(v), data, c.indices);
      const baixa = media12 <= LIMITE_BAIXA_RENDA_2026;
      const sm = salarioMinimo(competencia(data));
      return {
        linhas: [{ rotulo: "Média dos 12 meses anteriores", valor: brl(media12) }, { rotulo: "Baixa renda", valor: baixa ? `Sim (até ${brl(LIMITE_BAIXA_RENDA_2026)})` : `Não (limite ${brl(LIMITE_BAIXA_RENDA_2026)})`, destaque: true }, { rotulo: "Valor do benefício", valor: baixa ? brl(sm) : "—", destaque: true }],
        memoria: ["Regime fechado; carência de 24 contribuições (Lei 13.846/2019); baixa renda aferida pela média dos 12 salários anteriores à prisão; valor de 1 salário mínimo, dividido entre os dependentes.", "Limite de baixa renda de 2026: Portaria Interministerial MPS/MF 13/2026."],
      };
    },
  },
  {
    id: "reclusao-pre",
    secao: 6,
    nome: "Auxílio-reclusão pré-reforma (média dos 80% maiores)",
    fundamento: "Lei 8.213/91, art. 80 (redação anterior)",
    modo: "form",
    campos: [{ id: "prisao", rotulo: "Data da prisão (até 13/11/2019)", tipo: "data" }, SAL],
    calcular: (v, c) => {
      const data = txt(v, "prisao") || EC103;
      const m = calcularMedia({ salarios: salV(v), dib: data, indices: c.indices, criterio: "80" });
      return { linhas: [{ rotulo: "Valor (100% da média)", valor: brl(limitarRenda(m.media, data).valor), destaque: true }], memoria: ["Equivalente à aposentadoria por invalidez a que o segurado teria direito.", ...m.avisos] };
    },
  },
  {
    id: "baixa-renda",
    secao: 6,
    nome: "Aferição de baixa renda para auxílio-reclusão (média de 12 meses)",
    fundamento: "Lei 8.213/91, art. 80, §4º",
    modo: "form",
    campos: [{ id: "prisao", rotulo: "Data da prisão", tipo: "data" }, { id: "limite", rotulo: "Limite de baixa renda do ano", tipo: "moeda", padrao: LIMITE_BAIXA_RENDA_2026 }, SAL],
    calcular: (v, c) => {
      const m = mediaUltimos12(salV(v), txt(v, "prisao") || c.hoje, c.indices);
      const lim = num(v, "limite", LIMITE_BAIXA_RENDA_2026);
      return { linhas: [{ rotulo: "Média dos 12 meses", valor: brl(m) }, { rotulo: "Resultado", valor: m <= lim ? "Baixa renda" : "Acima do limite", destaque: true }], memoria: ["Sem salário de contribuição no período (desempregado), o STJ (Tema 896) considera ausência de renda."] };
    },
  },
  ...(["empregada", "ci", "domestica", "especial", "graca"] as const).map((t): Calculadora => ({
    id: `maternidade-${t}`,
    secao: 6,
    nome: { empregada: "Salário-maternidade — empregada e avulsa", ci: "Salário-maternidade — contribuinte individual, facultativa e MEI", domestica: "Salário-maternidade — empregada doméstica", especial: "Salário-maternidade — segurada especial (rural)", graca: "Salário-maternidade em período de graça (desempregada)" }[t],
    fundamento: "Lei 8.213/91, arts. 71 a 73",
    modo: "form",
    campos: [{ id: "data", rotulo: "Início (parto/adoção)", tipo: "data" }, { id: "dias", rotulo: "Dias", tipo: "inteiro", padrao: 120 }, ...(t === "empregada" || t === "domestica" ? [{ id: "remuneracao", rotulo: "Remuneração mensal", tipo: "moeda" as const }] : []), ...(t === "ci" || t === "graca" ? [SAL] : [])],
    calcular: (v, c) => salarioMaternidade(v, t, c),
  })),
  {
    id: "salario-familia",
    secao: 6,
    nome: "Salário-família (cota por dependente e teto de remuneração)",
    fundamento: "Lei 8.213/91, arts. 65 a 70; Portaria Interministerial MPS/MF 13/2026",
    modo: "form",
    campos: [{ id: "remuneracao", rotulo: "Remuneração mensal", tipo: "moeda" }, { id: "filhos", rotulo: "Filhos até 14 anos ou inválidos", tipo: "inteiro" }, { id: "cota", rotulo: "Cota", tipo: "moeda", padrao: COTA_SALARIO_FAMILIA_2026 }, { id: "limite", rotulo: "Limite de remuneração", tipo: "moeda", padrao: LIMITE_BAIXA_RENDA_2026 }],
    calcular: (v) => {
      const ok = num(v, "remuneracao") <= num(v, "limite", LIMITE_BAIXA_RENDA_2026);
      const total = ok ? num(v, "filhos") * num(v, "cota", COTA_SALARIO_FAMILIA_2026) : 0;
      return { linhas: [{ rotulo: "Direito", valor: ok ? "Sim" : "Não (remuneração acima do limite)", destaque: true }, { rotulo: "Valor mensal", valor: brl(total), destaque: true }], memoria: ["Valores de 2026: cota de R$ 67,54 para remuneração até R$ 1.980,38."] };
    },
  },
  { id: "bpc", secao: 6, nome: "BPC/LOAS (idoso e pessoa com deficiência)", fundamento: "CF, art. 203, V; Lei 8.742/93, art. 20", modo: "form", campos: [{ id: "data", rotulo: "Data", tipo: "data" }, { id: "renda", rotulo: "Renda bruta familiar", tipo: "moeda" }, { id: "membros", rotulo: "Pessoas no grupo familiar", tipo: "inteiro", padrao: 1 }, { id: "deducoes", rotulo: "Deduções (benefícios excluídos, gastos de saúde)", tipo: "moeda" }], calcular: bpcRenda },
  { id: "bpc-renda", secao: 6, nome: "Renda per capita para BPC/LOAS (1/4 e 1/2 do salário mínimo)", fundamento: "Lei 8.742/93, art. 20, §§3º e 11-A", modo: "form", campos: [{ id: "data", rotulo: "Data", tipo: "data" }, { id: "renda", rotulo: "Renda bruta familiar", tipo: "moeda" }, { id: "membros", rotulo: "Pessoas no grupo familiar", tipo: "inteiro", padrao: 1 }, { id: "deducoes", rotulo: "Deduções", tipo: "moeda" }], calcular: bpcRenda },
  { id: "bpc-deducoes", secao: 6, nome: "Dedução de gastos médicos, fraldas e medicamentos no BPC/LOAS", fundamento: "Lei 8.742/93, art. 20-B", modo: "form", campos: [{ id: "data", rotulo: "Data", tipo: "data" }, { id: "renda", rotulo: "Renda bruta familiar", tipo: "moeda" }, { id: "membros", rotulo: "Pessoas no grupo familiar", tipo: "inteiro", padrao: 1 }, { id: "deducoes", rotulo: "Gastos mensais com saúde não cobertos pelo SUS", tipo: "moeda" }], calcular: bpcRenda },
  {
    id: "auxilio-inclusao",
    secao: 6,
    nome: "Auxílio-inclusão (50% do BPC/LOAS)",
    fundamento: "Lei 8.742/93, arts. 26-A a 26-H (Lei 14.176/2021)",
    modo: "form",
    campos: [{ id: "data", rotulo: "Data", tipo: "data" }, { id: "remuneracao", rotulo: "Remuneração do trabalho", tipo: "moeda" }],
    calcular: (v, c) => {
      const sm = salarioMinimo(competencia(txt(v, "data") || c.hoje));
      const ok = num(v, "remuneracao") <= sm * 2;
      return { linhas: [{ rotulo: "Direito", valor: ok ? "Sim" : "Não (remuneração acima de 2 SM)", destaque: true }, { rotulo: "Valor", valor: brl(ok ? sm / 2 : 0), destaque: true }], memoria: ["Para quem recebia BPC (PcD) e passa a exercer atividade com remuneração de até 2 salários mínimos."] };
    },
  },
  {
    id: "acumulo",
    secao: 6,
    nome: "Acumulação de benefícios (art. 24 da EC 103 — faixas de redução)",
    fundamento: "EC 103/2019, art. 24, §§1º e 2º",
    modo: "form",
    campos: [{ id: "data", rotulo: "Data", tipo: "data" }, { id: "maior", rotulo: "Benefício mais vantajoso", tipo: "moeda" }, { id: "menor", rotulo: "Outro benefício", tipo: "moeda" }],
    calcular: (v, c) => {
      const r = acumulo(num(v, "maior"), num(v, "menor"), txt(v, "data") || c.hoje);
      return {
        linhas: [{ rotulo: "Mais vantajoso (integral)", valor: brl(r.maior) }, { rotulo: "Outro benefício reduzido", valor: brl(r.menorReduzido) }, { rotulo: "Total recebido", valor: brl(r.total), destaque: true }, { rotulo: "Redução", valor: brl(r.perda) }],
        memoria: ["100% até 1 SM; 60% entre 1 e 2 SM; 40% entre 2 e 3; 20% entre 3 e 4; 10% acima de 4 SM (art. 24, §2º).", "Aplica-se a pensão com aposentadoria ou pensões de regimes diferentes; benefícios adquiridos antes de 13/11/2019 ficam preservados."],
        tabela: { colunas: ["Faixa", "Base", "Percentual", "Valor"], linhas: r.faixas.map((f) => [`${brl(f.de)} a ${brl(f.ate)}`, brl(f.base), pct(f.percentual), brl(f.valor)]) },
      };
    },
  },
  {
    id: "abono-anual",
    secao: 6,
    nome: "Abono anual (13º previdenciário proporcional e integral)",
    fundamento: "Lei 8.213/91, art. 40",
    modo: "form",
    campos: [{ id: "renda", rotulo: "Renda mensal em dezembro", tipo: "moeda" }, { id: "meses", rotulo: "Meses de benefício no ano", tipo: "inteiro", padrao: 12 }],
    calcular: (v) => {
      const valor = (num(v, "renda") * Math.min(12, num(v, "meses", 12))) / 12;
      return { linhas: [{ rotulo: "Abono anual", valor: brl(valor), destaque: true }], memoria: ["1/12 da renda de dezembro por mês de benefício no ano (fração ≥ 15 dias conta como mês)."] };
    },
  },
  ia("auxilio-funeral", 6, "Auxílio-funeral / pecúlio previdenciário (regras antigas)", "Lei 8.213/91, arts. 81 a 85 (revogados pela Lei 9.032/95 e 9.129/95)"),
];

// ---------------------------------------------------------------------------
// Seção 7 — RPPS e militares
// ---------------------------------------------------------------------------

function pensaoRpps(v: Valores, pos: boolean): Saida {
  const base = num(v, "base");
  const data = txt(v, "obito") || (pos ? "2024-01-01" : EC103);
  const t = teto(competencia(data));
  if (!pos) {
    const valor = base <= t ? base : t + (base - t) * 0.7;
    return { linhas: [{ rotulo: "Pensão", valor: brl(valor), destaque: true }], memoria: [`EC 41/2003: totalidade até o teto do RGPS (${brl(t)}) + 70% da parcela excedente (CF, art. 40, §7º, redação da EC 41).`] };
  }
  const deps = Math.max(1, num(v, "dependentes", 1));
  const cota = bool(v, "invalido") ? 1 : Math.min(1, 0.5 + 0.1 * deps);
  let valor = base * cota;
  const memoria = [`EC 103, art. 23: cota familiar de ${pct(cota)}.`];
  if (bool(v, "invalido") && base > t) {
    valor = t + (base - t) * Math.min(1, 0.5 + 0.1 * deps);
    memoria.push("Dependente inválido/deficiente: 100% até o teto do RGPS e cota sobre o excedente.");
  }
  return { linhas: [{ rotulo: "Pensão", valor: brl(valor), destaque: true }, { rotulo: "Por dependente", valor: brl(valor / deps) }], memoria };
}

const CAMPOS_SERVIDOR: Campo[] = [
  SEXO,
  { id: "remuneracao", rotulo: "Remuneração do cargo", tipo: "moeda" },
  { id: "rpc", rotulo: "Sujeito ao teto do RGPS (Funpresp/RPC)", tipo: "checkbox" },
];

export const SECAO_7: Calculadora[] = [
  { id: "rpps-ec41-art6", secao: 7, nome: "Voluntária com integralidade e paridade (EC 41/2003 — art. 6º)", fundamento: "EC 41/2003, art. 6º", modo: "motor", aba: "rpps" },
  { id: "rpps-ec47-art3", secao: 7, nome: "Voluntária com integralidade e paridade (EC 47/2005 — art. 3º)", fundamento: "EC 47/2005, art. 3º", modo: "motor", aba: "rpps" },
  { id: "rpps-media", secao: 7, nome: "Voluntária pela média aritmética (Lei 10.887/2004)", fundamento: "CF, art. 40, §1º, III; Lei 10.887/04, art. 1º", modo: "motor", aba: "rpps" },
  { id: "rpps-art10", secao: 7, nome: "Voluntária no RPPS da União (EC 103 — regra geral)", fundamento: "EC 103/2019, art. 10", modo: "motor", aba: "rpps" },
  { id: "rpps-art4", secao: 7, nome: "Transição por pontos no RPPS (art. 4º)", fundamento: "EC 103/2019, art. 4º", modo: "motor", aba: "rpps" },
  { id: "rpps-art20", secao: 7, nome: "Transição do pedágio de 100% no RPPS (art. 20)", fundamento: "EC 103/2019, art. 20", modo: "motor", aba: "rpps" },
  {
    id: "rpps-compulsoria",
    secao: 7,
    nome: "Compulsória no RPPS (75 anos — proporcional ao tempo)",
    fundamento: "CF, art. 40, §1º, II; EC 103, art. 26, §4º",
    modo: "form",
    campos: [{ id: "media", rotulo: "Média de 100% das remunerações", tipo: "moeda" }, { id: "anos", rotulo: "Anos de contribuição", tipo: "numero" }, ...CAMPOS_SERVIDOR],
    calcular: (v) => {
      const anos = num(v, "anos");
      const coef = coeficienteArt26(anos, 20);
      const prop = Math.min(1, anos / 20);
      let valor = num(v, "media") * coef * prop;
      if (bool(v, "rpc")) valor = Math.min(valor, teto(competencia("2026-01-01")));
      return { linhas: [{ rotulo: "Coeficiente", valor: pct(coef) }, { rotulo: "Proporção (tempo ÷ 20)", valor: pct(prop) }, { rotulo: "Proventos", valor: brl(valor), destaque: true }], memoria: ["Proventos = média × (60% + 2% por ano acima de 20) × (tempo ÷ 20 anos, limitado a 1)."] };
    },
  },
  {
    id: "rpps-incapacidade",
    secao: 7,
    nome: "Incapacidade permanente no RPPS (proporcional e integral)",
    fundamento: "EC 103/2019, art. 10, §1º, II, e art. 26, §3º, II",
    modo: "form",
    campos: [{ id: "media", rotulo: "Média de 100% das remunerações", tipo: "moeda" }, { id: "anos", rotulo: "Anos de contribuição", tipo: "numero" }, { id: "acidente", rotulo: "Decorrente de acidente em serviço / doença profissional", tipo: "checkbox" }, ...CAMPOS_SERVIDOR],
    calcular: (v) => {
      const coef = bool(v, "acidente") ? 1 : coeficienteArt26(num(v, "anos"), 20);
      let valor = num(v, "media") * coef;
      if (bool(v, "rpc")) valor = Math.min(valor, teto("2026-01"));
      return { linhas: [{ rotulo: "Coeficiente", valor: pct(coef) }, { rotulo: "Proventos", valor: brl(valor), destaque: true }], memoria: ["Comum: 60% + 2% por ano acima de 20; acidente em serviço/doença profissional: 100% da média."] };
    },
  },
  {
    id: "rpps-policial",
    secao: 7,
    nome: "Aposentadoria especial de policial (LC 51/1985 e EC 103/2019)",
    fundamento: "EC 103/2019, art. 5º; LC 51/1985",
    modo: "form",
    campos: [SEXO, { id: "idade", rotulo: "Idade", tipo: "numero" }, { id: "contrib", rotulo: "Anos de contribuição", tipo: "numero" }, { id: "policial", rotulo: "Anos de efetivo exercício policial", tipo: "numero" }, { id: "ingresso", rotulo: "Ingresso no cargo", tipo: "data" }, { id: "remuneracao", rotulo: "Remuneração", tipo: "moeda" }, { id: "media", rotulo: "Média (se não houver integralidade)", tipo: "moeda" }],
    calcular: (v) => {
      const m = txt(v, "sexo") === "M";
      const reqContrib = m ? 30 : 25;
      const reqPolicial = m ? 20 : 15;
      const ok = num(v, "idade") >= 55 && num(v, "contrib") >= reqContrib && num(v, "policial") >= reqPolicial;
      const integral = txt(v, "ingresso") && txt(v, "ingresso") <= "2013-02-04";
      return {
        linhas: [{ rotulo: "Requisitos (transição art. 5º)", valor: ok ? "Cumpridos" : "Não cumpridos", destaque: true }, { rotulo: "Proventos", valor: integral ? `${brl(num(v, "remuneracao"))} (integralidade e paridade)` : brl(num(v, "media")), destaque: true }],
        memoria: [`Transição: 55 anos de idade, ${reqContrib} anos de contribuição e ${reqPolicial} de exercício policial (ou pedágio de 100%).`, "Integralidade e paridade para ingressos antes da previdência complementar (LC 51/85, art. 1º; STF, Tema 1.019) — confirme o caso concreto."],
      };
    },
  },
  { id: "rpps-especial", secao: 7, nome: "Especial de servidor exposto a agentes nocivos (RPPS)", fundamento: "EC 103/2019, arts. 10, §2º, II, e 21", modo: "motor", aba: "rpps" },
  ia("rpps-pcd", 7, "Especial de servidor com deficiência (RPPS)", "CF, art. 40, §4º-A; EC 103/2019, art. 22; LC 142/2013"),
  { id: "rpps-professor", secao: 7, nome: "Especial de professor no RPPS", fundamento: "EC 103/2019, arts. 4º, §4º, 10, §2º, III, e 20, §1º", modo: "motor", aba: "rpps" },
  {
    id: "abono-permanencia",
    secao: 7,
    nome: "Abono de permanência no RPPS (reembolso da contribuição)",
    fundamento: "CF, art. 40, §19; EC 103/2019, arts. 3º, §3º, e 8º",
    modo: "form",
    campos: [{ id: "remuneracao", rotulo: "Remuneração de contribuição", tipo: "moeda" }, { id: "rpc", rotulo: "Sujeito ao teto do RGPS (RPC)", tipo: "checkbox" }, { id: "cumprimento", rotulo: "Data em que cumpriu os requisitos", tipo: "data" }, { id: "ate", rotulo: "Calcular até", tipo: "data" }],
    calcular: (v, c) => {
      const r = abonoPermanencia(num(v, "remuneracao"), bool(v, "rpc"), txt(v, "cumprimento") || null, txt(v, "ate") || c.hoje);
      return {
        linhas: [{ rotulo: "Contribuição mensal (= abono)", valor: brl(r.mensal), destaque: true }, { rotulo: "Alíquota efetiva", valor: pct(r.contribuicao.efetiva) }, { rotulo: "Abono anual (com 13º)", valor: brl(r.anual) }, { rotulo: `Acumulado em ${r.meses} mês(es)`, valor: brl(r.acumulado), destaque: true }],
        memoria: ["Servidor que cumpriu os requisitos da aposentadoria voluntária e opta por permanecer em atividade recebe abono equivalente à sua contribuição.", "Alíquotas progressivas da EC 103, art. 11 (faixas de 2026 reajustadas pelo índice do RGPS — confira a portaria do ano)."],
        tabela: { colunas: ["Faixa", "Alíquota", "Contribuição"], linhas: r.contribuicao.detalhe.map((d) => [`${brl(d.de)} a ${brl(d.ate)}`, pct(d.aliquota, 1), brl(d.valor)]) },
      };
    },
  },
  {
    id: "rpps-pensao-ec41",
    secao: 7,
    nome: "Pensão por morte no RPPS (integral até o teto + 70% do excedente — EC 41)",
    fundamento: "CF, art. 40, §7º (redação da EC 41/2003)",
    modo: "form",
    campos: [{ id: "obito", rotulo: "Óbito (até 13/11/2019)", tipo: "data" }, { id: "base", rotulo: "Proventos/remuneração do servidor", tipo: "moeda" }],
    calcular: (v) => pensaoRpps(v, false),
  },
  {
    id: "rpps-pensao-pos",
    secao: 7,
    nome: "Pensão por morte no RPPS pós-EC 103 (50% + 10% por dependente)",
    fundamento: "EC 103/2019, art. 23",
    modo: "form",
    campos: [{ id: "obito", rotulo: "Óbito", tipo: "data" }, { id: "base", rotulo: "Proventos ou aposentadoria por incapacidade a que teria direito", tipo: "moeda" }, { id: "dependentes", rotulo: "Dependentes", tipo: "inteiro", padrao: 1 }, { id: "invalido", rotulo: "Há dependente inválido/deficiente", tipo: "checkbox" }],
    calcular: (v) => pensaoRpps(v, true),
  },
  {
    id: "funpresp",
    secao: 7,
    nome: "Complementação de aposentadoria (Funpresp / previdência complementar)",
    fundamento: "Lei 12.618/2012; LC 108 e 109/2001",
    modo: "form",
    campos: [{ id: "saldo", rotulo: "Saldo atual da conta", tipo: "moeda" }, { id: "contrib", rotulo: "Contribuição mensal total (servidor + patrocinador)", tipo: "moeda" }, { id: "anos", rotulo: "Anos até a aposentadoria", tipo: "numero" }, { id: "taxa", rotulo: "Rentabilidade real anual (%)", tipo: "percentual", padrao: 4 }, { id: "beneficio", rotulo: "Anos de recebimento (renda por prazo)", tipo: "numero", padrao: 25 }],
    calcular: (v) => {
      const i = Math.pow(1 + num(v, "taxa", 4) / 100, 1 / 12) - 1;
      const n = Math.round(num(v, "anos") * 12);
      const fv = num(v, "saldo") * Math.pow(1 + i, n) + (i ? num(v, "contrib") * ((Math.pow(1 + i, n) - 1) / i) : num(v, "contrib") * n);
      const m = Math.round(num(v, "beneficio", 25) * 13);
      const renda = i ? (fv * i) / (1 - Math.pow(1 + i, -m)) : fv / m;
      return { linhas: [{ rotulo: "Saldo projetado", valor: brl(fv), destaque: true }, { rotulo: "Renda mensal estimada (13 por ano)", valor: brl(renda), destaque: true }], memoria: ["Projeção financeira com rentabilidade real constante; o valor efetivo depende do regulamento do plano e das tábuas atuariais."] };
    },
  },
  {
    id: "beneficio-especial",
    secao: 7,
    nome: "Benefício Especial (migração para a previdência complementar)",
    fundamento: "Lei 12.618/2012, art. 3º, §§2º e 3º",
    modo: "form",
    campos: [SEXO, { id: "professor", rotulo: "Professor(a)", tipo: "checkbox" }, { id: "opcao", rotulo: "Data da opção", tipo: "data" }, { id: "tc", rotulo: "Contribuições mensais ao RPPS da União (Tc)", tipo: "inteiro" }, SAL],
    calcular: (v, c) => {
      const r = beneficioEspecial({ remuneracoes: salV(v), dataOpcao: txt(v, "opcao") || c.hoje, indices: c.indices, sexo: txt(v, "sexo", "M") as "M" | "F", professor: bool(v, "professor"), contribuicoesRpps: num(v, "tc") || undefined });
      return {
        linhas: [{ rotulo: "Média dos 80% maiores (IPCA)", valor: brl(r.media) }, { rotulo: "Teto do RGPS na opção", valor: brl(r.tetoRgps) }, { rotulo: "Fator de conversão (Tc/Tt)", valor: `${r.tc}/${r.tt} = ${dec(r.fatorConversao, 4)}` }, { rotulo: "Benefício Especial", valor: brl(r.valor), destaque: true }],
        memoria: ["BE = (média das 80% maiores remunerações desde 07/1994, corrigidas pelo IPCA − teto do RGPS) × Tc/Tt.", "Tt = 455 (homem), 390 (mulher ou professor), 325 (professora). Atualizado pelo IPCA até a aposentadoria."],
      };
    },
  },
  ia("militar-reserva", 7, "Transferência para a reserva remunerada (Forças Armadas e estaduais)", "Lei 6.880/80, art. 97; Lei 13.954/2019, art. 22 (pedágio de 17%)"),
  ia("militar-reforma", 7, "Reforma militar por incapacidade ou idade-limite", "Lei 6.880/80, arts. 104 a 114"),
  ia("militar-pensao", 7, "Pensão militar (Lei 3.765/1960 e Lei 13.954/2019)", "Lei 3.765/60; Lei 13.954/2019"),
  {
    id: "contribuicao-servidor",
    secao: 7,
    nome: "Contribuição progressiva do servidor federal (EC 103, art. 11)",
    fundamento: "EC 103/2019, art. 11",
    modo: "form",
    campos: [{ id: "base", rotulo: "Base de contribuição", tipo: "moeda" }],
    calcular: (v) => {
      const r = contribuicaoProgressiva(num(v, "base"), FAIXAS_SERVIDOR_2026);
      return { linhas: [{ rotulo: "Contribuição", valor: brl(r.total), destaque: true }, { rotulo: "Alíquota efetiva", valor: pct(r.efetiva) }], memoria: ["Faixas até o teto conforme a Portaria Interministerial MPS/MF 13/2026; faixas acima do teto reajustadas pelo mesmo índice — confira."], tabela: { colunas: ["Faixa", "Alíquota", "Valor"], linhas: r.detalhe.map((d) => [`${brl(d.de)} a ${brl(d.ate)}`, pct(d.aliquota, 1), brl(d.valor)]) } };
    },
  },
];

export { fmtData, somaComp };
