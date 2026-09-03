# Recibos de Entrega — Grupo Líder

Aplicação web que substitui o processo manual de gerar recibos de entrega
por escola a partir da planilha semanal (planilha → copiar dados no Word →
imprimir um por um). O fluxo é:

**Importar a planilha semanal → o sistema organiza e valida por escola →
usuário confere e corrige o que precisar → gera os PDFs no formato oficial.**

O usuário atua como **conferente**, não como digitador: os dados de cada
recibo vêm prontos da planilha, e a interface só pede intervenção manual nos
casos com pendência (endereço ausente, item não identificado).

O recibo gerado é uma réplica fiel do modelo real fornecido pela empresa
(recibo de entrega para prefeituras municipais, sem CNPJ, sem valores,
numeração grande e tabela de produtos) — ver `ReciboTemplate.tsx`.

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

Login de demonstração (ver "Login" abaixo):

| Usuário | Senha |
|---|---|
| `poliana` | `lider2026` |
| `admin` | `grupolider` |

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
planilha, os recibos corrigidos/excluídos, a sessão de login e o histórico
de importações persistem no `localStorage` do navegador.

## Login

`src/services/authService.ts` faz um login **só de front-end**: valida
usuário/senha contra uma lista fixa no próprio código e guarda a sessão no
`localStorage`. **Isso não é segurança real** — qualquer pessoa com acesso
ao código-fonte vê as senhas. Serve para dar à interface um controle básico
de "quem está usando o sistema" (incluindo o perfil da Poliana) enquanto não
existe um backend com autenticação de verdade. Trocar por login real é
reescrever esse arquivo para chamar uma API de auth — `RotaProtegida` em
`App.tsx` (que hoje só verifica `obterSessao()`) não precisa mudar.

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
      │  busca / filtro por status / corrigir pendências / excluir
      ▼
pdfService.ts                   → gera PDF individual ou um único PDF em lote
```

Cada recibo preparado tem um status: **Pendente** (tem alguma pendência não
bloqueante, ex. endereço ausente), **Pronto** (sem pendências), **Com erro**
(bloqueante, ex. nenhum item identificado para a escola), **Gerado** e
**Impresso**. Pendências não bloqueantes podem ser corrigidas direto na tela
(ícone de lápis); pendências de item ausente exigem corrigir a planilha de
origem, já que a interface não deve inventar dados que não vieram dela.
Recibos importados também podem ser excluídos da lista (ícone de lixeira) —
os de demonstração não, para não sumirem "de verdade" a cada recarregamento.

Reenviar uma planilha já processada (mesmo conteúdo) mostra um aviso antes
de reprocessar, para evitar recibos duplicados. Depois de processar, dá para
abrir a planilha original (como foi lida, antes de qualquer normalização)
para conferir contra os dados que o sistema organizou.

## Estrutura de pastas

```
src/
├── components/     # UI reutilizável (renderer dinâmico, formulário, recibo,
│                     lote/status, modal de correção, sidebar, logo...)
├── pages/          # Dashboard, Consulta, Importacao, Historico,
│                     RelatorioSemanal, DadosEmpresa, Login
├── services/
│   ├── api.ts              # camada de consulta avulsa (troque aqui por uma API real)
│   ├── excelService.ts     # leitura do arquivo + hash do conteúdo
│   ├── normalizeService.ts # normalizeSpreadsheetData(): mapeia, agrupa, valida
│   ├── recibosStore.ts     # estado dos recibos preparados (+ correção/exclusão)
│   ├── historyService.ts   # histórico de importações semanais
│   ├── authService.ts      # login local (ver seção "Login")
│   ├── pdfService.ts       # geração de PDF (individual e em lote)
│   └── mockData.ts         # dados da empresa + demonstração para a Consulta
├── utils/          # formatters, labelFormatter, validators, hash
├── types/          # tipos genéricos (JsonValue/JsonObject) e de domínio
├── hooks/          # useConsulta
└── App.tsx         # rotas, proteção de rota e layout
```

Regra seguida no projeto inteiro: **UI, leitura de planilha, normalização e
geração de PDF nunca ficam misturadas no mesmo arquivo.**

## Navegação

Barra lateral fixa no desktop (`src/components/Sidebar.tsx`), com menu
retrátil no mobile: Dashboard, Consultar Entrega, Importar Planilha, Recibos
Preparados, Histórico, Relatório Semanal e Dados da Empresa.

## Identidade visual

O sistema usa a marca real do **Grupo Líder** (logotipo e paleta extraídos
do arquivo oficial), configurada de forma centralizada — ajustar qualquer
coisa depois é mexer em poucos lugares, não em cada componente:

- **Logo**: `src/assets/logo-gl-icon.png` (só o símbolo, usado no menu e no
  ícone da aba) e `logo-gl-lockup.png` (símbolo + "Grupo Líder" por extenso,
  usado na tela de login e em Dados da Empresa). `src/components/Logo.tsx`
  lê `EMPRESA.logoUrl`/`logoLockupUrl` (`src/services/mockData.ts`); se um
  dia faltar, cai num ícone genérico.
- **Cores**: tokens no bloco `@theme` de `src/index.css` — `--color-brand`
  (`#123a1a`, o verde do logo) e `--color-brand-dark`/`--color-brand-light`
  derivados dele. O verde já é escuro o bastante para texto branco em botão
  (~14:1 de contraste), então não precisou de uma versão "segura" separada
  como aconteceria com uma cor clara.

