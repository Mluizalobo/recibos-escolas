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

Publicado na Vercel (importado direto deste repositório GitHub, deploy
automático a cada push na branch `main`). O link fica sob controle da
Vercel (ex: `recibos-escolas.vercel.app`), sem depender de usuário pessoal
do GitHub como acontecia no GitHub Pages.

Login de demonstração (ver "Login" abaixo):

| Usuário | Senha |
|---|---|
| `poliana` | `lider2026` |
| `admin` | `grupolider` |

`vite.config.ts` define `base: '/'` (o site fica na raiz do domínio, como
todo projeto importado na Vercel). As rotas usam `HashRouter` em vez de
`BrowserRouter` em `src/App.tsx` (por isso os links ficam `/#/consulta`,
`/#/lote` etc.) — assim recarregar a página em qualquer rota funciona sem
precisar configurar reescrita de rotas no servidor.

## Instalação e execução

```bash
npm install
npm run dev       # ambiente de desenvolvimento (http://localhost:5173)
npm run build     # build de produção (checagem de tipos + bundle em dist/)
npm run preview   # serve o build de produção localmente
```

O projeto usa o Supabase como banco de dados (ver seção "Banco de dados").
Para rodar localmente, crie um `.env.local` na raiz com:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable
```

A sessão de login continua em `localStorage` (ver seção "Login") — só os
dados compartilhados (escolas cadastradas, recibos preparados, histórico de
importações) ficam no banco.

## Login

`src/services/authService.ts` faz um login **só de front-end**: valida
usuário/senha contra uma lista fixa no próprio código e guarda a sessão no
`localStorage`. **Isso não é segurança real** — qualquer pessoa com acesso
ao código-fonte vê as senhas. Serve para dar à interface um controle básico
de "quem está usando o sistema" (incluindo o perfil da Poliana) enquanto não
existe um backend com autenticação de verdade. Trocar por login real é
reescrever esse arquivo para chamar uma API de auth — `RotaProtegida` em
`App.tsx` (que hoje só verifica `obterSessao()`) não precisa mudar.

## Banco de dados (Supabase)

Escolas cadastradas, recibos preparados e histórico de importações ficam no
Postgres do Supabase (`src/services/supabaseClient.ts`), não mais no
navegador — qualquer computador que acessar o sistema (com login) vê os
mesmos dados. O schema fica em `supabase/schema.sql`; rode esse arquivo uma
vez em **Supabase → SQL Editor** ao configurar um novo projeto.

Segurança: as tabelas ficam com Row Level Security desligado — o login do
sistema é próprio (`authService.ts`), não o Supabase Auth, então não há como
o Postgres diferenciar "usuário autenticado" do jeito que RLS espera. Isso é
consistente com o login já ser "só de front-end" (ver seção "Login"): quem
tem o link do site e a chave `anon`/`publishable` (pública por design, vai
no bundle do site) consegue ler/gravar essas tabelas. Aceitável para o
tamanho do sistema hoje, já que não há dado sensível de terceiros — só
recibos de entrega de merenda escolar.

**Nunca** use a chave `service_role`/`secret` do Supabase (a que começa com
`sb_secret_...` ou é o segundo JWT do projeto) no código do site — essa dá
acesso total ao banco, sem restrição, e não deve aparecer em nada que vá
para o navegador do usuário.

## Fluxo principal (importação semanal)

```
Planilha (.xlsx/.xls)
      │  excelService.ts        → lê o arquivo, calcula hash do conteúdo
      ▼
normalizeService.ts             → mapeia colunas, agrupa linhas por escola/
      │                           entrega, casa com escolasStore.ts (cadastro
      │                           próprio) para preencher dados ausentes,
      │                           valida e classifica cada recibo
      ▼
recibosStore.ts                 → guarda os recibos preparados (Supabase)
      │
      ├─→ api.ts                → disponibiliza para a busca avulsa (Consultar Entrega)
      └─→ historyService.ts     → registra a importação no histórico semanal (Supabase)
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
Recibos importados também podem ser excluídos da lista (ícone de lixeira).

Reenviar uma planilha já processada (mesmo conteúdo) mostra um aviso antes
de reprocessar, para evitar recibos duplicados. Depois de processar, dá para
abrir a planilha original (como foi lida, antes de qualquer normalização)
para conferir contra os dados que o sistema organizou.

Cada planilha importada é de uma prefeitura diferente e pode chegar a
qualquer momento — importar uma planilha nova **nunca apaga** os recibos de
uma importação anterior; elas convivem lado a lado (`ReciboPreparado.importacaoId`
liga cada recibo à planilha que o gerou). A tela "Recibos Preparados" separa
os recibos por planilha (agrupados por município/nome do arquivo quando
"Todas" está selecionado, ou filtrados para ver uma só) e permite excluir uma
planilha inteira sem afetar as outras.

