-- ============================================================================
-- Migration 003 — Material/fabric field, secondary pickup/collection
-- contact, and two new services (Carpet Cleaning, Shoe Cleaning).
-- ============================================================================

alter table public.service_requests
  add column if not exists material text,
  add column if not exists custom_material text,
  -- The person who will physically hand over/collect the laundry, when
  -- different from the customer who placed the order. This is purely
  -- informational for staff — it never replaces the ordering customer's
  -- phone/email as the tracking identity (see submit_service_request below
  -- and track_request(), which still verifies against the ORIGINAL
  -- customer's phone/email only).
  add column if not exists collector_name text,
  add column if not exists collector_phone text,
  add column if not exists collector_relationship text,
  add column if not exists collector_note text;

insert into public.services (slug, name, description, sort_order) values
  ('carpet-cleaning', 'Carpet Cleaning', 'Professional cleaning for carpets and rugs.', 7),
  ('shoe-cleaning', 'Shoe Cleaning', 'Cleaning and care for shoes and sneakers.', 8)
on conflict (slug) do nothing;

-- submit_service_request needs new parameters for material + collector
-- info. Postgres requires dropping a function before changing its
-- parameter list — drop ALL existing overloads by name rather than one
-- exact signature, so this can't hit the "function name is not unique"
-- ambiguity error if an older version is still lying around.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'submit_service_request'
  loop
    execute format('drop function %s', r.sig);
  end loop;
end $$;

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
  p_material text,
  p_custom_material text,
  p_collector_name text,
  p_collector_phone text,
  p_collector_relationship text,
  p_collector_note text,
  p_items jsonb,
  p_client_submission_id uuid
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
    material, custom_material,
    collector_name, collector_phone, collector_relationship, collector_note,
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
    nullif(trim(coalesce(p_material, '')), ''), nullif(trim(coalesce(p_custom_material, '')), ''),
    nullif(trim(coalesce(p_collector_name, '')), ''), nullif(trim(coalesce(p_collector_phone, '')), ''),
    nullif(trim(coalesce(p_collector_relationship, '')), ''), nullif(trim(coalesce(p_collector_note, '')), ''),
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

revoke all on function public.submit_service_request from public;
grant execute on function public.submit_service_request to anon, authenticated;
