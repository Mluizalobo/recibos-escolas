import { supabase } from './supabaseClient';
import type { Endereco, EscolaCadastrada } from '../types';

interface LinhaEscolaCadastrada {
  id: string;
  nome: string;
  apelidos: string[];
  codigo_escola: string | null;
  cnpj: string | null;
  endereco: Endereco;
  horario_funcionamento: string | null;
}

function linhaParaEscola(linha: LinhaEscolaCadastrada): EscolaCadastrada {
  return {
    id: linha.id,
    nome: linha.nome,
    apelidos: linha.apelidos ?? [],
    codigoEscola: linha.codigo_escola ?? undefined,
    cnpj: linha.cnpj ?? undefined,
    endereco: linha.endereco,
    horarioFuncionamento: linha.horario_funcionamento,
  };
}

function gerarId(): string {
  return `escola-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listarEscolasCadastradas(): Promise<EscolaCadastrada[]> {
  const { data, error } = await supabase
    .from('escolas_cadastradas')
    .select('*')
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data as LinhaEscolaCadastrada[]).map(linhaParaEscola);
}

export async function obterEscolaCadastrada(id: string): Promise<EscolaCadastrada | undefined> {
  const { data, error } = await supabase.from('escolas_cadastradas').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? linhaParaEscola(data as LinhaEscolaCadastrada) : undefined;
}

export interface DadosEscolaCadastrada {
  nome: string;
  apelidos: string[];
  codigoEscola?: string;
  cnpj?: string;
  endereco: Endereco;
  horarioFuncionamento?: string | null;
}

export async function criarEscolaCadastrada(dados: DadosEscolaCadastrada): Promise<EscolaCadastrada> {
  const id = gerarId();
  const { error } = await supabase.from('escolas_cadastradas').insert({
    id,
    nome: dados.nome,
    apelidos: dados.apelidos,
    codigo_escola: dados.codigoEscola || null,
    cnpj: dados.cnpj || null,
    endereco: dados.endereco,
    horario_funcionamento: dados.horarioFuncionamento || null,
  });
  if (error) throw error;
  return { ...dados, id };
}

export async function atualizarEscolaCadastrada(id: string, dados: DadosEscolaCadastrada): Promise<void> {
  const { error } = await supabase
    .from('escolas_cadastradas')
    .update({
      nome: dados.nome,
      apelidos: dados.apelidos,
      codigo_escola: dados.codigoEscola || null,
      cnpj: dados.cnpj || null,
      endereco: dados.endereco,
      horario_funcionamento: dados.horarioFuncionamento || null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function removerEscolaCadastrada(id: string): Promise<void> {
  const { error } = await supabase.from('escolas_cadastradas').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================================
// Casamento inteligente do nome livre da planilha com o cadastro: a
// planilha real escreve o nome da escola de um jeito diferente a cada
// semana (abreviação, "SEDE"/"ANEXO", com ou sem "E.M."), então a
// comparação ignora acento/caixa/pontuação e aceita quando um nome contém
// o outro — não só igualdade exata.
//
// Recebe a lista de escolas já carregada (em vez de buscar no banco a cada
// chamada) porque é usada uma vez por linha da planilha durante a
// importação — buscar tudo uma única vez antes é bem mais rápido do que uma
// consulta ao banco por escola.
// =====================================================================

function normalizarNome(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[.,\-–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Procura, entre as escolas cadastradas, a que melhor corresponde a um nome
 * livre vindo da planilha. Prioriza igualdade exata (nome ou apelido); na
 * ausência dela, aceita a primeira escola cujo nome/apelido contenha o texto
 * buscado ou seja contido por ele (evitando strings muito curtas, que dariam
 * falso positivo).
 */
export function encontrarEscolaCadastrada(nomeLivre: string, escolas: EscolaCadastrada[]): EscolaCadastrada | null {
  const alvo = normalizarNome(nomeLivre);
  if (!alvo) return null;

  let porContencao: EscolaCadastrada | null = null;

  for (const escola of escolas) {
    const candidatos = [escola.nome, ...escola.apelidos].map(normalizarNome).filter(Boolean);

    if (candidatos.includes(alvo)) return escola;

    if (!porContencao) {
      const combina = candidatos.some(
        (candidato) => candidato.length > 3 && (alvo.includes(candidato) || candidato.includes(alvo)),
      );
      if (combina) porContencao = escola;
    }
  }

  return porContencao;
}
