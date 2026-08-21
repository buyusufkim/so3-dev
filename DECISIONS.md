# Teknik Karar Günlüğü (Decision Log)

Bu dosya, proje süresince alınan önemli mimari, teknolojik ve ürüne dair kararların nedenleriyle birlikte tutulduğu alandır.

## Karar 1: Teknoloji Yığını (Tech Stack) Seçimi
- **Tarih:** 2026-08-07 (Proje Başlangıcı), 2026-08-15 (Revizyon)
- **Bağlam:** Güçlü, modern ve sürdürülebilir bir ön yüz ile güvenli ve yaygın bir arka uç mimarisine ihtiyaç var.
- **Karar:** React 19 + TypeScript + Vite + Tailwind CSS ile Frontend; PHP 8.2 API, MySQL/MariaDB ve filesystem uploads ile Backend (Apache/cPanel).
- **Gerekçe:** Hızlı geliştirme deneyimi, güçlü tip güvenliği (TypeScript) ve modern arayüz tasarımı için React ekosistemi seçilmiştir. Arka uç ve veritabanı için daha önceden düşünülen Supabase yerine, mevcut sunucu altyapısına uygun olan, SEO açısından PHP-shell destekleyen ve kontrolü tamamen SO3'te olan PHP + MySQL/MariaDB mimarisi tercih edilmiştir. Dosyalar public/uploads altında filesystem üzerinde saklanmaktadır.

## Karar 2: Mimari Yapı (Feature-Based & Atomic Design)
- **Tarih:** 2026-08-07
- **Bağlam:** Büyük ölçekli ve çok modüllü projenin yönetilebilirliği.
- **Karar:** `src/features`, `src/pages/*`, `api/controllers`, `api/core` gibi ayrıştırılmış modüler bir yapı kullanılması.
- **Gerekçe:** Frontend ve Backend rollerinin özelliklerinin birbirine karışmasını engellemek, kod tekrarını önlemek ve uzun vadede sürdürülebilir bir yapı kurmak.

## Karar 3: Tasarım Dili ve Renk Paleti
- **Tarih:** 2026-08-07
- **Bağlam:** Spor markasının premium ve disiplinli hissini yansıtmak.
- **Karar:** Siyah, antrasit ve kırık beyaz ana renkler olarak belirlendi. Cam efekti, aşırı neon renkler ve hazır spor salonu şablonlarından kesinlikle kaçınılması.
- **Gerekçe:** Hedef kitlenin üst gelir grubu olması ve markanın disiplin odaklı premium duruşu nedeniyle sade, net hiyerarşiye sahip ve minimal bir dil tercih edildi.

## Karar 4: Homepage Visual Direction ve Medya Kullanımı
- **Tarih:** 2026-08-07
- **Bağlam:** Farklı tasarım konseptleri arasından hangisinin production'a alınacağı.
- **Karar:** Homepage görsel yönü olarak V3.1 konsepti production'a alınmıştır. 
- **Gerekçe:** Dağınık konseptler kaldırılarak, kod tabanı sadeleştirilmiş, CMS (Content Management System) uyumlu ve modüler bir production homepage elde edilmiştir. Eğitmenler ve branşlar için prodüksiyon kalitesindeki gerçek fotoğraflar beklenmektedir.

## Karar 5: Public Route Optimizasyonu
- **Tarih:** 2026-08-07, 2026-08-16 (SEO Revizyonu)
- **Bağlam:** SEO performansını artırmak ve sayfa bütünlüğünü korumak.
- **Karar:** Dinamik ve indekslenebilir rotalar olarak sadece `/`, `/etkinlikler` ve `/etkinlikler/:slug` bırakılmıştır. Diğer rotalar (`/branslar`, `/egitmenler`, `/topluluk`, `/iletisim`, `/360-tur`) bağımsız içerik sayfaları olmak yerine ana sayfadaki ilgili bölümlere yönlendiren legacy noindex rotalara dönüştürülmüştür.
- **Gerekçe:** Parçalanmış ve içerik açısından zayıf alt sayfalar (thin content) SEO performansını düşürdüğü için, tüm güç tek ve zengin bir ana sayfada (One-Page Experience) toplanmıştır. Sadece detaylı bilgi içeren Etkinlikler modülü ayrı sayfalara bölünmüştür.
