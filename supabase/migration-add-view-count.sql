-- Tracks how many times each vehicle's page has been opened, so the
-- dealership can see which stock is actually drawing interest.
--
-- Run once in Supabase → SQL Editor. Safe to re-run.

alter table public.vehicles
  add column if not exists view_count integer not null default 0;

comment on column public.vehicles.view_count is
  'Number of times the public vehicle page has been opened.';

-- Visitors are anonymous and RLS (rightly) forbids them updating the
-- vehicles table, so incrementing goes through a SECURITY DEFINER
-- function instead. It can only ever add 1 to view_count on a published
-- vehicle — it cannot touch prices, status, or anything else.
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

create index if not exists vehicles_view_count_idx
  on public.vehicles (view_count desc) where deleted_at is null;
