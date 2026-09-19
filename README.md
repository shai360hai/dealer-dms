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

<<<<<<< HEAD
=======
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
so there's no page-speed cost.

Requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and
`VITE_SITE_URL` to be set in Vercel (they already are if the site runs).
Test a deployed URL with Facebook's Sharing Debugger or by pasting the
link into a WhatsApp chat with yourself.

## Email notification on new inquiries

`supabase/functions/notify-inquiry/` emails the dealership the moment a
customer submits the contact form, so a lead doesn't wait for someone to
open the admin panel. Setup instructions are in the file's header
comment; the database trigger is `supabase/migration-add-inquiry-webhook.sql`
(replace the two placeholders before running it).

The send is fire-and-forget through `pg_net`: a slow or failing mail
provider can never delay or break the customer's form submission.

## Comparing vehicles

Up to three cars can be added to a comparison from their detail pages
and viewed side by side at `/compare`. Rows where the cars actually
differ are highlighted — identical rows are just noise.

>>>>>>> 03934ce (Add share previews, inquiry email, vehicle comparison)
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
  schema.sql   Tables, RLS policies, storage bucket
  seed.sql     Demo inventory
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
this project: CSV import/export, a dedicated reports view, and the
"Future Integrations" list from the original spec (WhatsApp Business
API, trade-in valuation, etc.) — the `feature_flags` table is seeded
with placeholders for these so they're easy to wire in later without
a schema change.
