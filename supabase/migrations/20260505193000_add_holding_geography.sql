alter table public.holdings
  add column if not exists country_code text,
  add column if not exists country_name text,
  add column if not exists geography_source text not null default 'unknown'
    check (geography_source in ('isin', 'yahoo_profile', 'llm_web', 'unknown')),
  add column if not exists geography_confidence numeric(4, 3) not null default 0
    check (geography_confidence >= 0 and geography_confidence <= 1),
  add column if not exists geography_checked_at timestamptz;

create table if not exists public.holding_geography_allocations (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references public.holdings(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  country_code text not null,
  country_name text not null,
  weight_pct numeric(7, 4) not null check (weight_pct > 0 and weight_pct <= 100),
  source text not null check (source in ('isin', 'yahoo_profile', 'llm_web', 'unknown')),
  confidence numeric(4, 3) not null default 0 check (confidence >= 0 and confidence <= 1),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (holding_id, country_code)
);

create index if not exists holding_geography_allocations_portfolio_idx
  on public.holding_geography_allocations (portfolio_id);

create index if not exists holding_geography_allocations_holding_idx
  on public.holding_geography_allocations (holding_id);

alter table public.holding_geography_allocations enable row level security;

drop policy if exists "Users can view geography allocations of their portfolios"
  on public.holding_geography_allocations;
create policy "Users can view geography allocations of their portfolios"
  on public.holding_geography_allocations for select
  using (
    exists (
      select 1 from public.portfolios
      where id = portfolio_id and user_id = auth.uid()
    )
  );

drop policy if exists "Service role can manage geography allocations"
  on public.holding_geography_allocations;
create policy "Service role can manage geography allocations"
  on public.holding_geography_allocations for all
  to service_role
  using (true)
  with check (true);

drop trigger if exists update_holding_geography_allocations_updated_at
  on public.holding_geography_allocations;
create trigger update_holding_geography_allocations_updated_at
  before update on public.holding_geography_allocations
  for each row execute function public.update_updated_at_column();
