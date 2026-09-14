/**
 * Recado diário de incentivo mostrado no Dashboard. Muda uma vez por dia
 * (mesma mensagem o dia inteiro, nova no dia seguinte) — não é aleatório a
 * cada acesso, senão vira ruído em vez de incentivo.
 */
const MENSAGENS_DO_DIA: string[] = [
  'Cada recibo que você prepara representa uma escola inteira recebendo a merenda certinha, no dia certo.',
  'Seu cuidado com os detalhes evita erros que ninguém vê de fora — mas que fazem toda a diferença pras crianças no fim da fila.',
  'Antes era planilha, Word e impressora, um por um. Hoje o sistema faz a parte repetitiva pra você poder cuidar do que importa.',
  'Trabalho bem feito, mesmo o que ninguém elogia todo dia, sustenta a operação inteira. E o seu sustenta muita gente.',
  'Cada prefeitura atendida direito hoje é uma parceria que continua amanhã.',
  'Organização não aparece no resultado final — mas sem ela, nada funciona. Obrigado por manter tudo em ordem.',
  'Se um recibo sai correto na primeira vez, é porque alguém conferiu com atenção antes. Esse alguém é você.',
  'O trabalho de bastidor é o que faz a entrega parecer fácil pra quem recebe.',
  'Escola cadastrada certinha hoje é uma semana inteira mais tranquila lá na frente.',
  'Cada planilha organizada é uma dor de cabeça a menos pra alguém no fim da cadeia.',
  'Um dia de cada vez, um recibo de cada vez — é assim que sistema nenhum funciona sem uma pessoa cuidando dele.',
  'A atenção que você dá pra cada detalhe é o que garante que a criança do outro lado da cidade também seja bem atendida.',
  'Processo repetitivo bem feito, todo santo dia, é disciplina — e disciplina é raro. Valeu por manter a sua.',
  'Ninguém nota quando tudo dá certo. E é exatamente por isso que dar tudo certo, todo dia, é um trabalho e tanto.',
  'Cada prefeitura tem seu jeito, cada planilha tem sua bagunça — e você lida com isso com uma calma que faz diferença.',
  'O Grupo Líder entrega comida; você garante que cada entrega tenha o papel certo, pra pessoa certa, na escola certa.',
  'Hoje é só mais um dia de trabalho. Mas pra alguma escola, é o dia que a merenda chegou direitinho.',
  'Revisar duas vezes antes de gerar o recibo não é perfeccionismo — é profissionalismo. E isso conta.',
  'Sistema nenhum substitui o cuidado de quem usa ele com atenção. Obrigado por ser essa pessoa.',
  'Trabalho que evita retrabalho de outra pessoa lá na frente é trabalho que vale o dobro.',
  'Cada escola nova que entra certinha no cadastro é menos trabalho manual daqui a um mês.',
  'Boa parte do que faz uma empresa confiável é invisível: é gente como você garantindo que os detalhes fecham.',
  'Se hoje o dia estiver corrido, lembre: cada recibo gerado é uma entrega a menos pra se preocupar amanhã.',
  'A confiança de uma prefeitura numa empresa se constrói recibo por recibo, sem falha. Você é parte disso.',
  'Ter uma rotina que funciona é conquista — e essa rotina existe porque alguém cuida dela com atenção, todo dia.',
];

function diaDoAno(data: Date): number {
  const inicioDoAno = new Date(data.getFullYear(), 0, 0);
  const diferencaMs = data.getTime() - inicioDoAno.getTime();
  return Math.floor(diferencaMs / 86_400_000);
}

/** Mesma mensagem o dia inteiro; muda no dia seguinte, girando pela lista. */
export function obterMensagemDoDia(data: Date = new Date()): string {
  const indice = diaDoAno(data) % MENSAGENS_DO_DIA.length;
  return MENSAGENS_DO_DIA[indice];
}

export function obterSaudacao(data: Date = new Date()): string {
  const hora = data.getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}
