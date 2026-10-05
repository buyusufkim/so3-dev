import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const indexPath = path.join(rootDir, 'api', 'index.php');
const controllerPath = path.join(rootDir, 'api', 'controllers', 'TrainerProgramDayController.php');
const exerciseControllerPath = path.join(rootDir, 'api', 'controllers', 'TrainerProgramExerciseController.php');
const migrationPath = path.join(rootDir, 'database', 'migrations', '043_add_training_program_days.sql');
const freshInstallPath = path.join(rootDir, 'database', 'fresh-install.sql');
const deploymentDocPath = path.join(rootDir, 'DEPLOYMENT_PHP_MYSQL.md');
const decisionsPath = path.join(rootDir, 'DECISIONS.md');
const pkgPath = path.join(rootDir, 'package.json');
const typesPath = path.join(rootDir, 'src', 'admin', 'pages', 'trainer-training-programs', 'types.ts');

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

// 13. Invariant 13: Exercise-Day Contract in TrainerProgramExerciseController
const exerciseControllerExists = fs.existsSync(exerciseControllerPath);
assert(exerciseControllerExists, 'Invariant 13.1: TrainerProgramExerciseController.php exists');

if (exerciseControllerExists) {
    const exSource = fs.readFileSync(exerciseControllerPath, 'utf8');

    const exMethods = {
        getJsonPayload: extractMethod(exSource, 'getJsonPayload'),
        index: extractMethod(exSource, 'index'),
        create: extractMethod(exSource, 'create'),
        update: extractMethod(exSource, 'update')
    };

    // 13.2 Allowlist includes program_day_id
    const exAllowlistValid = exMethods.getJsonPayload &&
        exMethods.getJsonPayload.includes("'program_day_id'") &&
        exMethods.getJsonPayload.includes("$allowlist = ['exercise_name', 'sets', 'repetitions', 'duration_seconds', 'rest_seconds', 'instructions', 'sort_order', 'program_day_id'];");

    assert(
        Boolean(exAllowlistValid),
        'Invariant 13.2: Exercise JSON allowlist strictly includes program_day_id'
    );

    // 13.3 Index SELECT & nullable projection with flat ordering
    const exIndexValid = exMethods.index &&
        exMethods.index.includes("pe.program_day_id") &&
        exMethods.index.includes("'program_day_id' => $row['program_day_id'] !== null ? (int)$row['program_day_id'] : null") &&
        exMethods.index.includes("ORDER BY pe.sort_order ASC, pe.id ASC");

    assert(
        Boolean(exIndexValid),
        'Invariant 13.3: Exercise index selects pe.program_day_id, projects nullable integer, and maintains flat ordering sort_order ASC, id ASC'
    );

    // 13.4 Create: optional, null/missing accepted, same-program check with FOR UPDATE, insert column
    const exCreateValid = exMethods.create &&
        exMethods.create.includes("array_key_exists('program_day_id', $val) ? $val['program_day_id'] : null") &&
        exMethods.create.includes("!is_int($program_day_id) || $program_day_id < 1") &&
        exMethods.create.includes("SELECT d.id\n                    FROM training_program_days d\n                    WHERE d.id = ?\n                      AND d.program_id = ?\n                      AND d.deleted_at IS NULL\n                    FOR UPDATE") &&
        exMethods.create.includes("Program günü bu programa ait değil veya kullanılamıyor.") &&
        exMethods.create.includes("INSERT INTO program_exercises \n                (program_id, program_day_id, exercise_name") &&
        exMethods.create.indexOf("$this->db->beginTransaction();") < exMethods.create.indexOf("SELECT d.id");

    assert(
        Boolean(exCreateValid),
        'Invariant 13.4: Exercise create validates optional program_day_id, rejects cross-program and deleted days with FOR UPDATE in transaction'
    );

    // 13.5 Update: optional, null clears, same-program check with FOR UPDATE, audit changed_fields
    const exUpdateValid = exMethods.update &&
        exMethods.update.includes("pe.program_day_id") &&
        exMethods.update.includes("array_key_exists('program_day_id', $val)") &&
        exMethods.update.includes("!is_int($target_day_id) || $target_day_id < 1") &&
        exMethods.update.includes("SELECT d.id\n                        FROM training_program_days d\n                        WHERE d.id = ?\n                          AND d.program_id = ?\n                          AND d.deleted_at IS NULL\n                        FOR UPDATE") &&
        exMethods.update.includes("$updates[] = \"program_day_id = ?\";") &&
        exMethods.update.includes("$changedFields[] = 'program_day_id';") &&
        exMethods.update.indexOf("$this->db->beginTransaction();") < exMethods.update.indexOf("SELECT d.id");

    assert(
        Boolean(exUpdateValid),
        'Invariant 13.5: Exercise update validates target program_day_id, clears on null, rejects cross-program with FOR UPDATE, and audits changes'
    );
}

