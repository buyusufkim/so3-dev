-- SO3 PT Canonical Fresh Install SQL
-- Generated from migrations 001-036
-- 
-- WARNING: This file is intended ONLY for a completely empty database.
-- Do NOT import this file into a live database or a database containing existing data.
-- For incremental updates to an existing database, run: php bin/migrate.php
-- 
-- Existing migrations in database/migrations remain authoritative for live deployments.
-- Regeneration of this file is required when a new migration is added.

SET @SO3_OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

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
  `role` ENUM('super_admin', 'admin', 'editor', 'trainer', 'reception') NOT NULL DEFAULT 'editor',
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
  `sort_order` INT NOT NULL DEFAULT 0,
  `updated_by` INT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL,
  INDEX idx_homepage_sections_active_order (is_active, sort_order)
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
UPDATE homepage_sections SET content_json = '{
  "eyebrow": "SO3 / PERSONAL TRAINING",
  "headline_primary": "Herkese göre değil.",
  "headline_emphasis": "SANA GÖRE.",
  "support_text": "Kalabalığa değil, gelişimine odaklan.",
  "feature_left": "Kişiye özel antrenman",
  "feature_right": "Birebir takip",
  "primary_cta_label": "Ön görüşme planla",
  "primary_cta_target": "/#iletisim",
  "secondary_cta_label": "SO3''ü keşfet",
  "secondary_cta_target": "/#branslar",
  "background_media_id": null
}'
WHERE section_id = 'hero' AND JSON_LENGTH(content_json) = 0;

UPDATE homepage_sections SET content_json = '{
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

