import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, CheckSquare, Eye, FileDown, Pencil, Search, Share2, Square, Trash2 } from 'lucide-react';
import {
  atualizarStatusRecibo,
  corrigirRecibo,
  listarRecibosPreparados,
  removerRecibo,
  removerRecibos,
  type DadosCorrecaoRecibo,
} from '../services/recibosStore';
import { listarHistorico, removerImportacao } from '../services/historyService';
import { EMPRESA } from '../services/api';
import {
  compartilharRecibos,
  gerarPdfRecibo,
  gerarPdfUnicoComVarios,
  nomeArquivoRecibo,
  suportaCompartilharArquivo,
} from '../services/pdfService';
import {
  STATUS_PREPARO_LABEL,
  type ImportacaoHistorico,
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

const SEM_PLANILHA = 'sem-planilha';

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/** Rótulo de uma planilha na tela: prioriza o município detectado (o que Poliana reconhece de cara), senão o nome do arquivo. */
function rotuloPlanilha(h: ImportacaoHistorico): string {
  const data = new Date(h.dataImportacao).toLocaleDateString('pt-BR');
  return `${h.municipio ?? h.nomeArquivo} — ${data}`;
}

interface GrupoPlanilha {
  chave: string;
  titulo: string;
  historico: ImportacaoHistorico | null;
  recibos: ReciboPreparado[];
}

/**
 * Lista de recibos preparados com status, busca, filtro, correção pontual e
 * geração em lote — o usuário confere e gera; não digita os dados de novo.
 * Cada planilha importada é de uma prefeitura diferente e pode chegar a
 * qualquer momento sem apagar as anteriores (ver recibosStore.ts), então
 * aqui os recibos ficam agrupados/filtráveis por planilha em vez de virar
 * uma lista só misturando tudo.
 */
export default function BatchGenerator() {
  const [recibos, setRecibos] = useState<ReciboPreparado[]>([]);
  const [historico, setHistorico] = useState<ImportacaoHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [modo, setModo] = useState<ModoLote>('individual');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusPreparoRecibo | 'todos'>('todos');
  const [filtroPlanilha, setFiltroPlanilha] = useState('todas');
  const [gerando, setGerando] = useState(false);
  const [compartilhando, setCompartilhando] = useState<string | 'lote' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null);
  const [editando, setEditando] = useState<ReciboPreparado | null>(null);
  const [visualizando, setVisualizando] = useState<ReciboPreparado | null>(null);

  const refsRecibos = useRef<Record<string, HTMLDivElement | null>>({});
  const podeCompartilhar = useMemo(() => suportaCompartilharArquivo(), []);

  async function recarregar() {
    try {
      const [recibosCarregados, historicoCarregado] = await Promise.all([
        listarRecibosPreparados(),
        listarHistorico(),
      ]);
      setRecibos(recibosCarregados);
      setHistorico(historicoCarregado);
    } catch {
      setErro('Não foi possível carregar os recibos preparados. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    recarregar();
  }, []);

  const planilhasDisponiveis = useMemo(() => {
    const idsComRecibo = new Set(recibos.map((r) => r.importacaoId));
    return historico.filter((h) => idsComRecibo.has(h.id));
  }, [recibos, historico]);

  const existemRecibosSemPlanilha = useMemo(
    () => recibos.some((r) => !historico.some((h) => h.id === r.importacaoId)),
    [recibos, historico],
  );

  const recibosFiltrados = useMemo(() => {
    const buscaNormalizada = normalizar(busca);
    return recibos.filter((recibo) => {
      const combinaBusca = !buscaNormalizada || normalizar(recibo.entrega.escola.nome).includes(buscaNormalizada);
      const combinaStatus = filtroStatus === 'todos' || recibo.status === filtroStatus;
      const combinaPlanilha =
        filtroPlanilha === 'todas' ||
        (filtroPlanilha === SEM_PLANILHA
          ? !historico.some((h) => h.id === recibo.importacaoId)
          : recibo.importacaoId === filtroPlanilha);
      return combinaBusca && combinaStatus && combinaPlanilha;
    });
  }, [recibos, busca, filtroStatus, filtroPlanilha, historico]);

  const grupos = useMemo<GrupoPlanilha[]>(() => {
    const porId = new Map<string, ReciboPreparado[]>();
    for (const recibo of recibosFiltrados) {
      const lista = porId.get(recibo.importacaoId);
      if (lista) lista.push(recibo);
      else porId.set(recibo.importacaoId, [recibo]);
    }

    const ordenados: GrupoPlanilha[] = [];
    for (const h of historico) {
      const lista = porId.get(h.id);
      if (lista) ordenados.push({ chave: h.id, titulo: rotuloPlanilha(h), historico: h, recibos: lista });
    }
    for (const [id, lista] of porId) {
      if (!historico.some((h) => h.id === id)) {
        ordenados.push({ chave: id, titulo: 'Sem planilha identificada', historico: null, recibos: lista });
      }
    }
    return ordenados;
  }, [recibosFiltrados, historico]);

  /** Representa a planilha selecionada no filtro (quando não é "todas"), pra reaproveitar o mesmo botão de excluir planilha/lote da visão agrupada. */
  const grupoAtivo = useMemo<GrupoPlanilha | null>(() => {
    if (filtroPlanilha === 'todas') return null;
    const historicoAtivo = filtroPlanilha === SEM_PLANILHA ? null : (historico.find((h) => h.id === filtroPlanilha) ?? null);
    return {
      chave: filtroPlanilha,
      titulo: historicoAtivo ? rotuloPlanilha(historicoAtivo) : 'Sem planilha identificada',
      historico: historicoAtivo,
      recibos: recibosFiltrados,
    };
  }, [filtroPlanilha, historico, recibosFiltrados]);

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

  async function marcarGerado(id: string) {
    await atualizarStatusRecibo(id, 'gerado');
  }

  async function handleGerarUm(recibo: ReciboPreparado) {
    setErro(null);
    const elemento = refsRecibos.current[recibo.id];
    if (!elemento) return;
    try {
      await gerarPdfRecibo(elemento, nomeArquivoRecibo(recibo.entrega.escola.nome, recibo.entrega.dataEntrega));
      await marcarGerado(recibo.id);
      await recarregar();
    } catch {
      setErro('Não foi possível gerar o PDF deste recibo. Tente novamente.');
    }
  }

  async function handleCompartilharUm(recibo: ReciboPreparado) {
    const elemento = refsRecibos.current[recibo.id];
    if (!elemento || compartilhando) return;
    setErro(null);
    setCompartilhando(recibo.id);
    try {
      await compartilharRecibos(
        [[elemento]],
        [nomeArquivoRecibo(recibo.entrega.escola.nome, recibo.entrega.dataEntrega)],
      );
      await marcarGerado(recibo.id);
      await recarregar();
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setErro('Não foi possível compartilhar este recibo.');
      }
    } finally {
      setCompartilhando(null);
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
          await marcarGerado(recibo.id);
        }
      } else {
        setProgresso({ atual: 0, total: selecionadas.length });
        const elementos = selecionadas
          .map((recibo) => refsRecibos.current[recibo.id])
          .filter((el): el is HTMLDivElement => !!el);
        await gerarPdfUnicoComVarios(elementos, 'recibos_entrega_lote.pdf');
        await Promise.all(selecionadas.map((recibo) => marcarGerado(recibo.id)));
      }
      await recarregar();
    } catch (err) {
      console.error('Falha ao gerar recibos em lote:', err);
      setErro('Não foi possível gerar os recibos. Tente novamente.');
    } finally {
      setGerando(false);
      setProgresso(null);
    }
  }

  async function handleCompartilharSelecionados() {
    if (selecionados.size === 0 || compartilhando) return;
    setErro(null);
    setCompartilhando('lote');

    const selecionadas = recibos.filter((r) => selecionados.has(r.id));

    try {
      if (modo === 'individual') {
        const grupos: HTMLElement[][] = [];
        const nomes: string[] = [];
        for (const recibo of selecionadas) {
          const elemento = refsRecibos.current[recibo.id];
          if (!elemento) continue;
          grupos.push([elemento]);
          nomes.push(nomeArquivoRecibo(recibo.entrega.escola.nome, recibo.entrega.dataEntrega));
        }
        await compartilharRecibos(grupos, nomes);
      } else {
        const elementos = selecionadas
          .map((recibo) => refsRecibos.current[recibo.id])
          .filter((el): el is HTMLDivElement => !!el);
        await compartilharRecibos([elementos], ['recibos_entrega_lote.pdf']);
      }
      await Promise.all(selecionadas.map((recibo) => marcarGerado(recibo.id)));
      await recarregar();
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setErro('Não foi possível compartilhar os recibos.');
      }
    } finally {
      setCompartilhando(null);
    }
  }

  async function handleSalvarCorrecao(dados: DadosCorrecaoRecibo) {
    if (!editando) return;
    setErro(null);
    try {
      await corrigirRecibo(editando.id, dados);
      setEditando(null);
      await recarregar();
    } catch {
      setErro('Não foi possível salvar a correção. Tente novamente.');
    }
  }

  async function handleExcluir(recibo: ReciboPreparado) {
    const confirmado = window.confirm(
      `Excluir o recibo de "${recibo.entrega.escola.nome}"? Essa ação não pode ser desfeita.`,
    );
    if (!confirmado) return;

    setErro(null);
    try {
      await removerRecibo(recibo.id);
      setSelecionados((atual) => {
        if (!atual.has(recibo.id)) return atual;
        const novo = new Set(atual);
        novo.delete(recibo.id);
        return novo;
      });
      await recarregar();
    } catch {
      setErro('Não foi possível excluir o recibo. Tente novamente.');
    }
  }

  async function handleExcluirPlanilha(grupo: GrupoPlanilha) {
    if (grupo.recibos.length === 0) return;
    const confirmado = window.confirm(
      `Excluir "${grupo.titulo}"? Isso remove os ${grupo.recibos.length} recibo(s) dela. Essa ação não pode ser desfeita.`,
    );
    if (!confirmado) return;

    setErro(null);
    try {
      if (grupo.historico) {
        // Apaga a linha do histórico — os recibos dela somem junto (on delete cascade).
        await removerImportacao(grupo.historico.id);
      } else {
        // Sem histórico associado (ex: planilha importada antes de existir essa
        // ligação) — apaga os recibos diretamente, um a um não seria prático.
        await removerRecibos(grupo.recibos.map((r) => r.id));
      }
      if (filtroPlanilha === grupo.chave) setFiltroPlanilha('todas');
      await recarregar();
    } catch {
      setErro('Não foi possível excluir a planilha. Tente novamente.');
    }
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

  function linhaRecibo(recibo: ReciboPreparado) {
    return (
      <li key={recibo.id} className="flex flex-wrap items-center gap-3 py-3">
        <input
          type="checkbox"
          id={`check-${recibo.id}`}
          checked={selecionados.has(recibo.id)}
          onChange={() => alternarSelecao(recibo.id)}
          className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-brand dark:text-green-400 focus:ring-brand focus:dark:ring-green-600"
        />
        <label htmlFor={`check-${recibo.id}`} className="min-w-[10rem] flex-1 cursor-pointer text-sm text-gray-800 dark:text-gray-200">
          {recibo.entrega.escola.nome || 'Escola não identificada'}
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
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
            className="rounded-md p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 hover:dark:bg-gray-800 hover:text-gray-700 hover:dark:text-gray-300"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </button>
          {recibo.origem === 'importacao' && (
            <button
              type="button"
              onClick={() => setEditando(recibo)}
              aria-label={`Corrigir dados de ${recibo.entrega.escola.nome}`}
              className="rounded-md p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 hover:dark:bg-gray-800 hover:text-gray-700 hover:dark:text-gray-300"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleGerarUm(recibo)}
            aria-label={`Gerar PDF de ${recibo.entrega.escola.nome}`}
            className="rounded-md p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 hover:dark:bg-gray-800 hover:text-gray-700 hover:dark:text-gray-300"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
          </button>
          {podeCompartilhar && (
            <button
              type="button"
              onClick={() => handleCompartilharUm(recibo)}
              disabled={compartilhando === recibo.id}
              aria-label={`Compartilhar recibo de ${recibo.entrega.escola.nome}`}
              className="rounded-md p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 hover:dark:bg-gray-800 hover:text-gray-700 hover:dark:text-gray-300 disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {recibo.origem === 'importacao' && (
            <button
              type="button"
              onClick={() => handleExcluir(recibo)}
              aria-label={`Excluir recibo de ${recibo.entrega.escola.nome}`}
              className="rounded-md p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recibos Preparados</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Confira os recibos organizados a partir da planilha, corrija o que precisar e gere os PDFs. Cada planilha
          importada (uma por prefeitura) fica separada — importar uma nova não apaga as outras.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" aria-hidden="true" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar escola…"
            aria-label="Buscar escola"
            className="h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 pl-9 pr-3 text-sm text-gray-800 dark:text-gray-200 focus:border-brand focus:dark:border-green-600 focus:outline-none focus:ring-2 focus:ring-brand-light focus:dark:ring-green-900/40"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          Planilha
          <select
            value={filtroPlanilha}
            onChange={(e) => setFiltroPlanilha(e.target.value)}
            className="h-10 max-w-[16rem] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-sm text-gray-800 dark:text-gray-200 focus:border-brand focus:dark:border-green-600 focus:outline-none focus:ring-2 focus:ring-brand-light focus:dark:ring-green-900/40"
          >
            <option value="todas">Todas</option>
            {planilhasDisponiveis.map((h) => (
              <option key={h.id} value={h.id}>
                {rotuloPlanilha(h)}
              </option>
            ))}
            {existemRecibosSemPlanilha && <option value={SEM_PLANILHA}>Sem planilha identificada</option>}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          Status
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as StatusPreparoRecibo | 'todos')}
            className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-sm text-gray-800 dark:text-gray-200 focus:border-brand focus:dark:border-green-600 focus:outline-none focus:ring-2 focus:ring-brand-light focus:dark:ring-green-900/40"
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

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <button
            type="button"
            onClick={alternarTodos}
            className="inline-flex items-center gap-2 text-sm font-medium text-brand dark:text-green-400 hover:underline"
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
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {selecionados.size} de {recibosFiltrados.length} selecionados
          </span>
        </div>

        {carregando ? (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Carregando…</p>
        ) : recibosFiltrados.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Nenhum recibo encontrado.</p>
        ) : filtroPlanilha !== 'todas' ? (
          <div>
            {grupoAtivo && (
              <div className="mb-2 flex items-center justify-end gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <button
                  type="button"
                  onClick={() => handleExcluirPlanilha(grupoAtivo)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  {grupoAtivo.historico ? 'Excluir esta planilha' : 'Excluir estes recibos'}
                </button>
              </div>
            )}
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">{recibosFiltrados.map(linhaRecibo)}</ul>
          </div>
        ) : (
          <div className="space-y-4">
            {grupos.map((grupo) => (
              <div
                key={grupo.chave}
                className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800/60 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-brand dark:text-green-400" aria-hidden="true" />
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{grupo.titulo}</h2>
                    <span className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {grupo.recibos.length} escola{grupo.recibos.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExcluirPlanilha(grupo)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    {grupo.historico ? 'Excluir esta planilha' : 'Excluir estes recibos'}
                  </button>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">{grupo.recibos.map(linhaRecibo)}</ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-2 w-full text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Formato de saída</legend>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="radio"
              name="modo-lote"
              checked={modo === 'individual'}
              onChange={() => setModo('individual')}
              className="h-4 w-4 text-brand dark:text-green-400 focus:ring-brand focus:dark:ring-green-600"
            />
            Um PDF por escola
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="radio"
              name="modo-lote"
              checked={modo === 'unico'}
              onChange={() => setModo('unico')}
              className="h-4 w-4 text-brand dark:text-green-400 focus:ring-brand focus:dark:ring-green-600"
            />
            Um único PDF com todos
          </label>
        </fieldset>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {podeCompartilhar && (
            <button
              type="button"
              onClick={handleCompartilharSelecionados}
              disabled={selecionados.size === 0 || compartilhando !== null}
              className="inline-flex items-center gap-2 rounded-md border border-brand px-5 py-2.5 text-sm font-medium text-brand transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-60 dark:border-green-600 dark:text-green-400 dark:hover:bg-brand/20"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {compartilhando === 'lote' ? 'Compartilhando…' : 'Compartilhar Selecionados'}
            </button>
          )}
          <button
            type="button"
            onClick={handleGerarSelecionados}
            disabled={selecionados.size === 0 || gerando}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            {gerando ? `Gerando${progresso ? ` (${progresso.atual}/${progresso.total})` : '…'}` : 'Gerar Recibos Selecionados'}
          </button>
        </div>
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
