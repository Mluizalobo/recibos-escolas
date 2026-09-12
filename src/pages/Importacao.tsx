import { useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Eye, EyeOff, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { validarArquivoPlanilha } from '../utils/validators';
import { calcularHashPlanilha, lerArquivoExcel } from '../services/excelService';
import { normalizeSpreadsheetData } from '../services/normalizeService';
import { registrarEntregasImportadas } from '../services/api';
import { adicionarRecibosImportados } from '../services/recibosStore';
import { encontrarImportacaoDuplicada, registrarImportacao } from '../services/historyService';
import { criarEscolaCadastrada, listarEscolasCadastradas, type DadosEscolaCadastrada } from '../services/escolasStore';
import { formatPrimitiveValue } from '../utils/formatters';
import type { ImportacaoHistorico, JsonValue, PlanilhaGrade, ResultadoImportacao } from '../types';

type StatusProcessamento = 'selecionado' | 'processando' | 'concluido' | 'erro';

const STATUS_LABEL: Record<StatusProcessamento, string> = {
  selecionado: 'Selecionado',
  processando: 'Processando…',
  concluido: 'Concluído',
  erro: 'Erro no processamento',
};

const STATUS_ESTILO: Record<StatusProcessamento, string> = {
  selecionado: 'bg-gray-100 text-gray-600',
  processando: 'bg-blue-50 text-blue-700',
  concluido: 'bg-green-100 text-green-700',
  erro: 'bg-red-100 text-red-700',
};

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DuplicataPendente {
  grade: PlanilhaGrade;
  hash: string;
  duplicata: ImportacaoHistorico;
}

const MAX_LINHAS_PREVIEW = 100;
const MAX_COLUNAS_PREVIEW = 25;

/**
 * Toda escola que a importação não achou no cadastro (problema com
 * campo "cadastro") é cadastrada automaticamente com o que a planilha
 * trouxer — nome, endereço, horário, código, CNPJ. Assim o cadastro cresce
 * sozinho a cada planilha, sem trabalho manual, e nas próximas semanas essa
 * escola já vem com os dados preenchidos. Devolve quantas escolas novas
 * foram cadastradas nesta importação.
 */
async function cadastrarEscolasNovas(resultado: ResultadoImportacao): Promise<number> {
  const novas = new Map<string, DadosEscolaCadastrada>();

  for (const recibo of resultado.recibos) {
    const temProblemaDeCadastro = recibo.problemas.some((p) => p.campo === 'cadastro');
    if (!temProblemaDeCadastro) continue;

    const escola = recibo.entrega.escola;
    const chave = escola.nome.trim().toUpperCase();
    if (!novas.has(chave)) {
      novas.set(chave, {
        nome: escola.nome,
        apelidos: [],
        codigoEscola: escola.codigoEscola || undefined,
        cnpj: escola.cnpj || undefined,
        endereco: escola.endereco,
        horarioFuncionamento: escola.horarioFuncionamento,
      });
    }
  }

  if (novas.size === 0) return 0;

  await Promise.all([...novas.values()].map((dados) => criarEscolaCadastrada(dados)));

  // Atualiza a mensagem do aviso: a escola não estava cadastrada, mas já
  // foi agora — não faz mais sentido pedir pra alguém cadastrar manualmente.
  for (const recibo of resultado.recibos) {
    const problemaCadastro = recibo.problemas.find((p) => p.campo === 'cadastro');
    if (problemaCadastro && novas.has(recibo.entrega.escola.nome.trim().toUpperCase())) {
      problemaCadastro.mensagem = `"${recibo.entrega.escola.nome}" foi cadastrada automaticamente a partir desta planilha — confira os dados em "Escolas Cadastradas" e complete o que faltar.`;
    }
  }

  return novas.size;
}

/**
 * Tela que substitui o processo manual "planilha semanal → copiar para o
 * Word → imprimir": o usuário só importa o arquivo, confere o resumo e os
 * recibos já saem preparados (ver src/services/normalizeService.ts).
 */
export default function Importacao() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [selecionadoEm, setSelecionadoEm] = useState<Date | null>(null);
  const [statusProcessamento, setStatusProcessamento] = useState<StatusProcessamento | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [erroProcessamento, setErroProcessamento] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [duplicataPendente, setDuplicataPendente] = useState<DuplicataPendente | null>(null);
  const [gradeBruta, setGradeBruta] = useState<PlanilhaGrade | null>(null);
  const [mostrarBruta, setMostrarBruta] = useState(false);
  const [escolasNovasCadastradas, setEscolasNovasCadastradas] = useState(0);

  function selecionarArquivo(file: File | undefined) {
    setResultado(null);
    setErroProcessamento(null);
    setDuplicataPendente(null);
    setGradeBruta(null);
    setMostrarBruta(false);
    setEscolasNovasCadastradas(0);

    if (!file) return;

    const validacao = validarArquivoPlanilha(file);
    if (!validacao.valid) {
      setErroArquivo(validacao.message ?? 'Arquivo inválido.');
      setArquivo(null);
      setStatusProcessamento(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setErroArquivo(null);
    setArquivo(file);
    setSelecionadoEm(new Date());
    setStatusProcessamento('selecionado');
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setArrastando(false);
    selecionarArquivo(event.dataTransfer.files?.[0]);
  }

  async function processar(forcado?: { grade: PlanilhaGrade; hash: string }) {
    if (!arquivo) return;
    setStatusProcessamento('processando');
    setErroProcessamento(null);

    try {
      const grade = forcado?.grade ?? (await lerArquivoExcel(arquivo));
      const hash = forcado?.hash ?? calcularHashPlanilha(grade);
      setGradeBruta(grade);

      if (!forcado) {
        const duplicata = await encontrarImportacaoDuplicada(hash);
        if (duplicata) {
          setDuplicataPendente({ grade, hash, duplicata });
          setStatusProcessamento('selecionado');
          return;
        }
      }

      const escolasCadastradas = await listarEscolasCadastradas();
      const importacaoId = `imp-${Date.now()}`;
      const resultadoNormalizado = normalizeSpreadsheetData(grade, escolasCadastradas, importacaoId);
      setEscolasNovasCadastradas(await cadastrarEscolasNovas(resultadoNormalizado));

      // A linha do histórico precisa existir antes dos recibos por causa da
      // referência (importacao_id) entre as tabelas.
      await registrarImportacao({
        id: importacaoId,
        nomeArquivo: arquivo.name,
        tamanhoBytes: arquivo.size,
        dataImportacao: new Date().toISOString(),
        totalLinhas: resultadoNormalizado.totalLinhas,
        totalEscolas: resultadoNormalizado.totalEscolas,
        totalRecibos: resultadoNormalizado.totalRecibosPreparados,
        totalComErro: resultadoNormalizado.totalComErro,
        totalDuplicados: resultadoNormalizado.totalDuplicados,
        status: resultadoNormalizado.totalComErro > 0 ? 'com_erros' : 'concluida',
        hashConteudo: hash,
        municipio: resultadoNormalizado.municipio,
      });
      await adicionarRecibosImportados(resultadoNormalizado.recibos);
      registrarEntregasImportadas(resultadoNormalizado.recibos.map((r) => r.entrega));

      setResultado(resultadoNormalizado);
      setStatusProcessamento('concluido');
      setDuplicataPendente(null);
    } catch (err) {
      setErroProcessamento(err instanceof Error ? err.message : 'Não foi possível processar a planilha.');
      setStatusProcessamento('erro');
    }
  }

  const processando = statusProcessamento === 'processando';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Importar Planilha</h1>
        <p className="text-sm text-gray-500">
          Envie a planilha semanal de entregas (.xlsx ou .xls). O sistema lê, organiza por escola e já deixa os
          recibos preparados para conferência — sem digitação manual.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <label
          htmlFor="arquivo-planilha"
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition ${
            arrastando ? 'border-brand bg-brand-light' : 'border-gray-300 hover:border-brand hover:bg-brand-light/40'
          }`}
        >
          <UploadCloud className="h-8 w-8 text-gray-400" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-700">Clique para selecionar ou arraste a planilha aqui</span>
          <span className="text-xs text-gray-400">Formatos aceitos: .xlsx, .xls</span>
        </label>
        <input
          ref={inputRef}
          id="arquivo-planilha"
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          onChange={(e) => selecionarArquivo(e.target.files?.[0])}
          aria-describedby={erroArquivo ? 'arquivo-erro' : undefined}
        />

        {arquivo && statusProcessamento && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
            <span className="font-medium">{arquivo.name}</span>
            <span className="text-xs text-gray-400">{formatarTamanho(arquivo.size)}</span>
            {selecionadoEm && (
              <span className="text-xs text-gray-400">Selecionado em {selecionadoEm.toLocaleString('pt-BR')}</span>
            )}
            <span
              className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_ESTILO[statusProcessamento]}`}
            >
              {STATUS_LABEL[statusProcessamento]}
            </span>
          </div>
        )}

        {erroArquivo && (
          <p id="arquivo-erro" role="alert" className="mt-2 text-sm text-red-600">
            {erroArquivo}
          </p>
        )}

        {duplicataPendente && (
          <div role="alert" className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Esta planilha (ou os mesmos dados) já foi processada em{' '}
                <strong>{new Date(duplicataPendente.duplicata.dataImportacao).toLocaleString('pt-BR')}</strong>, no
                arquivo "{duplicataPendente.duplicata.nomeArquivo}". Deseja continuar mesmo assim?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDuplicataPendente(null)}
                className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => processar({ grade: duplicataPendente.grade, hash: duplicataPendente.hash })}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
              >
                Continuar mesmo assim
              </button>
            </div>
          </div>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => processar()}
            disabled={!arquivo || processando}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
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
            <h2 className="text-sm font-semibold">Importação concluída</h2>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Linhas lidas</dt>
              <dd className="text-lg font-semibold text-gray-900">{resultado.totalLinhas}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Escolas identificadas</dt>
              <dd className="text-lg font-semibold text-gray-900">{resultado.totalEscolas}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Recibos preparados</dt>
              <dd className="text-lg font-semibold text-gray-900">{resultado.totalRecibosPreparados}</dd>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <dt className="text-xs text-amber-700">Com erro</dt>
              <dd className="text-lg font-semibold text-amber-900">{resultado.totalComErro}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Duplicados</dt>
              <dd className="text-lg font-semibold text-gray-900">{resultado.totalDuplicados}</dd>
            </div>
          </dl>

          {escolasNovasCadastradas > 0 && (
            <p className="rounded-md bg-brand-light px-3 py-2 text-sm text-brand-dark">
              {escolasNovasCadastradas} escola{escolasNovasCadastradas === 1 ? '' : 's'} nova
              {escolasNovasCadastradas === 1 ? '' : 's'} cadastrada
              {escolasNovasCadastradas === 1 ? '' : 's'} automaticamente em "Escolas Cadastradas" a partir desta
              planilha.
            </p>
          )}

          {resultado.avisos.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">Avisos gerais</h3>
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                {resultado.avisos.map((aviso, index) => (
                  <li key={index}>{aviso}</li>
                ))}
              </ul>
            </div>
          )}

          {resultado.totalRecibosPreparados > 0 && (
            <p className="text-sm text-gray-600">
              <Link to="/lote" className="font-medium text-brand hover:underline">
                Ver recibos preparados
              </Link>{' '}
              para conferir, corrigir o que tiver pendência e gerar os PDFs.
            </p>
          )}
        </div>
      )}

      {gradeBruta && gradeBruta.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <button
            type="button"
            onClick={() => setMostrarBruta((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-gray-800">
              Planilha original ({gradeBruta.length} linha{gradeBruta.length === 1 ? '' : 's'})
            </span>
            {mostrarBruta ? (
              <EyeOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
            )}
          </button>

          {mostrarBruta && <GradePreview grade={gradeBruta} />}
        </div>
      )}
    </div>
  );
}

