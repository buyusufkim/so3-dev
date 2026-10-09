-- Migration: 044_create_community_updates.sql
-- Description: Creates community_updates table for admin/editor community updates and member portal read model.

CREATE TABLE IF NOT EXISTS `community_updates` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `title` VARCHAR(160) NOT NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    `published_at` DATETIME NULL,
    `created_by_admin_id` INT NULL,
    `updated_by_admin_id` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    CONSTRAINT `fk_community_updates_created_by` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_community_updates_updated_by` FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_community_updates_status_pub_del_id` ON `community_updates`(`status`, `published_at`, `deleted_at`, `id`);
CREATE INDEX `idx_community_updates_created_del_id` ON `community_updates`(`created_at`, `deleted_at`, `id`);
CREATE INDEX `idx_community_updates_deleted_id` ON `community_updates`(`deleted_at`, `id`);
