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
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    CONSTRAINT `fk_trainer_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_trainer_profile_media` FOREIGN KEY (`profile_media_id`) REFERENCES `media_assets` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_trainer_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_trainer_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_trainers_branch_id ON trainers(branch_id);
CREATE INDEX idx_trainers_is_active ON trainers(is_active);
CREATE INDEX idx_trainers_sort_order ON trainers(sort_order);
CREATE INDEX idx_trainers_deleted_at ON trainers(deleted_at);
