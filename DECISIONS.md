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

## F.18B Member Portal Self-Service Read Model
- Member portal content is read exclusively through the session `member_id` via self-only endpoints.
- Client member selector does not exist; horizontal access is prevented by design.
- The `must_change_password` flag blocks all member content access, routing through a password-change-required guard.
- Membership and session package remain separate domains with distinct effective status derivations.
- Package remaining/reserved logic reuses F.17 canonical semantics and ledger integrity rules.
- Portal appointments are read-only, separated into upcoming and recent using explicit business timezone calculation.
- Only active training programs are exposed; program internal notes and member operational notes remain excluded from the safe projection.
- Measurements and progress features are deferred to a separate future phase.

## F.18C Member Portal Frontend Shell & Dashboard
- Member frontend domain is completely isolated under `/uye` route realm and `src/member` source directory.
- Admin API client and Member API client are separate implementations; they do not share CSRF caches or authentication state.
- Authentication relies strictly on HTTP-only cookies and a central `/me` endpoint acting as the source of truth; no localStorage tokens are used.
- Forced password change (`must_change_password`) is strictly enforced at the route level; bypassing to the dashboard is not permitted.
- The member dashboard consumes the four F.18B read-only endpoints concurrently and integrates a Race guard (AbortController).
- Appointment and training program mutations are intentionally excluded to maintain the read-only safety of the portal.
- The `/uye` route tree automatically applies `noindex,nofollow` robots meta to protect member privacy and SEO integrity.
- There is no DEV authentication fallback for the member portal; if the backend is unavailable, it gracefully handles the failure without producing synthetic sessions.

## F.18D Admin Member Account Provisioning UI
- member portal account provisioning admin member detail altında yönetilir
- only super_admin/admin
- one member <-> one portal account
- username create sonrası immutable in current scope
- account status member statusundan ayrı security state
- password create/reset never returned/stored client-side
- reset forces password change and invalidates existing session through backend auth_version
- no delete/impersonation/public signup
- backend remains security source-of-truth

## F.18E Member Progress Measurements Read Model
* member portal measurements self-only read
* fixed max 100
* active/non-deleted measurements only
* raw body metrics only
* no progress notes
* no measurement notes
* no admin metadata
* no member mutations
* presentation trends later frontend concern

## F.18F Member Progress UI
* member progress UI route `/uye/gelisim`
* measurement data read-only from F.18E
* no progress notes / measurement notes
* no health interpretation
* presentation deltas are frontend-only and neutral
* no chart dependency; lightweight SVG
* history max 100 inherited from backend
* dashboard links to progress but does not fetch measurement data

## F.19A Trainer Mobile Workspace Shell
* trainer remains in existing admin/staff auth realm
* existing `/admin/...` trainer routes remain canonical
* mobile trainer workspace is presentation-layer only
* trainer mobile uses compact header + 3-item bottom navigation
* desktop trainer retains existing sidebar
* admin/editor/reception layout behavior unchanged
* no duplicated auth bootstrap
* no new backend/API contract

## F.19B Trainer Dashboard Mobile Density
* dashboard backend contract unchanged
* mobile prioritizes attention work
* member metrics use compact mobile summary
* program metrics use 2x2 mobile grid
* recent members remain fully accessible
* no appointment preview or notification invention
* desktop information scope preserved

## F.19B Trainer Dashboard Mobile Density Repair
* true mobile grid implementations (grid-cols-3 and grid-cols-2 lg:grid-cols-4)
* true mobile semantic ordering (order-1 to order-5)
* verifier non-mutating check

## F.19C Trainer Mobile Appointments Workspace
* trainer appointments remain shared AppointmentListPage
* trainer mobile uses card list; desktop retains table
* lifecycle permissions unchanged
* trainer cannot cancel
* create/reschedule/complete/no-show contracts unchanged
* no new appointment API
* modals receive responsive presentation-only improvements
* request generation/abort safety preserved

## F.19D.1 Trainer Mobile Member Workspace Entry & Navigation
* canonical `/admin/my-members` retained
* mobile member list uses cards, desktop table retained
* shared member workspace navigation is mobile-first three-tab navigation
* member detail responsive optimization is presentation-only
* member/progress/program API contracts unchanged
* no new mutations

