-- Migration: 043_add_training_program_days.sql
-- Description: Creates training_program_days table and associates program_exercises with optional program_day_id.

CREATE TABLE IF NOT EXISTS `training_program_days` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `program_id` INT NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    CONSTRAINT `fk_training_program_days_program_id` FOREIGN KEY (`program_id`) REFERENCES `training_programs`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT `fk_training_program_days_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_training_program_days_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_training_program_days_program_deleted_sort_id` ON `training_program_days`(`program_id`, `deleted_at`, `sort_order`, `id`);

ALTER TABLE `program_exercises`
    ADD COLUMN `program_day_id` INT NULL AFTER `program_id`,
    ADD CONSTRAINT `fk_program_exercises_program_day_id` FOREIGN KEY (`program_day_id`) REFERENCES `training_program_days`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

CREATE INDEX `idx_program_exercises_day_sort_id` ON `program_exercises`(`program_day_id`, `sort_order`, `id`);
