import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Building2, ClipboardList, Package } from 'lucide-react';
import { listarRecibosPreparados } from '../services/recibosStore';
import { STATUS_PREPARO_LABEL, type ReciboPreparado, type StatusPreparoRecibo } from '../types';

const STATUS_ESTILO: Record<StatusPreparoRecibo, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  pronto: 'bg-green-100 text-green-700',
  com_erro: 'bg-red-100 text-red-700',
  gerado: 'bg-blue-100 text-blue-700',
  impresso: 'bg-purple-100 text-purple-700',
};

/**
 * Panorama do que está preparado para entrega agora (mocks + planilhas
 * importadas nesta sessão) — quantidade por escola e os produtos que mais
 * saem. Para o histórico de planilhas processadas semana a semana, ver a
 * tela Histórico.
 */
export default function RelatorioSemanal() {
  const [recibos, setRecibos] = useState<ReciboPreparado[]>([]);

  useEffect(() => {
    listarRecibosPreparados().then(setRecibos);
  }, []);

  const escolasAtendidas = new Set(recibos.map((r) => r.entrega.escola.nome)).size;
  const recibosComPendencia = recibos.filter((r) => r.status === 'pendente' || r.status === 'com_erro').length;
  const totalItens = recibos.reduce((soma, r) => soma + r.entrega.itens.length, 0);

  const produtos = useMemo(() => {
    const mapa = new Map<string, { produto: string; unidade: string; quantidade: number }>();
    for (const recibo of recibos) {
      for (const item of recibo.entrega.itens) {
        const unidade = item.unidade ?? '';
        const chave = `${item.produto}|${unidade}`;
        const atual = mapa.get(chave);
        const quantidade = typeof item.quantidade === 'number' ? item.quantidade : 0;
        if (atual) {
          atual.quantidade += quantidade;
        } else {
          mapa.set(chave, { produto: item.produto, unidade, quantidade });
        }
      }
    }
    return Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade);
  }, [recibos]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Relatório Semanal</h1>
        <p className="text-sm text-gray-500">
          Panorama das entregas preparadas atualmente. Para o histórico de planilhas por semana, veja{' '}
          <Link to="/historico" className="font-medium text-brand hover:underline">
            Histórico
          </Link>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-brand-light p-3">
            <ClipboardList className="h-6 w-6 text-brand" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Recibos preparados</p>
            <p className="text-2xl font-semibold text-gray-900">{recibos.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-green-50 p-3">
            <Building2 className="h-6 w-6 text-green-700" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Escolas atendidas</p>
            <p className="text-2xl font-semibold text-gray-900">{escolasAtendidas}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-gray-100 p-3">
            <Package className="h-6 w-6 text-gray-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Itens entregues</p>
            <p className="text-2xl font-semibold text-gray-900">{totalItens}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-amber-50 p-3">
            <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Recibos com pendência</p>
            <p className="text-2xl font-semibold text-gray-900">{recibosComPendencia}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-gray-800">Produtos mais entregues</h2>
        </div>
        {produtos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum item entregue ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                  <th className="py-2 pr-3 font-medium">Produto</th>
                  <th className="py-2 pr-3 font-medium">Unidade</th>
                  <th className="py-2 font-medium">Quantidade total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {produtos.slice(0, 10).map((p) => (
                  <tr key={`${p.produto}-${p.unidade}`}>
                    <td className="py-2 pr-3 text-gray-900">{p.produto}</td>
                    <td className="py-2 pr-3 text-gray-500">{p.unidade || '—'}</td>
                    <td className="py-2 font-medium text-gray-900">{p.quantidade.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Entregas por escola</h2>
        {recibos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum recibo preparado ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recibos.map((recibo) => (
              <li key={recibo.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-gray-800">{recibo.entrega.escola.nome}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{recibo.entrega.itens.length} item(ns)</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_ESTILO[recibo.status]}`}>
                    {STATUS_PREPARO_LABEL[recibo.status]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
