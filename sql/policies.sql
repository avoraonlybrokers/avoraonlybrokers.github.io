-- ============================================================
-- AVORA — Row Level Security (vanilla JS edition)
-- Run after schema.sql.
--
-- Because this site runs entirely from the browser (GitHub
-- Pages has no server), every table is queried directly with
-- the anon/publishable key. These policies are the ONLY thing
-- standing between a visitor and your data — read them
-- carefully before going live.
-- ============================================================

alter table developers enable row level security;
alter table complexes enable row level security;
alter table apartments enable row level security;
alter table media enable row level security;
alter table leads enable row level security;
alter table social_links enable row level security;
alter table site_settings enable row level security;

-- ---------------- developers ----------------
create policy "public read visible developers"
  on developers for select
  using (is_hidden = false);

create policy "admin full access developers"
  on developers for all
  using (is_admin())
  with check (is_admin());

-- ---------------- complexes ----------------
create policy "public read published complexes"
  on complexes for select
  using (status = 'published');

create policy "admin full access complexes"
  on complexes for all
  using (is_admin())
  with check (is_admin());

-- ---------------- apartments ----------------
create policy "public read published apartments"
  on apartments for select
  using (
    status = 'published'
    and exists (select 1 from complexes c where c.id = apartments.complex_id and c.status = 'published')
  );

create policy "admin full access apartments"
  on apartments for all
  using (is_admin())
  with check (is_admin());

-- ---------------- media ----------------
-- A photo/video is visible only if its owner (complex or
-- apartment) is currently published.
create policy "public read media of published owners"
  on media for select
  using (
    (owner_type = 'complex' and exists (
      select 1 from complexes c where c.id = media.owner_id and c.status = 'published'
    ))
    or
    (owner_type = 'apartment' and exists (
      select 1 from apartments a
      join complexes c on c.id = a.complex_id
      where a.id = media.owner_id and a.status = 'published' and c.status = 'published'
    ))
  );

create policy "admin full access media"
  on media for all
  using (is_admin())
  with check (is_admin());

-- ---------------- leads ----------------
create policy "public insert leads"
  on leads for insert
  with check (true);

create policy "admin full access leads"
  on leads for all
  using (is_admin())
  with check (is_admin());

-- ---------------- social_links ----------------
create policy "public read enabled social links"
  on social_links for select
  using (is_enabled = true and url is not null);

create policy "admin full access social links"
  on social_links for all
  using (is_admin())
  with check (is_admin());

-- ---------------- site_settings ----------------
create policy "public read site settings"
  on site_settings for select
  using (true);

create policy "admin full access site settings"
  on site_settings for all
  using (is_admin())
  with check (is_admin());
