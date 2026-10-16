-- Minimal stand-in for the parts of a Supabase project that schema.sql
-- depends on (roles, auth.uid(), storage tables, default grants), so the
-- schema and its access rules can be tested against plain Postgres.
-- Test-only — never run this against a real Supabase project.

-- Roles are cluster-wide, so they may survive from an earlier run.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant anon, authenticated, service_role to current_user;

create schema auth;
create schema storage;
create schema extensions;

create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (bucket_id text, name text);
alter table storage.objects enable row level security;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;

-- Supabase grants the API roles full table privileges by default and
-- relies on RLS (plus any explicit revokes) to restrict them.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
