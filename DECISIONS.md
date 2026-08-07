# Teknik Karar Günlüğü (Decision Log)

Bu dosya, proje süresince alınan önemli mimari, teknolojik ve ürüne dair kararların nedenleriyle birlikte tutulduğu alandır.

## Karar 1: Teknoloji Yığını (Tech Stack) Seçimi
- **Tarih:** 2026-08-07 (Proje Başlangıcı)
- **Bağlam:** Güçlü, modern ve sürdürülebilir bir ön yüz mimarisine ihtiyaç var.
- **Karar:** React + TypeScript + Vite + Tailwind CSS + React Router + Supabase (İleriki fazlarda eklenecek).
- **Gerekçe:** Hızlı geliştirme deneyimi, modüler yapı, güçlü tip güvenliği (TypeScript) ve premium bir arayüz tasarımını esnek bir şekilde kodlayabilmek (Tailwind). Backend ve veritabanı olarak da PostgreSQL tabanlı güçlü özellikleri nedeniyle Supabase tercih edilmiştir.

## Karar 2: Mimari Yapı (Feature-Based & Atomic Design)
- **Tarih:** 2026-08-07
- **Bağlam:** Büyük ölçekli ve çok modüllü (Uygulama, Admin, Resepsiyon) projenin yönetilebilirliği.
- **Karar:** `src/features`, `src/pages/*`, `src/components/ui` gibi ayrıştırılmış modüler bir klasör yapısı kullanılması.
- **Gerekçe:** Farklı rollerin özelliklerinin birbirine karışmasını engellemek, kod tekrarını önlemek ve uzun vadede maintainable (sürdürülebilir) bir yapı kurmak.

## Karar 3: Tasarım Dili ve Renk Paleti
- **Tarih:** 2026-08-07
- **Bağlam:** Spor markasının premium ve disiplinli hissini yansıtmak.
- **Karar:** Siyah, antrasit ve kırık beyaz ana renkler olarak belirlendi. Cam efekti, aşırı neon renkler ve hazır spor salonu şablonlarından kesinlikle kaçınılması.
- **Gerekçe:** Hedef kitlenin üst gelir grubu olması ve markanın disiplin odaklı premium duruşu nedeniyle sade, net hiyerarşiye sahip ve minimal bir dil tercih edildi.

## Karar 4: Homepage Visual Direction ve Medya Kullanımı
- **Tarih:** 2026-08-07
- **Bağlam:** Farklı tasarım konseptleri (V1, V2, V3, V3.1) arasından hangisinin production'a alınacağı ve mevcut web sitesinden gelecek görsellerin durumu.
- **Karar:** Homepage görsel yönü olarak V3.1 konsepti onaylanıp production'a alınmıştır. V3.1'de kullanılan `#851C35` accent rengi "provisional" (geçici) olarak kabul edilmiştir; nihai marka kimliği onaylanana kadar kurumsal marka rengi olarak kilitlenmeyecektir. Ayrıca mevcut (eski) web sitesindeki görsellerin, doğrulanmış SO3 prodüksiyon medyası olmadığı kabul edilmiş ve onay olmadan yeni platformda kullanılmaması kararlaştırılmıştır.
- **Gerekçe:** Dağınık ve karmaşık eski konseptler kaldırılarak, kod tabanı sadeleştirilmiş, modüler bir production homepage elde edilmiştir. Gerçek fotoğraf çekimi tamamlanana kadar da kontrollü bir media placeholder stratejisi izlenecektir. Logo varlığı için de geçici metin ("SO3 PT") kullanılmakta olup, marka yetkililerinden orijinal vektörel veya yüksek çözünürlüklü logo dosyası (official asset) beklenmektedir.

## Karar 5: Public Route Optimizasyonu
- **Tarih:** 2026-08-07
- **Bağlam:** Galeri ve SO3 Deneyimi sayfalarının içerik bütünlüğü.
- **Karar:** `galeri` ve `so3-deneyimi` sayfaları ürün kapsamından çıkarılarak route yapılandırmasından silinmiştir.
- **Gerekçe:** Separate Gallery and SO3 Experience pages were removed to avoid duplicated content. Real SO3 media will be distributed contextually across the relevant public pages.
- **Final Public Routes:** `/`, `/branslar`, `/egitmenler`, `/topluluk`, `/etkinlikler`, `/basarilar`, `/360-tur`, `/iletisim`, `/giris`
