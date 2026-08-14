INSERT IGNORE INTO branches (uuid, slug, name, description, sort_order, is_active, cover_media_id) VALUES
(UUID(), 'fitness', 'Fitness', 'Güç, kondisyon ve kişisel hedeflere göre şekillenen kişiye özel antrenman süreci.', 10, 1, NULL),
(UUID(), 'boks', 'Boks', 'Kondisyon, refleks ve güç artırımı odaklı özel boks dersleri.', 20, 1, NULL),
(UUID(), 'pilates', 'Pilates', 'Reformer pilates ile esneklik, merkez bölge gücü ve postür gelişimi.', 30, 1, NULL),
(UUID(), 'yoga', 'Yoga', 'Beden ve zihin bütünlüğü, esneklik ve denge odaklı pratikler.', 40, 1, NULL);
