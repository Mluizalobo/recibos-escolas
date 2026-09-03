import { useMemo, useRef, useState } from 'react';
import { CheckSquare, Eye, FileDown, Pencil, Search, Square } from 'lucide-react';
import {
  atualizarStatusRecibo,
  corrigirRecibo,
  listarRecibosPreparados,
  type DadosCorrecaoRecibo,
} from '../services/recibosStore';
import { EMPRESA } from '../services/api';
import { gerarPdfRecibo, gerarPdfUnicoComVarios, nomeArquivoRecibo } from '../services/pdfService';
import {
  STATUS_PREPARO_LABEL,
  type JsonObject,
  type ModoLote,
  type ReciboPreparado,
  type StatusPreparoRecibo,
} from '../types';
import ReciboTemplate from './ReciboTemplate';
import ReciboPreview from './ReciboPreview';
import EditarReciboModal from './EditarReciboModal';

const STATUS_ESTILO: Record<StatusPreparoRecibo, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  pronto: 'bg-green-100 text-green-700',
  com_erro: 'bg-red-100 text-red-700',
  gerado: 'bg-blue-100 text-blue-700',
  impresso: 'bg-purple-100 text-purple-700',
};

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Lista de recibos preparados (importados + demonstração) com status,
 * busca, filtro, correção pontual e geração em lote — o usuário confere e
 * gera; não digita os dados de novo.
 */
