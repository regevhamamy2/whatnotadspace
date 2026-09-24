create extension if not exists pgcrypto;

create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  channel_slug text not null default 'discount-kicks',
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  rotation_seconds integer not null default 20,
  slot_price numeric not null default 250,
  exclusive_price numeric not null default 2000,
  reach_low integer not null default 12000,
  reach_high integer not null default 15000,
  status text not null default 'scheduled',
  exclusive_mode boolean not null default false,
  exclusive_brand text,
  exclusive_message text,
  exclusive_logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.sponsor_slots (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  position integer not null check (position between 1 and 10),
  brand text,
  message text,
  logo_url text,
  active boolean not null default false,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  unique(show_id, position)
);

create index if not exists idx_shows_channel_time on public.shows(channel_slug, starts_at, ends_at);
create index if not exists idx_slots_show on public.sponsor_slots(show_id);

alter table public.shows enable row level security;
alter table public.sponsor_slots enable row level security;
-- No public policies are needed. The app uses a server-side service-role key.