UPDATE homepage_sections SET content_json = '{
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
  "intro": "SO3''te antrenman, kişiye göre planlanır ve çalıştığın eğitmenle birlikte takip edilir.",
  "items": [
    {
      "title": "Birebir Takip",
      "description": "Antrenman süreci, çalıştığın eğitmenin yönlendirmesi ve takibiyle ilerler."
    },
    {
      "title": "Kişiye Özel Program",
      "description": "Program; hedefin, seviyen ve gelişimin doğrultusunda kişiye özel olarak planlanır."
    },
    {
      "title": "Süreç Takibi",
      "description": "Antrenman süreci, ilerlemenin değerlendirilmesi ve ihtiyaçların doğrultusunda takip edilir."
    },
    {
      "title": "Gelişime Göre Güncel",
      "description": "Program, gelişimine göre değerlendirilir ve gerektiğinde güncellenir."
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
    `admin_id` INT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    CONSTRAINT `fk_trainer_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `uq_trainers_admin_id` UNIQUE (`admin_id`),
    CONSTRAINT `fk_trainers_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_trainer_profile_media` FOREIGN KEY (`profile_media_id`) REFERENCES `media_assets` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_trainer_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_trainer_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_trainers_branch_id ON trainers(branch_id);
CREATE INDEX idx_trainers_is_active ON trainers(is_active);
CREATE INDEX idx_trainers_sort_order ON trainers(sort_order);
CREATE INDEX idx_trainers_deleted_at ON trainers(deleted_at);

CREATE TABLE IF NOT EXISTS `members` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `first_name` VARCHAR(80) NOT NULL,
    `last_name` VARCHAR(80) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(120) NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `trainer_id` INT NULL,
    `membership_start_date` DATE NULL,
    `membership_end_date` DATE NULL,
    `emergency_contact_name` VARCHAR(120) NULL,
    `emergency_contact_phone` VARCHAR(20) NULL,
    `notes` TEXT NULL,
    `consent_given_at` DATETIME NULL,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,

    CONSTRAINT `fk_members_trainer` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_members_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_members_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_members_phone` ON `members`(`phone`);
CREATE INDEX `idx_members_email` ON `members`(`email`);
CREATE INDEX `idx_members_status` ON `members`(`status`);
CREATE INDEX `idx_members_trainer_id` ON `members`(`trainer_id`);
CREATE INDEX `idx_members_membership_end_date` ON `members`(`membership_end_date`);
CREATE INDEX `idx_members_deleted_at` ON `members`(`deleted_at`);
CREATE INDEX `idx_members_status_deleted` ON `members`(`status`, `deleted_at`);
CREATE INDEX `idx_members_trainer_status_deleted` ON `members`(`trainer_id`, `status`, `deleted_at`);

CREATE TABLE IF NOT EXISTS `training_programs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `member_id` INT NOT NULL,
    `trainer_id` INT NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `status` ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft',
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `notes` TEXT NULL,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    CONSTRAINT `fk_training_programs_member_id` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_training_programs_trainer_id` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_training_programs_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_training_programs_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_training_programs_member_id` ON `training_programs`(`member_id`);
CREATE INDEX `idx_training_programs_trainer_id` ON `training_programs`(`trainer_id`);
CREATE INDEX `idx_training_programs_status` ON `training_programs`(`status`);
CREATE INDEX `idx_training_programs_deleted_at` ON `training_programs`(`deleted_at`);
CREATE INDEX `idx_training_programs_member_status_deleted` ON `training_programs`(`member_id`, `status`, `deleted_at`);
CREATE INDEX `idx_training_programs_trainer_status_deleted` ON `training_programs`(`trainer_id`, `status`, `deleted_at`);

CREATE TABLE IF NOT EXISTS `program_exercises` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `program_id` INT NOT NULL,
    `exercise_name` VARCHAR(160) NOT NULL,
    `sets` SMALLINT UNSIGNED NULL,
    `repetitions` VARCHAR(40) NULL,
    `duration_seconds` INT UNSIGNED NULL,
    `rest_seconds` SMALLINT UNSIGNED NULL,
    `instructions` VARCHAR(1000) NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_program_exercises_program_id` FOREIGN KEY (`program_id`) REFERENCES `training_programs`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_program_exercises_program_sort` ON `program_exercises`(`program_id`, `sort_order`);

-- Migration: 032_create_member_progress.sql
-- Description: Creates member_measurements and member_progress_notes tables for operational fitness progress tracking.
-- Note: Contains general fitness training and body metrics only. Sensitive medical data must not be stored.

CREATE TABLE IF NOT EXISTS `member_measurements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `member_id` INT NOT NULL,
    `trainer_id` INT NOT NULL,
    `measured_at` DATETIME NOT NULL,
    `weight_kg` DECIMAL(6,2) NULL,
    `body_fat_percent` DECIMAL(5,2) NULL,
    `chest_cm` DECIMAL(6,2) NULL,
    `waist_cm` DECIMAL(6,2) NULL,
    `hip_cm` DECIMAL(6,2) NULL,
    `arm_cm` DECIMAL(6,2) NULL,
    `thigh_cm` DECIMAL(6,2) NULL,
    `notes` VARCHAR(1000) NULL COMMENT 'General training and measurement notes',
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    CONSTRAINT `fk_member_measurements_member_id` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_member_measurements_trainer_id` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_member_measurements_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_member_measurements_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_member_measurements_member_id` ON `member_measurements`(`member_id`);
CREATE INDEX `idx_member_measurements_trainer_id` ON `member_measurements`(`trainer_id`);
CREATE INDEX `idx_member_measurements_measured_at` ON `member_measurements`(`measured_at`);
CREATE INDEX `idx_member_measurements_deleted_at` ON `member_measurements`(`deleted_at`);
CREATE INDEX `idx_member_measurements_member_measured_deleted` ON `member_measurements`(`member_id`, `measured_at`, `deleted_at`);
CREATE INDEX `idx_member_measurements_trainer_measured_deleted` ON `member_measurements`(`trainer_id`, `measured_at`, `deleted_at`);

CREATE TABLE IF NOT EXISTS `member_progress_notes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `member_id` INT NOT NULL,
    `trainer_id` INT NOT NULL,
    `recorded_at` DATETIME NOT NULL,
    `note` TEXT NOT NULL COMMENT 'General training progress note',
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    CONSTRAINT `fk_member_progress_notes_member_id` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_member_progress_notes_trainer_id` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_member_progress_notes_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_member_progress_notes_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_member_progress_notes_member_id` ON `member_progress_notes`(`member_id`);
CREATE INDEX `idx_member_progress_notes_trainer_id` ON `member_progress_notes`(`trainer_id`);
CREATE INDEX `idx_member_progress_notes_recorded_at` ON `member_progress_notes`(`recorded_at`);
CREATE INDEX `idx_member_progress_notes_deleted_at` ON `member_progress_notes`(`deleted_at`);
CREATE INDEX `idx_member_progress_notes_member_recorded_deleted` ON `member_progress_notes`(`member_id`, `recorded_at`, `deleted_at`);
CREATE INDEX `idx_member_progress_notes_trainer_recorded_deleted` ON `member_progress_notes`(`trainer_id`, `recorded_at`, `deleted_at`);

-- Migration: 033_create_member_visits.sql
-- Description: Creates member_visits table for check-in/check-out and occupancy tracking.

CREATE TABLE IF NOT EXISTS `member_visits` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `member_id` INT NOT NULL,
    `checked_in_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `checked_out_at` DATETIME NULL,
    `checked_in_by` INT NOT NULL,
    `checked_out_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_member_visits_member_id` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_member_visits_checked_in_by` FOREIGN KEY (`checked_in_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_member_visits_checked_out_by` FOREIGN KEY (`checked_out_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_member_visits_member_open` ON `member_visits`(`member_id`, `checked_out_at`);
CREATE INDEX `idx_member_visits_open_checked_in` ON `member_visits`(`checked_out_at`, `checked_in_at`);

-- Migration: 034_create_membership_renewals.sql
-- Description: Creates append-only membership_renewals table to track membership history.

CREATE TABLE IF NOT EXISTS `membership_renewals` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `member_id` INT NOT NULL,
    `previous_start_date` DATE NULL,
    `previous_end_date` DATE NULL,
    `new_start_date` DATE NOT NULL,
    `new_end_date` DATE NOT NULL,
    `renewed_by` INT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_membership_renewals_member_id` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_membership_renewals_renewed_by` FOREIGN KEY (`renewed_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_membership_renewals_member_created` ON `membership_renewals`(`member_id`, `created_at`);

-- Migration: 035_create_appointments.sql
-- Description: Creates appointments table for 1-on-1 PT sessions scheduling.

CREATE TABLE IF NOT EXISTS `appointments` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `member_id` INT NOT NULL,
    `trainer_id` INT NOT NULL,
    `starts_at` DATETIME NOT NULL,
    `ends_at` DATETIME NOT NULL,
    `status` ENUM('scheduled', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'scheduled',
    `cancellation_reason` VARCHAR(255) NULL,
    `cancelled_by` INT NULL,
    `cancelled_at` DATETIME NULL,
    `completed_by` INT NULL,
    `completed_at` DATETIME NULL,
    `no_show_by` INT NULL,
    `no_show_at` DATETIME NULL,
    `created_by` INT NOT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_appointments_member_id` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_appointments_trainer_id` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_appointments_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_appointments_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_appointments_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_appointments_completed_by` FOREIGN KEY (`completed_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_appointments_no_show_by` FOREIGN KEY (`no_show_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_appointments_trainer_schedule` ON `appointments`(`trainer_id`, `status`, `starts_at`, `ends_at`);
CREATE INDEX `idx_appointments_member_schedule` ON `appointments`(`member_id`, `status`, `starts_at`, `ends_at`);
CREATE INDEX `idx_appointments_calendar` ON `appointments`(`starts_at`, `ends_at`, `status`);

-- Migration: 036_create_appointment_reschedules.sql
-- Description: Creates append-only history table for appointment time modifications.

CREATE TABLE IF NOT EXISTS `appointment_reschedules` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `appointment_id` BIGINT UNSIGNED NOT NULL,
    `previous_starts_at` DATETIME NOT NULL,
    `previous_ends_at` DATETIME NOT NULL,
    `new_starts_at` DATETIME NOT NULL,
    `new_ends_at` DATETIME NOT NULL,
    `rescheduled_by` INT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_appointment_reschedules_appointment_id` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_appointment_reschedules_rescheduled_by` FOREIGN KEY (`rescheduled_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_appointment_reschedules_appointment_created` ON `appointment_reschedules`(`appointment_id`, `created_at`);





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
('location', '{"address":"Yıldırım Beyazıt, Aşık Veysel Blv. No:69/4, 38030 Melikgazi / Kayseri","maps_directions_url":"https://www.google.com/maps/place/SO3+Selami+%C3%96zy%C4%B1ld%C4%B1r%C4%B1m+Personal+Trainer/@38.7129364,35.5318726,17z/data=!3m1!4b1!4m6!3m5!1s0x152b136a06abeb6b:0x572b063e20953544!8m2!3d38.7129364!4d35.5318726!16s%2Fg%2F11st_bxb2b","maps_embed_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3112.5937107116843!2d35.5292976756857!3d38.71293637176466!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x152b136a06abeb6b%3A0x572b063e20953544!2sSO3%20Selami%20%C3%96zy%C4%B1ld%C4%B1r%C4%B1m%20Personal%20Trainer!5e0!3m2!1sen!2str!4v1700000000000!5m2!1sen!2str"}'),
('social', '{"instagram_username":"so3pt"}'),
('tour', '{"matterport_model_id":"sXAzAwRLnGs"}'),
('business_hours', '{"enabled":false,"items":[]}');

-- Migration: 027_seed_canonical_demo_media.sql
-- Register the canonical demo media already shipped under public/media/so3.
-- Existing customized homepage, branch, and event media remains untouched.

START TRANSACTION;

INSERT IGNORE INTO media_assets
(uuid, original_name, storage_name, storage_path, thumbnail_path, mime_type, extension, file_size, width, height, media_type, title, alt_text, status)
VALUES
('02700000-0000-4000-8000-000000000001', 'branch-boxing-01.webp', 'so3-demo-branch-boxing-01.webp', 'media/so3/branch-boxing-01.webp', NULL, 'image/webp', 'webp', 254196, 1350, 2400, 'image', 'SO3 Boks Teknik', 'SO3 boks teknik çalışması', 'active'),
('02700000-0000-4000-8000-000000000002', 'branch-boxing-02.webp', 'so3-demo-branch-boxing-02.webp', 'media/so3/branch-boxing-02.webp', NULL, 'image/webp', 'webp', 176776, 1350, 2400, 'image', 'SO3 Boks Kondisyon', 'SO3 boks kondisyon çalışması', 'active'),
('02700000-0000-4000-8000-000000000003', 'branch-boxing.webp', 'so3-demo-branch-boxing.webp', 'media/so3/branch-boxing.webp', NULL, 'image/webp', 'webp', 263112, 2400, 1351, 'image', 'SO3 Boks', 'SO3 boks alanı', 'active'),
('02700000-0000-4000-8000-000000000004', 'branch-fitness.webp', 'so3-demo-branch-fitness.webp', 'media/so3/branch-fitness.webp', NULL, 'image/webp', 'webp', 364338, 2400, 1351, 'image', 'SO3 Fitness', 'SO3 fitness alanı', 'active'),
('02700000-0000-4000-8000-000000000005', 'branch-pilates-01.webp', 'so3-demo-branch-pilates-01.webp', 'media/so3/branch-pilates-01.webp', NULL, 'image/webp', 'webp', 228870, 2400, 1351, 'image', 'SO3 Pilates', 'SO3 pilates alanı', 'active'),
('02700000-0000-4000-8000-000000000006', 'branch-yoga-01.webp', 'so3-demo-branch-yoga-01.webp', 'media/so3/branch-yoga-01.webp', NULL, 'image/webp', 'webp', 104974, 1350, 2400, 'image', 'SO3 Yoga Detay 1', 'SO3 yoga çalışması', 'active'),
('02700000-0000-4000-8000-000000000007', 'branch-yoga-02.webp', 'so3-demo-branch-yoga-02.webp', 'media/so3/branch-yoga-02.webp', NULL, 'image/webp', 'webp', 103614, 1350, 2400, 'image', 'SO3 Yoga Detay 2', 'SO3 yoga çalışması', 'active'),
('02700000-0000-4000-8000-000000000008', 'branch-yoga-03.webp', 'so3-demo-branch-yoga-03.webp', 'media/so3/branch-yoga-03.webp', NULL, 'image/webp', 'webp', 116620, 1350, 2400, 'image', 'SO3 Yoga Detay 3', 'SO3 yoga çalışması', 'active'),
('02700000-0000-4000-8000-000000000009', 'branch-yoga-pilates.webp', 'so3-demo-branch-yoga-pilates.webp', 'media/so3/branch-yoga-pilates.webp', NULL, 'image/webp', 'webp', 228870, 2400, 1351, 'image', 'SO3 Yoga ve Pilates', 'SO3 yoga ve pilates alanı', 'active'),
('02700000-0000-4000-8000-000000000010', 'community-group-training.webp', 'so3-demo-community-group-training.webp', 'media/so3/community-group-training.webp', NULL, 'image/webp', 'webp', 165324, 1350, 2400, 'image', 'SO3 Grup Antrenmanı', 'SO3 topluluğu grup antrenmanı', 'active'),
('02700000-0000-4000-8000-000000000011', 'community-hali-saha-alt.webp', 'so3-demo-community-hali-saha-alt.webp', 'media/so3/community-hali-saha-alt.webp', NULL, 'image/webp', 'webp', 95812, 1080, 1350, 'image', 'SO3 Halı Saha Alternatif', 'SO3 topluluğu halı saha etkinliği', 'active'),
('02700000-0000-4000-8000-000000000012', 'community-hali-saha.webp', 'so3-demo-community-hali-saha.webp', 'media/so3/community-hali-saha.webp', NULL, 'image/webp', 'webp', 140094, 1080, 1350, 'image', 'SO3 Halı Saha', 'SO3 topluluğu halı saha etkinliği', 'active'),
('02700000-0000-4000-8000-000000000013', 'community-kano.webp', 'so3-demo-community-kano.webp', 'media/so3/community-kano.webp', NULL, 'image/webp', 'webp', 378556, 1350, 2400, 'image', 'SO3 Kano', 'SO3 topluluğu kano etkinliği', 'active'),
('02700000-0000-4000-8000-000000000014', 'community-nature-walk.webp', 'so3-demo-community-nature-walk.webp', 'media/so3/community-nature-walk.webp', NULL, 'image/webp', 'webp', 506524, 1350, 2400, 'image', 'SO3 Doğa Yürüyüşü', 'SO3 topluluğu doğa yürüyüşü', 'active'),
('02700000-0000-4000-8000-000000000015', 'community-team-games.webp', 'so3-demo-community-team-games.webp', 'media/so3/community-team-games.webp', NULL, 'image/webp', 'webp', 258194, 1350, 2400, 'image', 'SO3 Takımlı Oyunlar', 'SO3 topluluğu takım oyunları', 'active'),
('02700000-0000-4000-8000-000000000016', 'discovery-boxing.webp', 'so3-demo-discovery-boxing.webp', 'media/so3/discovery-boxing.webp', NULL, 'image/webp', 'webp', 263388, 2400, 1351, 'image', 'SO3 Boks Detay', 'SO3 boks antrenmanı', 'active'),
('02700000-0000-4000-8000-000000000017', 'discovery-fitness.webp', 'so3-demo-discovery-fitness.webp', 'media/so3/discovery-fitness.webp', NULL, 'image/webp', 'webp', 331432, 2400, 1351, 'image', 'SO3 Fitness Detay', 'SO3 fitness antrenman alanı', 'active'),
('02700000-0000-4000-8000-000000000018', 'discovery-pt.webp', 'so3-demo-discovery-pt.webp', 'media/so3/discovery-pt.webp', NULL, 'image/webp', 'webp', 164650, 1600, 2400, 'image', 'SO3 Personal Training', 'SO3 birebir personal training', 'active'),
('02700000-0000-4000-8000-000000000019', 'discovery-vitamin-bar.webp', 'so3-demo-discovery-vitamin-bar.webp', 'media/so3/discovery-vitamin-bar.webp', NULL, 'image/webp', 'webp', 291314, 2400, 1351, 'image', 'SO3 Vitamin Bar', 'SO3 vitamin bar alanı', 'active'),
('02700000-0000-4000-8000-000000000020', 'discovery-yoga.webp', 'so3-demo-discovery-yoga.webp', 'media/so3/discovery-yoga.webp', NULL, 'image/webp', 'webp', 138874, 2400, 1351, 'image', 'SO3 Yoga', 'SO3 yoga alanı', 'active'),
('02700000-0000-4000-8000-000000000021', 'cover.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-cover.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/cover.webp', 'media/so3/community-nature-walk.webp', 'image/webp', 'webp', 260044, 1600, 900, 'image', 'Gomeda Vadisi Yürüyüşü Kapak', 'SO3 Gomeda Vadisi Yürüyüşü etkinliği', 'active'),
('02700000-0000-4000-8000-000000000022', '01.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-01.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/01.webp', NULL, 'image/webp', 'webp', 490298, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 01', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000023', '02.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-02.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/02.webp', NULL, 'image/webp', 'webp', 610740, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 02', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000024', '03.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-03.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/03.webp', NULL, 'image/webp', 'webp', 751676, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 03', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000025', '04.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-04.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/04.webp', NULL, 'image/webp', 'webp', 426642, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 04', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000026', '05.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-05.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/05.webp', NULL, 'image/webp', 'webp', 407128, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 05', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000027', '06.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-06.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/06.webp', NULL, 'image/webp', 'webp', 506660, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 06', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000028', '07.webp', 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-07.webp', 'media/so3/events/gomeda-vadisi-yuruyusu/gallery/07.webp', NULL, 'image/webp', 'webp', 604434, 1440, 2560, 'image', 'Gomeda Vadisi Yürüyüşü Galeri 07', 'SO3 Gomeda Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000029', 'cover.webp', 'so3-demo-events-kano-etkinligi-cover.webp', 'media/so3/events/kano-etkinligi/cover.webp', 'media/so3/community-kano.webp', 'image/webp', 'webp', 263282, 1600, 900, 'image', 'Kano Etkinliği Kapak', 'SO3 Kano Etkinliği etkinliği', 'active'),
('02700000-0000-4000-8000-000000000030', '01.webp', 'so3-demo-events-kano-etkinligi-gallery-01.webp', 'media/so3/events/kano-etkinligi/gallery/01.webp', NULL, 'image/webp', 'webp', 365306, 1440, 2560, 'image', 'Kano Etkinliği Galeri 01', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000031', '02.webp', 'so3-demo-events-kano-etkinligi-gallery-02.webp', 'media/so3/events/kano-etkinligi/gallery/02.webp', NULL, 'image/webp', 'webp', 335648, 1440, 2560, 'image', 'Kano Etkinliği Galeri 02', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000032', '03.webp', 'so3-demo-events-kano-etkinligi-gallery-03.webp', 'media/so3/events/kano-etkinligi/gallery/03.webp', NULL, 'image/webp', 'webp', 480086, 1440, 2560, 'image', 'Kano Etkinliği Galeri 03', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000033', '04.webp', 'so3-demo-events-kano-etkinligi-gallery-04.webp', 'media/so3/events/kano-etkinligi/gallery/04.webp', NULL, 'image/webp', 'webp', 471002, 1440, 2560, 'image', 'Kano Etkinliği Galeri 04', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000034', '05.webp', 'so3-demo-events-kano-etkinligi-gallery-05.webp', 'media/so3/events/kano-etkinligi/gallery/05.webp', NULL, 'image/webp', 'webp', 283602, 1440, 2560, 'image', 'Kano Etkinliği Galeri 05', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000035', '06.webp', 'so3-demo-events-kano-etkinligi-gallery-06.webp', 'media/so3/events/kano-etkinligi/gallery/06.webp', NULL, 'image/webp', 'webp', 379408, 1440, 2560, 'image', 'Kano Etkinliği Galeri 06', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000036', '07.webp', 'so3-demo-events-kano-etkinligi-gallery-07.webp', 'media/so3/events/kano-etkinligi/gallery/07.webp', NULL, 'image/webp', 'webp', 483446, 1440, 2560, 'image', 'Kano Etkinliği Galeri 07', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000037', '08.webp', 'so3-demo-events-kano-etkinligi-gallery-08.webp', 'media/so3/events/kano-etkinligi/gallery/08.webp', NULL, 'image/webp', 'webp', 373622, 1440, 2560, 'image', 'Kano Etkinliği Galeri 08', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000038', '09.webp', 'so3-demo-events-kano-etkinligi-gallery-09.webp', 'media/so3/events/kano-etkinligi/gallery/09.webp', NULL, 'image/webp', 'webp', 353534, 1440, 2560, 'image', 'Kano Etkinliği Galeri 09', 'SO3 Kano Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000039', 'cover.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-cover.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/cover.webp', NULL, 'image/webp', 'webp', 452232, 1600, 900, 'image', 'Kırlangıç Vadisi Yürüyüşü Kapak', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliği', 'active'),
('02700000-0000-4000-8000-000000000040', '01.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-01.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/01.webp', NULL, 'image/webp', 'webp', 432024, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 01', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000041', '02.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-02.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/02.webp', NULL, 'image/webp', 'webp', 546356, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 02', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000042', '03.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-03.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/03.webp', NULL, 'image/webp', 'webp', 376114, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 03', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000043', '04.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-04.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/04.webp', NULL, 'image/webp', 'webp', 927872, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 04', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000044', '05.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-05.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/05.webp', NULL, 'image/webp', 'webp', 150296, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 05', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000045', '06.webp', 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-06.webp', 'media/so3/events/kirlangic-vadisi-yuruyusu/gallery/06.webp', NULL, 'image/webp', 'webp', 199664, 1440, 2560, 'image', 'Kırlangıç Vadisi Yürüyüşü Galeri 06', 'SO3 Kırlangıç Vadisi Yürüyüşü etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000046', 'cover.webp', 'so3-demo-events-mobilite-grup-dersi-cover.webp', 'media/so3/events/mobilite-grup-dersi/cover.webp', 'media/so3/community-group-training.webp', 'image/webp', 'webp', 113184, 1600, 900, 'image', 'Mobilite Grup Dersi Kapak', 'SO3 Mobilite Grup Dersi etkinliği', 'active'),
('02700000-0000-4000-8000-000000000047', '01.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-01.webp', 'media/so3/events/mobilite-grup-dersi/gallery/01.webp', NULL, 'image/webp', 'webp', 163884, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 01', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000048', '02.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-02.webp', 'media/so3/events/mobilite-grup-dersi/gallery/02.webp', NULL, 'image/webp', 'webp', 219092, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 02', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000049', '03.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-03.webp', 'media/so3/events/mobilite-grup-dersi/gallery/03.webp', NULL, 'image/webp', 'webp', 238954, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 03', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000050', '04.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-04.webp', 'media/so3/events/mobilite-grup-dersi/gallery/04.webp', NULL, 'image/webp', 'webp', 278276, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 04', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000051', '05.webp', 'so3-demo-events-mobilite-grup-dersi-gallery-05.webp', 'media/so3/events/mobilite-grup-dersi/gallery/05.webp', NULL, 'image/webp', 'webp', 178948, 1440, 2560, 'image', 'Mobilite Grup Dersi Galeri 05', 'SO3 Mobilite Grup Dersi etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000052', 'cover.webp', 'so3-demo-events-plaj-voleybolu-cover.webp', 'media/so3/events/plaj-voleybolu/cover.webp', 'media/so3/community-hali-saha-alt.webp', 'image/webp', 'webp', 220218, 1600, 900, 'image', 'Plaj Voleybolu Kapak', 'SO3 Plaj Voleybolu etkinliği', 'active'),
('02700000-0000-4000-8000-000000000053', '01.webp', 'so3-demo-events-plaj-voleybolu-gallery-01.webp', 'media/so3/events/plaj-voleybolu/gallery/01.webp', NULL, 'image/webp', 'webp', 176176, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 01', 'SO3 Plaj Voleybolu etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000054', '02.webp', 'so3-demo-events-plaj-voleybolu-gallery-02.webp', 'media/so3/events/plaj-voleybolu/gallery/02.webp', NULL, 'image/webp', 'webp', 188348, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 02', 'SO3 Plaj Voleybolu etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000055', '03.webp', 'so3-demo-events-plaj-voleybolu-gallery-03.webp', 'media/so3/events/plaj-voleybolu/gallery/03.webp', NULL, 'image/webp', 'webp', 154064, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 03', 'SO3 Plaj Voleybolu etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000056', '04.webp', 'so3-demo-events-plaj-voleybolu-gallery-04.webp', 'media/so3/events/plaj-voleybolu/gallery/04.webp', NULL, 'image/webp', 'webp', 388444, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 04', 'SO3 Plaj Voleybolu etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000057', '05.webp', 'so3-demo-events-plaj-voleybolu-gallery-05.webp', 'media/so3/events/plaj-voleybolu/gallery/05.webp', NULL, 'image/webp', 'webp', 182954, 1440, 2560, 'image', 'Plaj Voleybolu Galeri 05', 'SO3 Plaj Voleybolu etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000058', 'cover.webp', 'so3-demo-events-voleybol-etkinligi-cover.webp', 'media/so3/events/voleybol-etkinligi/cover.webp', 'media/so3/community-team-games.webp', 'image/webp', 'webp', 97232, 1600, 900, 'image', 'Voleybol Etkinliği Kapak', 'SO3 Voleybol Etkinliği etkinliği', 'active'),
('02700000-0000-4000-8000-000000000059', '01.webp', 'so3-demo-events-voleybol-etkinligi-gallery-01.webp', 'media/so3/events/voleybol-etkinligi/gallery/01.webp', NULL, 'image/webp', 'webp', 247820, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 01', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000060', '02.webp', 'so3-demo-events-voleybol-etkinligi-gallery-02.webp', 'media/so3/events/voleybol-etkinligi/gallery/02.webp', NULL, 'image/webp', 'webp', 223324, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 02', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000061', '03.webp', 'so3-demo-events-voleybol-etkinligi-gallery-03.webp', 'media/so3/events/voleybol-etkinligi/gallery/03.webp', NULL, 'image/webp', 'webp', 295842, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 03', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000062', '04.webp', 'so3-demo-events-voleybol-etkinligi-gallery-04.webp', 'media/so3/events/voleybol-etkinligi/gallery/04.webp', NULL, 'image/webp', 'webp', 119016, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 04', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000063', '05.webp', 'so3-demo-events-voleybol-etkinligi-gallery-05.webp', 'media/so3/events/voleybol-etkinligi/gallery/05.webp', NULL, 'image/webp', 'webp', 114916, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 05', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000064', '06.webp', 'so3-demo-events-voleybol-etkinligi-gallery-06.webp', 'media/so3/events/voleybol-etkinligi/gallery/06.webp', NULL, 'image/webp', 'webp', 286040, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 06', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000065', '07.webp', 'so3-demo-events-voleybol-etkinligi-gallery-07.webp', 'media/so3/events/voleybol-etkinligi/gallery/07.webp', NULL, 'image/webp', 'webp', 257234, 1440, 2560, 'image', 'Voleybol Etkinliği Galeri 07', 'SO3 Voleybol Etkinliği etkinliğinden bir an', 'active'),
('02700000-0000-4000-8000-000000000066', 'hero-so3.webp', 'so3-demo-hero-so3.webp', 'media/so3/hero-so3.webp', NULL, 'image/webp', 'webp', 190524, 2400, 1600, 'image', 'SO3 Ana Sayfa Kapak', 'SO3 Personal Training antrenman alanı', 'active'),
('02700000-0000-4000-8000-000000000067', 'performance.webp', 'so3-demo-performance.webp', 'media/so3/performance.webp', NULL, 'image/webp', 'webp', 359640, 1600, 2400, 'image', 'SO3 Performans', 'SO3 performans antrenmanı', 'active');

SET @SO3_DEMO_HERO_ID = (
  SELECT id FROM media_assets WHERE storage_name = 'so3-demo-hero-so3.webp' LIMIT 1
);
SET @SO3_DEMO_PERFORMANCE_ID = (
  SELECT id FROM media_assets WHERE storage_name = 'so3-demo-performance.webp' LIMIT 1
);

UPDATE homepage_sections
SET content_json = JSON_SET(content_json, '$.background_media_id', @SO3_DEMO_HERO_ID)
WHERE section_id = 'hero'
  AND @SO3_DEMO_HERO_ID IS NOT NULL
  AND (
    JSON_EXTRACT(content_json, '$.background_media_id') IS NULL
    OR JSON_TYPE(JSON_EXTRACT(content_json, '$.background_media_id')) = 'NULL'
  );

UPDATE homepage_sections
SET content_json = JSON_SET(content_json, '$.background_media_id', @SO3_DEMO_PERFORMANCE_ID)
WHERE section_id = 'performance'
  AND @SO3_DEMO_PERFORMANCE_ID IS NOT NULL
  AND (
    JSON_EXTRACT(content_json, '$.background_media_id') IS NULL
    OR JSON_TYPE(JSON_EXTRACT(content_json, '$.background_media_id')) = 'NULL'
  );

INSERT INTO media_usages (media_id, entity_type, entity_id, field_name)
SELECT CAST(JSON_UNQUOTE(JSON_EXTRACT(hs.content_json, '$.background_media_id')) AS UNSIGNED),
       'homepage_section', hs.id, 'background'
FROM homepage_sections hs
WHERE hs.section_id IN ('hero', 'performance')
  AND JSON_UNQUOTE(JSON_EXTRACT(hs.content_json, '$.background_media_id')) REGEXP '^[0-9]+$'
  AND NOT EXISTS (
    SELECT 1 FROM media_usages mu
    WHERE mu.media_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(hs.content_json, '$.background_media_id')) AS UNSIGNED)
      AND mu.entity_type = 'homepage_section'
      AND mu.entity_id = hs.id
      AND mu.field_name = 'background'
  );

UPDATE branches
SET cover_media_id = (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-branch-fitness.webp' LIMIT 1)
WHERE slug = 'fitness' AND cover_media_id IS NULL AND deleted_at IS NULL;

UPDATE branches
SET cover_media_id = (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-branch-boxing.webp' LIMIT 1)
WHERE slug = 'boks' AND cover_media_id IS NULL AND deleted_at IS NULL;

UPDATE branches
SET cover_media_id = (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-branch-pilates-01.webp' LIMIT 1)
WHERE slug = 'pilates' AND cover_media_id IS NULL AND deleted_at IS NULL;

UPDATE branches
SET cover_media_id = (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-discovery-yoga.webp' LIMIT 1)
WHERE slug = 'yoga' AND cover_media_id IS NULL AND deleted_at IS NULL;

INSERT INTO branch_media (branch_id, media_id, sort_order)
SELECT b.id, ma.id, seed.sort_order
FROM branches b
JOIN (
  SELECT 'fitness' AS branch_slug, 'so3-demo-branch-fitness.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT 'fitness' AS branch_slug, 'so3-demo-discovery-fitness.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT 'fitness' AS branch_slug, 'so3-demo-discovery-pt.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT 'fitness' AS branch_slug, 'so3-demo-performance.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT 'boks' AS branch_slug, 'so3-demo-branch-boxing.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT 'boks' AS branch_slug, 'so3-demo-discovery-boxing.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT 'boks' AS branch_slug, 'so3-demo-branch-boxing-01.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT 'boks' AS branch_slug, 'so3-demo-branch-boxing-02.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT 'pilates' AS branch_slug, 'so3-demo-branch-pilates-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT 'yoga' AS branch_slug, 'so3-demo-discovery-yoga.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT 'yoga' AS branch_slug, 'so3-demo-branch-yoga-01.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT 'yoga' AS branch_slug, 'so3-demo-branch-yoga-02.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT 'yoga' AS branch_slug, 'so3-demo-branch-yoga-03.webp' AS storage_name, 40 AS sort_order
) seed ON seed.branch_slug = b.slug
JOIN media_assets ma ON ma.storage_name = seed.storage_name
WHERE b.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM branch_media existing WHERE existing.branch_id = b.id
  );

INSERT INTO media_usages (media_id, entity_type, entity_id, field_name)
SELECT b.cover_media_id, 'branch', b.id, 'cover'
FROM branches b
WHERE b.cover_media_id IS NOT NULL
  AND b.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM media_usages mu
    WHERE mu.media_id = b.cover_media_id
      AND mu.entity_type = 'branch'
      AND mu.entity_id = b.id
      AND mu.field_name = 'cover'
  );

INSERT INTO media_usages (media_id, entity_type, entity_id, field_name)
SELECT bm.media_id, 'branch', bm.branch_id, 'gallery'
FROM branch_media bm
WHERE NOT EXISTS (
  SELECT 1 FROM media_usages mu
  WHERE mu.media_id = bm.media_id
    AND mu.entity_type = 'branch'
    AND mu.entity_id = bm.branch_id
    AND mu.field_name = 'gallery'
);

INSERT IGNORE INTO events
(uuid, title, slug, category_id, excerpt, content, event_date, location, cover_media_id,
 status, featured_on_home, featured_order, seo_title, seo_description, published_at)
VALUES
('02710000-0000-4000-8000-000000000001', 'Gomeda Vadisi Yürüyüşü', 'gomeda-vadisi-yuruyusu', (SELECT id FROM event_categories WHERE slug = 'doga-yuruyusleri' LIMIT 1), 'SO3 topluluğunun Gomeda Vadisi yürüyüşünden seçili anlar.', NULL, NULL, NULL, (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-events-gomeda-vadisi-yuruyusu-cover.webp' LIMIT 1), 'published', 1, 10, 'Gomeda Vadisi Yürüyüşü | SO3 PT', 'SO3 topluluğunun Gomeda Vadisi yürüyüşünden seçili anlar.', CURRENT_TIMESTAMP),
('02710000-0000-4000-8000-000000000002', 'Kano Etkinliği', 'kano-etkinligi', (SELECT id FROM event_categories WHERE slug = 'kano-etkinlikleri' LIMIT 1), 'SO3 topluluğunun kano etkinliğinden seçili anlar.', NULL, NULL, NULL, (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-events-kano-etkinligi-cover.webp' LIMIT 1), 'published', 1, 20, 'Kano Etkinliği | SO3 PT', 'SO3 topluluğunun kano etkinliğinden seçili anlar.', CURRENT_TIMESTAMP),
('02710000-0000-4000-8000-000000000003', 'Voleybol Etkinliği', 'voleybol-etkinligi', (SELECT id FROM event_categories WHERE slug = 'takimli-oyunlar' LIMIT 1), 'SO3 topluluğunun voleybol etkinliğinden seçili anlar.', NULL, NULL, NULL, (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-events-voleybol-etkinligi-cover.webp' LIMIT 1), 'published', 1, 30, 'Voleybol Etkinliği | SO3 PT', 'SO3 topluluğunun voleybol etkinliğinden seçili anlar.', CURRENT_TIMESTAMP),
('02710000-0000-4000-8000-000000000004', 'Mobilite Grup Dersi', 'mobilite-grup-dersi', (SELECT id FROM event_categories WHERE slug = 'salon-etkinlikleri' LIMIT 1), 'SO3 topluluğunun mobilite grup dersinden seçili anlar.', NULL, NULL, NULL, (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-events-mobilite-grup-dersi-cover.webp' LIMIT 1), 'published', 1, 40, 'Mobilite Grup Dersi | SO3 PT', 'SO3 topluluğunun mobilite grup dersinden seçili anlar.', CURRENT_TIMESTAMP),
('02710000-0000-4000-8000-000000000005', 'Kırlangıç Vadisi Yürüyüşü', 'kirlangic-vadisi-yuruyusu', (SELECT id FROM event_categories WHERE slug = 'doga-yuruyusleri' LIMIT 1), 'SO3 topluluğunun Kırlangıç Vadisi yürüyüşünden seçili anlar.', NULL, NULL, NULL, (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-events-kirlangic-vadisi-yuruyusu-cover.webp' LIMIT 1), 'published', 0, NULL, 'Kırlangıç Vadisi Yürüyüşü | SO3 PT', 'SO3 topluluğunun Kırlangıç Vadisi yürüyüşünden seçili anlar.', CURRENT_TIMESTAMP),
('02710000-0000-4000-8000-000000000006', 'Plaj Voleybolu', 'plaj-voleybolu', (SELECT id FROM event_categories WHERE slug = 'takimli-oyunlar' LIMIT 1), 'SO3 topluluğunun plaj voleybolu etkinliğinden seçili anlar.', NULL, NULL, NULL, (SELECT id FROM media_assets WHERE storage_name = 'so3-demo-events-plaj-voleybolu-cover.webp' LIMIT 1), 'published', 0, NULL, 'Plaj Voleybolu | SO3 PT', 'SO3 topluluğunun plaj voleybolu etkinliğinden seçili anlar.', CURRENT_TIMESTAMP);

INSERT INTO event_media (event_id, media_id, sort_order)
SELECT e.id, ma.id, seed.sort_order
FROM events e
JOIN (
  SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-02.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-03.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-04.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-05.webp' AS storage_name, 50 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-06.webp' AS storage_name, 60 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000001' AS event_uuid, 'so3-demo-events-gomeda-vadisi-yuruyusu-gallery-07.webp' AS storage_name, 70 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-02.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-03.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-04.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-05.webp' AS storage_name, 50 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-06.webp' AS storage_name, 60 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-07.webp' AS storage_name, 70 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-08.webp' AS storage_name, 80 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000002' AS event_uuid, 'so3-demo-events-kano-etkinligi-gallery-09.webp' AS storage_name, 90 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-02.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-03.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-04.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-05.webp' AS storage_name, 50 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-06.webp' AS storage_name, 60 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000003' AS event_uuid, 'so3-demo-events-voleybol-etkinligi-gallery-07.webp' AS storage_name, 70 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000004' AS event_uuid, 'so3-demo-events-mobilite-grup-dersi-gallery-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000004' AS event_uuid, 'so3-demo-events-mobilite-grup-dersi-gallery-02.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000004' AS event_uuid, 'so3-demo-events-mobilite-grup-dersi-gallery-03.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000004' AS event_uuid, 'so3-demo-events-mobilite-grup-dersi-gallery-04.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000004' AS event_uuid, 'so3-demo-events-mobilite-grup-dersi-gallery-05.webp' AS storage_name, 50 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000005' AS event_uuid, 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000005' AS event_uuid, 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-02.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000005' AS event_uuid, 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-03.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000005' AS event_uuid, 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-04.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000005' AS event_uuid, 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-05.webp' AS storage_name, 50 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000005' AS event_uuid, 'so3-demo-events-kirlangic-vadisi-yuruyusu-gallery-06.webp' AS storage_name, 60 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000006' AS event_uuid, 'so3-demo-events-plaj-voleybolu-gallery-01.webp' AS storage_name, 10 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000006' AS event_uuid, 'so3-demo-events-plaj-voleybolu-gallery-02.webp' AS storage_name, 20 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000006' AS event_uuid, 'so3-demo-events-plaj-voleybolu-gallery-03.webp' AS storage_name, 30 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000006' AS event_uuid, 'so3-demo-events-plaj-voleybolu-gallery-04.webp' AS storage_name, 40 AS sort_order
  UNION ALL SELECT '02710000-0000-4000-8000-000000000006' AS event_uuid, 'so3-demo-events-plaj-voleybolu-gallery-05.webp' AS storage_name, 50 AS sort_order
) seed ON seed.event_uuid = e.uuid
JOIN media_assets ma ON ma.storage_name = seed.storage_name
WHERE NOT EXISTS (
  SELECT 1 FROM event_media existing
  WHERE existing.event_id = e.id AND existing.media_id = ma.id
);

INSERT INTO media_usages (media_id, entity_type, entity_id, field_name)
SELECT e.cover_media_id, 'event', e.id, 'cover'
FROM events e
WHERE e.uuid LIKE '02710000-0000-4000-8000-%'
  AND e.cover_media_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM media_usages mu
    WHERE mu.media_id = e.cover_media_id
      AND mu.entity_type = 'event'
      AND mu.entity_id = e.id
      AND mu.field_name = 'cover'
  );

INSERT INTO media_usages (media_id, entity_type, entity_id, field_name)
SELECT em.media_id, 'event', em.event_id, 'gallery'
FROM event_media em
JOIN events e ON e.id = em.event_id
WHERE e.uuid LIKE '02710000-0000-4000-8000-%'
  AND NOT EXISTS (
    SELECT 1 FROM media_usages mu
    WHERE mu.media_id = em.media_id
      AND mu.entity_type = 'event'
      AND mu.entity_id = em.event_id
      AND mu.field_name = 'gallery'
  );

COMMIT;


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
('024_seed_global_settings.sql', CURRENT_TIMESTAMP),
('025_replace_legacy_why_so3_copy.sql', CURRENT_TIMESTAMP),
('026_repair_location_utf8_seed.sql', CURRENT_TIMESTAMP),
('027_seed_canonical_demo_media.sql', CURRENT_TIMESTAMP),
('028_expand_admin_roles.sql', CURRENT_TIMESTAMP),
('029_link_trainers_to_admins.sql', CURRENT_TIMESTAMP),
('030_create_members.sql', CURRENT_TIMESTAMP),
('031_create_training_programs.sql', CURRENT_TIMESTAMP),
('032_create_member_progress.sql', CURRENT_TIMESTAMP),
('033_create_member_visits.sql', CURRENT_TIMESTAMP),
('034_create_membership_renewals.sql', CURRENT_TIMESTAMP),
('035_create_appointments.sql', CURRENT_TIMESTAMP),
('036_create_appointment_reschedules.sql', CURRENT_TIMESTAMP);

SET FOREIGN_KEY_CHECKS = @SO3_OLD_FOREIGN_KEY_CHECKS;
