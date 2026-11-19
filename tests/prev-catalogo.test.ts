import { describe, expect, it } from "vitest";
import { CALCULADORAS } from "@/lib/prev/calc/catalogo";
import type { Valores } from "@/lib/prev/calc/tipos";

const exemplo: Valores = {
  sexo: "M", nascimento: "1962-04-10", der: "2025-08-01", data: "2025-08-01", dib: "2024-03-01", filiacao: "1985-01-01",
  tAnos: 36, tMeses: 2, t0Anos: 30, t0Meses: 0, media: 4000, anos: 32, contrib: 300, remuneracao: 9000, base: 3500,
  periodos: "01/01/1990 a 31/12/2005 especial25\n01/01/2006 a 31/07/2025 comum",
  salarios: "07/1994 500,00\n01/2010 2.000,00\n01/2020 3.000,00\n02/2020 900,00\n12/2024 4.000,00\n01/2025 4.100,00",
  valor: 100000, meses: 24, total: 80000, renda: 3000, membros: 3, ultima: "2024-03", obito: "2024-05-10", dependentes: 2,
  inicio: "1990-01-01", fim: "2005-12-31", custo: 600, mesesContrib: 60, beneficio: 3500, sb: 3000, rmi: 2000, rmiPaga: 1800,
  primeiro: "2016-05-10", saldo: 100000, aporte: 1000, reserva: 500000, brasil: 20, exterior: 15, teorico: 4000, maior: 3000, menor: 2500,
  agora: 2500, depois: 3200, opcao: "2018-10-01", tc: 200, cumprimento: "2022-01-01", ate: "2025-08-01", nota: 10000,
};

describe("catálogo de calculadoras", () => {
  it("tem ids únicos e cobre as 11 seções", () => {
    const ids = CALCULADORAS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(CALCULADORAS.map((c) => c.secao)).size).toBe(11);
    expect(CALCULADORAS.length).toBeGreaterThan(180);
  });
  it("todas as calculadoras de formulário rodam sem erro", () => {
    for (const c of CALCULADORAS.filter((x) => x.modo === "form")) {
      const r = c.calcular!(exemplo, { indices: {}, hoje: "2025-08-01" });
      expect(r, c.id).toBeTruthy();
      expect(Array.isArray(r.linhas), c.id).toBe(true);
      for (const l of r.linhas) expect(l.valor, `${c.id}: ${l.rotulo}`).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});
