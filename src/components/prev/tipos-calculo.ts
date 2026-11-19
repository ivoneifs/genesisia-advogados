// Dados do cálculo previdenciário completo (salvos em Calculo.dados).

import type { ParametrosAtrasados } from "@/lib/prev/atrasados";
import type { SalarioContribuicao } from "@/lib/prev/media";
import type { GrauPcd } from "@/lib/prev/rgps";
import type { Periodo, TipoPeriodo } from "@/lib/prev/tempo";
import { hojeISO } from "@/lib/prev/datas";

export type DadosCompleto = {
  regime: "RGPS" | "RPPS";
  segurado: { nome: string; cpf: string; sexo: "M" | "F"; nascimento: string; der: string; pcdGrau: GrauPcd | "" };
  servidor: { ingressoServicoPublico: string; remuneracaoCargo: number; rpc: boolean };
  periodos: Periodo[];
  salarios: SalarioContribuicao[];
  projecao: { salario: number; tipo: TipoPeriodo; professor: boolean; cenario: "minimo" | "teto" | "atual" | "personalizado" };
  atrasados: Omit<ParametrosAtrasados, "rmiDevida"> & { regraId: string; rmiManual: number };
  avisosCnis: string[];
};

export function dadosIniciais(regime: "RGPS" | "RPPS" = "RGPS"): DadosCompleto {
  const hoje = hojeISO();
  return {
    regime,
    segurado: { nome: "", cpf: "", sexo: "M", nascimento: "", der: hoje, pcdGrau: "" },
    servidor: { ingressoServicoPublico: "", remuneracaoCargo: 0, rpc: false },
    periodos: [],
    salarios: [],
    projecao: { salario: 0, tipo: "comum", professor: false, cenario: "atual" },
    atrasados: {
      regraId: "",
      rmiManual: 0,
      dib: hoje,
      fim: hoje,
      rmiPaga: 0,
      dibPaga: "",
      reajuste: "INSS",
      indice: regime === "RPPS" ? "IPCAE" : "INPC",
      usarSelicEC113: true,
      juros: "poupanca",
      citacao: "",
      ajuizamento: "",
      prescricao: true,
      incluir13: true,
      dataCalculo: hoje,
      honorariosPercentual: 10,
      sentenca: "",
      pagamentosAdministrativos: [],
    },
    avisosCnis: [],
  };
}

export const ROTULO_TIPO: Record<TipoPeriodo, string> = {
  comum: "Comum",
  especial25: "Especial 25",
  especial20: "Especial 20",
  especial15: "Especial 15",
};
