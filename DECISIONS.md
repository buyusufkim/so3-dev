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

## Karar 6: Session Package Domain Foundation
- **Tarih:** 2026-09-09
- **Bağlam:** Üyelerin seans paketlerinin satın alımını, kullanılmasını ve kalan hakkın takibini doğru ve veri güvenliğini ihlal etmeden (auditable) yapmak.
- **Karar:** 
  - Membership dates ve Session Packages tamamen ayrı kavramlar olarak ele alınacaktır.
  - Üyeler aynı anda veya tarihsel olarak birden çok `member_session_packages` instance'ına sahip olabilir.
  - Catalog paketi (session_packages) değişse dahi, mevcut atanan üyelerin paketlerindeki session sayısı gibi snapshot bilgiler değişmeyecektir.
  - Kalan kullanım hakkı (`remaining_sessions`), atanmış bir rakam üzerinden manual eksiltme/artırma (mutable update) ile değil, append-only bir defter/hareket (`member_session_package_ledger`) yapısı kullanılarak hesaplanacaktır (balance = total_sessions + SUM(delta)).
  - Rezervasyon ve iadeler appointment ID ve explicit entry_type ile (`reserve`, `release`, `adjustment`) ledger üzerine işlenecektir.
  - Finansal (payment/invoice) bilgiler bu fazda kapsama dahil edilmemiş, yalnızca seans yönetimi üzerine kurgulanmıştır.
- **Gerekçe:** Paket (seans) hakları operasyonel değer taşır; güncel veya eski hareketlerin audit edilebilmesi, concurrency anında hatalı eksiltmeleri engellemek ve geçmiş kullanım hakkını tutarlı korumak için append-only ledger modeli tek güvenilir mimaridir.


### F.17C.1 Appointment Session Package Lifecycle
* appointment create with package → reserve -1
* cancel → release +1
* completed/no_show → credit consumed
* reschedule → same reservation retained
* appointment package association immutable
* balance reservation serialized by `member_session_packages` row lock
* NULL package association only transitional legacy compatibility
* F.17C.2 frontend cutover package selection mandatory yapacak

F.17C.2 cutover sonrası yeni appointment create işlemlerinde explicit member_session_package_id zorunludur.
NULL association yalnız pre-cutover/historical appointment compatibility içindir.

## F.17 Canonical Reserved Sessions Semantics
- reserved_sessions yalnız halen scheduled durumda olan package-linked appointmentları ifade eder.
- completed/no_show reserve kayıtları tüketilmiş seans hakkıdır; remaining balance'ı düşürür fakat active reservation sayılmaz.
- Package cancellation yalnız scheduled linked reservations nedeniyle bloklanır.


## F.18A Member Portal Auth & Account Foundation
- Member authentication is structurally isolated from admin authentication.
- Member credentials and login attempts are stored in `member_accounts` and `member_login_attempts`.
- Admin cookies are named `so3_admin_session`, while member cookies are `so3_member_session`. Both can coexist in the same browser.
- A member account (`member_accounts`) maps one-to-one to a member profile (`members`).
- Logging in requires both the `member_accounts` record and the `members` record to be `active` and not deleted.
- There is no public registration. Accounts are exclusively provisioned by admins.
- The `auth_version` field in `member_accounts` acts as a credential/session invalidation token. It increments on password reset, status changes, and self-initiated password changes, instantly terminating old sessions via `MemberAuthMiddleware`.
- Future F.18B read APIs will enforce self-only data access tied directly to the `member_id` captured in the session.
