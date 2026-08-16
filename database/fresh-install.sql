-- SO3 PT Canonical Fresh Install SQL
-- Generated from migrations 001-024
-- 
-- WARNING: This file is intended ONLY for a completely empty database.
-- Do NOT import this file into a live database or a database containing existing data.
-- For incremental updates to an existing database, run: php bin/migrate.php
-- 
-- Existing migrations in database/migrations remain authoritative for live deployments.
-- Regeneration of this file is required when a new migration is added.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Migration: 001_create_schema_migrations.sql
CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `migration` VARCHAR(255) NOT NULL UNIQUE,
  `executed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: 002_create_admins.sql
CREATE TABLE `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(100) NOT NULL,
  `role` ENUM('super_admin', 'admin', 'editor') NOT NULL DEFAULT 'editor',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `last_login_at` DATETIME NULL,
  `last_login_ip` VARCHAR(45) NULL,
  `password_changed_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: 003_create_admin_login_attempts.sql
CREATE TABLE `admin_login_attempts` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `successful` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_login_attempts_username ON admin_login_attempts(username, created_at);
CREATE INDEX idx_login_attempts_ip ON admin_login_attempts(ip_address, created_at);

-- Migration: 004_create_audit_logs.sql
CREATE TABLE `audit_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(100) NULL,
  `entity_id` INT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` TEXT NULL,
  `metadata_json` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: 005_create_site_settings.sql
CREATE TABLE `site_settings` (
  `setting_key` VARCHAR(100) PRIMARY KEY,
  `setting_value` JSON NULL,
  `updated_by` INT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: 006_create_homepage_sections.sql
CREATE TABLE `homepage_sections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `section_id` VARCHAR(50) NOT NULL UNIQUE,
  `content_json` JSON NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `updated_by` INT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: 007_create_media_assets.sql
