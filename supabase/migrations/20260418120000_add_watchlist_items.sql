create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  ticker text not null,
  isin text,
  name text not null,
  added_at timestamptz default now() not null,
  unique(user_id, ticker)
);

alter table public.watchlist_items enable row level security;

create policy "Users manage own watchlist"
  on public.watchlist_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
