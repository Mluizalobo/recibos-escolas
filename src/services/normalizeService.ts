import type {
  Entrega,
  Escola,
  EscolaCadastrada,
  ItemEntrega,
  JsonValue,
  PlanilhaGrade,
  PlanilhaLinha,
  ProblemaRecibo,
  ReciboPreparado,
  ResultadoImportacao,
  StatusPreparoRecibo,
} from '../types';
import { gerarHash } from '../utils/hash';
import { encontrarEscolaCadastrada } from './escolasStore';

function comoTexto(valor: unknown): string | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined;
  return String(valor).trim();
}

function comoNumero(valor: unknown): number | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined;
  const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  return Number.isNaN(numero) ? undefined : numero;
}

function limparEspacos(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim();
}

/**
 * Acrescenta uma observação visível no próprio recibo (impresso/PDF), sem
 * repetir a mesma mensagem. Usada sempre que falta um dado (horário,
 * endereço, item etc.) — a regra do sistema é nunca bloquear a geração do
 * recibo por dado ausente, e sim gerar com a ressalva anotada nele.
 */
function adicionarObservacao(entrega: Entrega, mensagem: string): void {
  const atuais = entrega.observacoes ?? [];
  if (!atuais.includes(mensagem)) {
    entrega.observacoes = [...atuais, mensagem];
  }
}

/**
 * Casa o nome da escola (por nome ou apelido) com o cadastro próprio da
 * empresa e completa o que a planilha não trouxe — endereço, código, CNPJ,
 * horário. Nunca sobrescreve um dado que a planilha já informou; só
 * preenche o que está vazio. Retorna true quando achou correspondência.
 */
function aplicarCadastro(escola: Escola, escolasCadastradas: EscolaCadastrada[]): boolean {
  const cadastro = encontrarEscolaCadastrada(escola.nome, escolasCadastradas, escola.endereco.cidade);
  if (!cadastro) return false;

  if (!escola.codigoEscola && cadastro.codigoEscola) escola.codigoEscola = cadastro.codigoEscola;
  if (!escola.cnpj && cadastro.cnpj) escola.cnpj = cadastro.cnpj;
  if (!escola.endereco.rua) escola.endereco = { ...cadastro.endereco };
  if (!escola.horarioFuncionamento && cadastro.horarioFuncionamento) {
    escola.horarioFuncionamento = cadastro.horarioFuncionamento;
  }
  return true;
}

// =====================================================================
// Formato "tabela": uma linha por item, com colunas como Escola/Produto/
// Quantidade — o formato mais simples possível de planilha.
// =====================================================================

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
  horario: 'horarioFuncionamento',
  horariofuncionamento: 'horarioFuncionamento',
  horariodefuncionamento: 'horarioFuncionamento',
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
  unid: 'unidade',
  unidade: 'unidade',
  un: 'unidade',
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

