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

## İçerik Bekleyenler
- Eğitmenler ve branşlar için prodüksiyon kalitesindeki gerçek fotoğraflar içerik olarak beklenmektedir.

## Gelecek Modüller (Future Modules)
- **Üye Sistemi:** Üye dashboard'u, program takibi, ölçümler.
- **Antrenör Sistemi:** Antrenör dashboard'u, üye yönetimi, program atama.
- **Resepsiyon Operasyonu:** Hızlı check-in, anlık salon durumu, üyelik yenileme.
- **Randevu Sistemi:** Randevu ve seans takviminin devreye alınması.
- **Bildirim Mekanizmaları:** E-posta, sistem içi bildirim ve push bildirimleri.

