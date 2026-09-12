import type { Empresa, JsonObject, SearchType } from '../types';
import logoIcone from '../assets/logo-gl-icon.png';
import logoLockup from '../assets/logo-gl-lockup.png';

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
  nome: 'Grupo Líder',
  razaoSocial: 'Líder BHZ Comércio e Serviços LTDA',
  cnpj: '55.716.529/0001-06',
  endereco: 'Rua José Pedro, 249, Sala 02, Parque Antônio Amabile — CEP 32400-309',
  telefone: '(31) 3050-2000',
  email: 'grupoliderbhz@gmail.com',
  logoUrl: logoIcone,
  logoLockupUrl: logoLockup,
};

export const MOCK_REGISTROS: MockRegistro[] = [
  {
    id: 'reg-001',
    buscaValores: {
      nome: 'em alfeu rodrigues',
      codigo_escola: 'esc-001',
      pedido: '12',
      codigo_entrega: 'ent-2026-012',
    },
    // Réplica do recibo real fornecido como modelo (mesma escola, itens e número).
    dados: {
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
      codigoEntrega: 'ENT-2026-012',
      numeroPedido: '12',
      dataEntrega: '2026-07-02',
      status: 'entregue',
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
  },
  {
    id: 'reg-002',
    buscaValores: {
      nome: 'em maria souza',
      codigo_escola: 'esc-002',
      pedido: '13',
      codigo_entrega: 'ent-2026-013',
    },
    dados: {
      codigoEscola: 'ESC-002',
      nome: 'E.M. Maria Souza',
      cnpj: '',
      endereco: {
        rua: 'Rua Principal, S/N',
        numero: '',
        bairro: 'Centro',
        cidade: 'Esmeraldas',
        uf: 'MG',
      },
      horarioFuncionamento: '07h às 13h',
      codigoEntrega: 'ENT-2026-013',
      numeroPedido: '13',
      dataEntrega: '2026-07-02',
      status: 'entregue',
      itens: [
        { produto: 'Feijão Carioca', unidade: 'KG', quantidade: 20 },
        { produto: 'Arroz Branco', unidade: 'KG', quantidade: 30 },
        { produto: 'Ovos Brancos', unidade: 'DZ', quantidade: 6 },
      ],
      observacoes: null,
      responsavelRecebimento: null,
    },
  },
  {
    id: 'reg-003',
    buscaValores: {
      nome: 'escola municipal central',
      codigo_escola: 'emc-777',
      pedido: '14',
    },
    // Estrutura deliberadamente diferente das duas anteriores: nomes de campo,
    // aninhamento e formato dos itens não seguem o mesmo "schema". Serve para
    // comprovar que a renderização é orientada pelos dados, não por campos fixos.
    dados: {
      identificacao: {
        unidadeEscolar: 'Escola Municipal Central',
        codigo: 'EMC-777',
      },
      entregaInfo: {
        numeroPedido: '14',
        dataPrevista: '2026-07-03',
        dataRealizada: '2026-07-03T08:30:00Z',
        statusEntrega: 'parcial',
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
          descricaoProduto: 'Frutas da Estação (sortidas)',
          tiposIncluidos: ['Maçã', 'Banana', 'Laranja'],
          quantidadeTotal: 45,
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
