-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

create table if not exists goals (
  user_id uuid references auth.users(id) primary key,
  weight numeric not null default 75,
  calories numeric not null default 2100,
  protein numeric not null default 135,
  water numeric not null default 2600,
  updated_at timestamp with time zone default now()
);

create table if not exists logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) not null,
  date date not null,
  foods jsonb not null default '[]',
  water numeric not null default 0,
  created_at timestamp with time zone default now(),
  unique (user_id, date)
);

alter table goals enable row level security;
alter table logs enable row level security;

create policy "own goals" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own logs" on logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
