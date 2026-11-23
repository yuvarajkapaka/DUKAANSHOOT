-- DukaanShoot marketplace: two roles (seller / buyer), shops, products, cart,
-- wishlist, orders with status history, notifications. Run after 0001_init.sql.
--
-- Security model (Row Level Security on every table):
--   public  : read shops, active products and their images
--   buyers  : only their own cart, wishlist, addresses, orders, notifications
--   sellers : only orders of THEIR shop; status changes only via set_order_status()
-- Stock is reduced inside place_order() and restored on cancel / reject.

-- ------------------------------------------------------------ profiles
alter table public.profiles add column if not exists role text check (role in ('seller','buyer'));
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists name text;
grant update (role, city, name) on public.profiles to authenticated;

-- ---------------------------------------------------------------- shops
create table if not exists public.shops (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users(id) on delete cascade,
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  name        text not null,
  city        text not null default '',
  whatsapp    text not null default '',
  delivery    text not null default 'both' check (delivery in ('delivery','pickup','both')),
  shop_type   text not null default 'sarees',
  logo        text,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references public.shops(id) on delete cascade,
  title         text not null check (length(title) between 1 and 80),
  description   text not null default '',
  category      text not null check (category in ('sarees','kurtas','men','kids','lehengas','jewellery')),
  price_paise   integer not null check (price_paise > 0),
  mrp_paise     integer check (mrp_paise is null or mrp_paise > 0),
  sizes         text[] not null default '{}',
  stock         integer not null default 0 check (stock >= 0),
  status        text not null default 'active' check (status in ('active','hidden','soldout')),
  before_image  text,
  views         integer not null default 0,
  wa_clicks     integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists products_shop on public.products(shop_id);
create index if not exists products_feed on public.products(status, created_at desc);

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  position    integer not null default 0
);
create index if not exists product_images_product on public.product_images(product_id, position);

-- ---------------------------------------------------------------- buyer
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  phone       text not null,
  line1       text not null,
  city        text not null,
  pincode     text not null check (pincode ~ '^[0-9]{6}$'),
  is_default  boolean not null default false
);

create table if not exists public.wishlists (
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  size        text not null,
  qty         integer not null check (qty between 1 and 10),
  unique (user_id, product_id, size)
);

-- --------------------------------------------------------------- orders
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  code            text not null,
  buyer_id        uuid not null references auth.users(id) on delete cascade,
  shop_id         uuid not null references public.shops(id) on delete cascade,
  status          text not null default 'new' check (status in ('new','accepted','packed','shipped','ready','delivered','rejected','cancelled')),
  delivery_type   text not null check (delivery_type in ('delivery','pickup')),
  address         jsonb,
  total_paise     integer not null check (total_paise > 0),
  payment_method  text not null check (payment_method in ('cod','pay_at_shop')),
  cancel_reason   text,
  buyer_name      text not null,
  buyer_phone     text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists orders_buyer on public.orders(buyer_id, created_at desc);
create index if not exists orders_shop on public.orders(shop_id, created_at desc);

create table if not exists public.order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders(id) on delete cascade,
  product_id            uuid references public.products(id) on delete set null,
  title_snapshot        text not null,
  price_paise_snapshot  integer not null,
  size                  text not null,
  qty                   integer not null check (qty between 1 and 10),
  image_path            text not null default ''
);

create table if not exists public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      text not null,
  changed_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text not null default '',
  link        text not null default '/',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications(user_id, created_at desc);

-- ------------------------------------------------------------------ RLS
alter table public.shops                enable row level security;
alter table public.products             enable row level security;
alter table public.product_images       enable row level security;
alter table public.addresses            enable row level security;
alter table public.wishlists            enable row level security;
alter table public.cart_items           enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;
alter table public.notifications        enable row level security;

create or replace function public.owns_shop(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shops where id = p_shop and owner_id = auth.uid())
$$;

