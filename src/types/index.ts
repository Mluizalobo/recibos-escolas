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
  nome: string;
  cnpj?: string;
  endereco?: string;
  logoUrl?: string;
}

export interface HistoricoRecibo {
  id: string;
  escolaNome: string;
  dataEntrega: string;
  numeroPedido: string;
  geradoEm: string;
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

export interface ResultadoImportacao {
  entregas: Entrega[];
  totalLinhas: number;
  totalEntregas: number;
  erros: string[];
}

export type ModoLote = 'individual' | 'unico';
