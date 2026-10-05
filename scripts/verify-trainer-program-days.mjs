import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const indexPath = path.join(rootDir, 'api', 'index.php');
const controllerPath = path.join(rootDir, 'api', 'controllers', 'TrainerProgramDayController.php');
const migrationPath = path.join(rootDir, 'database', 'migrations', '043_add_training_program_days.sql');
const freshInstallPath = path.join(rootDir, 'database', 'fresh-install.sql');
const deploymentDocPath = path.join(rootDir, 'DEPLOYMENT_PHP_MYSQL.md');
const decisionsPath = path.join(rootDir, 'DECISIONS.md');
const pkgPath = path.join(rootDir, 'package.json');

let hasErrors = false;
let assertionCount = 0;

function assert(condition, message) {
    assertionCount++;
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        hasErrors = true;
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

// Helper: Extract method body using balanced curly brace scanning
function extractMethod(source, name) {
    const regex = new RegExp(`(?:public|private|protected)?\\s*function\\s+${name}\\s*\\(`, 'm');
    const match = source.match(regex);
    if (!match) return null;
    const startIdx = match.index;
    const openBrace = source.indexOf('{', startIdx);
    if (openBrace === -1) return null;
    let depth = 0;
    for (let i = openBrace; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') {
            depth--;
            if (depth === 0) {
                return source.slice(startIdx, i + 1);
            }
        }
    }
    return null;
}

// Helper: Extract route if-block from index.php using balanced brace scanning
function extractRouteBlock(source, pattern) {
    const idx = source.indexOf(pattern);
    if (idx === -1) return null;
    const ifIdx = source.lastIndexOf('if', idx);
    const openBrace = source.indexOf('{', idx);
    if (openBrace === -1) return null;
    let depth = 0;
    for (let i = openBrace; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') {
            depth--;
            if (depth === 0) {
                return source.slice(ifIdx, i + 1);
            }
        }
    }
    return null;
}

console.log('Starting Trainer Program Days API & Foundation verification (F.29A Contract Guard)...\n');

// 1. Invariant 1: Migration 043 file and schema definitions
const migrationExists = fs.existsSync(migrationPath);
assert(migrationExists, 'Invariant 1.1: Migration 043_add_training_program_days.sql exists');

if (migrationExists) {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const hasTable = migrationContent.includes('CREATE TABLE IF NOT EXISTS `training_program_days`');
    const hasUuid = migrationContent.includes('`uuid` CHAR(36) NOT NULL UNIQUE');
    const hasProgramId = migrationContent.includes('`program_id` INT NOT NULL');
    const hasTitle = migrationContent.includes('`title` VARCHAR(160) NOT NULL');
    const hasSortOrder = migrationContent.includes('`sort_order` INT NOT NULL DEFAULT 0');
    const hasNotes = migrationContent.includes('`notes` TEXT NULL');
    const hasDeletedAt = migrationContent.includes('`deleted_at` TIMESTAMP NULL');
    const hasFkProgram = migrationContent.includes('CONSTRAINT `fk_training_program_days_program_id` FOREIGN KEY (`program_id`) REFERENCES `training_programs`(`id`) ON DELETE CASCADE');
    const hasIndexDays = migrationContent.includes('`idx_training_program_days_program_deleted_sort_id` ON `training_program_days`(`program_id`, `deleted_at`, `sort_order`, `id`)');
    const hasAlterExercises = migrationContent.includes('ALTER TABLE `program_exercises`') &&
        migrationContent.includes('ADD COLUMN `program_day_id` INT NULL');
    const hasFkExercises = migrationContent.includes('CONSTRAINT `fk_program_exercises_program_day_id` FOREIGN KEY (`program_day_id`) REFERENCES `training_program_days`(`id`) ON DELETE SET NULL');
    const hasIndexExercises = migrationContent.includes('`idx_program_exercises_day_sort_id` ON `program_exercises`(`program_day_id`, `sort_order`, `id`)');

    assert(
        Boolean(hasTable && hasUuid && hasProgramId && hasTitle && hasSortOrder && hasNotes && hasDeletedAt && hasFkProgram && hasIndexDays && hasAlterExercises && hasFkExercises && hasIndexExercises),
        'Invariant 1.2: Migration 043 schema contains training_program_days, program_day_id, cascades, and indexes'
    );
}

