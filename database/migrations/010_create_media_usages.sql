CREATE TABLE `media_usages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `media_id` INT NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT NOT NULL,
  `field_name` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_media_usages_media` FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
