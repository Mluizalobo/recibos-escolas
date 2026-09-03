import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Layers, Package, Search, UploadCloud } from 'lucide-react';
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
        <p className="text-sm font-medium text-blue-700">{EMPRESA.nome}</p>
        <h1 className="text-2xl font-semibold text-gray-900">Recibos de Entrega</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Substitui o processo manual de copiar dados da planilha para o Word: consulte a escola, confira os
          dados e gere o recibo em PDF pronto para impressão.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-blue-50 p-3">
            <Package className="h-6 w-6 text-blue-700" aria-hidden="true" />
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            to="/consulta"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <Search className="h-6 w-6 text-blue-700" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Consultar escola</p>
            <p className="mt-1 text-xs text-gray-500">Localize uma entrega e gere o recibo.</p>
          </Link>
          <Link
            to="/importacao"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <UploadCloud className="h-6 w-6 text-blue-700" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Importar planilha</p>
            <p className="mt-1 text-xs text-gray-500">Carregue os dados da planilha de entregas.</p>
          </Link>
          <Link
            to="/lote"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <Layers className="h-6 w-6 text-blue-700" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Gerar recibos em lote</p>
            <p className="mt-1 text-xs text-gray-500">Selecione várias escolas e gere todos de uma vez.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