CREATE TABLE `media_assets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `original_name` VARCHAR(255) NOT NULL,
  `storage_name` VARCHAR(255) NOT NULL UNIQUE,
  `storage_path` VARCHAR(500) NOT NULL,
  `thumbnail_path` VARCHAR(500) NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `extension` VARCHAR(20) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL,
  `width` INT UNSIGNED NULL,
  `height` INT UNSIGNED NULL,
  `media_type` ENUM('image', 'video') NOT NULL,
  `title` VARCHAR(255) NULL,
  `alt_text` VARCHAR(255) NULL,
  `caption` TEXT NULL,
  `checksum` VARCHAR(64) NULL,
  `status` ENUM('active', 'archived', 'deleted') NOT NULL DEFAULT 'active',
  `uploaded_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  CONSTRAINT `fk_media_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: 008_create_media_tags.sql
CREATE TABLE `media_tags` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: 009_create_media_asset_tags.sql
CREATE TABLE `media_asset_tags` (
  `media_id` INT NOT NULL,
  `tag_id` INT NOT NULL,
  PRIMARY KEY (`media_id`, `tag_id`),
  CONSTRAINT `fk_media_asset_tags_media` FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_media_asset_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: 010_create_media_usages.sql
CREATE TABLE `media_usages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `media_id` INT NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT NOT NULL,
  `field_name` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_media_usages_media` FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: 011_create_event_categories.sql
CREATE TABLE IF NOT EXISTS event_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: 012_create_events.sql
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    title VARCHAR(160) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    category_id INT NOT NULL,
    excerpt VARCHAR(500) NULL,
    content TEXT NULL,
    event_date DATETIME NULL,
    location VARCHAR(200) NULL,
    cover_media_id INT NULL,
    
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    featured_on_home BOOLEAN NOT NULL DEFAULT FALSE,
    featured_order INT NULL,
    
    seo_title VARCHAR(70) NULL,
    seo_description VARCHAR(170) NULL,
    
    published_at TIMESTAMP NULL,
    
    created_by INT NULL,
    updated_by INT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (category_id) REFERENCES event_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (cover_media_id) REFERENCES media_assets(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL,
    
    INDEX idx_events_slug (slug),
    INDEX idx_events_status (status),
    INDEX idx_events_category_id (category_id),
    INDEX idx_events_featured (featured_on_home),
    INDEX idx_events_date (event_date),
    INDEX idx_events_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: 013_create_event_media.sql
CREATE TABLE IF NOT EXISTS event_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    media_id INT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    caption VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_event_media (event_id, media_id),
    INDEX idx_event_media_order (event_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: 014_seed_event_categories.sql
INSERT IGNORE INTO event_categories (name, slug, sort_order) VALUES
('Doğa Yürüyüşleri', 'doga-yuruyusleri', 10),
('Takımlı Oyunlar', 'takimli-oyunlar', 20),
('Kano Etkinlikleri', 'kano-etkinlikleri', 30),
('Salon Etkinlikleri', 'salon-etkinlikleri', 40);

-- Migration: 015_add_homepage_sections_sort_order.sql
ALTER TABLE homepage_sections 
ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

CREATE INDEX idx_homepage_sections_active_order ON homepage_sections(is_active, sort_order);

-- Migration: 016_seed_homepage_sections.sql
INSERT INTO homepage_sections (section_id, is_active, content_json, sort_order) VALUES
  ('hero', 1, '{}', 10),
  ('brand_band', 1, '{}', 20),
  ('branches', 1, '{}', 30),
  ('about', 1, '{}', 40),
  ('why_so3', 1, '{}', 50),
  ('process', 1, '{}', 60),
  ('trainers', 1, '{}', 70),
  ('performance', 1, '{}', 80),
  ('community', 1, '{}', 90),
  ('instagram', 1, '{}', 100),
  ('tour', 1, '{}', 110),
  ('contact', 1, '{}', 120)
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

-- Migration: 017_seed_homepage_content_core.sql
UPDATE homepage_sections 
SET content_json = '{
  "eyebrow": "SO3 / PERSONAL TRAINING",
  "headline_primary": "Herkese göre değil.",
  "headline_emphasis": "SANA GÖRE.",
  "support_text": "Kalabalığa değil, gelişimine odaklan.",
  "feature_left": "Kişiye özel antrenman",
  "feature_right": "Birebir takip",
  "primary_cta_label": "Ön görüşme planla",
  "primary_cta_target": "/#iletisim",
  "secondary_cta_label": "SO3\'ü keşfet",
  "secondary_cta_target": "/#branslar",
  "background_media_id": null
}'
WHERE section_id = 'hero' AND JSON_LENGTH(content_json) = 0;

UPDATE homepage_sections 
SET content_json = '{
  "items": [
    "Kişisel Diyetisyen ve Beslenme Programı",
    "Supplement Danışmanlığı",
    "Birebir Dersler",
    "Kişiye Özel Program",
    "Özel Etkinlikler",
    "Profesyonel Eğitmenler"
  ]
}'
WHERE section_id = 'brand_band' AND JSON_LENGTH(content_json) = 0;

UPDATE homepage_sections 
SET content_json = '{
  "eyebrow": "SO3 HAKKINDA",
  "headline_primary": "Kişiye Özel Bir",
  "headline_emphasis": "Antrenman Süreci",
  "paragraph_primary": "SO3, kişiye özel antrenman yaklaşımını merkeze alan; fitness, boks, pilates ve yoga disiplinlerini kişisel takip ile bir araya getiren bir Personal Training merkezidir. Burada amaç, herkese aynı programı uygulamak değil; hedefe, seviyeye ve gelişime göre şekillenen bir antrenman süreci oluşturmaktır.",
  "paragraph_secondary": "SO3 deneyimi yalnızca ders saatinden ibaret değildir. Antrenman süreci düzenli takip, kişiye özel program güncellemeleri ve sosyal etkinliklerle devam eder. Salon içinde başlayan birliktelik, SO3 topluluğuyla salon dışında da sürer.",
  "youtube_video_id": "0ojUK4qD8yE",
  "youtube_title": "SO3 PT Tanıtım Filmi"
}'
WHERE section_id = 'about' AND JSON_LENGTH(content_json) = 0;

-- Migration: 018_seed_homepage_content_why_process.sql
UPDATE homepage_sections 
SET content_json = '{
  "eyebrow": "NEDEN SO3",
  "headline_primary": "Tek tip program yok.",
  "headline_emphasis": "Sana göre bir sistem var.",
  "intro": "SO3\'te antrenman, kişiye göre planlanır ve çalıştığın eğitmenle birlikte takip edilir.",
  "items": [
    {
      "title": "Birebir Takip",
      "description": "Antrenmanın her anında antrenör gözetiminde her bir tekrarda en doğru ve sağlıklı sonuç"
    },
    {
      "title": "Kişiye Özel Program",
      "description": "Kalıplaşmış antrenman programları değil, size özel hazırlanmış en verimli antrenman programı ile çalışın"
    },
    {
      "title": "Özel Takip",
      "description": "Antrenörün sadece salonda değil günlük beslenme, takviye kullanımı ve su tüketimini her öğün ilgiyle birebir WhatsApp üzerinden takip eder"
    },
    {
      "title": "Sürekli Güncel",
      "description": "Programın her ay düzenli ölçümlerle kişisel gelişimin ve vücut tipinize en uygun şekilde güncellenir."
    }
  ]
}'
WHERE section_id = 'why_so3' AND JSON_LENGTH(content_json) = 0;

UPDATE homepage_sections 
SET content_json = '{
  "eyebrow": "NASIL ÇALIŞIR?",
  "headline_primary": "",
  "headline_emphasis": "",
  "steps": [
    {
      "title": "Seni tanırız."
    },
    {
      "title": "Sana göre planlarız."
    },
    {
      "title": "Birlikte çalışırız."
    },
    {
      "title": "Sen geliştikçe süreci güncelleriz."
    }
  ]
}'
WHERE section_id = 'process' AND JSON_LENGTH(content_json) = 0;

-- Migration: 019_create_branches.sql
CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(600) NOT NULL,
    cover_media_id INT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_by INT NULL,
    updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_branches_cover_media FOREIGN KEY (cover_media_id) REFERENCES media_assets(id) ON DELETE SET NULL,
    CONSTRAINT fk_branches_created_by FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
    CONSTRAINT fk_branches_updated_by FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_branches_is_active ON branches(is_active);
CREATE INDEX idx_branches_sort_order ON branches(sort_order);
CREATE INDEX idx_branches_deleted_at ON branches(deleted_at);

-- Migration: 020_create_branch_media.sql
CREATE TABLE IF NOT EXISTS branch_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    media_id INT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_branch_media_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_branch_media_media FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE,
    UNIQUE KEY uk_branch_media (branch_id, media_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_branch_media_sort ON branch_media(branch_id, sort_order);

-- Migration: 021_seed_branches.sql
INSERT IGNORE INTO branches (uuid, slug, name, description, sort_order, is_active, cover_media_id) VALUES
('93f6b9bc-9988-466d-91b5-6f9ec682c3f8', 'fitness', 'Fitness', 'Güç, kondisyon ve kişisel hedeflere göre şekillenen kişiye özel antrenman süreci.', 10, 1, NULL),
('53e20e8d-d779-46dc-a0fc-9418a0a863b1', 'boks', 'Boks', 'Kondisyon, refleks ve güç artırımı odaklı özel boks dersleri.', 20, 1, NULL),
('f7710375-9275-471a-b605-2d6ec22e0329', 'pilates', 'Pilates', 'Reformer pilates ile esneklik, merkez bölge gücü ve postür gelişimi.', 30, 1, NULL),
('c44238e8-356a-4661-8404-5853f0907e15', 'yoga', 'Yoga', 'Beden ve zihin bütünlüğü, esneklik ve denge odaklı pratikler.', 40, 1, NULL);

-- Migration: 022_create_trainers.sql
CREATE TABLE IF NOT EXISTS `trainers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `slug` VARCHAR(120) NOT NULL UNIQUE,
    `name` VARCHAR(120) NOT NULL,
    `role_title` VARCHAR(160) NOT NULL,
    `branch_id` INT NOT NULL,
    `bio` TEXT NULL,
    `profile_media_id` INT NULL,
    `instagram_username` VARCHAR(80) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    CONSTRAINT `fk_trainer_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_trainer_profile_media` FOREIGN KEY (`profile_media_id`) REFERENCES `media_assets` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_trainer_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_trainer_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_trainers_branch_id ON trainers(branch_id);
