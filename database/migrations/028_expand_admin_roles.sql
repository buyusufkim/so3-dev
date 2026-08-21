ALTER TABLE `admins`
MODIFY COLUMN `role` ENUM('super_admin', 'admin', 'editor', 'trainer', 'reception') NOT NULL DEFAULT 'editor';
