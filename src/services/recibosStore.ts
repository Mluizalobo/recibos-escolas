import type { Entrega, ProblemaRecibo, ReciboPreparado, StatusPreparoRecibo } from '../types';

const CHAVE_LOCALSTORAGE = 'recibos-escolas:recibos-importados';

function lerImportados(): ReciboPreparado[] {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCALSTORAGE);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

let recibosImportados: ReciboPreparado[] = lerImportados();

function salvar(): void {
  try {
    localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(recibosImportados));
  } catch {
    // localStorage indisponível — os recibos importados só não sobrevivem a um recarregamento da página.
  }
}

/** Substitui os recibos vindos de importação pelos da planilha processada mais recentemente. */
export function definirRecibosImportados(recibos: ReciboPreparado[]): void {
  recibosImportados = recibos;
  salvar();
}

/** Recibos preparados a partir da última planilha importada. */
export function listarRecibosPreparados(): ReciboPreparado[] {
  return recibosImportados;
}

export function obterReciboPorId(id: string): ReciboPreparado | undefined {
  return listarRecibosPreparados().find((r) => r.id === id);
}

export function atualizarStatusRecibo(id: string, status: StatusPreparoRecibo): void {
  const indice = recibosImportados.findIndex((r) => r.id === id);
  if (indice === -1) return;
  recibosImportados[indice] = { ...recibosImportados[indice], status };
  salvar();
}

/** Remove um recibo importado da lista. */
export function removerRecibo(id: string): void {
  const antes = recibosImportados.length;
  recibosImportados = recibosImportados.filter((r) => r.id !== id);
  if (recibosImportados.length !== antes) salvar();
}

export interface DadosCorrecaoRecibo {
  nome: string;
  codigoEscola: string;
  cnpj: string;
  numeroPedido: string;
  rua: string;
  cidade: string;
  uf: string;
}

/**
 * Aplica correções manuais de cabeçalho (nome/código/CNPJ/endereço/pedido) a
 * um recibo com pendências e reavalia o status. Problemas ligados a itens
 * ausentes não são "curáveis" por aqui — isso exige corrigir a planilha de
 * origem — então continuam bloqueando o recibo mesmo após a correção.
 */
export function corrigirRecibo(id: string, dados: DadosCorrecaoRecibo): void {
  const indice = recibosImportados.findIndex((r) => r.id === id);
  if (indice === -1) return;
  const atual = recibosImportados[indice];

  const entregaCorrigida: Entrega = {
    ...atual.entrega,
    numeroPedido: dados.numeroPedido || atual.entrega.numeroPedido,
    escola: {
      ...atual.entrega.escola,
      nome: dados.nome,
      codigoEscola: dados.codigoEscola,
      cnpj: dados.cnpj,
      endereco: { ...atual.entrega.escola.endereco, rua: dados.rua, cidade: dados.cidade, uf: dados.uf },
    },
  };

  const problemasRestantes: ProblemaRecibo[] = atual.problemas.filter((problema) => {
    if (problema.campo === 'cnpj') return !entregaCorrigida.escola.cnpj;
    if (problema.campo === 'endereco') {
      return !entregaCorrigida.escola.endereco.rua && !entregaCorrigida.escola.endereco.cidade;
    }
    return true;
  });

  const temErro = problemasRestantes.some((p) => p.severidade === 'erro');
  const status: StatusPreparoRecibo = temErro ? 'com_erro' : problemasRestantes.length > 0 ? 'pendente' : 'pronto';

  recibosImportados[indice] = { ...atual, entrega: entregaCorrigida, problemas: problemasRestantes, status };
  salvar();
}
