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

## F.20E Admin Notification Bell & Inbox UI
* notification UI currently renders for super_admin/admin/reception, matching the renewal producer audience
* F.20C backend inbox remains generic admin-realm infrastructure for future roles
* renewal materialization runs on notification UI mount and explicit manual refresh
* materializer failure never blocks existing inbox access
* unread badge uses backend unread_count only
* active/unread/dismissed views use backend filtering/pagination
* read/dismiss mutations always reconcile from server after success or ambiguous contract result
* notification action paths are internal /admin paths only
* no polling, external delivery, restore, unread, delete, or generic client create

## F.22A Operations Analytics Read Model
* F.21 Lead/Sales CRM intentionally skipped as unnecessary for current product scope
* F.22 builds on existing operational data rather than introducing a separate analytics datastore
* existing /api/admin/dashboard/operations remains unchanged
* analytics is super_admin/admin only
* business calendar uses Europe/Istanbul
* ranges are fixed 7d/30d/90d in F.22A
* daily series is zero-filled and chronological
* member visits, membership renewals and appointment starts are canonical metric sources
* no personal member data in analytics responses
* no financial analytics because no canonical payment/invoice domain exists
* no session-package utilization analytics in F.22A
* no automation in F.22A

## F.22B Operations Analytics Dashboard UI
* analytics is embedded into existing super_admin/admin /admin dashboard
* existing daily Operations Summary remains canonical and unchanged
* F.22A response is strict-runtime-validated before rendering
* range selection always refetches backend; no client slicing
* 30d is initial range
* analytics fetch errors are isolated from the rest of Dashboard
* daily trend uses lightweight local SVG with no chart dependency
* backend chronology is preserved
* no derived business rates
* no financial or session-package analytics
* no polling or automation

## F.23A Fresh Install & Deployment Parity Closure
* migration directory remains incremental schema authority
* fresh-install is canonical empty-database representation and must remain migration-history complete
* fresh-install was advanced through migration 039
* admin_notifications is included in fresh installs
* deployment docs track current fresh-install migration coverage
* roadmap reflects implemented operational modules rather than stale future-module labels
* F.21 Lead/Sales CRM remains intentionally skipped
* no application/business behavior changed

## F.23B Staging Admin-Realm Runtime Smoke Harness
* runtime verifier validates deployed PHP/MySQL behavior, not source strings
* admin/reception/trainer sessions are isolated
* credentials are environment-only and never logged
* production host is blocked by default
* runtime smoke is read-only for business entities
* login/logout auth side effects are accepted
* notification namespace regression is explicitly tested with reception/trainer
* admin analytics and role boundaries are tested against real runtime
* business mutations remain out of scope

## F.24A Member Appointment Actor Attribution Foundation
* appointments and member_session_package_ledger creator attribution enables auditable provenance for self-service appointments
* member_accounts.id is the authoritative actor identity for future member portal self-service bookings
* created_by (pointing to admins.id) becomes nullable to allow member-account creation without artificial or system admin identities
* created_by_member_account_id is added with foreign key constraint referencing member_accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT
* mutual exclusivity between admin and member account creator is strictly enforced via chk_appointments_creator_attribution and chk_mspl_creator_attribution check constraints
* existing admin, reception, and trainer appointment creation and session-package ledger behavior remains 100% unchanged
* no member booking or availability endpoint is created in this phase; F.24A provides data model attribution foundation only

## F.24B.1 Trainer Availability Domain Foundation & API
* weekly availability uses ISO weekday recurring same-day windows
* specific unavailability is represented by datetime blocks
* availability configuration does not mutate existing appointments
* admin/super_admin can manage any trainer
* trainer can manage only own linked active profile
* availability replace is transactional snapshot semantics
* no slot duration is invented
* no member-facing availability or booking is exposed yet
* Europe/Istanbul remains business timezone

## F.24B.2 Trainer Availability Management UI
* admin/super_admin manage availability inside existing trainer editor
* trainer manages own availability from dedicated mobile-first page
* weekly windows and unavailability blocks remain raw configuration
* browser timezone conversion is forbidden; Europe/Istanbul values are transported as wall-time strings
* availability save is independent from trainer profile save
* editor/reception cannot manage availability
* no member-facing slot projection or booking is introduced

