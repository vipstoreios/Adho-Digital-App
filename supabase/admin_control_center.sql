-- Mini group Admin Control Center (additive, production-safe migration)
-- Run after marketplace_roles_stores.sql. Existing customer data is preserved.
begin;

create table if not exists public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('customer','store_owner','driver','admin')),
  assigned_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id,role)
);
insert into public.user_roles(user_id,role)
select id,coalesce(role,'customer') from public.users
on conflict do nothing;
insert into public.user_roles(user_id,role)
select user_id,'admin' from public.admin_roles where role='admin'
on conflict do nothing;

create table if not exists public.app_content (
  key text primary key,
  section text not null,
  value_ku text not null default '',
  value_ar text not null default '',
  value_en text not null default '',
  description text not null default '',
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.stores add column if not exists cover_image text;
alter table public.stores add column if not exists delivery_available boolean not null default true;
alter table public.stores add column if not exists pickup_available boolean not null default true;
alter table public.stores add column if not exists delivery_radius_km numeric(8,2) not null default 10;
alter table public.categories add column if not exists is_active boolean not null default true;
alter table public.banners add column if not exists description_ku text not null default '';
alter table public.banners add column if not exists description_ar text not null default '';
alter table public.banners add column if not exists description_en text not null default '';
alter table public.banners add column if not exists cta_ku text not null default '';
alter table public.banners add column if not exists cta_ar text not null default '';
alter table public.banners add column if not exists cta_en text not null default '';
alter table public.banners add column if not exists action_type text not null default 'none';
alter table public.banners add column if not exists action_value text;
alter table public.banners add column if not exists starts_at timestamptz;
alter table public.banners add column if not exists ends_at timestamptz;

create index if not exists user_roles_user_idx on public.user_roles(user_id);
create index if not exists app_content_section_idx on public.app_content(section,is_active);
create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);
create index if not exists banners_schedule_idx on public.banners(is_active,starts_at,ends_at);

create or replace function public.is_mini_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.admin_roles a where a.user_id=auth.uid() and a.role='admin');
$$;
revoke all on function public.is_mini_admin() from public,anon;
grant execute on function public.is_mini_admin() to authenticated;

