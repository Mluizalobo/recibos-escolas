import type { Empresa, JsonObject, SearchType } from '../types';
import logoGp from '../assets/logo-gp.png';

/**
 * Cada registro mockado guarda os valores pelos quais pode ser encontrado
 * (buscaValores) separados dos dados de fato (dados). Isso simula o que uma
 * API real faria: o índice de busca não precisa ter o mesmo formato do
 * documento retornado, e cada "entrega" pode ter uma estrutura de JSON
 * completamente diferente das demais — é isso que o DynamicDataRenderer
 * precisa suportar.
 */
export interface MockRegistro {
  id: string;
  buscaValores: Partial<Record<SearchType, string>>;
  dados: JsonObject;
}

export const EMPRESA: Empresa = {
  nome: 'GP Distribuidora',
  // CNPJ e endereço ainda são placeholder — trocar pelos dados reais da empresa quando disponíveis.
  cnpj: '00.111.222/0001-33',
  endereco: 'Rod. BR-040, Km 12 — Distrito Industrial, Congonhas/MG',
  logoUrl: logoGp,
};

export const MOCK_REGISTROS: MockRegistro[] = [
  {
    id: 'reg-001',
    buscaValores: {
      nome: 'em josé da silva',
      codigo_escola: 'esc-001',
      cnpj: '12345678000190',
      pedido: '12345',
      codigo_entrega: 'ent-2026-001',
    },
    dados: {
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
      codigoEntrega: 'ENT-2026-001',
      numeroPedido: '12345',
      dataEntrega: '2026-09-02',
      status: 'entregue',
      itens: [
        { produto: 'Caderno Universitário', quantidade: 50, valor: 10 },
        { produto: 'Caneta Esferográfica', quantidade: 100, valor: 2 },
        { produto: 'Lápis de Cor (caixa)', quantidade: 30, valor: 15.5 },
        { produto: 'Borracha', quantidade: 40, valor: 1.2 },
      ],
      observacoes: [
        'Entrega realizada no período da manhã',
        'Conferido pela diretora no ato do recebimento',
      ],
      valorTotal: 1163,
      responsavelRecebimento: 'Maria Aparecida Santos',
    },
  },
  {
    id: 'reg-002',
    buscaValores: {
      nome: 'em maria souza',
      codigo_escola: 'esc-002',
      cnpj: '98765432000110',
      pedido: '12346',
      codigo_entrega: 'ent-2026-002',
    },
    dados: {
      codigoEscola: 'ESC-002',
      nome: 'EM Maria Souza',
      cnpj: '98.765.432/0001-10',
      endereco: {
        rua: 'Avenida Brasil',
        numero: 1000,
        cidade: 'Congonhas',
        uf: 'MG',
      },
      codigoEntrega: 'ENT-2026-002',
      numeroPedido: '12346',
      dataEntrega: '2026-09-02',
      status: 'entregue',
      itens: [{ produto: 'Resma de Papel A4', quantidade: 20, valor: 25 }],
      observacoes: null,
      valorTotal: 500,
      responsavelRecebimento: 'João Batista Oliveira',
    },
  },
  {
    id: 'reg-003',
    buscaValores: {
      nome: 'escola municipal central',
      codigo_escola: 'emc-777',
      cnpj: '11222333000144',
      pedido: '9987',
    },
    // Estrutura deliberadamente diferente das duas anteriores: nomes de campo,
    // aninhamento e formato dos itens não seguem o mesmo "schema". Serve para
    // comprovar que a renderização é orientada pelos dados, não por campos fixos.
    dados: {
      identificacao: {
        unidadeEscolar: 'Escola Municipal Central',
        codigo: 'EMC-777',
        cnpjUnidade: '11.222.333/0001-44',
      },
      entregaInfo: {
        numeroPedido: '9987',
        dataPrevista: '2026-09-03',
        dataRealizada: '2026-09-03T14:30:00Z',
        statusEntrega: 'parcial',
        temperaturaControlada: true,
        exigeAssinatura: true,
      },
      itensRecebidos: [
        {
          produto: 'Kit Merenda Escolar',
          quantidadeCaixas: 12,
          lote: 'L2026-08',
          validade: '2026-12-01',
        },
        {
          descricaoProduto: 'Uniforme Escolar',
          tamanhosDisponiveis: ['P', 'M', 'G'],
          quantidadeTotal: 60,
        },
      ],
      transporte: {
        motorista: 'Carlos Eduardo',
        veiculo: { placa: 'ABC1D23', modelo: 'Sprinter' },
      },
      observacaoGeral: 'Entrega parcial — restam 2 caixas para o próximo lote.',
    },
  },
];