CREATE INDEX idx_trainers_is_active ON trainers(is_active);
CREATE INDEX idx_trainers_sort_order ON trainers(sort_order);
CREATE INDEX idx_trainers_deleted_at ON trainers(deleted_at);

-- Migration: 023_seed_trainers.sql
INSERT IGNORE INTO trainers (uuid, slug, name, role_title, branch_id, is_active, sort_order) VALUES
('b33362a2-3f8c-4f7d-bb62-4f3583fc11f1', 'selami-ozyildirim', 'Selami Özyıldırım', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 10),
('f6b8b082-f3f1-4c6e-826c-941cbcc8ff78', 'selim-ozyildirim', 'Selim Özyıldırım', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 20),
('a482b8a7-b1a7-47ab-a111-9a7065f4ffc0', 'sencer-ozyildirim', 'Sencer Özyıldırım', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 30),
('06b9b1d9-5f11-4777-a8fc-367dc3df6870', 'burak-corakcioglu', 'Burak Çorakçıoğlu', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 40),
('c8f921f0-0b31-4ec9-9749-d7ab0eefc542', 'eren-sencer-ozturk', 'Eren Sencer Öztürk', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 50),
('e9b5f403-f38f-43e5-8f6a-046cf3c1cdbd', 'mehmet-katipoglu', 'Mehmet Katipoğlu', 'Fitness Eğitmeni · Uzman Diyetisyen', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 60),
('2d08a54c-1d0b-4890-a548-c11df5fc2d0c', 'hulusi-unlu', 'Hulusi Ünlü', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 70),
('707be9e6-0be6-444d-ad50-482436f5653b', 'sahranur-sozer', 'Sahranur Sözer', 'Fitness Eğitmeni', (SELECT id FROM branches WHERE slug = 'fitness' LIMIT 1), 1, 80),
('82f252cf-eb2b-449e-b873-1081af298e79', 'mehmet-ates', 'Mehmet Ateş', 'Boks Eğitmeni', (SELECT id FROM branches WHERE slug = 'boks' LIMIT 1), 1, 90),
('5b4f62e8-d14d-4d7a-af1d-6e84d4da1c72', 'serhat-guler', 'Serhat Güler', 'Boks Eğitmeni', (SELECT id FROM branches WHERE slug = 'boks' LIMIT 1), 1, 100),
('73d8a631-c42e-4861-ab3f-a392e9d2874f', 'almira-tektas', 'Almira Tektaş', 'Pilates Eğitmeni', (SELECT id FROM branches WHERE slug = 'pilates' LIMIT 1), 1, 110),
('9591e1d0-1a73-4f96-8566-fbbaf2562d22', 'muniyra-karayagiz', 'Müniyra Karayağız', 'Pilates Eğitmeni', (SELECT id FROM branches WHERE slug = 'pilates' LIMIT 1), 1, 120),
('e5bc9d8c-eb4d-452f-aef6-821e25e3af99', 'irem-bulut', 'İrem Bulut', 'Yoga Eğitmeni', (SELECT id FROM branches WHERE slug = 'yoga' LIMIT 1), 1, 130);

