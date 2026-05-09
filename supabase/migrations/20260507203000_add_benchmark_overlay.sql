create table if not exists public.saved_benchmarks (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  name text not null,
  ticker text not null,
  weights jsonb,
  color text not null,
  created_at timestamptz not null default now()
);

alter table public.saved_benchmarks enable row level security;

drop policy if exists "Users can view saved benchmarks of their portfolios"
  on public.saved_benchmarks;
create policy "Users can view saved benchmarks of their portfolios"
  on public.saved_benchmarks for select
  using (
    exists (
      select 1 from public.portfolios
      where id = portfolio_id and user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert saved benchmarks into their portfolios"
  on public.saved_benchmarks;
create policy "Users can insert saved benchmarks into their portfolios"
  on public.saved_benchmarks for insert
  with check (
    exists (
      select 1 from public.portfolios
      where id = portfolio_id and user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete saved benchmarks from their portfolios"
  on public.saved_benchmarks;
create policy "Users can delete saved benchmarks from their portfolios"
  on public.saved_benchmarks for delete
  using (
    exists (
      select 1 from public.portfolios
      where id = portfolio_id and user_id = auth.uid()
    )
  );

drop policy if exists "Service role can manage saved benchmarks"
  on public.saved_benchmarks;
create policy "Service role can manage saved benchmarks"
  on public.saved_benchmarks for all
  to service_role
  using (true)
  with check (true);

create index if not exists saved_benchmarks_portfolio_idx
  on public.saved_benchmarks (portfolio_id);

create table if not exists public.benchmark_price_history (
  ticker text not null,
  date date not null,
  close numeric(18, 6) not null,
  fetched_at timestamptz not null default now(),
  primary key (ticker, date),
  unique (ticker, date)
);

alter table public.benchmark_price_history enable row level security;

drop policy if exists "Authenticated users can read benchmark price history"
  on public.benchmark_price_history;
create policy "Authenticated users can read benchmark price history"
  on public.benchmark_price_history for select
  to authenticated
  using (true);

drop policy if exists "Service role can manage benchmark price history"
  on public.benchmark_price_history;
create policy "Service role can manage benchmark price history"
  on public.benchmark_price_history for all
  to service_role
  using (true)
  with check (true);