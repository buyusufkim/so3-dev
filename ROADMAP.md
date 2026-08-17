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

## Güncel Route Durumu (Current Route Truth)
**Indexable (İndekslenebilir Sayfalar):**
- `/`
- `/etkinlikler`
- `/etkinlikler/:slug`

**Legacy noindex redirect routes (Geçmişten Kalan ve Ana Sayfaya Yönlendiren Rotalar):**
- `/branslar`
- `/egitmenler`
- `/topluluk`
- `/iletisim`
- `/360-tur`
*Not: Bu sayfalar bağımsız nihai sayfalar değildir, ziyaretçileri ana sayfa bölümlerine yönlendirir.*

## Tamamlanan Özellikler (Completed Repository Capabilities)
- Proje iskeleti, tasarım sistemi, renkler ve tipografi (Tailwind ile).
- Ana sayfa ve ana sayfaya entegre bölümler.
- CMS destekli Ana Sayfa, Etkinlikler, Eğitmenler, Branşlar ve Site Ayarları.
- Dosya yükleme (Filesystem/public upload architecture).
- **Instagram Entegrasyonu:** CMS-selected manual Instagram Reel/Post embeds.
- SEO ve performans iyileştirmeleri, static HTML generation.
- Runtime PHP SEO-shell ve dynamic sitemap mimarisi tamamlandı.

## Dağıtım ve Doğrulama Bekleyenler (Runtime/Deployment Verification Still Pending)
- Mevcut mimarinin (PHP + MySQL + React SPA) üretim ortamında tam olarak test edilmesi ve canlıya alınması.
- Sunucu yapılandırması ve kalıcı dosya yükleme yollarının üretim ortamında doğrulanması.

## Tamamlanan SEO Özellikleri
- Runtime PHP SEO-shell mimarisi ile dinamik etkinlik meta etiketlerinin oluşturulması.
- Dinamik sitemap entegrasyonu (api/seo-sitemap.php) ile güncel yayınlanan etkinliklerin senkronize edilmesi.
- Otomatik Runtime Verifier (`npm run verify:runtime-seo`) oluşturuldu.
- *Not: SEO kod geliştirmeleri repository-complete durumundadır (Dynamic SEO runtime contract repair dahil). Automated runtime verifier (harness) mevcuttur. Ancak, PHP/MySQL/Apache runtime doğrulamasının canlı staging ortamında (actual staging execution pending) henüz tamamlanmamıştır.*

## Gelecek Modüller (Future Modules)
- **Üye Sistemi:** Üye dashboard'u, program takibi, ölçümler.
- **Antrenör Sistemi:** Antrenör dashboard'u, üye yönetimi, program atama.
- **Resepsiyon Operasyonu:** Hızlı check-in, anlık salon durumu, üyelik yenileme.
- **Randevu Sistemi:** Randevu ve seans takviminin devreye alınması.
- **Bildirim Mekanizmaları:** E-posta, sistem içi bildirim ve push bildirimleri.
