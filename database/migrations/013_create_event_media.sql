CREATE TABLE IF NOT EXISTS event_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    media_id INT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    caption VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_event_media (event_id, media_id),
    INDEX idx_event_media_order (event_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
