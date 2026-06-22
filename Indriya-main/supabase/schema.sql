-- ============================================================
-- Indriya Atelier — schema + RLS
-- Run in: Supabase dashboard -> SQL Editor -> New query -> Run
-- ============================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'designer',  -- 'designer' | 'customization_team'
  created_at  timestamptz not null default now()
);

-- ---------- chats ----------
create table if not exists public.chats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'New design',
  created_at  timestamptz not null default now()
);
create index if not exists chats_user_idx on public.chats (user_id, created_at desc);

-- ---------- messages ----------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null references public.chats (id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text,
  attachments jsonb not null default '[]'::jsonb,  -- [{type:'reference'|'sketch', url}]
  created_at  timestamptz not null default now()
);
create index if not exists messages_chat_idx on public.messages (chat_id, created_at);

-- ---------- designs ----------
create table if not exists public.designs (
  id                uuid primary key default gen_random_uuid(),
  message_id        uuid not null references public.messages (id) on delete cascade,
  option_index      int not null,                 -- 0,1,2
  title             text,
  image_url         text,
  bill_of_materials jsonb not null default '{}'::jsonb,
  -- Extra viewpoints generated lazily on inquire: [{view, url}]. Empty until then.
  views             jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists designs_message_idx on public.designs (message_id, option_index);

-- ---------- inquiries ----------
create table if not exists public.inquiries (
  id              uuid primary key default gen_random_uuid(),
  chat_id         uuid not null references public.chats (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  design_id       uuid references public.designs (id) on delete set null,
  customer_notes  text,
  status          text not null default 'pending'
                    check (status in ('pending','feasible','not_feasible','needs_info')),
  created_at      timestamptz not null default now()
);
create index if not exists inquiries_user_idx on public.inquiries (user_id, created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles  enable row level security;
alter table public.chats     enable row level security;
alter table public.messages  enable row level security;
alter table public.designs   enable row level security;
alter table public.inquiries enable row level security;

-- helper: is the current user a member of the customization team?
create or replace function public.is_customization_team()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'customization_team'
  );
$$;

-- ---- profiles: a user sees/edits only their own row ----
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ---- chats: owner only ----
drop policy if exists chats_owner on public.chats;
create policy chats_owner on public.chats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- messages: only within chats the user owns ----
drop policy if exists messages_owner on public.messages;
create policy messages_owner on public.messages
  for all
  using (exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid()));

-- ---- designs: only within messages in the user's chats ----
drop policy if exists designs_owner on public.designs;
create policy designs_owner on public.designs
  for all
  using (exists (
    select 1 from public.messages m
    join public.chats c on c.id = m.chat_id
    where m.id = message_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.messages m
    join public.chats c on c.id = m.chat_id
    where m.id = message_id and c.user_id = auth.uid()
  ));

-- ---- inquiries: owner OR customization team (team is read-only across all) ----
drop policy if exists inquiries_owner_rw on public.inquiries;
create policy inquiries_owner_rw on public.inquiries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists inquiries_team_read on public.inquiries;
create policy inquiries_team_read on public.inquiries
  for select using (public.is_customization_team());

drop policy if exists inquiries_team_update on public.inquiries;
create policy inquiries_team_update on public.inquiries
  for update using (public.is_customization_team());

-- ============================================================
-- Storage bucket for uploaded references + exported sketches
-- ============================================================
insert into storage.buckets (id, name, public)
values ('designs', 'designs', true)
on conflict (id) do nothing;

-- authenticated users may upload; objects are world-readable (public bucket)
drop policy if exists designs_upload on storage.objects;
create policy designs_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'designs');

drop policy if exists designs_read on storage.objects;
create policy designs_read on storage.objects
  for select using (bucket_id = 'designs');