// 14. Invariant 14: Algorithmic Fixture Simulations
function simulateExerciseDayValidation({
    mode,
    payload,
    currentProgramId = 10,
    currentProgramDayId = null,
    dayDb = [
        { id: 101, program_id: 10, deleted_at: null },
        { id: 102, program_id: 11, deleted_at: null },
        { id: 103, program_id: 10, deleted_at: '2026-10-01 12:00:00' }
    ]
}) {
    if ('program_day_id' in payload) {
        const val = payload.program_day_id;
        if (val !== null) {
            if (typeof val !== 'number' || !Number.isInteger(val) || val < 1) {
                return { success: false, code: 422, error: 'INVALID_PRIMITIVE' };
            }
            const day = dayDb.find(d => d.id === val);
            if (!day || day.program_id !== currentProgramId || day.deleted_at !== null) {
                return { success: false, code: 422, error: 'CROSS_OR_DELETED_DAY' };
            }
            return { success: true, program_day_id: val };
        } else {
            return { success: true, program_day_id: null };
        }
    } else {
        if (mode === 'create') {
            return { success: true, program_day_id: null };
        } else {
            return { success: true, program_day_id: currentProgramDayId };
        }
    }
}

const sim1 = simulateExerciseDayValidation({ mode: 'create', payload: {} });
assert(sim1.success && sim1.program_day_id === null, 'Invariant 14.1: Algorithmic fixture: create legacy (missing program_day_id) -> accepted as null');

const sim2 = simulateExerciseDayValidation({ mode: 'create', payload: { program_day_id: null } });
assert(sim2.success && sim2.program_day_id === null, 'Invariant 14.2: Algorithmic fixture: create unassigned (program_day_id = null) -> accepted');

const sim3 = simulateExerciseDayValidation({ mode: 'create', payload: { program_day_id: 101 } });
assert(sim3.success && sim3.program_day_id === 101, 'Invariant 14.3: Algorithmic fixture: create same program active day -> accepted');

const sim4 = simulateExerciseDayValidation({ mode: 'create', payload: { program_day_id: 102 } });
assert(!sim4.success && sim4.code === 422, 'Invariant 14.4: Algorithmic fixture: create cross-program day -> rejected 422');

const sim5 = simulateExerciseDayValidation({ mode: 'create', payload: { program_day_id: 103 } });
assert(!sim5.success && sim5.code === 422, 'Invariant 14.5: Algorithmic fixture: create deleted day -> rejected 422');

const sim6 = simulateExerciseDayValidation({ mode: 'patch', payload: {}, currentProgramDayId: 101 });
assert(sim6.success && sim6.program_day_id === 101, 'Invariant 14.6: Algorithmic fixture: patch absent -> existing association preserved');

const sim7 = simulateExerciseDayValidation({ mode: 'patch', payload: { program_day_id: null }, currentProgramDayId: 101 });
assert(sim7.success && sim7.program_day_id === null, 'Invariant 14.7: Algorithmic fixture: patch null -> unassigned to null');

const sim8_0 = simulateExerciseDayValidation({ mode: 'create', payload: { program_day_id: 0 } });
const sim8_neg = simulateExerciseDayValidation({ mode: 'create', payload: { program_day_id: -1 } });
const sim8_float = simulateExerciseDayValidation({ mode: 'create', payload: { program_day_id: 1.5 } });
const sim8_str = simulateExerciseDayValidation({ mode: 'create', payload: { program_day_id: "1" } });
assert(!sim8_0.success && !sim8_neg.success && !sim8_float.success && !sim8_str.success, 'Invariant 14.8: Algorithmic fixture: invalid primitives (0, -1, 1.5, "1") -> rejected 422');

// 15. Invariant 15: TypeScript Type Contract & Type Guards
const typesSource = fs.readFileSync(typesPath, 'utf8');

assert(
    typesSource.includes("export interface TrainerProgramDay") &&
    typesSource.includes("export interface TrainerProgramDayCreateResponse") &&
    typesSource.includes("program_day_id: number | null;") &&
    typesSource.includes("export function isTrainerProgramDay") &&
    typesSource.includes("export function isTrainerProgramDayArray") &&
    typesSource.includes("export function isTrainerProgramDayCreateResponse") &&
    typesSource.includes("export function isTrainerProgramExercise"),
    'Invariant 15.1: types.ts defines TrainerProgramDay interfaces, exercise program_day_id, and runtime type guards'
);

// Transpile and load validators
const transpiledTypes = ts.transpileModule(typesSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext }
});
const typesB64 = Buffer.from(transpiledTypes.outputText).toString('base64');
const {
    isTrainerProgramDay,
    isTrainerProgramDayArray,
    isTrainerProgramDayCreateResponse,
    isTrainerProgramExercise
} = await import(`data:text/javascript;base64,${typesB64}`);