/** Primeira linha da grade vira o cabeçalho; as demais viram objetos {coluna: valor}. */
function gradeParaLinhas(grade: PlanilhaGrade): PlanilhaLinha[] {
  if (grade.length === 0) return [];
  const cabecalho = (grade[0] ?? []).map((celula, indice) => comoTexto(celula) ?? `coluna_${indice + 1}`);

  return grade.slice(1).map((linha) => {
    const objeto: PlanilhaLinha = {};
    cabecalho.forEach((chave, indice) => {
      objeto[chave] = (linha[indice] ?? null) as JsonValue;
    });
    return objeto;
  });
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
 * Planilha "tabela": mapeia cabeçalhos, agrupa linhas da mesma entrega,
 * valida cada registro e classifica cada recibo com um status.
 */
function normalizarTabela(
  linhas: PlanilhaLinha[],
  escolasCadastradas: EscolaCadastrada[],
  importacaoId: string,
): ResultadoImportacao {
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
      hashConteudo: '',
      municipio: null,
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
      horarioFuncionamento: comoTexto(linha.horarioFuncionamento) ?? null,
    };

    const encontradaNoCadastro = aplicarCadastro(escola, escolasCadastradas);

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

      if (!escola.endereco.rua && !escola.endereco.cidade) {
        grupo.problemas.push({
          campo: 'endereco',
          mensagem: `Endereço não informado para "${nomeEscola}".`,
          severidade: 'aviso',
        });
        adicionarObservacao(grupo.entrega, 'Endereço não informado nesta planilha.');
      }

      if (!escola.horarioFuncionamento) {
        grupo.problemas.push({
          campo: 'horarioFuncionamento',
          mensagem: `Horário de funcionamento não informado para "${nomeEscola}".`,
          severidade: 'aviso',
        });
        adicionarObservacao(grupo.entrega, 'Horário de funcionamento não informado nesta planilha.');
      }

      if (!encontradaNoCadastro) {
        grupo.problemas.push({
          campo: 'cadastro',
          mensagem: `"${nomeEscola}" não está no cadastro de escolas — cadastre em "Escolas Cadastradas" para preencher endereço/horário automaticamente nas próximas importações.`,
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
        unidade: comoTexto(linha.unidade) ?? null,
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
      adicionarObservacao(
        grupo.entrega,
        'Um ou mais itens da planilha não puderam ser identificados (produto ou quantidade ausente) — confira a planilha original.',
      );
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
        severidade: 'aviso',
      });
      adicionarObservacao(
        grupo.entrega,
        'Nenhum item válido encontrado nesta planilha para esta escola — confira antes de entregar.',
      );
    }

    // Dado ausente nunca bloqueia a geração do recibo: fica marcado como
    // "pendente" (com a observação impressa nele) para conferência, mas o
    // usuário sempre consegue gerar o PDF.
    const status: StatusPreparoRecibo = grupo.problemas.length > 0 ? 'pendente' : 'pronto';

    return {
      id: `${importacaoId}-${chave}`,
      entrega: grupo.entrega,
      status,
      problemas: grupo.problemas,
      origem: 'importacao',
      importacaoId,
    };
  });

  const cidades = new Set(
    recibos.map((r) => r.entrega.escola.endereco.cidade).filter((cidade): cidade is string => !!cidade),
  );
  const municipio = cidades.size === 1 ? [...cidades][0] : null;

  return {
    recibos,
    totalLinhas: linhas.length,
    totalEscolas: recibos.length,
    totalRecibosPreparados: recibos.length,
    totalComErro: recibos.filter((r) => r.status === 'com_erro').length,
    totalDuplicados,
    avisos,
    hashConteudo: '',
    municipio,
  };
}

// =====================================================================
// Formato "matriz": planilhas reais de pedido costumam trazer as escolas
// nas linhas e os produtos nas colunas, com um bloco de cabeçalho marcado
// por uma célula "ENTREGA DIA dd/mm/aaaa" — bem diferente de uma tabela
// simples. Detectar esse formato evita que a planilha real da empresa seja
// lida como se todas as colunas/linhas estivessem vazias.
// =====================================================================

const REGEX_ENTREGA_DIA = /entrega\s+dia/i;
const REGEX_DATA = /(\d{2})\/(\d{2})\/(\d{4})/;
const REGEX_PREFEITURA = /prefeitura\s+(?:municipal\s+)?de\s+([a-zà-úçã\s]+)/i;
const REGEX_NUMERACAO = /^\s*(\d+)\.\s*/;
const REGEX_HORARIO = /(\d{1,2})(?:[:h]\d{2})?\s*\b(?:as|às|a|até)\b\s*(\d{1,2})(?:[:h]\d{2})?/i;
const REGEX_LIMPEZA_FINAL = /(\s*[-–:]\s*|\s+(?:funciona|de)\b\s*)+$/i;

interface BlocoMatriz {
  linhaEntrega: number;
  dataIso: string | null;
}

/** Procura por células "ENTREGA DIA dd/mm/aaaa" — cada uma marca o início de um bloco de escolas × produtos. */
function detectarBlocosMatriz(grade: PlanilhaGrade): BlocoMatriz[] {
  const blocos: BlocoMatriz[] = [];
  for (let i = 0; i < grade.length; i += 1) {
    const primeiraCelula = comoTexto(grade[i]?.[0]);
    if (primeiraCelula && REGEX_ENTREGA_DIA.test(primeiraCelula)) {
      const matchData = primeiraCelula.match(REGEX_DATA);
      const dataIso = matchData ? `${matchData[3]}-${matchData[2]}-${matchData[1]}` : null;
      blocos.push({ linhaEntrega: i, dataIso });
    }
  }
  return blocos;
}

