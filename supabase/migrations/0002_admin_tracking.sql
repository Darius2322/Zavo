-- Applied to the ZAVO project as "zavo_admin_tracking".
create table audit_log (id uuid primary key default gen_random_uuid(), actor uuid references auth.users(id), action text not null, detail jsonb, created_at timestamptz not null default now());
alter table audit_log enable row level security;
create policy st_audit on audit_log for select using (has_perm('staff'));

create function track_order(p_ref text, p_phone text) returns jsonb language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where reference = upper(trim(p_ref)) and right(regexp_replace(phone,'\D','','g'),9) = right(regexp_replace(coalesce(p_phone,''),'\D','','g'),9);
  if not found then return null; end if;
  return jsonb_build_object('reference',o.reference,'created_at',o.created_at,'status',o.status,'payment_status',o.payment_status,'fulfilment',o.fulfilment,'total_kes',o.total_kes,
    'items',(select coalesce(jsonb_agg(jsonb_build_object('name',product_name,'size',size,'colour',colour,'quantity',quantity,'unit_price_kes',unit_price_kes)),'[]') from order_items where order_id=o.id),
    'updates',(select coalesce(jsonb_agg(jsonb_build_object('status',status,'note',customer_visible_note,'at',created_at) order by created_at),'[]') from order_status_history where order_id=o.id));
end $$;
revoke all on function track_order(text,text) from public;
grant execute on function track_order(text,text) to anon, authenticated;

create function admin_set_order_status(p_id uuid, p_status order_status, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare o orders; r record;
begin
  if not has_perm('orders') then raise exception 'Not allowed'; end if;
  select * into o from orders where id = p_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status in ('cancelled','completed') then raise exception 'Order is already %', o.status; end if;
  if p_status = 'cancelled' then
    for r in select variant_id, quantity from order_items where order_id = p_id loop
      update product_variants set stock = stock + r.quantity where id = r.variant_id;
      insert into inventory_movements (variant_id, delta, reason, order_id, created_by) values (r.variant_id, r.quantity, 'order cancelled', p_id, auth.uid());
    end loop;
  end if;
  update orders set status = p_status, updated_at = now() where id = p_id;
  insert into order_status_history (order_id, status, customer_visible_note, changed_by) values (p_id, p_status, p_note, auth.uid());
  insert into audit_log (actor, action, detail) values (auth.uid(), 'order_status', jsonb_build_object('order', p_id, 'from', o.status, 'to', p_status));
end $$;

create function admin_set_payment_status(p_id uuid, p_status payment_status) returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('orders') then raise exception 'Not allowed'; end if;
  update orders set payment_status = p_status, updated_at = now() where id = p_id;
  insert into audit_log (actor, action, detail) values (auth.uid(), 'payment_status', jsonb_build_object('order', p_id, 'to', p_status));
end $$;

create function admin_adjust_stock(p_variant uuid, p_delta int, p_reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('inventory') then raise exception 'Not allowed'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'Reason required'; end if;
  update product_variants set stock = stock + p_delta where id = p_variant;
  insert into inventory_movements (variant_id, delta, reason, created_by) values (p_variant, p_delta, p_reason, auth.uid());
  insert into audit_log (actor, action, detail) values (auth.uid(), 'stock_adjust', jsonb_build_object('variant', p_variant, 'delta', p_delta, 'reason', p_reason));
end $$;
revoke all on function admin_set_order_status(uuid,order_status,text), admin_set_payment_status(uuid,payment_status), admin_adjust_stock(uuid,int,text) from public, anon;
grant execute on function admin_set_order_status(uuid,order_status,text), admin_set_payment_status(uuid,payment_status), admin_adjust_stock(uuid,int,text) to authenticated;
drop policy st_ord_up on orders;
create policy st_ord_notes on orders for update using (has_perm('orders')) with check (has_perm('orders'));
revoke update on orders from authenticated;
grant update (internal_notes) on orders to authenticated;
