export type TemplateContext = {
  clienteNome: string;
  clienteDocumento: string;
  clienteEndereco: string;
  processoNumero: string;
  processoVara: string;
  processoTribunal: string;
  parteContraria: string;
  dataExtenso: string;
};

export const TEMPLATES: {
  id: string;
  nome: string;
  gerar: (ctx: TemplateContext) => string;
}[] = [
  {
    id: "procuracao",
    nome: "Procuração ad judicia",
    gerar: (c) => `PROCURAÇÃO "AD JUDICIA"

OUTORGANTE: ${c.clienteNome || "[cliente]"}, portador(a) do documento nº ${
      c.clienteDocumento || "[documento]"
    }, residente e domiciliado(a) em ${c.clienteEndereco || "[endereço]"}.

OUTORGADO(A): [Nome do(a) advogado(a)], inscrito(a) na OAB sob o nº [OAB].

PODERES: Pelo presente instrumento particular de procuração, o(a) outorgante nomeia e constitui seu(sua) bastante procurador(a) o(a) outorgado(a) acima qualificado(a), a quem confere amplos poderes para o foro em geral, com a cláusula "ad judicia", podendo propor contra quem de direito as ações competentes e defendê-lo(a) nas contrárias, seguindo umas e outras até final decisão, usando os recursos legais e acompanhando-os, conferindo-lhe, ainda, poderes especiais para confessar, desistir, transigir, firmar compromissos ou acordos, receber e dar quitação, agindo em conjunto ou separadamente, podendo ainda substabelecer esta em outrem, com ou sem reserva de poderes, dando tudo por bom, firme e valioso.

${c.dataExtenso}

_______________________________________
${c.clienteNome || "[cliente]"}`,
  },
  {
    id: "notificacao",
    nome: "Notificação extrajudicial",
    gerar: (c) => `NOTIFICAÇÃO EXTRAJUDICIAL

NOTIFICANTE: ${c.clienteNome || "[cliente]"}
NOTIFICADO(A): ${c.parteContraria || "[parte notificada]"}

Pela presente, vimos NOTIFICAR o(a) destinatário(a) acima qualificado(a) para que, no prazo de 10 (dez) dias contados do recebimento desta, regularize a situação relacionada a [descrever o objeto da notificação], sob pena de adoção das medidas judiciais cabíveis para resguardo dos direitos do(a) notificante.

Sem mais para o momento, subscrevemo-nos.

${c.dataExtenso}

_______________________________________
${c.clienteNome || "[cliente]"}`,
  },
  {
    id: "peticao",
    nome: "Petição simples",
    gerar: (c) => `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO ${
      c.processoVara ? `DA ${c.processoVara.toUpperCase()}` : "DA VARA COMPETENTE"
    }${c.processoTribunal ? ` — ${c.processoTribunal}` : ""}

Processo nº ${c.processoNumero || "[número do processo]"}

${c.clienteNome || "[cliente]"}, já qualificado(a) nos autos do processo em epígrafe, que move em face de ${
      c.parteContraria || "[parte contrária]"
    }, vem, respeitosamente, à presença de Vossa Excelência, requerer:

[descrever o pedido]

Termos em que,
Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do(a) advogado(a)] — OAB/[UF] [número]`,
  },
  {
    id: "contrato-honorarios",
    nome: "Contrato de honorários",
    gerar: (c) => `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

CONTRATANTE: ${c.clienteNome || "[cliente]"}, portador(a) do documento nº ${
      c.clienteDocumento || "[documento]"
    }.

CONTRATADO(A): [Escritório/Advogado(a)], inscrito(a) na OAB sob o nº [OAB].

OBJETO: O(A) contratado(a) prestará serviços de assessoria e representação jurídica ao(à) contratante referente a ${
      c.processoNumero ? `o processo nº ${c.processoNumero}` : "[descrever o caso]"
    }.

HONORÁRIOS: Pelos serviços prestados, o(a) contratante pagará ao(à) contratado(a) a quantia de R$ [valor], podendo ainda incidir honorários de êxito de [percentual]% sobre o proveito econômico obtido.

Por estarem justos e contratados, firmam o presente instrumento.

${c.dataExtenso}

_______________________________________          _______________________________________
${c.clienteNome || "[cliente]"} (Contratante)      [Advogado(a)] (Contratado(a))`,
  },
];
