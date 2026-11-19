// Tabelas trabalhistas: contribuição do empregado (INSS) por competência,
// IRRF mensal e constantes da CLT.

import { compN } from "../prev/datas";
import { arred, salarioMinimo, teto } from "../prev/tabelas";
import { irMensal } from "../prev/calc/secao8a11";

type Faixa = { ate: number; aliquota: number };
type Tabela = { desde: string; progressiva: boolean; faixas: Faixa[] };

// Portarias interministeriais anuais (a partir de 03/2020, tabela progressiva — EC 103).
const TABELAS_INSS: Tabela[] = [
  { desde: "2015-01", progressiva: false, faixas: [{ ate: 1399.12, aliquota: 0.08 }, { ate: 2331.88, aliquota: 0.09 }, { ate: 4663.75, aliquota: 0.11 }] },
  { desde: "2016-01", progressiva: false, faixas: [{ ate: 1556.94, aliquota: 0.08 }, { ate: 2594.92, aliquota: 0.09 }, { ate: 5189.82, aliquota: 0.11 }] },
  { desde: "2017-01", progressiva: false, faixas: [{ ate: 1659.38, aliquota: 0.08 }, { ate: 2765.66, aliquota: 0.09 }, { ate: 5531.31, aliquota: 0.11 }] },
  { desde: "2018-01", progressiva: false, faixas: [{ ate: 1693.72, aliquota: 0.08 }, { ate: 2822.9, aliquota: 0.09 }, { ate: 5645.8, aliquota: 0.11 }] },
  { desde: "2019-01", progressiva: false, faixas: [{ ate: 1751.81, aliquota: 0.08 }, { ate: 2919.72, aliquota: 0.09 }, { ate: 5839.45, aliquota: 0.11 }] },
  { desde: "2020-01", progressiva: false, faixas: [{ ate: 1830.29, aliquota: 0.08 }, { ate: 3050.52, aliquota: 0.09 }, { ate: 6101.06, aliquota: 0.11 }] },
  { desde: "2020-03", progressiva: true, faixas: [{ ate: 1045, aliquota: 0.075 }, { ate: 2089.6, aliquota: 0.09 }, { ate: 3134.4, aliquota: 0.12 }, { ate: 6101.06, aliquota: 0.14 }] },
  { desde: "2021-01", progressiva: true, faixas: [{ ate: 1100, aliquota: 0.075 }, { ate: 2203.48, aliquota: 0.09 }, { ate: 3305.22, aliquota: 0.12 }, { ate: 6433.57, aliquota: 0.14 }] },
  { desde: "2022-01", progressiva: true, faixas: [{ ate: 1212, aliquota: 0.075 }, { ate: 2427.35, aliquota: 0.09 }, { ate: 3641.03, aliquota: 0.12 }, { ate: 7087.22, aliquota: 0.14 }] },
  { desde: "2023-01", progressiva: true, faixas: [{ ate: 1302, aliquota: 0.075 }, { ate: 2571.29, aliquota: 0.09 }, { ate: 3856.94, aliquota: 0.12 }, { ate: 7507.49, aliquota: 0.14 }] },
  { desde: "2023-05", progressiva: true, faixas: [{ ate: 1320, aliquota: 0.075 }, { ate: 2571.29, aliquota: 0.09 }, { ate: 3856.94, aliquota: 0.12 }, { ate: 7507.49, aliquota: 0.14 }] },
  { desde: "2024-01", progressiva: true, faixas: [{ ate: 1412, aliquota: 0.075 }, { ate: 2666.68, aliquota: 0.09 }, { ate: 4000.03, aliquota: 0.12 }, { ate: 7786.02, aliquota: 0.14 }] },
  { desde: "2025-01", progressiva: true, faixas: [{ ate: 1518, aliquota: 0.075 }, { ate: 2793.88, aliquota: 0.09 }, { ate: 4190.83, aliquota: 0.12 }, { ate: 8157.41, aliquota: 0.14 }] },
  { desde: "2026-01", progressiva: true, faixas: [{ ate: 1621, aliquota: 0.075 }, { ate: 2902.84, aliquota: 0.09 }, { ate: 4354.27, aliquota: 0.12 }, { ate: 8475.55, aliquota: 0.14 }] },
];

function tabelaInss(comp: string): Tabela {
  let t = TABELAS_INSS[0];
  for (const x of TABELAS_INSS) if (compN(x.desde) <= compN(comp)) t = x;
  if (compN(comp) < compN("2015-01")) {
    // Antes de 2015: faixas proporcionais ao teto da época (aproximação).
    const tt = teto(comp);
    return { desde: comp, progressiva: false, faixas: [{ ate: tt * 0.3, aliquota: 0.08 }, { ate: tt * 0.5, aliquota: 0.09 }, { ate: tt, aliquota: 0.11 }] };
  }
  return t;
}

/** Contribuição do empregado (cota do segurado) numa competência. */
export function inssEmpregado(base: number, comp: string): { valor: number; aliquotaEfetiva: number } {
  const t = tabelaInss(comp);
  const limite = t.faixas[t.faixas.length - 1].ate;
  const b = Math.min(base, limite);
  if (!t.progressiva) {
    const f = t.faixas.find((x) => b <= x.ate) ?? t.faixas[t.faixas.length - 1];
    return { valor: arred(b * f.aliquota), aliquotaEfetiva: f.aliquota };
  }
  let ant = 0, v = 0;
  for (const f of t.faixas) {
    if (b <= ant) break;
    v += (Math.min(b, f.ate) - ant) * f.aliquota;
    ant = f.ate;
  }
  return { valor: arred(v), aliquotaEfetiva: b ? v / b : 0 };
}

export const DEDUCAO_DEPENDENTE_IR = 189.59;
export const DESCONTO_SIMPLIFICADO_IR = 607.2;

/** IRRF mensal (tabela 2026) com dependentes e opção pelo desconto simplificado. */
export function irrf(baseBruta: number, inss: number, dependentes = 0) {
  const legal = baseBruta - inss - dependentes * DEDUCAO_DEPENDENTE_IR;
  const simplificado = baseBruta - DESCONTO_SIMPLIFICADO_IR;
  const base = Math.max(0, Math.min(legal, simplificado));
  return { base: arred(base), valor: irMensal(base, true) };
}

/** Aviso prévio proporcional (Lei 12.506/2011): 30 dias + 3 por ano completo, até 90. */
export function diasAvisoPrevio(anosCompletos: number): number {
  return Math.min(90, 30 + 3 * Math.max(0, Math.floor(anosCompletos)));
}

export { salarioMinimo, teto };
