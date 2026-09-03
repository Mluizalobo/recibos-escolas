/**
 * Tipos genéricos usados pelo DynamicDataRenderer.
 * Qualquer JSON válido (vindo de planilha, API ou mock) é representável por JsonValue.
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

/**
 * Identificadores de busca suportados hoje. Adicionar um novo tipo de busca
 * no futuro (ex: "turma", "regional") exige apenas um novo item aqui e em
 * SEARCH_TYPES — nenhum componente de UI precisa mudar.
 */
export type SearchType =
  | 'nome'
  | 'codigo_escola'
  | 'pedido'
  | 'codigo_entrega'
  | 'cnpj';

export interface SearchTypeConfig {
  value: SearchType;
  label: string;
  placeholder: string;
  mask?: 'cnpj';
}

export const SEARCH_TYPES: SearchTypeConfig[] = [
  { value: 'nome', label: 'Nome da escola', placeholder: 'Ex: EM José da Silva' },
  { value: 'codigo_escola', label: 'Código da escola', placeholder: 'Ex: ESC-001' },
  { value: 'pedido', label: 'Número do pedido', placeholder: 'Ex: 12345' },
  { value: 'codigo_entrega', label: 'Código da entrega', placeholder: 'Ex: ENT-2026-001' },
  { value: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00', mask: 'cnpj' },
];

export type StatusEntrega = 'pendente' | 'entregue' | 'parcial' | 'cancelada';

export interface Endereco {
  rua: string;
  numero: number | string;
  bairro?: string | null;
  cidade: string;
  uf?: string | null;
  cep?: string | null;
}

export interface ItemEntrega {
  produto: string;
  quantidade: number;
  valor?: number | null;
  unidade?: string | null;
}

export interface Escola {
  codigoEscola: string;
  nome: string;
  cnpj: string;
  endereco: Endereco;
  /** Ex: "07h às 12h" — aparece no recibo oficial junto do endereço da escola. */
  horarioFuncionamento?: string | null;
}

export interface Entrega {
  codigoEntrega: string;
  numeroPedido: string;
  dataEntrega: string;
  status: StatusEntrega;
  escola: Escola;
  itens: ItemEntrega[];
  observacoes?: string[] | null;
  valorTotal?: number | null;
  [key: string]: JsonValue | Escola | ItemEntrega[] | string[] | null | undefined;
}

export interface Empresa {
  /** Nome fantasia / marca (ex: "Grupo Líder"). */
  nome: string;
  /** Razão social — é esse nome que aparece no cabeçalho oficial do recibo. */
  razaoSocial?: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  /** Ícone da marca, usado em navegação/favicon-like. */
  logoUrl?: string;
  /** Logo + nome por extenso, para telas com mais espaço (login, dados da empresa). */
  logoLockupUrl?: string;
}

/** Registro de um recibo já gerado nesta sessão (usado no "Gerados recentemente" do Dashboard). */
export interface HistoricoRecibo {
  id: string;
  escolaNome: string;
  dataEntrega: string;
  numeroPedido: string;
  geradoEm: string;
}

/**
 * Situação de um recibo dentro do pipeline importação → conferência → geração.
 * Não confundir com StatusEntrega (situação comercial da entrega em si).
 */
export type StatusPreparoRecibo = 'pendente' | 'pronto' | 'com_erro' | 'gerado' | 'impresso';

export const STATUS_PREPARO_LABEL: Record<StatusPreparoRecibo, string> = {
  pendente: 'Pendente',
  pronto: 'Pronto',
  com_erro: 'Com erro',
  gerado: 'Gerado',
  impresso: 'Impresso',
};

/** Um problema encontrado ao normalizar/validar a planilha, associado a um recibo específico. */
export interface ProblemaRecibo {
  linha?: number;
  campo?: string;
  mensagem: string;
  /** "erro" bloqueia a geração automática (ex: nenhum item válido); "aviso" só pede conferência. */
  severidade: 'erro' | 'aviso';
}

/**
 * Um recibo "preparado" pelo sistema a partir da planilha (ou de um mock de
 * demonstração), pronto para ser conferido e gerado pelo usuário — que atua
 * como conferente, não como digitador.
 */
export interface ReciboPreparado {
  id: string;
  entrega: Entrega;
  status: StatusPreparoRecibo;
  problemas: ProblemaRecibo[];
  origem: 'importacao' | 'mock';
}

/** Um registro do histórico de importações semanais da planilha. */
export interface ImportacaoHistorico {
  id: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  dataImportacao: string;
  totalLinhas: number;
  totalEscolas: number;
  totalRecibos: number;
  totalComErro: number;
  totalDuplicados: number;
  status: 'concluida' | 'com_erros';
  hashConteudo: string;
}

/** Resultado padronizado da camada de serviço, usado pela UI para tratar erros. */
export type ApiErrorKind = 'not_found' | 'network' | 'unknown';

export class ApiError extends Error {
  kind: ApiErrorKind;
  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'ApiError';
  }
}

/** Linha bruta de planilha, antes da normalização/agrupamento. */
export type PlanilhaLinha = Record<string, JsonValue>;

/** Resultado de normalizeSpreadsheetData(): recibos já organizados por escola/entrega, com status individual. */
export interface ResultadoImportacao {
  recibos: ReciboPreparado[];
  totalLinhas: number;
  totalEscolas: number;
  totalRecibosPreparados: number;
  totalComErro: number;
  totalDuplicados: number;
  /** Avisos gerais que não puderam ser associados a um recibo específico (ex: linha sem nenhum identificador). */
  avisos: string[];
  hashConteudo: string;
}

export type ModoLote = 'individual' | 'unico';
