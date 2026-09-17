-- Additive Mini group multi-store marketplace migration.
-- Apply after schema.sql, quantity_units.sql, production_checkout.sql and admin_management.sql.
begin;

alter table public.users add column if not exists role text not null default 'customer';
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('customer','store_owner','driver','admin'));

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete restrict,
  name text not null,
  image text,
  description text not null default '',
  location text not null default '',
  latitude double precision,
  longitude double precision,
  opening_hours jsonb not null default '{}'::jsonb,
  contact_phone text,
  status text not null default 'pending'
    check (status in ('pending','active','disabled')),
  created_at timestamptz not null default now()
);

create table if not exists public.drivers (
  user_id uuid primary key references public.users(id) on delete cascade,
  phone text,
  vehicle_type text,
  vehicle_plate text,
  latitude double precision,
  longitude double precision,
  is_available boolean not null default false,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.store_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique(store_id,user_id)
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title_ku text not null default '', title_ar text not null default '', title_en text not null default '',
  image text not null, action_url text, sort_order integer not null default 0,
  is_active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.featured_products (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  sort_order integer not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.app_settings (
  id text primary key, value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(), created_at timestamptz not null default now()
);

alter table public.products add column if not exists store_id uuid references public.stores(id) on delete restrict;
alter table public.orders add column if not exists store_id uuid references public.stores(id) on delete restrict;
alter table public.orders add column if not exists driver_id uuid references public.drivers(user_id) on delete set null;
alter table public.orders add column if not exists delivery_status text not null default 'pending';
alter table public.orders add column if not exists delivery_lat double precision;
alter table public.orders add column if not exists delivery_lng double precision;
alter table public.orders add column if not exists delivery_fee integer not null default 0 check (delivery_fee >= 0);
alter table public.orders drop constraint if exists orders_delivery_status_check;
alter table public.orders add constraint orders_delivery_status_check check
  (delivery_status in ('pending','accepted','preparing','ready_for_pickup','out_for_delivery','delivered','cancelled'));

create index if not exists stores_owner_idx on public.stores(owner_id);
create index if not exists stores_status_idx on public.stores(status);
create index if not exists products_store_idx on public.products(store_id);
create index if not exists orders_store_idx on public.orders(store_id,created_at desc);
create index if not exists orders_driver_idx on public.orders(driver_id,created_at desc);

create or replace function public.create_checkout(p_request_id text,p_address_id uuid,p_quantities jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  owner_id uuid:=auth.uid(); order_id uuid; address_row public.addresses;
  product_row public.products; entry record; qty numeric(12,3); total bigint:=0;
  selected_store uuid; first_product boolean:=true;
begin
  if owner_id is null then raise exception 'authenticationRequired'; end if;
  if p_request_id is null or length(p_request_id) not between 1 and 128 then raise exception 'invalidOrder'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text||p_request_id,0));
  select id into order_id from public.orders where user_id=owner_id and request_id=p_request_id;
  if found then return order_id; end if;
  if jsonb_typeof(p_quantities) is distinct from 'object' or p_quantities='{}'::jsonb then raise exception 'invalidOrder'; end if;
  select * into address_row from public.addresses where id=p_address_id and user_id=owner_id;
  if not found then raise exception 'invalidOrder'; end if;
  insert into public.orders(user_id,address_id,total_price,status,payment_method,request_id,address_snapshot,
    delivery_lat,delivery_lng)
  values(owner_id,p_address_id,0,'pending','cash_on_delivery',p_request_id,to_jsonb(address_row),
    address_row.location_lat,address_row.location_lng) returning id into order_id;
  for entry in select key,value from jsonb_each_text(p_quantities) order by key loop
    if entry.value !~ '^[0-9]+(\.[0-9]{1,3})?$' or entry.value::numeric<=0 then raise exception 'invalidOrder'; end if;
    qty:=entry.value::numeric;
    select * into product_row from public.products where id=entry.key::uuid for update;
    if not found or not product_row.is_active or product_row.stock<qty then raise exception 'stockChanged'; end if;
    if first_product then selected_store:=product_row.store_id; first_product:=false;
    elsif product_row.store_id is distinct from selected_store then raise exception 'singleStoreRequired'; end if;
    total:=total+round(coalesce(product_row.final_price,product_row.price_per_unit,product_row.price_iqd)::numeric*qty)::bigint;
    insert into public.order_items(order_id,product_id,quantity,price,product_name)
    values(order_id,product_row.id,qty,round(coalesce(product_row.final_price,product_row.price_per_unit,product_row.price_iqd)),product_row.name_en);
    update public.products set stock=stock-qty where id=product_row.id;
  end loop;
  update public.orders set total_price=total,store_id=selected_store where id=order_id;
  return order_id;
end;
$$;
revoke all on function public.create_checkout(text,uuid,jsonb) from public,anon;
grant execute on function public.create_checkout(text,uuid,jsonb) to authenticated;

create or replace function public.current_mini_role() returns text
language sql stable security definer set search_path='' as $$
  select case
    when exists(select 1 from public.admin_roles a where a.user_id=auth.uid() and a.role='admin') then 'admin'
    else coalesce((select u.role from public.users u where u.id=auth.uid()),'customer')
  end;
$$;
revoke all on function public.current_mini_role() from public,anon;
grant execute on function public.current_mini_role() to authenticated;

create or replace function public.protect_user_role() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.role is distinct from old.role and public.current_mini_role() <> 'admin' then
    raise insufficient_privilege using message='Only an admin can change roles';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_user_role on public.users;
create trigger protect_user_role before update of role on public.users
for each row execute function public.protect_user_role();

create or replace function public.admin_set_user_role(p_user_id uuid,p_role text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if public.current_mini_role() <> 'admin' then raise insufficient_privilege; end if;
  if p_role not in ('customer','store_owner','driver','admin') then raise exception 'Invalid role'; end if;
  update public.users set role=p_role where id=p_user_id;
  if not found then raise exception 'User not found'; end if;
end;
$$;
revoke all on function public.admin_set_user_role(uuid,text) from public,anon;
grant execute on function public.admin_set_user_role(uuid,text) to authenticated;

create or replace function public.driver_accept_order(p_order_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if public.current_mini_role() <> 'driver' then raise insufficient_privilege; end if;
  update public.orders set driver_id=auth.uid(),delivery_status='accepted'
  where id=p_order_id and driver_id is null and delivery_status='ready_for_pickup';
  if not found then raise exception 'Order is no longer available'; end if;
end;
$$;
revoke all on function public.driver_accept_order(uuid) from public,anon;
grant execute on function public.driver_accept_order(uuid) to authenticated;

alter table public.stores enable row level security;
alter table public.drivers enable row level security;
alter table public.store_reviews enable row level security;
alter table public.banners enable row level security;
alter table public.featured_products enable row level security;
alter table public.app_settings enable row level security;
grant select on public.stores,public.store_reviews to anon,authenticated;
grant select,insert,update,delete on public.stores,public.drivers,public.store_reviews to authenticated;
grant select on public.banners,public.featured_products to anon,authenticated;
grant insert,update,delete on public.banners,public.featured_products to authenticated;
grant select,insert,update,delete on public.app_settings to authenticated;

drop policy if exists marketplace_public_stores on public.stores;
create policy marketplace_public_stores on public.stores for select using
  (status='active' or owner_id=auth.uid() or public.current_mini_role()='admin');
drop policy if exists marketplace_owner_stores on public.stores;
create policy marketplace_owner_stores on public.stores for all to authenticated
  using(owner_id=auth.uid() or public.current_mini_role()='admin')
  with check(owner_id=auth.uid() or public.current_mini_role()='admin');

drop policy if exists marketplace_owner_products on public.products;
create policy marketplace_owner_products on public.products for all to authenticated
  using(public.current_mini_role()='admin' or exists(
    select 1 from public.stores s where s.id=products.store_id and s.owner_id=auth.uid()))
  with check(public.current_mini_role()='admin' or exists(
    select 1 from public.stores s where s.id=products.store_id and s.owner_id=auth.uid()));

drop policy if exists marketplace_store_orders on public.orders;
create policy marketplace_store_orders on public.orders for select to authenticated using
  (public.current_mini_role()='admin' or exists(
    select 1 from public.stores s where s.id=orders.store_id and s.owner_id=auth.uid()));
drop policy if exists marketplace_driver_orders on public.orders;
create policy marketplace_driver_orders on public.orders for select to authenticated using
  (driver_id=auth.uid() or (public.current_mini_role()='driver' and driver_id is null and delivery_status='ready_for_pickup'));

drop policy if exists marketplace_driver_profile on public.drivers;
create policy marketplace_driver_profile on public.drivers for all to authenticated
  using(user_id=auth.uid() or public.current_mini_role()='admin')
  with check(user_id=auth.uid() or public.current_mini_role()='admin');
drop policy if exists marketplace_reviews_read on public.store_reviews;
create policy marketplace_reviews_read on public.store_reviews for select using(true);
drop policy if exists marketplace_reviews_write on public.store_reviews;
create policy marketplace_reviews_write on public.store_reviews for all to authenticated
  using(user_id=auth.uid() or public.current_mini_role()='admin')
  with check(user_id=auth.uid() or public.current_mini_role()='admin');
drop policy if exists marketplace_public_banners on public.banners;
create policy marketplace_public_banners on public.banners for select using(is_active or public.current_mini_role()='admin');
drop policy if exists marketplace_admin_banners on public.banners;
create policy marketplace_admin_banners on public.banners for all to authenticated
  using(public.current_mini_role()='admin') with check(public.current_mini_role()='admin');
drop policy if exists marketplace_public_featured on public.featured_products;
create policy marketplace_public_featured on public.featured_products for select using(is_active or public.current_mini_role()='admin');
drop policy if exists marketplace_admin_featured on public.featured_products;
create policy marketplace_admin_featured on public.featured_products for all to authenticated
  using(public.current_mini_role()='admin') with check(public.current_mini_role()='admin');
drop policy if exists marketplace_admin_settings on public.app_settings;
create policy marketplace_admin_settings on public.app_settings for all to authenticated
  using(public.current_mini_role()='admin') with check(public.current_mini_role()='admin');

-- Existing accounts remain customers unless they already have an admin role.
update public.users u set role='admin'
where exists(select 1 from public.admin_roles a where a.user_id=u.id and a.role='admin');

create or replace function public.admin_overview() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if public.current_mini_role()<>'admin' then raise insufficient_privilege; end if;
  return jsonb_build_object(
    'products',(select count(*) from public.products),
    'categories',(select count(*) from public.categories),
    'customers',(select count(*) from public.users where role='customer'),
    'stores',(select count(*) from public.stores),
    'drivers',(select count(*) from public.users where role='driver'),
    'orders',(select count(*) from public.orders),
    'sales_iqd',(select coalesce(sum(total_price::bigint),0) from public.orders where status='delivered'),
    'recent_orders',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from
      (select o.id,o.total_price,o.status,o.created_at,u.full_name,s.name store_name
       from public.orders o left join public.users u on u.id=o.user_id
       left join public.stores s on s.id=o.store_id order by o.created_at desc limit 5) r));
end;
$$;
revoke all on function public.admin_overview() from public,anon;
grant execute on function public.admin_overview() to authenticated;

commit;


