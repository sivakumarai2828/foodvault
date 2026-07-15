-- FoodVault — enable Row Level Security
-- Run this in Supabase → SQL Editor, but ONLY AFTER SUPABASE_SERVICE_KEY is
-- set on the backend (Cloud Run) — otherwise the live app breaks, because the
-- anon key can no longer read the tables and there is no service key to bypass
-- RLS. Correct order: (1) set service key on backend, (2) run this.
--
-- WHY: the app ships the anon key publicly (web bundle + mobile app). Without
-- RLS, anyone with that key can read/modify every user's data. After RLS, the
-- anon key can do nothing on its own; the backend uses the service_role key and
-- filters by user_id in code.
--
-- NOTES:
--  * user_id columns are TEXT while auth.uid() is UUID → cast auth.uid()::text.
--  * `categories` is a GLOBAL/shared table with NO user_id column, so it is
--    intentionally left OUT of this script (RLS stays off for it).

-- 1. recipes ---------------------------------------------------------------
alter table public.recipes enable row level security;

drop policy if exists "own recipes" on public.recipes;
create policy "own recipes" on public.recipes
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- 2. meal_plans ------------------------------------------------------------
alter table public.meal_plans enable row level security;

drop policy if exists "own meal_plans" on public.meal_plans;
create policy "own meal_plans" on public.meal_plans
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- 3. shopping_items --------------------------------------------------------
alter table public.shopping_items enable row level security;

drop policy if exists "own shopping_items" on public.shopping_items;
create policy "own shopping_items" on public.shopping_items
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- categories: intentionally NOT included — global/shared table, no user_id.

-- Verify after running: recipes/meal_plans/shopping_items return rows only for
-- the calling user, and nothing when queried with just the anon key.

-- ── ROLLBACK (if the app breaks) ──────────────────────────────────────────
-- alter table public.recipes disable row level security;
-- alter table public.meal_plans disable row level security;
-- alter table public.shopping_items disable row level security;