-- Migration: 024_seed_global_settings.sql
INSERT IGNORE INTO `site_settings` (`setting_key`, `setting_value`) VALUES
('contact', '{"phone_primary":"05539573738","phone_secondary":"05072077797","whatsapp":"05523790777"}'),
('location', '{"address":"Y\u0131ld\u0131r\u0131m Beyaz\u0131t, A\u015f\u0131k Veysel Blv. No:69/4, 38030 Melikgazi / Kayseri","maps_directions_url":"https://www.google.com/maps/place/SO3+Selami+%C3%96zy%C4%B1ld%C4%B1r%C4%B1m+Personal+Trainer/@38.7129364,35.5318726,17z/data=!3m1!4b1!4m6!3m5!1s0x152b136a06abeb6b:0x572b063e20953544!8m2!3d38.7129364!4d35.5318726!16s%2Fg%2F11st_bxb2b","maps_embed_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3112.5937107116843!2d35.5292976756857!3d38.71293637176466!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x152b136a06abeb6b%3A0x572b063e20953544!2sSO3%20Selami%20%C3%96zy%C4%B1ld%C4%B1r%C4%B1m%20Personal%20Trainer!5e0!3m2!1sen!2str!4v1700000000000!5m2!1sen!2str"}'),
('social', '{"instagram_username":"so3pt"}'),
('tour', '{"matterport_model_id":"sXAzAwRLnGs"}'),
('business_hours', '{"enabled":false,"items":[]}');

-- Insert migration history to prevent migrate.php from rerunning these
INSERT INTO schema_migrations (migration, executed_at) VALUES
('001_create_schema_migrations.sql', CURRENT_TIMESTAMP),
('002_create_admins.sql', CURRENT_TIMESTAMP),
('003_create_admin_login_attempts.sql', CURRENT_TIMESTAMP),
('004_create_audit_logs.sql', CURRENT_TIMESTAMP),
('005_create_site_settings.sql', CURRENT_TIMESTAMP),
('006_create_homepage_sections.sql', CURRENT_TIMESTAMP),
('007_create_media_assets.sql', CURRENT_TIMESTAMP),
('008_create_media_tags.sql', CURRENT_TIMESTAMP),
('009_create_media_asset_tags.sql', CURRENT_TIMESTAMP),
('010_create_media_usages.sql', CURRENT_TIMESTAMP),
('011_create_event_categories.sql', CURRENT_TIMESTAMP),
('012_create_events.sql', CURRENT_TIMESTAMP),
('013_create_event_media.sql', CURRENT_TIMESTAMP),
('014_seed_event_categories.sql', CURRENT_TIMESTAMP),
('015_add_homepage_sections_sort_order.sql', CURRENT_TIMESTAMP),
('016_seed_homepage_sections.sql', CURRENT_TIMESTAMP),
('017_seed_homepage_content_core.sql', CURRENT_TIMESTAMP),
('018_seed_homepage_content_why_process.sql', CURRENT_TIMESTAMP),
('019_create_branches.sql', CURRENT_TIMESTAMP),
('020_create_branch_media.sql', CURRENT_TIMESTAMP),
('021_seed_branches.sql', CURRENT_TIMESTAMP),
('022_create_trainers.sql', CURRENT_TIMESTAMP),
('023_seed_trainers.sql', CURRENT_TIMESTAMP),
('024_seed_global_settings.sql', CURRENT_TIMESTAMP);

SET FOREIGN_KEY_CHECKS = 1;
