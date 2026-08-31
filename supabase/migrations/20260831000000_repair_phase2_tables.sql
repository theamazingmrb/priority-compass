-- ─────────────────────────────────────────
-- Repair: ensure Phase-2 tables exist in production.
-- The migration history table recorded north_star, core_values, and boundaries
-- as applied, but the DDL never actually ran against the live database
-- (PGRST205 "Could not find the table" in production). These statements are
-- idempotent (IF NOT EXISTS) so re-running is safe.
-- ─────────────────────────────────────────

-- North Star (Life Vision)
create table if not exists north_star (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  content     text not null,
  constraint unique_user_north_star unique(user_id)
);
alter table north_star enable row level security;
create policy "Users can view own north star" on north_star
  for select using (auth.uid() = user_id);
create policy "Users can insert own north star" on north_star
  for insert with check (auth.uid() = user_id);
create policy "Users can update own north star" on north_star
  for update using (auth.uid() = user_id);
create policy "Users can delete own north star" on north_star
  for delete using (auth.uid() = user_id);
create index if not exists idx_north_star_user_id on north_star(user_id);
drop trigger if exists update_north_star_updated_at on north_star;
create trigger update_north_star_updated_at
  before update on north_star
  for each row execute function update_updated_at_column();

-- Core Values (What Matters Most)
create table if not exists core_values (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  value_text  text not null,
  value_order int default 0,
  constraint unique_user_value unique(user_id, value_text)
);
alter table core_values enable row level security;
create policy "Users can view own core values" on core_values
  for select using (auth.uid() = user_id);
create policy "Users can insert own core values" on core_values
  for insert with check (auth.uid() = user_id);
create policy "Users can update own core values" on core_values
  for update using (auth.uid() = user_id);
create policy "Users can delete own core values" on core_values
  for delete using (auth.uid() = user_id);
create index if not exists idx_core_values_user_id on core_values(user_id);
create index if not exists idx_core_values_user_order on core_values(user_id, value_order);
drop trigger if exists update_core_values_updated_at on core_values;
create trigger update_core_values_updated_at
  before update on core_values
  for each row execute function update_updated_at_column();

-- Boundaries (Things to say no to)
create table if not exists boundaries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  boundary_text text not null,
  boundary_order int not null default 0,
  description text
);
alter table boundaries enable row level security;
create policy "Users can view own boundaries" on boundaries
  for select using (auth.uid() = user_id);
create policy "Users can insert own boundaries" on boundaries
  for insert with check (auth.uid() = user_id);
create policy "Users can update own boundaries" on boundaries
  for update using (auth.uid() = user_id);
create policy "Users can delete own boundaries" on boundaries
  for delete using (auth.uid() = user_id);
create index if not exists idx_boundaries_user_id on boundaries(user_id);
create index if not exists idx_boundaries_user_order on boundaries(user_id, boundary_order);
drop trigger if exists update_boundaries_updated_at on boundaries;
create trigger update_boundaries_updated_at
  before update on boundaries
  for each row execute function update_updated_at_column();