## F.24C.1 Member Self-Service Booking Options Read Model
* self-service uses assigned trainer only
* v1 session duration = 60 minutes
* v1 slot step = 60 minutes
* minimum notice = 120 minutes
* booking horizon = 14 calendar days including today
* slot grid anchors to each weekly availability window start
* no weekly availability means no bookable slots
* unavailability and scheduled trainer/member appointments remove slots
* package eligibility is evaluated on appointment date
* member booking remains read-only in F.24C.1

## F.24C.2 Transaction-Safe Member Self-Service Appointment Create
* POST /api/member/appointments exposes atomic member self-service appointment creation
* client payload strictly limited to starts_at and member_session_package_id; member, trainer, ends_at, and creator attribution derived via server authority
* member_accounts -> members -> trainers -> member_session_packages rows locked FOR UPDATE in serial order
* membership active status, date range, trainer assignment, and trainer active status revalidated under lock
* session package locked FOR UPDATE with fail-closed ledger integrity check and positive balance requirement
* booking policy revalidated under lock: 14-day horizon (Europe/Istanbul) and 120-minute minimum notice period
* slot must match active weekly availability window and not overlap with unavailability blocks
* mutual exclusion between trainer and member scheduled appointments verified with FOR UPDATE locks
* atomic write creates appointments row with created_by = NULL and created_by_member_account_id = session member_account_id
* atomic reserve ledger row inserted with delta = -1 and created_by_member_account_id attribution matching appointment
* returns HTTP 201 with persisted appointment snapshot
* no cancellation, reschedule, or frontend booking UI introduced in this phase

## F.24C.3 Member Self-Service Appointment Booking UI
* member booking UI consumes server-generated 14-day options only
* frontend never generates slots or evaluates booking eligibility
* flow is date → slot → eligible package → confirmation
* single eligible package may auto-select; multiple packages require explicit selection
* POST uses exact server-provided starts_at
* successful booking refetches booking options
* slot/package race failures refetch server authority
* member cancellation/reschedule remain out of scope

## F.25A Member Appointment Lifecycle Actor Attribution Foundation
* member cancellation attribution uses member_accounts.id
* member reschedule attribution uses member_accounts.id
* admin cancellation/reschedule attribution remains based on admins.id
* appointment cancellation permits zero-or-one actor because non-cancelled/legacy rows exist
* appointment reschedule history requires exactly one actor
* member cancel/reschedule API is NOT part of F25A
* no frontend changes
* no ledger schema changes
* no completed/no-show member actor attribution
* F25A is schema foundation for F25B

## F.25B Member Self-Service Appointment Lifecycle API
* members mutate only own scheduled appointments
* cancel releases reserved session exactly once (entry_type = release, delta = +1)
* cancel actor = member_accounts.id (cancelled_by = NULL, cancelled_by_member_account_id = session member_account_id)
* reschedule preserves reserve/package/trainer
* reschedule actor = member_accounts.id (rescheduled_by = NULL, rescheduled_by_member_account_id = session member_account_id)
* reschedule revalidates F24 slot policy transactionally (14-day horizon, 120-min notice, availability windows, unavailability blocks, conflict mutexes)
* same-slot reschedule rejected as no-op (409 APPOINTMENT_RESCHEDULE_NO_CHANGE)
* no frontend in F25B

## F.25C.1 Member Appointment Reschedule Options Read Model
* reschedule options appointment-specific (GET /api/member/appointments/{id}/reschedule-options)
* create booking options are intentionally not reused as authoritative reschedule projection
* existing reserve/package is preserved
* package remaining balance is not re-consumed (no remaining_sessions > 0 check)
* target appointment excluded from conflict projection (id <> targetAppointmentId)
* target appointment current slot excluded from generated reschedule choices
* mutation API remains F25B authoritative
* no UI in C.1

