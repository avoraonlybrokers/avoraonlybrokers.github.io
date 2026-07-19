insert into developers (name_ru, name_en, website_url, sort_order) values
  ('Sansara Development Group', 'Sansara Development Group', 'https://sansaradevelopment.com/en', 1),
  ('Major Developments',        'Major Developments',        'https://majordevelopments.ae/',      2),
  ('Layan Group',                'Layan Group',                'https://layanverde.com/ru',           3),
  ('Imtiaz',                     'Imtiaz',                     'https://imtiaz.ae/',                  4),
  ('Binghatti',                  'Binghatti',                  'https://www.binghatti.com/',          5),
  ('Beyond Developments',        'Beyond Developments',        'https://beyonddevelopments.ae/',      6)
on conflict do nothing;
