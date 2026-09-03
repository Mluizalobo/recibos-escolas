import { SEARCH_TYPES, type SearchType } from '../types';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validarCnpj(value: string): boolean {
  return value.replace(/\D/g, '').length === 14;
}

/** Aplica a máscara de CNPJ progressivamente enquanto o usuário digita. */
export function aplicarMascaraCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/** Valida o valor de busca de acordo com o tipo selecionado (config centralizada em SEARCH_TYPES). */
export function validarBusca(type: SearchType, value: string): ValidationResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return { valid: false, message: 'Informe um valor para consultar.' };
  }

  const config = SEARCH_TYPES.find((s) => s.value === type);

  if (config?.mask === 'cnpj' && !validarCnpj(trimmed)) {
    return { valid: false, message: 'CNPJ incompleto. Informe os 14 dígitos.' };
  }

  if (type === 'pedido' && !/^\d+$/.test(trimmed)) {
    return { valid: false, message: 'O número do pedido deve conter apenas dígitos.' };
  }

  if (trimmed.length < 2) {
    return { valid: false, message: 'Informe pelo menos 2 caracteres.' };
  }

  return { valid: true };
}

const EXTENSOES_VALIDAS = /\.(xlsx|xls)$/i;
const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

/** Valida o arquivo antes de tentar processá-lo como planilha. */
export function validarArquivoPlanilha(file: File): ValidationResult {
  if (!EXTENSOES_VALIDAS.test(file.name)) {
    return { valid: false, message: 'Selecione um arquivo .xlsx ou .xls.' };
  }
  if (file.size === 0) {
    return { valid: false, message: 'O arquivo está vazio.' };
  }
  if (file.size > TAMANHO_MAXIMO_BYTES) {
    return { valid: false, message: 'Arquivo muito grande. O limite é 10MB.' };
  }
  return { valid: true };
}
