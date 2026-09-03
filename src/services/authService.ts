/**
 * Login simples, só de front-end: valida contra uma lista local e guarda a
 * sessão no localStorage. NÃO é segurança de verdade — qualquer pessoa com
 * acesso ao código-fonte vê as "senhas" abaixo. Serve para dar à interface
 * um controle básico de quem está usando o sistema (e permitir perfis como
 * o da Poliana) enquanto não existe um backend com autenticação real.
 */
export interface Sessao {
  usuario: string;
  nome: string;
}

interface UsuarioCadastrado extends Sessao {
  senha: string;
}

const USUARIOS: UsuarioCadastrado[] = [
  { usuario: 'poliana', senha: 'lider2026', nome: 'Poliana' },
  { usuario: 'admin', senha: 'grupolider', nome: 'Administrador' },
];

const CHAVE_LOCALSTORAGE = 'recibos-escolas:sessao';

export function autenticar(usuario: string, senha: string): Sessao | null {
  const encontrado = USUARIOS.find(
    (u) => u.usuario.toLowerCase() === usuario.trim().toLowerCase() && u.senha === senha,
  );
  if (!encontrado) return null;

  const sessao: Sessao = { usuario: encontrado.usuario, nome: encontrado.nome };
  try {
    localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(sessao));
  } catch {
    // localStorage indisponível — a sessão só não sobrevive a um recarregamento da página.
  }
  return sessao;
}

export function obterSessao(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCALSTORAGE);
    return bruto ? (JSON.parse(bruto) as Sessao) : null;
  } catch {
    return null;
  }
}

export function sair(): void {
  try {
    localStorage.removeItem(CHAVE_LOCALSTORAGE);
  } catch {
    // nada a fazer
  }
}
