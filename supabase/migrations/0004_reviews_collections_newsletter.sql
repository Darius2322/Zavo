-- Applied as "zavo_reviews_collections_newsletter".
create table newsletter_subscribers (id uuid primary key default gen_random_uuid(), email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200), created_at timestamptz not null default now());
alter table newsletter_subscribers enable row level security;
create policy news_ins on newsletter_subscribers for insert to anon, authenticated with check (true);
create policy news_sel on newsletter_subscribers for select using (has_perm('content'));
create policy news_del on newsletter_subscribers for delete using (has_perm('content'));

create table collections (id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, description text, active boolean not null default true, sort_order int not null default 0);
create table collection_products (collection_id uuid not null references collections(id) on delete cascade, product_id uuid not null references products(id) on delete cascade, primary key (collection_id, product_id));
alter table collections enable row level security; alter table collection_products enable row level security;
create policy col_pub on collections for select using (active);
create policy col_st on collections for all using (has_perm('products')) with check (has_perm('products'));
create policy cp_pub on collection_products for select using (exists (select 1 from collections c where c.id = collection_id and c.active));
create policy cp_st on collection_products for all using (has_perm('products')) with check (has_perm('products'));

create table product_reviews (id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id) on delete cascade, order_id uuid not null references orders(id),
  reviewer_name text not null check (char_length(reviewer_name) between 1 and 80), rating int not null check (rating between 1 and 5), comment text check (char_length(comment) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')), created_at timestamptz not null default now(), unique (order_id, product_id));
alter table product_reviews enable row level security;
create policy rev_pub on product_reviews for select using (status = 'approved');
create policy rev_st on product_reviews for all using (has_perm('content')) with check (has_perm('content'));

create function submit_review(p_ref text, p_phone text, p_product uuid, p_rating int, p_name text, p_comment text) returns void
language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where reference = upper(trim(p_ref)) and status = 'completed'
    and right(regexp_replace(phone,'\D','','g'),9) = right(regexp_replace(coalesce(p_phone,''),'\D','','g'),9);
  if not found then raise exception 'No completed order matches that reference and phone number'; end if;
  if not exists (select 1 from order_items i join product_variants v on v.id = i.variant_id where i.order_id = o.id and v.product_id = p_product) then
    raise exception 'That product was not in this order'; end if;
  begin
    insert into product_reviews (product_id, order_id, reviewer_name, rating, comment) values (p_product, o.id, trim(p_name), p_rating, nullif(trim(p_comment),''));
  exception when unique_violation then raise exception 'You have already reviewed this product for this order'; end;
end $$;
revoke all on function submit_review(text,text,uuid,int,text,text) from public;
grant execute on function submit_review(text,text,uuid,int,text,text) to anon, authenticated;

create function throttle() returns trigger language plpgsql as $$
begin
  if tg_table_name = 'orders' and (select count(*) from orders where phone = new.phone and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many orders from this phone number. Try again later.'; end if;
  if tg_table_name = 'contact_messages' and ((select count(*) from contact_messages where contact = new.contact and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from contact_messages where created_at > now() - interval '1 hour') >= 200) then
    raise exception 'Too many messages. Try again later.'; end if;
  return new;
end $$;
create trigger throttle_orders before insert on orders for each row execute function throttle();
create trigger throttle_contact before insert on contact_messages for each row execute function throttle();
