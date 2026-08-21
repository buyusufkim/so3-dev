CREATE TABLE IF NOT EXISTS `members` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `first_name` VARCHAR(80) NOT NULL,
    `last_name` VARCHAR(80) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(120) NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `trainer_id` INT NULL,
    `membership_start_date` DATE NULL,
    `membership_end_date` DATE NULL,
    `emergency_contact_name` VARCHAR(120) NULL,
    `emergency_contact_phone` VARCHAR(20) NULL,
    `notes` TEXT NULL,
    `consent_given_at` DATETIME NULL,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,

    CONSTRAINT `fk_members_trainer` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_members_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_members_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_members_phone` ON `members`(`phone`);
CREATE INDEX `idx_members_email` ON `members`(`email`);
CREATE INDEX `idx_members_status` ON `members`(`status`);
CREATE INDEX `idx_members_trainer_id` ON `members`(`trainer_id`);
CREATE INDEX `idx_members_membership_end_date` ON `members`(`membership_end_date`);
CREATE INDEX `idx_members_deleted_at` ON `members`(`deleted_at`);
CREATE INDEX `idx_members_status_deleted` ON `members`(`status`, `deleted_at`);
CREATE INDEX `idx_members_trainer_status_deleted` ON `members`(`trainer_id`, `status`, `deleted_at`);
