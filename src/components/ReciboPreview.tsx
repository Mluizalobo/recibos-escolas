import { useRef, useState } from 'react';
import { ArrowLeft, FileDown, Printer } from 'lucide-react';
import type { Empresa, JsonObject } from '../types';
import ReciboTemplate from './ReciboTemplate';
import { gerarPdfRecibo } from '../services/pdfService';

interface ReciboPreviewProps {
  empresa: Empresa;
  dados: JsonObject;
  nomeArquivo: string;
  onVoltar: () => void;
}

/** Pré-visualização fiel ao PDF final, com ações de voltar, gerar PDF e imprimir. */
export default function ReciboPreview({ empresa, dados, nomeArquivo, onVoltar }: ReciboPreviewProps) {
  const reciboRef = useRef<HTMLDivElement>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleGerarPdf() {
    if (!reciboRef.current || gerando) return;
    setGerando(true);
    setErro(null);
    try {
      await gerarPdfRecibo(reciboRef.current, nomeArquivo);
    } catch {
      setErro('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setGerando(false);
    }
  }

  function handleImprimir() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Pré-visualização do Recibo</h2>
          <p className="text-xs text-gray-500">Confira os dados antes de gerar o PDF ou imprimir.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onVoltar}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar
          </button>
          <button
            type="button"
            onClick={handleImprimir}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" aria-hidden="true" /> Imprimir
          </button>
          <button
            type="button"
            onClick={handleGerarPdf}
            disabled={gerando}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            {gerando ? 'Gerando PDF…' : 'Gerar PDF'}
          </button>
        </div>
      </div>

      {erro && (
        <p role="alert" className="no-print text-sm text-red-600">
          {erro}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-100 p-4 print:border-0 print:bg-white print:p-0">
        <div id="print-area" ref={reciboRef} className="shadow-sm print:shadow-none">
          <ReciboTemplate empresa={empresa} dados={dados} />
        </div>
      </div>
    </div>
  );
}
