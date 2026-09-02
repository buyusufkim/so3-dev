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
