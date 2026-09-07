-- Run only after creating the first user in Supabase Auth dashboard.
-- Replace the UUID; never put a password in SQL or frontend code.
insert into public.admin_roles(user_id, role)
values ('REPLACE_WITH_AUTH_USER_UUID'::uuid, 'admin')
on conflict (user_id) do update set role='admin';

-- Verify the role and RPC grants:
select user_id, role from public.admin_roles where user_id='REPLACE_WITH_AUTH_USER_UUID'::uuid;
select routine_name from information_schema.routines
where routine_schema='public' and routine_name in ('is_mini_admin','admin_overview','admin_set_order_status');