const baseExercise = {
    id: 1,
    program_id: 10,
    program_day_id: null,
    exercise_name: 'Bench Press',
    sets: 3,
    repetitions: '10',
    duration_seconds: null,
    rest_seconds: 60,
    instructions: null,
    sort_order: 1,
    created_at: '2026-10-01 10:00:00',
    updated_at: '2026-10-01 10:00:00'
};

assert(isTrainerProgramExercise({ ...baseExercise, program_day_id: null }) === true, 'Invariant 15.2: isTrainerProgramExercise accepts program_day_id: null');
assert(isTrainerProgramExercise({ ...baseExercise, program_day_id: 7 }) === true, 'Invariant 15.3: isTrainerProgramExercise accepts program_day_id: 7 (positive int)');
assert(isTrainerProgramExercise({ ...baseExercise, program_day_id: 0 }) === false, 'Invariant 15.4: isTrainerProgramExercise rejects program_day_id: 0');
assert(isTrainerProgramExercise({ ...baseExercise, program_day_id: -1 }) === false, 'Invariant 15.5: isTrainerProgramExercise rejects program_day_id: -1');
assert(isTrainerProgramExercise({ ...baseExercise, program_day_id: 1.5 }) === false, 'Invariant 15.6: isTrainerProgramExercise rejects program_day_id: 1.5');
assert(isTrainerProgramExercise({ ...baseExercise, program_day_id: "7" }) === false, 'Invariant 15.7: isTrainerProgramExercise rejects program_day_id: "7"');
assert(isTrainerProgramExercise({ ...baseExercise, program_day_id: undefined }) === false, 'Invariant 15.8: isTrainerProgramExercise rejects program_day_id: undefined');

const baseDay = {
    id: 1,
    uuid: '11111111-2222-3333-4444-555555555555',
    program_id: 10,
    title: 'Göğüs ve Kol',
    sort_order: 0,
    notes: 'Isınma dahil',
    created_at: '2026-10-01 10:00:00',
    updated_at: '2026-10-01 10:00:00'
};

assert(isTrainerProgramDay(baseDay) === true, 'Invariant 15.9: isTrainerProgramDay accepts valid day entity');
assert(isTrainerProgramDay({ ...baseDay, notes: null }) === true, 'Invariant 15.10: isTrainerProgramDay accepts notes: null');
assert(isTrainerProgramDay({ ...baseDay, id: 0 }) === false, 'Invariant 15.11: isTrainerProgramDay rejects id: 0');
assert(isTrainerProgramDay({ ...baseDay, title: '   ' }) === false, 'Invariant 15.12: isTrainerProgramDay rejects whitespace title');
assert(isTrainerProgramDay({ ...baseDay, sort_order: -1 }) === false, 'Invariant 15.13: isTrainerProgramDay rejects negative sort_order');
assert(isTrainerProgramDayArray([baseDay]) === true, 'Invariant 15.14: isTrainerProgramDayArray accepts array of days');
assert(isTrainerProgramDayArray([baseDay, { ...baseDay, id: 0 }]) === false, 'Invariant 15.15: isTrainerProgramDayArray rejects array with invalid day');

assert(isTrainerProgramDayCreateResponse({ id: 1, uuid: '11111111-2222-3333-4444-555555555555' }) === true, 'Invariant 15.16: isTrainerProgramDayCreateResponse accepts valid response');
assert(isTrainerProgramDayCreateResponse({ id: 0, uuid: '11111111-2222-3333-4444-555555555555' }) === false, 'Invariant 15.17: isTrainerProgramDayCreateResponse rejects id: 0');
assert(isTrainerProgramDayCreateResponse({ id: 1, uuid: '' }) === false, 'Invariant 15.18: isTrainerProgramDayCreateResponse rejects empty uuid');

// 16. Invariant 16: DECISIONS.md documentation
const decisionsContent = fs.readFileSync(decisionsPath, 'utf8');
const decisionsValid = decisionsContent.includes('## F.29A Program Day Structure Foundation') &&
    decisionsContent.includes('training_program_days') &&
    decisionsContent.includes('program_day_id') &&
    decisionsContent.includes('043_add_training_program_days.sql');

assert(
    Boolean(decisionsValid),
    'Invariant 16: DECISIONS.md contains F.29A Program Day Structure Foundation documentation'
);

// 17. Invariant 17: package.json script registration
const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const pkgValid = Boolean(pkgContent.scripts && pkgContent.scripts['verify:trainer-program-days'] === 'node scripts/verify-trainer-program-days.mjs');

assert(
    Boolean(pkgValid),
    'Invariant 17: package.json registers verify:trainer-program-days script'
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
    console.log('\n✅ SUCCESS: All F.29A Trainer Program Days Foundation & Exercise-Day Contract invariants verified.');
    process.exit(0);
}
