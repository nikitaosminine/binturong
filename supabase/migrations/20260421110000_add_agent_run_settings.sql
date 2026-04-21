create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  portfolio_id uuid references public.portfolios(id) on delete cascade,
  trigger_type text not null check (trigger_type in ('scheduled', 'ondemand')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled', 'failed_validation')),
  idempotency_key text not null unique,
  scope_hash text not null,
  model_main text,
  model_sub text,
  token_usage jsonb not null default '{}'::jsonb,
  error_code text,
  error_detail text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agent_runs_user_created_idx
  on public.agent_runs (user_id, created_at desc);

create index agent_runs_status_created_idx
  on public.agent_runs (status, created_at);

create index agent_runs_portfolio_created_idx
  on public.agent_runs (portfolio_id, created_at desc);

alter table public.agent_runs enable row level security;

create policy "Users can view own agent runs"
  on public.agent_runs for select
  using (auth.uid() = user_id);

create policy "Users can create own agent runs"
  on public.agent_runs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own agent runs"
  on public.agent_runs for update
  using (auth.uid() = user_id);

create policy "Users can delete own agent runs"
  on public.agent_runs for delete
  using (auth.uid() = user_id);

create trigger update_agent_runs_updated_at
  before update on public.agent_runs
  for each row execute function public.update_updated_at_column();

create table public.agent_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Europe/Paris',
  global_runs_per_day smallint not null default 2
    check (global_runs_per_day between 1 and 3),
  auto_apply_enabled boolean not null default false,
  auto_apply_min_confidence numeric(4, 3) not null default 0.800
    check (auto_apply_min_confidence >= 0 and auto_apply_min_confidence <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_user_settings enable row level security;

create policy "Users can view own agent settings"
  on public.agent_user_settings for select
  using (auth.uid() = user_id);

create policy "Users can create own agent settings"
  on public.agent_user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own agent settings"
  on public.agent_user_settings for update
  using (auth.uid() = user_id);

create policy "Users can delete own agent settings"
  on public.agent_user_settings for delete
  using (auth.uid() = user_id);

create trigger update_agent_user_settings_updated_at
  before update on public.agent_user_settings
  for each row execute function public.update_updated_at_column();

create table public.agent_portfolio_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  portfolio_id uuid references public.portfolios(id) on delete cascade not null unique,
  runs_per_day_override smallint
    check (runs_per_day_override between 1 and 3),
  agent_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_portfolio_settings_user_portfolio_unique unique (user_id, portfolio_id)
);

create index agent_portfolio_settings_user_idx
  on public.agent_portfolio_settings (user_id);

alter table public.agent_portfolio_settings enable row level security;

create policy "Users can view own agent portfolio settings"
  on public.agent_portfolio_settings for select
  using (auth.uid() = user_id);

create policy "Users can create own agent portfolio settings"
  on public.agent_portfolio_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own agent portfolio settings"
  on public.agent_portfolio_settings for update
  using (auth.uid() = user_id);

create policy "Users can delete own agent portfolio settings"
  on public.agent_portfolio_settings for delete
  using (auth.uid() = user_id);

create trigger update_agent_portfolio_settings_updated_at
  before update on public.agent_portfolio_settings
  for each row execute function public.update_updated_at_column();
