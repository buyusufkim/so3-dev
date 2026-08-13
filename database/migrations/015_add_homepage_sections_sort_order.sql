ALTER TABLE homepage_sections 
ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

CREATE INDEX idx_homepage_sections_active_order ON homepage_sections(is_active, sort_order);
