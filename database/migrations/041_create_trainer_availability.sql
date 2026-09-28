-- Migration: 041_create_trainer_availability.sql
-- Description: Creates weekly recurring availability windows and date-based unavailability blocks for trainers.

CREATE TABLE IF NOT EXISTS `trainer_availability_windows` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `trainer_id` INT NOT NULL,
    `day_of_week` TINYINT UNSIGNED NOT NULL,
    `start_time` TIME NOT NULL,
    `end_time` TIME NOT NULL,
    `created_by` INT NOT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_trainer_availability_weekday` CHECK (`day_of_week` BETWEEN 1 AND 7),
    CONSTRAINT `chk_trainer_availability_time_range` CHECK (`start_time` < `end_time`),
    CONSTRAINT `fk_trainer_availability_trainer` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_trainer_availability_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_trainer_availability_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `uq_trainer_availability_window` UNIQUE (`trainer_id`, `day_of_week`, `start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trainer_unavailability_blocks` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `trainer_id` INT NOT NULL,
    `starts_at` DATETIME NOT NULL,
    `ends_at` DATETIME NOT NULL,
    `reason` VARCHAR(255) NULL,
    `created_by` INT NOT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_trainer_unavailability_time_range` CHECK (`starts_at` < `ends_at`),
    CONSTRAINT `fk_trainer_unavailability_trainer` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_trainer_unavailability_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_trainer_unavailability_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_trainer_unavailability_lookup` ON `trainer_unavailability_blocks`(`trainer_id`, `starts_at`, `ends_at`);
