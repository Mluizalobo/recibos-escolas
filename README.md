# Recibos de Entrega — GP Distribuidora

Aplicação web que substitui o processo manual de gerar recibos de entrega
por escola a partir da planilha semanal (planilha → copiar dados no Word →
imprimir um por um). O fluxo agora é:

**Importar a planilha semanal → o sistema organiza e valida por escola →
usuário confere e corrige o que precisar → gera os PDFs.**

O usuário atua como **conferente**, não como digitador: os dados de cada
recibo vêm prontos da planilha, e a interface só pede intervenção manual nos
casos com pendência (CNPJ ausente, endereço ausente, item não identificado).

O sistema também mantém uma tela de consulta avulsa (`Consultar Entrega`),
cujo destaque é o `DynamicDataRenderer`: um componente que percorre qualquer
JSON recursivamente e decide como exibir cada campo (texto, tabela, cards,
tags) sem depender de nomes de campo fixos — útil enquanto o formato real da
planilha ainda pode mudar.

## Stack

React 19 + TypeScript + Vite + Tailwind CSS v4, React Router, `xlsx`
(leitura de planilhas), `jspdf` + `html2canvas-pro` (geração de PDF) e
`lucide-react` (ícones).

> **Por que `html2canvas-pro` e não `html2canvas`?** O Tailwind v4 gera cores
> no formato `oklch()`, que a biblioteca `html2canvas` original não sabe
> interpretar ao ler estilos computados (a geração de PDF falha com
> "unsupported color function"). O fork `html2canvas-pro` corrige isso e é
> um substituto direto (mesma API).

## Acesso online

Publicado no GitHub Pages a cada push na branch `main` (workflow em
`.github/workflows/deploy.yml`):
**https://mluizalobo.github.io/recibos-escolas/**

Duas coisas existem só por causa do GitHub Pages ser hospedagem estática
(sem servidor para reescrever rotas):

- `vite.config.ts` define `base: '/recibos-escolas/'` (o site fica numa
  subpasta, não na raiz do domínio);
- as rotas usam `HashRouter` em vez de `BrowserRouter` em `src/App.tsx`
  (por isso os links ficam `/#/consulta`, `/#/lote` etc.) — assim recarregar
  a página em qualquer rota funciona sem precisar configurar o servidor.

## Instalação e execução

```bash
npm install
npm run dev       # ambiente de desenvolvimento (http://localhost:5173)
npm run build     # build de produção (checagem de tipos + bundle em dist/)
npm run preview   # serve o build de produção localmente
```

Não é necessário nenhum backend ou variável de ambiente para rodar o
projeto. Os dados de demonstração ficam em memória; o que é importado via
planilha persiste no `localStorage` do navegador (recibos preparados e
histórico de importações), então sobrevive a um recarregamento da página.

## Fluxo principal (importação semanal)

```
Planilha (.xlsx/.xls)
      │  excelService.ts        → lê o arquivo, calcula hash do conteúdo
      ▼
normalizeService.ts             → mapeia colunas, agrupa linhas por escola/
      │                           entrega, valida e classifica cada recibo
      ▼
recibosStore.ts                 → guarda os recibos preparados (localStorage)
      │
      ├─→ api.ts                → disponibiliza para a busca avulsa (Consultar Entrega)
      └─→ historyService.ts     → registra a importação no histórico semanal
      ▼
BatchGenerator (tela "Recibos Preparados")
      │  busca / filtro por status / corrigir pendências
      ▼
pdfService.ts                   → gera PDF individual ou um único PDF em lote
```

Cada recibo preparado tem um status: **Pendente** (tem alguma pendência não
bloqueante, ex. CNPJ ausente), **Pronto** (sem pendências), **Com erro**
(bloqueante, ex. nenhum item identificado para a escola), **Gerado** e
**Impresso**. Pendências não bloqueantes podem ser corrigidas direto na tela
(ícone de lápis); pendências de item ausente exigem corrigir a planilha de
origem, já que a interface não deve inventar dados que não vieram dela.

Reenviar uma planilha já processada (mesmo conteúdo) mostra um aviso antes
de reprocessar, para evitar recibos duplicados.

## Estrutura de pastas

```
src/
├── components/     # UI reutilizável (renderer dinâmico, formulário, recibo,
│                     lote/status, modal de correção, logo...)
├── pages/          # Dashboard, Consulta, Importacao, Historico
├── services/
│   ├── api.ts              # camada de consulta avulsa (troque aqui por uma API real)
│   ├── excelService.ts     # leitura do arquivo + hash do conteúdo
│   ├── normalizeService.ts # normalizeSpreadsheetData(): mapeia, agrupa, valida
│   ├── recibosStore.ts     # estado dos recibos preparados (+ correção manual)
│   ├── historyService.ts   # histórico de importações semanais
│   ├── pdfService.ts       # geração de PDF (individual e em lote)
│   └── mockData.ts         # dados de demonstração para a Consulta
├── utils/          # formatters, labelFormatter, validators, hash
├── types/          # tipos genéricos (JsonValue/JsonObject) e de domínio
├── hooks/          # useConsulta
└── App.tsx         # rotas e layout
```

Regra seguida no projeto inteiro: **UI, leitura de planilha, normalização e
geração de PDF nunca ficam misturadas no mesmo arquivo.**

## Identidade visual

O sistema já usa a marca real da **GP Distribuidora** (logotipo e paleta
extraídos do arquivo oficial), configurada de forma centralizada — ajustar
qualquer coisa depois é mexer em poucos lugares, não em cada componente:

