-- ============================================================================
-- Migration 004 — Return/collection preference after "ready", customer
-- feedback & complaints, and admin-managed legal pages (Terms & Conditions).
-- ============================================================================

-- ---- Return/collection preference (set by the customer once a request is
-- "ready") ------------------------------------------------------------------
alter table public.service_requests
  add column if not exists return_method text check (return_method in ('customer_pickup', 'delivery', 'send_someone')),
  add column if not exists return_collector_name text,
  add column if not exists return_collector_phone text,
  add column if not exists return_set_at timestamptz;

-- Anonymous customers can never UPDATE service_requests directly (see
-- migration 001's comments) — this RPC is how they set their own return
-- preference, the same pattern as submit_service_request: verify phone,
-- then write, all inside a SECURITY DEFINER function so no direct table
-- access is ever granted to anon.
create or replace function public.set_return_preference(
  p_request_number text,
  p_phone text,
  p_method text,
  p_collector_name text default null,
  p_collector_phone text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_phone_norm text := public.normalize_kenyan_phone(p_phone);
begin
  if p_method not in ('customer_pickup', 'delivery', 'send_someone') then
    raise exception 'invalid return method';
  end if;

  select id into v_id
    from public.service_requests
    where public_request_number = p_request_number
      and phone_normalized = v_phone_norm;

  if not found then
    return false;
  end if;

  update public.service_requests
    set return_method = p_method,
        return_collector_name = case when p_method = 'send_someone' then nullif(trim(coalesce(p_collector_name, '')), '') end,
        return_collector_phone = case when p_method = 'send_someone' then nullif(trim(coalesce(p_collector_phone, '')), '') end,
        return_set_at = now()
    where id = v_id;

  -- Let admin know a customer has responded, especially useful for delivery
  -- requests that now need a rider assigned.
  insert into public.notifications (type, title, related_request_id)
  values ('return_preference_set', 'Customer chose: ' || p_method || ' — ' || p_request_number, v_id);

  return true;
end;
$$;

revoke all on function public.set_return_preference from public;
grant execute on function public.set_return_preference to anon, authenticated;

-- track_request() needs to also return return_method so the tracking page
-- knows whether to show the picker or a confirmation of what was chosen.
-- Dropping first since the return shape is changing.
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
  return_method text,
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
    sr.status, sr.payment_status, sr.amount, sr.return_method, sr.created_at, sr.completed_at
  from public.service_requests sr
  left join public.services s on s.id = sr.service_id
  where sr.public_request_number = p_request_number
    and (
      (v_phone_norm is not null and sr.phone_normalized = v_phone_norm)
      or (p_email is not null and lower(sr.email) = lower(p_email))
    );
end;
$$;

-- ---- Feedback & complaints (from the Contact page) -------------------------
create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  message_type text not null default 'feedback' check (message_type in ('feedback', 'complaint')),
  message text not null,
  related_request_number text,
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.feedback_messages enable row level security;

create policy "anyone can submit feedback" on public.feedback_messages
  for insert with check (true);
create policy "staff can view feedback" on public.feedback_messages
  for select using (public.current_staff_role() is not null);
create policy "staff can update feedback status" on public.feedback_messages
  for update using (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);

-- ---- Legal pages (admin-editable Terms & Conditions, Privacy Policy) -------
create table if not exists public.legal_pages (
  slug text primary key,
  title text not null,
  content text not null default '',
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.legal_pages enable row level security;

create policy "public can view published legal pages" on public.legal_pages
  for select using (published_at is not null);
create policy "staff can view all legal pages" on public.legal_pages
  for select using (public.current_staff_role() is not null);
create policy "admin manages legal pages" on public.legal_pages
  for all using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

insert into public.legal_pages (slug, title, content) values
  ('terms', 'Terms & Conditions', 'Terms & Conditions content has not been published yet.'),
  ('privacy', 'Privacy Policy', 'Privacy Policy content has not been published yet.')
on conflict (slug) do nothing;
