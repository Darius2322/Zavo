-- Applied as "zavo_promotions_mfa". Adds promo codes (applied server-side in create_order) and MFA-aware has_perm().
create table promotions (
  id uuid primary key default gen_random_uuid(), code text not null unique check (code = upper(code)),
  kind text not null check (kind in ('percent','fixed')), value numeric(12,2) not null check (value > 0 and (kind <> 'percent' or value <= 100)),
  min_subtotal numeric(12,2) not null default 0, max_uses int, used_count int not null default 0,
  starts_at timestamptz, ends_at timestamptz, active boolean not null default true, created_at timestamptz not null default now());
alter table promotions enable row level security;
create policy promo_st on promotions for all using (has_perm('products')) with check (has_perm('products'));
alter table orders add column promo_code text, add column discount_kes numeric(12,2) not null default 0 check (discount_kes >= 0);

create function promo_discount(p_code text, p_sub numeric, p_lock boolean) returns numeric
language plpgsql security definer set search_path = public as $$
declare pr promotions; d numeric(12,2);
begin
  select * into pr from promotions where code = upper(trim(p_code)) and active
    and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()) and (max_uses is null or used_count < max_uses);
  if not found or p_sub < pr.min_subtotal then raise exception 'That promo code is not valid for this order'; end if;
  d := case when pr.kind = 'percent' then round(p_sub * pr.value / 100, 2) else least(pr.value, p_sub) end;
  if p_lock then update promotions set used_count = used_count + 1 where id = pr.id; end if;
  return d;
end $$;
revoke all on function promo_discount(text,numeric,boolean) from public, anon, authenticated;
create function check_promo(p_code text, p_sub numeric) returns numeric
language sql security definer set search_path = public as $$ select promo_discount(p_code, p_sub, false) $$;
revoke all on function check_promo(text,numeric) from public;
grant execute on function check_promo(text,numeric) to anon, authenticated;

create or replace function create_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o orders; it jsonb; v product_variants; pr products;
  sub numeric(12,2) := 0; fee numeric(12,2) := 0; disc numeric(12,2) := 0; qty int; ref text; oid uuid;
begin
  if coalesce(p->>'idempotency_key','') = '' then raise exception 'idempotency_key required'; end if;
  select * into o from orders where idempotency_key = p->>'idempotency_key';
  if found then
    return jsonb_build_object('reference', o.reference, 'total_kes', o.total_kes, 'status', o.status);
  end if;
  if char_length(trim(coalesce(p->>'customer_name',''))) < 2 then raise exception 'Name is required'; end if;
  if coalesce(p->>'phone','') !~ '^\+?[0-9 ]{9,15}$' then raise exception 'Valid phone number is required'; end if;
  if p->>'fulfilment' not in ('delivery','collection') then raise exception 'Invalid fulfilment'; end if;
  if p->>'fulfilment' = 'delivery' and char_length(trim(coalesce(p->>'address',''))) < 5 then
    raise exception 'Delivery address is required'; end if;
  if jsonb_array_length(coalesce(p->'items','[]')) not between 1 and 50 then raise exception 'Cart is empty'; end if;

  ref := 'ZV-' || upper(substr(translate(encode(gen_random_bytes(9),'base64'),'+/=Oo01lI','XYZABCDEF'),1,10));
  oid := gen_random_uuid();
  insert into orders (id, reference, idempotency_key, customer_name, phone, email, fulfilment, town, address,
    directions, notes, payment_method, subtotal_kes, total_kes)
  values (oid, ref, p->>'idempotency_key', trim(p->>'customer_name'), p->>'phone', nullif(p->>'email',''),
    p->>'fulfilment', p->>'town', p->>'address', p->>'directions', p->>'notes',
    coalesce(p->>'payment_method','manual'), 0, 0);

  for it in select value from jsonb_array_elements(p->'items') order by value->>'variant_id' loop
    qty := (it->>'quantity')::int;
    if qty is null or qty < 1 or qty > 20 then raise exception 'Invalid quantity'; end if;
    select * into v from product_variants where id = (it->>'variant_id')::uuid for update;
    if not found then raise exception 'Item no longer exists'; end if;
    select * into pr from products where id = v.product_id and status = 'published';
    if not found then raise exception 'An item in your cart is no longer available'; end if;
    if pr.is_unique and qty <> 1 then raise exception '% is a one-off item', pr.name; end if;
    if v.stock < qty then raise exception 'Not enough stock for %', pr.name; end if;
    update product_variants set stock = stock - qty where id = v.id;
    insert into inventory_movements (variant_id, delta, reason, order_id) values (v.id, -qty, 'order', oid);
    insert into order_items (order_id, variant_id, product_name, size, colour, unit_price_kes, quantity)
    values (oid, v.id, pr.name, v.size, v.colour, pr.price_kes, qty);
    sub := sub + pr.price_kes * qty;
  end loop;

  if coalesce(trim(p->>'promo_code'),'') <> '' then disc := promo_discount(p->>'promo_code', sub, true); end if;
  if p->>'fulfilment' = 'delivery' then
    select coalesce((value #>> '{}')::numeric, 0) into fee from store_settings where key = 'delivery_fee_kes';
  end if;
  update orders set subtotal_kes = sub, delivery_fee_kes = coalesce(fee,0), discount_kes = disc, promo_code = nullif(upper(trim(p->>'promo_code')),''),
    total_kes = sub + coalesce(fee,0) - disc where id = oid;
  insert into order_status_history (order_id, status) values (oid, 'received');
  return jsonb_build_object('reference', ref, 'total_kes', sub + coalesce(fee,0) - disc, 'status', 'received');
end $$;

-- Staff with a verified authenticator factor must be at aal2 to use staff permissions.
create or replace function has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_profiles a where a.user_id = auth.uid() and a.active
    and (a.role = 'owner' or p = any(a.permissions)))
  and (coalesce(auth.jwt()->>'aal','aal1') = 'aal2'
    or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'));
$$;
