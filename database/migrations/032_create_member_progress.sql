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
