// Estrutura do relatório salvo junto com o cálculo (Calculo.resumo).
// Tanto as calculadoras quanto o cálculo completo geram este formato, e a
// página /relatorio/calculo/[id] o imprime com a marca do escritório.

export type SecaoRelatorio = {
  titulo: string;
  linhas?: { rotulo: string; valor: string; destaque?: boolean }[];
  tabela?: { titulo?: string; colunas: string[]; linhas: string[][] };
  memoria?: string[];
  texto?: string;
};

export type RelatorioDados = {
  titulo: string;
  subtitulo?: string;
  geradoEm: string;
  secoes: SecaoRelatorio[];
  avisos?: string[];
  /** Texto curto para listagens (ex.: "RMI R$ 3.200,00 — art. 17"). */
  destaque?: string;
};

/** Texto plano do relatório (para a IA e para copiar). */
export function relatorioComoTexto(r: RelatorioDados, maxLinhasTabela = 60): string {
  const out: string[] = [r.titulo, r.subtitulo ?? ""];
  for (const s of r.secoes) {
    out.push("", `## ${s.titulo}`);
    for (const l of s.linhas ?? []) out.push(`- ${l.rotulo}: ${l.valor}`);
    if (s.tabela) {
      out.push(s.tabela.colunas.join(" | "));
      const linhas = s.tabela.linhas;
      const mostrar = linhas.length > maxLinhasTabela ? [...linhas.slice(0, maxLinhasTabela / 2), ["..."], ...linhas.slice(-maxLinhasTabela / 2)] : linhas;
      for (const l of mostrar) out.push(l.join(" | "));
    }
    for (const m of s.memoria ?? []) out.push(`* ${m}`);
    if (s.texto) out.push(s.texto);
  }
  for (const a of r.avisos ?? []) out.push(`Aviso: ${a}`);
  return out.filter((x) => x !== undefined).join("\n");
}
