# ZAVO
Account-free clothing store: React + TypeScript + Vite, Supabase, Vercel. Currency KES.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env`; fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Supabase > Project Settings > API). Never put the service-role key in a `VITE_` variable.
3. Database: `supabase/migrations/0001_core.sql` is already applied to the ZAVO project. For a fresh project, run it in the SQL editor.
4. Create the first admin: see `FIRST_ADMIN.md`.
5. `npm run dev` (development), `npm run build` (production).

## Deploy (Vercel)
Import the GitHub repo, framework Vite, add the two `VITE_` variables, deploy. `vercel.json` handles SPA routing.

## Status
UNTESTED: written without npm access. Run `npm install && npm run build` first and fix any type errors.
Set `SITE_URL` (your live domain) so `npm run build` can generate `public/sitemap.xml`; also change the `Sitemap:` line in `public/robots.txt` to the full URL.

Public: home (new arrivals, featured, collections), shop (search; category, brand, size, colour, price, in-stock filters; sort; load more), sale (products with a genuine previous price), collection pages, product pages (variants, reviews from completed orders, share, size/delivery/returns links), cart, local wishlist, guest checkout (`create_order`), confirmation, tracking by reference + phone (`track_order`, NOT OTP), contact, newsletter, FAQ, editable content pages, offline banner, service worker with update prompt, icons.
Admin (`/manage-store-7x9`): sign-in/reset, optional authenticator-app MFA setup, dashboard, orders (status, payment incl. refunded, notes, print), products (add/edit/publish/brand/images main+delete/stock with reason), catalogue (categories rename/reorder/deactivate, collections, FAQs), reviews moderation, enquiries, content + delivery fee, staff, newsletter CSV, audit log.
Database: RLS everywhere, order/stock/status work in audited functions, simple per-phone order and per-contact message throttling (triggers).

Also built: promo codes (admin > catalogue; validated and applied inside `create_order`, shown at checkout), enforced MFA (staff who enrol an authenticator app must pass a code, and the database refuses staff permissions at aal1), link-preview tags for crawlers (`api/og.js`, routed in `vercel.json`).

Known limits / needs your action:
- OTP tracking: needs an SMS provider account (e.g. Africa's Talking) plus an Edge Function; not built because it cannot work without your credentials. Tracking uses reference + phone instead.
- M-Pesa STK push / callbacks: needs Safaricom Daraja credentials and a public callback; not built. Payments are confirmed manually by staff; "Refunded" is a recorded status, not proof money moved.
- Rate limiting is basic and database-level (5 orders/hour per phone, contact-form caps); add edge limits before heavy traffic.
- MFA: if a staff member enrols and loses their authenticator, an owner must remove the factor in Supabase Auth.
- Copy (policies, delivery areas and fees, About text, FAQs) must be written by you in admin.
- All code is untested until you run `npm install && npm run build`.