// 2. Invariant 2: Fresh install & Deployment doc parity
const freshInstallContent = fs.readFileSync(freshInstallPath, 'utf8');
const deploymentDocContent = fs.readFileSync(deploymentDocPath, 'utf8');

const freshHasTable = freshInstallContent.includes('CREATE TABLE IF NOT EXISTS `training_program_days`');
const freshHasCol = freshInstallContent.includes('`program_day_id` INT NULL');
const freshHasFk = freshInstallContent.includes('CONSTRAINT `fk_program_exercises_program_day_id` FOREIGN KEY (`program_day_id`) REFERENCES `training_program_days`(`id`) ON DELETE SET NULL');
const freshHasMig = freshInstallContent.includes("('043_add_training_program_days.sql', CURRENT_TIMESTAMP)");
const deployRangeHas043 = deploymentDocContent.includes('migrations 001–043');

assert(
    Boolean(freshHasTable && freshHasCol && freshHasFk && freshHasMig && deployRangeHas043),
    'Invariant 2: Fresh-install SQL and Deployment docs contain complete 043 parity'
);

// 3. Invariant 3: Routes definition in api/index.php
const indexCode = fs.readFileSync(indexPath, 'utf8');
const collectionRoutePattern = '#^/api/trainer/training-programs/([1-9]\\d*)/days$#';
const entityRoutePattern = '#^/api/trainer/program-days/([1-9]\\d*)$#';

const collectionBlock = extractRouteBlock(indexCode, collectionRoutePattern);
const entityBlock = extractRouteBlock(indexCode, entityRoutePattern);

const collectionRouteValid = collectionBlock &&
    collectionBlock.includes("AuthMiddleware::hasRole(['trainer']);") &&
    collectionBlock.includes("$method === 'GET'") &&
    collectionBlock.includes("$controller->index($programId);") &&
    collectionBlock.includes("$method === 'POST'") &&
    collectionBlock.includes("$controller->create($programId);") &&
    !collectionBlock.includes("$method === 'PATCH'") &&
    !collectionBlock.includes("$method === 'DELETE'");

const entityRouteValid = entityBlock &&
    entityBlock.includes("AuthMiddleware::hasRole(['trainer']);") &&
    entityBlock.includes("$method === 'PATCH'") &&
    entityBlock.includes("$controller->update($id);") &&
    entityBlock.includes("$method === 'DELETE'") &&
    entityBlock.includes("$controller->delete($id);") &&
    !entityBlock.includes("$method === 'GET'") &&
    !entityBlock.includes("$method === 'POST'");

assert(
    Boolean(collectionRouteValid && entityRouteValid),
    'Invariant 3: Routes are strictly defined with block-scoped trainer firewall and correct method dispatches'
);

// 4. Invariant 4: Controller file exists and methods extracted
const controllerExists = fs.existsSync(controllerPath);
assert(controllerExists, 'Invariant 4.1: TrainerProgramDayController.php exists');

