create table if not exists public.geography_research_jobs (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references public.holdings(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  reason text,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (holding_id)
);

create index if not exists geography_research_jobs_portfolio_idx
  on public.geography_research_jobs (portfolio_id);

create index if not exists geography_research_jobs_status_idx
  on public.geography_research_jobs (status);

alter table public.geography_research_jobs enable row level security;

drop policy if exists "Users can view geography research jobs of their portfolios"
  on public.geography_research_jobs;
create policy "Users can view geography research jobs of their portfolios"
  on public.geography_research_jobs for select
  using (
    exists (
      select 1 from public.portfolios
      where id = portfolio_id and user_id = auth.uid()
    )
  );

drop policy if exists "Service role can manage geography research jobs"
  on public.geography_research_jobs;
create policy "Service role can manage geography research jobs"
  on public.geography_research_jobs for all
  to service_role
  using (true)
  with check (true);

drop trigger if exists update_geography_research_jobs_updated_at
  on public.geography_research_jobs;
create trigger update_geography_research_jobs_updated_at
  before update on public.geography_research_jobs
  for each row execute function public.update_updated_at_column();
