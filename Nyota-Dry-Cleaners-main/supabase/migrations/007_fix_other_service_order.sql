-- ============================================================================
-- Migration 007 — Fix "Other" service ordering.
--
-- The original seed gave 'other' sort_order = 6, expecting it to be last.
-- Migration 003 then added Carpet Cleaning (7) and Shoe Cleaning (8) after
-- it, so "Other" ended up sandwiched in the middle of the list instead of
-- at the end — on both the public Services page and the Booking wizard's
-- Step 1, since both read this same table ordered by sort_order (that part
-- was already a single source of truth; this was purely a data ordering
-- bug, not an architecture one).
-- ============================================================================

update public.services set sort_order = 100 where slug = 'other';
