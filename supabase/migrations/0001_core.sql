-- ZAVO core schema (stage 1). Money is numeric(12,2) in KES.
create extension if not exists pgcrypto;

create type order_status as enum ('received','awaiting_confirmation','confirmed','processing','ready','out_for_delivery','completed','cancelled');
create type payment_status as enum ('method_selected','awaiting_confirmation','confirmed','failed','refunded');

-- Staff ----------------------------------------------------------------
create table admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'staff' check (role in ('owner','staff')),
  permissions text[] not null default '{}', -- products, inventory, orders, enquiries, content, settings, staff
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create function has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_profiles a where a.user_id = auth.uid() and a.active
    and (a.role = 'owner' or p = any(a.permissions)));
$$;

-- Catalogue ------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null,
  sort_order int not null default 0, active boolean not null default true,
  created_at timestamptz not null default now()
);
create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, active boolean not null default true
);
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null, description text,
  category_id uuid references categories(id), brand_id uuid references brands(id),
  price_kes numeric(12,2) not null check (price_kes >= 0),
  compare_at_kes numeric(12,2) check (compare_at_kes is null or compare_at_kes > price_kes),
  condition text, measurements jsonb,
  is_unique boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  featured boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size text not null default 'One size', colour text not null default '',
  sku text unique, stock int not null default 0 check (stock >= 0),
  low_stock_threshold int not null default 2,
  unique (product_id, size, colour)
);
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  path text not null, alt text, sort_order int not null default 0
);
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id),
  delta int not null, reason text not null, order_id uuid,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create index on products (status, created_at desc);
create index on products (category_id);
create index on product_variants (product_id);
create index on product_images (product_id, sort_order);

-- Orders ---------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  idempotency_key text not null unique,
  customer_name text not null, phone text not null, email text,
  fulfilment text not null check (fulfilment in ('delivery','collection')),
  town text, address text, directions text, notes text,
  payment_method text not null,
  subtotal_kes numeric(12,2) not null, delivery_fee_kes numeric(12,2) not null default 0,
  total_kes numeric(12,2) not null,
  status order_status not null default 'received',
  payment_status payment_status not null default 'method_selected',
  internal_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  product_name text not null, size text, colour text,
  unit_price_kes numeric(12,2) not null, quantity int not null check (quantity > 0)
);
create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null, customer_visible_note text,
  changed_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create index on orders (created_at desc);
create index on orders (status);
create index on order_items (order_id);

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  contact text not null check (char_length(contact) between 3 and 160),
  subject text check (char_length(subject) <= 160),
  message text not null check (char_length(message) between 1 and 4000),
  state text not null default 'new' check (state in ('new','in_progress','resolved')),
  internal_notes text, created_at timestamptz not null default now()
);
create table faqs (
  id uuid primary key default gen_random_uuid(),
  topic text not null, question text not null, answer text not null,
  sort_order int not null default 0, published boolean not null default true
);
create table store_settings (
  key text primary key, value jsonb not null, is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Guest order creation (authoritative prices/stock/totals) ---------------
create function create_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o orders; it jsonb; v product_variants; pr products;
  sub numeric(12,2) := 0; fee numeric(12,2) := 0; qty int; ref text; oid uuid;
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

  if p->>'fulfilment' = 'delivery' then
    select coalesce((value #>> '{}')::numeric, 0) into fee from store_settings where key = 'delivery_fee_kes';
  end if;
  update orders set subtotal_kes = sub, delivery_fee_kes = coalesce(fee,0), total_kes = sub + coalesce(fee,0) where id = oid;
  insert into order_status_history (order_id, status) values (oid, 'received');
  return jsonb_build_object('reference', ref, 'total_kes', sub + coalesce(fee,0), 'status', 'received');
end $$;
revoke all on function create_order(jsonb) from public;
grant execute on function create_order(jsonb) to anon, authenticated;

-- RLS ------------------------------------------------------------------
alter table admin_profiles enable row level security;
alter table categories enable row level security;
alter table brands enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table inventory_movements enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table contact_messages enable row level security;
alter table faqs enable row level security;
alter table store_settings enable row level security;

-- public read of published content only
create policy pub_cat on categories for select using (active);
create policy pub_brand on brands for select using (active);
create policy pub_prod on products for select using (status = 'published');
create policy pub_var on product_variants for select using (exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy pub_img on product_images for select using (exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy pub_faq on faqs for select using (published);
create policy pub_set on store_settings for select using (is_public);
create policy pub_contact on contact_messages for insert to anon, authenticated with check (state = 'new' and internal_notes is null);

-- staff access (orders/enquiries/inventory never readable by public)
create policy staff_self on admin_profiles for select using (user_id = auth.uid() or has_perm('staff'));
create policy staff_mgr on admin_profiles for all using (has_perm('staff')) with check (has_perm('staff'));
create policy st_cat on categories for all using (has_perm('products')) with check (has_perm('products'));
create policy st_brand on brands for all using (has_perm('products')) with check (has_perm('products'));
create policy st_prod on products for all using (has_perm('products')) with check (has_perm('products'));
create policy st_var on product_variants for all using (has_perm('products') or has_perm('inventory')) with check (has_perm('products') or has_perm('inventory'));
create policy st_img on product_images for all using (has_perm('products')) with check (has_perm('products'));
create policy st_inv on inventory_movements for select using (has_perm('inventory'));
create policy st_ord on orders for select using (has_perm('orders'));
create policy st_ord_up on orders for update using (has_perm('orders')) with check (has_perm('orders'));
create policy st_item on order_items for select using (has_perm('orders'));
create policy st_hist on order_status_history for select using (has_perm('orders'));
create policy st_msg on contact_messages for select using (has_perm('enquiries'));
create policy st_msg_up on contact_messages for update using (has_perm('enquiries')) with check (has_perm('enquiries'));
create policy st_faq on faqs for all using (has_perm('content')) with check (has_perm('content'));
create policy st_set on store_settings for all using (has_perm('settings')) with check (has_perm('settings'));

-- Storage: public-read product images, staff-only writes
insert into storage.buckets (id, name, public) values ('product-images','product-images', true) on conflict do nothing;
create policy img_read on storage.objects for select using (bucket_id = 'product-images');
create policy img_write on storage.objects for all
  using (bucket_id = 'product-images' and has_perm('products'))
  with check (bucket_id = 'product-images' and has_perm('products'));
