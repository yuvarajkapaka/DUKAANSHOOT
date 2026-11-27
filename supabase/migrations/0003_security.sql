-- DukaanShoot security hardening. Run after 0002_marketplace.sql.
--
--  1. The shared "Demo as Seller / Buyer" accounts can't deface the public
--     marketplace: the seeded shop and listings are read-only to them, and anything
--     they list stays hidden (visible only inside the demo account).
--  2. View / WhatsApp counters only move through the server (/api/track), which
--     counts each visitor once per product every 30 minutes.

-- ------------------------------------------------------------- demo accounts
alter table public.profiles add column if not exists is_demo boolean not null default false;
-- Users can't set is_demo themselves: only the columns granted in 0001/0002 are
-- updatable by them. scripts/seed-supabase.mjs marks the demo accounts.

create or replace function public.is_demo_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_demo from public.profiles where id = auth.uid()), false)
$$;

-- shops: the demo can't rename, re-brand, delete or add a public shop
create or replace function public.guard_demo_shop() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_demo_user() then raise exception 'DEMO_READ_ONLY'; end if;
  return coalesce(new, old);
end $$;
drop trigger if exists shops_demo_guard on public.shops;
create trigger shops_demo_guard before insert or update or delete on public.shops
  for each row execute function public.guard_demo_shop();

-- products: the demo seller may add and edit its own drafts (always hidden from the
-- public market) but not touch the public listings. Stock moved by orders still works.
create or replace function public.guard_demo_product() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_demo_user() and public.owns_shop(coalesce(new.shop_id, old.shop_id))) then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' then
    new.status := 'hidden';
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'stock') = (to_jsonb(old) - 'stock') then return new; end if;  -- order placed / rejected
    if old.status <> 'hidden' then raise exception 'DEMO_READ_ONLY'; end if;
    new.status := 'hidden';
    return new;
  end if;
  if old.status <> 'hidden' then raise exception 'DEMO_READ_ONLY'; end if;  -- delete
  return old;
end $$;
drop trigger if exists products_demo_guard on public.products;
create trigger products_demo_guard before insert or update or delete on public.products
  for each row execute function public.guard_demo_product();

-- product photos follow their product
create or replace function public.guard_demo_product_image() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_status text; v_shop uuid;
begin
  select status, shop_id into v_status, v_shop from public.products where id = coalesce(new.product_id, old.product_id);
  if v_status is not null and v_status <> 'hidden' and public.is_demo_user() and public.owns_shop(v_shop) then
    raise exception 'DEMO_READ_ONLY';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists product_images_demo_guard on public.product_images;
create trigger product_images_demo_guard before insert or update or delete on public.product_images
  for each row execute function public.guard_demo_product_image();

-- profiles: a visitor can't flip the shared demo buyer into a seller (or back)
create or replace function public.guard_demo_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.is_demo and auth.uid() = old.id and new.role is distinct from old.role then
    raise exception 'DEMO_READ_ONLY';
  end if;
  return new;
end $$;
drop trigger if exists profiles_demo_guard on public.profiles;
create trigger profiles_demo_guard before update on public.profiles
  for each row execute function public.guard_demo_profile();

-- ------------------------------------------------------------- counters
revoke execute on function public.track_product(uuid, text) from public, anon, authenticated;
grant execute on function public.track_product(uuid, text) to service_role;