create policy "shops public read" on public.shops for select using (true);
create policy "shops owner insert" on public.shops for insert with check (owner_id = auth.uid());
create policy "shops owner update" on public.shops for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "products public read" on public.products for select using (status <> 'hidden' or public.owns_shop(shop_id));
create policy "products owner insert" on public.products for insert with check (public.owns_shop(shop_id));
create policy "products owner update" on public.products for update using (public.owns_shop(shop_id)) with check (public.owns_shop(shop_id));
create policy "products owner delete" on public.products for delete using (public.owns_shop(shop_id));
-- counters are changed only by track_product(); sellers can't fake views
revoke update (views, wa_clicks) on public.products from authenticated, anon;

create policy "images public read" on public.product_images for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status <> 'hidden' or public.owns_shop(p.shop_id))));
create policy "images owner write" on public.product_images for all using (
  exists (select 1 from public.products p where p.id = product_id and public.owns_shop(p.shop_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.owns_shop(p.shop_id)));

create policy "own addresses" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own wishlist" on public.wishlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own cart" on public.cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orders: buyers see theirs, sellers see their shop's. No direct writes — use the functions below.
create policy "orders read" on public.orders for select using (buyer_id = auth.uid() or public.owns_shop(shop_id));
create policy "order items read" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.owns_shop(o.shop_id))));
create policy "order history read" on public.order_status_history for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.owns_shop(o.shop_id))));

create policy "own notifications read" on public.notifications for select using (user_id = auth.uid());
create policy "own notifications update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------ functions
-- Place one order for ONE shop. Locks the product rows, checks + reduces stock.
create or replace function public.place_order(
  p_shop_id uuid, p_items jsonb, p_delivery_type text, p_address jsonb,
  p_buyer_name text, p_buyer_phone text, p_payment_method text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_order uuid;
  v_total integer := 0;
  v_code text := 'DS-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0');
  v_shop public.shops%rowtype;
  it jsonb;
  p public.products%rowtype;
  v_img text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_shop from public.shops where id = p_shop_id;
  if not found then raise exception 'SHOP_NOT_FOUND'; end if;
  if p_delivery_type not in ('delivery','pickup') or (v_shop.delivery <> 'both' and v_shop.delivery <> p_delivery_type) then raise exception 'BAD_DELIVERY'; end if;
  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then raise exception 'BAD_ITEMS'; end if;

  insert into public.orders (code, buyer_id, shop_id, delivery_type, address, total_paise, payment_method, buyer_name, buyer_phone)
  values (v_code, v_uid, p_shop_id, p_delivery_type, case when p_delivery_type = 'delivery' then p_address end, 1,
          case when p_delivery_type = 'delivery' then 'cod' else 'pay_at_shop' end, left(p_buyer_name, 80), left(p_buyer_phone, 20))
  returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into p from public.products where id = (it->>'product_id')::uuid for update;
    if not found or p.shop_id <> p_shop_id or p.status <> 'active' then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    if (it->>'qty')::int < 1 or (it->>'qty')::int > 10 then raise exception 'BAD_QTY'; end if;
    if p.stock < (it->>'qty')::int then raise exception 'OUT_OF_STOCK'; end if;
    update public.products set stock = stock - (it->>'qty')::int where id = p.id;
    select url into v_img from public.product_images where product_id = p.id order by position limit 1;
    insert into public.order_items (order_id, product_id, title_snapshot, price_paise_snapshot, size, qty, image_path)
    values (v_order, p.id, p.title, p.price_paise, left(it->>'size', 20), (it->>'qty')::int, coalesce(v_img, ''));
    v_total := v_total + p.price_paise * (it->>'qty')::int;
  end loop;

  update public.orders set total_paise = v_total where id = v_order;
  insert into public.order_status_history (order_id, status, changed_by) values (v_order, 'new', v_uid);
  insert into public.notifications (user_id, type, title, body, link)
  values (v_shop.owner_id, 'order_new', 'New order ' || v_code, left(p_buyer_name, 80), '/seller/orders/' || v_order);
  return v_order;
