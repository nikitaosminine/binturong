alter table public.portfolios
  add column if not exists currency text not null default 'EUR';

alter table public.holdings
  add column if not exists currency text default 'EUR';

update public.portfolios
set currency = 'EUR'
where currency is null or btrim(currency) = '';

update public.holdings
set currency = 'EUR'
where currency is null or btrim(currency) = '';
