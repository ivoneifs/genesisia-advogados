import { describe, expect, it } from "vitest";
import { normalizarWhatsapp, formatarWhatsapp } from "@/lib/whatsapp";

describe("normalizarWhatsapp", () => {
  it.each([
    ["(11) 98765-4321", "5511987654321"],
    ["11 3456-7890", "551134567890"],
    ["+55 11 98765-4321", "5511987654321"],
    ["005511987654321", "5511987654321"],
  ])("%s → %s", (entrada, saida) => {
    expect(normalizarWhatsapp(entrada)).toBe(saida);
  });
  it.each(["", null, "123", "98765-4321", "+1 415 555 0100"])("rejeita %s", (v) => {
    expect(normalizarWhatsapp(v)).toBeNull();
  });
  it("formata para exibição", () => {
    expect(formatarWhatsapp("5511987654321")).toBe("(11) 98765-4321");
    expect(formatarWhatsapp("551134567890")).toBe("(11) 3456-7890");
  });
});
