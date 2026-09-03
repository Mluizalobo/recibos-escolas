import type {
  Entrega,
  Escola,
  ItemEntrega,
  PlanilhaLinha,
  ProblemaRecibo,
  ReciboPreparado,
  ResultadoImportacao,
  StatusPreparoRecibo,
} from '../types';
import { gerarHash } from '../utils/hash';

/**
 * Mapa de cabeçalhos conhecidos -> campo canônico. As chaves já estão
 * normalizadas (minúsculas, sem acento, sem espaço/underscore/hífen).
 * Cabeçalhos que não aparecem aqui não são descartados: continuam na linha
 * com o nome original, então nenhuma informação da planilha é perdida — e a
 * interface não depende dos nomes exatos das colunas do Excel.
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

interface GrupoEmConstrucao {
  entrega: Entrega;
  problemas: ProblemaRecibo[];
}

/**
 * Transforma as linhas cruas da planilha em recibos preparados por
 * escola/entrega: mapeia cabeçalhos, agrupa linhas da mesma entrega, valida
 * cada registro e já classifica cada recibo com um status (pronto / pendente
 * de revisão / com erro bloqueante). O usuário revisa o resultado — não
 * digita nada disso manualmente.
 */
export function normalizeSpreadsheetData(linhas: PlanilhaLinha[]): ResultadoImportacao {
  const hashConteudo = gerarHash(JSON.stringify(linhas));
  const avisos: string[] = [];

  if (linhas.length === 0) {
    return {
      recibos: [],
      totalLinhas: 0,
      totalEscolas: 0,
      totalRecibosPreparados: 0,
      totalComErro: 0,
      totalDuplicados: 0,
      avisos: ['A planilha está vazia ou não possui dados.'],
      hashConteudo,
    };
  }

  const grupos = new Map<string, GrupoEmConstrucao>();
  const assinaturasVistas = new Set<string>();
  let totalDuplicados = 0;

  linhas.forEach((linhaOriginal, index) => {
    const numeroLinha = index + 2; // +1 cabeçalho, +1 índice baseado em 1
    const linha = mapearLinha(linhaOriginal);

    const nomeEscola = comoTexto(linha.nomeEscola);
    if (!nomeEscola) {
      avisos.push(`Linha ${numeroLinha}: nome da escola ausente — linha ignorada.`);
      return;
    }

    const assinatura = JSON.stringify(linha);
    const linhaDuplicada = assinaturasVistas.has(assinatura);
    if (linhaDuplicada) {
      totalDuplicados += 1;
    } else {
      assinaturasVistas.add(assinatura);
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
        entrega: {
          codigoEntrega: comoTexto(linha.codigoEntrega) ?? chave,
          numeroPedido: comoTexto(linha.numeroPedido) ?? '—',
          dataEntrega: comoTexto(linha.dataEntrega) ?? '',
          status: (comoTexto(linha.status) as Entrega['status']) ?? 'pendente',
          escola,
          itens: [],
          observacoes: [],
          valorTotal: 0,
        },
        problemas: [],
      };
      grupos.set(chave, grupo);

      if (!escola.cnpj) {
        grupo.problemas.push({
          campo: 'cnpj',
          mensagem: `CNPJ não informado para "${nomeEscola}".`,
          severidade: 'aviso',
        });
      }
      if (!escola.endereco.rua && !escola.endereco.cidade) {
        grupo.problemas.push({
          campo: 'endereco',
          mensagem: `Endereço não informado para "${nomeEscola}".`,
          severidade: 'aviso',
        });
      }
    }

    if (linhaDuplicada) {
      grupo.problemas.push({
        linha: numeroLinha,
        mensagem: `Linha ${numeroLinha} é idêntica a outra já processada nesta planilha (possível duplicidade).`,
        severidade: 'aviso',
      });
    }

    const produto = comoTexto(linha.produto);
    const quantidade = comoNumero(linha.quantidade);
    if (produto && quantidade !== undefined) {
      const item: ItemEntrega = {
        produto,
        quantidade,
        valor: comoNumero(linha.valor) ?? null,
      };
      grupo.entrega.itens.push(item);
      if (item.valor) {
        grupo.entrega.valorTotal = (grupo.entrega.valorTotal ?? 0) + item.valor * item.quantidade;
      }
    } else {
      grupo.problemas.push({
        linha: numeroLinha,
        campo: 'produto/quantidade',
        mensagem: `Linha ${numeroLinha}: produto ou quantidade ausente — item não incluído no recibo.`,
        severidade: 'aviso',
      });
    }

    const observacao = comoTexto(linha.observacao);
    if (observacao) {
      grupo.entrega.observacoes = [...(grupo.entrega.observacoes ?? []), observacao];
    }
  });

  const recibos: ReciboPreparado[] = Array.from(grupos.entries()).map(([chave, grupo]) => {
    if (grupo.entrega.itens.length === 0) {
      grupo.problemas.push({
        mensagem: `Nenhum item válido encontrado para "${grupo.entrega.escola.nome}".`,
        severidade: 'erro',
      });
    }

    const temErro = grupo.problemas.some((p) => p.severidade === 'erro');
    const status: StatusPreparoRecibo = temErro
      ? 'com_erro'
      : grupo.problemas.length > 0
        ? 'pendente'
        : 'pronto';

    return {
      id: `importado-${chave}`,
      entrega: grupo.entrega,
      status,
      problemas: grupo.problemas,
      origem: 'importacao',
    };
  });

  return {
    recibos,
    totalLinhas: linhas.length,
    totalEscolas: recibos.length,
    totalRecibosPreparados: recibos.length,
    totalComErro: recibos.filter((r) => r.status === 'com_erro').length,
    totalDuplicados,
    avisos,
    hashConteudo,
  };
}