Toda escola que a planilha traz mas que ainda não está em "Escolas
Cadastradas" é cadastrada automaticamente (nome, endereço, horário, código,
CNPJ — o que a planilha trouxer), sem exigir nenhum cadastro manual. Nas
próximas semanas essa escola já é reconhecida.

## Estrutura de pastas

```
src/
├── components/     # UI reutilizável (renderer dinâmico, formulário, recibo,
│                     lote/status, modal de correção, sidebar, logo...)
├── pages/          # Dashboard, Consulta, Importacao, Historico,
│                     RelatorioSemanal, DadosEmpresa, Login
├── services/
│   ├── api.ts              # camada de consulta avulsa (troque aqui por uma API real)
│   ├── supabaseClient.ts   # cliente único do Supabase (ver seção "Banco de dados")
│   ├── excelService.ts     # leitura do arquivo + hash do conteúdo
│   ├── normalizeService.ts # normalizeSpreadsheetData(): mapeia, agrupa, casa com
│   │                         escolasStore.ts e valida
│   ├── escolasStore.ts     # cadastro próprio de escolas (Supabase) + casamento de nomes
│   ├── recibosStore.ts     # recibos preparados (Supabase) — correção/exclusão
│   ├── historyService.ts   # histórico de importações semanais (Supabase)
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
Preparados, Escolas Cadastradas, Histórico, Relatório Semanal e Dados da
Empresa.

## Modo escuro

Alternado pelo botão "Modo escuro"/"Modo claro" na barra lateral
(`themeService.ts`), aplicado como classe `.dark` em `<html>` — a preferência
fica salva no `localStorage` do navegador (não é dado da empresa, então não
precisa ir para o Supabase) e é aplicada antes da página desenhar (script
inline em `index.html`), evitando piscar claro→escuro no carregamento. O
recibo (`ReciboTemplate.tsx`/`ReciboPreview.tsx`) fica sempre claro, mesmo
com o modo escuro ligado — é um documento oficial que precisa imprimir/gerar
PDF exatamente igual independente do tema da interface.

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

CNPJ, endereço, telefone e e-mail reais da empresa ficam em `EMPRESA`
(`src/services/mockData.ts`), exibidos em Dados da Empresa e no cabeçalho do
recibo.

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

Para a importação de planilha, escolas cadastradas e histórico, a fonte de
dados já é real (Supabase) — ver seção "Banco de dados".

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
- A sessão de login ainda fica no `localStorage` do navegador (efeito
  colateral de não ser autenticação real — ver seção "Login"); os demais
  dados (escolas, recibos, histórico) já estão no Supabase e não dependem
  mais do navegador.
- As tabelas do Supabase estão com RLS desligado (ver seção "Banco de
  dados") — aceitável hoje, mas vale revisar se o sistema crescer para
  lidar com dados mais sensíveis ou múltiplas empresas.

## Perguntas que ainda faltam

1. Existe mais de uma aba na planilha, ou os dados sempre vêm na primeira?
2. Além de código da entrega/pedido/CNPJ+data/nome da escola (nessa ordem de
   prioridade hoje), existe outra regra para saber que várias linhas
   pertencem à mesma entrega?
3. A numeração grande do recibo (hoje mapeada do "Pedido", ou inferida pela
   posição na lista no formato matriz) é sequencial por entrega, por rota do
   dia, ou outra lógica?
4. O "Recebido por" é sempre assinado fisicamente no papel impresso, ou
   pode vir preenchido já na planilha (nome de quem vai receber)?
5. Login de verdade: existe (ou vai existir) um backend/provedor de
   autenticação, ou o controle de acesso deve continuar simples assim?

Nenhum dado ausente bloqueia mais a geração do recibo (ver "Fluxo principal"
acima) — a única pendência "que vale a pena resolver antes de gerar" é
mesmo a falta de item com quantidade, e mesmo essa gera o recibo, só fica
marcada para conferência.

## O que já funciona ponta a ponta

Login → importar planilha → ver a planilha original lida → normalizar/
agrupar linhas por escola/entrega → validar e classificar cada recibo
(pronto/pendente/com erro) → avisar se a planilha já foi processada antes →
conferir, corrigir ou excluir → buscar por nome/código/CNPJ/pedido/código de
entrega → ver os dados renderizados dinamicamente → gerar o recibo no
formato oficial → visualizar → gerar PDF (individual ou em lote, um por
escola ou um único arquivo) ou imprimir → consultar o histórico de
importações semanais, o relatório semanal e os dados da empresa.
