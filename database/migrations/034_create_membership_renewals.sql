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