## F.25C.2 Member Appointment Lifecycle UI
* lifecycle actions (Yeniden Planla, İptal Et) added to upcoming scheduled appointment cards on member dashboard
* recent and past appointments have zero mutation actions
* cancel flow requires member-provided cancellation reason (max 255 chars, trimmed)
* cancel calls PATCH /api/member/appointments/{id}/cancel
* reschedule flow loads appointment-specific 14-day options via GET /api/member/appointments/{id}/reschedule-options
* reschedule options modal allows selecting bookable dates and slots, excluding current slot
* reschedule calls PATCH /api/member/appointments/{id}/reschedule with exact starts_at
* duplicate submit and race mutations prevented via submission locks and disabled button states
* in-flight requests cancelled via AbortController on modal close and component unmount
* after successful cancellation or reschedule, client re-fetches authoritative appointment and session package state from server
* booking-create page (MemberAppointmentBookingPage) remains isolated and unchanged

## F.26A Trainer Daily Agenda Read Model Foundation
* daily agenda is trainer-self-only (GET /api/trainer/daily-agenda)
* business time Europe/Istanbul
* server date only; no arbitrary date selector in F26A
* read-only projection (zero mutation queries)
* today appointment timeline (starts_at >= today 00:00:00 and < tomorrow 00:00:00)
* temporal states (upcoming, in_progress, past_due, terminal) are derived, not persisted
* past_due means scheduled appointment whose end has passed
* no automatic no_show or completed transition
* focus projection provides current in-progress and next upcoming appointment
* needs_terminalization queue exposes scheduled past-due appointments requiring action
* no trainer scoring, ranking, or performance analytics
* existing trainer dashboard and appointment lifecycle endpoints remain canonical
* no UI in F26A

## F.26B Trainer Daily Agenda UI
* daily agenda workspace integrated directly into trainer home (/admin/trainer) via DailyAgendaWorkspace
* component consumes GET /api/trainer/daily-agenda validated with validateTrainerDailyAgenda
* independent loading, error, and refreshKey lifecycle isolated from general dashboard metrics
* in-flight requests abortable via AbortController on component unmount and re-fetch
* request generation counter guards against out-of-order race conditions
* focus cards project active in-progress ("Şu An") and next upcoming ("Sıradaki") appointments
* needs-terminalization banner highlights past-due scheduled appointments requiring action
* daily timeline renders today's appointments in chronological order with wall time, member link, and badges
* strictly read-only: no inline complete, no-show, cancel, or reschedule mutations
* canonical appointment lifecycle management and actions route into /admin/my-appointments
* mobile-first layout with 44px minimum touch targets and zero performance ranking or notification anti-features

## F.26C Daily Appointment Terminalization Actions
* only needs_terminalization entries actionable for terminalization in daily workspace
* completed and no_show actions supported via direct modal triggers (Tamamla / Gelmedi)
* server temporal projection remains authoritative; no client-side time evaluation
* canonical shared AppointmentTerminalModal reused; no duplicate modal or mutation logic
* no direct DailyAgendaWorkspace mutation queries (zero apiClient.patch in workspace)
* no duplicate endpoint string construction; endpoints remain centralized in AppointmentTerminalModal
* shared modal contract narrowed to AppointmentTerminalTarget (appointment, member, trainer.id)
* terminalization success triggers authoritative agenda refetch via refreshKey increment
* cancel and reschedule remain canonical appointment workspace (/admin/my-appointments) concerns
* zero backend or database schema modifications; existing trainer terminalization endpoints utilized

## F.27A WhatsApp Communication Foundation
* manual user click-to-chat only; zero background/automated messaging
* canonical URL base strictly HTTPS `https://wa.me/` (no `whatsapp://`, `api.whatsapp.com`, or `web.whatsapp.com`)
* strict Turkish mobile phone normalization to `905XXXXXXXXX` via `normalizeWhatsAppPhone`
* invalid or non-mobile numbers safely produce no clickable link (graceful disabled state)
* zero WhatsApp Business Cloud API, credentials, webhooks, or external service dependencies
* zero message logging, conversation history tracking, or database/audit writes on contact actions
* existing backend member phone authorization strictly preserved (`TrainerMemberController` enforces `m.trainer_id = ?`)
* trainer member detail workspace (`/admin/my-members/:id`) acts as the first canonical integration surface
* `DailyAgendaWorkspace` remains completely unchanged in F.27A; agenda quick-contact deferred to F.27B

