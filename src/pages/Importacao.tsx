import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { validarArquivoPlanilha } from '../utils/validators';
import { importarPlanilha } from '../services/excelService';
import { registrarEntregasImportadas } from '../services/api';
import type { ResultadoImportacao } from '../types';

export default function Importacao() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [erroProcessamento, setErroProcessamento] = useState<string | null>(null);

  function handleSelecionarArquivo(file: File | undefined) {
    setResultado(null);
    setErroProcessamento(null);

    if (!file) {
      setArquivo(null);
      return;
    }

    const validacao = validarArquivoPlanilha(file);
    if (!validacao.valid) {
      setErroArquivo(validacao.message ?? 'Arquivo inválido.');
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setErroArquivo(null);
    setArquivo(file);
  }

  async function handleProcessar() {
    if (!arquivo || processando) return;
    setProcessando(true);
    setErroProcessamento(null);
    try {
      const resultadoImportacao = await importarPlanilha(arquivo);
      setResultado(resultadoImportacao);
      registrarEntregasImportadas(resultadoImportacao.entregas);
    } catch (err) {
      setErroProcessamento(err instanceof Error ? err.message : 'Não foi possível processar a planilha.');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Importar Planilha</h1>
        <p className="text-sm text-gray-500">
          Envie o arquivo .xlsx ou .xls com os dados das entregas para disponibilizá-los na consulta.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <label
          htmlFor="arquivo-planilha"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50/40"
        >
          <UploadCloud className="h-8 w-8 text-gray-400" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-700">Clique para selecionar a planilha</span>
          <span className="text-xs text-gray-400">Formatos aceitos: .xlsx, .xls</span>
        </label>
        <input
          ref={inputRef}
          id="arquivo-planilha"
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          onChange={(e) => handleSelecionarArquivo(e.target.files?.[0])}
          aria-describedby={erroArquivo ? 'arquivo-erro' : undefined}
        />

        {arquivo && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <FileSpreadsheet className="h-4 w-4 text-gray-500" aria-hidden="true" />
            {arquivo.name}
          </div>
        )}

        {erroArquivo && (
          <p id="arquivo-erro" role="alert" className="mt-2 text-sm text-red-600">
            {erroArquivo}
          </p>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={handleProcessar}
            disabled={!arquivo || processando}
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processando ? 'Processando…' : 'Processar planilha'}
          </button>
        </div>
      </div>

      {erroProcessamento && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {erroProcessamento}
        </div>
      )}

      {resultado && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Planilha processada</h2>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Linhas lidas</dt>
              <dd className="text-lg font-semibold text-gray-900">{resultado.totalLinhas}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Entregas geradas</dt>
              <dd className="text-lg font-semibold text-gray-900">{resultado.totalEntregas}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Avisos</dt>
              <dd className="text-lg font-semibold text-gray-900">{resultado.erros.length}</dd>
            </div>
          </dl>

          {resultado.erros.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">Avisos encontrados</h3>
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                {resultado.erros.map((erroItem, index) => (
                  <li key={index}>{erroItem}</li>
                ))}
              </ul>
            </div>
          )}

          {resultado.totalEntregas > 0 && (
            <p className="text-sm text-gray-600">
              As entregas importadas já estão disponíveis para consulta.{' '}
              <Link to="/consulta" className="font-medium text-blue-700 hover:underline">
                Ir para Consultar Entrega
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
