const CHAVE_LOCALSTORAGE = 'recibos-escolas:tema';

export type Tema = 'claro' | 'escuro';

/**
 * Preferência de tema por navegador/aparelho (não é dado da empresa, então
 * fica em localStorage mesmo, igual a sessão de login). Aplicada como classe
 * `.dark` em <html> — ver o script inline em index.html, que já aplica isso
 * antes da página desenhar, evitando piscar claro→escuro no carregamento.
 */
export function obterTema(): Tema {
  try {
    return localStorage.getItem(CHAVE_LOCALSTORAGE) === 'escuro' ? 'escuro' : 'claro';
  } catch {
    return 'claro';
  }
}

function aplicarTema(tema: Tema): void {
  document.documentElement.classList.toggle('dark', tema === 'escuro');
  try {
    localStorage.setItem(CHAVE_LOCALSTORAGE, tema);
  } catch {
    // localStorage indisponível — a preferência só não persiste entre sessões.
  }
}

export function alternarTema(): Tema {
  const novo: Tema = obterTema() === 'escuro' ? 'claro' : 'escuro';
  aplicarTema(novo);
  return novo;
}
