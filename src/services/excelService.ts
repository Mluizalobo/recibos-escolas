import * as XLSX from 'xlsx';
import type { Entrega, Escola, ItemEntrega, PlanilhaLinha, ResultadoImportacao } from '../types';

/**
 * Mapa de cabeçalhos conhecidos -> campo canônico. As chaves já estão
 * normalizadas (minúsculas, sem acento, sem espaço/underscore/hífen).
 * Cabeçalhos que não aparecem aqui não são descartados: continuam na linha
 * com o nome original, então nenhuma informação da planilha é perdida.
 */
const MAPA_COLUNAS: Record<string, string> = {
  escola: 'nomeEscola',
  nomeescola: 'nomeEscola',
  nome: 'nomeEscola',
  codescola: 'codigoEscola',
  codigoescola: 'codigoEscola',
  cnpj: 'cnpj',
  cnpjescola: 'cnpj',
  endereco: 'rua',
  logradouro: 'rua',
  rua: 'rua',
  numero: 'numero',
  bairro: 'bairro',
  cidade: 'cidade',
  municipio: 'cidade',
  uf: 'uf',
  estado: 'uf',
  cep: 'cep',
  pedido: 'numeroPedido',
  numeropedido: 'numeroPedido',
  nropedido: 'numeroPedido',
  entrega: 'codigoEntrega',
  codentrega: 'codigoEntrega',
  codigoentrega: 'codigoEntrega',
  data: 'dataEntrega',
  dataentrega: 'dataEntrega',
  status: 'status',
  situacao: 'status',
  produto: 'produto',
  item: 'produto',
  descricao: 'produto',
  descricaoproduto: 'produto',
  quantidade: 'quantidade',
  qtd: 'quantidade',
  qtde: 'quantidade',
  valor: 'valor',
  valorunitario: 'valor',
  preco: 'valor',
  observacao: 'observacao',
  observacoes: 'observacao',
  obs: 'observacao',
  responsavel: 'responsavel',
  responsavelrecebimento: 'responsavel',
};

function normalizarCabecalho(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

/** Lê o arquivo e devolve as linhas em formato JSON, com as chaves originais da planilha. */
export async function lerArquivoExcel(file: File): Promise<PlanilhaLinha[]> {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: 'array' });
  } catch {
    throw new Error('Não foi possível ler o arquivo. Verifique se é uma planilha válida (.xlsx ou .xls).');
  }

  const nomeAba = workbook.SheetNames[0];
  if (!nomeAba) {
    throw new Error('A planilha não possui nenhuma aba com dados.');
  }

  const planilha = workbook.Sheets[nomeAba];
  const linhas = XLSX.utils.sheet_to_json<PlanilhaLinha>(planilha, { defval: null, raw: true });
  return linhas;
}

/** Converte as chaves de uma linha para os nomes canônicos conhecidos, preservando as demais. */
function mapearLinha(linha: PlanilhaLinha): PlanilhaLinha {
  const mapeada: PlanilhaLinha = {};
  for (const [chaveOriginal, valor] of Object.entries(linha)) {
    const chaveNormalizada = normalizarCabecalho(chaveOriginal);
    const chaveCanonica = MAPA_COLUNAS[chaveNormalizada] ?? chaveOriginal;
    mapeada[chaveCanonica] = valor;
  }
  return mapeada;
}

function comoTexto(valor: unknown): string | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined;
  return String(valor).trim();
}

function comoNumero(valor: unknown): number | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined;
  const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  return Number.isNaN(numero) ? undefined : numero;
}