function formatarCelula(valor: JsonValue | undefined): string {
  if (valor === undefined || valor === null || valor === '') return '';
  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
    return formatPrimitiveValue(valor);
  }
  return JSON.stringify(valor);
}

/** Mostra a grade exatamente como foi lida (por posição, sem assumir cabeçalho) — útil tanto para tabela simples quanto para planilha em formato matriz. */
function GradePreview({ grade }: { grade: PlanilhaGrade }) {
  const linhas = grade.slice(0, MAX_LINHAS_PREVIEW);
  const maxColunasReais = grade.reduce((max, linha) => Math.max(max, linha.length), 0);
  const totalColunas = Math.min(maxColunasReais, MAX_COLUNAS_PREVIEW);

  return (
    <div className="mt-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <tbody className="divide-y divide-gray-100 bg-white">
            {linhas.map((linha, indiceLinha) => (
              <tr key={indiceLinha} className={indiceLinha === 0 ? 'bg-gray-50 font-semibold' : undefined}>
                {Array.from({ length: totalColunas }).map((_, indiceColuna) => (
                  <td key={indiceColuna} className="whitespace-nowrap px-2 py-1 text-gray-700">
                    {formatarCelula(linha[indiceColuna])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(grade.length > MAX_LINHAS_PREVIEW || maxColunasReais > MAX_COLUNAS_PREVIEW) && (
        <p className="mt-2 text-xs text-gray-400">
          Mostrando {Math.min(grade.length, MAX_LINHAS_PREVIEW)} de {grade.length} linhas e {totalColunas} de{' '}
          {maxColunasReais} colunas.
        </p>
      )}
    </div>
  );
}
