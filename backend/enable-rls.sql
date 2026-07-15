-- FoodVault — enable Row Level Security
-- Run this once in Supabase → SQL Editor.
--
-- WHY: the app ships the anon key publicly (in the web bundle and the mobile
-- app). Without RLS, anyone with that key can read/modify every user's data.
-- After enabling RLS the anon key can do nothing on its own, and the backend
-- uses the service_role key (SUPABASE_SERVICE_KEY) to act on behalf of users,
-- filtering by user_id in code.
--
-- Each table below is assumed to have a `user_id uuid` column referencing
-- auth.users(id). Adjust names if yours differ.

-- 1. recipes ---------------------------------------------------------------
alter table public.recipes enable row level security;

drop policy if exists "own recipes" on public.recipes;
create policy "own recipes" on public.recipes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. meal_plans ------------------------------------------------------------
alter table public.meal_plans enable row level security;

drop policy if exists "own meal_plans" on public.meal_plans;
create policy "own meal_plans" on public.meal_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. shopping_items --------------------------------------------------------
alter table public.shopping_items enable row level security;

drop policy if exists "own shopping_items" on public.shopping_items;
create policy "own shopping_items" on public.shopping_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. categories ------------------------------------------------------------
-- If categories are per-user (they have a user_id column), keep this block.
-- If categories are global/shared, DELETE this block and instead leave RLS
-- disabled OR add a read-only "everyone can read" policy.
alter table public.categories enable row level security;

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Verify: this should now return rows only for the calling user, and nothing
-- when queried with just the anon key and no auth session.
