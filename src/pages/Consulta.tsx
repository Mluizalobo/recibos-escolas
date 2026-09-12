import { useEffect, useState } from 'react';
import { Printer, ReceiptText } from 'lucide-react';
import SearchForm from '../components/SearchForm';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import DynamicDataRenderer from '../components/DynamicDataRenderer';
import ReciboPreview from '../components/ReciboPreview';
import { useConsulta } from '../hooks/useConsulta';
import { EMPRESA } from '../services/api';
import { nomeArquivoRecibo } from '../services/pdfService';
import { formatDate } from '../utils/formatters';

const STATUS_ESTILO: Record<string, string> = {
  entregue: 'bg-green-100 text-green-700',
  pendente: 'bg-amber-100 text-amber-700',
  parcial: 'bg-blue-100 text-blue-700',
  cancelada: 'bg-red-100 text-red-700',
};

interface ReciboComImpressaoProps {
  autoImprimir: boolean;
  onVoltar: () => void;
  nomeArquivo: string;
  dados: Parameters<typeof ReciboPreview>[0]['dados'];
}

/** Envolve o preview para disparar a impressão automaticamente quando o usuário clica em "Imprimir" na tela de resultado. */
function ReciboComImpressaoAutomatica({ autoImprimir, onVoltar, nomeArquivo, dados }: ReciboComImpressaoProps) {
  useEffect(() => {
    if (!autoImprimir) return;
    const timer = setTimeout(() => window.print(), 350);
    return () => clearTimeout(timer);
  }, [autoImprimir]);

  return <ReciboPreview empresa={EMPRESA} dados={dados} nomeArquivo={nomeArquivo} onVoltar={onVoltar} />;
}

export default function Consulta() {
  const { loading, resultado, erro, buscar, tentarNovamente } = useConsulta();
  const [mostrarRecibo, setMostrarRecibo] = useState(false);
  const [autoImprimir, setAutoImprimir] = useState(false);

  if (mostrarRecibo && resultado) {
    return (
      <ReciboComImpressaoAutomatica
        autoImprimir={autoImprimir}
        dados={resultado.dados}
        nomeArquivo={nomeArquivoRecibo(resultado.nomeEscola, resultado.dataEntrega)}
        onVoltar={() => setMostrarRecibo(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Consultar Entrega</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Localize uma escola por nome, código, CNPJ, número do pedido ou código da entrega.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <SearchForm loading={loading} onBuscar={(tipo, valor) => buscar(tipo, valor)} />
      </div>

      {loading && <LoadingIndicator />}

      {!loading && erro && <ErrorMessage kind={erro.kind} message={erro.message} onRetry={tentarNovamente} />}

      {!loading && !erro && resultado && (
        <div className="space-y-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{resultado.nomeEscola}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Identificador: {resultado.identificador}</p>
              {resultado.dataEntrega && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Data: {formatDate(resultado.dataEntrega)}</p>
              )}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                STATUS_ESTILO[resultado.status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {resultado.status}
            </span>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Dados da entrega</h3>
            <DynamicDataRenderer data={resultado.dados} />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
            <button
              type="button"
              onClick={() => {
                setAutoImprimir(false);
                setMostrarRecibo(true);
              }}
              className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              <ReceiptText className="h-4 w-4" aria-hidden="true" /> Gerar Recibo
            </button>
            <button
              type="button"
              onClick={() => {
                setAutoImprimir(true);
                setMostrarRecibo(true);
              }}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:dark:bg-gray-800"
            >
              <Printer className="h-4 w-4" aria-hidden="true" /> Imprimir
            </button>
          </div>
        </div>
      )}

      {!loading && !erro && !resultado && (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-400 dark:text-gray-500">
          Informe um identificador acima e clique em Consultar.
        </div>
      )}
    </div>
  );
}