## F.27B Daily Agenda WhatsApp Quick Contact
* trainer daily agenda exposes member contact phone strictly for scheduled appointments (`status === 'scheduled'`)
* historical terminal appointments (completed, no_show, cancelled) strictly project `phone: null` to prevent historical PII leakage
* single joined query projection in `TrainerDailyAgendaController.php` (`m.phone AS m_phone`), zero N+1 queries
* fail-closed ownership check preserved: scheduled appointment requires member assigned to current trainer and not soft-deleted
* TypeScript schema `TrainerDailyAgendaMember` updated to `phone: string | null` with strict runtime validator
* validator strictly rejects non-null phone for terminal appointments and whitespace-only strings
* deterministic message template helper `buildTrainerAppointmentWhatsAppMessage` produces Turkish appointment notification
* quick-contact click-to-chat action provided via `WhatsAppContactLink` on `focus.current`, `focus.next`, and `needs_terminalization`
* general chronological appointments timeline intentionally does not show WhatsApp action
* zero automatic messaging, background jobs, external WhatsApp Business API, or webhook integrations

## F.27C Trainer Member WhatsApp Quick Messages
* trainer member detail workspace (`/admin/my-members/:id`) provides three deterministic WhatsApp quick messages
* exactly three intents supported: `general` ("Genel İletişim"), `appointment_reminder` ("Randevu Hatırlatma"), `follow_up` ("Takip Mesajı")
* pure deterministic helper `buildTrainerWhatsAppQuickMessage` constructs Turkish message templates
* member first name used with whitespace trim; graceful neutral fallback ("Merhaba, ...") if empty
* sensitive data strictly excluded (no surname, measurements, health data, packages, or payment details)
* single bounded disabled/empty state rendered when member phone is invalid or missing
* click-only model via canonical `WhatsAppContactLink` (explicit user anchor click only)
* zero free-text editor, zero template management/CRUD, zero auto-send or background scheduling
* zero delivery status claims ("Gönderildi"), zero communication logging or database persistence
* zero backend or database changes; existing canonical direct WhatsApp contact actions preserved

## F.28A Renewal Retention Quick Actions
* F28 starts from existing Renewal Watch read model (`GET /api/reception/renewal-watch`) rather than new CRM domain
* retention action = WhatsApp quick outreach + canonical renewal (`onRenew`)
* server `renewal_state` (`upcoming`, `today`, `expired`) is authoritative; zero client-side date recomputation
* one deterministic service-oriented message per renewal state via `buildRenewalRetentionWhatsAppMessage`
* member first name used with whitespace trim; neutral fallback ("Merhaba, ...") if empty; zero surname or financial data
* click-only model via canonical `WhatsAppContactLink` (explicit user anchor click only)
* invalid phone results in clean absence of WhatsApp button (`showDisabledIfInvalid={false}`); Yenile action unaffected
* zero contact logging, contacted_at timestamps, or sent/delivery claims ("Mesaj Gönderildi")
* zero WhatsApp Business API, webhooks, or background/automated messaging
* zero retention scoring, segmentation, stages, leads, or churn probability models
* zero backend or database schema changes; existing canonical renewal mutation flow remains completely unchanged

## F.28B Trainer Retention Attention Read Model
* dedicated trainer GET read model (`GET /api/trainer/retention-attention`) separate from legacy dashboard
* 14-day fixed inactivity threshold (`INACTIVITY_DAYS = 14`); boundary inclusive
* completed appointments only define successful activity (`a.status = 'completed'`)
* current trainer appointments only (`a.trainer_id = m.trainer_id`); previous trainer sessions ignored
* active/non-deleted members only (`m.status = 'active'`, `m.deleted_at IS NULL`)
* expired memberships excluded (`m.membership_end_date IS NULL OR m.membership_end_date >= business_date`)
* members with current/future scheduled appointment excluded (`a2.starts_at >= business_now`); past-due scheduled do not suppress
* never-completed members excluded from inactivity attention
* maximum 20 candidates returned (`LIMIT 20`)
* chronological inactivity ordering (`last_completed_at ASC, member_id ASC`), zero churn/risk scoring
* safe PII boundary: member id/uuid/names/phone, last_completed_at, inactivity_days only
* Europe/Istanbul timezone authority in PHP; zero DB CURDATE()/NOW() authority
* read-only foundation only: zero writes, zero CRM models, zero WhatsApp backend behavior, zero UI in F28B

