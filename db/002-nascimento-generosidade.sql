-- 2026-10-15: faixa etária vira data de nascimento; "Abençoar" vira "Generosidade".
-- Rodar com: psql "$DATABASE_URL" -f db/002-nascimento-generosidade.sql  (idempotente)

begin;

alter table inscricoes add column if not exists data_nascimento date;
-- Inscrições antigas (se houver) ficam sem data; as novas sempre trazem
alter table inscricoes drop column if exists faixa_etaria;

update inscricoes set passos = array_replace(passos, 'abencoar', 'generosidade')
  where 'abencoar' = any(passos);

alter table inscricoes drop constraint if exists inscricoes_passos_check;
alter table inscricoes add constraint inscricoes_passos_check
  check (cardinality(passos) > 0 and passos <@ array['generosidade', 'gc', 'curso', 'servir']);

create index if not exists inscricoes_aniversario_idx
  on inscricoes ((extract(month from data_nascimento)), (extract(day from data_nascimento)));

commit;
