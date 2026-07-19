-- ============================================================
-- AVORA — schema (vanilla HTML/CSS/JS + Supabase edition)
-- Table names match what you already created: developers,
-- complexes, apartments, media. Run this in the Supabase SQL
-- Editor — it safely drops and recreates everything so the
-- structure matches the JS code exactly.
-- ============================================================

create extension if not exists "uuid-ossp";

drop table if exists media cascade;
drop table if exists leads cascade;
drop table if exists apartments cascade;
drop table if exists complexes cascade;
drop table if exists developers cascade;
drop table if exists social_links cascade;
drop table if exists site_settings cascade;
drop view if exists developer_project_counts cascade;
drop type if exists content_status cascade;
drop type if exists lead_status cascade;
drop type if exists media_owner cascade;
drop type if exists media_kind cascade;

create type content_status as enum ('published', 'draft', 'archived');
create type lead_status as enum ('new', 'in_progress', 'closed');
create type media_owner as enum ('complex', 'apartment');
create type media_kind as enum ('image', 'video');

-- ------------------------------------------------------------
-- DEVELOPERS
-- ------------------------------------------------------------
create table developers (
  id uuid primary key default uuid_generate_v4(),
  name_ru text not null,
  name_en text not null,
  logo_url text,
  description_ru text,
  description_en text,
  website_url text,
  sort_order integer not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- COMPLEXES (residential complexes)
-- ------------------------------------------------------------
create table complexes (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,

  name_ru text not null,
  name_en text not null,

  country text not null,
  city text not null,

  price_from_usd numeric(14, 2),

  description_ru text,
  description_en text,

  format_ru text,
  format_en text,

  payment_plan_ru text,
  payment_plan_en text,

  handover_date text,
  yield_ru text,
  yield_en text,

  extra_info_ru text,
  extra_info_en text,

  amenities text[] default '{}',
  cover_image_url text,

  latitude double precision,
  longitude double precision,
  google_maps_url text,

  developer_id uuid references developers(id) on delete set null,

  trust_history_enabled boolean not null default false,
  trust_legal_enabled boolean not null default false,
  trust_construction_enabled boolean not null default false,
  trust_contract_enabled boolean not null default false,

  developer_lead_url text,

  status content_status not null default 'draft',
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index complexes_status_idx on complexes(status);
create index complexes_developer_idx on complexes(developer_id);

-- ------------------------------------------------------------
-- APARTMENTS (unit types within a complex)
-- ------------------------------------------------------------
create table apartments (
  id uuid primary key default uuid_generate_v4(),
  complex_id uuid not null references complexes(id) on delete cascade,
  slug text not null,

  name_ru text not null,
  name_en text not null,

  bedrooms integer,
  area_from_sqm numeric(10, 2),
  price_usd numeric(14, 2),

  description_ru text,
  description_en text,

  floor_plan_url text,
  extra_specs jsonb not null default '[]',  -- [{label_ru,label_en,value_ru,value_en}]

  status content_status not null default 'draft',
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (complex_id, slug)
);

create index apartments_complex_idx on apartments(complex_id);
create index apartments_status_idx on apartments(status);

-- ------------------------------------------------------------
-- MEDIA (photos/videos for a complex or an apartment)
-- Up to 15 photos + 10 videos per owner — enforced in the
-- admin UI; the table itself has no hard limit.
-- ------------------------------------------------------------
create table media (
  id uuid primary key default uuid_generate_v4(),
  owner_type media_owner not null,
  owner_id uuid not null,
  kind media_kind not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index media_owner_idx on media(owner_type, owner_id);

-- ------------------------------------------------------------
-- LEADS
-- ------------------------------------------------------------
create table leads (
  id uuid primary key default uuid_generate_v4(),
  complex_id uuid references complexes(id) on delete set null,
  apartment_id uuid references apartments(id) on delete set null,
  name text,
  phone text,
  email text,
  message text,
  status lead_status not null default 'new',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SOCIAL LINKS
-- ------------------------------------------------------------
create table social_links (
  id uuid primary key default uuid_generate_v4(),
  platform text not null unique,   -- 'instagram' | 'x' | 'facebook' | 'tiktok'
  url text,
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into social_links (platform, is_enabled) values
  ('instagram', false), ('x', false), ('facebook', false), ('tiktok', false);

-- ------------------------------------------------------------
-- SITE SETTINGS (single row)
-- ------------------------------------------------------------
create table site_settings (
  id integer primary key default 1,
  logo_url text,
  hero_video_url text,
  whatsapp text,
  telegram text,
  email text,
  phone text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into site_settings (id) values (1);

-- ------------------------------------------------------------
-- developer project counts (used on the Developers page)
-- ------------------------------------------------------------
create view developer_project_counts as
select
  d.id as developer_id,
  count(c.id) filter (where c.status = 'published') as project_count
from developers d
left join complexes c on c.developer_id = d.id
group by d.id;

-- ------------------------------------------------------------
-- is_admin() — single administrator, tagged via
-- user_metadata: { "role": "admin" } in Supabase Auth
-- ------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
security definer
as $$
  select coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false);
$$;

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_developers_updated before update on developers
  for each row execute function set_updated_at();
create trigger trg_complexes_updated before update on complexes
  for each row execute function set_updated_at();
create trigger trg_apartments_updated before update on apartments
  for each row execute function set_updated_at();
create trigger trg_site_settings_updated before update on site_settings
  for each row execute function set_updated_at();
create trigger trg_social_links_updated before update on social_links
  for each row execute function set_updated_at();
