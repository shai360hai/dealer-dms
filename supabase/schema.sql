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
  view_count integer not null default 0, -- public page opens; see migration-add-view-count.sql

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicles_status_published_idx on public.vehicles (status, published);
create index if not exists vehicles_brand_model_idx on public.vehicles (brand, model);
create index if not exists vehicles_year_idx on public.vehicles (year);
create index if not exists vehicles_price_idx on public.vehicles (price);
create index if not exists vehicles_active_idx on public.vehicles (created_at desc) where deleted_at is null;
create index if not exists vehicles_view_count_idx on public.vehicles (view_count desc) where deleted_at is null;

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
create index if not exists vehicle_images_vehicle_order_idx on public.vehicle_images (vehicle_id, order_index);

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
create index if not exists inquiries_active_idx on public.inquiries (created_at desc) where deleted_at is null;

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
  with check (status = 'new' and deleted_at is null);

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
  with check (public.is_staff() and user_id = auth.uid());

-- feature_flags: any staff can read; only super_admin can change them.
drop policy if exists "staff reads flags" on public.feature_flags;
create policy "staff reads flags" on public.feature_flags for select
  using (public.is_staff());

drop policy if exists "super_admin manages flags" on public.feature_flags;
create policy "super_admin manages flags" on public.feature_flags for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ── Storage bucket for vehicle photos ────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-images', 'vehicle-images', true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads vehicle images" on storage.objects;
create policy "public reads vehicle images" on storage.objects for select
  using (bucket_id = 'vehicle-images');

drop policy if exists "staff uploads vehicle images" on storage.objects;
create policy "staff uploads vehicle images" on storage.objects for insert
  with check (bucket_id = 'vehicle-images' and public.is_staff());

drop policy if exists "staff deletes vehicle images" on storage.objects;
create policy "staff deletes vehicle images" on storage.objects for delete
  using (bucket_id = 'vehicle-images' and public.is_staff());

-- ── View counting (see README "Performance and insight") ─────────
-- Anonymous visitors can't UPDATE vehicles, so the counter goes through
-- a SECURITY DEFINER function that can only ever add 1 to view_count on
-- a published vehicle.
create or replace function public.increment_vehicle_view(vehicle_slug text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.vehicles
     set view_count = view_count + 1
   where slug = vehicle_slug
     and published = true
     and status = 'available'
     and deleted_at is null;
end;
$$;

grant execute on function public.increment_vehicle_view(text) to anon, authenticated;

-- ── Hardening (mirrors migration-harden-security.sql) ────────────

-- ── 1. Internal dealer notes are not public ─────────────────────────
-- RLS limits which *rows* the public can read, not which columns. Before
-- this, `dealer_notes` ("הערות פנימיות" — purchase price, margins, notes
-- about the seller) was readable by anyone for every published car.
-- Column-level grants fix that: anonymous visitors can read every
-- column except dealer_notes. Signed-in staff are unaffected.
revoke select on public.vehicles from anon;
grant select (
  id, slug, brand, model, trim, year, price, stock_number, vin,
  mileage, engine, horsepower, battery_capacity, driving_range,
  fuel_type, transmission, drive_type, owners,
  exterior_color, interior_color,
  description, features, safety_features, warranty, service_history, location,
  status, published, deleted_at, view_count, created_at, updated_at
) on public.vehicles to anon;

-- ── 2. Only managers can delete or restore vehicles ─────────────────
-- Deleting is a soft delete (an UPDATE of deleted_at), and editors are
-- allowed to UPDATE vehicles — so editors could delete despite the role
-- table saying otherwise. This trigger enforces the rule on the column
-- itself. Direct SQL (postgres / service_role) is still allowed.
create or replace function public.guard_vehicle_soft_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.deleted_at is distinct from old.deleted_at
     and current_user not in ('postgres', 'service_role')
     and not coalesce(public.is_manager(), false) then
    raise exception 'רק מנהל (admin או super_admin) יכול למחוק או לשחזר רכבים'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_guard_soft_delete on public.vehicles;
create trigger vehicles_guard_soft_delete
  before update on public.vehicles
  for each row execute function public.guard_vehicle_soft_delete();

-- ── 3. Never lock everyone out of user management ───────────────────
-- Demoting or deactivating the last active super_admin would leave
-- nobody able to manage roles from the app.
create or replace function public.guard_last_super_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.role = 'super_admin' and old.active
     and (new.role <> 'super_admin' or not new.active)
     and not exists (
       select 1 from public.profiles
       where role = 'super_admin' and active and id <> old.id
     ) then
    raise exception 'לא ניתן להסיר את מנהל המערכת האחרון' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_last_super_admin on public.profiles;
create trigger profiles_guard_last_super_admin
  before update on public.profiles
  for each row execute function public.guard_last_super_admin();

-- ── 4. Public inquiry submissions can only set the form's fields ─────
-- The insert policy was `with check (true)`, so an anonymous caller
-- could create inquiries pre-marked as contacted/closed or already in
-- the bin, and with unbounded text.
revoke insert on public.inquiries from anon;
grant insert (vehicle_id, full_name, phone, email, message) on public.inquiries to anon;

-- NOT VALID: enforced for every new row without failing on any
-- historical row that happens to exceed the limits.
do $$ begin
  alter table public.inquiries add constraint inquiries_field_lengths check (
    char_length(full_name) between 1 and 120
    and char_length(phone) <= 30
    and char_length(email) <= 254
    and coalesce(char_length(message), 0) <= 2000
  ) not valid;
exception when duplicate_object then null; end $$;
