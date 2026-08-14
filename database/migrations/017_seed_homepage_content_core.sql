UPDATE homepage_sections 
SET content_json = '{
  "eyebrow": "SO3 / PERSONAL TRAINING",
  "headline_primary": "Herkese göre değil.",
  "headline_emphasis": "SANA GÖRE.",
  "support_text": "Kalabalığa değil, gelişimine odaklan.",
  "feature_left": "Kişiye özel antrenman",
  "feature_right": "Birebir takip",
  "primary_cta_label": "Ön görüşme planla",
  "primary_cta_target": "/#iletisim",
  "secondary_cta_label": "SO3\'ü keşfet",
  "secondary_cta_target": "/#branslar",
  "background_media_id": null
}'
WHERE section_id = 'hero' AND JSON_LENGTH(content_json) = 0;

UPDATE homepage_sections 
SET content_json = '{
  "items": [
    "Kişisel Diyetisyen ve Beslenme Programı",
    "Supplement Danışmanlığı",
    "Birebir Dersler",
    "Kişiye Özel Program",
    "Özel Etkinlikler",
    "Profesyonel Eğitmenler"
  ]
}'
WHERE section_id = 'brand_band' AND JSON_LENGTH(content_json) = 0;

UPDATE homepage_sections 
SET content_json = '{
  "eyebrow": "SO3 HAKKINDA",
  "headline_primary": "Kişiye Özel Bir",
  "headline_emphasis": "Antrenman Süreci",
  "paragraph_primary": "SO3, kişiye özel antrenman yaklaşımını merkeze alan; fitness, boks, pilates ve yoga disiplinlerini kişisel takip ile bir araya getiren bir Personal Training merkezidir. Burada amaç, herkese aynı programı uygulamak değil; hedefe, seviyeye ve gelişime göre şekillenen bir antrenman süreci oluşturmaktır.",
  "paragraph_secondary": "SO3 deneyimi yalnızca ders saatinden ibaret değildir. Antrenman süreci düzenli takip, kişiye özel program güncellemeleri ve sosyal etkinliklerle devam eder. Salon içinde başlayan birliktelik, SO3 topluluğuyla salon dışında da sürer.",
  "youtube_video_id": "0ojUK4qD8yE",
  "youtube_title": "SO3 PT Tanıtım Filmi"
}'
WHERE section_id = 'about' AND JSON_LENGTH(content_json) = 0;
