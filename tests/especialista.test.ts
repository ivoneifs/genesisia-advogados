import { describe, expect, it } from "vitest";
import { areaDoNome, detectarAreas, promptEspecialista } from "@/lib/ai/especialista";

describe("especialista jurídico", () => {
  it("detecta a área pelo pedido", () => {
    expect(detectarAreas("elabore reclamação trabalhista com horas extras e FGTS")[0]).toBe("trabalhista");
    expect(detectarAreas("aposentadoria especial com PPP e CNIS do INSS")[0]).toBe("previdenciario");
    expect(detectarAreas("habeas corpus contra prisão preventiva por tráfico")[0]).toBe("penal");
    expect(detectarAreas("ação de alimentos e guarda do filho")[0]).toBe("familia");
    expect(detectarAreas("bom dia")).toEqual([]);
  });
  it("mapeia a área da biblioteca de peças", () => {
    expect(areaDoNome("Recursos, Ações e Incidentes Criminais")).toBe("penal");
    expect(areaDoNome("Família e Sucessões")).toBe("familia");
  });
  it("monta o prompt com núcleo, especialização e tarefa", () => {
    const p = promptEspecialista({ areas: ["trabalhista"], tarefa: "peca" });
    expect(p).toContain("GENESIS JURÍDICO");
    expect(p).toContain("ESPECIALISTA EM DIREITO E PROCESSO DO TRABALHO");
    expect(p).toContain("FIDELIDADE");
    expect(p).toContain("Retorne apenas o texto da peça");
  });
});