## F.28C Trainer Retention Attention UI
* independent operational panel (`TrainerRetentionAttentionPanel.tsx`) mounted on `/admin/trainer`
* consumes dedicated F28B read model (`GET /api/trainer/retention-attention`)
* independent lifecycle: own data, loading, error, and retry states; errors isolated from parent dashboard
* race-safe fetch architecture with AbortController, request generation counter, and mounted guard
* runtime validation via `validateTrainerRetentionAttention` before writing to state
* server-authoritative inactivity context: displays `inactivity_days` and `last_completed_at` without browser date recalculation
* preserves API ordering (oldest inactive first); zero client-side `.sort()` or filtering controls
* neutral check-in outreach: reuses existing F.27C `follow_up` WhatsApp message template
* canonical click-to-chat via `WhatsAppContactLink`; absent if phone missing/invalid
* direct member navigation via `/admin/my-members/{id}` ("Üyeyi Aç")
* mobile-first layout: placed after Daily Agenda (`order-2 lg:order-none`), touch targets >= 44px
* zero mutation methods (`apiClient.get` only), zero CRM models, zero contacted state tracking, zero churn scoring

## F.29A Program Day Structure Foundation
* Program System v2 introduces `training_program_days` entity to structure flat exercises into modular program days/sessions
* zero disruption to existing programs or flat exercises; `program_exercises.program_day_id` is nullable with `ON DELETE SET NULL`
* migration `043_add_training_program_days.sql` adds `training_program_days` table and `program_day_id` column with index
* `database/fresh-install.sql` and `DEPLOYMENT_PHP_MYSQL.md` aligned with migration 043 schema/history parity
* dedicated controller `TrainerProgramDayController.php` provides ownership-safe day CRUD operations
* `GET /api/trainer/training-programs/{programId}/days`: returns chronological day list with program and member ownership verification
* `POST /api/trainer/training-programs/{programId}/days`: creates day with title (1-160), sort_order, notes (max 2000), parent program lock `FOR UPDATE`, and UUID v4
* `PATCH /api/trainer/program-days/{dayId}`: updates day attributes with ownership lock `FOR UPDATE` and idempotent commit
* `DELETE /api/trainer/program-days/{dayId}`: soft-deletes day and safely unassigns existing exercises (`program_day_id = NULL`) within single transaction
* RBAC strictly restricted to `trainer` role with session `admin_id -> trainers.admin_id` resolution
* transaction safety: strict `beginTransaction -> FOR UPDATE lock -> mutation -> commit -> audit log` ordering with rollback guards
* `TrainerProgramExerciseController` extends JSON allowlist, index projection, create, and update with optional `program_day_id`
* same-program and active day validation (`d.program_id = programId AND d.deleted_at IS NULL FOR UPDATE`) ensures zero cross-program leakage
* frontend TypeScript contract (`types.ts`) extended with `TrainerProgramDay` types, guards, and `program_day_id: number | null` on exercises
* read/write operations completely isolated from calendar sessions/appointments (program structure semantic only)
* zero UI refactoring or member portal mutation in F.29A; backend foundation and validation contract only

