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

    // 6. Invariant 6: INDEX endpoint ownership precheck & final SELECT race protection (Index scope)
    const indexBody = methods.index;
    const indexPrecheckValid = indexBody.includes("SELECT tp.id") &&
        indexBody.includes("FROM training_programs tp") &&
        indexBody.includes("JOIN members m ON tp.member_id = m.id") &&
        indexBody.includes("tp.id = ?") &&
        indexBody.includes("tp.trainer_id = ?") &&
        indexBody.includes("tp.deleted_at IS NULL") &&
        indexBody.includes("m.trainer_id = ?") &&
        indexBody.includes("m.deleted_at IS NULL") &&
        indexBody.includes("$stmt->bindValue(1, $programId, \\PDO::PARAM_INT);") &&
        indexBody.includes("$stmt->bindValue(2, $trainerId, \\PDO::PARAM_INT);") &&
        indexBody.includes("$stmt->bindValue(3, $trainerId, \\PDO::PARAM_INT);") &&
        indexBody.includes("Response::error('Program bulunamadı.', 'NOT_FOUND', 404);");

    const indexFinalSelectValid = indexBody.includes("SELECT pe.id, pe.program_id, pe.exercise_name, pe.sets, pe.repetitions, \n                       pe.duration_seconds, pe.rest_seconds, pe.instructions, pe.sort_order, \n                       pe.created_at, pe.updated_at\n                FROM program_exercises pe\n                JOIN training_programs tp ON pe.program_id = tp.id\n                JOIN members m ON tp.member_id = m.id\n                WHERE pe.program_id = ?\n                  AND tp.trainer_id = ?\n                  AND tp.deleted_at IS NULL\n                  AND m.trainer_id = ?\n                  AND m.deleted_at IS NULL\n                ORDER BY pe.sort_order ASC, pe.id ASC") &&
        indexBody.includes("$stmt->bindValue(1, $programId, \\PDO::PARAM_INT);") &&
        indexBody.includes("$stmt->bindValue(2, $trainerId, \\PDO::PARAM_INT);") &&
        indexBody.includes("$stmt->bindValue(3, $trainerId, \\PDO::PARAM_INT);");

    assert(
        Boolean(indexPrecheckValid && indexFinalSelectValid),
        'Invariant 6: Index endpoint enforces separate ownership precheck and final race-safe SELECT with explicit 3-parameter integer bindings'
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

    // 8. Invariant 8: CREATE ownership lock & semantics
    const createSemanticsValid = createBody.includes("SELECT tp.id \n                FROM training_programs tp\n                JOIN members m ON tp.member_id = m.id\n                WHERE tp.id = ? \n                  AND tp.trainer_id = ? \n                  AND tp.deleted_at IS NULL\n                  AND m.trainer_id = ? \n                  AND m.deleted_at IS NULL\n                FOR UPDATE") &&
        createBody.includes("$stmt->bindValue(1, $programId, \\PDO::PARAM_INT);") &&
        createBody.includes("$stmt->bindValue(2, $trainerId, \\PDO::PARAM_INT);") &&
        createBody.includes("$stmt->bindValue(3, $trainerId, \\PDO::PARAM_INT);") &&
        createBody.includes("INSERT INTO program_exercises") &&
        createBody.includes("$id = (int)$this->db->lastInsertId();") &&
        createBody.includes("$this->db->commit();") &&
        createBody.includes("Response::json(['id' => $id, 'program_id' => $programId], 201);");

    assert(
        Boolean(createSemanticsValid),
        'Invariant 8: CREATE enforces 3-parameter parent program lock FOR UPDATE, lastInsertId extraction, and 201 response'
    );

    // 9. Invariant 9: UPDATE ownership lock & final mutation boundary
    const updateLockMatch = updateBody.includes("SELECT pe.id, pe.program_id, pe.exercise_name, pe.sets, pe.repetitions, \n                       pe.duration_seconds, pe.rest_seconds, pe.instructions, pe.sort_order\n                FROM program_exercises pe\n                JOIN training_programs tp ON pe.program_id = tp.id\n                JOIN members m ON tp.member_id = m.id\n                WHERE pe.id = ? \n                  AND tp.trainer_id = ? \n                  AND tp.deleted_at IS NULL\n                  AND m.trainer_id = ? \n                  AND m.deleted_at IS NULL\n                FOR UPDATE") &&
        updateBody.includes("$stmt->bindValue(1, $id, \\PDO::PARAM_INT);") &&
        updateBody.includes("$stmt->bindValue(2, $trainerId, \\PDO::PARAM_INT);") &&
        updateBody.includes("$stmt->bindValue(3, $trainerId, \\PDO::PARAM_INT);");

    const updateFinalMutationMatch = updateBody.includes("$sql = \"UPDATE program_exercises SET \" . implode(\", \", $updates) . \" WHERE id = ? AND program_id = ?\";") &&
        updateBody.includes("$params[] = $id;") &&
        updateBody.includes("$params[] = $programId;") &&
        updateBody.includes("$stmt->rowCount() !== 1");

    assert(
        Boolean(updateLockMatch && updateFinalMutationMatch),
        'Invariant 9: UPDATE ownership lock validates 3-parameter FOR UPDATE join query and enforces final update id/program_id boundary with rowCount check'
    );

    // 10. Invariant 10: PATCH idempotency early commit / no-op return
    const noOpEarlyCommit = updateBody.includes("if (empty($updates)) {\n                $this->db->commit();\n                Response::json(['success' => true]);\n            }");

    assert(
        Boolean(noOpEarlyCommit),
        'Invariant 10: Idempotent PATCH safely commits and returns 200 early without updating DB or firing AuditLogger'
    );

    // 11. Invariant 11: DELETE ownership lock & hard delete semantics
    const deleteLockMatch = deleteBody.includes("SELECT pe.id, pe.program_id \n                FROM program_exercises pe\n                JOIN training_programs tp ON pe.program_id = tp.id\n                JOIN members m ON tp.member_id = m.id\n                WHERE pe.id = ? \n                  AND tp.trainer_id = ? \n                  AND tp.deleted_at IS NULL\n                  AND m.trainer_id = ? \n                  AND m.deleted_at IS NULL\n                FOR UPDATE") &&
        deleteBody.includes("$stmt->bindValue(1, $id, \\PDO::PARAM_INT);") &&
        deleteBody.includes("$stmt->bindValue(2, $trainerId, \\PDO::PARAM_INT);") &&
        deleteBody.includes("$stmt->bindValue(3, $trainerId, \\PDO::PARAM_INT);");

    const deleteHardMutationMatch = deleteBody.includes("$stmt = $this->db->prepare(\"DELETE FROM program_exercises WHERE id = ? AND program_id = ?\");") &&
        deleteBody.includes("$stmt->bindValue(1, $id, \\PDO::PARAM_INT);") &&
        deleteBody.includes("$stmt->bindValue(2, $programId, \\PDO::PARAM_INT);") &&
        deleteBody.includes("$stmt->rowCount() !== 1") &&
        !deleteBody.includes("deleted_at =");

    assert(
        Boolean(deleteLockMatch && deleteHardMutationMatch),
        'Invariant 11: DELETE enforces 3-parameter FOR UPDATE lock, explicit hard DELETE with id/program_id PARAM_INT bindings and rowCount check'
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
