# SO3 PT Geliştirme Yol Haritası (Roadmap)

Projenin sürdürülebilir, güvenli ve premium standartlarda geliştirilmesi için izlenecek fazlar aşağıda listelenmiştir.

## Mevcut Mimari (Actual Architecture)
- React 19, TypeScript, Vite, Tailwind CSS
- PHP 8.2 API
- MySQL/MariaDB (InnoDB and utf8mb4)
- Apache/cPanel Deployment
- Role-based admin authentication
- Database-backed homepage CMS, events, trainers, branches and site settings
- Filesystem/public upload architecture

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
- Admin login, CMS destekli Ana Sayfa, Etkinlikler, Eğitmenler, Branşlar ve Site Ayarları.
- Dosya yükleme (Filesystem/public upload architecture).
- **Instagram Entegrasyonu:** CMS-selected manual Instagram Reel/Post embeds.
- Dinamik sitemap entegrasyonu ve dynamic event SEO oluşturulması.
- Production PHP 8.2, MySQL/MariaDB ve Apache/cPanel dağıtımı gerçekleştirildi.
- Canlı runtime ve Search Console doğrulamaları tamamlandı.
- Otomatik Runtime Verifier (`npm run verify:runtime-seo`) oluşturuldu ve doğrulandı.
- **Üye Portalı (Member Portal):** Auth, dashboard, ölçüm ve antrenman ilerleme takibi.
- **Antrenör Mobil Çalışma Alanı (Trainer Mobile Workspace):** Üye yönetimi, egzersiz/program oluşturma ve gelişim notları iş akışları.
- **Resepsiyon Operasyonu (Reception Operations):** Hızlı check-in, anlık salon doluluğu ve üyelik yenileme yönetimi.
- **Randevu Sistemi (Appointment Lifecycle):** Randevu oluşturma, yeniden planlama, iptal ve terminalizasyon süreçleri.
- **Seans Paketleri & Defter Entegrasyonu (Session Package Ledger):** Paket satın alma, seans düşümü ve tüketim mutabakatı.
- **Üyelik Yenileme Takibi (Renewal Watch):** Yaklaşan, bugün dolan ve süresi geçen üyelik izleme modeli.
- **Yönetici Bildirimleri (In-App Admin Notifications):** Sistem içi kalıcı bildirimler ve yenileme materializer mekanizması (harici e-posta, SMS veya push bildirimi mevcut değildir; cron/AI otomasyonu bulunmaz).
- **Operasyon Analitiği (Operations Analytics):** 7, 30 ve 90 günlük dönemler için ziyaret, yenileme ve randevu trend analitiği.

## Kapsam Dışı Bırakılanlar (Out of Scope / Skipped)
- **F.21 Lead / Sales CRM:** Mevcut ürün kapsamı için gereksiz görüldüğünden bilinçli olarak atlanmıştır (Lead / Sales CRM intentionally skipped).

## İçerik Bekleyenler
- Eğitmenler ve branşlar için prodüksiyon kalitesindeki gerçek fotoğraflar içerik olarak beklenmektedir.

