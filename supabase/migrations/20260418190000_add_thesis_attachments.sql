alter table public.theses
  add column if not exists attachments jsonb not null default '[]';
