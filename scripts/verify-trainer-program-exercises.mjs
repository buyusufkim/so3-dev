import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const indexPath = path.join(rootDir, 'api', 'index.php');
const controllerPath = path.join(rootDir, 'api', 'controllers', 'TrainerProgramExerciseController.php');

let hasErrors = false;

function assert(condition, message) {
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

// Helper: Extract statement block starting from prepare() containing a given SQL anchor until execute()
function extractStatementBlock(methodSource, sqlAnchor) {
    const anchorIdx = methodSource.indexOf(sqlAnchor);
    if (anchorIdx === -1) return null;
    const prepareIdx = methodSource.lastIndexOf('$this->db->prepare', anchorIdx);
    if (prepareIdx === -1) return null;
    const nextPrepare = methodSource.indexOf('$this->db->prepare', anchorIdx);
    const execIdx = methodSource.indexOf('->execute(', anchorIdx);
    const execNoArgsIdx = methodSource.indexOf('->execute();', anchorIdx);
    
    let endIdx = -1;
    if (execNoArgsIdx !== -1 && (nextPrepare === -1 || execNoArgsIdx < nextPrepare)) {
        endIdx = execNoArgsIdx + '->execute();'.length;
    } else if (execIdx !== -1 && (nextPrepare === -1 || execIdx < nextPrepare)) {
        const semicolonIdx = methodSource.indexOf(';', execIdx);
        if (semicolonIdx !== -1) {
            endIdx = semicolonIdx + 1;
        }
    }
    if (endIdx === -1) return null;
    return methodSource.slice(prepareIdx, endIdx);
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

// Helper: Extract balanced function call (e.g. AuditLogger::log(...))
function extractBalancedCall(source, prefix) {
    const idx = source.indexOf(prefix);
    if (idx === -1) return null;
    const openParen = source.indexOf('(', idx);
    if (openParen === -1) return null;
    let depth = 0;
    let inStr = null;
    for (let i = openParen; i < source.length; i++) {
        const ch = source[i];
        if (inStr) {
            if (ch === inStr && source[i - 1] !== '\\') {
                inStr = null;
            }
        } else {
            if (ch === '\'' || ch === '"') {
                inStr = ch;
            } else if (ch === '(') {
                depth++;
            } else if (ch === ')') {
                depth--;
                if (depth === 0) {
                    return source.slice(idx, i + 1);
                }
            }
        }
    }
    return null;
}

// Helper: Split top-level arguments of a call string
function splitTopLevelArgs(callStr) {
    const openParen = callStr.indexOf('(');
    const closeParen = callStr.lastIndexOf(')');
    if (openParen === -1 || closeParen === -1) return [];
    const inner = callStr.slice(openParen + 1, closeParen).trim();
    const args = [];
    let cur = '';
    let pDepth = 0, bDepth = 0, cDepth = 0;
    let inStr = null;
    for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (inStr) {
            cur += ch;
            if (ch === inStr && inner[i - 1] !== '\\') {
                inStr = null;
            }
        } else {
            if (ch === '\'' || ch === '"') {
                inStr = ch;
                cur += ch;
            } else if (ch === '(') {
                pDepth++;
                cur += ch;
            } else if (ch === ')') {
                pDepth--;
                cur += ch;
            } else if (ch === '[') {
                bDepth++;
                cur += ch;
            } else if (ch === ']') {
                bDepth--;
                cur += ch;
            } else if (ch === '{') {
                cDepth++;
                cur += ch;
            } else if (ch === '}') {
                cDepth--;
                cur += ch;
            } else if (ch === ',' && pDepth === 0 && bDepth === 0 && cDepth === 0) {
                args.push(cur.trim());
                cur = '';
            } else {
                cur += ch;
            }
        }
    }
    if (cur.trim()) args.push(cur.trim());
    return args;
}

function verify() {
    console.log('Starting Trainer Program Exercises API verification (Deterministic Contract Guard)...\n');

    if (!fs.existsSync(controllerPath) || !fs.existsSync(indexPath)) {
        console.error('❌ FAIL: Required files not found!');
        process.exit(1);
    }

    const controllerCode = fs.readFileSync(controllerPath, 'utf8');
    const indexCode = fs.readFileSync(indexPath, 'utf8');

    // Extract all methods using balanced braces
    const methods = {
        getTrainerProfileId: extractMethod(controllerCode, 'getTrainerProfileId'),
        getTrainerProfileIdForUpdate: extractMethod(controllerCode, 'getTrainerProfileIdForUpdate'),
        getJsonPayload: extractMethod(controllerCode, 'getJsonPayload'),
        index: extractMethod(controllerCode, 'index'),
        create: extractMethod(controllerCode, 'create'),
        update: extractMethod(controllerCode, 'update'),
        delete: extractMethod(controllerCode, 'delete')
    };

    for (const [name, body] of Object.entries(methods)) {
        if (!body) {
            console.error(`❌ FAIL: Method ${name} could not be extracted from TrainerProgramExerciseController.php`);
            process.exit(1);
        }
    }

    // 1. Invariant 1: Block-scoped route wiring & trainer firewall & restore route absence
    const collectionRoutePattern = '#^/api/trainer/training-programs/([1-9]\\d*)/exercises$#';
    const entityRoutePattern = '#^/api/trainer/program-exercises/([1-9]\\d*)$#';

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

    // Restore route must NOT exist for trainer program-exercises
    const restoreRouteRegex = /#\^\/api\/trainer\/program-exercises\/.*?restore/i;
    const noTrainerRestoreRoute = !restoreRouteRegex.test(indexCode);

    assert(
        Boolean(collectionRouteValid && entityRouteValid && noTrainerRestoreRoute),
        'Invariant 1: Routes are defined with block-scoped trainer firewall, strict method mappings, and absence of restore route'
    );

    // 2. Invariant 2: Trainer profile helper contracts (Method-scoped)
    const getTrainerValid = methods.getTrainerProfileId.includes("$adminId = (int)($_SESSION['admin_id'] ?? 0);") &&
        methods.getTrainerProfileId.includes("WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1") &&
        methods.getTrainerProfileId.includes("$stmt->bindValue(1, $adminId, \\PDO::PARAM_INT);") &&
        methods.getTrainerProfileId.includes("$stmt->execute();") &&
        methods.getTrainerProfileId.includes("if ($this->db->inTransaction()) {") &&
        methods.getTrainerProfileId.includes("$this->db->rollBack();") &&
        methods.getTrainerProfileId.includes("Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);") &&
        !methods.getTrainerProfileId.includes("FOR UPDATE");

    const getTrainerForUpdateValid = methods.getTrainerProfileIdForUpdate.includes("$adminId = (int)($_SESSION['admin_id'] ?? 0);") &&
        methods.getTrainerProfileIdForUpdate.includes("WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1") &&
        methods.getTrainerProfileIdForUpdate.includes("FOR UPDATE") &&
        methods.getTrainerProfileIdForUpdate.includes("$stmt->bindValue(1, $adminId, \\PDO::PARAM_INT);") &&
        methods.getTrainerProfileIdForUpdate.includes("$stmt->execute();") &&
        methods.getTrainerProfileIdForUpdate.includes("if ($this->db->inTransaction()) {") &&
        methods.getTrainerProfileIdForUpdate.includes("$this->db->rollBack();") &&
        methods.getTrainerProfileIdForUpdate.includes("Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);");

    assert(
        Boolean(getTrainerValid && getTrainerForUpdateValid),
        'Invariant 2: Trainer profile helpers enforce session normalization, active check, PARAM_INT binding, rollback guards, and distinct FOR UPDATE semantics'
    );

    // 3. Invariant 3: Strict JSON parser contract & exact allowlist (Method-scoped)
    const jsonParser = methods.getJsonPayload;
    const jsonParserValid = jsonParser.includes("explode(';', $contentType)[0]") &&
        jsonParser.includes("strcasecmp(") &&
        jsonParser.includes("application/json") &&
        jsonParser.includes("Response::error('Yalnızca JSON kabul edilmektedir.', 'UNSUPPORTED_MEDIA_TYPE', 415);") &&
        jsonParser.includes("strlen($raw) > 16384") &&
        jsonParser.includes("Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);") &&
        jsonParser.includes("json_last_error() !== JSON_ERROR_NONE") &&
        jsonParser.includes("!is_object($isObj)") &&
        jsonParser.includes("Response::error('JSON bir obje olmalıdır.', 'BAD_REQUEST', 400);") &&
        jsonParser.includes("$allowlist = ['exercise_name', 'sets', 'repetitions', 'duration_seconds', 'rest_seconds', 'instructions', 'sort_order'];") &&
        jsonParser.includes("foreach (array_keys($data) as $key)") &&
        jsonParser.includes("!in_array($key, $allowlist, true)") &&
        jsonParser.includes("VALIDATION_ERROR', 422);") &&
        !jsonParser.includes("empty($data)") &&
        !jsonParser.includes("Payload cannot be empty");

    assert(
        Boolean(jsonParserValid),
        'Invariant 3: Strict JSON parser enforces application/json MIME parameters, 16KB limit, object root, exact allowlist, and defers empty payload check'
    );

    // 4. Invariant 4: Business validations in create and update independently (Method-scoped)
    const createBody = methods.create;
    const updateBody = methods.update;

    const createValidations = createBody.includes("array_key_exists('exercise_name', $val)") &&
        createBody.includes("mb_strlen($val['exercise_name'], 'UTF-8')") &&
        createBody.includes("$len < 1 || $len > 160") &&
        createBody.includes("$sets < 1 || $sets > 65535") &&
        createBody.includes("mb_strlen($repetitions, 'UTF-8') > 40") &&
        createBody.includes("$duration_seconds < 1 || $duration_seconds > 4294967295") &&
        createBody.includes("$rest_seconds < 0 || $rest_seconds > 65535") &&
        createBody.includes("mb_strlen($instructions, 'UTF-8') > 1000") &&
        createBody.includes("$sort_order < 0 || $sort_order > 2147483647");

    const updateValidations = updateBody.includes("array_key_exists('exercise_name', $val)") &&
        updateBody.includes("mb_strlen($trimmedName, 'UTF-8')") &&
        updateBody.includes("$len < 1 || $len > 160") &&
        updateBody.includes("$sets < 1 || $sets > 65535") &&
        updateBody.includes("mb_strlen($repetitions, 'UTF-8') > 40") &&
        updateBody.includes("$duration_seconds < 1 || $duration_seconds > 4294967295") &&
        updateBody.includes("$rest_seconds < 0 || $rest_seconds > 65535") &&
        updateBody.includes("mb_strlen($instructions, 'UTF-8') > 1000") &&
        updateBody.includes("$sort_order < 0 || $sort_order > 2147483647");

    assert(
        Boolean(createValidations && updateValidations),
        'Invariant 4: Business validations enforce exercise_name (1-160), sets (1-65535), repetitions (max 40), duration (1-4294967295), rest (0-65535), instructions (max 1000), and sort_order (0-2147483647) in both create and update'
    );

    // 5. Invariant 5: Empty payload handling in create vs update (Method-scoped)
    const createEmptyPayload = createBody.includes("!array_key_exists('exercise_name', $val) || !is_string($val['exercise_name'])") &&
        createBody.includes("Response::error(\"exercise_name zorunludur ve metin olmalıdır.\", 'VALIDATION_ERROR', 422);");

    const updateEmptyIdx = updateBody.indexOf("if (empty($val)) {");
    const updateBeginTxIdx = updateBody.indexOf("$this->db->beginTransaction();");
    const updateEmptyPayload = updateEmptyIdx !== -1 &&
        updateBeginTxIdx !== -1 &&
        updateEmptyIdx < updateBeginTxIdx &&
        updateBody.includes("Response::error(\"Güncellenecek alan bulunamadı.\", 'VALIDATION_ERROR', 422);");

    assert(
        Boolean(createEmptyPayload && updateEmptyPayload),
        'Invariant 5: Empty-object contract correctly rejects create with required exercise_name 422 and update with pre-transaction 422'
    );

    // 6. Invariant 6: INDEX endpoint statement-isolated precheck binding & final SELECT race protection
    const indexBody = methods.index;
    const indexPrecheckStmt = extractStatementBlock(indexBody, 'SELECT tp.id');
    const indexFinalSelectStmt = extractStatementBlock(indexBody, 'FROM program_exercises pe');

    const indexPrecheckValid = Boolean(indexPrecheckStmt) &&
        indexPrecheckStmt.includes("SELECT tp.id") &&
        indexPrecheckStmt.includes("FROM training_programs tp") &&
        indexPrecheckStmt.includes("JOIN members m ON tp.member_id = m.id") &&
        indexPrecheckStmt.includes("tp.id = ?") &&
        indexPrecheckStmt.includes("tp.trainer_id = ?") &&
        indexPrecheckStmt.includes("tp.deleted_at IS NULL") &&
        indexPrecheckStmt.includes("m.trainer_id = ?") &&
        indexPrecheckStmt.includes("m.deleted_at IS NULL") &&
        indexPrecheckStmt.includes("$stmt->bindValue(1, $programId, \\PDO::PARAM_INT);") &&
        indexPrecheckStmt.includes("$stmt->bindValue(2, $trainerId, \\PDO::PARAM_INT);") &&
        indexPrecheckStmt.includes("$stmt->bindValue(3, $trainerId, \\PDO::PARAM_INT);") &&
        indexPrecheckStmt.includes("$stmt->execute();") &&
        !indexPrecheckStmt.includes("FOR UPDATE") &&
        indexBody.includes("Response::error('Program bulunamadı.', 'NOT_FOUND', 404);");

    const indexFinalSelectValid = Boolean(indexFinalSelectStmt) &&
        indexFinalSelectStmt.includes("SELECT pe.id, pe.program_id, pe.exercise_name") &&
        indexFinalSelectStmt.includes("FROM program_exercises pe") &&
        indexFinalSelectStmt.includes("JOIN training_programs tp ON pe.program_id = tp.id") &&
        indexFinalSelectStmt.includes("JOIN members m ON tp.member_id = m.id") &&
        indexFinalSelectStmt.includes("pe.program_id = ?") &&
        indexFinalSelectStmt.includes("tp.trainer_id = ?") &&
        indexFinalSelectStmt.includes("tp.deleted_at IS NULL") &&
        indexFinalSelectStmt.includes("m.trainer_id = ?") &&
        indexFinalSelectStmt.includes("m.deleted_at IS NULL") &&
        indexFinalSelectStmt.includes("ORDER BY pe.sort_order ASC, pe.id ASC") &&
        indexFinalSelectStmt.includes("$stmt->bindValue(1, $programId, \\PDO::PARAM_INT);") &&
        indexFinalSelectStmt.includes("$stmt->bindValue(2, $trainerId, \\PDO::PARAM_INT);") &&
        indexFinalSelectStmt.includes("$stmt->bindValue(3, $trainerId, \\PDO::PARAM_INT);") &&
        indexFinalSelectStmt.includes("$stmt->execute();");

    assert(
        Boolean(indexPrecheckValid && indexFinalSelectValid),
        'Invariant 6: Index endpoint enforces statement-isolated ownership precheck and statement-isolated race-safe final SELECT with explicit 3-parameter integer bindings'
    );

    // 7. Invariant 7: Mutation ordering in create, update, delete
    let mutationOrderValid = true;

    // Create ordering: beginTransaction -> getTrainerProfileIdForUpdate -> program lock FOR UPDATE -> INSERT -> lastInsertId -> commit -> audit
    const cBegin = createBody.indexOf('$this->db->beginTransaction();');
    const cTrainer = createBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const cProgramLock = createBody.indexOf('FOR UPDATE');
    const cInsert = createBody.indexOf('INSERT INTO program_exercises');
    const cLastId = createBody.indexOf('$this->db->lastInsertId()');
    const cCommit = createBody.indexOf('$this->db->commit();', cLastId);
    const cAudit = createBody.indexOf('AuditLogger::log', cCommit);

    if (cBegin === -1 || cTrainer === -1 || cProgramLock === -1 || cInsert === -1 || cLastId === -1 || cCommit === -1 || cAudit === -1 ||
        cBegin > cTrainer || cTrainer > cProgramLock || cProgramLock > cInsert || cInsert > cLastId || cLastId > cCommit || cCommit > cAudit) {
        console.error('❌ Mutation ordering invalid in create()');
        mutationOrderValid = false;
    }

    // Update ordering: beginTransaction -> getTrainerProfileIdForUpdate -> resource FOR UPDATE -> no-op check -> final UPDATE -> rowCount check -> final commit -> audit
    const uBegin = updateBody.indexOf('$this->db->beginTransaction();');
    const uTrainer = updateBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const uLock = updateBody.indexOf('FOR UPDATE');
    const uNoOp = updateBody.indexOf('if (empty($updates)) {');
    const uNoOpCommit = updateBody.indexOf('$this->db->commit();', uNoOp);
    const uUpdate = updateBody.indexOf('$sql = "UPDATE program_exercises SET "', uNoOpCommit);
    const uRowCount = updateBody.indexOf('$stmt->rowCount() !== 1', uUpdate);
    const uMutationCommit = updateBody.indexOf('$this->db->commit();', uRowCount);
    const uAudit = updateBody.indexOf('AuditLogger::log', uMutationCommit);

    if (uBegin === -1 || uTrainer === -1 || uLock === -1 || uNoOp === -1 || uNoOpCommit === -1 || uUpdate === -1 || uRowCount === -1 || uMutationCommit === -1 || uAudit === -1 ||
        uBegin > uTrainer || uTrainer > uLock || uLock > uNoOp || uNoOp > uNoOpCommit || uNoOpCommit > uUpdate || uUpdate > uRowCount || uRowCount > uMutationCommit || uMutationCommit > uAudit) {
        console.error('❌ Mutation ordering invalid in update()');
        mutationOrderValid = false;
    }

    // Delete ordering: beginTransaction -> getTrainerProfileIdForUpdate -> resource FOR UPDATE -> hard DELETE -> rowCount check -> commit -> audit
    const deleteBody = methods.delete;
    const dBegin = deleteBody.indexOf('$this->db->beginTransaction();');
    const dTrainer = deleteBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const dLock = deleteBody.indexOf('FOR UPDATE');
    const dDelete = deleteBody.indexOf('DELETE FROM program_exercises');
    const dRowCount = deleteBody.indexOf('$stmt->rowCount() !== 1', dDelete);
    const dCommit = deleteBody.indexOf('$this->db->commit();', dRowCount);
    const dAudit = deleteBody.indexOf('AuditLogger::log', dCommit);

    if (dBegin === -1 || dTrainer === -1 || dLock === -1 || dDelete === -1 || dRowCount === -1 || dCommit === -1 || dAudit === -1 ||
        dBegin > dTrainer || dTrainer > dLock || dLock > dDelete || dDelete > dRowCount || dRowCount > dCommit || dCommit > dAudit) {
        console.error('❌ Mutation ordering invalid in delete()');
        mutationOrderValid = false;
    }

    assert(
        mutationOrderValid,
        'Invariant 7: Mutation methods strictly order beginTransaction -> trainer lock -> resource/parent lock -> mutation -> rowCount check -> commit -> audit'
    );

    // 8. Invariant 8: CREATE statement-isolated parent lock & semantics
    const createLockStmt = extractStatementBlock(createBody, 'SELECT tp.id');
    const createSemanticsValid = Boolean(createLockStmt) &&
        createLockStmt.includes("SELECT tp.id") &&
        createLockStmt.includes("FROM training_programs tp") &&
        createLockStmt.includes("JOIN members m ON tp.member_id = m.id") &&
        createLockStmt.includes("tp.id = ?") &&
        createLockStmt.includes("tp.trainer_id = ?") &&
        createLockStmt.includes("tp.deleted_at IS NULL") &&
        createLockStmt.includes("m.trainer_id = ?") &&
        createLockStmt.includes("m.deleted_at IS NULL") &&
        createLockStmt.includes("FOR UPDATE") &&
        createLockStmt.includes("$stmt->bindValue(1, $programId, \\PDO::PARAM_INT);") &&
        createLockStmt.includes("$stmt->bindValue(2, $trainerId, \\PDO::PARAM_INT);") &&
        createLockStmt.includes("$stmt->bindValue(3, $trainerId, \\PDO::PARAM_INT);") &&
        createLockStmt.includes("$stmt->execute();") &&
        createBody.includes("INSERT INTO program_exercises") &&
        createBody.includes("$id = (int)$this->db->lastInsertId();") &&
        createBody.includes("$this->db->commit();") &&
        createBody.includes("Response::json(['id' => $id, 'program_id' => $programId], 201);");

    assert(
        Boolean(createSemanticsValid),
        'Invariant 8: CREATE enforces statement-isolated 3-parameter parent program lock FOR UPDATE, lastInsertId extraction, and 201 response'
    );

    // 9. Invariant 9: UPDATE statement-isolated ownership lock & final mutation boundary
    const updateLockStmt = extractStatementBlock(updateBody, 'FROM program_exercises pe');
    const updateLockMatch = Boolean(updateLockStmt) &&
        updateLockStmt.includes("SELECT pe.id, pe.program_id, pe.exercise_name") &&
        updateLockStmt.includes("FROM program_exercises pe") &&
        updateLockStmt.includes("JOIN training_programs tp ON pe.program_id = tp.id") &&
        updateLockStmt.includes("JOIN members m ON tp.member_id = m.id") &&
        updateLockStmt.includes("pe.id = ?") &&
        updateLockStmt.includes("tp.trainer_id = ?") &&
        updateLockStmt.includes("tp.deleted_at IS NULL") &&
        updateLockStmt.includes("m.trainer_id = ?") &&
        updateLockStmt.includes("m.deleted_at IS NULL") &&
        updateLockStmt.includes("FOR UPDATE") &&
        updateLockStmt.includes("$stmt->bindValue(1, $id, \\PDO::PARAM_INT);") &&
        updateLockStmt.includes("$stmt->bindValue(2, $trainerId, \\PDO::PARAM_INT);") &&
        updateLockStmt.includes("$stmt->bindValue(3, $trainerId, \\PDO::PARAM_INT);") &&
        updateLockStmt.includes("$stmt->execute();");

    const updateFinalMutationMatch = updateBody.includes("$sql = \"UPDATE program_exercises SET \" . implode(\", \", $updates) . \" WHERE id = ? AND program_id = ?\";") &&
        updateBody.includes("$params[] = $id;") &&
        updateBody.includes("$params[] = $programId;") &&
        updateBody.includes("$stmt->rowCount() !== 1");

    assert(
        Boolean(updateLockMatch && updateFinalMutationMatch),
        'Invariant 9: UPDATE ownership lock validates statement-isolated 3-parameter FOR UPDATE join query and enforces final update id/program_id boundary with rowCount check'
    );

    // 10. Invariant 10: PATCH idempotency early commit / no-op return
    const noOpEarlyCommit = updateBody.includes("if (empty($updates)) {\n                $this->db->commit();\n                Response::json(['success' => true]);\n            }");

    assert(
        Boolean(noOpEarlyCommit),
        'Invariant 10: Idempotent PATCH safely commits and returns 200 early without updating DB or firing AuditLogger'
    );

    // 11. Invariant 11: DELETE statement-isolated ownership lock & statement-isolated hard delete semantics
    const deleteLockStmt = extractStatementBlock(deleteBody, 'SELECT pe.id, pe.program_id');
    const deleteHardStmt = extractStatementBlock(deleteBody, 'DELETE FROM program_exercises');

    const deleteLockMatch = Boolean(deleteLockStmt) &&
        deleteLockStmt.includes("SELECT pe.id, pe.program_id") &&
        deleteLockStmt.includes("FROM program_exercises pe") &&
        deleteLockStmt.includes("JOIN training_programs tp ON pe.program_id = tp.id") &&
        deleteLockStmt.includes("JOIN members m ON tp.member_id = m.id") &&
        deleteLockStmt.includes("pe.id = ?") &&
        deleteLockStmt.includes("tp.trainer_id = ?") &&
        deleteLockStmt.includes("tp.deleted_at IS NULL") &&
        deleteLockStmt.includes("m.trainer_id = ?") &&
        deleteLockStmt.includes("m.deleted_at IS NULL") &&
        deleteLockStmt.includes("FOR UPDATE") &&
        deleteLockStmt.includes("$stmt->bindValue(1, $id, \\PDO::PARAM_INT);") &&
        deleteLockStmt.includes("$stmt->bindValue(2, $trainerId, \\PDO::PARAM_INT);") &&
        deleteLockStmt.includes("$stmt->bindValue(3, $trainerId, \\PDO::PARAM_INT);") &&
        deleteLockStmt.includes("$stmt->execute();");

    const deleteHardMutationMatch = Boolean(deleteHardStmt) &&
        deleteHardStmt.includes("DELETE FROM program_exercises WHERE id = ? AND program_id = ?") &&
        deleteHardStmt.includes("$stmt->bindValue(1, $id, \\PDO::PARAM_INT);") &&
        deleteHardStmt.includes("$stmt->bindValue(2, $programId, \\PDO::PARAM_INT);") &&
        deleteHardStmt.includes("$stmt->execute();") &&
        !deleteHardStmt.includes("deleted_at =") &&
        deleteBody.includes("$stmt->rowCount() !== 1");

    assert(
        Boolean(deleteLockMatch && deleteHardMutationMatch),
        'Invariant 11: DELETE enforces statement-isolated 3-parameter FOR UPDATE lock, statement-isolated hard DELETE with id/program_id PARAM_INT bindings and rowCount check'
    );

    // 12. Invariant 12: Balanced audit parser & 5-arg contract & privacy & dedicated inner try/catch isolation
    const mutationMethodNames = [
        { name: 'create', commitAnchor: 'INSERT INTO program_exercises' },
        { name: 'update', commitAnchor: '$sql = "UPDATE program_exercises SET "' },
        { name: 'delete', commitAnchor: '$stmt->rowCount() !== 1' }
    ];
    let auditAllValid = true;

    for (const { name: mName, commitAnchor } of mutationMethodNames) {
        const mBody = methods[mName];
        const auditCall = extractBalancedCall(mBody, 'AuditLogger::log(');
        if (!auditCall) {
            console.error(`❌ Invariant 12: Missing AuditLogger::log in ${mName}`);
            auditAllValid = false;
            continue;
        }

        const args = splitTopLevelArgs(auditCall);
        if (args.length !== 5) {
            console.error(`❌ Invariant 12: ${mName} AuditLogger::log does not have exactly 5 arguments (got ${args.length})`);
            auditAllValid = false;
            continue;
        }

        const [actionArg, adminArg, tableArg, idArg, metaArg] = args;
        if (!actionArg.includes('trainer_program_exercise.')) {
            console.error(`❌ Invariant 12: ${mName} AuditLogger action is not trainer_program_exercise.*`);
            auditAllValid = false;
        }
        if (!adminArg.includes('$currentAdminId')) {
            auditAllValid = false;
        }
        if (!tableArg.includes('program_exercise')) {
            auditAllValid = false;
        }

        // Privacy check: Ensure metadata does NOT leak raw content values
        const sensitiveValueKeys = ['exercise_name', 'repetitions', 'instructions', 'sets', 'duration_seconds', 'rest_seconds', 'sort_order'];
        for (const sKey of sensitiveValueKeys) {
            if (metaArg.includes(`'${sKey}' => $`) || metaArg.includes(`"${sKey}" => $`)) {
                console.error(`❌ Invariant 12: Privacy leak in ${mName} audit metadata for key ${sKey}`);
                auditAllValid = false;
            }
        }

        // Mutation commit must be after the mutation statement (preventing no-op commit confusion in update)
        const anchorIdx = mBody.indexOf(commitAnchor);
        if (anchorIdx === -1) {
            console.error(`❌ Invariant 12: Missing mutation anchor '${commitAnchor}' in ${mName}`);
            auditAllValid = false;
            continue;
        }

        const mutationCommitIdx = mBody.indexOf('$this->db->commit();', anchorIdx);
        const auditIdx = mBody.indexOf(auditCall);
        if (mutationCommitIdx === -1 || auditIdx < mutationCommitIdx) {
            console.error(`❌ Invariant 12: Audit call in ${mName} is not post-mutation-commit`);
            auditAllValid = false;
            continue;
        }

        // Dedicated inner try/catch block enclosing AuditLogger::log
        const innerTryIdx = mBody.lastIndexOf('try', auditIdx);
        if (innerTryIdx === -1 || innerTryIdx < mutationCommitIdx) {
            console.error(`❌ Invariant 12: Audit call in ${mName} is not enclosed in a dedicated inner try block after commit`);
            auditAllValid = false;
            continue;
        }

        const tryOpenBrace = mBody.indexOf('{', innerTryIdx);
        if (tryOpenBrace === -1 || tryOpenBrace > auditIdx) {
            console.error(`❌ Invariant 12: Invalid try block syntax before audit in ${mName}`);
            auditAllValid = false;
            continue;
        }

        let depth = 0;
        let tryCloseBrace = -1;
        for (let i = tryOpenBrace; i < mBody.length; i++) {
            if (mBody[i] === '{') depth++;
            else if (mBody[i] === '}') {
                depth--;
                if (depth === 0) {
                    tryCloseBrace = i;
                    break;
                }
            }
        }

        if (tryCloseBrace === -1 || auditIdx >= tryCloseBrace) {
            console.error(`❌ Invariant 12: Audit call in ${mName} is outside its inner try block`);
            auditAllValid = false;
            continue;
        }

        const afterTry = mBody.slice(tryCloseBrace + 1).trimStart();
        const catchMatch = afterTry.match(/^catch\s*\(\s*\\?Throwable\s+\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*\s*\)\s*\{/);
        if (!catchMatch) {
            console.error(`❌ Invariant 12: Dedicated inner catch (Throwable) block missing after audit try in ${mName}`);
            auditAllValid = false;
            continue;
        }
    }

    assert(
        auditAllValid,
        'Invariant 12: Balanced audit parser verifies 5 top-level arguments, zero sensitive value leaks, post-commit position, and dedicated Throwable try/catch isolation'
    );

    // 13. Invariant 13: Method-scoped transaction rollback in catch blocks
    let rollbackAllValid = true;
    for (const { name: mName } of mutationMethodNames) {
        const mBody = methods[mName];
        const catchBlock = mBody.slice(mBody.lastIndexOf('catch'));
        if (!catchBlock.includes('if ($this->db->inTransaction()) {') || !catchBlock.includes('$this->db->rollBack();')) {
            console.error(`❌ Invariant 13: Missing inTransaction rollback in ${mName} catch block`);
            rollbackAllValid = false;
        }
    }

    assert(
        rollbackAllValid,
        'Invariant 13: All mutation catch blocks enforce inTransaction conditional rollback before returning 500'
    );

    // 14. Invariant 14: Hard delete regression check (no soft-delete implementation in delete())
    const noSoftDeleteInDelete = !methods.delete.includes('deleted_at =');
    assert(
        noSoftDeleteInDelete,
        'Invariant 14: Delete method strictly maintains hard delete semantics without soft delete column updates'
    );

    console.log('\n----------------------------------------');
    if (hasErrors) {
        console.error('❌ Trainer Program Exercises Verification FAILED.\n');
        process.exit(1);
    } else {
        console.log('✅ Trainer Program Exercises Verification PASSED (All invariants verified).\n');
        process.exit(0);
    }
}

verify();
