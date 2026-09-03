import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { SEARCH_TYPES, type SearchType } from '../types';
import { aplicarMascaraCnpj, validarBusca } from '../utils/validators';

interface SearchFormProps {
  onBuscar: (tipo: SearchType, valor: string) => void;
  loading: boolean;
}

/**
 * Formulário de busca genérico: o tipo de identificador vem de SEARCH_TYPES
 * (src/types/index.ts), então adicionar um novo identificador no futuro não
 * exige alterar este componente.
 */
export default function SearchForm({ onBuscar, loading }: SearchFormProps) {
  const [tipo, setTipo] = useState<SearchType>(SEARCH_TYPES[0].value);
  const [valor, setValor] = useState('');
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  const configAtual = SEARCH_TYPES.find((s) => s.value === tipo) ?? SEARCH_TYPES[0];

  function handleValorChange(novoValor: string) {
    setValor(configAtual.mask === 'cnpj' ? aplicarMascaraCnpj(novoValor) : novoValor);
    if (erroValidacao) setErroValidacao(null);
  }

  function handleTipoChange(novoTipo: SearchType) {
    setTipo(novoTipo);
    setValor('');
    setErroValidacao(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    const resultado = validarBusca(tipo, valor);
    if (!resultado.valid) {
      setErroValidacao(resultado.message ?? 'Valor inválido.');
      return;
    }

    onBuscar(tipo, valor.trim());
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="tipo-busca" className="text-xs font-medium text-gray-600">
          Buscar por
        </label>
        <select
          id="tipo-busca"
          value={tipo}
          onChange={(e) => handleTipoChange(e.target.value as SearchType)}
          disabled={loading}
          className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60 sm:w-48"
        >
          {SEARCH_TYPES.map((opcao) => (
            <option key={opcao.value} value={opcao.value}>
              {opcao.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="valor-busca" className="text-xs font-medium text-gray-600">
          {configAtual.label}
        </label>
        <input
          id="valor-busca"
          type="text"
          inputMode={tipo === 'pedido' ? 'numeric' : 'text'}
          value={valor}
          placeholder={configAtual.placeholder}
          onChange={(e) => handleValorChange(e.target.value)}
          disabled={loading}
          aria-invalid={erroValidacao ? true : undefined}
          aria-describedby={erroValidacao ? 'valor-busca-erro' : undefined}
          className={`h-10 rounded-md border px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 disabled:opacity-60 ${
            erroValidacao
              ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
          }`}
        />
        {erroValidacao && (
          <p id="valor-busca-erro" role="alert" className="text-xs text-red-600">
            {erroValidacao}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        {loading ? 'Consultando…' : 'Consultar'}
      </button>
    </form>
  );
}
