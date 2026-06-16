# GasCents

Track real fuel efficiency by gas station. Log each fill-up (date, station, odometer, gallons, cost) and GasCents derives per-interval MPG, price per gallon, and cost per mile — then ranks your stations by mileage and by price. Mobile-first, multi-user, with per-user data isolation enforced by Postgres Row-Level Security.

Nothing but raw fill-ups is stored; every metric is computed on the fly (`src/lib/calc.ts`).

## Stack

- **Next.js 14** (App Router, TypeScript, Tailwind) on **Vercel**
- **Supabase** — Postgres + Auth (passwordless magic link) + Row-Level Security
- **hCaptcha** on the sign-in form

## What's already set up

The live Supabase project already has the `fillups` table, RLS enabled, and four per-operation policies (`select` / `insert` / `update` / `delete`, each scoped to `user_id = auth.uid()`; `insert` uses `WITH CHECK`, `update` uses both `USING` and `WITH CHECK`). The migrations that created it live in this repo's history of the database, not as files — if you ever need to recreate them on a fresh project, the schema is summarized at the bottom of this file.

## Environment variables

Set these in Vercel (Project → Settings → Environment Variables) and in a local `.env.local` for development. See `.env.example`.

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | hCaptcha dashboard (public site key) |

The hCaptcha **secret** key is never in this app — it lives only in Supabase Auth settings.

## Supabase configuration (do this once)

1. **URL configuration** — Auth → URL Configuration:
   - **Site URL**: your production URL, e.g. `https://gas-cents.vercel.app`
   - **Redirect URLs**: add `https://gas-cents.vercel.app/auth/confirm` and, for local dev, `http://localhost:3000/auth/confirm`
2. **Magic-link email template** — Auth → Email Templates → Magic Link. For reliable **cross-device** sign-in (request the link on your laptop, open it on your phone), set the link to use the token hash:
   ```
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Sign in to GasCents</a>
   ```
   The callback route (`src/app/auth/confirm/route.ts`) also accepts the default `?code=` PKCE links, but those only work in the same browser that requested them — the token-hash template above is what makes phone-from-laptop work.
3. **CAPTCHA** — Auth → Settings → enable CAPTCHA protection, provider **hCaptcha**, paste the secret key.
4. **Email rate limits** — Supabase's built-in email is rate-limited and meant for low volume. For real traffic, configure custom SMTP (Resend, SendGrid, etc.) under Auth → SMTP, and review Auth → Rate Limits.

## Local development

Requires **Node ≥ 20.11** (the `npm test` script uses Node's built-in TypeScript stripping, which needs **Node ≥ 22.18**).

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

## Deploy

The repo is connected to Vercel, and the env vars are set there. Deploy by pushing:

```bash
git add -A
git commit -m "GasCents app"
git push
```

Vercel auto-builds on push. The first real deploy is also what confirms your env-var **values** are correct (they can't be read back from the dashboard).

## The calculation model

For consecutive fills ordered by **odometer** (the physical source of truth):

- `interval_miles = odometer_now − odometer_prev`
- `interval_mpg = interval_miles ÷ gallons_now` — **credited to the previous station**, because that station's gas powered the interval
- `price_per_gallon = total_cost ÷ gallons` — credited to the station where you bought it
- `cost_per_mile = total_cost_now ÷ interval_miles`

**Leaderboards:** "Best mileage" ranks stations by the arithmetic mean of the interval MPGs credited to them; "Cheapest gas" ranks by the mean price per gallon paid there. Both break ties by lowest cost per mile, then by the station's oldest entry. Counts are shown honestly — a station's most recent fill has a price but no closed MPG interval yet, so its two sample counts can differ.

**Ambiguity handling:** the first fill shows no MPG (no prior odometer); partial fills mark their interval "approximate" and are excluded from the mileage board unless you toggle them in; an MPG that's far from your running median is flagged as a possible skipped/unlogged fill (dismissible, which re-includes it); a non-increasing odometer or a date that disagrees with odometer order is flagged for review.

## Post-deploy verification

**Smoke test:** sign up, open the magic link, add a fill-up, edit it, delete it. Add a second fill-up at a different odometer and confirm MPG appears in History and a ranking appears under Stations.

**Cross-user RLS test (important):**
1. As **User A**, sign in and add 2–3 fill-ups.
2. In a separate browser or incognito window, sign up as **User B**.
3. As B, open History and Stations — both should be **empty**. B cannot read A's rows.
4. As B, add a fill-up. Switch back to A — A's data is unchanged and B's fill-up is not visible to A.

If B ever sees A's data, stop and recheck that RLS is enabled on `public.fillups` and that all four policies exist.

## Tests

```bash
npm test
```

Runs the pure calculation tests in `test/calc.test.mjs` (interval MPG, previous-station credit, odometer ordering, partial/skip/date flags, both leaderboards and their sample counts).

## Recreating the database schema (only for a fresh Supabase project)

```sql
create table if not exists public.fillups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  filled_at date not null,
  station_name text not null check (char_length(trim(station_name)) > 0),
  station_location text,
  odometer numeric(12,3) not null check (odometer >= 0),
  gallons numeric(10,3) not null check (gallons > 0),
  total_cost numeric(10,2) not null check (total_cost > 0),
  filled_to_full boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists fillups_user_odometer_idx on public.fillups (user_id, odometer);
alter table public.fillups enable row level security;
create policy fillups_select_own on public.fillups for select using (user_id = auth.uid());
create policy fillups_insert_own on public.fillups for insert with check (user_id = auth.uid());
create policy fillups_update_own on public.fillups for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy fillups_delete_own on public.fillups for delete using (user_id = auth.uid());
```
