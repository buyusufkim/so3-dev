INSERT INTO homepage_sections (section_id, is_active, content_json, sort_order) VALUES
  ('hero', 1, '{}', 10),
  ('brand_band', 1, '{}', 20),
  ('branches', 1, '{}', 30),
  ('about', 1, '{}', 40),
  ('why_so3', 1, '{}', 50),
  ('process', 1, '{}', 60),
  ('trainers', 1, '{}', 70),
  ('performance', 1, '{}', 80),
  ('community', 1, '{}', 90),
  ('instagram', 1, '{}', 100),
  ('tour', 1, '{}', 110),
  ('contact', 1, '{}', 120)
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);
