# Nyota Dry Cleaners & Laundry — Web App

A real, database-backed booking/tracking/admin/worker system for Nyota Dry
Cleaners & Laundry (Kisii, Nyanchwa), built with React + Vite + Supabase.

## What's implemented

- **Public site**: Home, Services, flexible multi-step Booking wizard, no-account
  Tracking, Gallery, Reviews (auto-published + admin moderation), About,
  Pickup & Delivery, Contact, FAQ, Privacy, Terms.
- **Booking wizard**: custom "Other" service, free-text quantity/weight,
  multi-select + custom clothing items, free-text stain notes, drop-off vs.
  pickup as a *fulfillment method* (not a service), free-text pickup
  area/location/directions/date/time, automatic Kenyan phone normalization
  for WhatsApp.
- **Request numbers**: generated server-side (`NYT-YYYY-NNNNNN`), guaranteed
  unique, never a raw database ID.
- **Tracking**: goes through the `track_request` / `track_request_timeline`
  Postgres functions — a customer can never `SELECT` a request directly;
  they must supply the request number *and* a matching phone/email.
- **Admin dashboard** (`/admin`): Dashboard, Requests (search/filter/status/assign),
  Pickup Requests, Workers, Gallery (real Supabase Storage uploads), Reviews
  moderation, Business Profile, Activity Log — all backed by real Supabase
  Auth + Row Level Security, no hard-coded passwords.
- **Worker dashboard** (`/worker/login`): only sees requests assigned to that
  worker, restricted status transitions, no admin menus.
- **Real-time**: the admin dashboard and worker dashboard subscribe to
  `service_requests` changes via Supabase Realtime.
- **PWA basics**: manifest, service worker with an offline fallback page,
  real app icons cropped from the actual Nyota logo.

## What you still need to do before going live

These need real credentials/infrastructure this codebase can't provision on
its own:

1. **Create a Supabase project** and run `nyota_supabase_schema.sql`
   (provided separately) in the SQL Editor.
2. **Copy `.env.example` to `.env`** and fill in your project's URL + anon key.
3. **Create your first admin user** — Supabase Dashboard → Authentication →
   Users → Add User, then insert a matching row into `public.profiles` with
   `role = 'admin'` (see the schema file's final section for the exact SQL).
4. **Deploy the `create-worker` Edge Function** (`supabase/functions/create-worker`)
   so the Admin dashboard's "Add Worker" flow can create real logins without
   ever exposing your service_role key to the browser. Wire the disabled
   "Add Worker" button in `AdminDashboard.jsx` to call it once deployed.
5. **Email/SMS/WhatsApp notification sending** — the `email_events` and
   `notifications` tables are ready to receive rows, but actually sending
   email (Resend/Postmark/SES) or WhatsApp/SMS messages requires a provider
   account and a server-side function (Edge Function or similar) — never
   call a provider's API with a secret key from the browser.
6. **Push notifications / sound / vibration** — the schema has
   `notification_preferences` ready; wiring up the Web Push subscription
   flow and a small settings UI is the remaining piece.
7. **PDF/QR generation** — tickets and receipts currently use browser
   print-to-PDF (works well with no extra dependency). For an embedded QR
   code linking to `/track?request=...`, add a small QR library
   (e.g. `qrcode`) and render it into the `TicketCard` component.
8. **Rate limiting on tracking** — put the `track_request` RPC call behind
   an Edge Function that applies IP-based rate limiting, so it can't be
   brute-forced.

## Local development

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL + anon key
npm run dev
```

## Deploying

Any static host that supports a Vite build works (Vercel, Netlify, Cloudflare
Pages, etc.):

```bash
npm run build
# deploy the generated dist/ folder
```

Set the same two environment variables (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) in your host's dashboard — never commit `.env`.

## Project structure

```
src/
  lib/            Supabase client, auth hook, shared constants/helpers
  components/     Shared UI primitives, layout (nav/footer), ticket/receipt
  pages/          One file per route (see App.jsx for the route list)
supabase/
  functions/create-worker/   Edge Function for secure worker account creation
public/
  logo-lockup.png, logo-mark-512.png   Real Nyota logo, cropped from the flyer
  manifest.webmanifest, sw.js, offline.html   PWA basics
```