if (controllerExists) {
    const controllerSource = fs.readFileSync(controllerPath, 'utf8');

    const methods = {
        getTrainerProfileId: extractMethod(controllerSource, 'getTrainerProfileId'),
        getTrainerProfileIdForUpdate: extractMethod(controllerSource, 'getTrainerProfileIdForUpdate'),
        getJsonPayload: extractMethod(controllerSource, 'getJsonPayload'),
        index: extractMethod(controllerSource, 'index'),
        create: extractMethod(controllerSource, 'create'),
        update: extractMethod(controllerSource, 'update'),
        delete: extractMethod(controllerSource, 'delete'),
    };

    assert(
        Boolean(methods.getTrainerProfileId && methods.getTrainerProfileIdForUpdate && methods.getJsonPayload && methods.index && methods.create && methods.update && methods.delete),
        'Invariant 4.2: All required controller methods exist'
    );

    // 5. Invariant 5: Trainer profile resolution helpers
    const getTrainerValid = methods.getTrainerProfileId &&
        methods.getTrainerProfileId.includes("$adminId = (int)($_SESSION['admin_id'] ?? 0);") &&
        methods.getTrainerProfileId.includes("WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1") &&
        methods.getTrainerProfileId.includes("Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);") &&
        !methods.getTrainerProfileId.includes("FOR UPDATE");

    const getTrainerForUpdateValid = methods.getTrainerProfileIdForUpdate &&
        methods.getTrainerProfileIdForUpdate.includes("$adminId = (int)($_SESSION['admin_id'] ?? 0);") &&
        methods.getTrainerProfileIdForUpdate.includes("WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1") &&
        methods.getTrainerProfileIdForUpdate.includes("FOR UPDATE") &&
        methods.getTrainerProfileIdForUpdate.includes("Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);");

    assert(
        Boolean(getTrainerValid && getTrainerForUpdateValid),
        'Invariant 5: Trainer profile helpers enforce session admin_id resolution, active check, rollback guards, and distinct FOR UPDATE semantics'
    );

    // 6. Invariant 6: Strict JSON parser and exact allowlist
    const jsonParser = methods.getJsonPayload;
    const jsonParserValid = jsonParser &&
        jsonParser.includes("application/json") &&
        jsonParser.includes("UNSUPPORTED_MEDIA_TYPE', 415") &&
        jsonParser.includes("strlen($raw) > 16384") &&
        jsonParser.includes("PAYLOAD_TOO_LARGE', 413") &&
        jsonParser.includes("json_last_error() !== JSON_ERROR_NONE || !is_object($isObj)") &&
        jsonParser.includes("BAD_REQUEST', 400") &&
        jsonParser.includes("$allowlist = ['title', 'sort_order', 'notes'];") &&
        jsonParser.includes("VALIDATION_ERROR', 422");

    assert(
        Boolean(jsonParserValid),
        'Invariant 6: Strict JSON parser enforces application/json header, 16KB limit, object root, and exact allowlist'
    );

    // 7. Invariant 7: Business validations in create and update
    const createBody = methods.create;
    const updateBody = methods.update;

    const createValidations = createBody &&
        createBody.includes("array_key_exists('title', $val)") &&
        createBody.includes("mb_strlen($val['title'], 'UTF-8')") &&
        createBody.includes("$len < 1 || $len > 160") &&
        createBody.includes("$sort_order < 0 || $sort_order > 2147483647") &&
        createBody.includes("mb_strlen($notes, 'UTF-8') > 2000");

    const updateValidations = updateBody &&
        updateBody.includes("empty($val)") &&
        updateBody.includes("VALIDATION_ERROR', 422") &&
        updateBody.includes("array_key_exists('title', $val)") &&
        updateBody.includes("$len < 1 || $len > 160") &&
        updateBody.includes("array_key_exists('sort_order', $val)") &&
        updateBody.includes("array_key_exists('notes', $val)") &&
        updateBody.includes("mb_strlen($notes, 'UTF-8') > 2000");

    assert(
        Boolean(createValidations && updateValidations),
        'Invariant 7: Business validations enforce title (1-160), sort_order (>=0), and notes (<=2000) with pre-transaction empty check on update'
    );

    // 8. Invariant 8: Index endpoint ownership precheck & ordering
    const indexBody = methods.index;
    const indexValid = indexBody &&
        indexBody.includes("AuthMiddleware::hasRole(['trainer']);") &&
        indexBody.includes("FROM training_programs tp") &&
        indexBody.includes("JOIN members m ON tp.member_id = m.id") &&
        indexBody.includes("tp.trainer_id = ?") &&
        indexBody.includes("m.trainer_id = ?") &&
        indexBody.includes("FROM training_program_days") &&
        indexBody.includes("ORDER BY sort_order ASC, id ASC");

    assert(
        Boolean(indexValid),
        'Invariant 8: Index endpoint verifies parent program and member ownership and orders days by sort_order ASC, id ASC'
    );

    // 9. Invariant 9: Transaction safety, locking order, and rollback guards
    const createTx = createBody &&
        createBody.includes("$this->db->beginTransaction();") &&
        createBody.includes("$this->getTrainerProfileIdForUpdate();") &&
        createBody.includes("FOR UPDATE") &&
        createBody.includes("$this->db->commit();") &&
        createBody.includes("if ($this->db->inTransaction()) {") &&
        createBody.includes("$this->db->rollBack();");

    const updateTx = updateBody &&
        updateBody.includes("$this->db->beginTransaction();") &&
        updateBody.includes("$this->getTrainerProfileIdForUpdate();") &&
        updateBody.includes("FOR UPDATE") &&
        updateBody.includes("$this->db->commit();") &&
        updateBody.includes("if ($this->db->inTransaction()) {") &&
        updateBody.includes("$this->db->rollBack();");

    const deleteTx = methods.delete &&
        methods.delete.includes("$this->db->beginTransaction();") &&
        methods.delete.includes("$this->getTrainerProfileIdForUpdate();") &&
        methods.delete.includes("FOR UPDATE") &&
        methods.delete.includes("$this->db->commit();") &&
        methods.delete.includes("if ($this->db->inTransaction()) {") &&
        methods.delete.includes("$this->db->rollBack();");

    assert(
        Boolean(createTx && updateTx && deleteTx),
        'Invariant 9: Mutation methods strictly order beginTransaction -> trainer lock -> resource lock FOR UPDATE -> commit -> rollback guard'
    );

    // 10. Invariant 10: Idempotent PATCH contract
    const idempotentPatch = updateBody &&
        updateBody.includes("if (empty($updates)) {") &&
        updateBody.includes("$this->db->commit();") &&
        updateBody.includes("Response::json(['success' => true]);") &&
        updateBody.indexOf("if (empty($updates))") < updateBody.indexOf("UPDATE training_program_days");

    assert(
        Boolean(idempotentPatch),
        'Invariant 10: Idempotent PATCH safely commits and returns 200 early without updating DB or firing AuditLogger'
    );

    // 11. Invariant 11: Soft delete semantic & exercise preservation
    const deleteBody = methods.delete;
    const deleteValid = deleteBody &&
        deleteBody.includes("UPDATE program_exercises") &&
        deleteBody.includes("SET program_day_id = NULL") &&
        deleteBody.includes("WHERE program_day_id = ?") &&
        deleteBody.includes("UPDATE training_program_days") &&
        deleteBody.includes("SET deleted_at = CURRENT_TIMESTAMP") &&
        !deleteBody.includes("DELETE FROM training_program_days");

    assert(
        Boolean(deleteValid),
        'Invariant 11: DELETE endpoint safely unassigns existing exercises (program_day_id = NULL) and soft-deletes day without hard deletion'
    );

    // 12. Invariant 12: Audit logging contracts
    const auditCreate = createBody && createBody.includes("AuditLogger::log(\n                    'trainer_program_day.create'");
    const auditUpdate = updateBody && updateBody.includes("AuditLogger::log(\n                    'trainer_program_day.update'");
    const auditDelete = deleteBody && deleteBody.includes("AuditLogger::log(\n                    'trainer_program_day.delete'");

    assert(
        Boolean(auditCreate && auditUpdate && auditDelete),
        'Invariant 12: AuditLogger logs trainer_program_day.create, update, and delete actions in isolated Throwable try/catch blocks'
    );
}

