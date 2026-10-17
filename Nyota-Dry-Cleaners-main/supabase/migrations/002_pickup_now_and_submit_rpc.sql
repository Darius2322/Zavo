-- ============================================================================
-- Migration 002 — Pick Now, precise location, admin location fields,
-- and a transaction-safe anonymous submission RPC.
--
-- WHY THIS RPC EXISTS (read this before removing it):
-- The old client-side flow did:
--     supabase.from('service_requests').insert(payload).select().single()
-- Under PostgREST, `.select()` after an insert requires the caller to also
-- satisfy a SELECT policy on the row it just wrote. Anonymous customers have
-- NO select policy on service_requests (by design — see migration 001) so
-- PostgREST silently returned zero rows for the select-back, and supabase-js's
-- `.single()` turned that into an error. The INSERT itself had already
-- committed. Net effect: the customer saw "we couldn't submit your request"
-- on a request that was, in fact, saved — the exact bug being chased.
--
-- The fix: do the whole submission (request + items) inside one
-- SECURITY DEFINER function that returns only the safe fields the client
-- needs (id, public_request_number, status), so no post-insert SELECT
-- against the RLS-protected table is ever required. It also takes a
-- client-generated idempotency key so retries/double-taps never create a
-- duplicate request.
-- ============================================================================

-- ---- New columns -----------------------------------------------------------
alter table public.service_requests
  add column if not exists pickup_now boolean not null default false,
  add column if not exists preferred_pickup_datetime timestamptz,
  add column if not exists pickup_lat double precision,
  add column if not exists pickup_lng double precision,
  add column if not exists pickup_accuracy_m double precision,
  add column if not exists pickup_location_captured_at timestamptz,
  add column if not exists pickup_county text,
  add column if not exists pickup_constituency text,
  add column if not exists pickup_ward text,
  add column if not exists client_submission_id uuid;

-- One request per idempotency key — lets the client safely retry a submit
-- (e.g. after a network blip or a double-tap) without creating duplicates.
create unique index if not exists idx_requests_client_submission_id
  on public.service_requests(client_submission_id)
  where client_submission_id is not null;

create index if not exists idx_requests_pickup_now
  on public.service_requests(pickup_now)
  where pickup_now = true;

