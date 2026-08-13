CREATE TABLE `media_asset_tags` (
  `media_id` INT NOT NULL,
  `tag_id` INT NOT NULL,
  PRIMARY KEY (`media_id`, `tag_id`),
  CONSTRAINT `fk_media_asset_tags_media` FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_media_asset_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
