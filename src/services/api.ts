import { ApiError, type Entrega, type JsonObject, type JsonValue, type SearchType } from '../types';
import { EMPRESA, MOCK_REGISTROS, type MockRegistro } from './mockData';

export { EMPRESA };

export interface ResultadoConsulta {
  id: string;
  nomeEscola: string;
  identificador: string;
  dataEntrega: string;
  status: string;
  dados: JsonObject;
}

/**
 * Entregas importadas via planilha ficam disponíveis em memória para consulta
 * na mesma sessão. Quando a fonte de dados real (API/banco) existir, esta
 * função — e o array abaixo — são o único ponto que precisa mudar; as telas
 * continuam chamando consultarEntrega/listarTodasEntregas normalmente.
 */
let entregasImportadas: MockRegistro[] = [];

export function registrarEntregasImportadas(entregas: Entrega[]): void {
  entregasImportadas = entregas.map((entrega, index) => ({
    id: `importado-${index}-${entrega.codigoEntrega ?? entrega.numeroPedido ?? index}`,
    buscaValores: {
      nome: entrega.escola?.nome,
      codigo_escola: entrega.escola?.codigoEscola,
      cnpj: entrega.escola?.cnpj,
      pedido: entrega.numeroPedido,
      codigo_entrega: entrega.codigoEntrega,
    },
    dados: entrega as unknown as JsonObject,
  }));
}

function baseDeRegistros(): MockRegistro[] {
  return [...MOCK_REGISTROS, ...entregasImportadas];
}

const ATRASO_SIMULADO_MS = 600;

function delay<T>(value: T, ms = ATRASO_SIMULADO_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function normalizar(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

function apenasDigitos(value: string): string {
  return value.replace(/\D/g, '');
}

function getPath(source: unknown, path: string[]): unknown {
  return path.reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

function primeiroValor(dados: JsonObject, caminhos: string[][]): JsonValue | undefined {
  for (const caminho of caminhos) {
    const valor = getPath(dados, caminho);
    if (valor !== undefined && valor !== null && valor !== '') {
      return valor as JsonValue;
    }
  }
  return undefined;
}

/**
 * Extrai os campos de cabeçalho (nome, identificador, data, status) tentando
 * vários caminhos possíveis dentro do JSON. Assim o resumo funciona mesmo
 * quando a estrutura da entrega é diferente da usual — nada aqui assume um
 * schema fixo.
 */
function extrairResumo(id: string, dados: JsonObject): ResultadoConsulta {
  const nome = primeiroValor(dados, [
    ['nome'],
    ['escola', 'nome'],
    ['identificacao', 'unidadeEscolar'],
    ['identificacao', 'nome'],
  ]);
  const identificador = primeiroValor(dados, [
    ['codigoEntrega'],
    ['numeroPedido'],
    ['identificacao', 'codigo'],
    ['entregaInfo', 'numeroPedido'],
  ]);
  const data = primeiroValor(dados, [
    ['dataEntrega'],
    ['entregaInfo', 'dataRealizada'],
    ['entregaInfo', 'dataPrevista'],
  ]);
  const status = primeiroValor(dados, [['status'], ['entregaInfo', 'statusEntrega']]);

  return {
    id,
    nomeEscola: typeof nome === 'string' ? nome : 'Não informado',
    identificador: identificador !== undefined ? String(identificador) : '—',
    dataEntrega: typeof data === 'string' ? data : '',
    status: typeof status === 'string' ? status : 'não informado',
    dados,
  };
}

function corresponde(tipo: SearchType, buscaValor: string, valorDigitado: string): boolean {
  if (tipo === 'cnpj') {
    return apenasDigitos(buscaValor) === apenasDigitos(valorDigitado);
  }
  const alvo = normalizar(buscaValor);
  const consulta = normalizar(valorDigitado);
  return alvo === consulta || alvo.includes(consulta);
}

/**
 * Consulta uma entrega pelo tipo de identificador informado.
 * Hoje busca em dados mockados/importados; no futuro basta trocar o corpo
 * desta função por uma chamada HTTP (fetch/axios) — as telas não mudam.
 */
export async function consultarEntrega(tipo: SearchType, valorDigitado: string): Promise<ResultadoConsulta> {
  const chave = normalizar(valorDigitado);

  // Identificadores especiais para demonstrar/testar os estados de erro da tela.
  if (chave === 'erro-rede') {
    await delay(null, 500);
    throw new ApiError('network', 'Não foi possível consultar os dados. Verifique sua conexão e tente novamente.');
  }
  if (chave === 'erro-inesperado') {
    await delay(null, 500);
    throw new ApiError('unknown', 'Ocorreu um erro inesperado. Tente novamente.');
  }

  await delay(null);

  const registro = baseDeRegistros().find((r) => {
    const buscaValor = r.buscaValores[tipo];
    return !!buscaValor && corresponde(tipo, buscaValor, valorDigitado);
  });

  if (!registro) {
    throw new ApiError('not_found', 'Não encontramos nenhuma entrega para o identificador informado.');
  }

  return extrairResumo(registro.id, registro.dados);
}

export async function listarTodasEntregas(): Promise<ResultadoConsulta[]> {
  await delay(null, 300);
  return baseDeRegistros().map((r) => extrairResumo(r.id, r.dados));
}

export async function obterResumoDashboard(): Promise<{ totalEntregas: number; totalEscolas: number }> {
  await delay(null, 250);
  const registros = baseDeRegistros();
  const escolasUnicas = new Set(
    registros.map((r) => r.buscaValores.codigo_escola ?? r.buscaValores.cnpj ?? r.buscaValores.nome ?? r.id),
  );
  return { totalEntregas: registros.length, totalEscolas: escolasUnicas.size };
}