export default function BatchGenerator() {
  const [recibos, setRecibos] = useState<ReciboPreparado[]>(() => listarRecibosPreparados());
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [modo, setModo] = useState<ModoLote>('individual');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusPreparoRecibo | 'todos'>('todos');
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null);
  const [editando, setEditando] = useState<ReciboPreparado | null>(null);
  const [visualizando, setVisualizando] = useState<ReciboPreparado | null>(null);

  const refsRecibos = useRef<Record<string, HTMLDivElement | null>>({});

  function recarregar() {
    setRecibos(listarRecibosPreparados());
  }

  const recibosFiltrados = useMemo(() => {
    const buscaNormalizada = normalizar(busca);
    return recibos.filter((recibo) => {
      const combinaBusca = !buscaNormalizada || normalizar(recibo.entrega.escola.nome).includes(buscaNormalizada);
      const combinaStatus = filtroStatus === 'todos' || recibo.status === filtroStatus;
      return combinaBusca && combinaStatus;
    });
  }, [recibos, busca, filtroStatus]);

  function alternarSelecao(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarTodos() {
    const idsVisiveis = recibosFiltrados.map((r) => r.id);
    const todosMarcados = idsVisiveis.length > 0 && idsVisiveis.every((id) => selecionados.has(id));
    setSelecionados(todosMarcados ? new Set() : new Set(idsVisiveis));
  }

  function marcarGerado(id: string) {
    atualizarStatusRecibo(id, 'gerado');
  }

  async function handleGerarUm(recibo: ReciboPreparado) {
    setErro(null);
    const elemento = refsRecibos.current[recibo.id];
    if (!elemento) return;
    try {
      await gerarPdfRecibo(elemento, nomeArquivoRecibo(recibo.entrega.escola.nome, recibo.entrega.dataEntrega));
      marcarGerado(recibo.id);
      recarregar();
    } catch {
      setErro('Não foi possível gerar o PDF deste recibo. Tente novamente.');
    }
  }

  async function handleGerarSelecionados() {
    if (selecionados.size === 0 || gerando) return;
    setGerando(true);
    setErro(null);

    const selecionadas = recibos.filter((r) => selecionados.has(r.id));

    try {
      if (modo === 'individual') {
        for (let i = 0; i < selecionadas.length; i += 1) {
          const recibo = selecionadas[i];
          setProgresso({ atual: i + 1, total: selecionadas.length });
          const elemento = refsRecibos.current[recibo.id];
          if (!elemento) continue;
          await gerarPdfRecibo(elemento, nomeArquivoRecibo(recibo.entrega.escola.nome, recibo.entrega.dataEntrega));
          marcarGerado(recibo.id);
        }
      } else {
        setProgresso({ atual: 0, total: selecionadas.length });
        const elementos = selecionadas
          .map((recibo) => refsRecibos.current[recibo.id])
          .filter((el): el is HTMLDivElement => !!el);
        await gerarPdfUnicoComVarios(elementos, 'recibos_entrega_lote.pdf');
        selecionadas.forEach((recibo) => marcarGerado(recibo.id));
      }
      recarregar();
    } catch (err) {
      console.error('Falha ao gerar recibos em lote:', err);
      setErro('Não foi possível gerar os recibos. Tente novamente.');
    } finally {
      setGerando(false);
      setProgresso(null);
    }
  }

  function handleSalvarCorrecao(dados: DadosCorrecaoRecibo) {
    if (!editando) return;
    corrigirRecibo(editando.id, dados);
    setEditando(null);
    recarregar();
  }

  if (visualizando) {
    return (
      <ReciboPreview
        empresa={EMPRESA}
        dados={visualizando.entrega as unknown as JsonObject}
        nomeArquivo={nomeArquivoRecibo(visualizando.entrega.escola.nome, visualizando.entrega.dataEntrega)}
        onVoltar={() => {
          setVisualizando(null);
          recarregar();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Recibos Preparados</h1>
        <p className="text-sm text-gray-500">
          Confira os recibos organizados a partir da planilha, corrija o que precisar e gere os PDFs.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar escola…"
            aria-label="Buscar escola"
            className="h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Status
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as StatusPreparoRecibo | 'todos')}
            className="h-10 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
          >
            <option value="todos">Todos</option>
            {(Object.keys(STATUS_PREPARO_LABEL) as StatusPreparoRecibo[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_PREPARO_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <button
            type="button"
            onClick={alternarTodos}
            className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
          >
            {recibosFiltrados.length > 0 && recibosFiltrados.every((r) => selecionados.has(r.id)) ? (
              <CheckSquare className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Square className="h-4 w-4" aria-hidden="true" />
            )}
            {recibosFiltrados.length > 0 && recibosFiltrados.every((r) => selecionados.has(r.id))
              ? 'Desmarcar todos'
              : 'Selecionar todos'}
          </button>
          <span className="text-xs text-gray-500">
            {selecionados.size} de {recibosFiltrados.length} selecionados
          </span>
        </div>

        {recibosFiltrados.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Nenhum recibo encontrado.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recibosFiltrados.map((recibo) => (
              <li key={recibo.id} className="flex flex-wrap items-center gap-3 py-3">
                <input
                  type="checkbox"
                  id={`check-${recibo.id}`}
                  checked={selecionados.has(recibo.id)}
                  onChange={() => alternarSelecao(recibo.id)}
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                <label htmlFor={`check-${recibo.id}`} className="min-w-[10rem] flex-1 cursor-pointer text-sm text-gray-800">
                  {recibo.entrega.escola.nome || 'Escola não identificada'}
                  <span className="ml-2 text-xs text-gray-400">
                    {recibo.entrega.numeroPedido && recibo.entrega.numeroPedido !== '—'
                      ? `Pedido ${recibo.entrega.numeroPedido}`
                      : `${recibo.entrega.itens.length} item(ns)`}
                  </span>
                </label>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_ESTILO[recibo.status]}`}>
                  {STATUS_PREPARO_LABEL[recibo.status]}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setVisualizando(recibo)}
                    aria-label={`Visualizar recibo de ${recibo.entrega.escola.nome}`}
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {recibo.origem === 'importacao' && (
                    <button
                      type="button"
                      onClick={() => setEditando(recibo)}
                      aria-label={`Corrigir dados de ${recibo.entrega.escola.nome}`}
                      className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleGerarUm(recibo)}
                    aria-label={`Gerar PDF de ${recibo.entrega.escola.nome}`}
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <FileDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
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
              className="h-4 w-4 text-brand focus:ring-brand"
            />
            Um PDF por escola
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="modo-lote"
              checked={modo === 'unico'}
              onChange={() => setModo('unico')}
              className="h-4 w-4 text-brand focus:ring-brand"
            />
            Um único PDF com todos
          </label>
        </fieldset>

        <button
          type="button"
          onClick={handleGerarSelecionados}
          disabled={selecionados.size === 0 || gerando}
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
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

      {editando && (
        <EditarReciboModal recibo={editando} onSalvar={handleSalvarCorrecao} onFechar={() => setEditando(null)} />
      )}

      {/* Recibos renderizados fora da tela (mas com layout real) para serem capturados na geração do PDF. */}
      <div aria-hidden="true" className="pointer-events-none fixed left-[-9999px] top-0">
        {recibos.map((recibo) => (
          <div
            key={recibo.id}
            style={{ width: '210mm' }}
            ref={(el) => {
              refsRecibos.current[recibo.id] = el;
            }}
          >
            <ReciboTemplate empresa={EMPRESA} dados={recibo.entrega as unknown as JsonObject} />
          </div>
        ))}
      </div>
    </div>
  );
}