Cores de status (verde/âmbar/vermelho/azul/roxo nos badges de situação da
entrega e do recibo) são propositalmente independentes da marca — não devem
mudar se a paleta principal mudar.

CNPJ, endereço, telefone e e-mail em `EMPRESA` (`src/services/mockData.ts`,
exibidos em Dados da Empresa) ainda são placeholder — trocar pelos dados
reais de cadastro quando disponíveis.

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

O layout vive isolado em `src/components/ReciboTemplate.tsx` e já segue o
modelo oficial real (cabeçalho com razão social, destinatário — prefeitura/
escola/horário/endereço —, numeração grande, tabela DESCRIÇÃO/UNID/QUANT
com linhas em branco, rodapé "Recebido por"/"Data"). Ele **não assume um
schema fixo**: extrai cada campo tentando múltiplos caminhos possíveis
dentro do JSON, então continua funcionando mesmo que a estrutura da entrega
mude. Ajustes futuros (novo campo obrigatório, mudança no cabeçalho) são só
nesse componente — `ReciboPreview.tsx` e `pdfService.ts` não precisam mudar.

## Identificadores de busca

Novos tipos de identificador (ex: "turma", "regional") são adicionados em um
único lugar, `SEARCH_TYPES` em `src/types/index.ts`.

## Limitações conhecidas

- O login é só de front-end (ver seção "Login") — não usar como controle de
  acesso real a dados sensíveis.
- O bundle de produção passa de 500 kB porque `xlsx`, `jspdf` e
  `html2canvas-pro` são carregados de início. Vale trocar os `import`
  estáticos dessas libs por `import()` dinâmico nas páginas que as usam.
- O pacote `xlsx` (SheetJS) tem vulnerabilidades conhecidas sem correção
  disponível (`npm audit`). O risco é baixo aqui porque o arquivo processado
  é a planilha interna da própria empresa, não um upload de terceiros — mas
  vale reavaliar se o fluxo de importação for aberto a outras origens.
- Histórico, recibos preparados, correções e sessão de login ficam no
  `localStorage` do navegador — trocar de computador ou limpar dados do
  site reinicia esse estado. Isso é esperado nesta fase (sem backend); a
  arquitetura (`historyService.ts`, `recibosStore.ts`, `authService.ts`) já
  está isolada para migrar para uma API/banco depois sem tocar nas telas.

## Perguntas que ainda faltam

1. Existe mais de uma aba na planilha, ou os dados sempre vêm na primeira?
2. Além de código da entrega/pedido/CNPJ+data/nome da escola (nessa ordem de
   prioridade hoje), existe outra regra para saber que várias linhas
   pertencem à mesma entrega?
3. A numeração grande do recibo (hoje mapeada do "Pedido") é sequencial por
   entrega, por rota do dia, ou outra lógica?
4. Quais campos são realmente obrigatórios para o recibo ser válido perante
   a prefeitura — hoje só "nenhum item" bloqueia ("Com erro"); endereço
   ausente é só aviso ("Pendente").
5. O "Recebido por" é sempre assinado fisicamente no papel impresso, ou
   pode vir preenchido já na planilha (nome de quem vai receber)?
6. CNPJ, endereço, telefone e e-mail reais da empresa, para a tela Dados da
   Empresa e o cabeçalho do sistema.
7. Login de verdade: existe (ou vai existir) um backend/provedor de
   autenticação, ou o controle de acesso deve continuar simples assim?

## O que já funciona ponta a ponta

Login → importar planilha → ver a planilha original lida → normalizar/
agrupar linhas por escola/entrega → validar e classificar cada recibo
(pronto/pendente/com erro) → avisar se a planilha já foi processada antes →
conferir, corrigir ou excluir → buscar por nome/código/CNPJ/pedido/código de
entrega → ver os dados renderizados dinamicamente → gerar o recibo no
formato oficial → visualizar → gerar PDF (individual ou em lote, um por
escola ou um único arquivo) ou imprimir → consultar o histórico de
importações semanais, o relatório semanal e os dados da empresa.
