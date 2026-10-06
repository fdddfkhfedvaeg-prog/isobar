-- iPhone lineage schema (Postgres / Supabase).
-- Normalised storage (chips, iphone_models) with a flat, read-only view
-- (iphone_lineage) whose columns match src/data/types.ts → IPhoneModel.

create type public.display_tech as enum (
  'LCD', 'IPS LCD', 'Liquid Retina LCD',
  'Super Retina OLED', 'Super Retina XDR OLED', 'ProMotion XDR OLED'
);

create type public.frame_material as enum (
  'Plastic', 'Aluminum', 'Stainless steel', 'Titanium', 'Aluminum unibody'
);

create type public.price_basis as enum ('full', 'contract');

create table public.chips (
  id          smallint generated always as identity primary key,
  name        text not null unique,
  process_nm  numeric(4,1) not null check (process_nm > 0)
);

create table public.iphone_models (
  id                smallint generated always as identity primary key,
  slug              text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name              text not null,
  release_year      smallint not null check (release_year between 2007 and 2100),
  chip_id           smallint not null references public.chips (id),

  -- display
  display_in        numeric(3,1) not null check (display_in > 0),
  display_tech      public.display_tech not null,
  resolution        text not null check (resolution ~ '^\d+×\d+$'),
  refresh_hz        smallint not null default 60 check (refresh_hz in (60, 90, 120, 144)),

  -- camera system
  rear_cameras      smallint not null check (rear_cameras between 1 and 5),
  main_camera_mp    smallint not null check (main_camera_mp > 0),
  max_optical_zoom  numeric(3,1) not null default 1 check (max_optical_zoom >= 1),

  -- chassis
  frame             public.frame_material not null,
  height_mm         numeric(5,2) not null,
  width_mm          numeric(5,2) not null,
  depth_mm          numeric(4,2) not null,
  weight_g          smallint not null,

  -- value
  base_storage_gb   smallint not null,
  launch_price_usd  numeric(7,2) not null check (launch_price_usd > 0),
  price_basis       public.price_basis not null default 'full',

  verified          boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index iphone_models_release_year_idx on public.iphone_models (release_year);
create index iphone_models_chip_idx on public.iphone_models (chip_id);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger iphone_models_touch before update on public.iphone_models
for each row execute function public.touch_updated_at();

-- Flat read model for the frontend. numeric → float8 so PostgREST returns JSON numbers.
create view public.iphone_lineage with (security_invoker = on) as
select
  m.slug, m.name, m.release_year,
  c.name                     as chip,
  c.process_nm::float8       as process_nm,
  m.display_in::float8       as display_in,
  m.display_tech, m.resolution, m.refresh_hz,
  m.rear_cameras, m.main_camera_mp,
  m.max_optical_zoom::float8 as max_optical_zoom,
  m.frame,
  m.height_mm::float8        as height_mm,
  m.width_mm::float8         as width_mm,
  m.depth_mm::float8         as depth_mm,
  m.weight_g, m.base_storage_gb,
  m.launch_price_usd::float8 as launch_price_usd,
  m.price_basis, m.verified
from public.iphone_models m
join public.chips c on c.id = m.chip_id
order by m.release_year, m.display_in, m.id;

-- Public catalogue: anyone may read, nobody may write through the API.
alter table public.chips enable row level security;
alter table public.iphone_models enable row level security;

create policy "chips are public" on public.chips
  for select to anon, authenticated using (true);
create policy "models are public" on public.iphone_models
  for select to anon, authenticated using (true);

grant select on public.iphone_lineage to anon, authenticated;
