import { supabase } from './supabaseClient';
import type { ImportacaoHistorico } from '../types';

interface LinhaHistorico {
  id: string;
  nome_arquivo: string;
  tamanho_bytes: number;
  data_importacao: string;
  total_linhas: number;
  total_escolas: number;
  total_recibos: number;
  total_com_erro: number;
  total_duplicados: number;
  status: ImportacaoHistorico['status'];
  hash_conteudo: string;
  municipio: string | null;
}

function linhaParaHistorico(linha: LinhaHistorico): ImportacaoHistorico {
  return {
    id: linha.id,
    nomeArquivo: linha.nome_arquivo,
    tamanhoBytes: linha.tamanho_bytes,
    dataImportacao: linha.data_importacao,
    totalLinhas: linha.total_linhas,
    totalEscolas: linha.total_escolas,
    totalRecibos: linha.total_recibos,
    totalComErro: linha.total_com_erro,
    totalDuplicados: linha.total_duplicados,
    status: linha.status,
    hashConteudo: linha.hash_conteudo,
    municipio: linha.municipio,
  };
}

/** Importações mais recentes primeiro — é assim que a tela de Histórico exibe as semanas. */
export async function listarHistorico(): Promise<ImportacaoHistorico[]> {
  const { data, error } = await supabase
    .from('historico_importacoes')
    .select('*')
    .order('data_importacao', { ascending: false });
  if (error) throw error;
  return (data as LinhaHistorico[]).map(linhaParaHistorico);
}

export async function registrarImportacao(entrada: ImportacaoHistorico): Promise<void> {
  const { error } = await supabase.from('historico_importacoes').insert({
    id: entrada.id,
    nome_arquivo: entrada.nomeArquivo,
    tamanho_bytes: entrada.tamanhoBytes,
    data_importacao: entrada.dataImportacao,
    total_linhas: entrada.totalLinhas,
    total_escolas: entrada.totalEscolas,
    total_recibos: entrada.totalRecibos,
    total_com_erro: entrada.totalComErro,
    total_duplicados: entrada.totalDuplicados,
    status: entrada.status,
    hash_conteudo: entrada.hashConteudo,
    municipio: entrada.municipio ?? null,
  });
  if (error) throw error;
}

/** Retorna a importação anterior com exatamente o mesmo conteúdo, se existir (mesma planilha reenviada). */
export async function encontrarImportacaoDuplicada(hashConteudo: string): Promise<ImportacaoHistorico | undefined> {
  const { data, error } = await supabase
    .from('historico_importacoes')
    .select('*')
    .eq('hash_conteudo', hashConteudo)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? linhaParaHistorico(data as LinhaHistorico) : undefined;
}

/**
 * Remove uma planilha inteira do histórico — e, por causa do "on delete
 * cascade" na coluna `importacao_id` de recibos_preparados (ver
 * supabase/schema.sql), remove junto todos os recibos preparados dela.
 * Use isso para tirar uma planilha importada por engano, sem afetar as
 * outras prefeituras.
 */
export async function removerImportacao(id: string): Promise<void> {
  const { error } = await supabase.from('historico_importacoes').delete().eq('id', id);
  if (error) throw error;
}
