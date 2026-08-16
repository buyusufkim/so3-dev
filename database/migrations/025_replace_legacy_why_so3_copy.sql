UPDATE homepage_sections
SET content_json = JSON_SET(
    content_json,
    '$.items',
    JSON_ARRAY(
        JSON_OBJECT('title', 'Birebir Takip', 'description', 'Antrenman süreci, çalıştığın eğitmenin yönlendirmesi ve takibiyle ilerler.'),
        JSON_OBJECT('title', 'Kişiye Özel Program', 'description', 'Program; hedefin, seviyen ve gelişimin doğrultusunda kişiye özel olarak planlanır.'),
        JSON_OBJECT('title', 'Süreç Takibi', 'description', 'Antrenman süreci, ilerlemenin değerlendirilmesi ve ihtiyaçların doğrultusunda takip edilir.'),
        JSON_OBJECT('title', 'Gelişime Göre Güncel', 'description', 'Program, gelişimine göre değerlendirilir ve gerektiğinde güncellenir.')
    )
)
WHERE section_id = 'why_so3'
  AND JSON_LENGTH(JSON_EXTRACT(content_json, '$.items')) = 4
  AND JSON_UNQUOTE(JSON_EXTRACT(content_json, '$.items[0].title')) = 'Birebir Takip'
  AND JSON_UNQUOTE(JSON_EXTRACT(content_json, '$.items[0].description')) = 'Antrenmanın her anında antrenör gözetiminde her bir tekrarda en doğru ve sağlıklı sonuç'
  AND JSON_UNQUOTE(JSON_EXTRACT(content_json, '$.items[1].title')) = 'Kişiye Özel Program'
  AND JSON_UNQUOTE(JSON_EXTRACT(content_json, '$.items[1].description')) = 'Kalıplaşmış antrenman programları değil, size özel hazırlanmış en verimli antrenman programı ile çalışın'
  AND JSON_UNQUOTE(JSON_EXTRACT(content_json, '$.items[2].title')) = 'Özel Takip'
  AND JSON_UNQUOTE(JSON_EXTRACT(content_json, '$.items[2].description')) = 'Antrenörün sadece salonda değil günlük beslenme, takviye kullanımı ve su tüketimini her öğün ilgiyle birebir WhatsApp üzerinden takip eder'
  AND JSON_UNQUOTE(JSON_EXTRACT(content_json, '$.items[3].title')) = 'Sürekli Güncel'
  AND JSON_UNQUOTE(JSON_EXTRACT(content_json, '$.items[3].description')) = 'Programın her ay düzenli ölçümlerle kişisel gelişimin ve vücut tipinize en uygun şekilde güncellenir.';
