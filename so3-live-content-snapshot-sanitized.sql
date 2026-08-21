-- SO3 PT SANITIZED DEVELOPMENT SNAPSHOT
-- Source: production content export, 2026-08-21
-- SAFE FOR AI STUDIO / LOCAL DEVELOPMENT ONLY
-- Production admin credentials, login attempts, audit records and IP data are excluded.
-- The inactive placeholder admin exists only to preserve foreign-key references.
-- It has no usable password and cannot be used to sign in.

-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Anamakine: localhost:3306
-- Üretim Zamanı: 21 Ağu 2026, 17:58:28
-- Sunucu sürümü: 8.0.46
-- PHP Sürümü: 8.4.23

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Veritabanı: `so3_development_snapshot`
--

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `admins`
--

CREATE TABLE `admins` (
  `id` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('super_admin','admin','editor') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'editor',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `last_login_at` datetime DEFAULT NULL,
  `last_login_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_changed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inactive non-login placeholder for historical created_by / updated_by references.
INSERT INTO `admins`
(`id`, `username`, `email`, `password_hash`, `display_name`, `role`, `status`, `last_login_at`, `last_login_ip`, `password_changed_at`)
VALUES
(1, 'snapshot-placeholder', 'snapshot.invalid@invalid.local', 'DISABLED_SNAPSHOT_ACCOUNT_NO_LOGIN', 'Snapshot Placeholder', 'editor', 'inactive', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `admin_login_attempts`
--

CREATE TABLE `admin_login_attempts` (
  `id` bigint NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `successful` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL,
  `admin_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `metadata_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `branches`
--

CREATE TABLE `branches` (
  `id` int NOT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(600) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cover_media_id` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `branches`
--

INSERT INTO `branches` (`id`, `uuid`, `slug`, `name`, `description`, `cover_media_id`, `is_active`, `sort_order`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, '93f6b9bc-9988-466d-91b5-6f9ec682c3f8', 'fitness', 'Fitness', 'Güç, kondisyon ve kişisel hedeflere göre şekillenen kişiye özel antrenman süreci.', 5, 1, 10, NULL, 1, '2026-08-20 21:04:59', '2026-08-21 13:17:36', NULL),
(2, '53e20e8d-d779-46dc-a0fc-9418a0a863b1', 'boks', 'Boks', 'Kondisyon, refleks ve güç artırımı odaklı özel boks dersleri.', 4, 1, 20, NULL, 1, '2026-08-20 21:04:59', '2026-08-21 13:23:34', NULL),
(3, 'f7710375-9275-471a-b605-2d6ec22e0329', 'pilates', 'Pilates', 'Reformer pilates ile esneklik, merkez bölge gücü ve postür gelişimi.', 6, 1, 30, NULL, NULL, '2026-08-20 21:04:59', '2026-08-21 01:30:32', NULL),
(4, 'c44238e8-356a-4661-8404-5853f0907e15', 'yoga', 'Yoga', 'Beden ve zihin bütünlüğü, esneklik ve denge odaklı pratikler.', 21, 1, 40, NULL, NULL, '2026-08-20 21:04:59', '2026-08-21 01:30:32', NULL);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `branch_media`
--

CREATE TABLE `branch_media` (
  `id` int NOT NULL,
  `branch_id` int NOT NULL,
  `media_id` int NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `branch_media`
--

INSERT INTO `branch_media` (`id`, `branch_id`, `media_id`, `sort_order`, `created_at`) VALUES
(9, 3, 6, 10, '2026-08-21 01:30:32'),
(10, 4, 7, 20, '2026-08-21 01:30:32'),
(11, 4, 8, 30, '2026-08-21 01:30:32'),
(12, 4, 9, 40, '2026-08-21 01:30:32'),
(13, 4, 21, 10, '2026-08-21 01:30:32'),
(37, 1, 5, 10, '2026-08-21 13:17:36'),
(38, 1, 18, 20, '2026-08-21 13:17:36'),
(39, 1, 89, 30, '2026-08-21 13:17:36'),
(40, 1, 88, 40, '2026-08-21 13:17:36'),
(41, 1, 91, 50, '2026-08-21 13:17:36'),
(42, 1, 93, 60, '2026-08-21 13:17:36'),
(43, 1, 92, 70, '2026-08-21 13:17:36'),
(44, 1, 81, 80, '2026-08-21 13:17:36'),
(45, 1, 80, 90, '2026-08-21 13:17:36'),
(46, 1, 83, 100, '2026-08-21 13:17:36'),
(47, 1, 82, 110, '2026-08-21 13:17:36'),
(48, 1, 79, 120, '2026-08-21 13:17:36'),
(49, 1, 86, 130, '2026-08-21 13:17:36'),
(50, 1, 84, 140, '2026-08-21 13:17:36'),
(51, 1, 68, 150, '2026-08-21 13:17:36'),
(52, 1, 85, 160, '2026-08-21 13:17:36'),
(58, 2, 4, 10, '2026-08-21 13:23:34'),
(59, 2, 17, 20, '2026-08-21 13:23:34'),
(60, 2, 96, 30, '2026-08-21 13:23:34'),
(61, 2, 2, 40, '2026-08-21 13:23:34'),
(62, 2, 3, 50, '2026-08-21 13:23:34'),
(63, 2, 98, 60, '2026-08-21 13:23:34'),
(64, 2, 99, 70, '2026-08-21 13:23:34'),
(65, 2, 100, 80, '2026-08-21 13:23:34'),
(66, 2, 101, 90, '2026-08-21 13:23:34'),
(67, 2, 102, 100, '2026-08-21 13:23:34'),
(68, 2, 103, 110, '2026-08-21 13:23:34');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `events`
--

CREATE TABLE `events` (
  `id` int NOT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` int NOT NULL,
  `excerpt` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `event_date` datetime DEFAULT NULL,
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_media_id` int DEFAULT NULL,
  `status` enum('draft','published','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `featured_on_home` tinyint(1) NOT NULL DEFAULT '0',
  `featured_order` int DEFAULT NULL,
  `seo_title` varchar(70) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `seo_description` varchar(170) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `events`
--

INSERT INTO `events` (`id`, `uuid`, `title`, `slug`, `category_id`, `excerpt`, `content`, `event_date`, `location`, `cover_media_id`, `status`, `featured_on_home`, `featured_order`, `seo_title`, `seo_description`, `published_at`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, '02710000-0000-4000-8000-000000000001', 'Gomeda Vadisi Yürüyüşü', 'gomeda-vadisi-yuruyusu', 1, 'SO3 topluluğunun Gomeda Vadisi yürüyüşünden seçili anlar.', '', NULL, '', 22, 'published', 1, 10, 'Gomeda Vadisi Yürüyüşü | SO3 PT', 'SO3 topluluğunun Gomeda Vadisi yürüyüşünden seçili anlar.', '2026-08-21 01:30:32', NULL, 1, '2026-08-21 01:30:32', '2026-08-21 02:18:25', NULL),
(2, '02710000-0000-4000-8000-000000000002', 'Kano Etkinliği', 'kano-etkinligi', 3, 'SO3 topluluğunun kano etkinliğinden seçili anlar.', '', NULL, '', 30, 'published', 1, 20, 'Kano Etkinliği | SO3 PT', 'SO3 topluluğunun kano etkinliğinden seçili anlar.', '2026-08-21 01:30:32', NULL, 1, '2026-08-21 01:30:32', '2026-08-21 02:19:00', NULL),
(3, '02710000-0000-4000-8000-000000000003', 'Voleybol Etkinliği', 'voleybol-etkinligi', 2, 'SO3 topluluğunun voleybol etkinliğinden seçili anlar.', '', NULL, '', 59, 'published', 1, 30, 'Voleybol Etkinliği | SO3 PT', 'SO3 topluluğunun voleybol etkinliğinden seçili anlar.', '2026-08-21 01:30:32', NULL, 1, '2026-08-21 01:30:32', '2026-08-21 02:19:15', NULL),
(4, '02710000-0000-4000-8000-000000000004', 'Mobilite Grup Dersi', 'mobilite-grup-dersi', 4, 'SO3 topluluğunun mobilite grup dersinden seçili anlar.', '', NULL, '', 47, 'published', 0, 40, 'Mobilite Grup Dersi | SO3 PT', 'SO3 topluluğunun mobilite grup dersinden seçili anlar.', '2026-08-21 01:30:32', NULL, 1, '2026-08-21 01:30:32', '2026-08-21 13:28:28', NULL),
(5, '02710000-0000-4000-8000-000000000005', 'Kırlangıç Vadisi Yürüyüşü', 'kirlangic-vadisi-yuruyusu', 1, 'SO3 topluluğunun Kırlangıç Vadisi yürüyüşünden seçili anlar.', NULL, NULL, NULL, 40, 'published', 0, NULL, 'Kırlangıç Vadisi Yürüyüşü | SO3 PT', 'SO3 topluluğunun Kırlangıç Vadisi yürüyüşünden seçili anlar.', '2026-08-21 01:30:32', NULL, NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(6, '02710000-0000-4000-8000-000000000006', 'Plaj Voleybolu', 'plaj-voleybolu', 2, 'SO3 topluluğunun plaj voleybolu etkinliğinden seçili anlar.', '', NULL, '', 54, 'published', 1, NULL, 'Plaj Voleybolu | SO3 PT', 'SO3 topluluğunun plaj voleybolu etkinliğinden seçili anlar.', '2026-08-21 01:30:32', NULL, 1, '2026-08-21 01:30:32', '2026-08-21 13:27:20', NULL),
(7, '1b32253c-5b33-4c43-a3cc-5ecc897cd7ba', 'Halı Saha', 'hali-saha', 2, 'So3 Ekibi Halısahada', '', NULL, '', 104, 'published', 0, NULL, '', '', '2026-08-21 13:26:14', 1, 1, '2026-08-21 13:26:14', '2026-08-21 13:27:39', NULL);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `event_categories`
--

CREATE TABLE `event_categories` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `event_categories`
--

INSERT INTO `event_categories` (`id`, `name`, `slug`, `description`, `status`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 'Doğa Yürüyüşleri', 'doga-yuruyusleri', NULL, 'active', 10, '2026-08-20 21:04:58', '2026-08-20 21:04:58'),
(2, 'Takımlı Oyunlar', 'takimli-oyunlar', NULL, 'active', 20, '2026-08-20 21:04:58', '2026-08-20 21:04:58'),
(3, 'Kano Etkinlikleri', 'kano-etkinlikleri', NULL, 'active', 30, '2026-08-20 21:04:58', '2026-08-20 21:04:58'),
(4, 'Salon Etkinlikleri', 'salon-etkinlikleri', NULL, 'active', 40, '2026-08-20 21:04:58', '2026-08-20 21:04:58');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `event_media`
--

CREATE TABLE `event_media` (
  `id` int NOT NULL,
  `event_id` int NOT NULL,
  `media_id` int NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `caption` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `event_media`
--

INSERT INTO `event_media` (`id`, `event_id`, `media_id`, `sort_order`, `caption`, `created_at`) VALUES
(1, 1, 23, 10, NULL, '2026-08-21 01:30:32'),
(2, 1, 24, 20, NULL, '2026-08-21 01:30:32'),
(3, 1, 25, 30, NULL, '2026-08-21 01:30:32'),
(4, 1, 26, 40, NULL, '2026-08-21 01:30:32'),
(5, 1, 27, 50, NULL, '2026-08-21 01:30:32'),
(6, 1, 28, 60, NULL, '2026-08-21 01:30:32'),
(7, 1, 29, 70, NULL, '2026-08-21 01:30:32'),
(8, 2, 31, 10, NULL, '2026-08-21 01:30:32'),
(9, 2, 32, 20, NULL, '2026-08-21 01:30:32'),
(10, 2, 33, 30, NULL, '2026-08-21 01:30:32'),
(11, 2, 34, 40, NULL, '2026-08-21 01:30:32'),
(12, 2, 35, 50, NULL, '2026-08-21 01:30:32'),
(13, 2, 36, 60, NULL, '2026-08-21 01:30:32'),
(14, 2, 37, 70, NULL, '2026-08-21 01:30:32'),
(15, 2, 38, 80, NULL, '2026-08-21 01:30:32'),
(16, 2, 39, 90, NULL, '2026-08-21 01:30:32'),
(17, 3, 60, 10, NULL, '2026-08-21 01:30:32'),
(18, 3, 61, 20, NULL, '2026-08-21 01:30:32'),
(19, 3, 62, 30, NULL, '2026-08-21 01:30:32'),
(20, 3, 63, 40, NULL, '2026-08-21 01:30:32'),
(21, 3, 64, 50, NULL, '2026-08-21 01:30:32'),
(22, 3, 65, 60, NULL, '2026-08-21 01:30:32'),
(23, 3, 66, 70, NULL, '2026-08-21 01:30:32'),
(24, 4, 48, 10, NULL, '2026-08-21 01:30:32'),
(25, 4, 49, 20, NULL, '2026-08-21 01:30:32'),
(26, 4, 50, 30, NULL, '2026-08-21 01:30:32'),
(27, 4, 51, 40, NULL, '2026-08-21 01:30:32'),
(28, 4, 52, 50, NULL, '2026-08-21 01:30:32'),
(29, 5, 41, 10, NULL, '2026-08-21 01:30:32'),
(30, 5, 42, 20, NULL, '2026-08-21 01:30:32'),
(31, 5, 43, 30, NULL, '2026-08-21 01:30:32'),
(32, 5, 44, 40, NULL, '2026-08-21 01:30:32'),
(33, 5, 45, 50, NULL, '2026-08-21 01:30:32'),
(34, 5, 46, 60, NULL, '2026-08-21 01:30:32'),
(35, 6, 54, 10, NULL, '2026-08-21 01:30:32'),
(36, 6, 55, 20, NULL, '2026-08-21 01:30:32'),
(37, 6, 56, 30, NULL, '2026-08-21 01:30:32'),
(38, 6, 57, 40, NULL, '2026-08-21 01:30:32'),
(39, 6, 58, 50, NULL, '2026-08-21 01:30:32'),
(69, 1, 74, 80, NULL, '2026-08-21 02:40:56'),
(70, 2, 75, 100, NULL, '2026-08-21 02:43:07'),
(71, 2, 76, 110, NULL, '2026-08-21 02:43:09'),
(72, 3, 77, 80, NULL, '2026-08-21 02:43:51'),
(73, 4, 78, 60, NULL, '2026-08-21 02:44:34'),
(74, 7, 105, 0, NULL, '2026-08-21 13:26:14'),
(75, 7, 106, 10, NULL, '2026-08-21 13:26:14'),
(76, 7, 104, 20, NULL, '2026-08-21 13:26:15'),
(77, 7, 107, 30, NULL, '2026-08-21 13:26:15'),
(78, 7, 108, 40, NULL, '2026-08-21 13:26:15'),
(79, 7, 109, 50, NULL, '2026-08-21 13:26:16'),
(80, 7, 110, 60, NULL, '2026-08-21 13:26:16'),
(81, 7, 111, 70, NULL, '2026-08-21 13:26:16'),
(82, 7, 112, 80, NULL, '2026-08-21 13:26:17'),
(83, 7, 113, 90, NULL, '2026-08-21 13:26:17');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `homepage_sections`
--

CREATE TABLE `homepage_sections` (
  `id` int NOT NULL,
  `section_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_json` json NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `homepage_sections`
--

INSERT INTO `homepage_sections` (`id`, `section_id`, `content_json`, `is_active`, `sort_order`, `updated_by`, `updated_at`) VALUES
(1, 'hero', '{\"eyebrow\": \"SO3 / PERSONAL TRAINING\", \"feature_left\": \"Kişiye özel antrenman\", \"support_text\": \"Kalabalığa değil, gelişimine odaklan.\", \"feature_right\": \"Birebir takip\", \"headline_primary\": \"Herkese göre değil.\", \"headline_emphasis\": \"SANA GÖRE.\", \"primary_cta_label\": \"Ön görüşme planla\", \"primary_cta_target\": \"/#iletisim\", \"background_media_id\": 67, \"secondary_cta_label\": \"SO3\'ü keşfet\", \"secondary_cta_target\": \"/#branslar\"}', 1, 10, NULL, '2026-08-21 01:30:32'),
(2, 'brand_band', '{\"items\": [\"Kişisel Diyetisyen ve Beslenme Programı\", \"Supplement Danışmanlığı\", \"Birebir Dersler\", \"Kişiye Özel Program\", \"Özel Etkinlikler\", \"Profesyonel Eğitmenler\"]}', 1, 20, NULL, '2026-08-20 21:04:58'),
(3, 'branches', '{}', 1, 30, NULL, '2026-08-20 21:04:58'),
(4, 'about', '{\"eyebrow\": \"SO3 HAKKINDA\", \"youtube_title\": \"SO3 PT Tanıtım Filmi\", \"headline_primary\": \"Kişiye Özel Bir\", \"youtube_video_id\": \"0ojUK4qD8yE\", \"headline_emphasis\": \"Antrenman Süreci\", \"paragraph_primary\": \"SO3, kişiye özel antrenman yaklaşımını merkeze alan; fitness, boks, pilates ve yoga disiplinlerini kişisel takip ile bir araya getiren bir Personal Training merkezidir. Burada amaç, herkese aynı programı uygulamak değil; hedefe, seviyeye ve gelişime göre şekillenen bir antrenman süreci oluşturmaktır.\", \"paragraph_secondary\": \"SO3 deneyimi yalnızca ders saatinden ibaret değildir. Antrenman süreci düzenli takip, kişiye özel program güncellemeleri ve sosyal etkinliklerle devam eder. Salon içinde başlayan birliktelik, SO3 topluluğuyla salon dışında da sürer.\"}', 1, 40, NULL, '2026-08-20 21:04:58'),
(5, 'why_so3', '{\"intro\": \"SO3\'te antrenman, kişiye göre planlanır ve çalıştığın eğitmenle birlikte takip edilir.\", \"items\": [{\"title\": \"Birebir Takip\", \"description\": \"Antrenman süreci, çalıştığın eğitmenin yönlendirmesi ve takibiyle ilerler.\"}, {\"title\": \"Kişiye Özel Program\", \"description\": \"Program; hedefin, seviyen ve gelişimin doğrultusunda kişiye özel olarak planlanır.\"}, {\"title\": \"Süreç Takibi\", \"description\": \"Antrenman süreci, ilerlemenin değerlendirilmesi ve ihtiyaçların doğrultusunda takip edilir.\"}, {\"title\": \"Gelişime Göre Güncel\", \"description\": \"Program, gelişimine göre değerlendirilir ve gerektiğinde güncellenir.\"}], \"eyebrow\": \"NEDEN SO3\", \"headline_primary\": \"Tek tip program yok.\", \"headline_emphasis\": \"Sana göre bir sistem var.\"}', 1, 50, NULL, '2026-08-20 21:04:58'),
(6, 'process', '{\"steps\": [{\"title\": \"Seni tanırız.\"}, {\"title\": \"Sana göre planlarız.\"}, {\"title\": \"Birlikte çalışırız.\"}, {\"title\": \"Sen geliştikçe süreci güncelleriz.\"}], \"eyebrow\": \"NASIL ÇALIŞIR?\", \"headline_primary\": \"\", \"headline_emphasis\": \"\"}', 1, 60, NULL, '2026-08-20 21:04:58'),
(7, 'trainers', '{}', 1, 70, NULL, '2026-08-20 21:04:58'),
(8, 'performance', '{\"background_media_id\": 68}', 1, 80, NULL, '2026-08-21 01:30:32'),
(9, 'community', '{}', 1, 90, NULL, '2026-08-20 21:04:58'),
(10, 'instagram', '{\"intro\": \"Güncel motivasyon, antrenman kesitleri ve SO3 topluluğundan anlar için Instagram\'da bize katılın.\", \"reels\": [\"https://www.instagram.com/reel/DblY065tNEt/\", \"https://www.instagram.com/reel/DbdSs_dNg8r/\", \"https://www.instagram.com/reel/DahdLQgsdvr/\", \"https://www.instagram.com/reel/DZxX03itk2o/\", \"https://www.instagram.com/reel/DZsJRYzt32i/\", \"https://www.instagram.com/reel/DZnJvg1NWZK/\"], \"eyebrow\": \"SO3 / REELS\", \"headline\": \"SO3\'ü takip et.\", \"cta_label\": \"Instagram\'da Takip Et\", \"placeholder_text\": \"En güncel Reels videolarımızı Instagram hesabımız üzerinden hemen izleyebilirsiniz.\"}', 1, 100, 1, '2026-08-21 13:31:31'),
(11, 'tour', '{}', 1, 110, NULL, '2026-08-20 21:04:58'),
(12, 'contact', '{}', 1, 120, NULL, '2026-08-20 21:04:58');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `media_assets`
--

CREATE TABLE `media_assets` (
  `id` int NOT NULL,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thumbnail_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `extension` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint UNSIGNED NOT NULL,
  `width` int UNSIGNED DEFAULT NULL,
  `height` int UNSIGNED DEFAULT NULL,
  `media_type` enum('image','video') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alt_text` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `caption` text COLLATE utf8mb4_unicode_ci,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','archived','deleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `uploaded_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `media_assets`
--

INSERT INTO `media_assets` (`id`, `uuid`, `original_name`, `storage_name`, `storage_path`, `thumbnail_path`, `mime_type`, `extension`, `file_size`, `width`, `height`, `media_type`, `title`, `alt_text`, `caption`, `checksum`, `status`, `uploaded_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'd857b55341665028c7dd9bae1bbc8625', 'Dois Dizgi Tasarım.png', '827718402b0e62e37c725e178a2107f9.webp', 'uploads/images/2026/08/827718402b0e62e37c725e178a2107f9.webp', 'uploads/thumbnails/2026/08/827718402b0e62e37c725e178a2107f9.webp', 'image/webp', 'webp', 127424, 2000, 2000, 'image', NULL, NULL, NULL, '2238bd8a9ad7b86e9dabd0d124828cf31f74e9f4448a9c49da075660edf59dff', 'deleted', 1, '2026-08-20 22:15:34', '2026-08-21 00:53:27', '2026-08-21 00:53:27'),
(2, '02700000-0000-4000-8000-000000000001', 'branch-boxing-01.webp', 'so3-demo-branch-boxing-01.webp', 'media/so3/branch-boxing-01.webp', NULL, 'image/webp', 'webp', 254196, 1350, 2400, 'image', 'SO3 Boks Teknik', 'SO3 boks teknik çalışması', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(3, '02700000-0000-4000-8000-000000000002', 'branch-boxing-02.webp', 'so3-demo-branch-boxing-02.webp', 'media/so3/branch-boxing-02.webp', NULL, 'image/webp', 'webp', 176776, 1350, 2400, 'image', 'SO3 Boks Kondisyon', 'SO3 boks kondisyon çalışması', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(4, '02700000-0000-4000-8000-000000000003', 'branch-boxing.webp', 'so3-demo-branch-boxing.webp', 'media/so3/branch-boxing.webp', NULL, 'image/webp', 'webp', 263112, 2400, 1351, 'image', 'SO3 Boks', 'SO3 boks alanı', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(5, '02700000-0000-4000-8000-000000000004', 'branch-fitness.webp', 'so3-demo-branch-fitness.webp', 'media/so3/branch-fitness.webp', NULL, 'image/webp', 'webp', 364338, 2400, 1351, 'image', 'SO3 Fitness', 'SO3 fitness alanı', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(6, '02700000-0000-4000-8000-000000000005', 'branch-pilates-01.webp', 'so3-demo-branch-pilates-01.webp', 'media/so3/branch-pilates-01.webp', NULL, 'image/webp', 'webp', 228870, 2400, 1351, 'image', 'SO3 Pilates', 'SO3 pilates alanı', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(7, '02700000-0000-4000-8000-000000000006', 'branch-yoga-01.webp', 'so3-demo-branch-yoga-01.webp', 'media/so3/branch-yoga-01.webp', NULL, 'image/webp', 'webp', 104974, 1350, 2400, 'image', 'SO3 Yoga Detay 1', 'SO3 yoga çalışması', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(8, '02700000-0000-4000-8000-000000000007', 'branch-yoga-02.webp', 'so3-demo-branch-yoga-02.webp', 'media/so3/branch-yoga-02.webp', NULL, 'image/webp', 'webp', 103614, 1350, 2400, 'image', 'SO3 Yoga Detay 2', 'SO3 yoga çalışması', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(9, '02700000-0000-4000-8000-000000000008', 'branch-yoga-03.webp', 'so3-demo-branch-yoga-03.webp', 'media/so3/branch-yoga-03.webp', NULL, 'image/webp', 'webp', 116620, 1350, 2400, 'image', 'SO3 Yoga Detay 3', 'SO3 yoga çalışması', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(10, '02700000-0000-4000-8000-000000000009', 'branch-yoga-pilates.webp', 'so3-demo-branch-yoga-pilates.webp', 'media/so3/branch-yoga-pilates.webp', NULL, 'image/webp', 'webp', 228870, 2400, 1351, 'image', 'SO3 Yoga ve Pilates', 'SO3 yoga ve pilates alanı', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(11, '02700000-0000-4000-8000-000000000010', 'community-group-training.webp', 'so3-demo-community-group-training.webp', 'media/so3/community-group-training.webp', NULL, 'image/webp', 'webp', 165324, 1350, 2400, 'image', 'SO3 Grup Antrenmanı', 'SO3 topluluğu grup antrenmanı', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(12, '02700000-0000-4000-8000-000000000011', 'community-hali-saha-alt.webp', 'so3-demo-community-hali-saha-alt.webp', 'media/so3/community-hali-saha-alt.webp', NULL, 'image/webp', 'webp', 95812, 1080, 1350, 'image', 'SO3 Halı Saha Alternatif', 'SO3 topluluğu halı saha etkinliği', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(13, '02700000-0000-4000-8000-000000000012', 'community-hali-saha.webp', 'so3-demo-community-hali-saha.webp', 'media/so3/community-hali-saha.webp', NULL, 'image/webp', 'webp', 140094, 1080, 1350, 'image', 'SO3 Halı Saha', 'SO3 topluluğu halı saha etkinliği', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(14, '02700000-0000-4000-8000-000000000013', 'community-kano.webp', 'so3-demo-community-kano.webp', 'media/so3/community-kano.webp', NULL, 'image/webp', 'webp', 378556, 1350, 2400, 'image', 'SO3 Kano', 'SO3 topluluğu kano etkinliği', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(15, '02700000-0000-4000-8000-000000000014', 'community-nature-walk.webp', 'so3-demo-community-nature-walk.webp', 'media/so3/community-nature-walk.webp', NULL, 'image/webp', 'webp', 506524, 1350, 2400, 'image', 'SO3 Doğa Yürüyüşü', 'SO3 topluluğu doğa yürüyüşü', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(16, '02700000-0000-4000-8000-000000000015', 'community-team-games.webp', 'so3-demo-community-team-games.webp', 'media/so3/community-team-games.webp', NULL, 'image/webp', 'webp', 258194, 1350, 2400, 'image', 'SO3 Takımlı Oyunlar', 'SO3 topluluğu takım oyunları', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(17, '02700000-0000-4000-8000-000000000016', 'discovery-boxing.webp', 'so3-demo-discovery-boxing.webp', 'media/so3/discovery-boxing.webp', NULL, 'image/webp', 'webp', 263388, 2400, 1351, 'image', 'SO3 Boks Detay', 'SO3 boks antrenmanı', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(18, '02700000-0000-4000-8000-000000000017', 'discovery-fitness.webp', 'so3-demo-discovery-fitness.webp', 'media/so3/discovery-fitness.webp', NULL, 'image/webp', 'webp', 331432, 2400, 1351, 'image', 'SO3 Fitness Detay', 'SO3 fitness antrenman alanı', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(19, '02700000-0000-4000-8000-000000000018', 'discovery-pt.webp', 'so3-demo-discovery-pt.webp', 'media/so3/discovery-pt.webp', NULL, 'image/webp', 'webp', 164650, 1600, 2400, 'image', 'SO3 Personal Training', 'SO3 birebir personal training', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(20, '02700000-0000-4000-8000-000000000019', 'discovery-vitamin-bar.webp', 'so3-demo-discovery-vitamin-bar.webp', 'media/so3/discovery-vitamin-bar.webp', NULL, 'image/webp', 'webp', 291314, 2400, 1351, 'image', 'SO3 Vitamin Bar', 'SO3 vitamin bar alanı', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(21, '02700000-0000-4000-8000-000000000020', 'discovery-yoga.webp', 'so3-demo-discovery-yoga.webp', 'media/so3/discovery-yoga.webp', NULL, 'image/webp', 'webp', 138874, 2400, 1351, 'image', 'SO3 Yoga', 'SO3 yoga alanı', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(22, '02700000-0000-4000-8000-000000000021', 'cover.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-cover.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/cover.webp', 'media/so3/community-nature-walk.webp', 'image/webp', 'webp', 260044, 1600, 900, 'image', 'Gomeda Vadisi Yürüyüşü Kapak', 'SO3 Gomeda Vadisi Yürüyüşü etkinliği', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(23, '02700000-0000-4000-8000-000000000022', '01.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-01.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/01.webp', NULL, 'image/webp', 'webp', 490298, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 01', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(24, '02700000-0000-4000-8000-000000000023', '02.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-02.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/02.webp', NULL, 'image/webp', 'webp', 610740, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 02', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(25, '02700000-0000-4000-8000-000000000024', '03.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-03.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/03.webp', NULL, 'image/webp', 'webp', 751676, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 03', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(26, '02700000-0000-4000-8000-000000000025', '04.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-04.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/04.webp', NULL, 'image/webp', 'webp', 426642, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 04', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(27, '02700000-0000-4000-8000-000000000026', '05.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-05.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/05.webp', NULL, 'image/webp', 'webp', 407128, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 05', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(28, '02700000-0000-4000-8000-000000000027', '06.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-06.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/06.webp', NULL, 'image/webp', 'webp', 506660, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 06', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(29, '02700000-0000-4000-8000-000000000028', '07.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-07.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/07.webp', NULL, 'image/webp', 'webp', 604434, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 07', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(30, '02700000-0000-4000-8000-000000000029', 'cover.webp', 'so3-demo-events-kano-etkinligi-cover.webp', 'media/so3/events/kano-etkinligi/cover.webp', 'media/so3/community-kano.webp', 'image/webp', 'webp', 263282, 1600, 900, 'image', 'Kano Etkinliği Kapak', 'SO3 Kano Etkinliği etkinliği', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(31, '02700000-0000-4000-8000-000000000030', '01.webp', 'so3-demo-events-kano-etkinligi-gallery-01.webp', 'media/so3/events/kano-etkinligi/gallery/01.webp', NULL, 'image/webp', 'webp', 365306, 1440, 2560, 'image', 'Kano Etkinliği Galeri 01', 'SO3 Kano Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(32, '02700000-0000-4000-8000-000000000031', '02.webp', 'so3-demo-events-kano-etkinligi-gallery-02.webp', 'media/so3/events/kano-etkinligi/gallery/02.webp', NULL, 'image/webp', 'webp', 335648, 1440, 2560, 'image', 'Kano Etkinliği Galeri 02', 'SO3 Kano Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(33, '02700000-0000-4000-8000-000000000032', '03.webp', 'so3-demo-events-kano-etkinligi-gallery-03.webp', 'media/so3/events/kano-etkinligi/gallery/03.webp', NULL, 'image/webp', 'webp', 480086, 1440, 2560, 'image', 'Kano Etkinliği Galeri 03', 'SO3 Kano Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(34, '02700000-0000-4000-8000-000000000033', '04.webp', 'so3-demo-events-kano-etkinligi-gallery-04.webp', 'media/so3/events/kano-etkinligi/gallery/04.webp', NULL, 'image/webp', 'webp', 471002, 1440, 2560, 'image', 'Kano Etkinliği Galeri 04', 'SO3 Kano Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(35, '02700000-0000-4000-8000-000000000034', '05.webp', 'so3-demo-events-kano-etkinligi-gallery-05.webp', 'media/so3/events/kano-etkinligi/gallery/05.webp', NULL, 'image/webp', 'webp', 283602, 1440, 2560, 'image', 'Kano Etkinliği Galeri 05', 'SO3 Kano Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(36, '02700000-0000-4000-8000-000000000035', '06.webp', 'so3-demo-events-kano-etkinligi-gallery-06.webp', 'media/so3/events/kano-etkinligi/gallery/06.webp', NULL, 'image/webp', 'webp', 379408, 1440, 2560, 'image', 'Kano Etkinliği Galeri 06', 'SO3 Kano Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(37, '02700000-0000-4000-8000-000000000036', '07.webp', 'so3-demo-events-kano-etkinligi-gallery-07.webp', 'media/so3/events/kano-etkinligi/gallery/07.webp', NULL, 'image/webp', 'webp', 483446, 1440, 2560, 'image', 'Kano Etkinliği Galeri 07', 'SO3 Kano Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(38, '02700000-0000-4000-8000-000000000037', '08.webp', 'so3-demo-events-kano-etkinligi-gallery-08.webp', 'media/so3/events/kano-etkinligi/gallery/08.webp', NULL, 'image/webp', 'webp', 373622, 1440, 2560, 'image', 'Kano Etkinliği Galeri 08', 'SO3 Kano Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(39, '02700000-0000-4000-8000-000000000038', '09.webp', 'so3-demo-events-kano-etkinligi-gallery-09.webp', 'media/so3/events/kano-etkinligi/gallery/09.webp', NULL, 'image/webp', 'webp', 353534, 1440, 2560, 'image', 'Kano Etkinliği Galeri 09', 'SO3 Kano Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(40, '02700000-0000-4000-8000-000000000039', 'cover.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-cover.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/cover.webp', NULL, 'image/webp', 'webp', 452232, 1600, 900, 'image', 'Kırlangıç Vadisi Yürüyüşü Kapak', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliği', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(41, '02700000-0000-4000-8000-000000000040', '01.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-01.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/01.webp', NULL, 'image/webp', 'webp', 432024, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 01', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(42, '02700000-0000-4000-8000-000000000041', '02.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-02.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/02.webp', NULL, 'image/webp', 'webp', 546356, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 02', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(43, '02700000-0000-4000-8000-000000000042', '03.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-03.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/03.webp', NULL, 'image/webp', 'webp', 376114, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 03', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(44, '02700000-0000-4000-8000-000000000043', '04.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-04.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/04.webp', NULL, 'image/webp', 'webp', 927872, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 04', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(45, '02700000-0000-4000-8000-000000000044', '05.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-05.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/05.webp', NULL, 'image/webp', 'webp', 150296, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 05', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(46, '02700000-0000-4000-8000-000000000045', '06.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-06.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/06.webp', NULL, 'image/webp', 'webp', 199664, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 06', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(47, '02700000-0000-4000-8000-000000000046', 'cover.webp', 'so3-demo-events-mobilite-grup-dersi-cover.webp', 'media/so3/events/mobilite-grup-dersi/cover.webp', 'media/so3/community-group-training.webp', 'image/webp', 'webp', 113184, 1600, 900, 'image', 'Mobilite Grup Dersi Kapak', 'SO3 Mobilite Grup Dersi etkinliği', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(48, '02700000-0000-4000-8000-000000000047', '01.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-01.webp', 'media/so3/events/mobilite-grup-dersi/gallery/01.webp', NULL, 'image/webp', 'webp', 163884, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 01', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(49, '02700000-0000-4000-8000-000000000048', '02.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-02.webp', 'media/so3/events/mobilite-grup-dersi/gallery/02.webp', NULL, 'image/webp', 'webp', 219092, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 02', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(50, '02700000-0000-4000-8000-000000000049', '03.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-03.webp', 'media/so3/events/mobilite-grup-dersi/gallery/03.webp', NULL, 'image/webp', 'webp', 238954, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 03', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(51, '02700000-0000-4000-8000-000000000050', '04.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-04.webp', 'media/so3/events/mobilite-grup-dersi/gallery/04.webp', NULL, 'image/webp', 'webp', 278276, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 04', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(52, '02700000-0000-4000-8000-000000000051', '05.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-05.webp', 'media/so3/events/mobilite-grup-dersi/gallery/05.webp', NULL, 'image/webp', 'webp', 178948, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 05', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(53, '02700000-0000-4000-8000-000000000052', 'cover.webp', 'so3-demo-events-plaj-voleybolu-cover.webp', 'media/so3/events/plaj-voleybolu/cover.webp', 'media/so3/community-hali-saha-alt.webp', 'image/webp', 'webp', 220218, 1600, 900, 'image', 'Plaj Voleybolu Kapak', 'SO3 Plaj Voleybolu etkinliği', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(54, '02700000-0000-4000-8000-000000000053', '01.webp', 'so3-demo-events-plaj-voleybolu-gallery-01.webp', 'media/so3/events/plaj-voleybolu/gallery/01.webp', NULL, 'image/webp', 'webp', 176176, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 01', 'SO3 Plaj Voleybolu etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(55, '02700000-0000-4000-8000-000000000054', '02.webp', 'so3-demo-events-plaj-voleybolu-gallery-02.webp', 'media/so3/events/plaj-voleybolu/gallery/02.webp', NULL, 'image/webp', 'webp', 188348, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 02', 'SO3 Plaj Voleybolu etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(56, '02700000-0000-4000-8000-000000000055', '03.webp', 'so3-demo-events-plaj-voleybolu-gallery-03.webp', 'media/so3/events/plaj-voleybolu/gallery/03.webp', NULL, 'image/webp', 'webp', 154064, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 03', 'SO3 Plaj Voleybolu etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(57, '02700000-0000-4000-8000-000000000056', '04.webp', 'so3-demo-events-plaj-voleybolu-gallery-04.webp', 'media/so3/events/plaj-voleybolu/gallery/04.webp', NULL, 'image/webp', 'webp', 388444, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 04', 'SO3 Plaj Voleybolu etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(58, '02700000-0000-4000-8000-000000000057', '05.webp', 'so3-demo-events-plaj-voleybolu-gallery-05.webp', 'media/so3/events/plaj-voleybolu/gallery/05.webp', NULL, 'image/webp', 'webp', 182954, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 05', 'SO3 Plaj Voleybolu etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(59, '02700000-0000-4000-8000-000000000058', 'cover.webp', 'so3-demo-events-voleybol-etkinligi-cover.webp', 'media/so3/events/voleybol-etkinligi/cover.webp', 'media/so3/community-team-games.webp', 'image/webp', 'webp', 97232, 1600, 900, 'image', 'Voleybol Etkinliği Kapak', 'SO3 Voleybol Etkinliği etkinliği', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(60, '02700000-0000-4000-8000-000000000059', '01.webp', 'so3-demo-events-voleybol-etkinligi-gallery-01.webp', 'media/so3/events/voleybol-etkinligi/gallery/01.webp', NULL, 'image/webp', 'webp', 247820, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 01', 'SO3 Voleybol Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(61, '02700000-0000-4000-8000-000000000060', '02.webp', 'so3-demo-events-voleybol-etkinligi-gallery-02.webp', 'media/so3/events/voleybol-etkinligi/gallery/02.webp', NULL, 'image/webp', 'webp', 223324, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 02', 'SO3 Voleybol Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(62, '02700000-0000-4000-8000-000000000061', '03.webp', 'so3-demo-events-voleybol-etkinligi-gallery-03.webp', 'media/so3/events/voleybol-etkinligi/gallery/03.webp', NULL, 'image/webp', 'webp', 295842, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 03', 'SO3 Voleybol Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(63, '02700000-0000-4000-8000-000000000062', '04.webp', 'so3-demo-events-voleybol-etkinligi-gallery-04.webp', 'media/so3/events/voleybol-etkinligi/gallery/04.webp', NULL, 'image/webp', 'webp', 119016, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 04', 'SO3 Voleybol Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(64, '02700000-0000-4000-8000-000000000063', '05.webp', 'so3-demo-events-voleybol-etkinligi-gallery-05.webp', 'media/so3/events/voleybol-etkinligi/gallery/05.webp', NULL, 'image/webp', 'webp', 114916, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 05', 'SO3 Voleybol Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(65, '02700000-0000-4000-8000-000000000064', '06.webp', 'so3-demo-events-voleybol-etkinligi-gallery-06.webp', 'media/so3/events/voleybol-etkinligi/gallery/06.webp', NULL, 'image/webp', 'webp', 286040, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 06', 'SO3 Voleybol Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(66, '02700000-0000-4000-8000-000000000065', '07.webp', 'so3-demo-events-voleybol-etkinligi-gallery-07.webp', 'media/so3/events/voleybol-etkinligi/gallery/07.webp', NULL, 'image/webp', 'webp', 257234, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 07', 'SO3 Voleybol Etkinliği etkinliğinden bir an', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(67, '02700000-0000-4000-8000-000000000066', 'hero-so3.webp', 'so3-demo-hero-so3.webp', 'media/so3/hero-so3.webp', NULL, 'image/webp', 'webp', 190524, 2400, 1600, 'image', 'SO3 Ana Sayfa Kapak', 'SO3 Personal Training antrenman alanı', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(68, '02700000-0000-4000-8000-000000000067', 'performance.webp', 'so3-demo-performance.webp', 'media/so3/performance.webp', NULL, 'image/webp', 'webp', 359640, 1600, 2400, 'image', 'SO3 Performans', 'SO3 performans antrenmanı', NULL, NULL, 'active', NULL, '2026-08-21 01:30:32', '2026-08-21 01:30:32', NULL),
(69, '86df7025c80bde534256f50ef6fec0af', '01.mp4', 'b75aedea12b6bf8b086f4430cc736033.mp4', 'uploads/videos/2026/08/b75aedea12b6bf8b086f4430cc736033.mp4', NULL, 'video/mp4', 'mp4', 24141194, NULL, NULL, 'video', 'Voleybol Etkinliği', '', '', '99e40fafc4f96cae0c1a66cbd3669ca5af9ce99d2e506c476c827263940585f3', 'deleted', 1, '2026-08-21 02:14:22', '2026-08-21 02:40:12', '2026-08-21 02:40:12'),
(70, '4a1d7664d84f8fd6a45e8a016d307d4d', '01.mp4', '62ce12b7e39a2cf6c01ef2f3581463b5.mp4', 'uploads/videos/2026/08/62ce12b7e39a2cf6c01ef2f3581463b5.mp4', NULL, 'video/mp4', 'mp4', 22793508, NULL, NULL, 'video', 'Kano 1', '', '', '38e2a54dfe90d845ed5567de6298b8f620d36f9b9ce77f1fe1f10a3afd14c951', 'deleted', 1, '2026-08-21 02:15:17', '2026-08-21 02:38:39', '2026-08-21 02:38:39'),
(71, 'f75475ee26ae78984a1d31398834db90', '02.mp4', '3bcbbea727c5681ae9ff665be27f556e.mp4', 'uploads/videos/2026/08/3bcbbea727c5681ae9ff665be27f556e.mp4', NULL, 'video/mp4', 'mp4', 15792113, NULL, NULL, 'video', 'Kano 2', '', '', 'e5933efd004b390a343e478b5bde8a4b94b0e8334e4a2a99befe1c39887bdcc2', 'deleted', 1, '2026-08-21 02:15:42', '2026-08-21 02:38:36', '2026-08-21 02:38:36'),
(72, '6d86671eea71678f15a809fccf46d7f2', '01.mp4', '7faac9ecaf4a5dd52d67021a02479b45.mp4', 'uploads/videos/2026/08/7faac9ecaf4a5dd52d67021a02479b45.mp4', NULL, 'video/mp4', 'mp4', 14536848, NULL, NULL, 'video', 'Mobilite 1', '', '', '6c533515c576d23033c283a76b0a1392f800bd279a7a27278a88f6ebfab725f7', 'deleted', 1, '2026-08-21 02:16:54', '2026-08-21 02:41:11', '2026-08-21 02:41:11'),
(73, 'd28fd492a5a78292f2aeebd7cdc99e91', '01.mp4', '49ca8013cad3077742abca121af6a4fe.mp4', 'uploads/videos/2026/08/49ca8013cad3077742abca121af6a4fe.mp4', NULL, 'video/mp4', 'mp4', 26077481, NULL, NULL, 'video', 'Gomeda Vadisi Yürüyüş', '', '', 'f2a8d2e0e43f16c28028da2fd8433d69c6d8715e82e9dff4acb61bec9f94290d', 'deleted', 1, '2026-08-21 02:17:45', '2026-08-21 02:38:04', '2026-08-21 02:38:04'),
(74, 'ba2c987e875a1a774fbe100e1a312536', '01.mp4', '2091064412415990ef0ee61f42ceda06.mp4', 'uploads/videos/2026/08/2091064412415990ef0ee61f42ceda06.mp4', 'uploads/thumbnails/2026/08/2091064412415990ef0ee61f42ceda06.webp', 'video/mp4', 'mp4', 26077481, 540, 960, 'video', NULL, NULL, NULL, 'f2a8d2e0e43f16c28028da2fd8433d69c6d8715e82e9dff4acb61bec9f94290d', 'active', 1, '2026-08-21 02:40:32', '2026-08-21 02:40:32', NULL),
(75, '4b90128ee30a084b5bfc72815d605126', '01.mp4', '24d03f022e0560cafc74002bd2449c05.mp4', 'uploads/videos/2026/08/24d03f022e0560cafc74002bd2449c05.mp4', 'uploads/thumbnails/2026/08/24d03f022e0560cafc74002bd2449c05.webp', 'video/mp4', 'mp4', 22793508, 540, 960, 'video', NULL, NULL, NULL, '38e2a54dfe90d845ed5567de6298b8f620d36f9b9ce77f1fe1f10a3afd14c951', 'active', 1, '2026-08-21 02:41:32', '2026-08-21 02:41:32', NULL),
(76, '8e37975acc0818bcecd59a456ee3aeaf', '02.mp4', '488a4066fab6adbf2834f0fb4e66ddf8.mp4', 'uploads/videos/2026/08/488a4066fab6adbf2834f0fb4e66ddf8.mp4', 'media/so3/events/kano-etkinligi/gallery/04.webp', 'video/mp4', 'mp4', 15792113, 1440, 2560, 'video', NULL, NULL, NULL, 'e5933efd004b390a343e478b5bde8a4b94b0e8334e4a2a99befe1c39887bdcc2', 'active', 1, '2026-08-21 02:42:19', '2026-08-21 12:31:42', NULL),
(77, '99dca3b45c3fb9c142a09d7082a0ea3d', '01.mp4', '18dd320fdce8621341d88e21870d175e.mp4', 'uploads/videos/2026/08/18dd320fdce8621341d88e21870d175e.mp4', 'uploads/thumbnails/2026/08/18dd320fdce8621341d88e21870d175e.webp', 'video/mp4', 'mp4', 24141194, 540, 960, 'video', NULL, NULL, NULL, '99e40fafc4f96cae0c1a66cbd3669ca5af9ce99d2e506c476c827263940585f3', 'active', 1, '2026-08-21 02:43:40', '2026-08-21 02:43:40', NULL),
(78, 'f8d946df25bcfb3f789f7a5e8527ecd0', '01.mp4', 'ce7283261760606f261aef6166706945.mp4', 'uploads/videos/2026/08/ce7283261760606f261aef6166706945.mp4', 'uploads/thumbnails/2026/08/ce7283261760606f261aef6166706945.webp', 'video/mp4', 'mp4', 14536848, 540, 960, 'video', NULL, NULL, NULL, '6c533515c576d23033c283a76b0a1392f800bd279a7a27278a88f6ebfab725f7', 'active', 1, '2026-08-21 02:44:21', '2026-08-21 02:44:21', NULL),
(79, '054324bbc5a984fe739bf61a5673fd69', 'So3 Akşam Vlog(1).png', 'f1de206b9661822712b6ef267afa8f3d.webp', 'uploads/images/2026/08/f1de206b9661822712b6ef267afa8f3d.webp', 'uploads/thumbnails/2026/08/f1de206b9661822712b6ef267afa8f3d.webp', 'image/webp', 'webp', 121182, 1350, 2400, 'image', NULL, NULL, NULL, '04a59ab78af183b4d9e0c2f668bdc4e8f3b2bd0646b69c5e616cccfe17c64990', 'active', 1, '2026-08-21 13:07:31', '2026-08-21 13:07:31', NULL),
(80, 'e7dd0dbe9017c79ad09ea1e32dfd98e5', 'So3 Akşam Vlog(2).png', '639c36028de68c2aa0a024d489a83e76.webp', 'uploads/images/2026/08/639c36028de68c2aa0a024d489a83e76.webp', 'uploads/thumbnails/2026/08/639c36028de68c2aa0a024d489a83e76.webp', 'image/webp', 'webp', 157482, 1350, 2400, 'image', NULL, NULL, NULL, '0a824e4ce51894c90f7761ca2559144b78e78e351f361a86b62e2c6bd786fa1f', 'active', 1, '2026-08-21 13:07:50', '2026-08-21 13:07:50', NULL),
(81, '134aa14b3407234503bbd36d8cfb2a07', 'So3 Akşam Vlog(3).png', '1b72a61f75a7ac2e15c8fb3db469c599.webp', 'uploads/images/2026/08/1b72a61f75a7ac2e15c8fb3db469c599.webp', 'uploads/thumbnails/2026/08/1b72a61f75a7ac2e15c8fb3db469c599.webp', 'image/webp', 'webp', 161614, 1350, 2400, 'image', NULL, NULL, NULL, '52530d3526bc4edda60cd0df64fbcd04b6d103825fd7d2e642ec5aefb6817d89', 'active', 1, '2026-08-21 13:08:07', '2026-08-21 13:08:07', NULL),
(82, '2bedf6ed81453fd505850c50ac0c2577', 'So3 Akşam Vlog.png', 'a6cc88490bb4d9c683c0e61ae04ed74d.webp', 'uploads/images/2026/08/a6cc88490bb4d9c683c0e61ae04ed74d.webp', 'uploads/thumbnails/2026/08/a6cc88490bb4d9c683c0e61ae04ed74d.webp', 'image/webp', 'webp', 137030, 1350, 2400, 'image', NULL, NULL, NULL, 'bdf19fa8c2fa57c363e96fb9361c31a36b9956d9b0d344ebeef1bde127b42322', 'active', 1, '2026-08-21 13:08:23', '2026-08-21 13:08:23', NULL),
(83, '54570dafdc20d14259a689d68dbb8967', 'DSC07763.jpg', 'f6d0a2b4874181d1d5ac704c82d0a9ce.webp', 'uploads/images/2026/08/f6d0a2b4874181d1d5ac704c82d0a9ce.webp', 'uploads/thumbnails/2026/08/f6d0a2b4874181d1d5ac704c82d0a9ce.webp', 'image/webp', 'webp', 138996, 1600, 2400, 'image', NULL, NULL, NULL, '8abf33da0fb3412995070eecc8fcee19c4eb3b4907b7791f66fa3c92ea4d9701', 'active', 1, '2026-08-21 13:08:44', '2026-08-21 13:08:44', NULL),
(84, '5e28df1e9abfb4ea42d434c69f4a491b', 'DSC07865.jpg', 'afa0c956781928ea5858d133e56aa3a8.webp', 'uploads/images/2026/08/afa0c956781928ea5858d133e56aa3a8.webp', 'uploads/thumbnails/2026/08/afa0c956781928ea5858d133e56aa3a8.webp', 'image/webp', 'webp', 142214, 1600, 2400, 'image', NULL, NULL, NULL, '5006efbee1da527e19846c93e97597f3bfcf292b9748c058dc407e1fa45287f4', 'active', 1, '2026-08-21 13:09:05', '2026-08-21 13:09:05', NULL),
(85, '1a3e1993d7457a774d9630840fb3eeaa', 'DSC07877.jpg', '5cdf5caec56a3a6ff99a79b244d5d864.webp', 'uploads/images/2026/08/5cdf5caec56a3a6ff99a79b244d5d864.webp', 'uploads/thumbnails/2026/08/5cdf5caec56a3a6ff99a79b244d5d864.webp', 'image/webp', 'webp', 287930, 1600, 2400, 'image', NULL, NULL, NULL, 'b968fc21f7586e13f6e2c5d0ffd9bc6d0e924f4a2cc19c8f4f8a2ee149de293f', 'active', 1, '2026-08-21 13:09:31', '2026-08-21 13:09:31', NULL),
(86, '63f2b2519c4ee29150c69379f02108aa', 'DSC07943.jpg', '89b1d8619685950b3246fa477a63d6b4.webp', 'uploads/images/2026/08/89b1d8619685950b3246fa477a63d6b4.webp', 'uploads/thumbnails/2026/08/89b1d8619685950b3246fa477a63d6b4.webp', 'image/webp', 'webp', 231624, 1600, 2400, 'image', NULL, NULL, NULL, 'fc5eee5f6137631380a0aff9c67415342dbeaa70433ebe6ef1e584a66108017f', 'active', 1, '2026-08-21 13:09:53', '2026-08-21 13:09:53', NULL),
(87, '2a0cb66d4c2bed36ac6d8a706e1ac40c', '20260806_212155.jpg', 'f319c5c30ded93bb0f240b9215a808f4.webp', 'uploads/images/2026/08/f319c5c30ded93bb0f240b9215a808f4.webp', 'uploads/thumbnails/2026/08/f319c5c30ded93bb0f240b9215a808f4.webp', 'image/webp', 'webp', 347148, 2400, 1351, 'image', NULL, NULL, NULL, '7367b9394bec434eeaf1be44aade87b510329f2d13dee4d535ee9eb06cecc93e', 'active', 1, '2026-08-21 13:10:59', '2026-08-21 13:10:59', NULL),
(88, 'a5f8da73b1efe25c8ba1100dcbc0f397', '20260806_212215.jpg', '81abe38642a72655b6fa9a45e0356ce2.webp', 'uploads/images/2026/08/81abe38642a72655b6fa9a45e0356ce2.webp', 'uploads/thumbnails/2026/08/81abe38642a72655b6fa9a45e0356ce2.webp', 'image/webp', 'webp', 258032, 2400, 1351, 'image', NULL, NULL, NULL, '152bcc4decfa97c8617f45ea67b52ebb53cc1aa6fd9d73b6ea8326d4f8386987', 'active', 1, '2026-08-21 13:11:14', '2026-08-21 13:11:14', NULL),
(89, 'bc1e9860a8af00e6a30fc582e406c0e5', '20260806_212247.jpg', 'ebc8eb0204241f3fd3f4e3f1a926468c.webp', 'uploads/images/2026/08/ebc8eb0204241f3fd3f4e3f1a926468c.webp', 'uploads/thumbnails/2026/08/ebc8eb0204241f3fd3f4e3f1a926468c.webp', 'image/webp', 'webp', 303060, 2400, 1351, 'image', NULL, NULL, NULL, 'f1f31663bb34420044ff54933236fe25e8da33dea644efd44bb0db737e9b880c', 'active', 1, '2026-08-21 13:11:29', '2026-08-21 13:11:29', NULL),
(90, 'e345b13161cbf41701b626b7c9d23b86', '20260806_212310.jpg', 'c8d733259681348f89ae14232b5897d7.webp', 'uploads/images/2026/08/c8d733259681348f89ae14232b5897d7.webp', 'uploads/thumbnails/2026/08/c8d733259681348f89ae14232b5897d7.webp', 'image/webp', 'webp', 381602, 2400, 1351, 'image', NULL, NULL, NULL, '6d2c50b599615870f45923137d5ed78a813e664378297b80ed0a59a925a03573', 'active', 1, '2026-08-21 13:11:45', '2026-08-21 13:11:45', NULL),
(91, '3bffbeed58ff00acb314652c29898039', '20260806_212322.jpg', 'b0b2181b033fe2e31c797df4a640fda0.webp', 'uploads/images/2026/08/b0b2181b033fe2e31c797df4a640fda0.webp', 'uploads/thumbnails/2026/08/b0b2181b033fe2e31c797df4a640fda0.webp', 'image/webp', 'webp', 236266, 2400, 1351, 'image', NULL, NULL, NULL, 'fdae3e4e6fc0a95629624dcd6b7d6752d319b2588c3f45a9f5913f2584b44fad', 'active', 1, '2026-08-21 13:12:04', '2026-08-21 13:12:04', NULL),
(92, 'c505ba6175546a47038193de2031ccfd', '20260806_212347.jpg', '51a1324e60ae32005f435bc16b43e11e.webp', 'uploads/images/2026/08/51a1324e60ae32005f435bc16b43e11e.webp', 'uploads/thumbnails/2026/08/51a1324e60ae32005f435bc16b43e11e.webp', 'image/webp', 'webp', 265366, 2400, 1351, 'image', NULL, NULL, NULL, '500e187c40487903c75e12da2d32cc89ad697decede5e5c7f400f60c9a4efbb3', 'active', 1, '2026-08-21 13:12:19', '2026-08-21 13:12:19', NULL),
(93, '133ba40b4887e5967ca5fd336e1f4392', '20260806_212432.jpg', '9f05b0ae7931917c50b168233ce5d6af.webp', 'uploads/images/2026/08/9f05b0ae7931917c50b168233ce5d6af.webp', 'uploads/thumbnails/2026/08/9f05b0ae7931917c50b168233ce5d6af.webp', 'image/webp', 'webp', 266254, 2400, 1351, 'image', NULL, NULL, NULL, 'f7251dec0d58c31d9cb4ead0b4e57b36e1b9ba2f0b52a2ffd012b2054e7f1d45', 'active', 1, '2026-08-21 13:12:47', '2026-08-21 13:12:47', NULL),
(94, '2d2ac1ab76d906941ee45f83387aeb88', '20260806_213029.jpg', '8e3fcb7e59d2078dfa03168f65cf3350.webp', 'uploads/images/2026/08/8e3fcb7e59d2078dfa03168f65cf3350.webp', 'uploads/thumbnails/2026/08/8e3fcb7e59d2078dfa03168f65cf3350.webp', 'image/webp', 'webp', 268938, 2400, 1351, 'image', NULL, NULL, NULL, 'c55ad57657f9c4aac75650e2ff476686a5621ae383ae2dffa199b1e96f7b81b1', 'active', 1, '2026-08-21 13:18:57', '2026-08-21 13:18:57', NULL),
(95, '2c6bb854a92a09ec5465d1488a04eb5d', '20260806_213139.jpg', '9ade9adf1f0d82f8baf7a36aadafd7e9.webp', 'uploads/images/2026/08/9ade9adf1f0d82f8baf7a36aadafd7e9.webp', 'uploads/thumbnails/2026/08/9ade9adf1f0d82f8baf7a36aadafd7e9.webp', 'image/webp', 'webp', 273848, 2400, 1351, 'image', NULL, NULL, NULL, '953a9ecf45613bf53d24c8311fe67095d9bbbc834cbda8b2d353aa62c792d359', 'active', 1, '2026-08-21 13:19:12', '2026-08-21 13:19:12', NULL),
(96, '95903a1b02f720d0dce34221a5a4b5e7', '20260806_213210.jpg', '177329a96678a5a56d7d8546a956655f.webp', 'uploads/images/2026/08/177329a96678a5a56d7d8546a956655f.webp', 'uploads/thumbnails/2026/08/177329a96678a5a56d7d8546a956655f.webp', 'image/webp', 'webp', 293748, 2400, 1351, 'image', NULL, NULL, NULL, '1b2ab2db8cbf9b511b571b81ccc106024823fe4c16288933dc18ba4971463130', 'active', 1, '2026-08-21 13:19:28', '2026-08-21 13:19:28', NULL),
(97, '7ae2a61f4a53ece584c49f2691a3ae70', '20260806_212626.jpg', '7c2f08f5dd076f7b6e3872400ca57ae3.webp', 'uploads/images/2026/08/7c2f08f5dd076f7b6e3872400ca57ae3.webp', 'uploads/thumbnails/2026/08/7c2f08f5dd076f7b6e3872400ca57ae3.webp', 'image/webp', 'webp', 241680, 2400, 1351, 'image', NULL, NULL, NULL, 'd8e6dfdd2ac4e56ad99a7a2ff201dee47d83ee4c1ef31249ec2177118bae4a13', 'active', 1, '2026-08-21 13:20:19', '2026-08-21 13:20:19', NULL),
(98, 'd58006ae0ff11f0699526bb49b014c80', '0520(1).png', '4bf4cafa0ce78147afd16e80b391de4e.webp', 'uploads/images/2026/08/4bf4cafa0ce78147afd16e80b391de4e.webp', 'uploads/thumbnails/2026/08/4bf4cafa0ce78147afd16e80b391de4e.webp', 'image/webp', 'webp', 138716, 1350, 2400, 'image', NULL, NULL, NULL, '8a2ad46f0eed1a26acb7ed73473ac6d255cdfc32c40bc5db30271818d0444059', 'active', 1, '2026-08-21 13:21:49', '2026-08-21 13:21:49', NULL),
(99, '38aba6160928256c6bddb681b4a96cec', '0520.png', 'ba1ada4978ea1b8be866c32c33e35740.webp', 'uploads/images/2026/08/ba1ada4978ea1b8be866c32c33e35740.webp', 'uploads/thumbnails/2026/08/ba1ada4978ea1b8be866c32c33e35740.webp', 'image/webp', 'webp', 146284, 1350, 2400, 'image', NULL, NULL, NULL, 'e2794236dc6da3fa1af0b738b780b5106f1b0d1a4d37e02df1aefc79be48f6e0', 'active', 1, '2026-08-21 13:22:15', '2026-08-21 13:22:15', NULL),
(100, 'f98a344ddb040c8396f64ed31a800fbd', 'Boks Grup Antrenmanı(1).png', 'fa7b9d32fdda7f90dcdfa89451fa8c66.webp', 'uploads/images/2026/08/fa7b9d32fdda7f90dcdfa89451fa8c66.webp', 'uploads/thumbnails/2026/08/fa7b9d32fdda7f90dcdfa89451fa8c66.webp', 'image/webp', 'webp', 224512, 1350, 2400, 'image', NULL, NULL, NULL, '08cc227124977e00ac500af0da579aa1e46b778c1c7b2aeee91b13c93e8f8c9c', 'active', 1, '2026-08-21 13:22:28', '2026-08-21 13:22:28', NULL),
(101, '4dfa40a9771eed9aad7acf4e3a922804', 'Boks Grup Antrenmanı(2).png', '49d3e3953741538d9996cb63fadf2775.webp', 'uploads/images/2026/08/49d3e3953741538d9996cb63fadf2775.webp', 'uploads/thumbnails/2026/08/49d3e3953741538d9996cb63fadf2775.webp', 'image/webp', 'webp', 319850, 1350, 2400, 'image', NULL, NULL, NULL, 'f5c38d92f0272eedec260d2c719c30f5252c47bf47299e5f0b7be153187f7df8', 'active', 1, '2026-08-21 13:22:40', '2026-08-21 13:22:40', NULL),
(102, '1455890d5fdcbdbd0bd74377b3b0b0bb', 'Yusuf Zelal Antrenman.png', '0cfe34ddea022b014c66379d0a466238.webp', 'uploads/images/2026/08/0cfe34ddea022b014c66379d0a466238.webp', 'uploads/thumbnails/2026/08/0cfe34ddea022b014c66379d0a466238.webp', 'image/webp', 'webp', 136050, 1350, 2400, 'image', NULL, NULL, NULL, '6869f1d47f4a164233337458c2f0a99a51405fd4723ce75fab79238672e442bd', 'active', 1, '2026-08-21 13:23:04', '2026-08-21 13:23:04', NULL),
(103, '09dd0d81157429ff558303ec116a16ce', 'Boks Grup Antrenmanı(4).png', '42ae903b455f2c01c792263bbc73e8c5.webp', 'uploads/images/2026/08/42ae903b455f2c01c792263bbc73e8c5.webp', 'uploads/thumbnails/2026/08/42ae903b455f2c01c792263bbc73e8c5.webp', 'image/webp', 'webp', 183546, 1350, 2400, 'image', NULL, NULL, NULL, '0c2e2d0fd55fbb84f19f327dbcf84e66fc42588198a8956b009d9d4a95381834', 'active', 1, '2026-08-21 13:23:24', '2026-08-21 13:23:24', NULL),
(104, 'eb2188a29726f62886fdeb0ef9799f33', '3.png', '162314f92b55588ad21cb46d9bcc1be9.webp', 'uploads/images/2026/08/162314f92b55588ad21cb46d9bcc1be9.webp', 'uploads/thumbnails/2026/08/162314f92b55588ad21cb46d9bcc1be9.webp', 'image/webp', 'webp', 113050, 1080, 1350, 'image', NULL, NULL, NULL, '01fa08e16089df6d0bbf918292291e916793bd6d58da9221fa9095ffa32a7cf6', 'active', 1, '2026-08-21 13:24:17', '2026-08-21 13:24:17', NULL),
(105, 'd0abe2f7dfa6de9da3561d3879bd3635', '1.png', 'fba8f1235c5b2d0a9e8562eec74b9f44.webp', 'uploads/images/2026/08/fba8f1235c5b2d0a9e8562eec74b9f44.webp', 'uploads/thumbnails/2026/08/fba8f1235c5b2d0a9e8562eec74b9f44.webp', 'image/webp', 'webp', 112584, 1080, 1350, 'image', NULL, NULL, NULL, 'e83cd0317f8f7afaefd0d0af42a4394a3147cfca4061b6de4338df31c9fff4f6', 'active', 1, '2026-08-21 13:24:43', '2026-08-21 13:24:43', NULL),
(106, 'e0f17ada63e8b398c6893740c9c04501', '2.png', '4657e4d6ee7c5a1a0f1481e55bf88b49.webp', 'uploads/images/2026/08/4657e4d6ee7c5a1a0f1481e55bf88b49.webp', 'uploads/thumbnails/2026/08/4657e4d6ee7c5a1a0f1481e55bf88b49.webp', 'image/webp', 'webp', 110590, 1080, 1350, 'image', NULL, NULL, NULL, '762634b19befafa5a64df7e26ba2cc9fb043f4268495f3a502a197db316d4981', 'active', 1, '2026-08-21 13:24:51', '2026-08-21 13:24:51', NULL),
(107, '21618749b83da3ada6d6f2a71869f38c', '4.png', 'aa9844c437a8d25d84558314ecbadb73.webp', 'uploads/images/2026/08/aa9844c437a8d25d84558314ecbadb73.webp', 'uploads/thumbnails/2026/08/aa9844c437a8d25d84558314ecbadb73.webp', 'image/webp', 'webp', 82538, 1080, 1350, 'image', NULL, NULL, NULL, 'be1a1c852153d3ddb57dd33b08d925b45d2c0bc8d8ab97914e5147757516bbd7', 'active', 1, '2026-08-21 13:25:00', '2026-08-21 13:25:00', NULL),
(108, '4b5181f5d58c4f05a5674d8d78b88e47', '10.png', 'f71c121ccc00a3e6027e801a96f6dea0.webp', 'uploads/images/2026/08/f71c121ccc00a3e6027e801a96f6dea0.webp', 'uploads/thumbnails/2026/08/f71c121ccc00a3e6027e801a96f6dea0.webp', 'image/webp', 'webp', 114580, 1080, 1350, 'image', NULL, NULL, NULL, 'a58d14375ecde80b2b59119c99d9054d62408e609a7b051ab9fab86825fd0743', 'active', 1, '2026-08-21 13:25:11', '2026-08-21 13:25:11', NULL),
(109, 'cd00ec7ae5ba3d53025e6e915fb61bfb', '11.png', 'b22835e68f3e4e91f433bc4a9070c0b8.webp', 'uploads/images/2026/08/b22835e68f3e4e91f433bc4a9070c0b8.webp', 'uploads/thumbnails/2026/08/b22835e68f3e4e91f433bc4a9070c0b8.webp', 'image/webp', 'webp', 108028, 1080, 1350, 'image', NULL, NULL, NULL, 'ba1bcf332971686036f46f337a94fcc530c667c0c452585755c568ecdfaeb4bf', 'active', 1, '2026-08-21 13:25:20', '2026-08-21 13:25:20', NULL),
(110, '0098c51becb1ae976ab0763f3335a6f8', '14.png', '9dd07948680504e81817401a94c96c56.webp', 'uploads/images/2026/08/9dd07948680504e81817401a94c96c56.webp', 'uploads/thumbnails/2026/08/9dd07948680504e81817401a94c96c56.webp', 'image/webp', 'webp', 88544, 1080, 1350, 'image', NULL, NULL, NULL, '5164c82a2b06bec8f7c7e18dcdde5cd35f38a42f9b26ca7768a92a7fae327091', 'active', 1, '2026-08-21 13:25:30', '2026-08-21 13:25:30', NULL),
(111, '96c7274db1e5fa2ec0081879c798f381', '16.png', 'f147a1b26c233281d9b2d86721c28259.webp', 'uploads/images/2026/08/f147a1b26c233281d9b2d86721c28259.webp', 'uploads/thumbnails/2026/08/f147a1b26c233281d9b2d86721c28259.webp', 'image/webp', 'webp', 143704, 1080, 1350, 'image', NULL, NULL, NULL, '24b5acb80d37a8b872487b517a235d16ab02584975110dbe5e1e3181a57592e1', 'active', 1, '2026-08-21 13:25:41', '2026-08-21 13:25:41', NULL),
(112, '0ad4aea7c48b43f98ae8372c9cf6a02e', '18.png', 'dedba6df029fcd4ea54e6616a7611bde.webp', 'uploads/images/2026/08/dedba6df029fcd4ea54e6616a7611bde.webp', 'uploads/thumbnails/2026/08/dedba6df029fcd4ea54e6616a7611bde.webp', 'image/webp', 'webp', 99928, 1080, 1350, 'image', NULL, NULL, NULL, '986895605860fb4d1eaf7e0ac6624ba5618decd1f5a8a8c7f33499d9e83f022f', 'active', 1, '2026-08-21 13:25:55', '2026-08-21 13:25:55', NULL),
(113, '7e4b2918514806b0f0a3f63c4921d8d1', '21.png', '8b8e3c86b3d92d5d518f3888ae7a7cb5.webp', 'uploads/images/2026/08/8b8e3c86b3d92d5d518f3888ae7a7cb5.webp', 'uploads/thumbnails/2026/08/8b8e3c86b3d92d5d518f3888ae7a7cb5.webp', 'image/webp', 'webp', 161062, 1080, 1350, 'image', NULL, NULL, NULL, '9a4903351cdd386188ea2e6904961a8071c8e1293ab91d068cc1a15702f26869', 'active', 1, '2026-08-21 13:26:04', '2026-08-21 13:26:04', NULL);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `media_asset_tags`
--

CREATE TABLE `media_asset_tags` (
  `media_id` int NOT NULL,
  `tag_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `media_tags`
--

CREATE TABLE `media_tags` (
  `id` int NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `media_usages`
--

CREATE TABLE `media_usages` (
  `id` int NOT NULL,
  `media_id` int NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int NOT NULL,
  `field_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `media_usages`
--

INSERT INTO `media_usages` (`id`, `media_id`, `entity_type`, `entity_id`, `field_name`, `created_at`) VALUES
(1, 67, 'homepage_section', 1, 'background', '2026-08-21 01:30:32'),
(2, 68, 'homepage_section', 8, 'background', '2026-08-21 01:30:32'),
(6, 6, 'branch', 3, 'cover', '2026-08-21 01:30:32'),
(7, 21, 'branch', 4, 'cover', '2026-08-21 01:30:32'),
(19, 6, 'branch', 3, 'gallery', '2026-08-21 01:30:32'),
(20, 7, 'branch', 4, 'gallery', '2026-08-21 01:30:32'),
(21, 8, 'branch', 4, 'gallery', '2026-08-21 01:30:32'),
(22, 9, 'branch', 4, 'gallery', '2026-08-21 01:30:32'),
(23, 21, 'branch', 4, 'gallery', '2026-08-21 01:30:32'),
(30, 40, 'event', 5, 'cover', '2026-08-21 01:30:32'),
(33, 23, 'event', 1, 'gallery', '2026-08-21 01:30:32'),
(34, 24, 'event', 1, 'gallery', '2026-08-21 01:30:32'),
(35, 25, 'event', 1, 'gallery', '2026-08-21 01:30:32'),
(36, 26, 'event', 1, 'gallery', '2026-08-21 01:30:32'),
(37, 27, 'event', 1, 'gallery', '2026-08-21 01:30:32'),
(38, 28, 'event', 1, 'gallery', '2026-08-21 01:30:32'),
(39, 29, 'event', 1, 'gallery', '2026-08-21 01:30:32'),
(40, 31, 'event', 2, 'gallery', '2026-08-21 01:30:32'),
(41, 32, 'event', 2, 'gallery', '2026-08-21 01:30:32'),
(42, 33, 'event', 2, 'gallery', '2026-08-21 01:30:32'),
(43, 34, 'event', 2, 'gallery', '2026-08-21 01:30:32'),
(44, 35, 'event', 2, 'gallery', '2026-08-21 01:30:32'),
(45, 36, 'event', 2, 'gallery', '2026-08-21 01:30:32'),
(46, 37, 'event', 2, 'gallery', '2026-08-21 01:30:32'),
(47, 38, 'event', 2, 'gallery', '2026-08-21 01:30:32'),
(48, 39, 'event', 2, 'gallery', '2026-08-21 01:30:32'),
(49, 60, 'event', 3, 'gallery', '2026-08-21 01:30:32'),
(50, 61, 'event', 3, 'gallery', '2026-08-21 01:30:32'),
(51, 62, 'event', 3, 'gallery', '2026-08-21 01:30:32'),
(52, 63, 'event', 3, 'gallery', '2026-08-21 01:30:32'),
(53, 64, 'event', 3, 'gallery', '2026-08-21 01:30:32'),
(54, 65, 'event', 3, 'gallery', '2026-08-21 01:30:32'),
(55, 66, 'event', 3, 'gallery', '2026-08-21 01:30:32'),
(56, 48, 'event', 4, 'gallery', '2026-08-21 01:30:32'),
(57, 49, 'event', 4, 'gallery', '2026-08-21 01:30:32'),
(58, 50, 'event', 4, 'gallery', '2026-08-21 01:30:32'),
(59, 51, 'event', 4, 'gallery', '2026-08-21 01:30:32'),
(60, 52, 'event', 4, 'gallery', '2026-08-21 01:30:32'),
(61, 41, 'event', 5, 'gallery', '2026-08-21 01:30:32'),
(62, 42, 'event', 5, 'gallery', '2026-08-21 01:30:32'),
(63, 43, 'event', 5, 'gallery', '2026-08-21 01:30:32'),
(64, 44, 'event', 5, 'gallery', '2026-08-21 01:30:32'),
(65, 45, 'event', 5, 'gallery', '2026-08-21 01:30:32'),
(66, 46, 'event', 5, 'gallery', '2026-08-21 01:30:32'),
(67, 54, 'event', 6, 'gallery', '2026-08-21 01:30:32'),
(68, 55, 'event', 6, 'gallery', '2026-08-21 01:30:32'),
(69, 56, 'event', 6, 'gallery', '2026-08-21 01:30:32'),
(70, 57, 'event', 6, 'gallery', '2026-08-21 01:30:32'),
(71, 58, 'event', 6, 'gallery', '2026-08-21 01:30:32'),
(111, 74, 'event', 1, 'gallery', '2026-08-21 02:40:56'),
(112, 22, 'event', 1, 'cover', '2026-08-21 02:40:59'),
(113, 75, 'event', 2, 'gallery', '2026-08-21 02:43:07'),
(114, 76, 'event', 2, 'gallery', '2026-08-21 02:43:09'),
(115, 30, 'event', 2, 'cover', '2026-08-21 02:43:11'),
(116, 77, 'event', 3, 'gallery', '2026-08-21 02:43:51'),
(117, 59, 'event', 3, 'cover', '2026-08-21 02:43:53'),
(118, 78, 'event', 4, 'gallery', '2026-08-21 02:44:34'),
(120, 34, 'media', 76, 'thumbnail', '2026-08-21 12:31:42'),
(144, 5, 'branch', 1, 'cover', '2026-08-21 13:17:36'),
(145, 5, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(146, 18, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(147, 89, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(148, 88, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(149, 91, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(150, 93, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(151, 92, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(152, 81, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(153, 80, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(154, 83, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(155, 82, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(156, 79, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(157, 86, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(158, 84, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(159, 68, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(160, 85, 'branch', 1, 'gallery', '2026-08-21 13:17:36'),
(167, 4, 'branch', 2, 'cover', '2026-08-21 13:23:34'),
(168, 4, 'branch', 2, 'gallery', '2026-08-21 13:23:34'),
(169, 17, 'branch', 2, 'gallery', '2026-08-21 13:23:34'),
(170, 96, 'branch', 2, 'gallery', '2026-08-21 13:23:34'),
(171, 2, 'branch', 2, 'gallery', '2026-08-21 13:23:34'),
(172, 3, 'branch', 2, 'gallery', '2026-08-21 13:23:34'),
(173, 98, 'branch', 2, 'gallery', '2026-08-21 13:23:34'),
(174, 99, 'branch', 2, 'gallery', '2026-08-21 13:23:34'),
(175, 100, 'branch', 2, 'gallery', '2026-08-21 13:23:34'),
(176, 101, 'branch', 2, 'gallery', '2026-08-21 13:23:34'),
(177, 102, 'branch', 2, 'gallery', '2026-08-21 13:23:34'),
(178, 103, 'branch', 2, 'gallery', '2026-08-21 13:23:34'),
(180, 105, 'event', 7, 'gallery', '2026-08-21 13:26:14'),
(181, 106, 'event', 7, 'gallery', '2026-08-21 13:26:14'),
(182, 104, 'event', 7, 'gallery', '2026-08-21 13:26:15'),
(183, 107, 'event', 7, 'gallery', '2026-08-21 13:26:15'),
(184, 108, 'event', 7, 'gallery', '2026-08-21 13:26:15'),
(185, 109, 'event', 7, 'gallery', '2026-08-21 13:26:16'),
(186, 110, 'event', 7, 'gallery', '2026-08-21 13:26:16'),
(187, 111, 'event', 7, 'gallery', '2026-08-21 13:26:16'),
(188, 112, 'event', 7, 'gallery', '2026-08-21 13:26:17'),
(189, 113, 'event', 7, 'gallery', '2026-08-21 13:26:17'),
(190, 54, 'event', 6, 'cover', '2026-08-21 13:27:20'),
(191, 104, 'event', 7, 'cover', '2026-08-21 13:27:39'),
(192, 47, 'event', 4, 'cover', '2026-08-21 13:28:28');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `schema_migrations`
--

CREATE TABLE `schema_migrations` (
  `id` int NOT NULL,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `executed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `schema_migrations`
--

INSERT INTO `schema_migrations` (`id`, `migration`, `executed_at`) VALUES
(1, '001_create_schema_migrations.sql', '2026-08-20 21:04:59'),
(2, '002_create_admins.sql', '2026-08-20 21:04:59'),
(3, '003_create_admin_login_attempts.sql', '2026-08-20 21:04:59'),
(4, '004_create_audit_logs.sql', '2026-08-20 21:04:59'),
(5, '005_create_site_settings.sql', '2026-08-20 21:04:59'),
(6, '006_create_homepage_sections.sql', '2026-08-20 21:04:59'),
(7, '007_create_media_assets.sql', '2026-08-20 21:04:59'),
(8, '008_create_media_tags.sql', '2026-08-20 21:04:59'),
(9, '009_create_media_asset_tags.sql', '2026-08-20 21:04:59'),
(10, '010_create_media_usages.sql', '2026-08-20 21:04:59'),
(11, '011_create_event_categories.sql', '2026-08-20 21:04:59'),
(12, '012_create_events.sql', '2026-08-20 21:04:59'),
(13, '013_create_event_media.sql', '2026-08-20 21:04:59'),
(14, '014_seed_event_categories.sql', '2026-08-20 21:04:59'),
(15, '015_add_homepage_sections_sort_order.sql', '2026-08-20 21:04:59'),
(16, '016_seed_homepage_sections.sql', '2026-08-20 21:04:59'),
(17, '017_seed_homepage_content_core.sql', '2026-08-20 21:04:59'),
(18, '018_seed_homepage_content_why_process.sql', '2026-08-20 21:04:59'),
(19, '019_create_branches.sql', '2026-08-20 21:04:59'),
(20, '020_create_branch_media.sql', '2026-08-20 21:04:59'),
(21, '021_seed_branches.sql', '2026-08-20 21:04:59'),
(22, '022_create_trainers.sql', '2026-08-20 21:04:59'),
(23, '023_seed_trainers.sql', '2026-08-20 21:04:59'),
(24, '024_seed_global_settings.sql', '2026-08-20 21:04:59'),
(25, '025_replace_legacy_why_so3_copy.sql', '2026-08-20 21:04:59'),
(26, '027_seed_canonical_demo_media.sql', '2026-08-21 01:30:32');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `site_settings`
--

CREATE TABLE `site_settings` (
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` json DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `site_settings`
--

INSERT INTO `site_settings` (`setting_key`, `setting_value`, `updated_by`, `updated_at`) VALUES
('business_hours', '{\"items\": [{\"day\": \"monday\", \"open\": \"06:00\", \"close\": \"00:00\", \"is_closed\": false}, {\"day\": \"tuesday\", \"open\": \"06:00\", \"close\": \"00:00\", \"is_closed\": false}, {\"day\": \"wednesday\", \"open\": \"06:00\", \"close\": \"00:00\", \"is_closed\": false}, {\"day\": \"thursday\", \"open\": \"06:00\", \"close\": \"00:00\", \"is_closed\": false}, {\"day\": \"friday\", \"open\": \"06:00\", \"close\": \"00:00\", \"is_closed\": false}, {\"day\": \"saturday\", \"open\": \"06:00\", \"close\": \"00:00\", \"is_closed\": false}, {\"day\": \"sunday\", \"open\": null, \"close\": null, \"is_closed\": true}], \"enabled\": true}', 1, '2026-08-21 01:06:38'),
('contact', '{\"whatsapp\": \"05523790777\", \"phone_primary\": \"05539573738\", \"phone_secondary\": \"05072077797\"}', 1, '2026-08-21 01:01:34'),
('location', '{\"address\": \"Yıldırım Beyazıt, Aşık Veysel Blv. No:69/4, 38030 Melikgazi / Kayseri\", \"maps_embed_url\": \"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3112.5937107116843!2d35.5292976756857!3d38.71293637176466!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x152b136a06abeb6b%3A0x572b063e20953544!2sSO3%20Selami%20%C3%96zy%C4%B1ld%C4%B1r%C4%B1m%20Personal%20Trainer!5e0!3m2!1sen!2str!4v1700000000000!5m2!1sen!2str\", \"maps_directions_url\": \"https://www.google.com/maps/place/SO3+Selami+%C3%96zy%C4%B1ld%C4%B1r%C4%B1m+Personal+Trainer/@38.7129364,35.5318726,17z/data=!3m1!4b1!4m6!3m5!1s0x152b136a06abeb6b:0x572b063e20953544!8m2!3d38.7129364!4d35.5318726!16s%2Fg%2F11st_bxb2b\"}', 1, '2026-08-21 00:36:47'),
('social', '{\"instagram_username\": \"so3pt\"}', NULL, '2026-08-20 21:04:59'),
('tour', '{\"matterport_model_id\": \"sXAzAwRLnGs\"}', NULL, '2026-08-20 21:04:59');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `trainers`
--

CREATE TABLE `trainers` (
  `id` int NOT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` int NOT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `profile_media_id` int DEFAULT NULL,
  `instagram_username` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `trainers`
--

INSERT INTO `trainers` (`id`, `uuid`, `slug`, `name`, `role_title`, `branch_id`, `bio`, `profile_media_id`, `instagram_username`, `is_active`, `sort_order`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'b33362a2-3f8c-4f7d-bb62-4f3583fc11f1', 'selami-ozyildirim', 'Selami Özyıldırım', 'Fitness Eğitmeni', 1, NULL, NULL, NULL, 1, 10, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL),
(2, 'f6b8b082-f3f1-4c6e-826c-941cbcc8ff78', 'selim-ozyildirim', 'Selim Özyıldırım', 'Fitness Eğitmeni', 1, NULL, NULL, NULL, 1, 20, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL),
(3, 'a482b8a7-b1a7-47ab-a111-9a7065f4ffc0', 'sencer-ozyildirim', 'Sencer Özyıldırım', 'Fitness Eğitmeni', 1, NULL, NULL, NULL, 1, 30, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL),
(4, '06b9b1d9-5f11-4777-a8fc-367dc3df6870', 'burak-corakcioglu', 'Burak Çorakçıoğlu', 'Fitness Eğitmeni', 1, NULL, NULL, NULL, 1, 40, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL),
(5, 'c8f921f0-0b31-4ec9-9749-d7ab0eefc542', 'eren-sencer-ozturk', 'Eren Sencer Öztürk', 'Fitness Eğitmeni', 1, NULL, NULL, NULL, 1, 50, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL),
(6, 'e9b5f403-f38f-43e5-8f6a-046cf3c1cdbd', 'mehmet-katipoglu', 'Mehmet Katipoğlu', 'Fitness Eğitmeni · Uzman Diyetisyen', 1, NULL, NULL, NULL, 1, 60, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL),
(7, '2d08a54c-1d0b-4890-a548-c11df5fc2d0c', 'hulusi-unlu', 'Hulusi Ünlü', 'Fitness Eğitmeni', 1, NULL, NULL, NULL, 1, 70, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL),
(8, '707be9e6-0be6-444d-ad50-482436f5653b', 'sahranur-sozer', 'Sahranur Sözer', 'Fitness Eğitmeni', 1, NULL, NULL, NULL, 1, 80, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL),
(9, '82f252cf-eb2b-449e-b873-1081af298e79', 'mehmet-ates', 'Mehmet Ateş', 'Boks Eğitmeni', 2, NULL, NULL, NULL, 1, 90, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL),
(10, '5b4f62e8-d14d-4d7a-af1d-6e84d4da1c72', 'serhat-guler', 'Serhat Güler', 'Boks Eğitmeni', 2, NULL, NULL, NULL, 1, 100, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL),
(11, '73d8a631-c42e-4861-ab3f-a392e9d2874f', 'almira-tektas', 'Almira Tektaş', 'Pilates Eğitmeni', 3, NULL, NULL, NULL, 1, 110, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL),
(12, '9591e1d0-1a73-4f96-8566-fbbaf2562d22', 'muniyra-karayagiz', 'Müniyra Karayağız', 'Pilates Eğitmeni', 3, NULL, NULL, NULL, 1, 120, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL),
(13, 'e5bc9d8c-eb4d-452f-aef6-821e25e3af99', 'irem-bulut', 'İrem Bulut', 'Yoga Eğitmeni', 4, NULL, NULL, NULL, 1, 130, NULL, NULL, '2026-08-20 21:04:59', '2026-08-20 21:04:59', NULL);

--
-- Dökümü yapılmış tablolar için indeksler
--

--
-- Tablo için indeksler `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Tablo için indeksler `admin_login_attempts`
--
ALTER TABLE `admin_login_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_login_attempts_username` (`username`,`created_at`),
  ADD KEY `idx_login_attempts_ip` (`ip_address`,`created_at`);

--
-- Tablo için indeksler `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Tablo için indeksler `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `fk_branches_cover_media` (`cover_media_id`),
  ADD KEY `fk_branches_created_by` (`created_by`),
  ADD KEY `fk_branches_updated_by` (`updated_by`),
  ADD KEY `idx_branches_is_active` (`is_active`),
  ADD KEY `idx_branches_sort_order` (`sort_order`),
  ADD KEY `idx_branches_deleted_at` (`deleted_at`);

--
-- Tablo için indeksler `branch_media`
--
ALTER TABLE `branch_media`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_branch_media` (`branch_id`,`media_id`),
  ADD KEY `fk_branch_media_media` (`media_id`),
  ADD KEY `idx_branch_media_sort` (`branch_id`,`sort_order`);

--
-- Tablo için indeksler `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `cover_media_id` (`cover_media_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_events_slug` (`slug`),
  ADD KEY `idx_events_status` (`status`),
  ADD KEY `idx_events_category_id` (`category_id`),
  ADD KEY `idx_events_featured` (`featured_on_home`),
  ADD KEY `idx_events_date` (`event_date`),
  ADD KEY `idx_events_deleted_at` (`deleted_at`);

--
-- Tablo için indeksler `event_categories`
--
ALTER TABLE `event_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Tablo için indeksler `event_media`
--
ALTER TABLE `event_media`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_event_media` (`event_id`,`media_id`),
  ADD KEY `media_id` (`media_id`),
  ADD KEY `idx_event_media_order` (`event_id`,`sort_order`);

--
-- Tablo için indeksler `homepage_sections`
--
ALTER TABLE `homepage_sections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `section_id` (`section_id`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_homepage_sections_active_order` (`is_active`,`sort_order`);

--
-- Tablo için indeksler `media_assets`
--
ALTER TABLE `media_assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD UNIQUE KEY `storage_name` (`storage_name`),
  ADD KEY `fk_media_uploaded_by` (`uploaded_by`);

--
-- Tablo için indeksler `media_asset_tags`
--
ALTER TABLE `media_asset_tags`
  ADD PRIMARY KEY (`media_id`,`tag_id`),
  ADD KEY `fk_media_asset_tags_tag` (`tag_id`);

--
-- Tablo için indeksler `media_tags`
--
ALTER TABLE `media_tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Tablo için indeksler `media_usages`
--
ALTER TABLE `media_usages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_media_usages_media` (`media_id`);

--
-- Tablo için indeksler `schema_migrations`
--
ALTER TABLE `schema_migrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `migration` (`migration`);

--
-- Tablo için indeksler `site_settings`
--
ALTER TABLE `site_settings`
  ADD PRIMARY KEY (`setting_key`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Tablo için indeksler `trainers`
--
ALTER TABLE `trainers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `fk_trainer_profile_media` (`profile_media_id`),
  ADD KEY `fk_trainer_created_by` (`created_by`),
  ADD KEY `fk_trainer_updated_by` (`updated_by`),
  ADD KEY `idx_trainers_branch_id` (`branch_id`),
  ADD KEY `idx_trainers_is_active` (`is_active`),
  ADD KEY `idx_trainers_sort_order` (`sort_order`),
  ADD KEY `idx_trainers_deleted_at` (`deleted_at`);

--
-- Dökümü yapılmış tablolar için AUTO_INCREMENT değeri
--

--
-- Tablo için AUTO_INCREMENT değeri `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `admin_login_attempts`
--
ALTER TABLE `admin_login_attempts`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `branches`
--
ALTER TABLE `branches`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Tablo için AUTO_INCREMENT değeri `branch_media`
--
ALTER TABLE `branch_media`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- Tablo için AUTO_INCREMENT değeri `events`
--
ALTER TABLE `events`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Tablo için AUTO_INCREMENT değeri `event_categories`
--
ALTER TABLE `event_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Tablo için AUTO_INCREMENT değeri `event_media`
--
ALTER TABLE `event_media`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=84;

--
-- Tablo için AUTO_INCREMENT değeri `homepage_sections`
--
ALTER TABLE `homepage_sections`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Tablo için AUTO_INCREMENT değeri `media_assets`
--
ALTER TABLE `media_assets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=114;

--
-- Tablo için AUTO_INCREMENT değeri `media_tags`
--
ALTER TABLE `media_tags`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Tablo için AUTO_INCREMENT değeri `media_usages`
--
ALTER TABLE `media_usages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=193;

--
-- Tablo için AUTO_INCREMENT değeri `schema_migrations`
--
ALTER TABLE `schema_migrations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- Tablo için AUTO_INCREMENT değeri `trainers`
--
ALTER TABLE `trainers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- Dökümü yapılmış tablolar için kısıtlamalar
--

--
-- Tablo kısıtlamaları `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

--
-- Tablo kısıtlamaları `branches`
--
ALTER TABLE `branches`
  ADD CONSTRAINT `fk_branches_cover_media` FOREIGN KEY (`cover_media_id`) REFERENCES `media_assets` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_branches_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_branches_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

--
-- Tablo kısıtlamaları `branch_media`
--
ALTER TABLE `branch_media`
  ADD CONSTRAINT `fk_branch_media_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_branch_media_media` FOREIGN KEY (`media_id`) REFERENCES `media_assets` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `events_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `event_categories` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `events_ibfk_2` FOREIGN KEY (`cover_media_id`) REFERENCES `media_assets` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `events_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `events_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

--
-- Tablo kısıtlamaları `event_media`
--
ALTER TABLE `event_media`
  ADD CONSTRAINT `event_media_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `event_media_ibfk_2` FOREIGN KEY (`media_id`) REFERENCES `media_assets` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `homepage_sections`
--
ALTER TABLE `homepage_sections`
  ADD CONSTRAINT `homepage_sections_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

--
-- Tablo kısıtlamaları `media_assets`
--
ALTER TABLE `media_assets`
  ADD CONSTRAINT `fk_media_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

--
-- Tablo kısıtlamaları `media_asset_tags`
--
ALTER TABLE `media_asset_tags`
  ADD CONSTRAINT `fk_media_asset_tags_media` FOREIGN KEY (`media_id`) REFERENCES `media_assets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_media_asset_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `media_tags` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `media_usages`
--
ALTER TABLE `media_usages`
  ADD CONSTRAINT `fk_media_usages_media` FOREIGN KEY (`media_id`) REFERENCES `media_assets` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `site_settings`
--
ALTER TABLE `site_settings`
  ADD CONSTRAINT `site_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

--
-- Tablo kısıtlamaları `trainers`
--
ALTER TABLE `trainers`
  ADD CONSTRAINT `fk_trainer_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_trainer_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_trainer_profile_media` FOREIGN KEY (`profile_media_id`) REFERENCES `media_assets` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_trainer_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
