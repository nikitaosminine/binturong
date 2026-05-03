alter table public.portfolios
  add column if not exists cash_value numeric(18, 6) not null default 0,
  add column if not exists primary_exchange text;

alter table public.holdings
  add column if not exists asset_type text;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  date date not null,
  symbol text not null,
  isin text,
  yahoo_ticker text,
  side text not null check (side in ('BUY', 'SELL', 'DEP', 'WD', 'DIV', 'FEE')),
  quantity numeric(18, 6),
  net_amount numeric(18, 6),
  commission numeric(18, 6) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

drop policy if exists "Users can view transactions of their portfolios" on public.transactions;
create policy "Users can view transactions of their portfolios"
  on public.transactions for select
  using (
    exists (
      select 1 from public.portfolios
      where id = portfolio_id and user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert transactions into their portfolios" on public.transactions;
create policy "Users can insert transactions into their portfolios"
  on public.transactions for insert
  with check (
    exists (
      select 1 from public.portfolios
      where id = portfolio_id and user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete transactions from their portfolios" on public.transactions;
create policy "Users can delete transactions from their portfolios"
  on public.transactions for delete
  using (
    exists (
      select 1 from public.portfolios
      where id = portfolio_id and user_id = auth.uid()
    )
  );

create index if not exists transactions_portfolio_date_idx
  on public.transactions (portfolio_id, date);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  yahoo_ticker text not null,
  date date not null,
  closing_price numeric(18, 6) not null,
  fetched_at timestamptz not null default now(),
  unique (yahoo_ticker, date)
);

alter table public.price_history enable row level security;

drop policy if exists "Authenticated users can read price history" on public.price_history;
create policy "Authenticated users can read price history"
  on public.price_history for select
  to authenticated
  using (true);

create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  date date not null,
  total_value numeric(18, 6) not null,
  cash_balance numeric(18, 6) not null,
  securities_value numeric(18, 6) not null,
  computed_at timestamptz not null default now(),
  unique (portfolio_id, date)
);

alter table public.portfolio_snapshots enable row level security;

drop policy if exists "Users can view snapshots of their portfolios" on public.portfolio_snapshots;
create policy "Users can view snapshots of their portfolios"
  on public.portfolio_snapshots for select
  using (
    exists (
      select 1 from public.portfolios
      where id = portfolio_id and user_id = auth.uid()
    )
  );

drop policy if exists "Service role can insert/update snapshots" on public.portfolio_snapshots;
create policy "Service role can insert/update snapshots"
  on public.portfolio_snapshots for all
  to service_role
  using (true)
  with check (true);

create index if not exists snapshots_portfolio_date_idx
  on public.portfolio_snapshots (portfolio_id, date);
