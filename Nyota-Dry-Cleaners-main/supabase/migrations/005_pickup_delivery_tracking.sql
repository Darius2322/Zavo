-- ============================================================================
-- Migration 005 — Collection/delivery record-keeping for the admin
-- "Pickup & Delivery" menu (who marked it collected/delivered, and when).
-- ============================================================================

alter table public.service_requests
  add column if not exists collected_at timestamptz,
  add column if not exists collected_by uuid references public.profiles(id),
  add column if not exists delivered_at timestamptz,
  add column if not exists delivered_by uuid references public.profiles(id);
