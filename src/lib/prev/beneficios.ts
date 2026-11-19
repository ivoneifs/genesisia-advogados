// Benefícios não programados do RGPS e ferramentas avulsas.

import { competencia, diaN, idadeEm, somaComp, somaDias, deDiaN, amd, fmtData } from "./datas";
import type { Indices } from "./indices";
import { calcularMedia, limitarRenda, mediaUltimos12, type SalarioContribuicao } from "./media";
import { coeficienteArt26 } from "./rgps";
import { arred, parcelaAcumulo, salarioMinimo } from "./tabelas";
import type { Sexo } from "./tempo";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Auxílio por incapacidade temporária (auxílio-doença): 91% da média, limitado à média dos últimos 12. */
export function incapacidadeTemporaria(salarios: SalarioContribuicao[], dib: string, indices: Indices) {
  const m = calcularMedia({ salarios, dib, indices, criterio: dib > "2019-11-13" ? "100" : "80" });
  const bruto = m.media * 0.91;
  const ult12 = mediaUltimos12(salarios, dib, indices);
  const limitado = ult12 > 0 ? Math.min(bruto, ult12) : bruto;
  const r = limitarRenda(limitado, dib);
  return {
    media: m.media,
    bruto: arred(bruto),
    mediaUltimos12: arred(ult12),
    rmi: r.valor,
    memoria: [
      `Média: ${brl(m.media)}; 91% = ${brl(bruto)}.`,
      `Limite da média dos 12 últimos salários (Lei 8.213, art. 29, §10): ${brl(ult12)}.`,
      `RMI: ${brl(r.valor)}${r.elevadoPiso ? " (elevada ao mínimo)" : r.limitadoTeto ? " (teto)" : ""}.`,
    ],
  };
}

/** Aposentadoria por incapacidade permanente (invalidez). */
export function incapacidadePermanente(opts: {
  salarios: SalarioContribuicao[];
  dib: string;
  indices: Indices;
  sexo: Sexo;
  anosContribuicao: number;
  acidentaria: boolean; // acidente de trabalho, doença profissional ou do trabalho
  grandeInvalidez?: boolean; // +25% (Lei 8.213, art. 45)
}) {
  const pos = opts.dib > "2019-11-13";
  const m = calcularMedia({ salarios: opts.salarios, dib: opts.dib, indices: opts.indices, criterio: pos ? "100" : "80" });
  const coef = !pos || opts.acidentaria ? 1 : coeficienteArt26(opts.anosContribuicao, opts.sexo === "M" ? 20 : 15);
  const r = limitarRenda(m.media * coef, opts.dib);
  const acrescimo = opts.grandeInvalidez ? arred(r.valor * 0.25) : 0;
  return {
    media: m.media,
    coeficiente: coef,
    rmi: r.valor,
    acrescimo25: acrescimo,
    total: arred(r.valor + acrescimo),
    memoria: [
      `Média: ${brl(m.media)}.`,
      pos
        ? opts.acidentaria
          ? "Acidentária: 100% da média (EC 103, art. 26, §3º, II)."
          : `Coeficiente 60% + 2% por ano acima de ${opts.sexo === "M" ? 20 : 15}: ${(coef * 100).toFixed(0)}%.`
        : "DIB até 13/11/2019: 100% do salário de benefício.",
      ...(acrescimo ? [`Acréscimo de 25% (assistência permanente): ${brl(acrescimo)} — pode ultrapassar o teto.`] : []),
    ],
  };
}

/** Auxílio-acidente: 50% do salário de benefício. */
export function auxilioAcidente(salarios: SalarioContribuicao[], dib: string, indices: Indices) {
  const m = calcularMedia({ salarios, dib, indices, criterio: dib > "2019-11-13" ? "100" : "80" });
  return { media: m.media, rmi: arred(m.media * 0.5), memoria: [`50% da média (${brl(m.media)}) — não sujeito ao piso do salário mínimo.`] };
}

// ---- Pensão por morte (EC 103, art. 23; Lei 8.213, art. 77) ----

