CREATE TABLE IF NOT EXISTS branch_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    media_id INT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_branch_media_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_branch_media_media FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE,
    UNIQUE KEY uk_branch_media (branch_id, media_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_branch_media_sort ON branch_media(branch_id, sort_order);
