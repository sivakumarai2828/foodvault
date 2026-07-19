-- Run once in Supabase SQL editor.
-- Tracks recipe titles that matched no static-thumbnail keyword, so new
-- library images can be generated manually later (see docs/THUMBNAILS.md).
create table if not exists unmatched_thumb_terms (
  id bigint generated always as identity primary key,
  term text not null unique,
  hit_count int not null default 1,
  sample_title text,
  status text not null default 'pending', -- pending | done | ignored
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table unmatched_thumb_terms enable row level security;
-- No policies: only the backend service role can read/write.
