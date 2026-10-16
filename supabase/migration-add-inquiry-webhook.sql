-- Fires the notify-inquiry edge function whenever a customer submits an
-- inquiry, so a new lead reaches the dealership immediately instead of
-- waiting for someone to open the admin panel.
--
-- Prerequisites:
--   1. Deploy the function first:
--        supabase functions deploy notify-inquiry --no-verify-jwt
--   2. Set its secrets (see the comment at the top of
--      supabase/functions/notify-inquiry/index.ts).
--   3. Replace the three placeholders below, then run this file in
--      Supabase → SQL Editor. YOUR_WEBHOOK_SECRET must match the
--      function's WEBHOOK_SECRET secret — it's what stops anyone on the
--      internet from calling the (public, --no-verify-jwt) function and
--      sending email to your sales inbox. Generate one with:
--        openssl rand -hex 32

-- pg_net makes outbound HTTP calls from Postgres. It ships with
-- Supabase but has to be enabled once.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_inquiry()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  function_url text := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-inquiry';
  anon_key text := 'YOUR_ANON_KEY';
  webhook_secret text := 'YOUR_WEBHOOK_SECRET';
begin
  -- Fire-and-forget: pg_net queues the request and returns immediately,
  -- so a slow or failing mail provider can never delay or fail the
  -- customer's form submission.
  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'record', to_jsonb(new)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_inquiry_created on public.inquiries;
create trigger on_inquiry_created
  after insert on public.inquiries
  for each row execute function public.notify_new_inquiry();
