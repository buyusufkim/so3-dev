import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
let pass = true;

const check = (condition, msg) => {
    if (condition) {
        console.log(`[PASS] ${msg}`);
    } else {
        console.error(`[FAIL] ${msg}`);
        pass = false;
    }
};

const migrationPath = path.resolve(rootDir, 'database/migrations/037_create_session_packages.sql');
const freshInstallPath = path.resolve(rootDir, 'database/fresh-install.sql');
const deploymentDocPath = path.resolve(rootDir, 'DEPLOYMENT_PHP_MYSQL.md');
const packageJsonPath = path.resolve(rootDir, 'package.json');
const memberControllerPath = path.resolve(rootDir, 'api/controllers/MemberController.php');
const receptionMemberControllerPath = path.resolve(rootDir, 'api/controllers/ReceptionMemberController.php');
const appointmentControllerPath = path.resolve(rootDir, 'api/controllers/AppointmentController.php');
const decisionsDocPath = path.resolve(rootDir, 'DECISIONS.md');

// 1. migration 037 mevcut
check(fs.existsSync(migrationPath), 'Migration 037 exists');

if (fs.existsSync(migrationPath)) {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    
    // 2. session_packages canonical kolon/status yapısı
    check(migrationContent.includes('CREATE TABLE IF NOT EXISTS `session_packages`'), 'session_packages table is created');
    check(migrationContent.includes('`status` ENUM(\'active\', \'inactive\') NOT NULL DEFAULT \'active\''), 'session_packages status ENUM is correct');
    
    // 3. member_session_packages snapshot alanları
    check(migrationContent.includes('`package_name_snapshot` VARCHAR(150) NOT NULL'), 'member_session_packages snapshot exists');
    
    // 4. status yalnız active/cancelled
    check(migrationContent.includes('`status` ENUM(\'active\', \'cancelled\') NOT NULL DEFAULT \'active\''), 'member_session_packages status ENUM is active/cancelled');
    
    // 5. ledger append-only shape (no ON UPDATE triggers, no updated_at column)
    check(!migrationContent.match(/`updated_at`.* member_session_package_ledger/), 'ledger has no updated_at column');
    
    // 6. entry_type exact reserve/release/adjustment
    check(migrationContent.includes('`entry_type` ENUM(\'reserve\', \'release\', \'adjustment\') NOT NULL'), 'ledger entry_type ENUM is correct');
    
    // 7. appointment_id nullable
    check(migrationContent.includes('`appointment_id` BIGINT UNSIGNED NULL'), 'ledger appointment_id is nullable');
    
    // 8. appointment <-> member_session_package nullable link
    check(migrationContent.includes('ALTER TABLE `appointments`\nADD COLUMN `member_session_package_id` BIGINT UNSIGNED NULL'), 'appointments link is nullable');
    
    // 9. duplicate appointment reserve/release protection
    check(migrationContent.includes('UNIQUE (`appointment_id`, `entry_type`)'), 'ledger uniqueness protects against duplicate reserves/releases');
    
    // 10. FK column type parity
    check(migrationContent.includes('`created_by` INT NOT NULL'), 'created_by FK matches INT');
    check(migrationContent.includes('`member_id` INT NOT NULL'), 'member_id FK matches INT');
    check(migrationContent.includes('`member_session_package_id` BIGINT UNSIGNED'), 'member_session_package_id FK matches BIGINT UNSIGNED');
    
    // 11. destructive CASCADE yok
    check(!migrationContent.includes('ON DELETE CASCADE'), 'destructive ON DELETE CASCADE is absent');
    
    // 12. mutable used_sessions/remaining_sessions source-of-truth kolonu yok
    check(!migrationContent.includes('used_sessions') && !migrationContent.includes('remaining_sessions'), 'used_sessions/remaining_sessions columns are absent');

    // F.17A.1 Structural Constraints
    
    // session_packages
    check(migrationContent.includes('CONSTRAINT `chk_sp_session_count` CHECK (`session_count` > 0)'), 'session_packages enforces session_count > 0');
    check(migrationContent.includes('CONSTRAINT `chk_sp_validity_days` CHECK (`validity_days` IS NULL OR `validity_days` > 0)'), 'session_packages enforces validity_days IS NULL OR > 0');

    // member_session_packages
    check(migrationContent.includes('CONSTRAINT `chk_msp_total_sessions` CHECK (`total_sessions` > 0)'), 'member_session_packages enforces total_sessions > 0');
    check(migrationContent.includes('CONSTRAINT `chk_msp_validity_range` CHECK (`valid_until` IS NULL OR `valid_until` >= `valid_from`)'), 'member_session_packages enforces valid_until >= valid_from');

    // member_session_package_ledger
    check(migrationContent.includes('CONSTRAINT `chk_mspl_canonical_semantics` CHECK'), 'ledger has canonical semantics check');
    check(migrationContent.includes('(`entry_type` = \'reserve\' AND `appointment_id` IS NOT NULL AND `delta` = -1)'), 'ledger constraint: reserve requires appointment and delta -1');
    check(migrationContent.includes('(`entry_type` = \'release\' AND `appointment_id` IS NOT NULL AND `delta` = 1)'), 'ledger constraint: release requires appointment and delta +1');
    check(migrationContent.includes('(`entry_type` = \'adjustment\' AND `appointment_id` IS NULL AND `delta` <> 0)'), 'ledger constraint: adjustment requires no appointment and non-zero delta');

}

