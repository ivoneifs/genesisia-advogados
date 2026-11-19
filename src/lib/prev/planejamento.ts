// Planejamento previdenciário: projeta a continuidade das contribuições depois
// da DER e encontra, para cada regra, a primeira data em que os requisitos são
// cumpridos e a renda estimada (em valores de hoje, sem inflação futura).

import { EC103, competencia, diaN, deDiaN, fmtData, idadeEm, somaComp, somaDias, somaMeses } from "./datas";
import type { SalarioContribuicao } from "./media";
import { REGRAS_RGPS, avaliarRegra, cumpreRegra, type ContextoCalculo, type ResultadoRegra } from "./rgps";
import { montarLinha, type Periodo, type TipoPeriodo } from "./tempo";

export type Projecao = {
  salario: number; // salário de contribuição mensal projetado
  tipo: TipoPeriodo; // comum ou especial
  professor?: boolean;
  anosMaximo?: number; // horizonte (padrão 40)
};

export type ItemPlanejamento = {
  regra: ResultadoRegra;
  data: string | null; // quando cumpre (null = não cumpre no horizonte)
  jaCumpre: boolean;
  mesesFaltando: number | null;
  idadeNaData: number | null;
  contribuicoesAdicionais: number | null; // meses de contribuição a mais
  custoEstimado: number | null; // contribuições até lá (20% do salário projetado, como contribuinte individual)
};

/** Primeira data ≥ der em que `cumpre(data)` é verdadeiro (passo mensal + refino diário). */
export function primeiraData(der: string, limite: string, cumpre: (data: string) => boolean): string | null {
  if (cumpre(der)) return der;
  let anterior = der;
  let atual = somaMeses(der, 1);
  while (atual <= limite) {
    if (cumpre(atual)) {
      // refina dia a dia entre `anterior` e `atual`
      for (let d = diaN(anterior) + 1; d <= diaN(atual); d++) {
        const dia = deDiaN(d);
        if (cumpre(dia)) return dia;
      }
      return atual;
    }
    anterior = atual;
    atual = somaMeses(atual, 1);
  }
  return null;
}

export function planejar(c: ContextoCalculo, periodos: Periodo[], p: Projecao): ItemPlanejamento[] {
  const anos = p.anosMaximo ?? 40;
  const inicio = somaDias(c.segurado.der, 1);
  const fim = somaMeses(inicio, anos * 12);
  const projetado: Periodo = { id: "projecao", inicio, fim, tipo: p.tipo, professor: p.professor, carencia: true, projetado: true };
  const salarios: SalarioContribuicao[] = [...c.salarios];
  for (let comp = competencia(inicio); comp <= competencia(fim); comp = somaComp(comp, 1)) {
    salarios.push({ comp, valor: p.salario, origem: "projeção" });
  }
  const ctx: ContextoCalculo = { ...c, linha: montarLinha([...periodos, projetado], c.segurado.sexo, fim), salarios };

  const itens: ItemPlanejamento[] = [];
  for (const def of REGRAS_RGPS) {
    const naDer = avaliarRegra(def, c);
    if (!naDer.aplicavel) continue;
    if (def.direitoAdquirido) {
      // Direito adquirido não depende do futuro: ou já tinha em 13/11/2019 ou não terá.
      itens.push({ regra: naDer, data: naDer.cumpre ? EC103 : null, jaCumpre: naDer.cumpre, mesesFaltando: naDer.cumpre ? 0 : null, idadeNaData: null, contribuicoesAdicionais: naDer.cumpre ? 0 : null, custoEstimado: naDer.cumpre ? 0 : null });
      continue;
    }
    const data = primeiraData(c.segurado.der, fim, (d) => cumpreRegra(def, ctx, d));
    const regra = data ? avaliarRegra(def, ctx, data) : naDer;
    const meses = data ? Math.max(0, Math.round((diaN(data) - diaN(c.segurado.der)) / 30.4375)) : null;
    itens.push({
      regra,
      data,
      jaCumpre: naDer.cumpre,
      mesesFaltando: meses,
      idadeNaData: data ? idadeEm(c.segurado.nascimento, data) : null,
      contribuicoesAdicionais: meses,
      custoEstimado: meses !== null ? meses * p.salario * 0.2 : null,
    });
  }
  return itens.sort((a, b) => {
    if (a.data && b.data) return a.data < b.data ? -1 : a.data > b.data ? 1 : b.regra.rmi - a.regra.rmi;
    return a.data ? -1 : b.data ? 1 : 0;
  });
}

/** Ponto de equilíbrio: em quantos meses a renda maior de esperar compensa os meses sem receber. */
export function pontoEquilibrio(rendaAgora: number, rendaDepois: number, mesesEspera: number): number | null {
  if (rendaDepois <= rendaAgora) return null;
  const perdido = rendaAgora * mesesEspera * (13 / 12);
  return Math.ceil(perdido / ((rendaDepois - rendaAgora) * (13 / 12)));
}

export function descreverData(d: string | null) {
  return d ? fmtData(d) : "não alcança no horizonte";
}
