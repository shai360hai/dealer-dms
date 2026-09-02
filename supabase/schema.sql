-- Dealer DMS — Supabase schema
-- Run this once in your project's SQL Editor (or via `supabase db push`
-- if you're using the CLI). Safe to re-run: everything is IF NOT EXISTS
-- or CREATE OR REPLACE.

-- ── Extensions ────────────────────────────────────────────────
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ── Enums ─────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('super_admin', 'admin', 'editor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vehicle_status as enum ('available', 'reserved', 'sold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fuel_type as enum ('petrol', 'diesel', 'hybrid', 'plugin_hybrid', 'electric');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transmission_type as enum ('manual', 'automatic', 'cvt', 'dct');
exception when duplicate_object then null; end $$;

do $$ begin
  create type drive_type as enum ('fwd', 'rwd', 'awd', 'four_wd');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inquiry_status as enum ('new', 'contacted', 'closed');
exception when duplicate_object then null; end $$;

-- ── Tables ────────────────────────────────────────────────────

-- One row per auth.users row, created automatically (see trigger below).
-- This is where "is this person staff, and what role" actually lives —
-- auth.users itself has no notion of roles.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'editor',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,

  -- General
  brand text not null,
  model text not null,
  trim text,
  year int not null,
  price numeric(12, 2) not null,
  stock_number text not null unique,
  vin text,

  -- Technical
  mileage int not null default 0,
  engine text,
  horsepower int,
  battery_capacity text,
  driving_range int,
  fuel_type fuel_type not null,
  transmission transmission_type not null,
  drive_type drive_type not null,
  owners int not null default 1,

  -- Appearance
  exterior_color text not null,
  interior_color text not null,

  -- Additional
  description text,
  features text[] not null default '{}',
  safety_features text[] not null default '{}',
  warranty text,
  service_history text,
  dealer_notes text,
  location text,

  -- Status / publishing
  status vehicle_status not null default 'available',
  published boolean not null default false,
  deleted_at timestamptz, -- soft delete: null = active, set = in the recycle bin

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicles_status_published_idx on public.vehicles (status, published);
create index if not exists vehicles_brand_model_idx on public.vehicles (brand, model);
create index if not exists vehicles_year_idx on public.vehicles (year);
create index if not exists vehicles_price_idx on public.vehicles (price);

create table if not exists public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  url text not null,
  storage_path text, -- object path in the "vehicle-images" bucket, needed to delete later
  angle text, -- front | rear | right | left | interior; null for ad-hoc uploads
  order_index int not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_images_vehicle_id_idx on public.vehicle_images (vehicle_id);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles (id) on delete set null,
  full_name text not null,
  phone text not null,
  email text not null,
  message text,
  status inquiry_status not null default 'new',
  deleted_at timestamptz, -- soft delete: null = active
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inquiries_status_idx on public.inquiries (status);
create index if not exists inquiries_vehicle_id_idx on public.inquiries (vehicle_id);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

-- ── updated_at triggers ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

drop trigger if exists inquiries_set_updated_at on public.inquiries;
create trigger inquiries_set_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- ── Auto-create a profile row whenever a new auth user is created ──
-- New users default to 'editor' — see README for how to promote your
-- first account to super_admin (there's necessarily a bootstrapping
-- step: nobody starts out able to grant roles through the app).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'editor');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Role-check helper (security definer avoids RLS recursion) ──
create or replace function public.current_role()
returns user_role
language sql
security definer set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.current_role() is not null;
$$;

create or replace function public.is_manager()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.current_role() in ('super_admin', 'admin');
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.current_role() = 'super_admin';
$$;

-- ── Row Level Security ──────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_images enable row level security;
alter table public.inquiries enable row level security;
alter table public.activity_logs enable row level security;
alter table public.feature_flags enable row level security;

-- profiles: everyone can read their own row; staff can read every row;
-- only super_admin can change roles/active status.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select
  using (id = auth.uid() or public.is_staff());

drop policy if exists "super_admin manages profiles" on public.profiles;
create policy "super_admin manages profiles" on public.profiles for update
  using (public.is_super_admin());

-- vehicles: public sees published+available only; staff sees everything;
-- editor/admin/super_admin can create/edit; only admin+ can delete.
drop policy if exists "public reads published vehicles" on public.vehicles;
create policy "public reads published vehicles" on public.vehicles for select
  using (published = true and status = 'available' and deleted_at is null);

drop policy if exists "staff reads all vehicles" on public.vehicles;
create policy "staff reads all vehicles" on public.vehicles for select
  using (public.is_staff());

drop policy if exists "staff creates vehicles" on public.vehicles;
create policy "staff creates vehicles" on public.vehicles for insert
  with check (public.is_staff());

drop policy if exists "staff updates vehicles" on public.vehicles;
create policy "staff updates vehicles" on public.vehicles for update
  using (public.is_staff());

drop policy if exists "managers delete vehicles" on public.vehicles;
create policy "managers delete vehicles" on public.vehicles for delete
  using (public.is_manager());

-- vehicle_images: readable wherever the parent vehicle is readable;
-- writable by staff.
drop policy if exists "read images of visible vehicles" on public.vehicle_images;
create policy "read images of visible vehicles" on public.vehicle_images for select
  using (
    public.is_staff()
    or exists (
      select 1 from public.vehicles v
      where v.id = vehicle_images.vehicle_id
        and v.published = true
        and v.status = 'available'
        and v.deleted_at is null
    )
  );

drop policy if exists "staff manages images" on public.vehicle_images;
create policy "staff manages images" on public.vehicle_images for all
  using (public.is_staff())
  with check (public.is_staff());

-- inquiries: anyone can submit one (that's the whole point of the public
-- contact form); only staff can read or manage them afterward.
drop policy if exists "anyone can submit an inquiry" on public.inquiries;
create policy "anyone can submit an inquiry" on public.inquiries for insert
  with check (true);

drop policy if exists "staff reads inquiries" on public.inquiries;
create policy "staff reads inquiries" on public.inquiries for select
  using (public.is_staff());

drop policy if exists "staff updates inquiries" on public.inquiries;
create policy "staff updates inquiries" on public.inquiries for update
  using (public.is_staff());

-- activity_logs: staff-only, written by the app on behalf of the
-- signed-in user.
drop policy if exists "staff reads activity" on public.activity_logs;
create policy "staff reads activity" on public.activity_logs for select
  using (public.is_staff());

drop policy if exists "staff writes activity" on public.activity_logs;
create policy "staff writes activity" on public.activity_logs for insert
  with check (public.is_staff());

-- feature_flags: any staff can read; only super_admin can change them.
drop policy if exists "staff reads flags" on public.feature_flags;
create policy "staff reads flags" on public.feature_flags for select
  using (public.is_staff());

drop policy if exists "super_admin manages flags" on public.feature_flags;
create policy "super_admin manages flags" on public.feature_flags for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ── Storage bucket for vehicle photos ────────────────────────────
insert into storage.buckets (id, name, public)
values ('vehicle-images', 'vehicle-images', true)
on conflict (id) do nothing;

drop policy if exists "public reads vehicle images" on storage.objects;
create policy "public reads vehicle images" on storage.objects for select
  using (bucket_id = 'vehicle-images');

drop policy if exists "staff uploads vehicle images" on storage.objects;
create policy "staff uploads vehicle images" on storage.objects for insert
  with check (bucket_id = 'vehicle-images' and public.is_staff());

drop policy if exists "staff deletes vehicle images" on storage.objects;
create policy "staff deletes vehicle images" on storage.objects for delete
  using (bucket_id = 'vehicle-images' and public.is_staff());
