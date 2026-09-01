const fs = require('fs');

let content = fs.readFileSync('database/fresh-install.sql', 'utf8');

// 1. Update header
content = content.replace('-- Generated from migrations 001-027', '-- Generated from migrations 001-032');

// 2. Update admins role
content = content.replace(
  "`role` ENUM('super_admin', 'admin', 'editor') NOT NULL DEFAULT 'editor'",
  "`role` ENUM('super_admin', 'admin', 'editor', 'trainer', 'reception') NOT NULL DEFAULT 'editor'"
);

// 3. Update trainers table to add admin_id
content = content.replace(
  "`instagram_username` VARCHAR(80) NULL,",
  "`instagram_username` VARCHAR(80) NULL,\n    `admin_id` INT NULL,"
);

content = content.replace(
  "CONSTRAINT `fk_trainer_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,",
  "CONSTRAINT `fk_trainer_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,\n    CONSTRAINT `uq_trainers_admin_id` UNIQUE (`admin_id`),\n    CONSTRAINT `fk_trainers_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT,"
);

// 4. Append tables 030, 031, 032
// We'll append them right after trainers index definitions
const tables030_032 = fs.readFileSync('database/migrations/030_create_members.sql', 'utf8') + '\n' +
                      fs.readFileSync('database/migrations/031_create_training_programs.sql', 'utf8') + '\n' +
                      fs.readFileSync('database/migrations/032_create_member_progress.sql', 'utf8');

const targetIndexPattern = "CREATE INDEX idx_trainers_deleted_at ON trainers(deleted_at);";

if (content.includes(targetIndexPattern)) {
    content = content.replace(
        targetIndexPattern,
        targetIndexPattern + "\n\n" + tables030_032
    );
} else {
    console.error("Could not find the target index pattern to insert the tables!");
}

// 5. Update schema_migrations inserts
const newMigrations = `('028_expand_admin_roles.sql', CURRENT_TIMESTAMP),
('029_link_trainers_to_admins.sql', CURRENT_TIMESTAMP),
('030_create_members.sql', CURRENT_TIMESTAMP),
('031_create_training_programs.sql', CURRENT_TIMESTAMP),
('032_create_member_progress.sql', CURRENT_TIMESTAMP);`;

content = content.replace(
    "('027_seed_canonical_demo_media.sql', CURRENT_TIMESTAMP);",
    "('027_seed_canonical_demo_media.sql', CURRENT_TIMESTAMP),\n" + newMigrations
);

fs.writeFileSync('database/fresh-install.sql', content);
console.log("Patched successfully");