- **Logo**: `src/assets/logo-gp.png` (recortado do arquivo enviado, só o
  símbolo, sem a palavra "DISTRIBUIDORA" — em tamanho de ícone o nome já
  aparece como texto ao lado, via `EMPRESA.nome`). `src/components/Logo.tsx`
  usa `EMPRESA.logoUrl` (`src/services/mockData.ts`); se um dia faltar,
  cai num ícone genérico. É o mesmo componente usado no cabeçalho do
  sistema e no cabeçalho do recibo.
- **Cores**: tokens no bloco `@theme` de `src/index.css`:
  - `--color-brand` (`#0a6fae`) — usado em botões primários, links e
    destaques (`bg-brand`, `text-brand`...). É uma versão mais escura do
    ciano do logo (`#00a8e8`): o tom vivo puro não tem contraste
    suficiente para texto branco em botão (~2.7:1); esta versão passa de
    5:1.
  - `--color-brand-accent` (`#00a8e8`) e `--color-brand-yellow`
    (`#f5ee00`) — o ciano vivo e o amarelo do logo, usados só como
    decoração pontual (o friso no topo do recibo), não em texto.

Cores de status (verde/âmbar/vermelho/roxo nos badges de situação da
entrega e do recibo) são propositalmente independentes da marca — não devem
mudar se a paleta principal mudar.

CNPJ e endereço em `EMPRESA` (`src/services/mockData.ts`) ainda são
placeholder — trocar pelos dados reais de cadastro da empresa quando
disponíveis.

## Onde configurar a fonte de dados

`src/services/api.ts` expõe as funções que a tela de Consulta usa —
`consultarEntrega`, `listarTodasEntregas`, `obterResumoDashboard` — e é o
**único ponto de troca** quando a fonte de dados real (API/banco) existir:

```ts
// src/services/api.ts — trocar o corpo por uma chamada HTTP real:
export async function consultarEntrega(tipo: SearchType, valor: string) {
  const resposta = await fetch(`/api/entregas?tipo=${tipo}&valor=${valor}`);
  if (!resposta.ok) throw new ApiError('network', '...');
  return resposta.json();
}
```

Para a importação de planilha, o ponto de troca equivalente é
`recibosStore.ts` (hoje guarda em `localStorage`; no futuro, os mesmos
pontos onde ele é chamado por `Importacao.tsx` e `BatchGenerator.tsx`
passariam a chamar uma API). Nenhum componente de página precisa mudar.

## Onde alterar o modelo do recibo

O layout vive isolado em `src/components/ReciboTemplate.tsx`. Ele **não
assume um schema fixo**: extrai cada campo (nome da escola, CNPJ, endereço,
pedido, itens, observações, responsável) tentando múltiplos caminhos
possíveis dentro do JSON. Quando o modelo Word oficial da empresa for
definido, ajuste esse componente (cabeçalho, campos exibidos, texto de
assinatura, posição do carimbo) — `ReciboPreview.tsx` e `pdfService.ts` não
precisam mudar.

## Identificadores de busca

Novos tipos de identificador (ex: "turma", "regional") são adicionados em um
único lugar, `SEARCH_TYPES` em `src/types/index.ts`.

## Limitações conhecidas

- O bundle de produção passa de 500 kB porque `xlsx`, `jspdf` e
  `html2canvas-pro` são carregados de início. Vale trocar os `import`
  estáticos dessas libs por `import()` dinâmico nas páginas que as usam.
- O pacote `xlsx` (SheetJS) tem vulnerabilidades conhecidas sem correção
  disponível (`npm audit`). O risco é baixo aqui porque o arquivo processado
  é a planilha interna da própria empresa, não um upload de terceiros — mas
  vale reavaliar se o fluxo de importação for aberto a outras origens.
- O histórico de importações e os recibos preparados ficam no `localStorage`
  do navegador — trocar de computador ou limpar dados do site reinicia esse
  estado. Isso é esperado nesta fase (sem backend); a arquitetura
  (`historyService.ts`, `recibosStore.ts`) já está isolada para migrar para
  uma API/banco depois sem tocar nas telas.

## Perguntas que faltam para conectar a fonte de dados definitiva

1. Qual é a estrutura atual da planilha (nomes exatos das colunas)?
2. Existe mais de uma aba, ou os dados sempre vêm na primeira?
3. Qual é o identificador usado para localizar a escola no dia a dia:
   código, CNPJ, nome, número do pedido?
4. Como identificar que várias linhas pertencem à mesma entrega (mesmo
   pedido, mesmo código de entrega, ou outra regra)? Hoje a prioridade é
   código da entrega → pedido → CNPJ+data → nome da escola.
5. Existe numeração sequencial própria para os recibos?
6. Qual é o modelo Word atual usado para o recibo?
7. Existe logotipo da empresa em arquivo separado (para usar no cabeçalho)?
8. Quais campos são obrigatórios no recibo final, e quais tornam um recibo
   bloqueante ("com erro") se estiverem ausentes?
9. O responsável pela escola assina fisicamente o papel impresso, ou a
   assinatura também pode ser digital?
10. O recibo precisa de espaço reservado para carimbo? (já existe um
    placeholder pronto no template)
11. Qual é a paleta de cores e a tipografia oficiais da empresa?
12. A planilha semanal costuma repetir escolas de semanas anteriores? Isso
    ajudaria a refinar a regra de detecção de duplicidade.

## O que já funciona ponta a ponta

Importar planilha → normalizar/agrupar linhas por escola/entrega → validar e
classificar cada recibo (pronto/pendente/com erro) → avisar se a planilha já
foi processada antes → conferir e corrigir pendências → buscar por
nome/código/CNPJ/pedido/código de entrega → ver os dados renderizados
dinamicamente → gerar recibo → visualizar → gerar PDF (individual ou em
lote, um por escola ou um único arquivo) ou imprimir → consultar o histórico
de importações semanais.
