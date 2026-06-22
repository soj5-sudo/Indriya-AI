-- Run this once in the Supabase SQL Editor if you already created the schema
-- before the multi-view feature was added.
alter table public.designs
  add column if not exists views jsonb not null default '[]'::jsonb;
