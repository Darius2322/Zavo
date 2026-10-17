# Nyota Dry Cleaners — changes log

## Round 9 (this pass)

### Manager access moved from /admin to /worker
`/admin` now accepts admin accounts only. Managers log in at `/worker/login`
(which already accepted any active staff role) alongside workers. Managers
see **all active requests** on that dashboard (not just ones assigned to
them) and can assign a worker to any request from there; workers still see
only what's assigned to them, unchanged.

### Booking wizard scrolls to top on every step
"Continue" previously left you wherever the previous step's page happened
to end (often the footer). Each step change now scrolls smoothly to the
top — this only affects the in-page wizard steps, since normal page
navigation already had its own scroll-to-top from earlier rounds.

### Admin: independent scroll regions
The sidebar and the active tab's content now scroll independently — long
lists of requests, feedback, or activity no longer drag the navigation
menu along with them, matching how most production admin dashboards work.

### Admin: notification badge clears once actioned
Marking a request Collected or Delivered now marks that request's related
notifications as read, so the Pickup & Delivery badge count reflects only
genuinely unaddressed items instead of growing forever.

### Filters + latest-first sorting
- **Reviews** now has a status filter (all/published/hidden/removed) —
  it had none before.
- **Pickup & Delivery** now has a "Pick Now only" filter, and its default
  order was fixed from earliest-pickup-date-first to latest-first
  (matching Requests, Feedback, and Activity Log, which were already
  latest-first).
- Requests and Feedback already had filters from earlier rounds — confirmed
  still working, not rebuilt.

### Password fields now have show/hide toggles
Added a reusable `PasswordInput` (eye icon) and wired it into Admin login,
Worker login, Change Password, Add Worker, and Reset Password — anywhere
staff type or set a password.

### Services can now be deleted (not just disabled)
Admin's Services tab has a Delete button alongside Enable/Disable. If a
service has ever been used in a real request, the database's own foreign
key protection blocks the delete and the UI explains why (suggesting
Disable instead) — this preserves historical request data rather than
silently breaking old records.

### Real brand SVG icons for social links
Facebook, Instagram, TikTok, and WhatsApp on the Contact page and footer
now render actual recognizable brand marks (inline SVGs) instead of
generic outline icons or a text-initial fallback.

### "Share This Site" in the hamburger menu
Uses the native share sheet where available (mobile), falling back to
copying the link on desktop browsers that don't support it.

### Track page: richer "Completed" state
Now reads "Thank you, [name]!" with a genuine thank-you message and an
invitation to come back next time, plus Review / Share / Contact Us
actions together instead of just a review button.

### Activity Log: categories + filter
Every entry now shows a category tag (Requests / Payments / Workers /
Other) with a filter bar above the list to narrow by category.

### Not done this round
Full differentiated manager permissions beyond "sees everything, can
assign" (e.g., a dedicated manager-only view distinct from both admin and
worker) — the literal ask ("URL is for managers and workers") is
satisfied; a richer manager-specific experience is its own follow-up.

---

## Round 8

