import { describe, expect, it } from "vitest";
import { CALCULADORAS_TRAB } from "@/lib/trab/calc/catalogo";
import { calcularRescisao, calcularHorasExtras, liquidar } from "@/lib/trab/motor";
import { inssEmpregado } from "@/lib/trab/tabelas";
import type { Valores } from "@/lib/prev/calc/tipos";

describe("motor trabalhista", () => {
  it("INSS progressivo 2026", () => {
    expect(inssEmpregado(3000, "2026-03").valor).toBeCloseTo(121.58 + (2902.84 - 1621) * 0.09 + (3000 - 2902.84) * 0.12, 1);
    expect(inssEmpregado(20000, "2026-03").valor).toBeCloseTo(inssEmpregado(8475.55, "2026-03").valor, 2);
  });
  it("rescisão sem justa causa", () => {
    const r = calcularRescisao({ tipo: "sem_justa_causa", admissao: "2022-03-01", afastamento: "2025-06-15", salario: 3000, mediaVariaveis: 0, aviso: "indenizado", feriasVencidasPeriodos: 0, feriasEmDobro: 0, saldoFgts: 10000, dependentes: 0, atrasoPagamento: false, verbasIncontroversasNaoPagas: false, descontos: 0 });
    expect(r.diasAviso).toBe(39); // 30 + 3×3 anos
    const v = Object.fromEntries(r.linhas.map((l) => [l.verba, l.valor]));
    expect(v["Saldo de salário"]).toBe(1500);
    expect(v["Aviso prévio indenizado"]).toBe(3900);
    expect(v["13º salário proporcional"]).toBe(1500); // 6/12 (jan–jun, 15 dias em junho)
    expect(r.multaFgts).toBeGreaterThan(4000);
    expect(r.liquido).toBeLessThan(r.brutos);
  });
  it("horas extras com DSR", () => {
    const r = calcularHorasExtras({ salario: 2200, divisor: 220, adicionalBase: 0, horasMes: 10, percentual: 50, meses: 1, diasUteis: 25, diasDescanso: 5 });
    expect(r.valorHora).toBeCloseTo(15, 5);
    expect(r.total).toBeCloseTo(150, 5);
    expect(r.dsr).toBeCloseTo(30, 5);
  });
  it("liquidação sem índices não quebra", () => {
    const r = liquidar({ verbas: [{ comp: "2023-01", valor: 1000 }, { comp: "2019-01", valor: 500 }], ajuizamento: "2024-03-10", dataCalculo: "2025-06-01", criterio: "tst2024", prescricao: true, multaFgts40: true, honorariosPct: 10, custasPct: 2, honorariosPericiais: 0, pagos: 0, depositosRecursais: 0, dependentes: 0 }, {});
    expect(r.prescrito).toBe(500);
    expect(r.corrigido).toBe(1000);
    expect(r.fgts).toBe(80);
  });
});

const exemplo: Valores = {
  salario: 3500, base: 3500, media: 400, admissao: "2021-02-01", afastamento: "2025-07-20", horas: 20, meses: 12, remuneracao: 4000,
  verbas: "01/2023 1.000,00\n02/2023 1.000,00\n03/2023 1.200,00", ajuizamento: "2024-05-10", dataCalculo: "2025-08-01",
  remuneracoes: "01/2024 3.000,00\n02/2024 3.000,00", descontos: "01/2024 300,00", quantidades: "01/2024 10\n02/2024 12", valores: "01/2024 500,00", valorAtual: 30,
  devido: 5000, pago: 4000, nascimento: "1980-01-01", inicio: "2024-01-01", fim: "2025-01-01", saldo: 20000, verbas_total: 1, total: 50000, pct: 10,
  marcacoes: "02/01 07:40 12:00 13:00 17:30\n03/01 08:00 12:00 13:00 17:05", minutos: 30, dias: 22, valor: 10000, debito: 30000, causa: 100000,
};

describe("catálogo trabalhista", () => {
  it("ids únicos e 13 seções", () => {
    const ids = CALCULADORAS_TRAB.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(CALCULADORAS_TRAB.map((c) => c.secao)).size).toBe(13);
    expect(CALCULADORAS_TRAB.length).toBeGreaterThan(170);
  });
  it("todas rodam sem NaN", () => {
    for (const c of CALCULADORAS_TRAB) {
      const r = c.calcular!(exemplo, { indices: {}, hoje: "2025-08-01" });
      for (const l of r.linhas) expect(l.valor, `${c.id}: ${l.rotulo}`).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});
