// Exporta a minuta para Word (.docx) no padrão forense: Times New Roman 12,
// espaçamento 1,5, margens ABNT (3 cm sup./esq., 2 cm inf./dir.), recuo de
// primeira linha nos parágrafos e títulos em negrito.
// Convenções do texto gerado: linhas TODAS EM MAIÚSCULAS são títulos;
// a primeira delas (o endereçamento) fica em negrito, sem recuo.

const CM = 567; // twips por centímetro

function ehTitulo(linha: string): boolean {
  const letras = linha.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letras.length >= 3 && linha === linha.toLocaleUpperCase("pt-BR") && linha.length <= 160;
}

function ehItemDeLista(linha: string): boolean {
  return /^([a-z]\)|[ivxlc]+\)|[-–•])\s/i.test(linha);
}

function nomeArquivo(titulo: string): string {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return `${base || "peca"}.docx`;
}

export async function baixarDocx(texto: string, titulo: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");

  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  let primeiroTitulo = true;

  const paragrafos = linhas.map((bruta) => {
    const linha = bruta.trim();
    if (!linha) return new Paragraph({ children: [] });

    // Remove marcações Markdown que a IA eventualmente use.
    const limpa = linha.replace(/^#+\s*/, "").replace(/\*\*(.+?)\*\*/g, "$1");

    if (ehTitulo(limpa)) {
      const endereco = primeiroTitulo;
      primeiroTitulo = false;
      return new Paragraph({
        alignment: endereco ? AlignmentType.LEFT : AlignmentType.CENTER,
        spacing: { before: endereco ? 0 : 240, after: 240, line: 360 },
        children: [new TextRun({ text: limpa, bold: true })],
      });
    }

    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 120, line: 360 },
      indent: ehItemDeLista(limpa)
        ? { left: Math.round(1.25 * CM) }
        : { firstLine: Math.round(2.5 * CM) },
      children: [new TextRun({ text: limpa })],
    });
  });

  const doc = new Document({
    creator: "Genesis IA",
    title: titulo,
    styles: {
      default: {
        document: { run: { font: "Times New Roman", size: 24 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 3 * CM, left: 3 * CM, bottom: 2 * CM, right: 2 * CM },
          },
        },
        children: paragrafos,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo(titulo);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
