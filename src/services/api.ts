import { ApiError, type JsonObject, type JsonValue, type ReciboPreparado, type SearchType } from '../types';
import { EMPRESA } from './mockData';
import { listarRecibosPreparados } from './recibosStore';

export { EMPRESA };

export interface ResultadoConsulta {
  id: string;
  nomeEscola: string;
  identificador: string;
  dataEntrega: string;
  status: string;
  dados: JsonObject;
}

interface RegistroConsulta {
  id: string;
  buscaValores: Partial<Record<SearchType, string>>;
  dados: JsonObject;
}

/** Converte um recibo preparado (Supabase) no formato usado pela busca — mesma entrega, indexada pelos campos por onde ela pode ser encontrada. */
function reciboParaRegistro(recibo: ReciboPreparado): RegistroConsulta {
  const { escola } = recibo.entrega;
  return {
    id: recibo.id,
    buscaValores: {
      nome: escola.nome || undefined,
      codigo_escola: escola.codigoEscola || undefined,
      cnpj: escola.cnpj || undefined,
      pedido: recibo.entrega.numeroPedido || undefined,
      codigo_entrega: recibo.entrega.codigoEntrega || undefined,
    },
    dados: recibo.entrega as unknown as JsonObject,
  };
}

/**
 * Consulta e Dashboard buscam entre os recibos realmente preparados
 * (Supabase) — a mesma fonte de verdade da tela "Recibos Preparados", não
 * mais uma cópia em memória à parte.
 */
async function baseDeRegistros(): Promise<RegistroConsulta[]> {
  const recibos = await listarRecibosPreparados();
  return recibos.map(reciboParaRegistro);
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

/** Consulta uma entrega pelo tipo de identificador informado, entre os recibos realmente preparados. */
export async function consultarEntrega(tipo: SearchType, valorDigitado: string): Promise<ResultadoConsulta> {
  const registros = await baseDeRegistros();

  const registro = registros.find((r) => {
    const buscaValor = r.buscaValores[tipo];
    return !!buscaValor && corresponde(tipo, buscaValor, valorDigitado);
  });

  if (!registro) {
    throw new ApiError('not_found', 'Não encontramos nenhuma entrega para o identificador informado.');
  }

  return extrairResumo(registro.id, registro.dados);
}

export async function listarTodasEntregas(): Promise<ResultadoConsulta[]> {
  const registros = await baseDeRegistros();
  return registros.map((r) => extrairResumo(r.id, r.dados));
}

export async function obterResumoDashboard(): Promise<{ totalEntregas: number; totalEscolas: number }> {
  const registros = await baseDeRegistros();
  const escolasUnicas = new Set(
    registros.map((r) => r.buscaValores.codigo_escola ?? r.buscaValores.cnpj ?? r.buscaValores.nome ?? r.id),
  );
  return { totalEntregas: registros.length, totalEscolas: escolasUnicas.size };
}