create or replace function public.admin_record_audit(p_action text,p_entity text,p_entity_id text default null,p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_mini_admin() then raise insufficient_privilege; end if;
  insert into public.admin_audit_log(admin_id,action,entity,entity_id,details)
  values(auth.uid(),p_action,p_entity,p_entity_id,coalesce(p_details,'{}'::jsonb));
end;
$$;
revoke all on function public.admin_record_audit(text,text,text,jsonb) from public,anon;
grant execute on function public.admin_record_audit(text,text,text,jsonb) to authenticated;

create or replace function public.admin_set_user_role(p_user_id uuid,p_role text,p_enabled boolean default true)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_mini_admin() then raise insufficient_privilege; end if;
  if p_role not in ('customer','store_owner','driver','admin') then raise exception 'Invalid role'; end if;
  if p_user_id=auth.uid() and p_role='admin' and not p_enabled then raise exception 'You cannot remove your own admin access'; end if;
  if p_enabled then
    insert into public.user_roles(user_id,role,assigned_by) values(p_user_id,p_role,auth.uid())
    on conflict(user_id,role) do update set assigned_by=excluded.assigned_by;
    update public.users set role=p_role where id=p_user_id;
    if p_role='admin' then insert into public.admin_roles(user_id,role) values(p_user_id,'admin') on conflict(user_id) do update set role='admin'; end if;
    if p_role='driver' then insert into public.drivers(user_id,is_active,is_available) values(p_user_id,true,false) on conflict(user_id) do update set is_active=true; end if;
  else
    delete from public.user_roles where user_id=p_user_id and role=p_role;
    if p_role='admin' then delete from public.admin_roles where user_id=p_user_id; end if;
    update public.users set role=coalesce((select ur.role from public.user_roles ur where ur.user_id=p_user_id order by case ur.role when 'admin' then 1 when 'store_owner' then 2 when 'driver' then 3 else 4 end limit 1),'customer') where id=p_user_id;
  end if;
  insert into public.admin_audit_log(admin_id,action,entity,entity_id,details) values(auth.uid(),case when p_enabled then 'grant_role' else 'remove_role' end,'users',p_user_id::text,jsonb_build_object('role',p_role));
end;
$$;
revoke all on function public.admin_set_user_role(uuid,text,boolean) from public,anon;
grant execute on function public.admin_set_user_role(uuid,text,boolean) to authenticated;

create or replace function public.admin_delete_user(p_user_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_mini_admin() then raise insufficient_privilege; end if;
  if p_user_id=auth.uid() then raise exception 'You cannot delete your own admin account'; end if;
  insert into public.admin_audit_log(admin_id,action,entity,entity_id) values(auth.uid(),'delete_account','users',p_user_id::text);
  delete from auth.users where id=p_user_id;
end;
$$;
revoke all on function public.admin_delete_user(uuid) from public,anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

create or replace function public.admin_overview() returns jsonb
language sql stable security definer set search_path='' as $$
  select case when public.is_mini_admin() then jsonb_build_object(
    'products',(select count(*) from public.products),
    'categories',(select count(*) from public.categories),
    'customers',(select count(*) from public.users),
    'stores',(select count(*) from public.stores),
    'active_stores',(select count(*) from public.stores where status='active'),
    'drivers',(select count(*) from public.drivers),
    'active_drivers',(select count(*) from public.drivers where is_active),
    'orders',(select count(*) from public.orders),
    'pending_orders',(select count(*) from public.orders where status in ('pending','confirmed','preparing')),
    'low_stock',(select count(*) from public.products where stock<=5 and is_active),
    'sales_iqd',(select coalesce(sum(total_price),0) from public.orders where status='delivered')
  ) else (select null::jsonb) end;
$$;
revoke all on function public.admin_overview() from public,anon;
grant execute on function public.admin_overview() to authenticated;

alter table public.user_roles enable row level security;
alter table public.app_content enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists roles_read_own_or_admin on public.user_roles;
create policy roles_read_own_or_admin on public.user_roles for select to authenticated using(user_id=auth.uid() or public.is_mini_admin());
drop policy if exists roles_admin_write on public.user_roles;
create policy roles_admin_write on public.user_roles for all to authenticated using(public.is_mini_admin()) with check(public.is_mini_admin());
drop policy if exists content_public_read on public.app_content;
create policy content_public_read on public.app_content for select to anon,authenticated using(is_active or public.is_mini_admin());
drop policy if exists content_admin_write on public.app_content;
create policy content_admin_write on public.app_content for all to authenticated using(public.is_mini_admin()) with check(public.is_mini_admin());
drop policy if exists audit_admin_read on public.admin_audit_log;
create policy audit_admin_read on public.admin_audit_log for select to authenticated using(public.is_mini_admin());

grant select on public.app_content to anon,authenticated;
grant select on public.user_roles to authenticated;
grant select,insert,update,delete on public.user_roles,public.app_content to authenticated;
grant select on public.admin_audit_log to authenticated;

-- Admins receive table access through RLS; ordinary users retain existing policies.
do $$ declare t text; begin
  foreach t in array array['users','products','categories','orders','order_items','addresses','stores','drivers','banners','featured_products','app_settings'] loop
    execute format('drop policy if exists admin_full_access on public.%I',t);
    execute format('create policy admin_full_access on public.%I for all to authenticated using (public.is_mini_admin()) with check (public.is_mini_admin())',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists admin_upload_marketplace_images on storage.objects;
create policy admin_upload_marketplace_images on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.is_mini_admin());
drop policy if exists admin_update_marketplace_images on storage.objects;
create policy admin_update_marketplace_images on storage.objects for update to authenticated using(bucket_id='product-images' and public.is_mini_admin()) with check(bucket_id='product-images' and public.is_mini_admin());
drop policy if exists admin_delete_marketplace_images on storage.objects;
create policy admin_delete_marketplace_images on storage.objects for delete to authenticated using(bucket_id='product-images' and public.is_mini_admin());

-- Realtime role refresh for Flutter clients. Ignore if already published.
do $$ begin
  alter publication supabase_realtime add table public.user_roles;
exception when duplicate_object then null; end $$;

commit;
