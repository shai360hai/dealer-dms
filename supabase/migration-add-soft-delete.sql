-- Soft delete for vehicles and inquiries.
--
-- Deleting now sets deleted_at instead of removing the row, so the admin
-- can review what was deleted and restore it. Permanent deletion is
-- still available separately.
--
-- Run once in Supabase → SQL Editor. Safe to re-run.

alter table public.vehicles
  add column if not exists deleted_at timestamptz;

alter table public.inquiries
  add column if not exists deleted_at timestamptz;

comment on column public.vehicles.deleted_at is
  'Soft delete marker. Null = active. Set = in the recycle bin, hidden from the public site.';

comment on column public.inquiries.deleted_at is
  'Soft delete marker. Null = active.';

-- Partial indexes: almost every query filters to the active rows, so
-- indexing only those keeps them small and fast.
create index if not exists vehicles_active_idx
  on public.vehicles (created_at desc) where deleted_at is null;

create index if not exists inquiries_active_idx
  on public.inquiries (created_at desc) where deleted_at is null;

-- The public site must never show a deleted vehicle, even if it's still
-- marked published/available — so the read policy gets the extra check.
drop policy if exists "public reads published vehicles" on public.vehicles;
create policy "public reads published vehicles" on public.vehicles for select
  using (published = true and status = 'available' and deleted_at is null);

-- Same for the images attached to them.
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
