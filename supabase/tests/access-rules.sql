-- Asserts the database's access rules role by role. Run after
-- supabase-stub.sql, schema.sql and seed.sql (see .github/workflows/ci.yml).
-- Any failed expectation raises and stops the script.
\set ON_ERROR_STOP 1
set client_min_messages = notice;
\pset tuples_only on

create function pg_temp.run_as(r text, sub text, stmt text) returns bigint language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claim.sub', coalesce(sub, ''), true);
  execute format('set local role %I', r);
  execute stmt;
  get diagnostics n = row_count;
  return n;
end $$;

-- RLS doesn't raise on a blocked UPDATE/DELETE; it just matches no rows.
create function pg_temp.expect_no_rows(r text, sub text, stmt text, label text) returns void language plpgsql as $$
declare n bigint;
begin
  n := pg_temp.run_as(r, sub, stmt);
  if n <> 0 then raise exception 'FAIL: % — affected % rows', label, n; end if;
  raise notice 'PASS: %', label;
end $$;

create function pg_temp.expect_ok(r text, sub text, stmt text, label text) returns void language plpgsql as $$
begin
  begin
    perform pg_temp.run_as(r, sub, stmt);
  exception when others then
    raise exception 'FAIL: % — unexpected error: %', label, sqlerrm;
  end;
  raise notice 'PASS: %', label;
end $$;

create function pg_temp.expect_denied(r text, sub text, stmt text, label text) returns void language plpgsql as $$
begin
  begin
    perform pg_temp.run_as(r, sub, stmt);
  exception when others then
    raise notice 'PASS: % (denied: %)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % — expected to be denied, but it succeeded', label;
end $$;

-- Fixtures: one user per role, every seeded car published with notes.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'super@test'),
  ('00000000-0000-0000-0000-00000000000b', 'editor@test'),
  ('00000000-0000-0000-0000-00000000000c', 'admin@test');
update public.profiles set role = 'super_admin' where email = 'super@test';
update public.profiles set role = 'admin' where email = 'admin@test';
update public.vehicles set dealer_notes = 'bought for less', published = true;

\set super  '''00000000-0000-0000-0000-00000000000a'''
\set editor '''00000000-0000-0000-0000-00000000000b'''
\set admin  '''00000000-0000-0000-0000-00000000000c'''

-- Anonymous visitors
select pg_temp.expect_denied('anon', null, 'select dealer_notes from public.vehicles', 'anon cannot read dealer_notes');
select pg_temp.expect_denied('anon', null, 'select * from public.vehicles', 'anon cannot select *');
select pg_temp.expect_ok('anon', null, 'select vehicles.id, slug, price, vehicle_images.url from public.vehicles left join public.vehicle_images on vehicle_images.vehicle_id = vehicles.id', 'anon reads public columns and photos');
select pg_temp.expect_no_rows('anon', null, $$update public.vehicles set price = 1$$, 'anon cannot edit vehicles');
select pg_temp.expect_no_rows('anon', null, $$update public.inquiries set status = 'closed'$$, 'anon cannot edit inquiries');
select pg_temp.expect_ok('anon', null, $$insert into public.inquiries (full_name, phone, email) values ('Dana', '0501234567', 'd@x.co')$$, 'anon submits an inquiry');
select pg_temp.expect_denied('anon', null, $$insert into public.inquiries (full_name, phone, email, status) values ('Dana', '0501234567', 'd@x.co', 'closed')$$, 'anon cannot preset inquiry status');
select pg_temp.expect_denied('anon', null, $$insert into public.inquiries (full_name, phone, email, message) values ('Dana', '0501234567', 'd@x.co', repeat('x', 5000))$$, 'anon cannot submit an oversized message');
select pg_temp.expect_no_rows('anon', null, 'select * from public.inquiries', 'anon cannot read inquiries');
select pg_temp.expect_ok('anon', null, $$select public.increment_vehicle_view((select slug from public.vehicles limit 1))$$, 'anon can count a view');

-- Editors
select pg_temp.expect_ok('authenticated', :editor, $$update public.vehicles set price = price + 1$$, 'editor edits vehicles');
select pg_temp.expect_denied('authenticated', :editor, $$update public.vehicles set deleted_at = now()$$, 'editor cannot soft-delete vehicles');
select pg_temp.expect_no_rows('authenticated', :editor, $$delete from public.vehicles$$, 'editor cannot hard-delete vehicles');
select pg_temp.expect_no_rows('authenticated', :editor, $$update public.profiles set role = 'super_admin'$$, 'editor cannot change roles');
select pg_temp.expect_denied('authenticated', :editor, $$insert into public.activity_logs (user_id, action, entity_type) values ('00000000-0000-0000-0000-00000000000a', 'X', 'v')$$, 'editor cannot forge activity for another user');
select pg_temp.expect_ok('authenticated', :editor, $$insert into public.activity_logs (user_id, action, entity_type) values ('00000000-0000-0000-0000-00000000000b', 'X', 'v')$$, 'editor logs own activity');
select pg_temp.expect_ok('authenticated', :editor, 'select dealer_notes from public.vehicles', 'staff read dealer_notes');

-- Admins
select pg_temp.expect_ok('authenticated', :admin, $$update public.vehicles set deleted_at = now() where id = (select min(id::text)::uuid from public.vehicles)$$, 'admin soft-deletes a vehicle');
select pg_temp.expect_ok('authenticated', :admin, $$update public.vehicles set deleted_at = null$$, 'admin restores vehicles');

-- Super admins
select pg_temp.expect_denied('authenticated', :super, $$update public.profiles set role = 'admin' where email = 'super@test'$$, 'last super_admin cannot demote themselves');
select pg_temp.expect_denied('authenticated', :super, $$update public.profiles set active = false where email = 'super@test'$$, 'last super_admin cannot be deactivated');
select pg_temp.expect_ok('authenticated', :super, $$update public.profiles set role = 'super_admin' where email = 'admin@test'$$, 'super_admin promotes another');
select pg_temp.expect_ok('authenticated', :super, $$update public.profiles set role = 'admin' where email = 'super@test'$$, 'non-last super_admin can step down');

\echo 'All access-rule checks passed.'