/** Determina qual entrega uma linha pertence, para agrupar linhas da mesma entrega em um único recibo. */
function identificadorDaLinha(linha: PlanilhaLinha): string {
  const codigoEntrega = comoTexto(linha.codigoEntrega);
  if (codigoEntrega) return `entrega:${codigoEntrega}`;

  const numeroPedido = comoTexto(linha.numeroPedido);
  if (numeroPedido) return `pedido:${numeroPedido}`;

  const cnpj = comoTexto(linha.cnpj);
  const data = comoTexto(linha.dataEntrega);
  if (cnpj) return `cnpj-data:${cnpj}-${data ?? ''}`;

  const nomeEscola = comoTexto(linha.nomeEscola);
  if (nomeEscola) return `nome:${nomeEscola}`;

  return 'sem-identificador';
}

/**
 * Agrupa linhas da planilha em entregas. Uma escola pode ter várias linhas
 * (uma por produto); linhas com o mesmo identificador de entrega viram um
 * único recibo, com os itens somados em uma lista.
 */
export function normalizarEAgrupar(linhas: PlanilhaLinha[]): ResultadoImportacao {
  const erros: string[] = [];
  const grupos = new Map<string, Entrega>();
  let totalItensValidos = 0;

  linhas.forEach((linhaOriginal, index) => {
    const numeroLinha = index + 2; // +1 cabeçalho, +1 índice baseado em 1
    const linha = mapearLinha(linhaOriginal);

    const nomeEscola = comoTexto(linha.nomeEscola);
    if (!nomeEscola) {
      erros.push(`Linha ${numeroLinha}: nome da escola ausente — linha ignorada.`);
      return;
    }

    const chave = identificadorDaLinha(linha);

    const escola: Escola = {
      codigoEscola: comoTexto(linha.codigoEscola) ?? '',
      nome: nomeEscola,
      cnpj: comoTexto(linha.cnpj) ?? '',
      endereco: {
        rua: comoTexto(linha.rua) ?? '',
        numero: comoTexto(linha.numero) ?? '',
        bairro: comoTexto(linha.bairro) ?? null,
        cidade: comoTexto(linha.cidade) ?? '',
        uf: comoTexto(linha.uf) ?? null,
        cep: comoTexto(linha.cep) ?? null,
      },
    };

    let grupo = grupos.get(chave);
    if (!grupo) {
      grupo = {
        codigoEntrega: comoTexto(linha.codigoEntrega) ?? chave,
        numeroPedido: comoTexto(linha.numeroPedido) ?? '—',
        dataEntrega: comoTexto(linha.dataEntrega) ?? '',
        status: (comoTexto(linha.status) as Entrega['status']) ?? 'pendente',
        escola,
        itens: [],
        observacoes: [],
        valorTotal: 0,
      };
      grupos.set(chave, grupo);
    }

    const produto = comoTexto(linha.produto);
    const quantidade = comoNumero(linha.quantidade);
    if (produto && quantidade !== undefined) {
      const item: ItemEntrega = {
        produto,
        quantidade,
        valor: comoNumero(linha.valor) ?? null,
      };
      grupo.itens.push(item);
      totalItensValidos += 1;
      if (item.valor) {
        grupo.valorTotal = (grupo.valorTotal ?? 0) + item.valor * item.quantidade;
      }
    } else {
      erros.push(`Linha ${numeroLinha}: produto ou quantidade ausente — item não incluído no recibo.`);
    }

    const observacao = comoTexto(linha.observacao);
    if (observacao) {
      grupo.observacoes = [...(grupo.observacoes ?? []), observacao];
    }
  });

  const entregas = Array.from(grupos.values()).filter((entrega) => entrega.itens.length > 0);

  if (linhas.length === 0) {
    erros.push('A planilha está vazia ou não possui dados.');
  } else if (entregas.length === 0 && totalItensValidos === 0) {
    erros.push('Nenhuma linha continha os dados mínimos (escola, produto e quantidade).');
  }

  return {
    entregas,
    totalLinhas: linhas.length,
    totalEntregas: entregas.length,
    erros,
  };
}

export async function importarPlanilha(file: File): Promise<ResultadoImportacao> {
  const linhas = await lerArquivoExcel(file);
  return normalizarEAgrupar(linhas);
}
