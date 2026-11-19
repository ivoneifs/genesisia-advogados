import { describe, expect, it } from "vitest";
import { amd, idadeEm } from "@/lib/prev/datas";
import { montarLinha, tempoEm, type Periodo } from "@/lib/prev/tempo";
import { analisarRgps, coeficienteArt26 } from "@/lib/prev/rgps";
import { calcularMedia } from "@/lib/prev/media";
import { expectativaSobrevida, fatorPrevidenciario, parcelaAcumulo, pontosArt15, idadeArt16, idadeArt18 } from "@/lib/prev/tabelas";
import { planejar } from "@/lib/prev/planejamento";

const comum = (inicio: string, fim: string, extra: Partial<Periodo> = {}): Periodo => ({ id: inicio, inicio, fim, tipo: "comum", ...extra });
const salarios = (de: string, ate: string, valor: number) => {
  const r: { comp: string; valor: number }[] = [];
  let [a, m] = de.split("-").map(Number);
  const [af, mf] = ate.split("-").map(Number);
  while (a < af || (a === af && m <= mf)) {
    r.push({ comp: `${a}-${String(m).padStart(2, "0")}`, valor });
    m++; if (m > 12) { m = 1; a++; }
  }
  return r;
};

describe("tabelas", () => {
  it("pontos e idades de transição", () => {
    expect(pontosArt15("2025-06-01", "M")).toBe(102);
    expect(pontosArt15("2025-06-01", "F")).toBe(92);
    expect(pontosArt15("2040-01-01", "M")).toBe(105);
    expect(idadeArt16("2025-01-01", "M")).toBe(64);
    expect(idadeArt16("2025-01-01", "F")).toBe(59);
    expect(idadeArt18("2023-05-01", "F")).toBe(62);
  });
  it("fator previdenciário", () => {
    // 35 anos de contribuição, 55 anos de idade, expectativa 26,5
    expect(fatorPrevidenciario(35, 55, 26.5)).toBeCloseTo(0.679, 3);
    const es = expectativaSobrevida("2025-06-10", 60.4);
    expect(es.tabua).toBe(2023);
    expect(es.valor).toBe(22.5);
  });
  it("acúmulo art. 24", () => {
    // benefício de 3 SM com SM = 1000: 1000 + 600 + 400
    expect(parcelaAcumulo(3000, 1000).total).toBe(2000);
  });
  it("coeficiente art. 26", () => {
    expect(coeficienteArt26(40.3, 20)).toBeCloseTo(1.0);
    expect(coeficienteArt26(25, 15)).toBeCloseTo(0.8);
  });
});

describe("tempo", () => {
  it("concomitância conta uma vez e especial converte até a EC 103", () => {
    const l = montarLinha([comum("2000-01-01", "2009-12-31"), comum("2005-01-01", "2006-12-31"), { id: "e", inicio: "2010-01-01", fim: "2019-12-31", tipo: "especial25" }], "M");
    const t = tempoEm(l, "2019-12-31");
    expect(Math.round(t.diasBrutos)).toBe(7305);
    // 10 anos comuns + ~9,87 anos especiais ×1,4 + 48 dias comuns
    expect(t.anos).toBeGreaterThan(23.7);
    expect(t.anos).toBeLessThan(23.95);
    expect(t.carencia).toBe(240);
    expect(amd(3653).anos).toBe(10);
  });
});

describe("regras RGPS", () => {
  const segurado = { nome: "Teste", sexo: "M" as const, nascimento: "1965-03-10", der: "2025-01-15" };
  const periodos = [comum("1985-01-01", "2024-12-31")];
  const ctx = { segurado, linha: montarLinha(periodos, "M"), salarios: salarios("2010-01", "2024-12", 3000), indices: {} };

  it("analisa todas as regras", () => {
    const r = Object.fromEntries(analisarRgps(ctx).map((x) => [x.id, x]));
    expect(r["da-atc"].cumpre).toBe(false); // 34,9 anos em 13/11/2019
    expect(r["art17"].aplicavel).toBe(true);
    expect(r["art17"].cumpre).toBe(true);
    expect(r["art17"].fator?.aplicado).toBe(true);
    expect(r["art15"].cumpre).toBe(false); // 99,8 pontos < 102
    expect(r["art16"].cumpre).toBe(false);
    expect(r["art20"].cumpre).toBe(false);
    expect(r["art17"].media?.media).toBeCloseTo(3000, 2);
    expect(r["art17"].rmi).toBeLessThan(3000);
    expect(idadeEm("1965-03-10", "2025-03-10")).toBeCloseTo(60, 5);
  });

  it("planejamento encontra as datas futuras", () => {
    const plano = planejar(ctx, periodos, { salario: 3000, tipo: "comum" });
    const art20 = plano.find((p) => p.regra.id === "art20")!;
    expect(art20.data).toBe("2025-03-10"); // completa 60 anos
    expect(art20.regra.rmi).toBeCloseTo(3000, 0);
    const art15 = plano.find((p) => p.regra.id === "art15")!;
    expect(art15.data! > "2025-06-01").toBe(true);
  });

  it("média 80% com divisor mínimo", () => {
    const m = calcularMedia({ salarios: salarios("2015-01", "2019-10", 2000), dib: "2019-11-13", indices: {}, criterio: "80", aplicarDivisorMinimo: true, primeiraFiliacao: "1990-01-01" });
    expect(m.divisorMinimo).toBe(true);
    expect(m.media).toBeLessThan(2000);
  });
});

