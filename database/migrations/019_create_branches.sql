CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(600) NOT NULL,
    cover_media_id INT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_by INT NULL,
    updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_branches_cover_media FOREIGN KEY (cover_media_id) REFERENCES media_assets(id) ON DELETE SET NULL,
    CONSTRAINT fk_branches_created_by FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
    CONSTRAINT fk_branches_updated_by FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_branches_is_active ON branches(is_active);
CREATE INDEX idx_branches_sort_order ON branches(sort_order);
CREATE INDEX idx_branches_deleted_at ON branches(deleted_at);
