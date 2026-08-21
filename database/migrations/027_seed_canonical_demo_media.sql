-- Register the canonical demo media already shipped under public/media/so3.
-- Existing customized homepage, branch, and event media remains untouched.

START TRANSACTION;

INSERT IGNORE INTO media_assets
(uuid, original_name, storage_name, storage_path, thumbnail_path, mime_type, extension, file_size, width, height, media_type, title, alt_text, status)
VALUES
('02700000-0000-4000-8000-000000000001', 'branch-boxing-01.webp', 'so3-demo-branch-boxing-01.webp', 'media/so3/branch-boxing-01.webp', NULL, 'image/webp', 'webp', 254196, 1350, 2400, 'image', 'SO3 Boks Teknik', 'SO3 boks teknik çalışması', 'active'),
('02700000-0000-4000-8000-000000000002', 'branch-boxing-02.webp', 'so3-demo-branch-boxing-02.webp', 'media/so3/branch-boxing-02.webp', NULL, 'image/webp', 'webp', 176776, 1350, 2400, 'image', 'SO3 Boks Kondisyon', 'SO3 boks kondisyon çalışması', 'active'),
('02700000-0000-4000-8000-000000000003', 'branch-boxing.webp', 'so3-demo-branch-boxing.webp', 'media/so3/branch-boxing.webp', NULL, 'image/webp', 'webp', 263112, 2400, 1351, 'image', 'SO3 Boks', 'SO3 boks alanı', 'active'),
('02700000-0000-4000-8000-000000000004', 'branch-fitness.webp', 'so3-demo-branch-fitness.webp', 'media/so3/branch-fitness.webp', NULL, 'image/webp', 'webp', 364338, 2400, 1351, 'image', 'SO3 Fitness', 'SO3 fitness alanı', 'active'),
('02700000-0000-4000-8000-000000000005', 'branch-pilates-01.webp', 'so3-demo-branch-pilates-01.webp', 'media/so3/branch-pilates-01.webp', NULL, 'image/webp', 'webp', 228870, 2400, 1351, 'image', 'SO3 Pilates', 'SO3 pilates alanı', 'active'),
('02700000-0000-4000-8000-000000000006', 'branch-yoga-01.webp', 'so3-demo-branch-yoga-01.webp', 'media/so3/branch-yoga-01.webp', NULL, 'image/webp', 'webp', 104974, 1350, 2400, 'image', 'SO3 Yoga Detay 1', 'SO3 yoga çalışması', 'active'),
('02700000-0000-4000-8000-000000000007', 'branch-yoga-02.webp', 'so3-demo-branch-yoga-02.webp', 'media/so3/branch-yoga-02.webp', NULL, 'image/webp', 'webp', 103614, 1350, 2400, 'image', 'SO3 Yoga Detay 2', 'SO3 yoga çalışması', 'active'),
('02700000-0000-4000-8000-000000000008', 'branch-yoga-03.webp', 'so3-demo-branch-yoga-03.webp', 'media/so3/branch-yoga-03.webp', NULL, 'image/webp', 'webp', 116620, 1350, 2400, 'image', 'SO3 Yoga Detay 3', 'SO3 yoga çalışması', 'active'),
('02700000-0000-4000-8000-000000000009', 'branch-yoga-pilates.webp', 'so3-demo-branch-yoga-pilates.webp', 'media/so3/branch-yoga-pilates.webp', NULL, 'image/webp', 'webp', 228870, 2400, 1351, 'image', 'SO3 Yoga ve Pilates', 'SO3 yoga ve pilates alanı', 'active'),
('02700000-0000-4000-8000-000000000010', 'community-group-training.webp', 'so3-demo-community-group-training.webp', 'media/so3/community-group-training.webp', NULL, 'image/webp', 'webp', 165324, 1350, 2400, 'image', 'SO3 Grup Antrenmanı', 'SO3 topluluğu grup antrenmanı', 'active'),
('02700000-0000-4000-8000-000000000011', 'community-hali-saha-alt.webp', 'so3-demo-community-hali-saha-alt.webp', 'media/so3/community-hali-saha-alt.webp', NULL, 'image/webp', 'webp', 95812, 1080, 1350, 'image', 'SO3 Halı Saha Alternatif', 'SO3 topluluğu halı saha etkinliği', 'active'),
('02700000-0000-4000-8000-000000000012', 'community-hali-saha.webp', 'so3-demo-community-hali-saha.webp', 'media/so3/community-hali-saha.webp', NULL, 'image/webp', 'webp', 140094, 1080, 1350, 'image', 'SO3 Halı Saha', 'SO3 topluluğu halı saha etkinliği', 'active'),
('02700000-0000-4000-8000-000000000013', 'community-kano.webp', 'so3-demo-community-kano.webp', 'media/so3/community-kano.webp', NULL, 'image/webp', 'webp', 378556, 1350, 2400, 'image', 'SO3 Kano', 'SO3 topluluğu kano etkinliği', 'active'),
('02700000-0000-4000-8000-000000000014', 'community-nature-walk.webp', 'so3-demo-community-nature-walk.webp', 'media/so3/community-nature-walk.webp', NULL, 'image/webp', 'webp', 506524, 1350, 2400, 'image', 'SO3 Doğa Yürüyüşü', 'SO3 topluluğu doğa yürüyüşü', 'active'),
('02700000-0000-4000-8000-000000000015', 'community-team-games.webp', 'so3-demo-community-team-games.webp', 'media/so3/community-team-games.webp', NULL, 'image/webp', 'webp', 258194, 1350, 2400, 'image', 'SO3 Takımlı Oyunlar', 'SO3 topluluğu takım oyunları', 'active'),
('02700000-0000-4000-8000-000000000016', 'discovery-boxing.webp', 'so3-demo-discovery-boxing.webp', 'media/so3/discovery-boxing.webp', NULL, 'image/webp', 'webp', 263388, 2400, 1351, 'image', 'SO3 Boks Detay', 'SO3 boks antrenmanı', 'active'),
('02700000-0000-4000-8000-000000000017', 'discovery-fitness.webp', 'so3-demo-discovery-fitness.webp', 'media/so3/discovery-fitness.webp', NULL, 'image/webp', 'webp', 331432, 2400, 1351, 'image', 'SO3 Fitness Detay', 'SO3 fitness antrenman alanı', 'active'),
('02700000-0000-4000-8000-000000000018', 'discovery-pt.webp', 'so3-demo-discovery-pt.webp', 'media/so3/discovery-pt.webp', NULL, 'image/webp', 'webp', 164650, 1600, 2400, 'image', 'SO3 Personal Training', 'SO3 birebir personal training', 'active'),
('02700000-0000-4000-8000-000000000019', 'discovery-vitamin-bar.webp', 'so3-demo-discovery-vitamin-bar.webp', 'media/so3/discovery-vitamin-bar.webp', NULL, 'image/webp', 'webp', 291314, 2400, 1351, 'image', 'SO3 Vitamin Bar', 'SO3 vitamin bar alanı', 'active'),
('02700000-0000-4000-8000-000000000020', 'discovery-yoga.webp', 'so3-demo-discovery-yoga.webp', 'media/so3/discovery-yoga.webp', NULL, 'image/webp', 'webp', 138874, 2400, 1351, 'image', 'SO3 Yoga', 'SO3 yoga alanı', 'active'),
('02700000-0000-4000-8000-000000000021', 'cover.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-cover.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/cover.webp', 'media/so3/community-nature-walk.webp', 'image/webp', 'webp', 260044, 1600, 900, 'image', 'Gomeda Vadisi Yürüyüşü Kapak', 'SO3 Gomeda Vadisi Yürüyüşü etkinliği', 'active'),
('02700000-0000-4000-8000-000000000022', '01.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-01.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/01.webp', NULL, 'image/webp', 'webp', 490298, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 01', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000023', '02.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-02.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/02.webp', NULL, 'image/webp', 'webp', 610740, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 02', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000024', '03.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-03.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/03.webp', NULL, 'image/webp', 'webp', 751676, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 03', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000025', '04.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-04.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/04.webp', NULL, 'image/webp', 'webp', 426642, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 04', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000026', '05.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-05.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/05.webp', NULL, 'image/webp', 'webp', 407128, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 05', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000027', '06.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-06.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/06.webp', NULL, 'image/webp', 'webp', 506660, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 06', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000028', '07.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-07.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/07.webp', NULL, 'image/webp', 'webp', 604434, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 07', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000029', 'cover.webp', 'so3-demo-events-kano-etkinligi-cover.webp', 'media/so3/events/kano-etkinligi/cover.webp', 'media/so3/community-kano.webp', 'image/webp', 'webp', 263282, 1600, 900, 'image', 'Kano Etkinliği Kapak', 'SO3 Kano Etkinliği etkinliği', 'active'),
('02700000-0000-4000-8000-000000000030', '01.webp', 'so3-demo-events-kano-etkinligi-gallery-01.webp', 'media/so3/events/kano-etkinligi/gallery/01.webp', NULL, 'image/webp', 'webp', 365306, 1440, 2560, 'image', 'Kano Etkinliği Galeri 01', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000031', '02.webp', 'so3-demo-events-kano-etkinligi-gallery-02.webp', 'media/so3/events/kano-etkinligi/gallery/02.webp', NULL, 'image/webp', 'webp', 335648, 1440, 2560, 'image', 'Kano Etkinliği Galeri 02', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000032', '03.webp', 'so3-demo-events-kano-etkinligi-gallery-03.webp', 'media/so3/events/kano-etkinligi/gallery/03.webp', NULL, 'image/webp', 'webp', 480086, 1440, 2560, 'image', 'Kano Etkinliği Galeri 03', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000033', '04.webp', 'so3-demo-events-kano-etkinligi-gallery-04.webp', 'media/so3/events/kano-etkinligi/gallery/04.webp', NULL, 'image/webp', 'webp', 471002, 1440, 2560, 'image', 'Kano Etkinliği Galeri 04', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000034', '05.webp', 'so3-demo-events-kano-etkinligi-gallery-05.webp', 'media/so3/events/kano-etkinligi/gallery/05.webp', NULL, 'image/webp', 'webp', 283602, 1440, 2560, 'image', 'Kano Etkinliği Galeri 05', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000035', '06.webp', 'so3-demo-events-kano-etkinligi-gallery-06.webp', 'media/so3/events/kano-etkinligi/gallery/06.webp', NULL, 'image/webp', 'webp', 379408, 1440, 2560, 'image', 'Kano Etkinliği Galeri 06', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000036', '07.webp', 'so3-demo-events-kano-etkinligi-gallery-07.webp', 'media/so3/events/kano-etkinligi/gallery/07.webp', NULL, 'image/webp', 'webp', 483446, 1440, 2560, 'image', 'Kano Etkinliği Galeri 07', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000037', '08.webp', 'so3-demo-events-kano-etkinligi-gallery-08.webp', 'media/so3/events/kano-etkinligi/gallery/08.webp', NULL, 'image/webp', 'webp', 373622, 1440, 2560, 'image', 'Kano Etkinliği Galeri 08', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000038', '09.webp', 'so3-demo-events-kano-etkinligi-gallery-09.webp', 'media/so3/events/kano-etkinligi/gallery/09.webp', NULL, 'image/webp', 'webp', 353534, 1440, 2560, 'image', 'Kano Etkinliği Galeri 09', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000039', 'cover.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-cover.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/cover.webp', NULL, 'image/webp', 'webp', 452232, 1600, 900, 'image', 'Kırlangıç Vadisi Yürüyüşü Kapak', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliği', 'active'),
('02700000-0000-4000-8000-000000000040', '01.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-01.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/01.webp', NULL, 'image/webp', 'webp', 432024, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 01', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000041', '02.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-02.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/02.webp', NULL, 'image/webp', 'webp', 546356, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 02', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000042', '03.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-03.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/03.webp', NULL, 'image/webp', 'webp', 376114, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 03', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000043', '04.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-04.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/04.webp', NULL, 'image/webp', 'webp', 927872, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 04', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000044', '05.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-05.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/05.webp', NULL, 'image/webp', 'webp', 150296, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 05', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000045', '06.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-06.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/06.webp', NULL, 'image/webp', 'webp', 199664, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 06', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000046', 'cover.webp', 'so3-demo-events-mobilite-grup-dersi-cover.webp', 'media/so3/events/mobilite-grup-dersi/cover.webp', 'media/so3/community-group-training.webp', 'image/webp', 'webp', 113184, 1600, 900, 'image', 'Mobilite Grup Dersi Kapak', 'SO3 Mobilite Grup Dersi etkinliği', 'active'),
('02700000-0000-4000-8000-000000000047', '01.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-01.webp', 'media/so3/events/mobilite-grup-dersi/gallery/01.webp', NULL, 'image/webp', 'webp', 163884, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 01', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000048', '02.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-02.webp', 'media/so3/events/mobilite-grup-dersi/gallery/02.webp', NULL, 'image/webp', 'webp', 219092, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 02', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000049', '03.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-03.webp', 'media/so3/events/mobilite-grup-dersi/gallery/03.webp', NULL, 'image/webp', 'webp', 238954, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 03', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000050', '04.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-04.webp', 'media/so3/events/mobilite-grup-dersi/gallery/04.webp', NULL, 'image/webp', 'webp', 278276, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 04', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000051', '05.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-05.webp', 'media/so3/events/mobilite-grup-dersi/gallery/05.webp', NULL, 'image/webp', 'webp', 178948, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 05', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000052', 'cover.webp', 'so3-demo-events-plaj-voleybolu-cover.webp', 'media/so3/events/plaj-voleybolu/cover.webp', 'media/so3/community-hali-saha-alt.webp', 'image/webp', 'webp', 220218, 1600, 900, 'image', 'Plaj Voleybolu Kapak', 'SO3 Plaj Voleybolu etkinliği', 'active'),
('02700000-0000-4000-8000-000000000053', '01.webp', 'so3-demo-events-plaj-voleybolu-gallery-01.webp', 'media/so3/events/plaj-voleybolu/gallery/01.webp', NULL, 'image/webp', 'webp', 176176, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 01', 'SO3 Plaj Voleybolu etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000054', '02.webp', 'so3-demo-events-plaj-voleybolu-gallery-02.webp', 'media/so3/events/plaj-voleybolu/gallery/02.webp', NULL, 'image/webp', 'webp', 188348, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 02', 'SO3 Plaj Voleybolu etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000055', '03.webp', 'so3-demo-events-plaj-voleybolu-gallery-03.webp', 'media/so3/events/plaj-voleybolu/gallery/03.webp', NULL, 'image/webp', 'webp', 154064, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 03', 'SO3 Plaj Voleybolu etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000056', '04.webp', 'so3-demo-events-plaj-voleybolu-gallery-04.webp', 'media/so3/events/plaj-voleybolu/gallery/04.webp', NULL, 'image/webp', 'webp', 388444, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 04', 'SO3 Plaj Voleybolu etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000057', '05.webp', 'so3-demo-events-plaj-voleybolu-gallery-05.webp', 'media/so3/events/plaj-voleybolu/gallery/05.webp', NULL, 'image/webp', 'webp', 182954, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 05', 'SO3 Plaj Voleybolu etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000058', 'cover.webp', 'so3-demo-events-voleybol-etkinligi-cover.webp', 'media/so3/events/voleybol-etkinligi/cover.webp', 'media/so3/community-team-games.webp', 'image/webp', 'webp', 97232, 1600, 900, 'image', 'Voleybol Etkinliği Kapak', 'SO3 Voleybol Etkinliği etkinliği', 'active'),
('02700000-0000-4000-8000-000000000059', '01.webp', 'so3-demo-events-voleybol-etkinligi-gallery-01.webp', 'media/so3/events/voleybol-etkinligi/gallery/01.webp', NULL, 'image/webp', 'webp', 247820, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 01', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000060', '02.webp', 'so3-demo-events-voleybol-etkinligi-gallery-02.webp', 'media/so3/events/voleybol-etkinligi/gallery/02.webp', NULL, 'image/webp', 'webp', 223324, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 02', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000061', '03.webp', 'so3-demo-events-voleybol-etkinligi-gallery-03.webp', 'media/so3/events/voleybol-etkinligi/gallery/03.webp', NULL, 'image/webp', 'webp', 295842, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 03', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000062', '04.webp', 'so3-demo-events-voleybol-etkinligi-gallery-04.webp', 'media/so3/events/voleybol-etkinligi/gallery/04.webp', NULL, 'image/webp', 'webp', 119016, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 04', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000063', '05.webp', 'so3-demo-events-voleybol-etkinligi-gallery-05.webp', 'media/so3/events/voleybol-etkinligi/gallery/05.webp', NULL, 'image/webp', 'webp', 114916, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 05', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000064', '06.webp', 'so3-demo-events-voleybol-etkinligi-gallery-06.webp', 'media/so3/events/voleybol-etkinligi/gallery/06.webp', NULL, 'image/webp', 'webp', 286040, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 06', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000065', '07.webp', 'so3-demo-events-voleybol-etkinligi-gallery-07.webp', 'media/so3/events/voleybol-etkinligi/gallery/07.webp', NULL, 'image/webp', 'webp', 257234, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 07', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000066', 'hero-so3.webp', 'so3-demo-hero-so3.webp', 'media/so3/hero-so3.webp', NULL, 'image/webp', 'webp', 190524, 2400, 1600, 'image', 'SO3 Ana Sayfa Kapak', 'SO3 Personal Training antrenman alanı', 'active'),
('02700000-0000-4000-8000-000000000067', 'performance.webp', 'so3-demo-performance.webp', 'media/so3/performance.webp', NULL, 'image/webp', 'webp', 359640, 1600, 2400, 'image', 'SO3 Performans', 'SO3 performans antrenmanı', 'active');

SET @SO3_DEMO_HERO_ID = (
  SELECT id FROM media_assets WHERE storage_name = 'so3-demo-hero-so3.webp' LIMIT 1
);
SET @SO3_DEMO_PERFORMANCE_ID = (
  SELECT id FROM media_assets WHERE storage_name = 'so3-demo-performance.webp' LIMIT 1
);

UPDATE homepage_sections
SET content_json = JSON_SET(content_json, '$.background_media_id', @SO3_DEMO_HERO_ID)
WHERE section_id = 'hero'
  AND @SO3_DEMO_HERO_ID IS NOT NULL
  AND (
    JSON_EXTRACT(content_json, '$.background_media_id') IS NULL
    OR JSON_TYPE(JSON_EXTRACT(content_json, '$.background_media_id')) = 'NULL'
  );

UPDATE homepage_sections
SET content_json = JSON_SET(content_json, '$.background_media_id', @SO3_DEMO_PERFORMANCE_ID)
WHERE section_id = 'performance'
  AND @SO3_DEMO_PERFORMANCE_ID IS NOT NULL
  AND (
    JSON_EXTRACT(content_json, '$.background_media_id') IS NULL
    OR JSON_TYPE(JSON_EXTRACT(content_json, '$.background_media_id')) = 'NULL'
  );

INSERT INTO media_usages (media_id, entity_type, entity_id, field_name)
SELECT CAST(JSON_UNQUOTE(JSON_EXTRACT(hs.content_json, '$.background_media_id')) AS UNSIGNED),
       'homepage_section', hs.id, 'background'
FROM homepage_sections hs
WHERE hs.section_id IN ('hero', 'performance')
  AND JSON_UNQUOTE(JSON_EXTRACT(hs.content_json, '$.background_media_id')) REGEXP '^[0-9]+$'
  AND NOT EXISTS (
    SELECT 1 FROM media_usages mu
    WHERE mu.media_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(hs.content_json, '$.background_media_id')) AS UNSIGNED)
      AND mu.entity_type = 'homepage_section'
      AND mu.entity_id = hs.id
      AND mu.field_name = 'background'
  );