## F.19D.2 Trainer Progress Mobile Actions
* canonical `/admin/my-members/:memberId/progress` retained
* 2-column grid mobile tab navigation between measurements and progress notes
* measurements & progress notes list-detail layouts adopt responsive mobile order (detail above list when selected; empty-detail placeholder hidden on mobile)
* create/edit/archive/restore action buttons and pagination controls meet touch-safe standards (min-h-[44px])
* form modals use mobile bottom-sheet presentation with dynamic viewport-safe height
* all existing backend contracts, changed-only PATCH semantics, and submission safety locks preserved
* zero business mutation or schema changes

## F.19D.3 Trainer Training Programs Mobile Workflow
* canonical routes `/admin/my-members/:memberId/training-programs`, `.../new`, `.../:programId` retained
* training programs list adopts mobile card layout (<lg) while retaining desktop table (lg+)
* whole-card navigation on mobile with touch-safe targets (min-h-[44px])
* training program editor uses mobile-first responsive density, touch-safe form inputs, and semantic h1
* unsaved changes guard (`useBlocker`, `beforeunload`) and submission safety locks strictly preserved
* exercises panel adopts mobile card presentation (<lg) and preserves desktop table (lg+) with full row/button IDs
* exercise editor modal implements accessible bottom-sheet layout with dynamic viewport-safe height (`100dvh`)
* strict API namespace isolation (`/api/trainer/*`), soft-archive on programs vs hard-delete on exercises unchanged
* zero backend or database migration changes

## F.20A Membership Renewal Watch Read Model Foundation
* existing reception renew transaction remains canonical
* membership_renewals remains append-only history
* current renewal state derives from members membership dates
* renewal-watch is GET-only and side-effect free
* business date is Europe/Istanbul
* active non-deleted members with non-null end date only
* 14-day default configurable watch window
* no notification persistence/delivery in F.20A

## F.20B Reception Renewal Watch UI
* ReceptionRenewalWatchPanel is a GET-only, side-effect free operational dashboard component
* shared ReceptionRenewalTarget decouples renewal modal from ReceptionMemberSearchItem
* existing POST /api/reception/members/:memberId/renew and handleOpenRenewalModal flow reused identically
* summary counters driven by page-independent backend summary object (no client-side count re-calculation)
* backend authority preserved for ordering, expiry state, and business dates (Europe/Istanbul)
* dates formatted safely via string parser without timezone drift risks
* global mutation mutex (mutationBusy / activeMutation) respected across watch panel and dashboard
* panel auto-refreshed upon renewal completion and contract validation failure via bounded refreshKey
* zero notification domain or persistence concepts in this phase

## F.20C In-App Notification Persistence & Inbox API Foundation
* admin_notifications is per-recipient admin-realm persistence
* recipient identity always comes from admin session ($_SESSION['admin_id'])
* unique recipient_admin_id + source_key provides future producer idempotency
* GET inbox exposes current user's rows only (strict SQL-level recipient isolation)
* read and dismiss are one-way idempotent state changes
* dismiss implies read (read_at is populated on dismiss if previously null)
* no restore / mark-unread / bulk actions in F.20C
* no client notification creation endpoint (no POST /api/admin/notifications)
* no notification producer or delivery channel in F.20C
* member realm remains separate (zero member auth/portal notification exposure)
* read/dismiss are not written to security audit log

## F.20D Renewal Notification Materializer
* renewal notifications are trusted server-generated events
* materialization uses explicit POST boundary, never GET side effects
* eligible members mirror F.20A active/non-deleted/end-date rules
* fixed 14-day window
* eligible recipients are active super_admin/admin/reception accounts
* upcoming/today/expired are separate lifecycle event types
* source key includes member + expiry date + lifecycle stage
* unique recipient + source key is concurrency/idempotency authority
* duplicate materialization never resets read/dismiss state
* no generic client notification creation route
* no frontend trigger, cron, or external delivery in F.20D




