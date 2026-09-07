-- Replace the placeholder with the UUID created in Supabase Auth.
insert into public.admin_roles (user_id, role)
values ('REPLACE_WITH_AUTH_USER_UUID', 'admin')
on conflict (user_id) do update set role = excluded.role;

select user_id, role from public.admin_roles
where user_id = 'REPLACE_WITH_AUTH_USER_UUID';
