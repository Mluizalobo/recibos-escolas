import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, FileClock, Layers, Package, Search, Sparkles, UploadCloud } from 'lucide-react';
import { EMPRESA, obterResumoDashboard } from '../services/api';
import { listarEscolasCadastradas } from '../services/escolasStore';
import { obterSessao } from '../services/authService';
import { obterMensagemDoDia, obterSaudacao } from '../services/mensagensService';

export default function Dashboard() {
  const [totalEntregas, setTotalEntregas] = useState<number | null>(null);
  const [totalEscolasCadastradas, setTotalEscolasCadastradas] = useState<number | null>(null);
  const sessao = obterSessao();

  useEffect(() => {
    let ativo = true;
    obterResumoDashboard()
      .then((dados) => {
        if (ativo) setTotalEntregas(dados.totalEntregas);
      })
      .catch(() => {});
    listarEscolasCadastradas()
      .then((escolas) => {
        if (ativo) setTotalEscolasCadastradas(escolas.length);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-brand dark:text-green-400">{EMPRESA.nome}</p>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Recibos de Entrega</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Substitui o processo manual de copiar dados da planilha para o Word: consulte a escola, confira os
          dados e gere o recibo em PDF pronto para impressão.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-brand/20 dark:border-green-800/40 bg-brand-light dark:bg-brand/10 p-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand dark:text-green-400" aria-hidden="true" />
        <p className="text-sm text-brand-dark dark:text-green-400">
          <span className="font-semibold">
            {obterSaudacao()}
            {sessao ? `, ${sessao.nome}` : ''}!
          </span>{' '}
          <span className="text-gray-700 dark:text-gray-300">{obterMensagemDoDia()}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="rounded-lg bg-brand-light dark:bg-brand/20 p-3">
            <Package className="h-6 w-6 text-brand dark:text-green-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Entregas disponíveis</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{totalEntregas ?? '—'}</p>
          </div>
        </div>
        <Link
          to="/escolas"
          className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition hover:border-brand/60 hover:dark:border-green-700/60 hover:shadow-md"
        >
          <div className="rounded-lg bg-green-50 p-3">
            <Building2 className="h-6 w-6 text-green-700" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Escolas cadastradas</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{totalEscolasCadastradas ?? '—'}</p>
          </div>
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Atalhos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/consulta"
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition hover:border-brand/60 hover:dark:border-green-700/60 hover:shadow-md"
          >
            <Search className="h-6 w-6 text-brand dark:text-green-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Consultar escola</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Localize uma entrega e gere o recibo.</p>
          </Link>
          <Link
            to="/importacao"
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition hover:border-brand/60 hover:dark:border-green-700/60 hover:shadow-md"
          >
            <UploadCloud className="h-6 w-6 text-brand dark:text-green-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Importar planilha</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Carregue a planilha semanal de entregas.</p>
          </Link>
          <Link
            to="/lote"
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition hover:border-brand/60 hover:dark:border-green-700/60 hover:shadow-md"
          >
            <Layers className="h-6 w-6 text-brand dark:text-green-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Recibos preparados</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Confira, corrija e gere os recibos em lote.</p>
          </Link>
          <Link
            to="/historico"
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition hover:border-brand/60 hover:dark:border-green-700/60 hover:shadow-md"
          >
            <FileClock className="h-6 w-6 text-brand dark:text-green-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Histórico</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Veja as planilhas semanais já importadas.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