import { lerCnis, cnisParaCalculo } from "@/lib/prev/cnis";
import { calcularAtrasados } from "@/lib/prev/atrasados";
import { qualidadeSegurado, pensaoPorMorte } from "@/lib/prev/beneficios";
import { beneficioEspecial, contribuicaoProgressiva, analisarRpps } from "@/lib/prev/rpps";

describe("CNIS", () => {
  const texto = `INSS Extrato Previdenciário
Identificação do Filiado
NIT: 123.45678.90-1 CPF: 123.456.789-09 Nome: MARIA DA SILVA SOUZA
Data de nascimento: 10/05/1970 Nome da mãe: ANA DA SILVA
Relações Previdenciárias
Seq. NIT Código Emp. Origem do Vínculo Tipo Filiado no Vínculo Data Início Data Fim Últ. Remun.
1 123.45678.90-1 12.345.678/0001-90 METALURGICA EXEMPLO LTDA Empregado ou Agente Público 01/03/1995 31/12/2005 12/2005 IEAN
Remunerações
Competência Remuneração Indicadores Competência Remuneração Indicadores
03/1995 500,00 04/1995 520,00 PREM-EXT
05/1995 530,00
2 123.45678.90-1 RECOLHIMENTO Contribuinte Individual 01/01/2015 31/03/2015
Contribuições
Competência Data Pgto. Contribuição Salário Contribuição Indicadores
01/2015 15/02/2015 173,36 788,00
02/2015 15/03/2015 173,36 788,00
03/2015 15/04/2015 173,36 788,00`;
  it("extrai segurado, vínculos e remunerações", () => {
    const r = lerCnis(texto);
    expect(r.segurado.nome).toBe("MARIA DA SILVA SOUZA");
    expect(r.segurado.nascimento).toBe("1970-05-10");
    expect(r.vinculos).toHaveLength(2);
    expect(r.vinculos[0].inicio).toBe("1995-03-01");
    expect(r.vinculos[0].fim).toBe("2005-12-31");
    expect(r.vinculos[0].indicadores).toContain("IEAN");
    expect(r.vinculos[0].remuneracoes).toHaveLength(3);
    expect(r.vinculos[1].remuneracoes[0]).toMatchObject({ comp: "2015-01", valor: 788 });
    const c = cnisParaCalculo(r);
    expect(c.periodos[0].tipo).toBe("especial25");
    expect(c.salarios).toHaveLength(6);
  });
});

describe("atrasados", () => {
  it("concessão com 13º e prescrição", () => {
    const r = calcularAtrasados({
      dib: "2020-03-15", fim: "2022-02-28", rmiDevida: 2000, reajuste: "nenhum", indice: "INPC", usarSelicEC113: false,
      juros: "nenhum", prescricao: false, incluir13: true, dataCalculo: "2022-03-01",
    }, {});
    const mensais = r.linhas.filter((l) => l.tipo === "mensal");
    expect(mensais[0].devido).toBeCloseTo(2000 * 17 / 30, 1); // 15 a 31/03
    expect(r.linhas.filter((l) => l.tipo === "13º")).toHaveLength(3);
    expect(r.totais.total).toBeGreaterThan(2000 * 23);
  });
});

describe("benefícios e RPPS", () => {
  it("qualidade de segurado", () => {
    const q = qualidadeSegurado({ ultimaContribuicao: "2024-03", mais120Contribuicoes: false, desempregoRegistrado: false, dataReferencia: "2025-05-10" });
    expect(q.perda).toBe("2025-05-16");
    expect(q.mantem).toBe(true);
  });
  it("pensão por morte", () => {
    expect(pensaoPorMorte({ baseCalculo: 3000, dependentes: 2, dependenteInvalido: false, obito: "2024-01-10" }).valor).toBe(2100);
  });
  it("contribuição progressiva e benefício especial", () => {
    expect(contribuicaoProgressiva(1621).total).toBeCloseTo(121.58, 1);
    const be = beneficioEspecial({ remuneracoes: salarios("2000-01", "2015-12", 15000), dataOpcao: "2016-01-10", indices: {}, sexo: "M", contribuicoesRpps: 208 });
    expect(be.valor).toBeCloseTo((15000 - 5189.82) * 208 / 455, 0);
  });
  it("regras do servidor", () => {
    const periodos: Periodo[] = [{ id: "s", inicio: "1984-01-01", fim: "2025-12-31", tipo: "comum", regime: "RPPS", servicoPublico: true, carreira: true, cargo: true }];
    const r = analisarRpps({
      servidor: { nome: "S", sexo: "M", nascimento: "1958-01-01", der: "2026-01-02", remuneracaoCargo: 12000, rpc: false },
      linha: montarLinha(periodos, "M"), salarios: salarios("2000-01", "2025-12", 12000), indices: {},
    });
    const ec41 = r.find((x) => x.id === "rpps-ec41-art6")!;
    expect(ec41.cumpre).toBe(true);
    expect(ec41.integralidade).toBe(true);
    expect(ec41.rmi).toBe(12000);
  });
});
