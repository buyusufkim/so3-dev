# SO3 PT — Production Readiness & Deployment Checklist

**Tarih**: 11 Ekim 2026  
**Faz**: F.35A Production Readiness Foundation  
**Repo**: `buyusufkim/so3-dev`  
**Referans Doküman**: `DEPLOYMENT_PHP_MYSQL.md`

Bu doküman, SO3 PT platformunun canlı yayına (Production) alınması öncesinde gereken altyapı, dağıtım, güvenlik, rol yetkilendirme, geriye alma (rollback) ve runtime smoke test standartlarını belirler.

---

## 1. Hosting ve Çalışma Ortamı Mimarisi

| Parametre | Gereksinim / Doğrulanan Durum | Açıklama |
| :--- | :--- | :--- |
| **Hosting Türü** | Shared Hosting / Plesk / cPanel | Apache HTTP Server + PHP-FPM / FastCGI |
| **PHP Sürümü** | PHP 8.1+ (Önerilen: PHP 8.2+) | `pdo_mysql`, `mbstring`, `json`, `openssl`, `session` eklentileri zorunludur. |
| **Veritabanı** | MySQL 8.0+ veya MariaDB 10.5+ | InnoDB motoru, `utf8mb4_unicode_ci` karakter seti |
| **Web Server** | Apache (mod_rewrite etkin) | `.htaccess` tabanlı URL yönlendirmeleri ve güvenlik kalkanı |
| **Document Root** | `public/` veya `httpdocs/` | `index.html` (dist çıktısı) ve `api/` klasörü **kardeş dizin** (siblings) olmalıdır. |
| **Uploads Dizini** | `document-root/uploads` | İzinler `0755` veya `0775` (kesinlikle `0777` yapılmamalıdır). `uploads/.htaccess` korunmalıdır. |
| **SSL / HTTPS** | Zorunlu (Let's Encrypt / Comodo vb.) | Çerez güvenliği (`Secure`, `HttpOnly`, `SameSite=Strict`) HTTPS gerektirir. |

---

## 2. Dizin Yapısı ve URL Rewrite Kuralları

Sunucuya yüklenen nihai document-root yapısı:

```text
document-root/
├── index.html                 # Vite SPA derleme çıktısı
├── assets/                    # CSS, JS ve optimize font/vektör derlemeleri
├── sitemap.xml -> (rewrite)   # api/seo-sitemap.php üzerinden dinamik üretim
├── etkinlikler/:slug          # api/seo-event.php üzerinden dinamik SEO enjeksiyonu
├── api/
│   ├── .htaccess              # Tüm API isteklerini api/index.php'ye yönlendirir
│   ├── index.php              # Merkezi API yönlendirici (Router)
│   ├── config/
│   │   ├── .htaccess          # 'Require all denied' ile dış erişime tamamen kapalı
│   │   ├── config.example.php # Şablon
│   │   └── config.local.php   # Gerçek ortam gizli ayarları (canlı ortamda oluşturulur)
│   ├── controllers/
│   ├── middleware/
│   └── core/
├── uploads/                   # Medya ve yükleme dosyaları (PHP çalıştırma yasaklı)
└── .htaccess                  # Kök yönlendirme ve güvenlik kalkanı
```

### Kök `.htaccess` Güvenlik Kalkanı
Kök `.htaccess` dosyası şu korumaları garanti eder:
- `.git`, `.env`, `config.local.php`, `package.json`, `*.sql`, `scripts/` yollarına doğrudan web erişimi engellenir (`403 Forbidden`).
- `/api/` istekleri doğrudan PHP'ye aktarılır.
- `/uploads/` istekleri doğrudan statik dosyaya aktarılır.
- Diğer tüm eşleşmeyen rotalar SPA fallback olarak `index.html`'e yönlendirilir.

---

## 3. Environment ve Yapılandırma (`config.local.php`)

Canlı sunucuda asla örnek konfigürasyon veya varsayılan anahtarlar kullanılmaz.

1. `api/config/config.example.php` dosyası `api/config/config.local.php` olarak kopyalanır.
2. Dosya içerisine yalnızca üretim veritabanı bilgileri tanımlanır:
   ```php
   <?php
   return [
       'db_host' => 'localhost',
       'db_name' => 'so3_production_db',
       'db_user' => 'so3_runtime_user',
       'db_pass' => 'GUCLU_RASTGELE_SIFRE',
       'app_env' => 'production',
       'app_url' => 'https://so3pt.com.tr'
   ];
   ```
3. Alternatif olarak, sunucu panelinde `SO3_CONFIG_PATH` ortam değişkeni tanımlanarak konfigürasyon dosyası document root dışına taşınabilir (tercih edilen yöntem).
4. Veritabanı kullanıcısı **Least Privilege** ilkesine göre yetkilendirilir (Yalnızca `SELECT`, `INSERT`, `UPDATE`, `DELETE`; `DROP`, `GRANT`, `SUPER` verilmez).

---

## 4. Veritabanı Kurulum ve Güncelleme Prosedürü

### Durum A: Sıfır (Boş) Veritabanı Kurulumu
1. Boş veritabanına `database/fresh-install.sql` dosyası phpMyAdmin veya MySQL CLI ile aktarılır.
2. `fresh-install.sql`, 001 ile 044 arasındaki tüm migration'ları kanonik olarak içerir ve `schema_migrations` tablosuna işler.
3. İlk yönetici hesabı SSH erişimi varsa `php bin/create-admin.php` ile, yoksa güvenli parola hash'i üretilerek manuel eklenir.

### Durum B: Mevcut Canlı Veritabanı Güncellemesi (İnkremental)
1. Canlı veritabanına **asla** `fresh-install.sql` aktarılmaz.
2. Güncellemeler için `database/migrations/` klasörü yetkili kaynaktır.
3. SSH üzerinden `php bin/migrate.php` çalıştırılarak yeni migration'lar sırayla uygulanır.
4. MySQL DDL işlemleri (`CREATE TABLE`, `ALTER TABLE`) örtük commit yaptığı için güncelleme öncesi mutlaka tam yedek (dump) alınır.

---

## 5. Rol ve Yetkilendirme Matrisi (F.35B Hazırlık)

Sistemdeki roller ve erişim sözleşmesi:

| Rol | Yetkili Dashboard / UI Rotaları | İzinli API Alanları | Yasaklı Alanlar / Kısıtlamalar |
| :--- | :--- | :--- | :--- |
| **super_admin** | Tüm `/admin/*` rotaları, personel hesap yönetimi, ayarlar, sistem logları | Tüm `/api/admin/*`, `/api/trainer/*`, `/api/reception/*` | Üye özel token'ı olmadan üye session alanlarına müdahale edemez. |
| **admin** | `/admin/*` (Personel yönetimi ve sistem kritik ayarları hariç) | Etkinlik, branş, antrenör, üye, paket, randevu, analitik yönetimi | Diğer admin/reception hesaplarını oluşturamaz/silemez (`super_admin` yetkisindedir). |
| **editor** | `/admin/events`, `/admin/media`, `/admin/branches`, `/admin/homepage` | CMS içerik düzenleme (`/api/events`, `/api/media`, `/api/branches`, `/api/homepage`) | Üye kayıtları, finans/paket işlemleri, randevular, analitikler, hesaplar. |
| **trainer** | `/trainer/*` (Mobil öncelikli günlük ajanda, randevular, programlar, ölçümler) | `/api/trainer/*` (Kendi aktif profiline bağlı randevu, program ve ölçüm okuma/yazma) | Admin paneli, genel üye listesi, reception işlemleri, diğer antrenörlerin kayıtları. |
| **reception** | `/admin/reception` (Hızlı üye arama, check-in, check-out, yenileme) | `/api/reception/*` (Check-in/out, anlık doluluk, renewal-watch) | Admin ayarları, antrenman programları, antrenör takvimleri, personel hesapları. |
| **member** | `/uye/*` (Dashboard, Programım, Gelişimim, Randevu Al, Topluluk, Hesabım) | `/api/member/*` (Yalnızca kendi randevuları, paketleri, programları, profil GET/PATCH) | Admin/personel portalları, başka üyelerin verileri, üye ana telefon/kimlik değiştirme. |
| **unauthenticated** | Public web sitesi (`/`, `/etkinlikler`, `/branslar`, `/egitmenler`, `/iletisim`, `/topluluk`) | `/api/events`, `/api/branches`, `/api/site-settings`, `/api/member-auth/csrf`, `/api/auth/csrf` | Tüm korumalı `/api/admin/*`, `/api/trainer/*`, `/api/reception/*`, `/api/member/*` (401 döner). |

---

## 6. Kritik İş Akışları ve Negatif Güvenlik Test Senaryoları (F.35B Matrisi)

Staging ortamında doğrulanacak kritik akışlar:
1. **Admin / Personel Giriş & Oturum**: Argon2id parola doğrulaması, session ID rotasyonu, `SameSite=Strict`, `HttpOnly`, `Secure` çerezler.
2. **Üye Girişi & Zorunlu Parola Değişimi**: İlk girişte `must_change_password=1` olan üyenin diğer sayfalara erişiminin 403 `PASSWORD_CHANGE_REQUIRED` ile engellenmesi.
3. **Üye Randevu Alma & İptal**: Paket bakiyesinden kota düşümü, seans defteri (ledger) hareketi, iptal bildirimleri, aktör atfı.
4. **Üye Hesabım (F.34C)**: E-posta ve acil durum kişisi güncelleme, ad/soyad ve ana telefon alanlarının kilitli kalması, CSRF ve exact-keys koruması.
5. **Antrenör Mobil Çalışma Alanı**: Günlük ajanda takibi, randevu tamamlama / no-show işaretleme.
6. **Resepsiyon Operasyonları**: Hızlı check-in, check-out, anlık kulüp doluluğu.
7. **Negatif Güvenlik**:
   - Yetkisiz `/api/admin/*` ve `/api/member/*` çağrıları -> `401 UNAUTHORIZED`.
   - Rol dışı endpoint erişimi -> `403 FORBIDDEN`.
   - Geçersiz/eksik CSRF token ile POST/PATCH/DELETE -> `403 FORBIDDEN`.
   - Desteklenmeyen HTTP metotları -> `405 METHOD_NOT_ALLOWED`.
   - Beklenmeyen query parametreleri -> `422 VALIDATION_ERROR`.
   - Soft-deleted kayıtların çağrılması -> `404 NOT_FOUND`.

---

## 7. Dağıtım (Deployment) Sıralaması ve Kontrol Kapıları

1. **Ön Kontrol Kapısı (Pre-Deployment Gates)**:
   - Yerel ortamda `npm run lint` ve `npm run build` hatasız tamamlanmalı.
   - Tüm statik bütünlük testleri (`npm run verify:fresh-install-parity`, `npm run verify:member-profile-self-service` vb.) `PASS` olmalı.
2. **Yedekleme (Backup)**:
   - Canlı veritabanının tam SQL yedeği alınmalı ve doğrulanmalı.
   - Mevcut document-root dosyaları sıkıştırılarak arşivlenmeli (`backup_YYYYMMDD.tar.gz`).
3. **Veritabanı Güncellemesi**:
   - `php bin/migrate.php` çalıştırılarak yeni migration'lar uygulanmalı.
4. **Dosya Güncellemesi**:
   - Derlenmiş `dist/` dosyaları ve `api/` dizini sunucuya yüklenmeli.
   - `api/config/config.local.php` ve `uploads/` dizini korunmalı.
5. **Staging Smoke Testi**:
   - `SO3_RUNTIME_BASE_URL="https://staging.so3pt.com.tr" npm run verify:deployment-runtime` çalıştırılmalı.

---

## 8. Geriye Alma (Rollback) Planı

Olası bir dağıtım arızasında:
1. **Kod Geri Alma**: Önceki kararlı sürümün `dist/` ve `api/` dosyaları arşiven geri yüklenir.
2. **Veritabanı Geri Alma**: MySQL DDL işlemleri geri alınamadığından, dağıtım öncesi alınan veritabanı yedeği geri yüklenir (`mysql -u root -p so3_db < pre_deploy_backup.sql`).
3. **Önbellek Temizleme**: Tarayıcı ve CDN / Cloudflare önbelleği temizlenir.

---

## 9. Bilinen Kısıtlar ve Blocker Durumları

| Başlık | Durum | Açıklama / Etki |
| :--- | :--- | :--- |
| **Staging Sunucusu (F23B)** | **BLOCKED** | Henüz harici bir staging sunucusu tahsis edilmemiştir. Gerçek HTTP/browser testleri yapılamaz. |
| **Staging Test Hesapları** | **BLOCKED** | Staging ortamı olmadığı için test admin, trainer, reception ve member hesapları oluşturulmamıştır. |
| **Staging Veritabanı** | **BLOCKED** | Canlı sistemden izole MySQL staging örneği bulunmamaktadır. |
| **F.34C Üye Değişiklikleri Audit Logu** | **DEĞERLENDİRME** | F.34C kapsamında üyenin kendi profilinde yaptığı e-posta ve acil durum iletişim değişiklikleri, mevcut `audit_logs` tablosu zorunlu `admin_id` FK içerdiği için loglanmamaktadır. Şema bütünlüğü ve migration dondurması nedeniyle yeni tablo eklenmemiştir. Bu durumun canlı yayın öncesi kabulü F.35C aşamasında netleştirilecektir. |

---

## 10. Canlı Yayına Hazırlık Değerlendirmesi

- Statik Kod ve Mimari Hazırlığı: **TAMAMLANDI (PASS)**
- Canlı / Staging Ortam Doğrulaması: **BEKLEMEDE (BLOCKED - Staging URL ve Altyapı Bekleniyor)**
