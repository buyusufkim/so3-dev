CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    title VARCHAR(160) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    category_id INT NOT NULL,
    excerpt VARCHAR(500) NULL,
    content TEXT NULL,
    event_date DATETIME NULL,
    location VARCHAR(200) NULL,
    cover_media_id INT NULL,
    
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    featured_on_home BOOLEAN NOT NULL DEFAULT FALSE,
    featured_order INT NULL,
    
    seo_title VARCHAR(70) NULL,
    seo_description VARCHAR(170) NULL,
    
    published_at TIMESTAMP NULL,
    
    created_by INT NULL,
    updated_by INT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (category_id) REFERENCES event_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (cover_media_id) REFERENCES media_assets(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL,
    
    INDEX idx_events_slug (slug),
    INDEX idx_events_status (status),
    INDEX idx_events_category_id (category_id),
    INDEX idx_events_featured (featured_on_home),
    INDEX idx_events_date (event_date),
    INDEX idx_events_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
