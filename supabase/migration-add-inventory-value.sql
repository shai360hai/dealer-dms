-- Total value of active stock, summed in the database. The dashboard
-- used to fetch every price and add them up in the browser, which
-- silently under-reported once stock passed PostgREST's row cap
-- (max-rows, 1000 by default on Supabase).
--
-- Run once in Supabase → SQL Editor. Safe to re-run.

-- SECURITY INVOKER, so RLS still decides which vehicles are counted:
-- staff see all of them, nobody else gets to call it.
create or replace function public.inventory_value()
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(price), 0)
    from public.vehicles
   where deleted_at is null
     and status <> 'sold';
$$;

-- New functions are executable by PUBLIC (and, on Supabase, anon) by
-- default, so take that away before granting to signed-in users.
revoke execute on function public.inventory_value() from public, anon;
grant execute on function public.inventory_value() to authenticated;
