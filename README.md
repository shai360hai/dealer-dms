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
