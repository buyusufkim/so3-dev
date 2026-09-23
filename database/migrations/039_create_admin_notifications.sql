-- Migration: 039_create_admin_notifications.sql
-- Description: Creates admin_notifications table for per-recipient in-app notification persistence.

CREATE TABLE IF NOT EXISTS `admin_notifications` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `recipient_admin_id` INT NOT NULL,
    `source_key` VARCHAR(191) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `severity` ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info',
    `title` VARCHAR(160) NOT NULL,
    `body` VARCHAR(1000) NOT NULL,
    `entity_type` VARCHAR(64) NULL,
    `entity_id` BIGINT UNSIGNED NULL,
    `action_path` VARCHAR(255) NULL,
    `read_at` DATETIME NULL,
    `dismissed_at` DATETIME NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_admin_notifications_recipient` FOREIGN KEY (`recipient_admin_id`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `uq_admin_notifications_recipient_source` UNIQUE (`recipient_admin_id`, `source_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_admin_notifications_recipient_dismissed_created` ON `admin_notifications`(`recipient_admin_id`, `dismissed_at`, `created_at`);
CREATE INDEX `idx_admin_notifications_recipient_read_created` ON `admin_notifications`(`recipient_admin_id`, `read_at`, `created_at`);
CREATE INDEX `idx_admin_notifications_recipient_type_created` ON `admin_notifications`(`recipient_admin_id`, `type`, `created_at`);
