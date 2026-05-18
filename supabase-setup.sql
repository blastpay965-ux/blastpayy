-- ============================================================
-- BlastPay — Supabase Postgres Schema (Full Standard App)
-- Run this ENTIRE script in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       text unique not null,
  account_number text unique not null,
  is_guest       boolean default false not null,
  contact        text default '',
  balance        numeric(15,2) default 0.00 not null,
  created_at     timestamptz default now()
);

-- ── transactions ──────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('deposit', 'withdrawal')),
  amount     numeric(15,2) not null,
  currency   text default 'NGN' not null,
  status     text default 'successful' not null check (status in ('successful', 'pending', 'failed')),
  reference  text,
  created_at timestamptz default now()
);

-- ── game_rounds ───────────────────────────────────────────────────────────────
create table if not exists public.game_rounds (
  id            uuid primary key default gen_random_uuid(),
  game_type     text not null check (game_type in ('crash', 'mines', 'plinko', 'dice', 'limbo', 'wheel', 'roulette', 'slots', 'keno', 'hilo', 'blackjack', 'baccarat')),
  server_seed   text not null,
  client_seed   text,
  final_outcome text,
  status        text default 'active' not null check (status in ('active', 'completed')),
  created_at    timestamptz default now(),
  completed_at  timestamptz
);

-- ── bets ──────────────────────────────────────────────────────────────────────
create table if not exists public.bets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  game_round_id uuid references public.game_rounds(id) on delete set null,
  game_type     text not null check (game_type in ('crash', 'mines', 'plinko', 'dice', 'limbo', 'wheel', 'roulette', 'slots', 'keno', 'hilo', 'blackjack', 'baccarat')),
  bet_amount    numeric(15,2) not null,
  multiplier    numeric(10,2),
  payout_amount numeric(15,2) default 0.00 not null,
  created_at    timestamptz default now()
);

-- ── admin_config (singleton row) ──────────────────────────────────────────────
create table if not exists public.admin_config (
  id                      integer primary key default 1,
  crash_house_edge        numeric(5,2)  default 5    not null,
  crash_max_multiplier    numeric(10,2) default 100  not null,
  mines_house_edge        numeric(5,2)  default 5    not null,
  is_rigged               boolean default false       not null,
  next_crash_multiplier   numeric(10,2),
  mines_rigged_next_click text,
  plinko_house_edge       numeric(5,2)  default 5    not null,
  plinko_rigged_bucket    text,
  global_rig_outcome      text,
  sandbox_payment_mode    boolean default true        not null,
  banned_users            text[] default '{}'         not null,
  frozen_users            text[] default '{}'         not null,
  total_deposits          numeric(15,2) default 254000 not null,
  total_withdrawals       numeric(15,2) default 112000 not null,
  active_users_count      integer default 148         not null,
  simulated_growth        numeric(8,2)  default 15.4  not null,
  updated_at              timestamptz default now()
);

-- Seed the singleton config row
insert into public.admin_config (id) values (1) on conflict (id) do nothing;

-- ── Row-Level Security ────────────────────────────────────────────────────────

-- profiles: users can read and update only their own row
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Service role (Next.js server) can insert profiles on registration
create policy "Service role can insert profiles"
  on public.profiles for insert
  with check (true);

-- transactions: users can only read their own transactions
alter table public.transactions enable row level security;

create policy "Users can read own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Service role can insert transactions"
  on public.transactions for insert
  with check (true);

-- bets: users can only read their own bets
alter table public.bets enable row level security;

create policy "Users can read own bets"
  on public.bets for select
  using (auth.uid() = user_id);

create policy "Service role can manage bets"
  on public.bets for all
  using (true)
  with check (true);

-- game_rounds: everyone can read completed rounds (for provably fair verification)
alter table public.game_rounds enable row level security;

create policy "Anyone can read completed rounds"
  on public.game_rounds for select
  using (status = 'completed');

create policy "Service role can manage game rounds"
  on public.game_rounds for all
  using (true)
  with check (true);

-- admin_config: no public access (service role key only from server)
alter table public.admin_config enable row level security;
-- No public policies — all access is via SUPABASE_SERVICE_ROLE_KEY on the server

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Enable realtime on profiles so WalletContext can subscribe to balance changes
-- Note: Re-running this won't break if already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END
$$;