## F.29B Program Day Management & Exercise Assignment UI
* trainer program editor surface (`/admin/my-members/:memberId/training-programs/:programId`) integrates program day management alongside exercise assignments
* `TrainerProgramDaysPanel` component provides day CRUD: list, create, edit, delete with modal form (title: 1-160 chars, sort_order: integer >= 0, notes: max 2000 chars)
* race-safe day loading with `AbortController`, unmount protection, and request generation counter; zero polling
* empty state with CTA "İlk Günü Oluştur" when zero program days exist
* exercise form in `TrainerProgramExercisesPanel` enhanced with program day selector dropdown (`#exercise-day-select`)
* exercise day selector defaults to "Gün Atanmamış" (null) or allows choosing any active program day
* validation confirms selected day belongs to the current program before mutation submission
* supports moving/changing existing exercise to another day or unassigning back to "Gün Atanmamış"
* grouped exercise presentation: when program days exist, exercises are displayed grouped under their respective day sections with day header, exercise count, and "+ Bu Güne Egzersiz Ekle" CTA
* unassigned / legacy exercises preserved in dedicated "Gün Atanmamış Egzersizler" section
* backward compatibility: programs with zero program days continue displaying flat exercises cleanly without breakage
* single canonical day list flow between parent `TrainerTrainingProgramEditor`, `TrainerProgramDaysPanel`, and `TrainerProgramExercisesPanel`
* when a day is deleted, UI notifies trainer that exercises are moved to "Gün Atanmamış", and exercises list automatically refreshes
* real-time exercise counts reflected on day cards in `TrainerProgramDaysPanel`
* server-authoritative day ordering: `programDays` are rendered directly in canonical API order (`sort_order ASC, id ASC`) with zero client-side `.sort()` or reordering
* touch targets: all interactive actions including day-group quick-add ("Bu Güne Egzersiz Ekle", "Atanmamış Egzersiz Ekle") strictly enforce `min-h-[44px]`
* mobile-first design with touch targets >= 44px, responsive card/table views, and Turkish language UI
* zero schema changes, zero new backend endpoints; utilizes F.29A REST endpoints

## F.29C Program Editor v2 Workflow Polish
* Program Editor v2 workflow polish introduces collapsible day sections, compact structure summary, and quick exercise day move
* collapsible program day groups default to expanded; collapse state is session-only in component memory with zero localStorage/sessionStorage persistence
* day toggle controls enforce accessibility via `aria-expanded`, deterministic `aria-controls`, visible `Daralt`/`Göster` text, and min-h-[44px] mobile touch targets
* compact program structure summary displays validated counts only (`program günü`, `egzersiz`, `atanmamış`) with zero progress scores, completion percentages, or gamification
* quick exercise day move (`Güne Taşı`) uses explicit select + Taşı interaction with canonical API day ordering and min-h-[44px] touch targets
* quick move mutations execute via canonical PATCH `/api/trainer/program-exercises/{exerciseId}` with strict single-field payload `{ program_day_id }`
* same-day moves are guarded with no-op checks, bypassing redundant API requests
* moves trigger canonical `fetchExercises()` refetch; strictly zero local optimistic array splicing as source of truth
* per-exercise busy state isolates mutation loading per row without locking the global editor
* zero client-side sorting, zero drag/drop libraries, zero backend/schema modifications

## F.30A Measurement Progress Summary Read Model, Canonical & Consistency Corrective
* trainer-facing deterministic read model provides measurement progress comparison (`GET /api/trainer/members/{memberId}/measurement-progress`)
* dedicated controller `TrainerMeasurementProgressController.php` with `index(int $memberId)` handler
* RBAC strictly restricted to `trainer` role with session `admin_id -> trainers.admin_id` resolution
* strict member ownership check: member must belong to trainer (`members.trainer_id = ? AND members.deleted_at IS NULL`), failing with 404 if unassigned or deleted
* query parameters strictly rejected with 422 `VALIDATION_ERROR` for deterministic endpoint contract
* bounded query architecture: replaces full-table history fetchAll() with bounded reads — `COUNT(*)` for count, Query A (`ORDER BY measured_at DESC, id DESC LIMIT 2`) for latest two, and Query B (`ORDER BY measured_at ASC, id ASC LIMIT 1`) for first
* canonical response contract only: `{ measurement_count, first, previous, latest, comparisons: { from_previous, from_first } }`
* all redundant aliases and out-of-scope fields strictly removed (`member_id`, `total_measurements`, `baseline`, `diff_*`, `changes_*`, `since_*`, `days_since_*`, `metrics`)
* snapshot exact projection: 10 fields only (`id`, `uuid`, `measured_at`, `weight_kg`, `body_fat_percent`, `chest_cm`, `waist_cm`, `hip_cm`, `arm_cm`, `thigh_cm`); `member_id`, `trainer_id`, `notes`, `created_at`, `updated_at`, `deleted_at` omitted from projection
* single-measurement contract: when measurement_count is 1, first === latest, previous is null, from_previous is null, and from_first is the factual zero-delta object derived via `calculateDeltas(latest, first)` (zero for numbers, null for null metrics)
* dev fixture parity: `adminDevFixtures.ts` returns identical zero-delta object for single measurement via `calculateDeltas(snap, snap)`
* fail-closed frontend runtime validator: `isTrainerMeasurementProgressReadModel` mathematically validates that every delta matches `Math.round((latest - reference) * 100) / 100`, rejecting tampered deltas, null tampers, missing or extra keys, non-canonical datetime formats, and invalid UUIDs
* exact key enforcement: top-level (5 keys), comparisons (2 keys), snapshots (10 keys), deltas (7 keys) fail closed on any unexpected extra key
* zero medical or coaching interpretation: strictly zero BMI, ideal weight, healthy range, obesity classification, health/fitness scores, or risk predictions
* read-only foundation with zero mutations; zero schema changes, zero new database tables or columns
* dev fixture RBAC parity: `adminDevFixtures.ts` strictly enforces `currentDevRole === 'trainer'` for `/api/trainer/members/{id}/measurement-progress` (blocking `admin`, `super_admin`, `reception`, and all non-trainer roles with 403 `FORBIDDEN`), matching production `AuthMiddleware::hasRole(['trainer'])` contract

