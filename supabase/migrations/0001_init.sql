-- DukaanShoot schema. Run in Supabase SQL editor (or `supabase db push`).
-- Every table has Row Level Security: users only see their own rows.
-- Credits can only change through the SECURITY DEFINER functions below.

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------- tables
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  phone       text,
  email       text,
  shop_name   text not null default '',
  shop_type   text not null default 'sarees'
              check (shop_type in ('sarees','boutique','menswear','kids','jewellery','other')),
  language    text not null default 'en' check (language in ('en','te','hi')),
  credits     integer not null default 5 check (credits >= 0),
  defaults    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.uploads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  image_path    text not null,
  garment_type  text not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.generations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  upload_id       uuid references public.uploads(id) on delete set null,
  options         jsonb not null,
  status          text not null default 'running' check (status in ('running','done','failed')),
  provider_job_id text,
  error           text,
  credits_used    integer not null default 0,
  refunded        boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists generations_user_created on public.generations(user_id, created_at desc);

create table if not exists public.generated_images (
  id             uuid primary key default gen_random_uuid(),
  generation_id  uuid not null references public.generations(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  image_path     text not null,
  created_at     timestamptz not null default now()
);
create index if not exists generated_images_gen on public.generated_images(generation_id);

create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  razorpay_order_id    text not null unique,
  razorpay_payment_id  text,
  amount_paise         integer not null check (amount_paise > 0),
  credits_added        integer not null check (credits_added > 0),
  status               text not null default 'created' check (status in ('created','paid','failed')),
  created_at           timestamptz not null default now()
);

-- -------------------------------------------------------------------- RLS
alter table public.profiles         enable row level security;
alter table public.uploads          enable row level security;
alter table public.generations      enable row level security;
alter table public.generated_images enable row level security;
alter table public.payments         enable row level security;

create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- users may edit their shop details, but NEVER their credits
revoke update on public.profiles from authenticated, anon;
grant update (shop_name, shop_type, language, phone, defaults) on public.profiles to authenticated;

create policy "own uploads"  on public.uploads for select using (auth.uid() = user_id);
create policy "own uploads insert" on public.uploads for insert with check (auth.uid() = user_id);
create policy "own uploads delete" on public.uploads for delete using (auth.uid() = user_id);

-- generations are created only via start_generation(); users can read + delete their own
create policy "own generations read"   on public.generations for select using (auth.uid() = user_id);
create policy "own generations delete" on public.generations for delete using (auth.uid() = user_id);

create policy "own images read"   on public.generated_images for select using (auth.uid() = user_id);
create policy "own images delete" on public.generated_images for delete using (auth.uid() = user_id);
create policy "own images insert" on public.generated_images for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.generations g where g.id = generation_id and g.user_id = auth.uid())
);

create policy "own payments read" on public.payments for select using (auth.uid() = user_id);

-- ---------------------------------------------------- new user -> profile
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, phone, credits)
  values (new.id, new.email, new.phone, 5)       -- 5 free photo credits
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------- credits: atomic deduction
-- Called by the logged-in user (via our API route). Deducts credits and creates
-- the generation row in ONE transaction; fails if the balance is too low.
create or replace function public.start_generation(p_amount int, p_options jsonb, p_upload_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_amount < 1 or p_amount > 4 then raise exception 'BAD_AMOUNT'; end if;

  update public.profiles set credits = credits - p_amount
   where id = v_uid and credits >= p_amount;
  if not found then raise exception 'INSUFFICIENT_CREDITS'; end if;

  insert into public.generations (user_id, upload_id, options, status, credits_used)
  values (v_uid, p_upload_id, p_options, 'running', p_amount)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.start_generation(int, jsonb, uuid) from public, anon;
grant execute on function public.start_generation(int, jsonb, uuid) to authenticated;

-- Server only (service role): mark done / failed. A failed generation is
-- refunded exactly once.
create or replace function public.finish_generation(p_generation_id uuid, p_ok boolean, p_error text default null, p_job_id text default null)
returns void language plpgsql security definer set search_path = public as $$
declare g public.generations%rowtype;
begin
  select * into g from public.generations where id = p_generation_id for update;
  if not found then return; end if;
  if p_job_id is not null then
    update public.generations set provider_job_id = p_job_id where id = g.id;
  end if;
  if p_ok is null then return; end if;               -- only storing the job id
  if g.status <> 'running' then return; end if;      -- idempotent
  if p_ok then
    update public.generations set status = 'done' where id = g.id;
  else
    update public.generations set status = 'failed', error = p_error, refunded = true where id = g.id;
    update public.profiles set credits = credits + g.credits_used where id = g.user_id;
  end if;
end $$;
revoke all on function public.finish_generation(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.finish_generation(uuid, boolean, text, text) to service_role;

-- Server only: credit a VERIFIED Razorpay payment exactly once.
create or replace function public.mark_payment_paid(p_order_id text, p_payment_id text)
returns integer language plpgsql security definer set search_path = public as $$
declare p public.payments%rowtype;
begin
  select * into p from public.payments where razorpay_order_id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if p.status = 'paid' then return 0; end if;        -- idempotent (webhook + client verify)
  update public.payments set status = 'paid', razorpay_payment_id = p_payment_id where id = p.id;
  update public.profiles set credits = credits + p.credits_added where id = p.user_id;
  return p.credits_added;
end $$;
revoke all on function public.mark_payment_paid(text, text) from public, anon, authenticated;
grant execute on function public.mark_payment_paid(text, text) to service_role;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('generated', 'generated', false) on conflict (id) do nothing;

-- files live under "<user id>/..." and only that user can touch them
create policy "own files read" on storage.objects for select
  using (bucket_id in ('uploads','generated') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files insert" on storage.objects for insert
  with check (bucket_id in ('uploads','generated') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files delete" on storage.objects for delete
  using (bucket_id in ('uploads','generated') and (storage.foldername(name))[1] = auth.uid()::text);
