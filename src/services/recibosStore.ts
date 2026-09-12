import { supabase } from './supabaseClient';
import type { Entrega, ProblemaRecibo, ReciboPreparado, StatusPreparoRecibo } from '../types';

interface LinhaReciboPreparado {
  id: string;
  entrega: Entrega;
  status: StatusPreparoRecibo;
  problemas: ProblemaRecibo[];
  origem: 'importacao';
}

function linhaParaRecibo(linha: LinhaReciboPreparado): ReciboPreparado {
  return {
    id: linha.id,
    entrega: linha.entrega,
    status: linha.status,
    problemas: linha.problemas ?? [],
    origem: linha.origem,
  };
}

/**
 * Substitui os recibos preparados pelos da planilha processada mais
 * recentemente: apaga tudo que havia antes e insere o novo lote — a
 * importação de uma nova planilha sempre substitui a semana anterior.
 */
export async function definirRecibosImportados(recibos: ReciboPreparado[]): Promise<void> {
  const { error: erroApagar } = await supabase.from('recibos_preparados').delete().neq('id', '');
  if (erroApagar) throw erroApagar;

  if (recibos.length === 0) return;

  const linhas = recibos.map((recibo) => ({
    id: recibo.id,
    entrega: recibo.entrega,
    status: recibo.status,
    problemas: recibo.problemas,
    origem: recibo.origem,
  }));
  const { error: erroInserir } = await supabase.from('recibos_preparados').insert(linhas);
  if (erroInserir) throw erroInserir;
}

export async function listarRecibosPreparados(): Promise<ReciboPreparado[]> {
  const { data, error } = await supabase
    .from('recibos_preparados')
    .select('*')
    .order('sequencia', { ascending: true });
  if (error) throw error;
  return (data as LinhaReciboPreparado[]).map(linhaParaRecibo);
}

export async function obterReciboPorId(id: string): Promise<ReciboPreparado | undefined> {
  const { data, error } = await supabase.from('recibos_preparados').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? linhaParaRecibo(data as LinhaReciboPreparado) : undefined;
}

export async function atualizarStatusRecibo(id: string, status: StatusPreparoRecibo): Promise<void> {
  const { error } = await supabase.from('recibos_preparados').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function removerRecibo(id: string): Promise<void> {
  const { error } = await supabase.from('recibos_preparados').delete().eq('id', id);
  if (error) throw error;
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
export async function corrigirRecibo(id: string, dados: DadosCorrecaoRecibo): Promise<void> {
  const atual = await obterReciboPorId(id);
  if (!atual) return;

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

  const { error } = await supabase
    .from('recibos_preparados')
    .update({ entrega: entregaCorrigida, problemas: problemasRestantes, status })
    .eq('id', id);
  if (error) throw error;
}