end $$;
revoke all on function public.place_order(uuid, jsonb, text, jsonb, text, text, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, jsonb, text, text, text) to authenticated;

create or replace function public._restore_stock(p_order uuid) returns void
language sql security definer set search_path = public as $$
  update public.products p set stock = p.stock + oi.qty
  from public.order_items oi where oi.order_id = p_order and oi.product_id = p.id;
$$;
revoke all on function public._restore_stock(uuid) from public, anon, authenticated;

-- Seller moves an order along: new→accepted→packed→shipped|ready→delivered, or rejects it.
create or replace function public.set_order_status(p_order_id uuid, p_status text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; ok boolean;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or not public.owns_shop(o.shop_id) then raise exception 'FORBIDDEN'; end if;
  ok := case
    when p_status = 'rejected'  then o.status in ('new','accepted','packed')
    when p_status = 'accepted'  then o.status = 'new'
    when p_status = 'packed'    then o.status = 'accepted'
    when p_status = 'shipped'   then o.status = 'packed' and o.delivery_type = 'delivery'
    when p_status = 'ready'     then o.status = 'packed' and o.delivery_type = 'pickup'
    when p_status = 'delivered' then o.status in ('shipped','ready')
    else false end;
  if not ok then raise exception 'BAD_STATUS'; end if;
  update public.orders set status = p_status, updated_at = now(),
         cancel_reason = case when p_status = 'rejected' then left(p_reason, 200) else cancel_reason end
   where id = o.id;
  if p_status = 'rejected' then perform public._restore_stock(o.id); end if;
  insert into public.order_status_history (order_id, status, changed_by) values (o.id, p_status, auth.uid());
  insert into public.notifications (user_id, type, title, body, link)
  values (o.buyer_id, 'order_status', o.code || ': ' || p_status, coalesce(p_reason, ''), '/account/orders/' || o.id);
end $$;
revoke all on function public.set_order_status(uuid, text, text) from public, anon;
grant execute on function public.set_order_status(uuid, text, text) to authenticated;

-- Buyer cancels — only while the order is still "new".
create or replace function public.cancel_order(p_order_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; v_owner uuid;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.buyer_id <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if o.status <> 'new' then raise exception 'TOO_LATE'; end if;
  update public.orders set status = 'cancelled', cancel_reason = left(p_reason, 200), updated_at = now() where id = o.id;
  perform public._restore_stock(o.id);
  insert into public.order_status_history (order_id, status, changed_by) values (o.id, 'cancelled', auth.uid());
  select owner_id into v_owner from public.shops where id = o.shop_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (v_owner, 'order_cancelled', o.code || ': cancelled', coalesce(p_reason, ''), '/seller/orders/' || o.id);
end $$;
revoke all on function public.cancel_order(uuid, text) from public, anon;
grant execute on function public.cancel_order(uuid, text) to authenticated;

-- View / WhatsApp-click counters (anyone, even logged out).
create or replace function public.track_product(p_id uuid, p_field text)
returns void language sql security definer set search_path = public as $$
  update public.products set
    views = views + case when p_field = 'views' then 1 else 0 end,
    wa_clicks = wa_clicks + case when p_field = 'wa' then 1 else 0 end
  where id = p_id and status <> 'hidden';
$$;
grant execute on function public.track_product(uuid, text) to anon, authenticated;

-- ------------------------------------------------------------- realtime
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.products;

-- --------------------------------------------------------------- storage
-- product photos + shop logos are public (it's a shop window); uploads stay under "<uid>/…"
insert into storage.buckets (id, name, public) values ('products', 'products', true) on conflict (id) do nothing;
create policy "product photos upload" on storage.objects for insert
  with check (bucket_id = 'products' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "product photos delete" on storage.objects for delete
  using (bucket_id = 'products' and (storage.foldername(name))[1] = auth.uid()::text);
