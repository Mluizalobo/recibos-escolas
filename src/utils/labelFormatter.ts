/** Siglas que devem aparecer em maiúsculas, independente da posição na chave. */
const ABREVIACOES: Record<string, string> = {
  cnpj: 'CNPJ',
  cpf: 'CPF',
  id: 'ID',
  uf: 'UF',
  cep: 'CEP',
  nf: 'NF',
};

/** Palavras comuns do domínio que precisam de acentuação ao serem exibidas. */
const PALAVRAS_ACENTUADAS: Record<string, string> = {
  numero: 'Número',
  codigo: 'Código',
  endereco: 'Endereço',
  observacao: 'Observação',
  observacoes: 'Observações',
  descricao: 'Descrição',
  situacao: 'Situação',
  regiao: 'Região',
  municipio: 'Município',
  telefone: 'Telefone',
  responsavel: 'Responsável',
  identificacao: 'Identificação',
  informacao: 'Informação',
  informacoes: 'Informações',
};

/**
 * Converte chaves em camelCase, snake_case ou kebab-case para um rótulo legível.
 * Ex: "dataEntrega" -> "Data Entrega", "numero_pedido" -> "Número Pedido".
 */
export function formatLabel(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();

  return spaced
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      if (ABREVIACOES[word]) return ABREVIACOES[word];
      if (PALAVRAS_ACENTUADAS[word]) return PALAVRAS_ACENTUADAS[word];
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
