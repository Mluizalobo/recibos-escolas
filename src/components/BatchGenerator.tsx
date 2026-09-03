import { useEffect, useRef, useState } from 'react';
import { CheckSquare, FileDown, Square } from 'lucide-react';
import { EMPRESA, listarTodasEntregas, type ResultadoConsulta } from '../services/api';
import { gerarPdfRecibo, gerarPdfUnicoComVarios, nomeArquivoRecibo } from '../services/pdfService';
import type { ModoLote } from '../types';
import ReciboTemplate from './ReciboTemplate';
import LoadingIndicator from './LoadingIndicator';

/** Geração de recibos em lote: seleciona várias entregas e gera um PDF por escola ou um único PDF combinado. */
export default function BatchGenerator() {
  const [entregas, setEntregas] = useState<ResultadoConsulta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [modo, setModo] = useState<ModoLote>('individual');
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null);

  const refsRecibos = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let ativo = true;
    listarTodasEntregas().then((lista) => {
      if (ativo) {
        setEntregas(lista);
        setCarregando(false);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  function alternarSelecao(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarTodos() {
    setSelecionados((atual) =>
      atual.size === entregas.length ? new Set() : new Set(entregas.map((e) => e.id)),
    );
  }

  async function handleGerar() {
    if (selecionados.size === 0 || gerando) return;
    setGerando(true);
    setErro(null);

    const selecionadas = entregas.filter((e) => selecionados.has(e.id));

    try {
      if (modo === 'individual') {
        for (let i = 0; i < selecionadas.length; i += 1) {
          const entrega = selecionadas[i];
          setProgresso({ atual: i + 1, total: selecionadas.length });
          const elemento = refsRecibos.current[entrega.id];
          if (!elemento) continue;
          await gerarPdfRecibo(elemento, nomeArquivoRecibo(entrega.nomeEscola, entrega.dataEntrega));
        }
      } else {
        setProgresso({ atual: 0, total: selecionadas.length });
        const elementos = selecionadas
          .map((entrega) => refsRecibos.current[entrega.id])
          .filter((el): el is HTMLDivElement => !!el);
        await gerarPdfUnicoComVarios(elementos, 'recibos_entrega_lote.pdf');
      }
    } catch {
      setErro('Não foi possível gerar os recibos. Tente novamente.');
    } finally {
      setGerando(false);
      setProgresso(null);
    }
  }

  if (carregando) return <LoadingIndicator label="Carregando entregas…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Gerar Recibos em Lote</h1>
        <p className="text-sm text-gray-500">Selecione as escolas e gere todos os recibos de uma só vez.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <button
            type="button"
            onClick={alternarTodos}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline"
          >
            {selecionados.size === entregas.length && entregas.length > 0 ? (
              <CheckSquare className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Square className="h-4 w-4" aria-hidden="true" />
            )}
            {selecionados.size === entregas.length && entregas.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
          <span className="text-xs text-gray-500">
            {selecionados.size} de {entregas.length} selecionadas
          </span>
        </div>

        {entregas.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Nenhuma entrega disponível.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {entregas.map((entrega) => (
              <li key={entrega.id} className="flex items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  id={`check-${entrega.id}`}
                  checked={selecionados.has(entrega.id)}
                  onChange={() => alternarSelecao(entrega.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
                />
                <label htmlFor={`check-${entrega.id}`} className="flex-1 cursor-pointer text-sm text-gray-800">
                  {entrega.nomeEscola}
                  <span className="ml-2 text-xs text-gray-400">Identificador {entrega.identificador}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-2 w-full text-xs font-semibold uppercase text-gray-500">Formato de saída</legend>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="modo-lote"
              checked={modo === 'individual'}
              onChange={() => setModo('individual')}
              className="h-4 w-4 text-blue-700 focus:ring-blue-500"
            />
            Um PDF por escola
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="modo-lote"
              checked={modo === 'unico'}
              onChange={() => setModo('unico')}
              className="h-4 w-4 text-blue-700 focus:ring-blue-500"
            />
            Um único PDF com todos
          </label>
        </fieldset>

        <button
          type="button"
          onClick={handleGerar}
          disabled={selecionados.size === 0 || gerando}
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileDown className="h-4 w-4" aria-hidden="true" />
          {gerando ? `Gerando${progresso ? ` (${progresso.atual}/${progresso.total})` : '…'}` : 'Gerar Recibos Selecionados'}
        </button>
      </div>

      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}

      {/* Recibos renderizados fora da tela (mas com layout real) para serem capturados na geração do PDF. */}
      <div aria-hidden="true" className="pointer-events-none fixed left-[-9999px] top-0">
        {entregas.map((entrega) => (
          <div
            key={entrega.id}
            style={{ width: '210mm' }}
            ref={(el) => {
              refsRecibos.current[entrega.id] = el;
            }}
          >
            <ReciboTemplate empresa={EMPRESA} dados={entrega.dados} />
          </div>
        ))}
      </div>
    </div>
  );
}
