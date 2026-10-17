-- ============================================================================
-- Migration 006 — Default service images.
--
-- These point at static files shipped with the frontend build
-- (public/images/...), not Supabase Storage — simplest way to ship
-- ready-made photos without a manual upload step. Admin can still replace
-- any of these later via Services tab → Edit → Upload Image, which writes
-- a Supabase Storage URL instead; this only fills in services that don't
-- have an image yet, so it never clobbers anything already set.
-- ============================================================================

update public.services set image_url = '/images/ironing-service.jpg'
  where slug = 'ironing' and image_url is null;
update public.services set image_url = '/images/laundry-worker-cartoon.jpg'
  where slug = 'laundry' and image_url is null;
update public.services set image_url = '/images/laundry-basket-overflow.jpg'
  where slug = 'deep-cleaning' and image_url is null;
update public.services set image_url = '/images/hero-folded-shirts.jpg'
  where slug = 'folding' and image_url is null;