## F.30B Trainer Measurement Progress Comparison UI
* F30A canonical endpoint reused: consumes `GET /api/trainer/members/${memberId}/measurement-progress` with zero query params
* independent summary component/fetch boundary: `TrainerMeasurementProgressSummary` manages its own loading, error, and retry lifecycle without coupling to or blocking the measurement list/detail workspace
* server deltas authoritative: UI directly presents `comparisons.from_previous` and `comparisons.from_first` without client arithmetic (`latest - previous` or `latest - first` forbidden)
* previous/first comparison modes: two explicit mode buttons (`Önceki Ölçüme Göre` and `İlk Ölçüme Göre`, default previous) backed by local component state only (no localStorage, sessionStorage, or URL query params)
* factual values only: prominent current value, muted reference value (`Önceki: ...` or `İlk: ...`), and signed delta (`+1.5 kg`, `-2.0 cm`, `0 kg`, or `—` when null)
* neutral delta presentation: zero semantic green/red coloring based on sign; strictly neutral styling across all seven metrics
* zero medical interpretation: strictly no BMI, ideal weight, target weight, healthy range, body composition/fitness scores, or progress judgments (iyi/kötü/başarılı)
* zero chart: no charting library, SVG graphs, or trend lines added
* refresh after measurement mutations: parent `TrainerMemberProgressPage` increments `progressSummaryRefreshKey` on successful measurement create, edit, archive, and restore; row selection does not trigger refetch
* trainer surface integration corrective: `TrainerMeasurementProgressSummary` rendered canonically in `/admin/my-members/:memberId/progress` (`TrainerMemberProgressPage`) under `activeTab === 'measurements'`; all F30B additions removed from `AdminMemberProgressPage` to align with the trainer-only endpoint authorization contract
* component location: moved to `src/admin/pages/trainer-member-progress/TrainerMeasurementProgressSummary.tsx`
* no backend/schema change: purely frontend additive UI component preserving all existing CRUD semantics

## F.30C Member Measurement Progress v2
* member-authenticated canonical progress endpoint: `GET /api/member/measurement-progress` with zero query params and zero path params
* member auth authority: identity bound strictly from authenticated session (`$this->guard()`, `$this->memberId`), strictly rejecting `member_id`, `trainer_id`, or `account_id` request input
* bounded query architecture: replaces full-history fetch with bounded SQL reads — `COUNT(*)` for total measurements, `ORDER BY measured_at DESC, id DESC LIMIT 2` for latest two, and `ORDER BY measured_at ASC, id ASC LIMIT 1` for first
* canonical response contract: `{ measurement_count, first, previous, latest, comparisons: { from_previous, from_first } }`
* strict fail-closed runtime validator: `validateMeasurementProgress` validates mathematical accuracy of every delta, rejecting tampered numbers, leaked fields, extra keys, and invalid date formats
* member UI surface `/uye/gelisim`: removed client-side delta subtraction (`current - previous`) while preserving existing `MeasurementTrendChart` and full measurement history list
* factual neutral comparison panel: presents server-authoritative deltas across seven metrics with mode toggle (`Önceki Ölçüme Göre` / `İlk Ölçüme Göre`, default previous) in component memory
* zero medical/coaching interpretation: strictly zero BMI, ideal weight, target weight, healthy range, scores, or green/red value judgments

