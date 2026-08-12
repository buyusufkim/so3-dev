# SO3 PT Ürün Spesifikasyonu (Product Spec)

## Ürün Vizyonu
SO3 PT, Kayseri'de premium standartlarda Personal Training odaklı bir spor ve yaşam kulübüdür. Kulüp yalnızca standart bir spor salonu değil, aynı zamanda üyelerine voleybol, doğa yürüyüşü, kano ve piknik gibi çeşitli topluluk etkinlikleri de sunan bütünsel bir yaşam merkezidir. Platformun vizyonu, kulübün premium hizmet anlayışını dijital ortama taşıyarak, disiplinli, kaliteli ve kişiselleştirilmiş bir deneyimi üyelerine, antrenörlerine ve yönetimine sunmaktır.

## Kullanıcı Rolleri
Sistemde gelecekte bulunacak ve mimarisi buna göre planlanan kullanıcı rolleri:
1. **Ziyaretçi (Guest):**
    - Platformun herkese açık premium web sitesini görüntüler.
    - Antrenörleri, branşları ve topluluk etkinliklerini inceler, iletişim formlarını veya üyelik başvuru ekranlarını kullanabilir.
2. **Üye (Member):**
   - Kendi antrenman programlarını, gelişimlerini, randevu ve seans haklarını takip eder.
   - Topluluk etkinliklerine kayıt olabilir.
   - Bildirimleri, abonelik durumunu yönetir.
3. **Antrenör (Trainer):**
   - Kendi portföyündeki üyelerin gelişimini takip eder ve antrenman programları atar.
   - Günlük randevularını, seanslarını ve doluluk oranlarını yönetir.
4. **Resepsiyon (Reception):**
   - Günlük giriş-çıkış yapan üyeleri takip eder.
   - Hızlı randevu/seans görüntüleme ve salonun anlık durumunu yönetme işlemlerini yürütür.
5. **İçerik Editörü (Content Editor):**
   - Blog, etkinlikler, başarılar ve herkese açık web sitesindeki metin ve görselleri günceller.
6. **İşletme Yöneticisi (Manager):**
   - Genel gelir-gider yönetimi, personel takibi, performans raporları ve salon doluluk oranları gibi operasyonel süreçleri yönetir.
7. **Süper Admin (Super Admin):**
   - Sistemin tüm yapılandırma ayarlarına, rol yönetimlerine ve teknik panellere tam erişime sahiptir.

## Yetki Prensipleri
- Üye yalnızca kendi özel verilerini görür.
- Antrenör yalnızca kendisine yetkilendirilmiş üyelerin gerekli verilerine erişir.
- İçerik editörü özel üye verilerini göremez.
- Resepsiyon hassas antrenör/sağlık verilerine sınırsız erişemez.
- Manager operasyonel yetkilere sahiptir.
- Super Admin sistem seviyesinde tam yetkilidir.
- İleride bir kullanıcının birden fazla rol taşıyabilmesi desteklenmelidir.
- Tüm kişisel veri erişimi ileride RLS ile korunacaktır.

## Geliştirme Fazları (Kısa Özet)
Bu proje aşamalı bir geliştirme süreci izleyecektir. Her faz, kulübün operasyonel yükünü kademeli olarak dijitalleştirmeyi amaçlar. (Detaylar ROADMAP.md dosyasında yer almaktadır).

## Marka Konumlandırması ve Dil
SO3, kalabalık bir spor salonunda kişinin kendi başına antrenman yaptığı klasik üyelik modelinden farklı olarak Personal Training odaklı çalışır. Merkezde: kişi, hedefi, kişiye özel çalışma, birebir takip ve uzman antrenör vardır.

- **Ana Marka Cümlesi:** “Herkese göre değil. Sana göre.”
- **Destekleyici Cümle:** “Kalabalığa değil, gelişimine odaklan.”

### Marka Tonu
- Kendinden emin, az konuşan, net ve modern.
- Ciddi ve premium hissettiren.
- Spor disiplinini taşıyan, samimi fakat laubali olmayan.

### Kaçınılacak Dil ve İfadeler
- “VIP salon”, “elitlerin tercihi”, “lüks spor salonu”, “şehrin en iyisi”.
- Doğrulanmamış üstünlük iddiaları, klişe motivasyon sözleri (“sınırlarını aş”, “bahane yok”, “en iyi versiyonun”, “gerçek potansiyelini keşfet”).
- Klasik bodybuilding sitesi dili (örn: "hipertrofi").
- Salonun fiziksel kat sayısını pazarlama mesajı olarak kullanmak.
- "Gerçek bir sosyal ağ" vb. teknoloji / ürün dili.

Tasarım, kişiselleştirme ve hizmet anlayışı premium algıyı kelimelerle bağırmadan, kendi duruşuyla hissettirmelidir.

## Public Platform - Onaylanmış Veriler
- **Eğitmen Kadrosu:** Selami Özyıldırım, Selim Özyıldırım, Sencer Özyıldırım, Burak Çorakçıoğlu, Eren Sencer Öztürk, Mehmet Katipoğlu (Fitness Eğitmeni · Uzman Diyetisyen), Hulusi Ünlü, Sahranur Sözer, Mehmet Ateş, Serhat Güler, Almira Tektaş, Müniyra Karayağız, İrem Bulut.
- **İletişim & Lokasyon:** 
  - Adres: Yıldırım Beyazıt, Aşık Veysel Blv. No:69/4, 38030 Melikgazi / Kayseri
  - Telefon 1: 0553 957 37 38
  - Telefon 2: 0507 207 77 97
  - WhatsApp: 0552 379 07 77
  - Instagram: @so3pt
- **Hizmet Kapsamı (Ticker Copy):** Kişisel Diyetisyen ve Beslenme Programı, Supplement Danışmanlığı, Birebir Dersler, Kişiye Özel Program, Özel Etkinlikler, Profesyonel Eğitmenler.

## Görsel Tasarım ve Medya Kararları
- **Homepage Visual Direction finalized from V3.1 concept.**
- Accent color (`#851C35`) remains provisional until final brand/visual identity approval.
- Existing legacy website imagery is not considered verified SO3-owned production media and must not be reused in the new platform without explicit approval.
- Official SO3 logo has been integrated.
