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
  AND JSON_UNQUOTE(JSON_EXTRACT(content_json, '$.items[0].description')) LIKE '%en doğru ve sağlıklı sonucu%';
