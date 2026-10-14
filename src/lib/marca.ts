// Personalização visual de cada escritório: logo, imagem de capa, nome do
// topo, cores e tamanho das letras. Os arquivos ficam em lib/marca-arquivos.

export type TipoImagem = "logo" | "capa";

export const corValida = (c: unknown): string | null =>
  typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : null;

/** Escurece uma cor #rrggbb (fator 0..1). */
export function escurecer(hex: string, fator = 0.15) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (s: number) => Math.round(((n >> s) & 255) * (1 - fator));
  return `#${[16, 8, 0].map((s) => canal(s).toString(16).padStart(2, "0")).join("")}`;
}

export const TAMANHOS_FONTE = [
  { valor: 90, label: "Pequena" },
  { valor: 100, label: "Normal" },
  { valor: 112, label: "Grande" },
  { valor: 125, label: "Muito grande" },
  { valor: 140, label: "Extra grande" },
];
export const fonteValida = (v: number) =>
  TAMANHOS_FONTE.some((t) => t.valor === v) ? v : 100;

type Marca = {
  id: string;
  nome: string;
  nomeTopo: string | null;
  logoVersao: string | null;
  capaVersao: string | null;
  corPrimaria: string | null;
  corMenu: string | null;
  tamanhoFonte: number;
};

export const urlImagem = (id: string, tipo: TipoImagem, versao: string | null) =>
  versao ? `/api/marca/${id}/${tipo}?v=${versao}` : null;

/** Dados prontos para o layout do app. */
export function marcaDoEscritorio(e: Marca) {
  return {
    nomeTopo: e.nomeTopo || "Genesis IA",
    logoUrl: urlImagem(e.id, "logo", e.logoVersao),
    capaUrl: urlImagem(e.id, "capa", e.capaVersao),
    corMenu: e.corMenu,
    tamanhoFonte: e.tamanhoFonte,
    // Variáveis CSS que todos os componentes já usam (--brand, --brand-dark).
    estilo: (e.corPrimaria
      ? { "--brand": e.corPrimaria, "--brand-dark": escurecer(e.corPrimaria) }
      : {}) as React.CSSProperties,
  };
}
export type MarcaApp = ReturnType<typeof marcaDoEscritorio>;
