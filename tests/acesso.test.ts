import { describe, expect, it } from "vitest";
import { motivoBloqueio, trialExpirado, diasRestantesTrial } from "@/lib/acesso";

const dia = 86_400_000;

describe("acesso do escritório", () => {
  it("ativo libera", () => {
    expect(motivoBloqueio({ ativo: true, status: "ATIVO", trialExpira: null })).toBeNull();
  });
  it("suspenso bloqueia", () => {
    expect(motivoBloqueio({ ativo: true, status: "SUSPENSO", trialExpira: null })).toMatch(/suspenso/);
  });
  it("trial vencido bloqueia, trial em dia libera", () => {
    const vencido = { ativo: true, status: "TRIAL", trialExpira: new Date(Date.now() - dia) };
    const emDia = { ativo: true, status: "TRIAL", trialExpira: new Date(Date.now() + 3 * dia) };
    expect(trialExpirado(vencido)).toBe(true);
    expect(motivoBloqueio(vencido)).toMatch(/teste terminou/);
    expect(motivoBloqueio(emDia)).toBeNull();
    expect(diasRestantesTrial(emDia)).toBe(3);
  });
});
