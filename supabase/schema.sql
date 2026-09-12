-- Schema do banco de dados do sistema de Recibos de Entrega (Grupo Líder).
-- Rode este arquivo inteiro em: Supabase → SQL Editor → New query → Run.
--
-- Segurança: por enquanto o Row Level Security (RLS) fica desligado nestas
-- tabelas de propósito — o sistema usa um login próprio simples (não o
-- Supabase Auth), então não há como o Postgres diferenciar "usuário
-- autenticado" do jeito que o RLS espera. Isso é consistente com o que já
-- era true antes (login sem segurança real, documentado no README): quem
-- tem o link do site consegue ler/gravar essas tabelas. Como não há dados
-- sensíveis de terceiros (só recibos de entrega de merenda escolar), esse
-- é um trade-off aceitável para o tamanho do sistema hoje.

create table if not exists escolas_cadastradas (
  id text primary key,
  nome text not null,
  apelidos text[] not null default '{}',
  codigo_escola text,
  cnpj text,
  endereco jsonb not null default '{}'::jsonb,
  horario_funcionamento text,
  criado_em timestamptz not null default now()
);

create table if not exists recibos_preparados (
  id text primary key,
  entrega jsonb not null,
  status text not null,
  problemas jsonb not null default '[]'::jsonb,
  origem text not null default 'importacao',
  -- Uma planilha inteira é inserida numa única operação, então "criado_em"
  -- fica igual em todas as linhas — esta coluna garante a ordem de exibição
  -- (mesma ordem da planilha original) mesmo com timestamps empatados.
  sequencia bigint generated always as identity,
  criado_em timestamptz not null default now()
);

create table if not exists historico_importacoes (
  id text primary key,
  nome_arquivo text not null,
  tamanho_bytes bigint not null,
  data_importacao timestamptz not null,
  total_linhas integer not null,
  total_escolas integer not null,
  total_recibos integer not null,
  total_com_erro integer not null,
  total_duplicados integer not null,
  status text not null,
  hash_conteudo text not null,
  criado_em timestamptz not null default now()
);

create index if not exists historico_importacoes_hash_idx on historico_importacoes (hash_conteudo);
