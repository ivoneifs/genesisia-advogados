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
  {
    id: "contestacao",
    nome: "Contestação",
    gerar: (c) => `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO ${
      c.processoVara ? `DA ${c.processoVara.toUpperCase()}` : "DA VARA COMPETENTE"
    }${c.processoTribunal ? ` — ${c.processoTribunal}` : ""}

Processo nº ${c.processoNumero || "[número do processo]"}

${c.parteContraria || "[parte contrária]"}, já qualificado(a) nos autos do processo em epígrafe movido por ${
      c.clienteNome || "[cliente]"
    }, vem, respeitosamente, à presença de Vossa Excelência, apresentar

CONTESTAÇÃO

pelos fatos e fundamentos jurídicos a seguir expostos.

I. DOS FATOS
[descrever os fatos]

II. DO DIREITO
[descrever os fundamentos jurídicos]

III. DOS PEDIDOS
Ante o exposto, requer-se a total improcedência dos pedidos formulados na inicial, condenando-se a parte autora ao pagamento das custas processuais e honorários advocatícios.

Termos em que,
Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do(a) advogado(a)] — OAB/[UF] [número]`,
  },
  {
    id: "acordo-extrajudicial",
    nome: "Acordo extrajudicial (instrumento particular)",
    gerar: (c) => `TERMO DE ACORDO EXTRAJUDICIAL

Pelo presente instrumento particular, de um lado ${
      c.clienteNome || "[cliente]"
    }, doravante denominado(a) PRIMEIRO(A) ACORDANTE, e de outro lado ${
      c.parteContraria || "[parte contrária]"
    }, doravante denominado(a) SEGUNDO(A) ACORDANTE, resolvem celebrar o presente acordo, mediante as cláusulas seguintes:

CLÁUSULA 1ª — DO OBJETO
[descrever o objeto do acordo]

CLÁUSULA 2ª — DO VALOR E FORMA DE PAGAMENTO
[descrever valor e condições]

CLÁUSULA 3ª — DA QUITAÇÃO
As partes dão-se mutuamente plena, geral e irrevogável quitação quanto ao objeto deste acordo, nada mais tendo a reclamar uma da outra a qualquer título.

E, por estarem assim justas e acordadas, firmam o presente termo.

${c.dataExtenso}

_______________________________________          _______________________________________
${c.clienteNome || "[cliente]"} (1º Acordante)      ${
      c.parteContraria || "[parte contrária]"
    } (2º Acordante)`,
  },
  {
    id: "juntada-documentos",
    nome: "Petição de juntada de documentos",
    gerar: (c) => `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO ${
      c.processoVara ? `DA ${c.processoVara.toUpperCase()}` : "DA VARA COMPETENTE"
    }${c.processoTribunal ? ` — ${c.processoTribunal}` : ""}

Processo nº ${c.processoNumero || "[número do processo]"}

${c.clienteNome || "[cliente]"}, já qualificado(a) nos autos do processo em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, requerer a juntada aos autos dos documentos anexos, referentes a [descrever os documentos], para os devidos fins de direito.

Termos em que,
Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do(a) advogado(a)] — OAB/[UF] [número]`,
  },
  {
    id: "substabelecimento",
    nome: "Substabelecimento (com ou sem reserva de poderes)",
    gerar: (c) => `SUBSTABELECIMENTO (COM OU SEM RESERVA DE PODERES)

SUBSTABELECENTE: [Nome do Advogado], OAB/[UF] nº [número].

SUBSTABELECIDO(A): [Nome do Novo Advogado], OAB/[UF] nº [número], com endereço profissional na [Endereço completo].

Por este instrumento particular, substabeleço no(a) profissional acima indicado(a), [COM / SEM] reserva de iguais poderes, a procuração que me foi outorgada por ${
      c.clienteNome || "[Nome do Cliente]"
    }, nos autos do processo nº ${
      c.processoNumero || "[Número do Processo]"
    }, em trâmite perante a ${c.processoVara || "[Vara e Comarca]"}.

${c.dataExtenso}

_______________________________________
[Nome do Advogado Substabelecente] — OAB/[UF] nº [número]`,
  },
  {
    id: "declaracao-hipossuficiencia",
    nome: "Declaração de hipossuficiência (justiça gratuita)",
    gerar: (c) => `DECLARAÇÃO DE HIPOSSUFICIÊNCIA (JUSTIÇA GRATUITA)

Eu, ${
      c.clienteNome || "[Nome completo]"
    }, [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [número] e CPF nº ${
      c.clienteDocumento || "[número]"
    }, residente na ${
      c.clienteEndereco || "[Endereço completo]"
    }, declaro, sob as penas da lei e nos termos do art. 98 e seguintes do CPC e art. 5º, LXXIV da CF/88, que não possuo condições financeiras de arcar com as custas processuais e honorários advocatícios sem prejuízo do sustento próprio e de minha família.

${c.dataExtenso}

_______________________________________
${c.clienteNome || "[Nome do Declarante]"}`,
  },
  {
    id: "renuncia-notificacao",
    nome: "Renúncia de mandato (notificação ao cliente)",
    gerar: (c) => `NOTIFICADO(A): ${c.clienteNome || "[Nome do Cliente]"}, CPF nº ${
      c.clienteDocumento || "[número]"
    }, residente na ${c.clienteEndereco || "[Endereço]"}.

REFERÊNCIA: Processo nº ${c.processoNumero || "[Número]"} — ${
      c.processoVara || "[Vara/Comarca]"
    }

Prezado(a) Senhor(a),

Comunico formalmente a RENÚNCIA aos poderes outorgados na procuração firmada para a ação em referência. Nos termos do art. 112 do CPC e art. 5º, § 3º do Estatuto da OAB, continuarei a representá-lo(a) nos autos durante os próximos 10 (dez) dias, devendo V. Sa. constituir novo procurador para prosseguir na demanda.

${c.dataExtenso}

_______________________________________
[Nome do Advogado] — OAB/[UF] nº [número]`,
  },
  {
    id: "renuncia-mandato",
    nome: "Renúncia de mandato (petição ao juízo)",
    gerar: (c) => `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO ${
      c.processoVara ? `DA ${c.processoVara.toUpperCase()}` : "DA VARA COMPETENTE"
    }${c.processoTribunal ? ` — ${c.processoTribunal}` : ""}

Processo nº ${c.processoNumero || "[número do processo]"}

[Nome do(a) advogado(a)], inscrito(a) na OAB sob o nº [OAB], advogado(a) constituído(a) nos autos do processo em epígrafe em que é parte ${
      c.clienteNome || "[cliente]"
    }, vem, respeitosamente, à presença de Vossa Excelência, comunicar sua

RENÚNCIA AO MANDATO

que lhe foi outorgado, nos termos do art. 112 do Código de Processo Civil, requerendo que seja a parte intimada para constituir novo(a) patrono(a), prosseguindo o(a) renunciante no feito pelos 10 (dez) dias subsequentes, conforme determina o parágrafo único do referido artigo.

Termos em que,
Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do(a) advogado(a)] — OAB/[UF] [número]`,
  },
  {
    id: "habilitacao-autos",
    nome: "Pedido de habilitação nos autos",
    gerar: (c) => `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO ${
      c.processoVara ? `DA ${c.processoVara.toUpperCase()}` : "DA VARA COMPETENTE"
    }${c.processoTribunal ? ` — ${c.processoTribunal}` : ""}

Processo nº: ${c.processoNumero || "[Número]"}

${c.clienteNome || "[NOME DA PARTE]"}, já qualificado(a) nos autos em epígrafe, vem, por intermédio de seu advogado, requerer a sua HABILITAÇÃO nos autos, juntando a inclusa procuração. Requer ainda que todas as futuras publicações e intimações sejam veiculadas exclusivamente em nome de [Nome do Advogado], OAB/[UF] nº [número], sob pena de nulidade.

Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do Advogado] — OAB/[UF] nº [número]`,
  },
  {
    id: "dilacao-prazo",
    nome: "Pedido de dilação de prazo",
    gerar: (c) => `Processo nº: ${c.processoNumero || "[Número]"}
${c.processoVara || "[Vara e Comarca]"}

${c.clienteNome || "[NOME DA PARTE]"}, já qualificado(a) nos autos, vem expor que, em virtude de [justificar brevemente: ex. demora na expedição de documento por órgão público / complexidade da perícia particular], não foi possível cumprir o r. despacho de fls. [número] no prazo assinalado.

Diante disso, requer a concessão de DILAÇÃO DO PRAZO por mais [número, ex.: 15 (quinze)] dias, com fulcro no art. 139, VI do CPC.

Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do Advogado] — OAB/[UF] nº [número]`,
  },
  {
    id: "homologacao-acordo",
    nome: "Pedido de homologação de acordo extrajudicial",
    gerar: (c) => `Processo nº: ${c.processoNumero || "[Número]"}

${c.clienteNome || "[NOME DO AUTOR]"} e ${
      c.parteContraria || "[NOME DO RÉU]"
    }, devidamente qualificados, informam que compuseram amigavelmente o litígio nos seguintes termos:

- O Réu pagará ao Autor a quantia total de R$ [valor], em [número] parcelas mensais de R$ [valor], via depósito na conta [Dados bancários].
- As partes declaram que com o adimplemento dão mútua e irrevogável quitação.
- Cada parte arcará com os honorários de seus patronos; custas remanescentes dispensadas (art. 90, § 3º do CPC).

Requerem a HOMOLOGAÇÃO do acordo e a extinção do processo com resolução do mérito (art. 487, III, "b", CPC).

${c.dataExtenso}

_______________________________________          _______________________________________
Advogado do Autor (OAB)                            Advogado do Réu (OAB)`,
  },
  {
    id: "desistencia-acao",
    nome: "Petição de desistência da ação",
    gerar: (c) => `Processo nº: ${c.processoNumero || "[Número]"}

${
      c.clienteNome || "[NOME DO AUTOR]"
    }, devidamente qualificado nos autos, vem manifestar sua DESISTÊNCIA DA AÇÃO, requerendo a extinção do feito sem julgamento do mérito, nos termos do art. 485, VIII do Código de Processo Civil.

(Se o Réu já tiver sido citado: "Requer a intimação da parte ré para manifestar concordância, nos termos do art. 485, § 4º do CPC.")

Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do Advogado] — OAB/[UF] nº [número]`,
  },
  {
    id: "rol-testemunhas",
    nome: "Apresentação de rol de testemunhas",
    gerar: (c) => `Processo nº: ${c.processoNumero || "[Número]"}

${
      c.clienteNome || "[NOME DA PARTE]"
    }, em cumprimento à decisão de saneamento, vem apresentar seu ROL DE TESTEMUNHAS, requerendo a intimação das mesmas via correio/judicial (ou assumindo o compromisso de levá-las à audiência, art. 455 do CPC):

1. [Nome da Testemunha 1], [profissão], RG [número], CPF [número], residente na [Endereço completo].
2. [Nome da Testemunha 2], [profissão], RG [número], CPF [número], residente na [Endereço completo].

Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do Advogado] — OAB/[UF] nº [número]`,
  },
  {
    id: "cumprimento-sentenca",
    nome: "Cumprimento de sentença (pagamento de quantia certa)",
    gerar: (c) => `Processo nº: ${c.processoNumero || "[Número]"}

${
      c.clienteNome || "[EXEQUENTE]"
    }, já qualificado, vem requerer o início da fase de CUMPRIMENTO DE SENTENÇA em face de ${
      c.parteContraria || "[EXECUTADO]"
    }, com fulcro no art. 523 do CPC:

- O título judicial transitou em julgado em [data], condenando o executado ao pagamento originário de R$ [valor].
- Conforme demonstrativo atualizado em anexo, o débito consolidado perfaz o montante de R$ [valor atualizado].

Requer a intimação do Executado para que, no prazo de 15 (quinze) dias, pague a quantia devida, sob pena de acréscimo de multa de 10% e honorários de 10% (art. 523, § 1º, CPC), além de penhora de bens.

Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do Advogado] — OAB/[UF] nº [número]`,
  },
  {
    id: "penhora-sisbajud",
    nome: "Pedido de penhora SISBAJUD / RENAJUD",
    gerar: (c) => `Processo nº: ${c.processoNumero || "[Número]"}

${
      c.clienteNome || "[EXEQUENTE]"
    }, já qualificado, ante o decurso do prazo sem o pagamento voluntário do débito pelo Executado, requer:

- A indisponibilidade de ativos financeiros mantidos em nome do Executado (CPF/CNPJ nº [número]) por meio do sistema SISBAJUD, até o limite do débito de R$ [valor];
- Subsidiariamente, a realização de consulta e bloqueio de veículos automotores via sistema RENAJUD.

Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do Advogado] — OAB/[UF] nº [número]`,
  },
  {
    id: "julgamento-antecipado",
    nome: "Julgamento antecipado do mérito",
    gerar: (c) => `Processo nº: ${c.processoNumero || "[Número]"}

${
      c.clienteNome || "[NOME DA PARTE]"
    }, já qualificado(a), vem expor que a matéria em discussão é exclusivamente de direito, estando os fatos demonstrados documentalmente pela prova pré-constituída nos autos.

Desse modo, declara expressamente que não tem mais provas a produzir e pugna pelo JULGAMENTO ANTECIPADO DO MÉRITO, nos termos do art. 355, I do Código de Processo Civil.

Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do Advogado] — OAB/[UF] nº [número]`,
  },
  {
    id: "embargos-declaracao",
    nome: "Embargos de declaração (omissão/contradição/obscuridade)",
    gerar: (c) => `Processo nº: ${c.processoNumero || "[Número]"}

${
      c.clienteNome || "[EMBARGANTE]"
    }, devidamente qualificado, vem opor EMBARGOS DE DECLARAÇÃO em face da r. decisão/sentença de fls. [número], com fulcro no art. 1.022 do CPC:

- Da Tempestividade: A intimação ocorreu em [data], sendo o presente recurso tempestivo (prazo de 5 dias).
- Do Vício: A r. decisão restou [omissa/contraditória/obscura] quanto ao ponto [especificar o ponto que deixou de ser analisado ou que gerou dúvida].
- Do Pedido: Requer o acolhimento destes Embargos para sanar o vício apontado, conferindo-lhes [se aplicável: efeitos infringentes].

Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do Advogado] — OAB/[UF] nº [número]`,
  },
  {
    id: "recurso-apelacao",
    nome: "Interposição de recurso de apelação",
    gerar: (c) => `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO ${
      c.processoVara ? `DA ${c.processoVara.toUpperCase()}` : "DA VARA CÍVEL DA COMARCA DE [CIDADE/UF]"
    }${c.processoTribunal ? ` — ${c.processoTribunal}` : ""}

Processo nº: ${c.processoNumero || "[Número]"}

${
      c.clienteNome || "[APELANTE]"
    }, já qualificado nos autos, inconformado com a r. sentença de fls. [número], vem interpor RECURSO DE APELAÇÃO, com fulcro no art. 1.009 e seguintes do CPC.

Informa o recolhimento do preparo recursal (ou o benefício da gratuidade). Requer a intimação do Apelado para apresentar contrarrazões e a posterior remessa dos autos ao Egrégio Tribunal de Justiça.

${c.dataExtenso}

_______________________________________
[Nome do Advogado] — OAB/[UF] nº [número]`,
  },
  {
    id: "alvara-levantamento",
    nome: "Pedido de expedição de alvará / mandado de levantamento",
    gerar: (c) => `Processo nº: ${c.processoNumero || "[Número]"}

${
      c.clienteNome || "[NOME DA PARTE]"
    }, já qualificado, vem expor que restou certificado o depósito judicial no valor de R$ [valor] às fls. [número].

Diante da inexistência de recursos pendentes, requer a EXPEDIÇÃO DE ALVARÁ JUDICIAL / MANDADO DE LEVANTAMENTO ELETRÔNICO (MLE) referente ao valor incontroverso, em nome de [Nome do Titular/Advogado com poderes específicos para receber e dar quitação], mediante transferência para a seguinte conta:

- Banco: [Nome] | Agência: [número] | Conta: [número] | PIX/CPF/CNPJ: [chave]

Pede deferimento.

${c.dataExtenso}

_______________________________________
[Nome do Advogado] — OAB/[UF] nº [número]`,
  },
  {
    id: "acesso-documentos",
    nome: "Requerimento administrativo de acesso a documentos",
    gerar: (c) => `AO ILUSTRÍSSIMO(A) SENHOR(A) DIRETOR(A)/RESPONSÁVEL PELO [Nome do Órgão/Empresa]

REQUERENTE: ${c.clienteNome || "[Nome completo]"}, CPF nº ${
      c.clienteDocumento || "[número]"
    }, assistido(a) por seu advogado [Nome do Advogado], OAB/[UF] nº [número].

Com fulcro no art. 5º, XXXIII e XXXIV da Constituição Federal e na Lei de Acesso à Informação (Lei 12.527/11), vem requerer o fornecimento de cópia integral de:

- [Descrever com precisão o documento/prontuário/processo administrativo solicitado].

Requer a disponibilização dos dados no prazo legal de 20 (vinte) dias, disponibilizando para retirada no formato físico ou envio ao e-mail: [e-mail do advogado/cliente].

${c.dataExtenso}

_______________________________________
[Nome do Advogado] — OAB/[UF] nº [número]`,
  },
];
