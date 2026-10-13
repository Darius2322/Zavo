-- Applied as "zavo_audit_insert" + "zavo_audit_insert_fix": lets product staff log price changes.
create function audit_set_actor() returns trigger language plpgsql security definer set search_path = public as $$
begin new.actor := auth.uid(); return new; end $$;
create trigger audit_actor before insert on audit_log for each row when (new.actor is null) execute function audit_set_actor();
create policy st_audit_ins on audit_log for insert to authenticated with check (has_perm('products') and action = 'price_change' and actor = auth.uid());
