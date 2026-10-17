# ZAVO
Account-free clothing store: React + TypeScript + Vite, Supabase, Vercel. Currency KES.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env`; fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Supabase > Project Settings > API). Never put the service-role key in a `VITE_` variable.
3. Database: `supabase/migrations/0001_core.sql` is already applied to the ZAVO project. For a fresh project, run it in the SQL editor.
4. Create the first admin: see `FIRST_ADMIN.md`.
5. `npm run dev` (development), `npm run build` (production).

## Deploy (Vercel) - TWO projects from this one repo
1. Public store: Vercel project with Root Directory blank, Framework Vite, env `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SITE_URL`.
2. Back office: a second Vercel project from the same repo with Root Directory `admin`, Framework Vite, env `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only. Give it an unguessable project name (the address is its first layer of obscurity, not its security). It sends noindex, no-frame and no-store headers.
The admin code is no longer in the public bundle.

## Status
UNTESTED until you run both builds.

Back office (`/admin` folder): landing page, separate Administrator sign-in (owner accounts only) and Staff sign-in (staff accounts only), password reset, mandatory authenticator-app (TOTP) enrolment for owners, optional for staff (enforced by the database once enrolled), per-staff permissions decide which sections appear and which data the database returns.
Public store: redesigned (Archivo type, ink/off-white/orange palette, square-edged cards, announcement bar and home hero editable under admin > content: page "home" title = headline, content = subline).
Everything else as listed in earlier README notes: reviews, collections, promo codes, newsletter, FAQ, tracking by reference + phone (not OTP), manual payment confirmation (no M-Pesa API), basic DB throttling.
Needs your credentials (not built): OTP SMS provider, M-Pesa Daraja.
