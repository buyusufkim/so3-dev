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
