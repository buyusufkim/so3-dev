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
