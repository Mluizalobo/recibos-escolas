# Recibos de Entrega — Distribuidora Alvorada

Aplicação web para substituir o processo manual de gerar recibos de entrega
por escola (planilha impressa → cópia manual para o Word → impressão
individual). O fluxo aqui é: **consultar a escola/pedido → conferir os dados
→ gerar o recibo → visualizar/imprimir o PDF**.

O ponto central do projeto é que a interface é **orientada pelos dados**: o
componente `DynamicDataRenderer` percorre qualquer JSON recursivamente e
decide como exibir cada campo (texto, tabela, cards, tags) sem depender de
nomes de campo fixos. Isso permite que escolas com estruturas de dados
diferentes entre si sejam exibidas corretamente, e que campos novos apareçam
automaticamente sem precisar alterar código.

## Stack

React 19 + TypeScript + Vite + Tailwind CSS v4, React Router, `xlsx`
(leitura de planilhas), `jspdf` + `html2canvas` (geração de PDF) e
`lucide-react` (ícones).

## Instalação e execução

```bash
npm install
npm run dev       # ambiente de desenvolvimento (http://localhost:5173)
npm run build     # build de produção (checagem de tipos + bundle em dist/)
npm run preview   # serve o build de produção localmente
```

Não é necessário nenhum backend ou variável de ambiente para rodar o
projeto: os dados vêm de mocks em memória (ver abaixo).

## Estrutura de pastas

```
src/
├── components/     # UI reutilizável (renderer dinâmico, formulário, recibo, lote...)
├── pages/          # Dashboard, Consulta, Importacao
├── services/       # api.ts, excelService.ts, pdfService.ts, mockData.ts
├── utils/          # formatters, labelFormatter, validators
├── types/          # tipos genéricos (JsonValue/JsonObject) e de domínio
├── hooks/          # useConsulta
└── App.tsx         # rotas e layout
```

Regra seguida no projeto inteiro: **UI, chamadas de dados e geração de PDF
nunca ficam misturadas no mesmo arquivo** — os componentes chamam funções de
`services/`, nunca implementam a lógica ali dentro.

## Onde configurar a fonte de dados

Hoje os dados vêm de `src/services/mockData.ts` (3 escolas com estruturas de
JSON propositalmente diferentes, para provar que a renderização é genérica).
`src/services/api.ts` expõe três funções que a UI consome —
`consultarEntrega`, `listarTodasEntregas` e `obterResumoDashboard` — e são o
**único ponto de troca** quando a fonte de dados real existir:

```ts
// src/services/api.ts — trocar o corpo por uma chamada HTTP real:
export async function consultarEntrega(tipo: SearchType, valor: string) {
  const resposta = await fetch(`/api/entregas?tipo=${tipo}&valor=${valor}`);
  if (!resposta.ok) throw new ApiError('network', '...');
  return resposta.json();
}
```

Nenhum componente de página ou de UI precisa mudar quando isso acontecer.

Planilhas importadas em **Importar Planilha** já ficam disponíveis para
consulta na mesma sessão (`registrarEntregasImportadas`), simulando o
comportamento que uma API real teria após persistir os dados.

## Onde alterar o modelo do recibo

O layout vive isolado em `src/components/ReciboTemplate.tsx`. Ele **não
assume um schema fixo**: extrai cada campo (nome da escola, CNPJ, endereço,
pedido, itens, observações, responsável) tentando múltiplos caminhos
possíveis dentro do JSON, então continua funcionando mesmo que a estrutura
mude. Quando o modelo Word oficial da empresa for definido, ajuste apenas
esse componente (cabeçalho, campos exibidos, texto de assinatura, posição do
carimbo) — `ReciboPreview.tsx` (preview + ações) e `pdfService.ts` (geração
do PDF/paginação) não precisam mudar.

## Identificadores de busca

Novos tipos de identificador (ex: "turma", "regional") são adicionados em um
único lugar, `SEARCH_TYPES` em `src/types/index.ts` — o formulário de busca
lê essa lista automaticamente.

## Geração em lote

Em **Gerar em Lote**, cada escola marcada pode virar um PDF individual ou
todas podem ser combinadas em um único PDF (uma escolha, não as duas ao
mesmo tempo). A renderização de cada recibo acontece fora da tela (mas com
layout real) para ser capturada via `html2canvas` e paginada em A4.

## Limitação conhecida

O bundle de produção passa de 500 kB porque `xlsx`, `jspdf` e `html2canvas`
são carregados de início. Para produção, vale trocar os `import` estáticos
dessas libs por `import()` dinâmico nas páginas que as usam (Importação,
Consulta e BatchGenerator) — não foi feito aqui para manter o código mais
simples de acompanhar nesta primeira versão.

## Perguntas que faltam para conectar a fonte de dados definitiva

1. Qual é a estrutura atual da planilha (nomes exatos das colunas)?
2. Existe mais de uma aba, ou os dados sempre vêm na primeira?
3. Qual é o identificador usado para localizar a escola no dia a dia:
   código, CNPJ, nome, número do pedido?
4. Uma escola pode ter mais de uma linha na planilha (um produto por linha)?
5. Como identificar que várias linhas pertencem à mesma entrega (mesmo
   pedido, mesmo código de entrega, ou outra regra)?
6. Existe numeração sequencial própria para os recibos?
7. Qual é o modelo Word atual usado para o recibo? (`ReciboTemplate.tsx` foi
   feito para ser adaptado assim que ele for enviado)
8. Existe logotipo da empresa em arquivo separado (para usar no cabeçalho)?
9. Quais campos são obrigatórios no recibo final?
10. O responsável pela escola assina fisicamente o papel impresso, ou a
    assinatura também pode ser digital?
11. O recibo precisa de espaço reservado para carimbo? (já existe um
    placeholder pronto no template)
12. A empresa precisa manter histórico dos recibos já gerados? Isso definiria
    se vale a pena adicionar um banco de dados já na próxima fase.

## O que já funciona ponta a ponta

Importar planilha → normalizar/agrupar linhas em entregas → consultar por
nome/código/CNPJ/pedido/código de entrega → ver os dados renderizados
dinamicamente → gerar recibo → visualizar → gerar PDF ou imprimir — tanto
para uma escola por vez quanto em lote.
