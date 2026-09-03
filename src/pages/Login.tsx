import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { autenticar } from '../services/authService';
import Logo from '../components/Logo';

export default function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (entrando) return;
    setEntrando(true);
    setErro(null);

    const sessao = autenticar(usuario, senha);
    if (!sessao) {
      setErro('Usuário ou senha inválidos.');
      setEntrando(false);
      return;
    }

    navigate('/', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo lockup className="h-24 w-auto" />
          <p className="mt-2 text-sm text-gray-500">Recibos de Entrega</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="usuario" className="text-xs font-medium text-gray-600">
              Usuário
            </label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
              className="h-10 rounded-md border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="senha" className="text-xs font-medium text-gray-600">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? 'senha-erro' : undefined}
              className="h-10 rounded-md border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
          </div>

          {erro && (
            <p id="senha-erro" role="alert" className="text-xs text-red-600">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={entrando}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand text-sm font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
