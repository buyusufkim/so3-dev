ALTER TABLE `trainers`
ADD COLUMN `admin_id` INT NULL;

ALTER TABLE `trainers`
ADD CONSTRAINT `uq_trainers_admin_id` UNIQUE (`admin_id`);

ALTER TABLE `trainers`
ADD CONSTRAINT `fk_trainers_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
