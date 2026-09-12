import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, School, Search, Trash2 } from 'lucide-react';
import {
  criarEscolaCadastrada,
  atualizarEscolaCadastrada,
  listarEscolasCadastradas,
  removerEscolaCadastrada,
  type DadosEscolaCadastrada,
} from '../services/escolasStore';
import type { EscolaCadastrada } from '../types';
import EditarEscolaCadastradaModal from '../components/EditarEscolaCadastradaModal';

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Base própria de escolas da empresa, guardada no Supabase (compartilhada
 * entre qualquer computador que acessar o sistema). Cadastrar aqui é o que
 * permite reconhecer a escola na planilha semanal (mesmo escrita diferente)
 * e preencher endereço/horário/código automaticamente na importação.
 */
export default function EscolasCadastradas() {
  const [escolas, setEscolas] = useState<EscolaCadastrada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<EscolaCadastrada | null>(null);
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function recarregar() {
    setErro(null);
    try {
      setEscolas(await listarEscolasCadastradas());
    } catch {
      setErro('Não foi possível carregar as escolas cadastradas. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    recarregar();
  }, []);

  const escolasFiltradas = useMemo(() => {
    const buscaNormalizada = normalizar(busca);
    if (!buscaNormalizada) return escolas;
    return escolas.filter(
      (escola) =>
        normalizar(escola.nome).includes(buscaNormalizada) ||
        escola.apelidos.some((apelido) => normalizar(apelido).includes(buscaNormalizada)),
    );
  }, [escolas, busca]);

  async function handleSalvar(dados: DadosEscolaCadastrada) {
    setSalvando(true);
    setErro(null);
    try {
      if (editando) {
        await atualizarEscolaCadastrada(editando.id, dados);
      } else {
        await criarEscolaCadastrada(dados);
      }
      setEditando(null);
      setCriando(false);
      await recarregar();
    } catch {
      setErro('Não foi possível salvar a escola. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(escola: EscolaCadastrada) {
    const confirmado = window.confirm(`Excluir a escola "${escola.nome}" do cadastro? Essa ação não pode ser desfeita.`);
    if (!confirmado) return;
    setErro(null);
    try {
      await removerEscolaCadastrada(escola.id);
      await recarregar();
    } catch {
      setErro('Não foi possível excluir a escola. Tente novamente.');
    }
  }

  const modalAberto = criando || editando !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Escolas Cadastradas</h1>
          <p className="text-sm text-gray-500">
            Cadastre aqui o endereço, código, CNPJ e horário de cada escola. Na importação, o sistema reconhece o
            nome da planilha e preenche esses dados automaticamente — sem precisar corrigir toda semana.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova escola
        </button>
      </div>

      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}

      <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou apelido…"
            aria-label="Buscar escola cadastrada"
            className="h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {carregando ? (
          <p className="py-10 text-center text-sm text-gray-400">Carregando…</p>
        ) : escolasFiltradas.length === 0 ? (
          <div className="py-10 text-center">
            <School className="mx-auto mb-2 h-8 w-8 text-gray-300" aria-hidden="true" />
            <p className="text-sm text-gray-400">
              {escolas.length === 0 ? 'Nenhuma escola cadastrada ainda.' : 'Nenhuma escola encontrada.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {escolasFiltradas.map((escola) => {
              const enderecoResumo = [escola.endereco.rua, escola.endereco.cidade].filter(Boolean).join(' — ');
              return (
                <li key={escola.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-[14rem] flex-1">
                    <p className="text-sm font-medium text-gray-800">{escola.nome}</p>
                    <p className="text-xs text-gray-400">
                      {enderecoResumo || 'Endereço não informado'}
                      {escola.horarioFuncionamento ? ` · ${escola.horarioFuncionamento}` : ''}
                    </p>
                    {escola.apelidos.length > 0 && (
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Apelidos: {escola.apelidos.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditando(escola)}
                      aria-label={`Editar ${escola.nome}`}
                      className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluir(escola)}
                      aria-label={`Excluir ${escola.nome}`}
                      className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {modalAberto && (
        <EditarEscolaCadastradaModal
          escola={editando}
          onSalvar={handleSalvar}
          onFechar={() => {
            if (salvando) return;
            setEditando(null);
            setCriando(false);
          }}
        />
      )}
    </div>
  );
}
