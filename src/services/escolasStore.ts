import type { Endereco, EscolaCadastrada } from '../types';

const CHAVE_LOCALSTORAGE = 'recibos-escolas:escolas-cadastradas';

function lerCadastradas(): EscolaCadastrada[] {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCALSTORAGE);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

let escolas: EscolaCadastrada[] = lerCadastradas();

function salvar(): void {
  try {
    localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(escolas));
  } catch {
    // localStorage indisponível — o cadastro só não sobrevive a um recarregamento da página.
  }
}

function gerarId(): string {
  return `escola-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listarEscolasCadastradas(): EscolaCadastrada[] {
  return [...escolas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function obterEscolaCadastrada(id: string): EscolaCadastrada | undefined {
  return escolas.find((e) => e.id === id);
}

export interface DadosEscolaCadastrada {
  nome: string;
  apelidos: string[];
  codigoEscola?: string;
  cnpj?: string;
  endereco: Endereco;
  horarioFuncionamento?: string | null;
}

export function criarEscolaCadastrada(dados: DadosEscolaCadastrada): EscolaCadastrada {
  const nova: EscolaCadastrada = { ...dados, id: gerarId() };
  escolas = [...escolas, nova];
  salvar();
  return nova;
}

export function atualizarEscolaCadastrada(id: string, dados: DadosEscolaCadastrada): void {
  escolas = escolas.map((e) => (e.id === id ? { ...dados, id } : e));
  salvar();
}

export function removerEscolaCadastrada(id: string): void {
  escolas = escolas.filter((e) => e.id !== id);
  salvar();
}

// =====================================================================
// Casamento inteligente do nome livre da planilha com o cadastro: a
// planilha real escreve o nome da escola de um jeito diferente a cada
// semana (abreviação, "SEDE"/"ANEXO", com ou sem "E.M."), então a
// comparação ignora acento/caixa/pontuação e aceita quando um nome contém
// o outro — não só igualdade exata.
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
 * Procura, no cadastro, a escola que melhor corresponde a um nome livre vindo
 * da planilha. Prioriza igualdade exata (nome ou apelido); na ausência dela,
 * aceita a primeira escola cujo nome/apelido contenha o texto buscado ou seja
 * contido por ele (evitando strings muito curtas, que dariam falso positivo).
 */
export function encontrarEscolaCadastrada(nomeLivre: string): EscolaCadastrada | null {
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