/** "PREFEITURA DE ESMERALDAS" em alguma célula do topo vira o município de todas as escolas do arquivo. */
function detectarMunicipio(grade: PlanilhaGrade): string | null {
  for (let i = 0; i < Math.min(6, grade.length); i += 1) {
    for (const celula of grade[i] ?? []) {
      const texto = comoTexto(celula);
      if (!texto) continue;
      const match = texto.match(REGEX_PREFEITURA);
      if (match) return limparEspacos(match[1]);
    }
  }
  return null;
}

interface ColunaProduto {
  indice: number;
  produto: string;
  unidade: string;
}

function extrairColunasProdutos(linhaProdutos: JsonValue[], linhaUnidades: JsonValue[]): ColunaProduto[] {
  const colunas: ColunaProduto[] = [];
  for (let i = 1; i < linhaProdutos.length; i += 1) {
    const produto = comoTexto(linhaProdutos[i]);
    if (produto) {
      colunas.push({
        indice: i,
        produto: limparEspacos(produto),
        unidade: limparEspacos(comoTexto(linhaUnidades[i]) ?? ''),
      });
    }
  }
  return colunas;
}

interface LinhaEscolaInterpretada {
  nome: string;
  horarioFuncionamento: string | null;
  numeroLista: string | null;
}

/**
 * A célula de uma escola costuma vir como texto livre, ex:
 * "22. ALFEU RODRIGUES - Funciona 7:00 as 12:00". Extrai o nome e, quando
 * dá para reconhecer, o horário de funcionamento — sem exigir um formato
 * único, já que cada linha da planilha real escreve isso de um jeito.
 */
function interpretarLinhaEscola(textoOriginal: string): LinhaEscolaInterpretada {
  const matchNumero = textoOriginal.match(REGEX_NUMERACAO);
  const numeroLista = matchNumero ? matchNumero[1] : null;

  const texto = limparEspacos(textoOriginal.replace(REGEX_NUMERACAO, ''));
  const matchHorario = texto.match(REGEX_HORARIO);

  let nome = texto;
  let horarioFuncionamento: string | null = null;

  if (matchHorario && matchHorario.index !== undefined) {
    horarioFuncionamento = limparEspacos(matchHorario[0]);
    const idxFunciona = texto.search(/funciona/i);
    const corteEm = idxFunciona >= 0 ? idxFunciona : matchHorario.index;
    nome = texto.slice(0, corteEm);
  }

  nome = limparEspacos(nome.replace(REGEX_LIMPEZA_FINAL, ''));

  return { nome: nome || limparEspacos(textoOriginal), horarioFuncionamento, numeroLista };
}

