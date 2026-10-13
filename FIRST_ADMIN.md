# First administrator
1. Supabase dashboard > Authentication > Users > Add user (email + strong password).
2. Run in SQL editor, replacing the id:
   insert into admin_profiles (user_id, full_name, role) values ('<USER_UUID>', 'Your name', 'owner');
Nobody becomes admin automatically; there is no public admin sign-up.
