INSERT IGNORE INTO trainers (uuid, slug, name, role_title, branch_id, is_active, sort_order) VALUES
('b33362a2-3f8c-4f7d-bb62-4f3583fc11f1', 'selami-ozyildirim', 'Selami Özyıldırım', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 10),
('f6b8b082-f3f1-4c6e-826c-941cbcc8ff78', 'selim-ozyildirim', 'Selim Özyıldırım', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 20),
('a482b8a7-b1a7-47ab-a111-9a7065f4ffc0', 'sencer-ozyildirim', 'Sencer Özyıldırım', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 30),
('06b9b1d9-5f11-4777-a8fc-367dc3df6870', 'burak-corakcioglu', 'Burak Çorakçıoğlu', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 40),
('c8f921f0-0b31-4ec9-9749-d7ab0eefc542', 'eren-sencer-ozturk', 'Eren Sencer Öztürk', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 50),
('e9b5f403-f38f-43e5-8f6a-046cf3c1cdbd', 'mehmet-katipoglu', 'Mehmet Katipoğlu', 'Fitness Eğitmeni · Uzman Diyetisyen', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 60),
('2d08a54c-1d0b-4890-a548-c11df5fc2d0c', 'hulusi-unlu', 'Hulusi Ünlü', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 70),
('707be9e6-0be6-444d-ad50-482436f5653b', 'sahranur-sozer', 'Sahranur Sözer', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 80),
('82f252cf-eb2b-449e-b873-1081af298e79', 'mehmet-ates', 'Mehmet Ateş', 'Boks Eğitmeni', (SELECT id FROM branches WHERE slug = 'boks' LIMIT 1), 1, 90),
('5b4f62e8-d14d-4d7a-af1d-6e84d4da1c72', 'serhat-guler', 'Serhat Güler', 'Boks Eğitmeni', (SELECT id FROM branches WHERE slug = 'boks' LIMIT 1), 1, 100),
('73d8a631-c42e-4861-ab3f-a392e9d2874f', 'almira-tektas', 'Almira Tektaş', 'Pilates Eğitmeni', (SELECT id FROM branches WHERE slug = 'pilates' LIMIT 1), 1, 110),
('9591e1d0-1a73-4f96-8566-fbbaf2562d22', 'muniyra-karayagiz', 'Müniyra Karayağız', 'Pilates Eğitmeni', (SELECT id FROM branches WHERE slug = 'pilates' LIMIT 1), 1, 120),
('e5bc9d8c-eb4d-452f-aef6-821e25e3af99', 'irem-bulut', 'İrem Bulut', 'Yoga Eğitmeni', (SELECT id FROM branches WHERE slug = 'yoga' LIMIT 1), 1, 130);
