-- Migration: 042_add_member_appointment_lifecycle_actor_attribution.sql
-- Description: Adds member-account actor attribution for appointment cancellation and rescheduling (F.25A foundation).

-- 1. appointments table: add cancelled_by_member_account_id FK, index and cancellation actor CHECK constraint
ALTER TABLE `appointments`
ADD COLUMN `cancelled_by_member_account_id` INT NULL AFTER `cancelled_by`;

ALTER TABLE `appointments`
ADD CONSTRAINT `fk_appointments_cancelled_by_member_account`
FOREIGN KEY (`cancelled_by_member_account_id`) REFERENCES `member_accounts`(`id`)
ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX `idx_appointments_cancelled_by_member_account` ON `appointments`(`cancelled_by_member_account_id`);

ALTER TABLE `appointments`
ADD CONSTRAINT `chk_appointments_cancellation_actor_attribution`
CHECK (
    NOT (
        `cancelled_by` IS NOT NULL
        AND `cancelled_by_member_account_id` IS NOT NULL
    )
);

-- 2. appointment_reschedules table: modify rescheduled_by to NULL, add rescheduled_by_member_account_id FK, index and exactly-one CHECK constraint
ALTER TABLE `appointment_reschedules`
MODIFY COLUMN `rescheduled_by` INT NULL;

ALTER TABLE `appointment_reschedules`
ADD COLUMN `rescheduled_by_member_account_id` INT NULL AFTER `rescheduled_by`;

ALTER TABLE `appointment_reschedules`
ADD CONSTRAINT `fk_appointment_reschedules_rescheduled_by_member_account`
FOREIGN KEY (`rescheduled_by_member_account_id`) REFERENCES `member_accounts`(`id`)
ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX `idx_appointment_reschedules_rescheduled_by_member_account` ON `appointment_reschedules`(`rescheduled_by_member_account_id`);

ALTER TABLE `appointment_reschedules`
ADD CONSTRAINT `chk_appointment_reschedules_actor_attribution`
CHECK (
    (
        `rescheduled_by` IS NOT NULL
        AND `rescheduled_by_member_account_id` IS NULL
    )
    OR
    (
        `rescheduled_by` IS NULL
        AND `rescheduled_by_member_account_id` IS NOT NULL
    )
);
