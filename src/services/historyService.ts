import type { ImportacaoHistorico } from '../types';

const CHAVE_LOCALSTORAGE = 'recibos-escolas:historico-importacoes';

function ler(): ImportacaoHistorico[] {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCALSTORAGE);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

function salvar(historico: ImportacaoHistorico[]): void {
  try {
    localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(historico));
  } catch {
    // localStorage indisponível (modo privado, quota excedida etc.) — o histórico só não persiste entre sessões.
  }
}

/** Importações mais recentes primeiro — é assim que a tela de Histórico exibe as semanas. */
export function listarHistorico(): ImportacaoHistorico[] {
  return ler().sort((a, b) => (a.dataImportacao < b.dataImportacao ? 1 : -1));
}

export function registrarImportacao(entrada: ImportacaoHistorico): void {
  const historico = ler();
  historico.push(entrada);
  salvar(historico);
}

/** Retorna a importação anterior com exatamente o mesmo conteúdo, se existir (mesma planilha reenviada). */
export function encontrarImportacaoDuplicada(hashConteudo: string): ImportacaoHistorico | undefined {
  return ler().find((item) => item.hashConteudo === hashConteudo);
}
