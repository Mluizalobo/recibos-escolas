import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileClock } from 'lucide-react';
import { listarHistorico } from '../services/historyService';
import type { ImportacaoHistorico } from '../types';

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Registro das planilhas semanais já processadas — permite consultar depois o que foi importado em cada semana. */
export default function Historico() {
  const [historico, setHistorico] = useState<ImportacaoHistorico[]>([]);

  useEffect(() => {
    listarHistorico()
      .then(setHistorico)
      .catch(() => {});
  }, []);

  const numeroDaSemana = new Map<string, number>();
  [...historico]
    .sort((a, b) => (a.dataImportacao > b.dataImportacao ? 1 : -1))
    .forEach((item, index) => numeroDaSemana.set(item.id, index + 1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Histórico de Importações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Planilhas semanais já processadas pelo sistema.</p>
      </div>

      {historico.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-400 dark:text-gray-500">
          <FileClock className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" aria-hidden="true" />
          Nenhuma importação registrada ainda.
        </div>
      ) : (
        <ul className="space-y-3">
          {historico.map((item) => (
            <li key={item.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Semana {numeroDaSemana.get(item.id)} — {new Date(item.dataImportacao).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.nomeArquivo} · {formatarTamanho(item.tamanhoBytes)} · importado em{' '}
                    {new Date(item.dataImportacao).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    item.status === 'concluida' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {item.status === 'concluida' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {item.status === 'concluida' ? 'Concluída' : 'Concluída com erros'}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Escolas</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">{item.totalEscolas}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Recibos</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">{item.totalRecibos}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Com erro</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">{item.totalComErro}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Duplicados</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">{item.totalDuplicados}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