export function duracaoPensaoConjuge(idadeConjuge: number, contribuicoes18: boolean, uniao2anos: boolean) {
  if (!contribuicoes18 || !uniao2anos) return { texto: "4 meses", meses: 4, vitalicia: false };
  const faixas: [number, number][] = [
    [22, 3], [28, 6], [31, 10], [42, 15], [45, 20],
  ];
  for (const [limite, anos] of faixas) {
    if (idadeConjuge < limite) return { texto: `${anos} anos`, meses: anos * 12, vitalicia: false };
  }
  return { texto: "vitalícia", meses: null, vitalicia: true };
}

export function pensaoPorMorte(opts: {
  baseCalculo: number; // aposentadoria que recebia ou a que teria por incapacidade permanente
  dependentes: number;
  dependenteInvalido: boolean;
  obito: string;
  tetoNaData?: number;
}) {
  const sm = salarioMinimo(competencia(opts.obito));
  const pos = opts.obito > "2019-11-13";
  let cota = 1;
  let memoria: string[];
  if (!pos) {
    memoria = ["Óbito até 13/11/2019: 100% da aposentadoria (Lei 8.213, art. 75, redação anterior)."];
  } else if (opts.dependenteInvalido) {
    memoria = ["Dependente inválido ou com deficiência: 100% até o teto e cotas sobre o excedente (EC 103, art. 23, §2º)."];
  } else {
    cota = Math.min(1, 0.5 + 0.1 * Math.max(1, opts.dependentes));
    memoria = [`Cota familiar: 50% + 10% × ${opts.dependentes} dependente(s) = ${(cota * 100).toFixed(0)}%.`];
  }
  const valor = Math.max(sm, opts.baseCalculo * cota);
  const porDependente = opts.dependentes > 0 ? valor / opts.dependentes : valor;
  memoria.push(`Pensão: ${brl(opts.baseCalculo)} × ${(cota * 100).toFixed(0)}% = ${brl(valor)} (mínimo de ${brl(sm)}).`);
  return { cota, valor: arred(valor), porDependente: arred(porDependente), memoria };
}

// ---- Qualidade de segurado (Lei 8.213, art. 15) ----

export function qualidadeSegurado(opts: {
  ultimaContribuicao: string; // AAAA-MM (competência)
  mais120Contribuicoes: boolean;
  desempregoRegistrado: boolean;
  facultativo?: boolean;
  dataReferencia: string;
}) {
  let graca = opts.facultativo ? 6 : 12;
  const detalhes = [opts.facultativo ? "Facultativo: 6 meses" : "Regra geral: 12 meses"];
  if (!opts.facultativo && opts.mais120Contribuicoes) {
    graca += 12;
    detalhes.push("+12 meses: mais de 120 contribuições sem perda da qualidade (§1º)");
  }
  if (!opts.facultativo && opts.desempregoRegistrado) {
    graca += 12;
    detalhes.push("+12 meses: desemprego comprovado (§2º)");
  }
  // Perde no dia 16 do segundo mês seguinte ao fim do período de graça (§4º).
  const fimGraca = somaComp(opts.ultimaContribuicao, graca);
  const perda = `${somaComp(fimGraca, 2)}-16`;
  const mantem = opts.dataReferencia < perda;
  return {
    mesesGraca: graca,
    fimGraca,
    perda,
    mantem,
    diasRestantes: mantem ? diaN(perda) - diaN(opts.dataReferencia) : 0,
    detalhes,
    texto: mantem
      ? `Mantém a qualidade de segurado até ${fmtData(somaDias(perda, -1))}.`
      : `Perdeu a qualidade de segurado em ${fmtData(perda)}.`,
  };
}

// ---- Contagem entre datas ----

export function contagemDatas(inicio: string, fim: string) {
  const dias = diaN(fim) - diaN(inicio) + 1;
  const { anos, meses, dias: d } = amd(dias);
  return { dias, anos, meses, diasResto: d, semanas: Math.floor(dias / 7), idade: idadeEm(inicio, fim) };
}

export function somarAoDia(data: string, dias: number) {
  return deDiaN(diaN(data) + dias);
}

// ---- Acúmulo de benefícios (EC 103, art. 24, §2º) ----

export function acumulo(maior: number, menor: number, data: string) {
  const sm = salarioMinimo(competencia(data));
  const parte = parcelaAcumulo(menor, sm);
  return { maior, menorIntegral: menor, menorReduzido: parte.total, total: arred(maior + parte.total), perda: arred(menor - parte.total), faixas: parte.faixas, sm };
}
