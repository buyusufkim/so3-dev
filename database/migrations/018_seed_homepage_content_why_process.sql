UPDATE homepage_sections 
SET content_json = '{
  "eyebrow": "NEDEN SO3",
  "headline_primary": "Tek tip program yok.",
  "headline_emphasis": "Sana göre bir sistem var.",
  "intro": "SO3\'te antrenman, kişiye göre planlanır ve çalıştığın eğitmenle birlikte takip edilir.",
  "items": [
    {
      "title": "Birebir Takip",
      "description": "Antrenmanın her anında antrenör gözetiminde her bir tekrarda en doğru ve sağlıklı sonuç"
    },
    {
      "title": "Kişiye Özel Program",
      "description": "Kalıplaşmış antrenman programları değil, size özel hazırlanmış en verimli antrenman programı ile çalışın"
    },
    {
      "title": "Özel Takip",
      "description": "Antrenörün sadece salonda değil günlük beslenme, takviye kullanımı ve su tüketimini her öğün ilgiyle birebir WhatsApp üzerinden takip eder"
    },
    {
      "title": "Sürekli Güncel",
      "description": "Programın her ay düzenli ölçümlerle kişisel gelişimin ve vücut tipinize en uygun şekilde güncellenir."
    }
  ]
}'
WHERE section_id = 'why_so3' AND JSON_LENGTH(content_json) = 0;

UPDATE homepage_sections 
SET content_json = '{
  "eyebrow": "NASIL ÇALIŞIR?",
  "headline_primary": "",
  "headline_emphasis": "",
  "steps": [
    {
      "title": "Seni tanırız."
    },
    {
      "title": "Sana göre planlarız."
    },
    {
      "title": "Birlikte çalışırız."
    },
    {
      "title": "Sen geliştikçe süreci güncelleriz."
    }
  ]
}'
WHERE section_id = 'process' AND JSON_LENGTH(content_json) = 0;
