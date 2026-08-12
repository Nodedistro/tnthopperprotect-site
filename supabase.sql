-- Run this in Supabase SQL Editor for persistent storage on Vercel.
create table if not exists public.issues (
  id uuid primary key,
  number text not null,
  title text not null,
  category text not null default 'Bug',
  description text not null,
  "minecraftVersion" text,
  "serverSoftware" text,
  contact text,
  status text not null default 'Open',
  "createdAt" timestamptz not null default now()
);

create table if not exists public.updates (
  id uuid primary key,
  title text not null,
  description text not null,
  version text,
  "minecraftVersion" text,
  "downloadUrl" text,
  "createdAt" timestamptz not null default now()
);

alter table public.issues enable row level security;
alter table public.updates enable row level security;

-- The website backend uses your server-only service-role key, which bypasses RLS.
-- Do NOT expose SUPABASE_SERVICE_ROLE_KEY in browser code.
