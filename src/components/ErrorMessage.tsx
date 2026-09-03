import { AlertTriangle, RefreshCw, WifiOff, XCircle } from 'lucide-react';
import type { ApiErrorKind } from '../types';

interface ErrorMessageProps {
  kind: ApiErrorKind;
  message: string;
  onRetry?: () => void;
}

const ICONE_POR_TIPO: Record<ApiErrorKind, typeof AlertTriangle> = {
  not_found: AlertTriangle,
  network: WifiOff,
  unknown: XCircle,
};

/** Nunca deixa a tela vazia diante de um erro: sempre mostra mensagem + ação de tentar novamente. */
export default function ErrorMessage({ kind, message, onRetry }: ErrorMessageProps) {
  const Icone = ICONE_POR_TIPO[kind];

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-10 text-center"
    >
      <Icone className="h-8 w-8 text-amber-600" aria-hidden="true" />
      <p className="max-w-sm text-sm text-amber-900">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