-- ---- Transaction-safe, idempotent anonymous submission RPC -----------------
create or replace function public.submit_service_request(
  p_customer_name text,
  p_phone_display text,
  p_email text,
  p_service_id uuid,
  p_custom_service text,
  p_quantity_approx text,
  p_weight_approx text,
  p_special_care text,
  p_stain_notes text,
  p_general_notes text,
  p_fulfillment_type text,
  p_pickup_area text,
  p_pickup_location text,
  p_pickup_directions text,
  p_pickup_date date,
  p_pickup_time text,
  p_pickup_now boolean,
  p_preferred_pickup_datetime timestamptz,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_pickup_accuracy_m double precision,
  p_pickup_county text,
  p_pickup_constituency text,
  p_pickup_ward text,
  p_items jsonb,              -- [{"name":"Shirts","quantity":"5","isCustom":false}, ...]
  p_client_submission_id uuid -- generated once per booking attempt on the client
)
returns table (id uuid, public_request_number text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_number text;
  v_status text;
  v_item jsonb;
begin
  if p_client_submission_id is not null then
    select sr.id, sr.public_request_number, sr.status
      into v_id, v_number, v_status
      from public.service_requests sr
      where sr.client_submission_id = p_client_submission_id;
    if found then
      -- Already submitted (retry/double-tap) — return the existing request
      -- instead of creating a duplicate.
      return query select v_id, v_number, v_status;
      return;
    end if;
  end if;

  if coalesce(trim(p_customer_name), '') = '' then
    raise exception 'customer_name is required';
  end if;
  if coalesce(trim(p_phone_display), '') = '' then
    raise exception 'phone_display is required';
  end if;
  if p_fulfillment_type not in ('dropoff', 'pickup') then
    raise exception 'invalid fulfillment_type';
  end if;

  insert into public.service_requests (
    customer_name, phone_display, email,
    service_id, custom_service,
    quantity_approx, weight_approx, special_care, stain_notes, general_notes,
    fulfillment_type, pickup_area, pickup_location, pickup_directions,
    pickup_date, pickup_time, pickup_now, preferred_pickup_datetime,
    pickup_lat, pickup_lng, pickup_accuracy_m,
    pickup_location_captured_at,
    pickup_county, pickup_constituency, pickup_ward,
    client_submission_id
  ) values (
    trim(p_customer_name), trim(p_phone_display), nullif(trim(coalesce(p_email, '')), ''),
    p_service_id, nullif(trim(coalesce(p_custom_service, '')), ''),
    nullif(trim(coalesce(p_quantity_approx, '')), ''), nullif(trim(coalesce(p_weight_approx, '')), ''),
    nullif(trim(coalesce(p_special_care, '')), ''), nullif(trim(coalesce(p_stain_notes, '')), ''),
    nullif(trim(coalesce(p_general_notes, '')), ''),
    p_fulfillment_type,
    case when p_fulfillment_type = 'pickup' then nullif(trim(coalesce(p_pickup_area, '')), '') end,
    case when p_fulfillment_type = 'pickup' then nullif(trim(coalesce(p_pickup_location, '')), '') end,
    case when p_fulfillment_type = 'pickup' then nullif(trim(coalesce(p_pickup_directions, '')), '') end,
    case when p_fulfillment_type = 'pickup' then p_pickup_date end,
    case when p_fulfillment_type = 'pickup' then nullif(trim(coalesce(p_pickup_time, '')), '') end,
    coalesce(p_pickup_now, false),
    p_preferred_pickup_datetime,
    p_pickup_lat, p_pickup_lng, p_pickup_accuracy_m,
    case when p_pickup_lat is not null then now() end,
    case when p_fulfillment_type = 'pickup' then nullif(trim(coalesce(p_pickup_county, '')), '') end,
    case when p_fulfillment_type = 'pickup' then nullif(trim(coalesce(p_pickup_constituency, '')), '') end,
    case when p_fulfillment_type = 'pickup' then nullif(trim(coalesce(p_pickup_ward, '')), '') end,
    p_client_submission_id
  )
  returning service_requests.id, service_requests.public_request_number, service_requests.status
    into v_id, v_number, v_status;

  if p_items is not null then
    for v_item in select * from jsonb_array_elements(p_items)
    loop
      insert into public.request_items (request_id, item_name, quantity, is_custom)
      values (
        v_id,
        v_item->>'name',
        nullif(v_item->>'quantity', ''),
        coalesce((v_item->>'isCustom')::boolean, false)
      );
    end loop;
  end if;

  return query select v_id, v_number, v_status;
end;
$$;

-- Anonymous customers call this instead of inserting into the tables
-- directly. It runs as SECURITY DEFINER so it can both write and return the
-- confirmation fields without needing a SELECT policy on service_requests.
revoke all on function public.submit_service_request from public;
grant execute on function public.submit_service_request to anon, authenticated;

-- request_number/phone-normalization/history triggers from migration 001
-- already fire on this insert since it's a normal `insert into
-- service_requests`, so public_request_number, phone_normalized and the
-- first request_status_history row are still generated automatically.

-- ---- track_request(): add pickup_now so the customer's own tracking page
-- can show "Pickup requested now" — Postgres won't let us ALTER the return
-- shape of an existing function, so it has to be dropped and recreated.
drop function if exists public.track_request(text, text, text);

create or replace function public.track_request(
  p_request_number text,
  p_phone text default null,
  p_email text default null
)
returns table (
  public_request_number text,
  customer_name text,
  service_name text,
  custom_service text,
  quantity_approx text,
  fulfillment_type text,
  pickup_area text,
  pickup_date date,
  pickup_time text,
  pickup_now boolean,
  status text,
  payment_status text,
  amount numeric,
  created_at timestamptz,
  completed_at timestamptz
)
language plpgsql security definer as $$
declare
  v_phone_norm text := case when p_phone is not null then public.normalize_kenyan_phone(p_phone) else null end;
begin
  return query
  select
    sr.public_request_number, sr.customer_name,
    s.name, sr.custom_service, sr.quantity_approx,
    sr.fulfillment_type, sr.pickup_area, sr.pickup_date, sr.pickup_time, sr.pickup_now,
    sr.status, sr.payment_status, sr.amount, sr.created_at, sr.completed_at
  from public.service_requests sr
  left join public.services s on s.id = sr.service_id
  where sr.public_request_number = p_request_number
    and (
      (v_phone_norm is not null and sr.phone_normalized = v_phone_norm)
      or (p_email is not null and lower(sr.email) = lower(p_email))
    );
end;
$$;