// 13. Invariant 13: DECISIONS.md documentation
const decisionsContent = fs.readFileSync(decisionsPath, 'utf8');
const decisionsValid = decisionsContent.includes('## F.29A Program Day Structure Foundation') &&
    decisionsContent.includes('training_program_days') &&
    decisionsContent.includes('program_day_id') &&
    decisionsContent.includes('043_add_training_program_days.sql');

assert(
    Boolean(decisionsValid),
    'Invariant 13: DECISIONS.md contains F.29A Program Day Structure Foundation documentation'
);

// 14. Invariant 14: package.json script registration
const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const pkgValid = Boolean(pkgContent.scripts && pkgContent.scripts['verify:trainer-program-days'] === 'node scripts/verify-trainer-program-days.mjs');

assert(
    Boolean(pkgValid),
    'Invariant 14: package.json registers verify:trainer-program-days script'
);

console.log(`\n=======================================================`);
console.log(`Total Invariants Verified: ${assertionCount}`);
console.log(`Passed: ${assertionCount - (hasErrors ? 1 : 0)}`);
console.log(`Failed: ${hasErrors ? 1 : 0}`);
console.log(`=======================================================`);

if (hasErrors) {
    console.error('\n❌ F.29A Trainer Program Days Foundation verification FAILED.');
    process.exit(1);
} else {
    console.log('\n✅ SUCCESS: All F.29A Trainer Program Days Foundation invariants verified.');
    process.exit(0);
}
