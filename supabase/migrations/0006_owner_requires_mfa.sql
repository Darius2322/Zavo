-- Applied as "zavo_owner_requires_mfa": owners must be at aal2 (authenticator code); staff only if they enrolled.
create or replace function has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_profiles a where a.user_id = auth.uid() and a.active
    and (a.role = 'owner' or p = any(a.permissions)))
  and (coalesce(auth.jwt()->>'aal','aal1') = 'aal2'
    or (not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
        and not exists (select 1 from admin_profiles o where o.user_id = auth.uid() and o.role = 'owner')));
$$;
