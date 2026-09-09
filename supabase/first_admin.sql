-- Mini Group Admin setup
-- 1. Create the user in Supabase Authentication first.
-- 2. Replace the UUID below with the Auth user id.
-- 3. Run this script in Supabase SQL Editor.

insert into public.admin_roles (user_id, role)
values ('REPLACE_WITH_AUTH_USER_UUID', 'admin')
on conflict (user_id)
do update set role = excluded.role;

-- Verify admin assignment
select user_id, role
from public.admin_roles
where user_id = 'REPLACE_WITH_AUTH_USER_UUID';