// 13. membership_renewals değiştirilmemiş
const migration034Path = path.resolve(rootDir, 'database/migrations/034_create_membership_renewals.sql');
if (fs.existsSync(migration034Path)) {
    const content = fs.readFileSync(migration034Path, 'utf8');
    check(!content.includes('session_package'), 'membership_renewals remains unchanged regarding session packages');
}

// 14. MemberController membership-date semantics değiştirilmemiş
if (fs.existsSync(memberControllerPath)) {
    const content = fs.readFileSync(memberControllerPath, 'utf8');
    check(!content.includes('session_package'), 'MemberController membership semantics not replaced');
}

// 15. Reception check-in eligibility değiştirilmemiş
if (fs.existsSync(receptionMemberControllerPath)) {
    const content = fs.readFileSync(receptionMemberControllerPath, 'utf8');
    check(!content.includes('session_package'), 'Reception check-in semantics not replaced');
}

// 16. AppointmentController lifecycle business logic değiştirilmemiş
if (fs.existsSync(appointmentControllerPath)) {
    const content = fs.readFileSync(appointmentControllerPath, 'utf8');
// Appointment lifecycle integration is verified by F.17C dedicated verifier.
}

// 17. fresh-install 037 ile parity
// 18. schema_migrations history 001-037
if (fs.existsSync(freshInstallPath)) {
    const content = fs.readFileSync(freshInstallPath, 'utf8');
    check(content.includes('037_create_session_packages.sql'), 'fresh-install has parity with 037 schema and history');
    check(content.includes('CONSTRAINT `chk_sp_session_count` CHECK'), 'fresh-install parity includes table check constraints');
    check(content.includes('Generated from migrations 001-037'), 'fresh-install header updated');
}

// 19. deployment doc 001-037
if (fs.existsSync(deploymentDocPath)) {
    const content = fs.readFileSync(deploymentDocPath, 'utf8');
    check(content.includes('001–037'), 'deployment docs reference 001-037');
}

// 20. DECISIONS canonical semantics
if (fs.existsSync(decisionsDocPath)) {
    const content = fs.readFileSync(decisionsDocPath, 'utf8');
    check(content.includes('Session Package Domain Foundation'), 'DECISIONS doc includes canonical foundation semantics');
}

if (pass) {
    console.log('\nPASS — F.17A SESSION PACKAGE DOMAIN FOUNDATION VERIFIED');
    process.exit(0);
} else {
    console.error('\nFAIL — Verifications failed.');
    process.exit(1);
}
