-- Migration: 040_add_member_appointment_actor_attribution.sql
-- Description: Adds member-account creator attribution to appointments and member_session_package_ledger for F.24 Member Self-Service Booking.

-- 1. appointments table: allow created_by to be NULL, add created_by_member_account_id FK, index and CHECK constraint
ALTER TABLE `appointments`
MODIFY COLUMN `created_by` INT NULL;

ALTER TABLE `appointments`
ADD COLUMN `created_by_member_account_id` INT NULL AFTER `created_by`;

ALTER TABLE `appointments`
ADD CONSTRAINT `fk_appointments_created_by_member_account`
FOREIGN KEY (`created_by_member_account_id`) REFERENCES `member_accounts`(`id`)
ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX `idx_appointments_created_by_member_account` ON `appointments`(`created_by_member_account_id`);

ALTER TABLE `appointments`
ADD CONSTRAINT `chk_appointments_creator_attribution`
CHECK (
    (`created_by` IS NOT NULL AND `created_by_member_account_id` IS NULL) OR
    (`created_by` IS NULL AND `created_by_member_account_id` IS NOT NULL)
);

-- 2. member_session_package_ledger table: allow created_by to be NULL, add created_by_member_account_id FK, index and CHECK constraint
ALTER TABLE `member_session_package_ledger`
MODIFY COLUMN `created_by` INT NULL;

ALTER TABLE `member_session_package_ledger`
ADD COLUMN `created_by_member_account_id` INT NULL AFTER `created_by`;

ALTER TABLE `member_session_package_ledger`
ADD CONSTRAINT `fk_mspl_created_by_member_account`
FOREIGN KEY (`created_by_member_account_id`) REFERENCES `member_accounts`(`id`)
ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX `idx_mspl_created_by_member_account` ON `member_session_package_ledger`(`created_by_member_account_id`);

ALTER TABLE `member_session_package_ledger`
ADD CONSTRAINT `chk_mspl_creator_attribution`
CHECK (
    (`created_by` IS NOT NULL AND `created_by_member_account_id` IS NULL) OR
    (`created_by` IS NULL AND `created_by_member_account_id` IS NOT NULL)
);
