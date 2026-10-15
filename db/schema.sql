-- Inscrições feitas pelo site "Próximos Passos" e lidas pelo Painel da Staff (/admin).
-- Rodar com: psql "$DATABASE_URL" -f db/schema.sql  (idempotente)
-- Bancos já existentes: aplicar também as migrações db/00*.sql em ordem.

create table if not exists inscricoes (
  id            uuid primary key default gen_random_uuid(),
  criado_em     timestamptz not null default now(),
  nome          text not null,
  email         text not null,
  telefone      text not null,
  estado_civil  text not null,
  bairro        text not null,
  cidade        text not null,
  primeira_vez  boolean not null,
  -- generosidade | gc | curso | servir
  passos        text[] not null
    check (cardinality(passos) > 0 and passos <@ array['generosidade', 'gc', 'curso', 'servir']),
  dias_gc       text[] not null default '{}',
  data_nascimento date,
  -- Acompanhamento da staff
  status        text not null default 'novo'
    check (status in ('novo', 'em_contato', 'concluido')),
  observacoes   text,
  atualizado_em timestamptz not null default now()
);

create index if not exists inscricoes_criado_em_idx on inscricoes (criado_em desc);
create index if not exists inscricoes_passos_idx on inscricoes using gin (passos);
create index if not exists inscricoes_status_idx on inscricoes (status);
create index if not exists inscricoes_aniversario_idx
  on inscricoes ((extract(month from data_nascimento)), (extract(day from data_nascimento)));
