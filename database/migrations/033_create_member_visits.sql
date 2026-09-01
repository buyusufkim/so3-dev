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
