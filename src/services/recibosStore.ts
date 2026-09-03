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
    codigoEntrega: 'ENT-2026-012',
    numeroPedido: '12',
    dataEntrega: '2026-07-02',
    status: 'entregue',
    escola: {
      codigoEscola: 'ESC-001',
      nome: 'E.M. Alfeu Rodrigues',
      cnpj: '',
      endereco: {
        rua: 'Rodovia dos Bandeirantes LMG 808, Km 17,5 — S/N',
        numero: '',
        bairro: 'Chácaras das Esmeraldas',
        cidade: 'Esmeraldas',
        uf: 'MG',
      },
      horarioFuncionamento: '07h às 12h',
    },
    itens: [
      { produto: 'Alho Descascado', unidade: 'KG', quantidade: 1 },
      { produto: 'Cebola', unidade: 'KG', quantidade: 4 },
      { produto: 'Cenoura', unidade: 'KG', quantidade: 4 },
      { produto: 'Batata', unidade: 'KG', quantidade: 4 },
      { produto: 'Tomate', unidade: 'KG', quantidade: 4 },
      { produto: 'Batata Doce', unidade: 'KG', quantidade: 2 },
      { produto: 'Repolho Verde', unidade: 'KG', quantidade: 3 },
      { produto: 'Ovos Vermelhos', unidade: 'DZ', quantidade: 4 },
      { produto: 'Maçã', unidade: 'KG', quantidade: 10 },
      { produto: 'Banana', unidade: 'KG', quantidade: 10 },
      { produto: 'Laranja', unidade: 'KG', quantidade: 6 },
    ],
    observacoes: null,
    responsavelRecebimento: null,
  },
  {
    codigoEntrega: 'ENT-2026-013',
    numeroPedido: '13',
    dataEntrega: '2026-07-02',
    status: 'entregue',
    escola: {
      codigoEscola: 'ESC-002',
      nome: 'E.M. Maria Souza',
      cnpj: '',
      endereco: { rua: 'Rua Principal, S/N', numero: '', bairro: 'Centro', cidade: 'Esmeraldas', uf: 'MG' },
      horarioFuncionamento: '07h às 13h',
    },
    itens: [
      { produto: 'Feijão Carioca', unidade: 'KG', quantidade: 20 },
      { produto: 'Arroz Branco', unidade: 'KG', quantidade: 30 },
      { produto: 'Ovos Brancos', unidade: 'DZ', quantidade: 6 },
    ],
    observacoes: null,
    responsavelRecebimento: null,
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

/** Remove um recibo importado da lista. Recibos de demonstração não são removíveis (voltariam no próximo recarregamento). */
export function removerRecibo(id: string): void {
  const antes = recibosImportados.length;
  recibosImportados = recibosImportados.filter((r) => r.id !== id);
  if (recibosImportados.length !== antes) salvar();
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
