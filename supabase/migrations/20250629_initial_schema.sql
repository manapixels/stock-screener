-- Create profiles table for user metadata
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  telegram_chat_id text,
  telegram_bot_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create watchlist items table
create table public.watchlist_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  symbol text not null,
  company_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create stock notes table
create table public.stock_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  symbol text not null,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create alerts table
create table public.alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  symbol text not null,
  alert_type text not null, -- 'PE_RATIO_BELOW', 'RSI_BELOW', etc.
  threshold numeric not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.stock_notes enable row level security;
alter table public.alerts enable row level security;

-- Create policies for profiles
create policy "Users can view own profile" on public.profiles
  for select using ((select auth.uid()) = id);

create policy "Users can update own profile" on public.profiles
  for update using ((select auth.uid()) = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check ((select auth.uid()) = id);

-- Create policies for watchlist_items
create policy "Users can view own watchlist items" on public.watchlist_items
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert own watchlist items" on public.watchlist_items
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update own watchlist items" on public.watchlist_items
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete own watchlist items" on public.watchlist_items
  for delete using ((select auth.uid()) = user_id);

-- Create policies for stock_notes
create policy "Users can view own stock notes" on public.stock_notes
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert own stock notes" on public.stock_notes
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update own stock notes" on public.stock_notes
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete own stock notes" on public.stock_notes
  for delete using ((select auth.uid()) = user_id);

-- Create policies for alerts
create policy "Users can view own alerts" on public.alerts
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert own alerts" on public.alerts
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update own alerts" on public.alerts
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete own alerts" on public.alerts
  for delete using ((select auth.uid()) = user_id);

-- Create indexes for better performance
create index idx_watchlist_user_id on public.watchlist_items(user_id);
create index idx_watchlist_symbol on public.watchlist_items(symbol);
create index idx_stock_notes_user_id on public.stock_notes(user_id);
create index idx_stock_notes_symbol on public.stock_notes(symbol);
create index idx_alerts_user_id on public.alerts(user_id);
create index idx_alerts_symbol on public.alerts(symbol);
create index idx_alerts_active on public.alerts(is_active);

-- Function to handle profile creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile when user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_stock_notes_updated_at before update on public.stock_notes
  for each row execute procedure public.handle_updated_at();

create trigger handle_alerts_updated_at before update on public.alerts
  for each row execute procedure public.handle_updated_at();