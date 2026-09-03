import type { JsonPrimitive } from '../types';

export const EMPTY_PLACEHOLDER = '—';

/** Verdadeiro para null/undefined/NaN/string vazia — nunca deve aparecer cru na tela. */
export function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'number' && Number.isNaN(value)) ||
    (typeof value === 'string' && value.trim() === '')
  );
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const BR_DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;

export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && (ISO_DATE_RE.test(value) || BR_DATE_RE.test(value));
}

/** Converte "YYYY-MM-DD[THH:mm]" ou "DD/MM/AAAA" em "DD/MM/AAAA". */
export function formatDate(value: string): string {
  if (BR_DATE_RE.test(value)) return value;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (isDateOnly) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatBoolean(value: boolean): string {
  return value ? 'Sim' : 'Não';
}

/**
 * "total" sozinho não basta: "quantidadeTotal" ou "itensTotal" são contagens,
 * não valores em dinheiro. Só tratamos como moeda quando a chave menciona
 * valor/preço/custo diretamente, ou "total" sem nenhuma palavra de contagem junto.
 */
function pareceChaveMonetaria(key: string): boolean {
  const chave = key.toLowerCase();
  if (/(valor|preco|preço|custo)/.test(chave)) return true;
  if (/total/.test(chave) && !/(quantidade|qtd|qtde|itens|item|numero|número)/.test(chave)) return true;
  return false;
}

/** Formata um valor primitivo para exibição, decidindo o tipo pelo conteúdo e, opcionalmente, pela chave. */
export function formatPrimitiveValue(value: JsonPrimitive, key?: string): string {
  if (isEmptyValue(value)) return EMPTY_PLACEHOLDER;
  if (typeof value === 'boolean') return formatBoolean(value);
  if (typeof value === 'number') {
    if (key && pareceChaveMonetaria(key)) return formatCurrency(value);
    return value.toLocaleString('pt-BR');
  }
  if (isDateString(value)) return formatDate(value);
  return String(value);
}

export function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return value;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

const DIACRITICS_RE = /[̀-ͯ]/g;

/** Remove acentos e caracteres inválidos para uso seguro em nome de arquivo. */
export function sanitizeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
