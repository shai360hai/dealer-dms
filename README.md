# Dealer DMS

A car dealership inventory management system: an authenticated admin
dashboard for managing inventory, and a public-facing website that
automatically publishes every vehicle marked **Available**. Hebrew
(RTL) throughout; code and comments in English.

One app, one deploy target. Supabase provides the database,
authentication, and image storage — there's no separate backend to
run or deploy.

## Stack

- React 19 + TypeScript, built with Vite
- React Router (v8 — the package is now just `react-router`, not
  `react-router-dom`)
- Supabase (Postgres, Auth, Storage) via `@supabase/supabase-js`
- TanStack Query for data fetching/caching
- Tailwind CSS v4
- React Hook Form + Zod for forms

## 1. Create your Supabase project

1. [supabase.com](https://supabase.com) → New Project. Pick a name, a
   database password (save it), and a region close to your users.
2. Once it's ready, go to **SQL Editor**, paste the contents of
   `supabase/schema.sql`, and run it. This creates every table, the
   access-control rules, and the image storage bucket.
3. Same again with `supabase/seed.sql` — this loads demo inventory.

> **Already running an older version?** `schema.sql` always describes
> the latest state, but re-running it won't change existing policies
> everywhere. Run each `supabase/migration-*.sql` you haven't yet, and
> in particular **`migration-harden-security.sql`** (see
> [Security model](#security-model)).
4. **Settings → API**: copy the **Project URL** and the **anon /
   public key** — you'll need both next.

## 2. Create your first login

Supabase Auth doesn't have public signup wired up here on purpose —
staff accounts are created by you, not by anyone who finds the login
page.

1. **Authentication → Users → Add user** in the Supabase dashboard.
   Set an email and password.
2. This automatically creates a matching row in `profiles` with the
   default role `editor` (see `schema.sql`'s trigger). To make this
   first account a super admin, go to **SQL Editor** and run:
   ```sql
   update public.profiles set role = 'super_admin' where email = 'you@example.com';
   ```
3. Repeat step 1 for any other staff accounts you want (`admin` or
   `editor` roles can be set the same way).

## 3. Run it locally

```bash
pnpm install
cp .env.example .env
```

Open `.env` and fill in the two Supabase values from step 1.

```bash
pnpm dev
```

Open **http://localhost:5173** — the public site and the admin
dashboard (`/admin`) are both served from this one app. Log in with
the account you created in step 2.

## Roles

| Role | Can do |
|---|---|
| `editor` | Create/edit vehicles, manage inquiries |
| `admin` | Everything `editor` can, plus delete vehicles |
| `super_admin` | Everything `admin` can, plus manage feature flags and other users' roles |

Roles are enforced by the database, not just hidden in the UI — see
below.

## Security model

The browser talks to Supabase directly with the public anon key, so
anyone can call the same API the app does. Every rule therefore lives
in Postgres (`schema.sql`, mirrored in `migration-harden-security.sql`):

- **Visitors** read published, available, non-deleted cars only — and
  never the `dealer_notes` column (column-level grant; RLS alone only
  limits rows). Public queries name their columns via
  `src/lib/vehicle-columns.ts`; a unit test keeps that list in step with
  the SQL grant.
- **Visitors** may submit inquiries, but only the form's own fields,
  with length limits. The form also has a honeypot field against bots.
- **Deleting/restoring vehicles** (a soft delete, i.e. an UPDATE) is
  restricted to admin/super_admin by a trigger, since editors may
  otherwise update vehicles.
- The **last active super_admin** can't be demoted or deactivated.
- **Activity log** rows must be attributed to the user writing them.
- The **photo bucket** accepts images only, up to 10 MB.

`supabase/tests/access-rules.sql` checks all of this role by role and
runs in CI against plain Postgres.

## Importing vehicles from CSV

**Admin → רכבים → ייבוא מ-CSV.** Drop in a **.csv or .xlsx/.xlsm** file
whose header row uses
the same Hebrew field names as the vehicle form (יצרן, דגם, שנה, מחיר,
מספר מלאי…). The importer:

- maps Hebrew headers to database columns (tolerating apostrophe/
  gershayim variants and Excel's BOM)
- translates Hebrew enum values — `בנזין`/`דיזל`/`היברידי`/`בנזין-חשמל`/
  `חשמלי` for fuel, `הנעה קדמית`/`אחורית`/`כפולה`/`4X4` for drive, etc.
- splits comma-separated cells like תוספות ואבזור into separate tags
- validates every row against the same rules the form uses, and shows a
  per-row error list before importing anything
- skips rows whose מספר מלאי already exists (or repeats within the file)
  rather than failing the whole batch, and reports them afterward
- derives a unique SEO slug per vehicle, de-duplicating collisions

Excel files are read as workbooks (first sheet) rather than as text,
which avoids the Hebrew-mangling and comma-inside-cell problems of
Excel's own CSV export — so .xlsx is generally the safer format to use.
Both formats run through identical validation.

Unrecognised columns are listed and ignored. Note that a תמונה column
containing image *links* is not imported — vehicle photos are uploaded
through the edit screen, which stores them in Supabase Storage.

## Vehicle photos

Each vehicle has five standard photo slots — חזית / אחורי / צד ימין /
צד שמאל / פנים הרכב — filled by pasting a direct image URL into the add
or edit form. They always display in that order on the vehicle page,
with the front shot used as the card thumbnail. Extra photos can still
be uploaded (or added by URL) through the image manager on the edit
screen; those appear after the five angles.

Photo angles need one migration run once in Supabase → SQL Editor:
`supabase/migration-add-image-angle.sql`. New projects created from
`schema.sql` already include the column.

## Deleting and restoring

Deleting a vehicle or an inquiry is a **soft delete** — the record is
marked, not destroyed. Deleted vehicles disappear from the public site
immediately and move to the "סל מחזור" tab on the admin vehicles screen,
where they can be restored. Deleted inquiries behave the same way under
their "נמחקו" tab.

The only action that destroys data permanently is **ריקון סל המחזור** in
Settings, which appears once the bin is non-empty.

Note that a vehicle in the recycle bin still occupies its stock number
and slug (both are UNIQUE columns), so re-importing the same CSV will
skip it — restore it or empty the bin first. The import result explains
this per row.

Soft delete needs one migration run once in Supabase → SQL Editor:
`supabase/migration-add-soft-delete.sql`.

## Buyer-facing extras

- **Financing calculator** on each vehicle page — down payment, term and
  rate sliders producing an estimated monthly payment. Labelled as an
  estimate throughout, since real terms depend on the lender.
- **Favourites** (`/favorites`) — cars saved with the heart button,
  stored in the visitor's browser (no account needed). The nav shows a
  live count. Cars that were sold or unpublished since being saved are
  reported rather than silently dropped.
- **Sorting** on the inventory page: newest, price, mileage.
- **Per-page titles and meta tags** via `usePageMeta`. Google renders
  JavaScript so this helps search indexing — but social crawlers
  (WhatsApp, Facebook) read the raw HTML and will show the site-wide
  defaults in link previews. Per-car share previews would need
  server-side rendering or prerendering.

## Performance and insight

- **Right-sized images.** Photos are requested at the size they're
  actually displayed (200px thumbnails, 600px cards, 1400px gallery)
  rather than downloading full-resolution originals everywhere. On
  known CDNs (Unsplash, Cloudinary) this typically cuts image weight by
  80–90%; unrecognised hosts are left untouched so a link can never
  break.
- **View tracking.** Opening a vehicle page increments `view_count`,
  counted once per browser session per car so refreshes don't inflate
  it. The dashboard surfaces the five most-viewed vehicles — useful for
  spotting which stock draws interest and which is stuck. Counting goes
  through a `SECURITY DEFINER` function that can only ever add 1 to a
  published vehicle, never touch prices or status.
  Needs `supabase/migration-add-view-count.sql`.
- **Total inventory value** on the dashboard (excludes sold stock).
- **Unread inquiry badge** in the admin sidebar, so a new lead is
  visible from any screen rather than only on the inquiries page.

## Link previews on WhatsApp / Facebook

Because this is a client-rendered SPA, crawlers used by WhatsApp,
Facebook and Telegram see only the site-wide defaults in the raw HTML —
they don't run JavaScript, so React's meta tags never reach them. Result:
sharing a specific car shows the generic site name.

`middleware.ts` detects those crawlers (by user agent, matched against a
specific list rather than a loose "bot" test) and rewrites their request
to `api/vehicle-preview.ts`, an edge function that fetches the car from
Supabase and returns real HTML with the right title, description and
photo. Human visitors are never routed there — they get the normal SPA,
so there's no page-speed cost. Search engines (Googlebot, Bing,
Applebot) aren't routed there either: they render JavaScript and should
index the full page, not the preview stub.

Requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and
`VITE_SITE_URL` to be set in Vercel (they already are if the site runs).
Test a deployed URL with Facebook's Sharing Debugger or by pasting the
link into a WhatsApp chat with yourself.

## Email notification on new inquiries

`supabase/functions/notify-inquiry/` emails the dealership the moment a
customer submits the contact form, so a lead doesn't wait for someone to
open the admin panel. Setup instructions are in the file's header
comment; the database trigger is `supabase/migration-add-inquiry-webhook.sql`
(replace the three placeholders before running it).

The function has to be deployed without JWT verification (the trigger
has no user session), so its URL is public. A shared `WEBHOOK_SECRET`,
set both as a function secret and in the trigger, is what stops anyone
else from using it to send mail to your inbox — the function refuses
every request until it's configured. If you set this up before the
secret existed, set the secret, redeploy the function and re-run the
migration with it filled in.

The send is fire-and-forget through `pg_net`: a slow or failing mail
provider can never delay or break the customer's form submission.

## Comparing vehicles

Up to three cars can be added to a comparison from their detail pages
and viewed side by side at `/compare`. Rows where the cars actually
differ are highlighted — identical rows are just noise.

## Development

```bash
pnpm lint        # ESLint
pnpm typecheck   # app + Vercel edge code
pnpm test        # Vitest unit tests
pnpm build
```

CI (`.github/workflows/ci.yml`) runs all of these, and also applies
`schema.sql` (twice, to prove it's re-runnable) plus `seed.sql` to a
Postgres 16 container and runs `supabase/tests/access-rules.sql`. To run
the database checks locally against an empty, throwaway Postgres
database:

```bash
psql -v ON_ERROR_STOP=1 -f supabase/tests/supabase-stub.sql
psql -v ON_ERROR_STOP=1 -f supabase/schema.sql
psql -v ON_ERROR_STOP=1 -f supabase/seed.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/access-rules.sql
```

Never point these at a real Supabase project — the stub creates its own
roles and `auth`/`storage` schemas.

## Deploying

**Vercel** (the only thing to deploy — Supabase is already hosted):

1. Push this repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo. Vercel
   auto-detects Vite; no config needed.
3. Environment variables (**Settings → Environment Variables**):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
   `VITE_SITE_URL` (your Vercel domain, once you have it — fine to
   add after the first deploy and redeploy).
4. Deploy.

Since this is a single-page app with client-side routing, direct
links to a route like `/admin/vehicles` have to be rewritten to
`index.html` so React Router can handle them. Vercel does **not** do
this automatically for Vite projects — without it, opening
`/admin` directly returns Vercel's own 404 page before the app ever
loads. `vercel.json` in the repo root configures the rewrite (with
`assets/` and `favicon.svg` excluded so real files still serve
normally).

## Project structure

```
supabase/
  schema.sql        Tables, RLS policies, storage bucket (latest state)
  migration-*.sql   Incremental upgrades for existing projects
  seed.sql          Demo inventory
  tests/            Access-rule checks run in CI
  functions/        Edge function: inquiry email
api/, middleware.ts Vercel edge: link previews for social crawlers
src/
  lib/         Supabase client, Zod schemas, formatting helpers
  types/       Hand-written types matching the Supabase schema
  hooks/       Data-fetching hooks (vehicles, images, inquiries, auth, ...)
  components/  Shared UI + layout components
  pages/
    public/    Home, inventory, vehicle detail
    admin/     Login, dashboard, vehicle CRUD, inquiries, settings
```

## What's here vs. what's next

This covers the core of the original spec: full vehicle CRUD with
image management, publish/unpublish, status tracking, customer
inquiries, an activity log, role-based access, and a public site with
search/filtering and SEO-friendly URLs.

Deliberately not rebuilt from the earlier, more complex version of
this project: CSV export, a dedicated reports view, and the
"Future Integrations" list from the original spec (WhatsApp Business
API, trade-in valuation, etc.) — the `feature_flags` table is seeded
with placeholders for these so they're easy to wire in later without
a schema change.