function normalizarMatriz(
  grade: PlanilhaGrade,
  blocos: BlocoMatriz[],
  escolasCadastradas: EscolaCadastrada[],
  importacaoId: string,
): ResultadoImportacao {
  const avisos: string[] = [];
  const recibos: ReciboPreparado[] = [];
  const municipio = detectarMunicipio(grade);
  let totalLinhas = 0;

  blocos.forEach((bloco, indiceBloco) => {
    const linhaProdutos = grade[bloco.linhaEntrega] ?? [];
    const linhaUnidades = grade[bloco.linhaEntrega + 1] ?? [];
    const colunasProdutos = extrairColunasProdutos(linhaProdutos, linhaUnidades);

    if (colunasProdutos.length === 0) {
      avisos.push(`Bloco na linha ${bloco.linhaEntrega + 1}: nenhuma coluna de produto identificada.`);
      return;
    }

    const proximoBloco = blocos[indiceBloco + 1]?.linhaEntrega ?? grade.length;
    const inicioLinhasEscola = bloco.linhaEntrega + 2;

    for (let i = inicioLinhasEscola; i < proximoBloco; i += 1) {
      const linha = grade[i] ?? [];
      const primeiraCelula = comoTexto(linha[0]);
      if (!primeiraCelula) continue; // linha em branco usada só como espaçador
      if (/^total\b/i.test(primeiraCelula)) break; // linha de totais encerra o bloco

      totalLinhas += 1;
      const { nome, horarioFuncionamento, numeroLista } = interpretarLinhaEscola(primeiraCelula);

      const itens: ItemEntrega[] = [];
      for (const coluna of colunasProdutos) {
        const quantidade = comoNumero(linha[coluna.indice]);
        if (quantidade !== undefined && quantidade > 0) {
          itens.push({ produto: coluna.produto, unidade: coluna.unidade || null, quantidade });
        }
      }

      const escola: Escola = {
        codigoEscola: '',
        nome,
        cnpj: '',
        endereco: { rua: '', numero: '', bairro: null, cidade: municipio ?? '', uf: null, cep: null },
        horarioFuncionamento,
      };
      const encontradaNoCadastro = aplicarCadastro(escola, escolasCadastradas);

      // Dado ausente nunca bloqueia a geração do recibo: cada situação vira
      // um aviso (para conferência) e uma observação impressa no próprio
      // recibo — o recibo é sempre gerado, nunca fica travado como "erro".
      const problemas: ProblemaRecibo[] = [];
      const observacoes: string[] = [];

      if (!escola.endereco.rua) {
        problemas.push({
          campo: 'endereco',
          mensagem: `Endereço não informado para "${nome}" — a planilha não traz esse dado, só o nome da escola.`,
          severidade: 'aviso',
        });
        observacoes.push('Endereço não informado nesta planilha.');
      }

      if (!escola.horarioFuncionamento) {
        problemas.push({
          campo: 'horarioFuncionamento',
          mensagem: `Horário de funcionamento não informado para "${nome}".`,
          severidade: 'aviso',
        });
        observacoes.push('Horário de funcionamento não informado nesta planilha.');
      }

      if (!encontradaNoCadastro) {
        problemas.push({
          campo: 'cadastro',
          mensagem: `"${nome}" não está no cadastro de escolas — cadastre em "Escolas Cadastradas" para preencher endereço/horário automaticamente nas próximas importações.`,
          severidade: 'aviso',
        });
      }

      if (numeroLista) {
        problemas.push({
          campo: 'numeroPedido',
          mensagem: `Número do pedido (${numeroLista}) inferido pela posição na lista da planilha — confirme antes de gerar.`,
          severidade: 'aviso',
        });
        observacoes.push(`Número do pedido (${numeroLista}) inferido pela posição na lista — confirme.`);
      }

      if (itens.length === 0) {
        problemas.push({
          mensagem: `Nenhum item com quantidade informada para "${nome}".`,
          severidade: 'aviso',
        });
        observacoes.push('Nenhum item com quantidade informada nesta planilha — confira antes de entregar.');
      }

      const entrega: Entrega = {
        codigoEntrega: `${bloco.dataIso ?? 'entrega'}-${numeroLista ?? i}`,
        numeroPedido: numeroLista ?? '',
        dataEntrega: bloco.dataIso ?? '',
        status: 'pendente',
        escola,
        itens,
        observacoes,
        responsavelRecebimento: null,
      };

      recibos.push({
        id: `${importacaoId}-matriz-${bloco.linhaEntrega}-${i}`,
        entrega,
        status: 'pendente',
        problemas,
        origem: 'importacao',
        importacaoId,
      });
    }
  });

  return {
    recibos,
    totalLinhas,
    totalEscolas: recibos.length,
    totalRecibosPreparados: recibos.length,
    totalComErro: recibos.filter((r) => r.status === 'com_erro').length,
    totalDuplicados: 0,
    avisos,
    hashConteudo: '',
    municipio,
  };
}

// =====================================================================
// Ponto de entrada: decide qual formato a planilha usa e delega.
// =====================================================================

/**
 * Transforma a grade bruta da planilha em recibos preparados por escola.
 * Detecta automaticamente entre o formato "matriz" (escolas nas linhas,
 * produtos nas colunas, com um marcador "ENTREGA DIA") e o formato "tabela"
 * (uma linha por item). O usuário revisa o resultado — não digita nada
 * disso manualmente.
 */
export function normalizeSpreadsheetData(
  grade: PlanilhaGrade,
  escolasCadastradas: EscolaCadastrada[],
  importacaoId: string,
): ResultadoImportacao {
  const hashConteudo = gerarHash(JSON.stringify(grade));

  if (grade.length === 0) {
    return {
      recibos: [],
      totalLinhas: 0,
      totalEscolas: 0,
      totalRecibosPreparados: 0,
      totalComErro: 0,
      totalDuplicados: 0,
      avisos: ['A planilha está vazia ou não possui dados.'],
      hashConteudo,
      municipio: null,
    };
  }

  const blocos = detectarBlocosMatriz(grade);
  const resultado =
    blocos.length > 0
      ? normalizarMatriz(grade, blocos, escolasCadastradas, importacaoId)
      : normalizarTabela(gradeParaLinhas(grade), escolasCadastradas, importacaoId);

  return { ...resultado, hashConteudo };
}