## F.31A Salon Operations Attention Read Model
* salon operations attention read model: dedicated canonical endpoint `GET /api/admin/operations/attention` for salon administrative situational awareness
* dedicated controller: `AdminOperationsAttentionController.php` with `index()` handler; read-only foundation with zero mutations, transactions, or audit writes
* strict RBAC: restricted exclusively to `super_admin` and `admin` via `AuthMiddleware::hasRole(['super_admin', 'admin'])`; non-admin roles (editor, trainer, reception) denied
* strict zero query parameters: any query parameter in `$_GET` rejected with 422 `VALIDATION_ERROR`
* authoritative time zone: `Europe/Istanbul` via PHP `DateTimeZone` and `DateTimeImmutable` (`now`, `today_start`, `tomorrow_start`); zero SQL `NOW()`, `CURRENT_TIMESTAMP`, or `CURDATE()` to prevent PHP/DB timezone drift
* insight A (appointments backlog & lifecycle):
  * evaluates appointments where `status = 'scheduled' AND starts_at < tomorrow_start`
  * backlog attention: `ends_at <= now` counted in `needs_terminalization_count` (including unresolved historical backlog); `oldest_needs_terminalization_ends_at` formatted as `YYYY-MM-DD HH:mm:ss` (null when count is 0)
  * today lifecycle breakdown: `scheduled_future` (`starts_at > now`), `scheduled_in_progress` (`starts_at <= now AND ends_at > now`), `needs_terminalization` (`ends_at <= now`)
  * boundary semantics: `ends_at === now` counted as `needs_terminalization`; `starts_at === now AND ends_at > now` counted as `in_progress`
* insight B (open member visits & rollover):
  * evaluates open visits where `checked_out_at IS NULL`
  * `current`: count of all active open visits (matching operational occupancy semantics)
  * `carried_over`: visits where `checked_in_at < today_start` (started before today's Istanbul calendar date)
  * `opened_today`: visits where `checked_in_at >= today_start AND checked_in_at < tomorrow_start`
  * `future_dated`: visits where `checked_in_at >= tomorrow_start` (data anomaly detection count)
  * `oldest_checked_in_at`: earliest check-in timestamp (`YYYY-MM-DD HH:mm:ss`, null when current is 0)
  * relational invariant: `current === carried_over + opened_today + future_dated`
* fixed aggregate query architecture: 2 bounded SQL aggregate queries with `SUM(CASE...)`, `MIN(CASE...)`, `COUNT(*)`; zero `fetchAll()` or full-row hydration loops
* zero privacy leak: strictly zero member or trainer identity fields (`id`, `uuid`, `name`, `phone`, `email`) exposed
* zero scoring / heuristics / finance / workflows: strictly zero efficiency/occupancy/staff scores, no threshold heuristics (e.g. "open > 3h = stale"), zero revenue/payment fields, and zero check-in/terminalization mutation actions
* strict TypeScript contract & validator: `src/admin/pages/operations-attention/types.ts` exports `OperationsAttentionResponse` and `validateOperationsAttention` with fail-closed schema, type, regex datetime, and relational invariant enforcement
* dev fixture parity: `src/admin/api/adminDevFixtures.ts` provides matching mock response and role guard (`currentDevRole !== 'super_admin' && currentDevRole !== 'admin'`)
* native PDO prepared statement compatibility: repository strictly enforces `PDO::ATTR_EMULATE_PREPARES => false`; every named placeholder in queries (`:today_start1`, `:today_start2`, `:tomorrow_start1`, `:tomorrow_start2`) is uniquely declared and 1:1 bound to prevent HY093 duplicate parameter number runtime errors under native MySQL prepares













