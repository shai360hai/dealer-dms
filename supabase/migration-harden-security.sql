-- Security hardening. Closes gaps between what the app's UI promises
-- and what the database actually enforces — the UI is not a security
-- boundary, since anyone can call the Supabase REST API directly with
-- the public anon key.
--
-- Run once in Supabase → SQL Editor, after the other migrations. Safe
-- to re-run. New projects created from schema.sql already include all
-- of this.

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

drop policy if exists "anyone can submit an inquiry" on public.inquiries;
create policy "anyone can submit an inquiry" on public.inquiries for insert
  with check (status = 'new' and deleted_at is null);

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

-- ── 5. Activity log entries can't be forged ─────────────────────────
-- Staff could previously write log rows attributed to any other user.
drop policy if exists "staff writes activity" on public.activity_logs;
create policy "staff writes activity" on public.activity_logs for insert
  with check (public.is_staff() and user_id = auth.uid());

-- ── 6. The public photo bucket only accepts reasonably sized images ──
update storage.buckets
   set file_size_limit = 10485760, -- 10 MB
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
 where id = 'vehicle-images';
