// Área "Pesquisa": catálogo de fontes públicas de consulta (órgãos, tribunais,
// registros, dados abertos). Dados em src/data/pesquisa.json; aviso de
// licença em src/data/LICENSE-pesquisa.txt.
import dados from "@/data/pesquisa.json";

export type FonteLink = { url: string; label: string; uf: string | null };
export type Fonte = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  tipo: string;
  entrada: string[];
  saida: string[];
  links: FonteLink[];
};

export const FONTES = dados as Fonte[];

export const LABEL_ENTRADA: Record<string, string> = {
  nenhum: "Nada (consulta aberta)",
  cpf: "CPF",
  cnpj: "CNPJ",
  nome: "Nome de pessoa",
  razao_social: "Razão social",
  titulo_eleitor: "Título de eleitor",
  numero_processo: "Nº do processo",
  oab: "Nº da OAB",
  registro_profissional: "Registro profissional",
  placa: "Placa de veículo",
  chassi: "Chassi",
  renavam: "Renavam",
  imei: "IMEI",
  telefone: "Telefone",
  email: "E-mail",
  dominio: "Domínio (site)",
  ip: "Endereço IP",
  asn: "ASN",
  cep: "CEP",
  endereco: "Endereço",
  municipio: "Município",
  uf: "UF",
  coordenadas: "Coordenadas",
  matricula_imovel: "Matrícula de imóvel",
  car: "CAR (imóvel rural)",
  inscricao_estadual: "Inscrição estadual",
  prefixo_aeronave: "Prefixo de aeronave",
  embarcacao: "Embarcação",
  cnes: "CNES",
  codigo_ibge: "Código IBGE",
  cns: "Cartão SUS",
};

export const LABEL_SAIDA: Record<string, string> = {
  dados_cadastrais: "Dados cadastrais",
  situacao_cadastral: "Situação cadastral",
  socios: "Sócios",
  cnae: "Atividade (CNAE)",
  endereco: "Endereço",
  processo: "Processos",
  partes: "Partes",
  movimentacao: "Movimentação processual",
  certidao: "Certidões",
  antecedentes: "Antecedentes",
  mandado_prisao: "Mandados de prisão",
  beneficio: "Benefícios sociais",
  remuneracao: "Remuneração",
  contrato_publico: "Contratos públicos",
  licitacao: "Licitações",
  sancao: "Sanções",
  veiculo: "Veículos",
  multa: "Multas",
  debito: "Débitos",
  imovel: "Imóveis",
  area_rural: "Área rural",
  licenca_ambiental: "Licença ambiental",
  auto_infracao: "Autos de infração",
  operadora: "Operadora",
  outorga: "Outorgas",
  dataset: "Base de dados",
  diario_oficial: "Diário oficial",
  api_json: "API",
  mapa: "Mapas",
  imagem_satelite: "Imagem de satélite",
  curriculo: "Currículo",
  publicacao_academica: "Publicação acadêmica",
  estatistica: "Estatísticas",
  vinculo_profissional: "Vínculo profissional",
  financiamento: "Financiamentos",
};

export const LABEL_TIPO: Record<string, string> = {
  federal: "Federal",
  estadual: "Estadual",
  municipal: "Municipal",
  judiciario: "Judiciário",
  ministerio_publico: "Ministério Público",
  legislativo: "Legislativo",
  defensoria: "Defensoria",
  ong: "ONG",
  privado: "Privado",
  academico: "Acadêmico",
  internacional: "Internacional",
  api: "API",
  indefinido: "Outros",
};

export const rotulo = (mapa: Record<string, string>, v: string) =>
  mapa[v] ?? v.replace(/_/g, " ");
