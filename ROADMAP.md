# SO3 PT Geliştirme Yol Haritası (Roadmap)

Projenin sürdürülebilir, güvenli ve premium standartlarda geliştirilmesi için izlenecek fazlar aşağıda listelenmiştir.

## Mevcut Mimari (Actual Architecture)
- React 19
- TypeScript
- Vite
- Tailwind CSS
- PHP API
- MySQL/MariaDB
- InnoDB and utf8mb4
- Role-based admin authentication
- Database-backed homepage CMS, events, trainers, branches and site settings
- Filesystem/public upload architecture currently implemented

## Tamamlanan Özellikler (Completed Repository Capabilities)
- Proje iskeleti, tasarım sistemi, renkler ve tipografi (Tailwind ile).
- Herkese açık sayfalar (Ana Sayfa, Branşlar, Eğitmenler, Topluluk, İletişim, vb.) final tasarımlarıyla.
- CMS destekli Ana Sayfa, Etkinlikler, Eğitmenler, Branşlar ve Site Ayarları.
- Dosya yükleme (Filesystem/public upload architecture).
- **Instagram Entegrasyonu:** CMS-selected manual Instagram Reel/Post embeds.
- SEO ve performans iyileştirmeleri, static HTML generation.

## Dağıtım ve Doğrulama Bekleyenler (Runtime/Deployment Verification Still Pending)
- Mevcut mimarinin (PHP + MySQL + React SPA) üretim ortamında tam olarak test edilmesi ve canlıya alınması.
- Sunucu yapılandırması ve kalıcı dosya yükleme yollarının üretim ortamında doğrulanması.

## Gelecek Modüller (Future Modules)
- **Üye Sistemi:** Üye dashboard'u, program takibi, ölçümler.
- **Antrenör Sistemi:** Antrenör dashboard'u, üye yönetimi, program atama.
- **Resepsiyon Operasyonu:** Hızlı check-in, anlık salon durumu, üyelik yenileme.
- **Randevu Sistemi:** Randevu ve seans takviminin devreye alınması.
- **Bildirim Mekanizmaları:** E-posta, sistem içi bildirim ve push bildirimleri.
