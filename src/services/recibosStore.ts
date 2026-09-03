import type { Entrega, ProblemaRecibo, ReciboPreparado, StatusPreparoRecibo } from '../types';

const CHAVE_LOCALSTORAGE = 'recibos-escolas:recibos-importados';

/**
 * Demonstração com o formato canônico de Entrega (o mesmo que normalizeSpreadsheetData
 * produz a partir da planilha). Propositalmente separado dos mocks genéricos de
 * mockData.ts, que existem para provar o DynamicDataRenderer com JSONs heterogêneos —
 * aqui o recibo já segue a estrutura oficial usada pelo ReciboTemplate.
 */
const RECIBOS_DEMONSTRACAO: Entrega[] = [
  {
    codigoEntrega: 'ENT-2026-001',
    numeroPedido: '12345',
    dataEntrega: '2026-09-02',
    status: 'entregue',
    escola: {
      codigoEscola: 'ESC-001',
      nome: 'EM José da Silva',
      cnpj: '12.345.678/0001-90',
      endereco: {
        rua: 'Rua das Flores',
        numero: 245,
        bairro: 'Centro',
        cidade: 'Congonhas',
        uf: 'MG',
        cep: '36415-000',
      },
    },
    itens: [
      { produto: 'Caderno Universitário', quantidade: 50, valor: 10 },
      { produto: 'Caneta Esferográfica', quantidade: 100, valor: 2 },
      { produto: 'Lápis de Cor (caixa)', quantidade: 30, valor: 15.5 },
      { produto: 'Borracha', quantidade: 40, valor: 1.2 },
    ],
    observacoes: ['Entrega realizada no período da manhã', 'Conferido pela diretora no ato do recebimento'],
    valorTotal: 1163,
    responsavelRecebimento: 'Maria Aparecida Santos',
  },
  {
    codigoEntrega: 'ENT-2026-002',
    numeroPedido: '12346',
    dataEntrega: '2026-09-02',
    status: 'entregue',
    escola: {
      codigoEscola: 'ESC-002',
      nome: 'EM Maria Souza',
      cnpj: '98.765.432/0001-10',
      endereco: { rua: 'Avenida Brasil', numero: 1000, cidade: 'Congonhas', uf: 'MG' },
    },
    itens: [{ produto: 'Resma de Papel A4', quantidade: 20, valor: 25 }],
    observacoes: null,
    valorTotal: 500,
    responsavelRecebimento: 'João Batista Oliveira',
  },
];

/** As entregas de demonstração aparecem sempre como recibos "prontos", ao lado dos importados de verdade. */
function recibosMock(): ReciboPreparado[] {
  return RECIBOS_DEMONSTRACAO.map((entrega, index) => ({
    id: `mock-${index}-${entrega.codigoEntrega}`,
    entrega,
    status: 'pronto' as StatusPreparoRecibo,
    problemas: [],
    origem: 'mock' as const,
  }));
}

function lerImportados(): ReciboPreparado[] {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCALSTORAGE);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

let recibosImportados: ReciboPreparado[] = lerImportados();

function salvar(): void {
  try {
    localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(recibosImportados));
  } catch {
    // localStorage indisponível — os recibos importados só não sobrevivem a um recarregamento da página.
  }
}

/** Substitui os recibos vindos de importação pelos da planilha processada mais recentemente. */
export function definirRecibosImportados(recibos: ReciboPreparado[]): void {
  recibosImportados = recibos;
  salvar();
}

/** Lista combinada: recibos de demonstração + os da última planilha importada. */
export function listarRecibosPreparados(): ReciboPreparado[] {
  return [...recibosMock(), ...recibosImportados];
}

export function obterReciboPorId(id: string): ReciboPreparado | undefined {
  return listarRecibosPreparados().find((r) => r.id === id);
}

export function atualizarStatusRecibo(id: string, status: StatusPreparoRecibo): void {
  const indice = recibosImportados.findIndex((r) => r.id === id);
  if (indice === -1) return; // recibos de demonstração não têm status persistente alterável
  recibosImportados[indice] = { ...recibosImportados[indice], status };
  salvar();
}

export interface DadosCorrecaoRecibo {
  nome: string;
  codigoEscola: string;
  cnpj: string;
  numeroPedido: string;
  rua: string;
  cidade: string;
  uf: string;
}

/**
 * Aplica correções manuais de cabeçalho (nome/código/CNPJ/endereço/pedido) a
 * um recibo com pendências e reavalia o status. Problemas ligados a itens
 * ausentes não são "curáveis" por aqui — isso exige corrigir a planilha de
 * origem — então continuam bloqueando o recibo mesmo após a correção.
 */
export function corrigirRecibo(id: string, dados: DadosCorrecaoRecibo): void {
  const indice = recibosImportados.findIndex((r) => r.id === id);
  if (indice === -1) return;
  const atual = recibosImportados[indice];

  const entregaCorrigida: Entrega = {
    ...atual.entrega,
    numeroPedido: dados.numeroPedido || atual.entrega.numeroPedido,
    escola: {
      ...atual.entrega.escola,
      nome: dados.nome,
      codigoEscola: dados.codigoEscola,
      cnpj: dados.cnpj,
      endereco: { ...atual.entrega.escola.endereco, rua: dados.rua, cidade: dados.cidade, uf: dados.uf },
    },
  };

  const problemasRestantes: ProblemaRecibo[] = atual.problemas.filter((problema) => {
    if (problema.campo === 'cnpj') return !entregaCorrigida.escola.cnpj;
    if (problema.campo === 'endereco') {
      return !entregaCorrigida.escola.endereco.rua && !entregaCorrigida.escola.endereco.cidade;
    }
    return true;
  });

  const temErro = problemasRestantes.some((p) => p.severidade === 'erro');
  const status: StatusPreparoRecibo = temErro ? 'com_erro' : problemasRestantes.length > 0 ? 'pendente' : 'pronto';

  recibosImportados[indice] = { ...atual, entrega: entregaCorrigida, problemas: problemasRestantes, status };
  salvar();
}
