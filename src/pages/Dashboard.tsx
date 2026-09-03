import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, FileClock, Layers, Package, Search, UploadCloud } from 'lucide-react';
import { EMPRESA, obterResumoDashboard } from '../services/api';

export default function Dashboard() {
  const [resumo, setResumo] = useState<{ totalEntregas: number; totalEscolas: number } | null>(null);

  useEffect(() => {
    let ativo = true;
    obterResumoDashboard().then((dados) => {
      if (ativo) setResumo(dados);
    });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-brand">{EMPRESA.nome}</p>
        <h1 className="text-2xl font-semibold text-gray-900">Recibos de Entrega</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Substitui o processo manual de copiar dados da planilha para o Word: consulte a escola, confira os
          dados e gere o recibo em PDF pronto para impressão.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-brand-light p-3">
            <Package className="h-6 w-6 text-brand" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Entregas disponíveis</p>
            <p className="text-2xl font-semibold text-gray-900">{resumo ? resumo.totalEntregas : '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-green-50 p-3">
            <Building2 className="h-6 w-6 text-green-700" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Escolas cadastradas</p>
            <p className="text-2xl font-semibold text-gray-900">{resumo ? resumo.totalEscolas : '—'}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Atalhos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/consulta"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand/60 hover:shadow-md"
          >
            <Search className="h-6 w-6 text-brand" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Consultar escola</p>
            <p className="mt-1 text-xs text-gray-500">Localize uma entrega e gere o recibo.</p>
          </Link>
          <Link
            to="/importacao"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand/60 hover:shadow-md"
          >
            <UploadCloud className="h-6 w-6 text-brand" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Importar planilha</p>
            <p className="mt-1 text-xs text-gray-500">Carregue a planilha semanal de entregas.</p>
          </Link>
          <Link
            to="/lote"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand/60 hover:shadow-md"
          >
            <Layers className="h-6 w-6 text-brand" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Recibos preparados</p>
            <p className="mt-1 text-xs text-gray-500">Confira, corrija e gere os recibos em lote.</p>
          </Link>
          <Link
            to="/historico"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand/60 hover:shadow-md"
          >
            <FileClock className="h-6 w-6 text-brand" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Histórico</p>
            <p className="mt-1 text-xs text-gray-500">Veja as planilhas semanais já importadas.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
