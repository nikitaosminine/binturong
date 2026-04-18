create table public.theses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  summary text not null default '',
  conviction text not null default 'med' check (conviction in ('low','med','high')),
  status text not null default 'active'
    check (status in ('active','playing-out','invalidated','closed')),
  tickers text[] not null default '{}',
  body jsonb not null default '[]',
  evidence jsonb not null default '[]',
  horizon text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.theses enable row level security;

create policy "Users manage own theses"
  on public.theses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
