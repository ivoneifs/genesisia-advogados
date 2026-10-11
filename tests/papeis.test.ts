import { describe, expect, it } from "vitest";
import { pode, papelValido } from "@/lib/papeis";

describe("perfis de acesso", () => {
  it("sócio pode tudo", () => {
    expect(pode("SOCIO", "financeiro")).toBe(true);
    expect(pode("SOCIO", "gerenciar")).toBe(true);
    expect(pode("SOCIO", "excluir")).toBe(true);
  });
  it("advogado exclui, mas não vê financeiro nem gerencia", () => {
    expect(pode("ADVOGADO", "excluir")).toBe(true);
    expect(pode("ADVOGADO", "financeiro")).toBe(false);
    expect(pode("ADVOGADO", "gerenciar")).toBe(false);
  });
  it("estagiário não exclui", () => {
    expect(pode("ESTAGIARIO", "excluir")).toBe(false);
    expect(pode("ESTAGIARIO", "financeiro")).toBe(false);
  });
  it("perfil desconhecido não tem permissão e vira advogado ao salvar", () => {
    expect(pode(undefined, "excluir")).toBe(false);
    expect(pode("SUPERADMIN", "financeiro")).toBe(false);
    expect(papelValido("SUPERADMIN")).toBe("ADVOGADO");
    expect(papelValido("ESTAGIARIO")).toBe("ESTAGIARIO");
  });
});
