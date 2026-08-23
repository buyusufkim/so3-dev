CREATE TABLE IF NOT EXISTS `training_programs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL UNIQUE,
    `member_id` INT NOT NULL,
    `trainer_id` INT NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `status` ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft',
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `notes` TEXT NULL,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    CONSTRAINT `fk_training_programs_member_id` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_training_programs_trainer_id` FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_training_programs_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT `fk_training_programs_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_training_programs_member_id` ON `training_programs`(`member_id`);
CREATE INDEX `idx_training_programs_trainer_id` ON `training_programs`(`trainer_id`);
CREATE INDEX `idx_training_programs_status` ON `training_programs`(`status`);
CREATE INDEX `idx_training_programs_deleted_at` ON `training_programs`(`deleted_at`);
CREATE INDEX `idx_training_programs_member_status_deleted` ON `training_programs`(`member_id`, `status`, `deleted_at`);
CREATE INDEX `idx_training_programs_trainer_status_deleted` ON `training_programs`(`trainer_id`, `status`, `deleted_at`);

CREATE TABLE IF NOT EXISTS `program_exercises` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `program_id` INT NOT NULL,
    `exercise_name` VARCHAR(160) NOT NULL,
    `sets` SMALLINT UNSIGNED NULL,
    `repetitions` VARCHAR(40) NULL,
    `duration_seconds` INT UNSIGNED NULL,
    `rest_seconds` SMALLINT UNSIGNED NULL,
    `instructions` VARCHAR(1000) NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_program_exercises_program_id` FOREIGN KEY (`program_id`) REFERENCES `training_programs`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_program_exercises_program_sort` ON `program_exercises`(`program_id`, `sort_order`);