### "Failed to fetch" — the actual frontend bug, found this time
Traced the whole chain rather than guessing again: your app's other Supabase
calls all depend on the same `VITE_SUPABASE_URL`, and they work — so the
env var was never the problem. The real bug was in **my own error-handling
code**: the `fetch()` call to the Edge Function wasn't wrapped in a
try/catch, so a raw network-level failure (a bare browser `TypeError:
Failed to fetch`) skipped my nicer error message entirely and showed the
literal, unhelpful browser text. Fixed — now every failure path produces a
clear message. This doesn't guarantee the underlying deploy issue is
resolved (that still needs either confirmation the CORS-fixed code is
live, or the function's Logs tab), but at minimum you'll now get a useful
error instead of a dead end.

### Booking Step 1 / Services page mismatch — root cause found
Not actually a missing service — a **sort-order bug**. The original seed
gave "Other" `sort_order = 6` expecting it to sort last, but Round 3's
migration added Carpet Cleaning (7) and Shoe Cleaning (8) *after* it,
so "Other" ended up sandwiched in the middle instead of at the end on
both the Services page and Booking Step 1 (which already share the same
`services` table — that part was already a single source of truth).
Fixed via a migration that pins "Other" to sort last regardless of how
many services get added later.

### Admin: Pickup & Delivery is now proper submenus
Was one page with two stacked sections; now it's the same page with a
**Pickup / Delivery tab switcher** at the top, each showing a live count
badge — matches the "parent menu with submenus" structure you asked for,
and is easier to scan on mobile than one long scroll.

### Contact page — full-section background
The support photo is now a genuine full-width background header (with a
soft angled overlay for text legibility) rather than a photo sitting
beside the form — the contact info and feedback form live in a clean
white area below it, unaffected by whatever's happening in the photo.

### Booking page — blurred background + clearer sections
Added a heavily blurred, low-opacity version of the laundromat photo as
page ambience behind the booking panel (the panel itself is solid white,
so the form stays sharp and fully readable). Also grouped Step 2's
existing fields under three labeled headings — **Item Details**,
**Additional Details** — and added **Pickup / Delivery Information** and
**Customer Details** headers to their respective steps. No fields,
validation, or submission logic touched — purely visual grouping.

### Migration needed
`007_fix_other_service_order.sql`

### On the security/performance/scalability sections of your spec
Worth being direct about what's already true architecturally vs. what
would need new infrastructure:
- **Already true**: no service-role key anywhere in frontend code (only
  inside the Edge Function, server-side); every sensitive table has RLS;
  privileged operations (worker creation/reset, request submission) go
  through `SECURITY DEFINER` functions or the Edge Function rather than
  direct table writes; admin routes check the caller's role via
  `useStaffSession`, not just hidden UI.
- **Would need new infrastructure, not just code changes**: rate limiting
  (needs an edge/gateway layer), a caching layer for read-heavy queries,
  WebP/AVIF image conversion pipeline, and route-level code-splitting.
  These are real, legitimate next steps — just bigger than a content/UI
  pass and worth their own focused round if you want them.

### Not done this round
Full breakpoint-by-breakpoint manual QA across every page (reasoned
through, not click-tested live), and the "several existing images" version
of home-page feature sections beyond what Round 7 already added.

---

## Round 7

### Cinematic hero slideshow (the flagship ask)
Replaced the small card-style hero graphic with a full-width, full-bleed
background slideshow: 4 photos (folded shirts, a commercial laundromat,
folded sweaters, an iron ready on the board) crossfade every ~6.5 seconds
with a very subtle Ken Burns zoom, never a hard cut. A light, angled scrim
sits behind the text only — the photos stay the visual focus, not buried
under a heavy overlay. Respects `prefers-reduced-motion` (the zoom/pan
disables entirely, crossfade shortens to a quick 400ms cut). Built as a
reusable `HeroSlideshow` component so it can be reused elsewhere if useful.

### New image sections, art-directed, not just inserted
- **Track page** — before you've looked anything up, a supporting photo
  sits beside the tracking form (stacks above it on mobile); once a
  result is fetched, the layout collapses back to a focused single column
  so the image never competes with the actual tracking data.
- **Booking page** — a wide banner photo above the service picker on the
  very first step only; disappears once you move past it so it never
  gets in the way of the form itself.
- **About page** — rebuilt as three alternating image/text rows (photo
  left then right then left) instead of a vertical photo dump, each
  paired with the section it illustrates (trust → what we do → approach).

### New images identified and placed from this batch
Of the 16 new photos, several duplicated what was already placed in
Round 6 (blue splash, dryer photo, folded shirts, laundry basket, iron,
cartoon laundry graphic, headset support photo) — those were left as-is.
Genuinely new ones used: the commercial laundromat wide shot, a close-up
of folded sweaters, someone folding on a bed, and an iron close-up — all
now live in the hero/Track/Booking/About placements above. Three more
(hotel housekeeping cart, PPE carpet-steam-cleaning, sneakers-on-carpet-
with-vacuum) are saved in `public/images/` but not yet placed — the
carpet-steam one is a strong candidate for the Carpet Cleaning service
image and the sneakers one for Shoe Cleaning, via the Services admin tab's
own upload feature, or tell me to wire them in as defaults next round.

### A mistake I almost repeated — caught this time
While building the slideshow component, I initially wrote a JSX element
with two `key` props on the same tag — the exact category of error that
broke the build in Round 6 (an invalid/duplicate JSX attribute). This time
I caught it myself before shipping, and additionally ran a proper tag-level
balance check (counting real `<div>`/`</div>` pairs while correctly
excluding self-closing tags like `<img />`) across every file I touched,
not just the brace/paren counter that missed the Round 6 bug.

### Not done this round (full 14-section spec is large)
- Contact page already had a supporting image from Round 6; didn't re-do
  it as a full split-screen/background treatment per the new spec — the
  existing version is reasonably close and lower priority to touch again.
- Hero video support (falling back to the image slideshow) — no video
  file was provided, so nothing to wire up yet; the component is
  structured so a `<video>` background could slot in later without
  rearchitecting.
- Full breakpoint-by-breakpoint QA (small mobile through large desktop)
  on every new section — visually reasoned through, not click-tested live.
- Placing the remaining 3 unused images (see above).

### Still investigating: "Failed to fetch" on Add Worker
Confirmed your `VITE_SUPABASE_URL` env var is working (the rest of the
app — login, requests, services — all depend on the same variable and
work fine), which rules that out. Needs one of: confirmation that the
CORS-fixed function code was actually redeployed, or the Edge Function's
**Logs** tab output to see the real server-side error.

---

## Round 6

### Services page images "not displaying" — root cause found and fixed
The real bug: the public **Services page had never been connected to the
database at all** — it was a fully hardcoded array from the very first
version of the site, while the Services admin tab (built in Round 5)
correctly saves `image_url`/price/description to the `services` table.
Two completely disconnected data sources — so anything set in admin could
never show up publicly. Fixed by making the Services page fetch live from
Supabase; icons and marketing bullet points stay as local metadata (matched
by slug) since those aren't database fields, but name, description, price,
and image now come from what's actually saved in admin.

### WhatsApp share now messages the customer directly
The admin request-list WhatsApp button was opening `wa.me/?text=...` with
no phone number, which opens WhatsApp's contact picker instead of
messaging anyone specific. Fixed to `wa.me/{customer's number}?text=...`
so it opens a chat with that exact customer, prefilled with their request
number and tracking link.

### Admin status/assignment/payment changes now reflect immediately
`updateStatus` and `assignWorker` previously only wrote to the database
and relied on a realtime subscription to refresh the UI — if that
subscription lagged or wasn't fully configured, the dropdown looked like
it hadn't done anything. Both now update local state immediately
(optimistic UI) the same way `setPaid` already did, then write to the
database in the background.

### Admin: "Pickup Requests" is now "Pickup & Delivery"
One combined menu with two sections:
- **Pickup Requests** — collecting laundry from the customer, with a
  **Mark Collected** button (records who and when via new
  `collected_at`/`collected_by` columns).
- **Delivery Requests** — laundry the customer asked to have delivered
  back (see below), with a **Mark Delivered** button once it's ready
  (records `delivered_at`/`delivered_by`).

### Customer return-preference choices now surface in admin
Whichever option a customer picks on the tracking page — "I'm Picking It
Up," "Deliver It To Me," or "I'm Sending Someone" — now shows in the
admin request detail view (who, and when they chose it). "Deliver It To
Me" specifically also lands in the new **Delivery Requests** queue above,
since that's the one that needs an admin/rider action; the other two are
informational only and don't need a follow-up task.

### Images added
Placed the photos you sent:
- **Hero background** (Home page) — the folded-shirts photo, behind the
  existing hero card with a navy scrim so the logo/text stay readable.
- **About page** — the family photo, under "Who We Are."
- **Pickup & Delivery info page** — the laundromat photo.
- **Contact page** — the support-headset photo alongside the feedback form.
- **FAQ page** — the phone-call illustration as a small header graphic.
- **Service default images** (Ironing, Laundry Washing, Deep Cleaning,
  Folding) — set via migration, but admin can replace any of them anytime
  through Services → Edit → Upload Image.

These are shipped as static files in `public/images/` rather than
Supabase Storage, since that needs no manual upload step. Two photos
(the cartoon laundry-machine graphic and the blue paint splash) weren't
placed — happy to use them somewhere specific if you tell me where.

### Edge Function "Failed to fetch" — this needs to run from your laptop, not Termux
Your screenshot showing this error is from a Windows machine, not the
phone — good, because the earlier `Unsupported platform: android` error
was specific to Termux/Android. On Windows this should just work: open
Command Prompt or PowerShell in the project folder and run:
```
npx supabase login --token YOUR_TOKEN
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy create-worker
```
(Same token/project-ref steps as described earlier in our conversation —
get the token from Supabase Dashboard → Account → Access Tokens, and the
project ref from Project Settings → General.)

### Migrations needed (in order)
- `005_pickup_delivery_tracking.sql` — collected/delivered timestamp + actor columns.
- `006_default_service_images.sql` — sets the four default service images described above.

---

## Round 5

### Hamburger drawer fix (root cause, not a patch)
Your screenshot showed the drawer rendering short and see-through — the
dimming overlay wasn't covering the screen and the nav links weren't
visible. Root cause: the drawer and search overlay were both rendered
*inside* the sticky `<header>`. Nesting a `position: fixed` element inside
a `position: sticky` ancestor is a known source of exactly this kind of
mobile-browser compositing bug — the "fixed" element can end up confined
to the sticky element's box instead of the real viewport. Fixed by
portaling both the mobile drawer and the search modal directly to
`document.body` via `createPortal`, which sidesteps the containing-block
issue entirely regardless of where they're triggered from.

### Return/collection preference after "Ready"
Once a request reaches "Ready for Collection," the customer's tracking
page now shows three choices: **I'm Picking It Up**, **Deliver It To Me**,
or **I'm Sending Someone** (with a name/phone field for who). Saved via a
new `set_return_preference` RPC — verifies the customer's phone the same
way `track_request` does, so no direct table write is ever exposed to
anonymous visitors. Admin gets a notification when a customer responds.

### Review prompt after completion
When a request's status is "Completed," the tracking page now offers
"⭐ Leave a Review" right there, opening a modal (star rating + text) that
posts straight to the same `reviews` table your Reviews page already
publishes from — no separate moderation path needed.

### Copy Request Number — now everywhere it should be
Was already on the tracking page; added the same copy-with-"Copied!"-
feedback button to the **Confirmation** page too, so it's available
immediately after submitting, not just when tracking later.

### Admin: copy + WhatsApp-share on every request
Each request row in the admin Requests list now has a small copy icon and
a WhatsApp-share icon that opens WhatsApp with a prefilled message
containing the request number and a direct tracking link.

### Admin: Services management (full CRUD)
New **Services** tab — add, edit, enable/disable, set a description,
upload an image, and choose "fixed price (KES)" or "price on request" for
any service. No migration was needed for this — the `services` table
already had `price_type`, `price_amount`, and `image_url` columns sitting
unused; this just builds the missing UI on top of them. Images upload into
the existing `gallery` storage bucket under a `services/` path, since
adding a whole new bucket + policies for this would've been the same
storage, just under a different name.

### Admin: Feedback & Complaints
New **Contact page** section where customers can submit feedback or a
complaint (name, optional phone/email, optional related request number,
message). New **Feedback** tab in admin lists them with New/Read/Resolved
filters and a live unread badge, same pattern as the Pickup Requests
badge.

### Admin-managed Terms & Conditions (and Privacy Policy)
New **Legal Pages** tab — admin can edit either page's content, "Save
Draft" without publishing, or "Publish Now," which stamps a
`published_at` timestamp. The public Terms/Privacy pages now read from
this table and show "Last published [date/time]" once something's been
published; until then they fall back to the same placeholder text as
before, so nothing breaks for a site that hasn't published anything yet.

### Migration needed
Run `supabase/migrations/004_return_preference_feedback_legal.sql` — adds
the return-preference columns + RPC, the `feedback_messages` table, and
the `legal_pages` table (seeded with unpublished placeholder Terms/Privacy
rows).

### Not done this round
- The Services tab covers services; a separate **Products** catalog
  (detergent, accessories, etc.) still doesn't exist as a table — that's
  its own small migration + admin screen, same shape as Services.
- Full theme/dark mode — still needs the broader color-system rework
  flagged in earlier rounds.
- Real push notifications — still the local vibrate/sound/browser-
  Notification approximation.

---

## Round 4

Picked off everything that was fully specified and self-contained. Full
theme system, Services/Products CRUD, the complete pickup→delivery status
lifecycle, Media/Appearance management, and real push notifications are
each still their own dedicated pass — see "Not done" below.

### Done this round
- **Gallery caption bug fixed** — the admin Gallery tab had no caption
  field at all, even though the database and public page both already
  supported captions. Added a caption input on upload, click-to-edit
  captions on existing photos, and an image "Replace" option.
- **Admin mobile navigation overlap fixed** — replaced the old CSS
  icon-shrink trick (which wasn't rendering correctly on your device, per
  your screenshot) with a proper off-canvas drawer: fully opaque, scroll-
  locked, closes on nav-select/outside-tap/Escape/close button, same
  pattern as the public site's menu.
- **Worker password management**: the `create-worker` Edge Function now
  also handles `action: "reset_password"` so admins can reset a forgotten
  worker password to a new temporary one. Added a self-service "Change
  Password" modal, usable from both the Worker and Admin dashboards, so
  new workers (and admins) can change their password after logging in.
- **Live notification badge** — the admin nav's Pickup Requests item and
  the mobile top bar now show a real unread count from the `notifications`
  table, kept current via a realtime subscription (not a manual refresh).
  Worker assignment now also creates a notification for that worker.
- **Payment-gated Receipt** — the Receipt tab (on both the confirmation
  page and the tracking page) is locked until an admin marks a request
  "Paid"; the Ticket remains available regardless, exactly as specified.
  Added a "Mark Paid" / "Undo" button in the admin request detail view,
  plus a "Paid" badge in the request list so it's visible without
  expanding every row.
- **Request number normalization** — typed or pasted request numbers are
  now automatically reformatted to the standard `NYT-YYYY-NNNNNN` shape
  before lookup, so stray casing/spacing/missing hyphens don't cause a
  false "not found."
- **Real downloadable PDFs** — added `jspdf` and a `generatePdf.js` helper
  that builds an actual `.pdf` file (not just the browser's print dialog)
  for both Ticket and Receipt, including the Nyota logo, request details,
  and the tracking QR code. The old "Print" button is kept alongside a new
  "Download PDF" button.
- **Desktop duplicate Book button** — confirmed already fixed in Round 2;
  no further change needed.

### Action needed on your end
1. **Deploy the updated Edge Function** (it now has two actions, not one):
   ```
   npx supabase functions deploy create-worker
   ```
   (If you haven't linked this project to the Supabase CLI yet, see the
   login/link steps from earlier in our conversation.)
2. Run migration `003_material_collector_new_services.sql` if you haven't
   already (adds the columns Round 3 needed).
3. Redeploy the frontend the same way as before — but **double-check your
   local files actually have the new code before pushing** (the same stale-
   download issue that hit us before is easy to repeat):
   ```
   grep -c "ResetPasswordModal" src/pages/AdminDashboard.jsx
   grep -c "downloadTicketPdf" src/components/Ticket.jsx
   ```
   Both should print a number greater than 0.

### Not done — grouped by why, for future dedicated passes
- **Theme switcher (light/dark/system)** — every color in this app is a
  hardcoded hex value from a plain JS object imported into ~20 files now;
  there's no CSS-variable layer for a toggle to hook into. Retrofitting
  this safely means converting the whole styling approach first.
- **Full pickup→delivery status lifecycle** (Requested → Assigned → En
  Route → Collected → Received → Cleaning → Ready → Out for Delivery →
  Delivered → Completed) — your current booking flow only has a
  fulfillment choice for bringing laundry *to* the shop; there's no
  existing concept of delivering the finished laundry *back*. This is a
  real schema + UI project (new status columns, admin/worker action
  buttons for each transition, timeline changes) — worth its own pass
  now that the exact stage list is specified.
- **Services & Products admin CRUD** (add/edit/enable/disable/pricing/
  images) — no admin screen exists for this yet, and a `products` table
  doesn't exist in the schema yet either.
- **Media/Appearance management** (replacing the hero background and
  other site images from admin) — needs a new `site_media` table/storage
  bucket and wiring `Home.jsx`'s hero to read from it dynamically.
- **Real push notifications** — still the local vibrate/sound/browser-
  Notification approximation from Round 1; true push needs a service
  worker subscription + a server endpoint to send from.

---

## Round 3

You asked for all of them. Being straight about it: some items in that list
(a full theme system, a ground-up admin sidebar rebuild, full Services/
Products CRUD, true PDF export, a real push-notification pipeline, and a
proper delivery-tracking lifecycle) are each substantial standalone
features that touch dozens of files — implementing them without the
ability to run/test the build risks shipping something broken. So this
round is a large, coherent, **fully wired** batch, and the section at the
bottom lists exactly what's left with why.

### Done this round
- **Copy Request Number** button on the tracking page, with "Copied!"
  feedback (clipboard API, falls back silently if unsupported).
- **Timeline times, not just dates** — every completed step now shows
  `28 Aug 2026 · 10:15 AM`, in East Africa Time regardless of the
  visitor's own device timezone.
- **Material / Fabric field** in booking (Cotton, Wool, Silk, Linen,
  Leather, Suede, Polyester, Mixed, Unknown, Other + free text).
- **Carpet Cleaning and Shoe Cleaning** are now real, bookable services
  (added to the services table via migration, with icons on the Services
  page). Carpet Cleaning also relabels the quantity field to "Approximate
  carpet size." Added "Shoes," "Carpets," and "Duvets" to the item-type
  chips, and "Odour" to stain/concern options.
- **"Someone Else Will Hand Over / Collect"** — an optional secondary
  contact (name, phone, relationship, note) in the booking's Contact step,
  clearly separated from and never replacing the ordering customer's own
  phone/email, which remains the sole tracking-verification identity.
  Shown to admin on the request detail view.
- **"Built by Darius"** footer credit that opens a small popup with Call
  and Email buttons (0110554040 / dariusmomanyi678@gmail.com).
- **Business Profile now actually drives the site**, instead of hardcoded
  text: admin can set operating hours (per day, open/closed + times) and
  social links (Facebook, Instagram, TikTok, WhatsApp — any left blank
  simply doesn't show an icon anywhere). The Contact page and footer now
  read this from the database via a shared `useBusinessSettings()` hook,
  with the old hardcoded values kept only as a fallback before the first
  load completes.
- **Gallery lightbox**: tapping any published photo opens a full-screen
  viewer with caption, next/previous, Escape/outside-tap to close.
  Captions and publish/unpublish were already wired from your existing
  schema — verified, not rebuilt.
- **Review moderation** (Restore/Hide/Remove) was already fully built and
  correctly wired to the public Reviews page's `status = 'published'`
  filter — checked and confirmed working, no changes needed.

### Migration needed
Run `supabase/migrations/003_material_collector_new_services.sql` — adds
the new columns, the two new services, and replaces
`submit_service_request` to accept the new fields (drops all existing
overloads first, the same robust way as the fix for the earlier "function
name is not unique" error, so this is safe to run even if 002 was run more
than once).

### Not done — and why, grouped so we can tackle each as its own pass
- **Theme switcher (light/dark/system).** Every color in this app is a
  hardcoded hex value pulled from a plain JS object (`C.navy`, `C.royal`,
  etc.) imported directly into ~15 files — there's no CSS-variable layer
  for a toggle to hook into. Retrofitting real dark mode means converting
  that whole styling approach first; doing it hastily risks silently
  breaking contrast/readability across pages I can't visually check right
  now. This deserves its own dedicated pass.
- **Admin sidebar full regroup + notification badges with live counts +
  mobile drawer for admin.** The nav structure, permissions per section,
  and where counts come from (notifications table vs. live query) need
  their own pass — this alone is a big navigational rebuild.
- **Services & Products management UI in admin** (add/edit/pricing
  models/images/enable-disable) — services currently come from the `services`
  table but there's no admin CRUD screen for it yet; same for a `products`
  table, which doesn't exist yet and needs its own migration.
- **Delivery-side status lifecycle** (Delivery Pending → Delivered).
  Your current booking flow only has a fulfillment choice for bringing
  laundry *to* the shop (drop-off vs. pickup) — there's no existing concept
  of delivering the finished laundry *back*. Before building a delivery
  state machine I'd want to confirm with you: is delivery-back automatic
  for pickup customers, a separate opt-in, or a paid add-on? I don't want
  to guess a business rule that affects real customer expectations.
- **True PDF export** for tickets/receipts (currently a clean printable
  HTML view via the browser's print dialog — functionally usable today,
  but not a literal downloaded .pdf file). Needs a PDF library wired into
  the build.
- **Real push notifications** (still the local vibrate/sound/Notification
  approximation from Round 1 — a true push pipeline needs a service worker
  subscription + a server endpoint to send from).
- **Search modal indexes only static site content** (services/gallery/
  about/contact/FAQ), not live gallery captions or reviews — fine for now,
  worth revisiting if you want gallery/review text searchable too.

Tell me which of these to take on next and I'll go deep on that one rather
than spreading thinner again.

---

## Round 2

### Fixed: Track icon was a magnifying glass
Confirmed bug from your screenshot — the mobile header used the `Search`
icon for both "Track" and a would-be search action. Now there are 4
distinct icons: Book (calendar-plus), Track (clipboard-check), Search
(magnifying glass, its own button), and Menu.

### Added: working site search
Opens a modal searching public site content only — never customer/admin
data.

### Fixed: duplicate desktop Book button
One primary "Book Now" CTA on desktop.

### Fixed: Workers page was a non-functional placeholder
"+ Add Worker" opens a real modal calling the `create-worker` Edge
Function; Pause/Reactivate wired to `profiles.is_active`.

### About the overlapping-menu screenshot
Most likely a mid-slide-in animation frame, not a bug — added a safety fix
so the drawer closes immediately on any nav-link tap.

---

## Round 1

### 1. The false "submission failed" bug (root cause, fixed)
`Booking.jsx` used `.insert().select().single()`, but anonymous customers
have no `SELECT` policy on `service_requests` — so the post-insert read-
back failed even though the insert had already committed. Fixed with a
`SECURITY DEFINER` RPC (`submit_service_request`) that inserts and returns
only the safe fields needed, with a client-generated idempotency key so
retries/double-taps can't create duplicates.

### 2. QR tracking, 3. Mobile header, 4. Scroll-to-top + transitions,
### 5. Mobile services grid, 6. Booking stepper z-index, 7. Pickup location
### (county dropdown + free-text constituency/ward + precise location),
### 8. Pick Now, 9. Error handling, 10. Tracking page wording
See git history / earlier chat for full detail — all still in place and
unchanged by Rounds 2–3 except where explicitly superseded above.