UPDATE branches
SET cover_media_id = (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-branch-fitness.webp' LIMIT 1)
WHERE slug = 'fitness' AND cover_media_id IS NULL AND deleted_at IS NULL;

UPDATE branches
SET cover_media_id = (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-branch-boxing.webp' LIMIT 1)
WHERE slug = 'boks' AND cover_media_id IS NULL AND deleted_at IS NULL;

UPDATE branches
SET cover_media_id = (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-branch-pilates-01.webp' LIMIT 1)
WHERE slug = 'pilates' AND cover_media_id IS NULL AND deleted_at IS NULL;

UPDATE branches
SET cover_media_id = (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-discovery-yoga.webp' LIMIT 1)
WHERE slug = 'yoga' AND cover_media_id IS NULL AND deleted_at IS NULL;

INSERT INTO branch_media (branch_id, media_id, sort_order)
SELECT b.id, ma.id, seed.sort_order
FROM branches b
JOIN (
  SELECT 'fitness' AS branch_slug, 'so3-demo-branch-fitness.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT 'fitness' AS branch_slug, 'so3-demo-discovery-fitness.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT 'fitness' AS branch_slug, 'so3-demo-discovery-pt.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT 'fitness' AS branch_slug, 'so3-demo-performance.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT 'boks' AS branch_slug, 'so3-demo-branch-boxing.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT 'boks' AS branch_slug, 'so3-demo-discovery-boxing.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT 'boks' AS branch_slug, 'so3-demo-branch-boxing-01.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT 'boks' AS branch_slug, 'so3-demo-branch-boxing-02.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT 'pilates' AS branch_slug, 'so3-demo-branch-pilates-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT 'yoga' AS branch_slug, 'so3-demo-discovery-yoga.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT 'yoga' AS branch_slug, 'so3-demo-branch-yoga-01.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT 'yoga' AS branch_slug, 'so3-demo-branch-yoga-02.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT 'yoga' AS branch_slug, 'so3-demo-branch-yoga-03.webp' AS storage_name, 40 AS sort_order
) seed ON seed.branch_slug = b.slug
JOIN media_assets ma ON ma.storage_name = seed.storage_name
WHERE b.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM branch_media existing WHERE existing.branch_id = b.id
  );

INSERT INTO media_usages (media_id, entity_type, entity_id, field_name)
SELECT b.cover_media_id, 'branch', b.id, 'cover'
FROM branches b
WHERE b.cover_media_id IS NOT NULL
  AND b.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM media_usages mu
    WHERE mu.media_id = b.cover_media_id
      AND mu.entity_type = 'branch'
      AND mu.entity_id = b.id
      AND mu.field_name = 'cover'
  );

INSERT INTO media_usages (media_id, entity_type, entity_id, field_name)
SELECT bm.media_id, 'branch', bm.branch_id, 'gallery'
FROM branch_media bm
WHERE NOT EXISTS (
  SELECT 1 FROM media_usages mu
  WHERE mu.media_id = bm.media_id
    AND mu.entity_type = 'branch'
    AND mu.entity_id = bm.branch_id
    AND mu.field_name = 'gallery'
);

INSERT IGNORE INTO events
(uuid, title, slug, category_id, excerpt, content, event_date, location, cover_media_id,
 status, featured_on_home, featured_order, seo_title, seo_description, published_at)
VALUES
('02710000-0000-4000-8000-000000000001', 'Gomeda Vadisi Yürüyüşü', 'gomeda-vadisi-yuruyusu', (SELECT id FROM event_categories WHERE slug = 'doga-yuruyusleri' LIMIT 1), 'SO3 topluluğunun Gomeda Vadisi yürüyüşünden seçili anlar.', NULL, NULL, NULL, (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-events-gomeda-vadisi-yuruyusu-cover.webp' LIMIT 1), 'published', 1, 10, 'Gomeda Vadisi Yürüyüşü | SO3 PT', 'SO3 topluluğunun Gomeda Vadisi yürüyüşünden seçili anlar.', CURRENT_TIMESTAMP),
('02710000-0000-4000-8000-000000000002', 'Kano Etkinliği', 'kano-etkinligi', (SELECT id FROM event_categories WHERE slug = 'kano-etkinlikleri' LIMIT 1), 'SO3 topluluğunun kano etkinliğinden seçili anlar.', NULL, NULL, NULL, (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-events-kano-etkinligi-cover.webp' LIMIT 1), 'published', 1, 20, 'Kano Etkinliği | SO3 PT', 'SO3 topluluğunun kano etkinliğinden seçili anlar.', CURRENT_TIMESTAMP),
('02710000-0000-4000-8000-000000000003', 'Voleybol Etkinliği', 'voleybol-etkinligi', (SELECT id FROM event_categories WHERE slug = 'takimli-oyunlar' LIMIT 1), 'SO3 topluluğunun voleybol etkinliğinden seçili anlar.', NULL, NULL, NULL, (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-events-voleybol-etkinligi-cover.webp' LIMIT 1), 'published', 1, 30, 'Voleybol Etkinliği | SO3 PT', 'SO3 topluluğunun voleybol etkinliğinden seçili anlar.', CURRENT_TIMESTAMP),
('02710000-0000-4000-8000-000000000004', 'Mobilite Grup Dersi', 'mobilite-grup-dersi', (SELECT id FROM event_categories WHERE slug = 'salon-etkinlikleri' LIMIT 1), 'SO3 topluluğunun mobilite grup dersinden seçili anlar.', NULL, NULL, NULL, (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-events-mobilite-grup-dersi-cover.webp' LIMIT 1), 'published', 1, 40, 'Mobilite Grup Dersi | SO3 PT', 'SO3 topluluğunun mobilite grup dersinden seçili anlar.', CURRENT_TIMESTAMP),
('02710000-0000-4000-8000-000000000005', 'Kırlangıç Vadisi Yürüyüşü', 'kirlangic-vadisi-yuruyusu', (SELECT id FROM event_categories WHERE slug = 'doga-yuruyusleri' LIMIT 1), 'SO3 topluluğunun Kırlangıç Vadisi yürüyüşünden seçili anlar.', NULL, NULL, NULL, (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-events-kirlangic-vadisi-yuruyusu-cover.webp' LIMIT 1), 'published', 0, NULL, 'Kırlangıç Vadisi Yürüyüşü | SO3 PT', 'SO3 topluluğunun Kırlangıç Vadisi yürüyüşünden seçili anlar.', CURRENT_TIMESTAMP),
('02710000-0000-4000-8000-000000000006', 'Plaj Voleybolu', 'plaj-voleybolu', (SELECT id FROM event_categories WHERE slug = 'takimli-oyunlar' LIMIT 1), 'SO3 topluluğunun plaj voleybolu etkinliğinden seçili anlar.', NULL, NULL, NULL, (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-events-plaj-voleybolu-cover.webp' LIMIT 1), 'published', 0, NULL, 'Plaj Voleybolu | SO3 PT', 'SO3 topluluğunun plaj voleybolu etkinliğinden seçili anlar.', CURRENT_TIMESTAMP);

INSERT INTO event_media (event_id, media_id, sort_order)
SELECT e.id, ma.id, seed.sort_order
FROM events e
JOIN (
  SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-02.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-03.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-04.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-05.webp' AS storage_name, 50 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-06.webp' AS storage_name, 60 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-07.webp' AS storage_name, 70 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-02.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-03.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-04.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-05.webp' AS storage_name, 50 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-06.webp' AS storage_name, 60 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-07.webp' AS storage_name, 70 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-08.webp' AS storage_name, 80 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-09.webp' AS storage_name, 90 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-02.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-03.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-04.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-05.webp' AS storage_name, 50 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-06.webp' AS storage_name, 60 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-07.webp' AS storage_name, 70 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000004' AS event_uuid, 'so3-demo-events-mobilite-grup-dersi-gallery-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000004' AS event_uuid, 'so3-demo-events-mobilite-grup-dersi-gallery-02.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000004' AS event_uuid, 'so3-demo-events-mobilite-grup-dersi-gallery-03.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000004' AS event_uuid, 'so3-demo-events-mobilite-grup-dersi-gallery-04.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000004' AS event_uuid, 'so3-demo-events-mobilite-grup-dersi-gallery-05.webp' AS storage_name, 50 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000005' AS event_uuid, 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000005' AS event_uuid, 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-02.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000005' AS event_uuid, 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-03.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000005' AS event_uuid, 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-04.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000005' AS event_uuid, 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-05.webp' AS storage_name, 50 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000005' AS event_uuid, 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-06.webp' AS storage_name, 60 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000006' AS event_uuid, 'so3-demo-events-plaj-voleybolu-gallery-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000006' AS event_uuid, 'so3-demo-events-plaj-voleybolu-gallery-02.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000006' AS event_uuid, 'so3-demo-events-plaj-voleybolu-gallery-03.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000006' AS event_uuid, 'so3-demo-events-plaj-voleybolu-gallery-04.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000006' AS event_uuid, 'so3-demo-events-plaj-voleybolu-gallery-05.webp' AS storage_name, 50 AS sort_order
) seed ON seed.event_uuid = e.uuid
JOIN media_assets ma ON ma.storage_name = seed.storage_name
WHERE NOT EXISTS (
  SELECT 1 FROM event_media existing
  WHERE existing.event_id = e.id AND existing.media_id = ma.id
);

INSERT INTO media_usages (media_id, entity_type, entity_id, field_name)
SELECT e.cover_media_id, 'event', e.id, 'cover'
FROM events e
WHERE e.uuid LIKE '02710000-0000-4000-8000-%'
  AND e.cover_media_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM media_usages mu
    WHERE mu.media_id = e.cover_media_id
      AND mu.entity_type = 'event'
      AND mu.entity_id = e.id
      AND mu.field_name = 'cover'
  );

INSERT INTO media_usages (media_id, entity_type, entity_id, field_name)
SELECT em.media_id, 'event', em.event_id, 'gallery'
FROM event_media em
JOIN events e ON e.id = em.event_id
WHERE e.uuid LIKE '02710000-0000-4000-8000-%'
  AND NOT EXISTS (
    SELECT 1 FROM media_usages mu
    WHERE mu.media_id = em.media_id
      AND mu.entity_type = 'event'
      AND mu.entity_id = em.event_id
      AND mu.field_name = 'gallery'
  );

COMMIT;

