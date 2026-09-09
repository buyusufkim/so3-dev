-- Migration: 037_create_session_packages.sql
-- Description: Creates session packages domain (catalog, instances, ledger)

CREATE TABLE IF NOT EXISTS `session_packages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `session_count` INT NOT NULL,
    `validity_days` INT NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_by` INT NOT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_session_packages_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_session_packages_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `member_session_packages` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `member_id` INT NOT NULL,
    `session_package_id` INT NULL,
    `package_name_snapshot` VARCHAR(150) NOT NULL,
    `total_sessions` INT NOT NULL,
    `valid_from` DATE NOT NULL,
    `valid_until` DATE NULL,
    `status` ENUM('active', 'cancelled') NOT NULL DEFAULT 'active',
    `assigned_by` INT NOT NULL,
    `cancelled_by` INT NULL,
    `cancelled_at` DATETIME NULL,
    `cancellation_reason` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_msp_member_id` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_msp_package_id` FOREIGN KEY (`session_package_id`) REFERENCES `session_packages`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_msp_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_msp_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_msp_member_history` ON `member_session_packages`(`member_id`, `created_at`);
CREATE INDEX `idx_msp_active_lookup` ON `member_session_packages`(`member_id`, `status`);
CREATE INDEX `idx_msp_validity` ON `member_session_packages`(`valid_until`, `status`);

CREATE TABLE IF NOT EXISTS `member_session_package_ledger` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `member_session_package_id` BIGINT UNSIGNED NOT NULL,
    `appointment_id` BIGINT UNSIGNED NULL,
    `entry_type` ENUM('reserve', 'release', 'adjustment') NOT NULL,
    `delta` INT NOT NULL,
    `reason` VARCHAR(255) NULL,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_mspl_package_id` FOREIGN KEY (`member_session_package_id`) REFERENCES `member_session_packages`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_mspl_appointment_id` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_mspl_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `uk_mspl_appointment_entry` UNIQUE (`appointment_id`, `entry_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_mspl_package_balance` ON `member_session_package_ledger`(`member_session_package_id`);
CREATE INDEX `idx_mspl_chronological` ON `member_session_package_ledger`(`member_session_package_id`, `created_at`);

ALTER TABLE `appointments`
ADD COLUMN `member_session_package_id` BIGINT UNSIGNED NULL AFTER `trainer_id`,
ADD CONSTRAINT `fk_appointments_msp_id` FOREIGN KEY (`member_session_package_id`) REFERENCES `member_session_packages`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
