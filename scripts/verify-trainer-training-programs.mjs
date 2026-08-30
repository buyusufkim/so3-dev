import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const indexPath = path.join(rootDir, 'api', 'index.php');
const controllerPath = path.join(rootDir, 'api', 'controllers', 'TrainerTrainingProgramController.php');

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
    console.log('Starting Trainer Training Programs API verification (Deterministic Contract Guard)...\n');

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
        validateDate: extractMethod(controllerCode, 'validateDate'),
        generateUuid: extractMethod(controllerCode, 'generateUuid'),
        index: extractMethod(controllerCode, 'index'),
        show: extractMethod(controllerCode, 'show'),
        create: extractMethod(controllerCode, 'create'),
        update: extractMethod(controllerCode, 'update'),
        delete: extractMethod(controllerCode, 'delete')
    };

    for (const [name, body] of Object.entries(methods)) {
        if (!body) {
            console.error(`❌ FAIL: Method ${name} could not be extracted from TrainerTrainingProgramController.php`);
            process.exit(1);
        }
    }

    // 1. Invariant 1: Block-scoped route wiring & trainer firewall & restore route absence
    const collectionRoutePattern = '#^/api/trainer/members/([1-9]\\d*)/training-programs$#';
    const detailRoutePattern = '#^/api/trainer/training-programs/([1-9]\\d*)$#';

    const collectionBlock = extractRouteBlock(indexCode, collectionRoutePattern);
    const detailBlock = extractRouteBlock(indexCode, detailRoutePattern);

    const collectionRouteValid = collectionBlock &&
        collectionBlock.includes("AuthMiddleware::hasRole(['trainer']);") &&
        collectionBlock.includes("$method === 'GET'") &&
        collectionBlock.includes("$controller->index($memberId);") &&
        collectionBlock.includes("$method === 'POST'") &&
        collectionBlock.includes("$controller->create($memberId);") &&
        !collectionBlock.includes("$method === 'PATCH'") &&
        !collectionBlock.includes("$method === 'DELETE'");

    const detailRouteValid = detailBlock &&
        detailBlock.includes("AuthMiddleware::hasRole(['trainer']);") &&
        detailBlock.includes("$method === 'GET'") &&
        detailBlock.includes("$controller->show($id);") &&
        detailBlock.includes("$method === 'PATCH'") &&
        detailBlock.includes("$controller->update($id);") &&
        detailBlock.includes("$method === 'DELETE'") &&
        detailBlock.includes("$controller->delete($id);") &&
        !detailBlock.includes("$method === 'POST'");

    // Restore route must NOT exist for trainer training-programs
    const restoreRouteRegex = /#\^\/api\/trainer\/training-programs\/.*?restore/i;
    const noTrainerRestoreRoute = !restoreRouteRegex.test(indexCode);

    assert(
        Boolean(collectionRouteValid && detailRouteValid && noTrainerRestoreRoute),
        'Invariant 1: Routes are defined with block-scoped trainer firewall, strict method mappings, and absence of restore route'
    );

    // 2. Invariant 2: Trainer profile helper contracts (Method-scoped)
    const getTrainerValid = methods.getTrainerProfileId.includes("$adminId = (int)($_SESSION['admin_id'] ?? 0);") &&
        methods.getTrainerProfileId.includes("WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1") &&
        methods.getTrainerProfileId.includes("$stmt->execute([$adminId]);") &&
        methods.getTrainerProfileId.includes("if ($this->db->inTransaction()) {") &&
        methods.getTrainerProfileId.includes("$this->db->rollBack();") &&
        methods.getTrainerProfileId.includes("Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);") &&
        !methods.getTrainerProfileId.includes("FOR UPDATE");

    const getTrainerForUpdateValid = methods.getTrainerProfileIdForUpdate.includes("$adminId = (int)($_SESSION['admin_id'] ?? 0);") &&
        methods.getTrainerProfileIdForUpdate.includes("WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1") &&
        methods.getTrainerProfileIdForUpdate.includes("FOR UPDATE") &&
        methods.getTrainerProfileIdForUpdate.includes("$stmt->execute([$adminId]);") &&
        methods.getTrainerProfileIdForUpdate.includes("if ($this->db->inTransaction()) {") &&
        methods.getTrainerProfileIdForUpdate.includes("$this->db->rollBack();") &&
        methods.getTrainerProfileIdForUpdate.includes("Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);");

    assert(
        Boolean(getTrainerValid && getTrainerForUpdateValid),
        'Invariant 2: Trainer profile helpers enforce session normalization, active check, rollback guards, and distinct FOR UPDATE semantics'
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
        jsonParser.includes("$allowlist = ['title', 'status', 'start_date', 'end_date', 'notes'];") &&
        jsonParser.includes("foreach (array_keys($data) as $key)") &&
        jsonParser.includes("!in_array($key, $allowlist, true)") &&
        jsonParser.includes("VALIDATION_ERROR', 422);") &&
        !jsonParser.includes("empty($data)") &&
        !jsonParser.includes("Payload cannot be empty");

    assert(
        Boolean(jsonParserValid),
        'Invariant 3: Strict JSON parser enforces application/json MIME parameters, 16KB limit, object root, exact allowlist, and defers empty payload check'
    );

    // 4. Invariant 4: Date helper & business validations in create/update (Method-scoped)
    const validateDateValid = methods.validateDate.includes("if ($date === null) return true;") &&
        methods.validateDate.includes("if (!is_string($date)) return false;") &&
        methods.validateDate.includes("\\DateTime::createFromFormat('Y-m-d', $date)") &&
        methods.validateDate.includes("$d->format('Y-m-d') === $date");

    const createBody = methods.create;
    const updateBody = methods.update;

    const createValidations = createBody.includes("array_key_exists('title', $val)") &&
        createBody.includes("mb_strlen($val['title'], 'UTF-8')") &&
        createBody.includes("$titleLen < 1 || $titleLen > 160") &&
        createBody.includes("in_array($status, ['draft', 'active', 'archived'], true)") &&
        createBody.includes("$this->validateDate($start_date)") &&
        createBody.includes("$this->validateDate($end_date)") &&
        createBody.includes("$end_date < $start_date") &&
        createBody.includes("mb_strlen($notes, 'UTF-8') > 3000");

    const updateValidations = updateBody.includes("array_key_exists('title', $val)") &&
        updateBody.includes("mb_strlen($t, 'UTF-8')") &&
        updateBody.includes("$len < 1 || $len > 160") &&
        updateBody.includes("in_array($s, ['draft', 'active', 'archived'], true)") &&
        updateBody.includes("$this->validateDate($sd)") &&
        updateBody.includes("$this->validateDate($ed)") &&
        updateBody.includes("$finalEndDate < $finalStartDate") &&
        updateBody.includes("mb_strlen($n, 'UTF-8') > 3000");

    assert(
        Boolean(validateDateValid && createValidations && updateValidations),
        'Invariant 4: Business validations enforce title (1-160), status enum, Y-m-d dates, end_date >= start_date, and notes limit (3000)'
    );

    // 5. Invariant 5: Empty payload handling in create vs update (Method-scoped)
    // create: missing title triggers 422
    const createEmptyPayload = createBody.includes("!array_key_exists('title', $val) || !is_string($val['title'])") &&
        createBody.includes("Response::error(\"title zorunludur ve metin olmalıdır.\", 'VALIDATION_ERROR', 422);");

    // update: empty($val) before beginTransaction triggers 422
    const updateEmptyIdx = updateBody.indexOf("if (empty($val)) {");
    const updateBeginTxIdx = updateBody.indexOf("$this->db->beginTransaction();");
    const updateEmptyPayload = updateEmptyIdx !== -1 &&
        updateBeginTxIdx !== -1 &&
        updateEmptyIdx < updateBeginTxIdx &&
        updateBody.includes("Response::error(\"En az bir alan gönderilmelidir.\", 'VALIDATION_ERROR', 422);");

    assert(
        Boolean(createEmptyPayload && updateEmptyPayload),
        'Invariant 5: Empty-object contract correctly rejects create with required title 422 and update with pre-transaction 422'
    );

    // 6. Invariant 6: Pagination contract & integer overflow guard (Index scope)
    const indexBody = methods.index;
    const paginationValid = indexBody.includes("$pageRaw = $_GET['page'] ?? '1';") &&
        indexBody.includes("$perPageRaw = $_GET['per_page'] ?? '20';") &&
        indexBody.includes("preg_match('/^[1-9]\\d*$/', $pageRaw)") &&
        indexBody.includes("preg_match('/^[1-9]\\d*$/', $perPageRaw)") &&
        indexBody.includes("$perPage > 100") &&
        indexBody.includes("($page - 1) > intdiv(PHP_INT_MAX, $perPage)") &&
        indexBody.indexOf("($page - 1) > intdiv(PHP_INT_MAX, $perPage)") < indexBody.indexOf("$offset = ($page - 1) * $perPage;") &&
        indexBody.includes("$stmt->bindValue($paramIndex++, $perPage, PDO::PARAM_INT);") &&
        indexBody.includes("$stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);") &&
        indexBody.includes("'items' => $normalizedItems") &&
        indexBody.includes("'pagination' => [");

    assert(
        Boolean(paginationValid),
        'Invariant 6: Pagination strictly enforces canonical integer validation, bounds, pre-multiplication overflow guard, and PARAM_INT binding'
    );

    // 7. Invariant 7: List ownership with separate COUNT and SELECT queries & status filter
    const memberCheckMatch = indexBody.includes("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL") &&
        indexBody.includes("$stmt->execute([$memberId, $trainerId]);") &&
        indexBody.includes("Response::error('Üye bulunamadı.', 'NOT_FOUND', 404);");

    const countQueryMatch = indexBody.includes("SELECT COUNT(*)") &&
        indexBody.includes("FROM training_programs tp") &&
        indexBody.includes("JOIN members m ON tp.member_id = m.id") &&
        indexBody.includes("tp.member_id = ?") &&
        indexBody.includes("tp.trainer_id = ?") &&
        indexBody.includes("m.trainer_id = ?") &&
        indexBody.includes("m.deleted_at IS NULL") &&
        indexBody.includes("tp.deleted_at IS NULL") &&
        indexBody.includes("$countStmt->bindValue($paramIndex++, $param, PDO::PARAM_INT);");

    const selectQueryMatch = indexBody.includes("SELECT \n                tp.id, tp.uuid, tp.title, tp.status, tp.start_date, tp.end_date, \n                tp.created_at, tp.updated_at\n            FROM training_programs tp\n            JOIN members m ON tp.member_id = m.id") &&
        indexBody.includes("ORDER BY tp.id DESC") &&
        indexBody.includes("LIMIT ? OFFSET ?") &&
        indexBody.includes("$stmt->bindValue($paramIndex++, $param, PDO::PARAM_INT);") &&
        indexBody.includes("$stmt->bindValue($paramIndex++, $perPage, PDO::PARAM_INT);") &&
        indexBody.includes("$stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);");

    const statusFilterMatch = indexBody.includes("$status = isset($_GET['status']) ? $_GET['status'] : null;") &&
        indexBody.includes("!in_array($status, ['draft', 'active', 'archived'])") &&
        indexBody.includes("$conditions[] = 'tp.status = ?';");

    assert(
        Boolean(memberCheckMatch && countQueryMatch && selectQueryMatch && statusFilterMatch),
        'Invariant 7: List ownership restricts via member precheck and separate COUNT/SELECT with full identity bindings and status filter'
    );

    // 8. Invariant 8: SHOW endpoint ownership & 404 contract
    const showBody = methods.show;
    const showValid = showBody.includes("AuthMiddleware::hasRole(['trainer']);") &&
        showBody.includes("FROM training_programs tp") &&
        showBody.includes("JOIN members m ON tp.member_id = m.id") &&
        showBody.includes("JOIN trainers t ON tp.trainer_id = t.id") &&
        showBody.includes("tp.id = ?") &&
        showBody.includes("tp.trainer_id = ?") &&
        showBody.includes("tp.deleted_at IS NULL") &&
        showBody.includes("m.trainer_id = ?") &&
        showBody.includes("m.deleted_at IS NULL") &&
        showBody.includes("$stmt->execute([$id, $trainerId, $trainerId]);") &&
        showBody.includes("Response::error('Program bulunamadı.', 'NOT_FOUND', 404);") &&
        showBody.includes("'member' => [") &&
        showBody.includes("'trainer' => [");

    assert(
        Boolean(showValid),
        'Invariant 8: Show endpoint verifies trainer identity, parent member trainer, active checks, and binds all 3 integer parameters'
    );

    // 9. Invariant 9: Strict mutation ordering in create, update, delete
    let mutationOrderValid = true;

    // Create ordering: beginTransaction -> getTrainerProfileIdForUpdate -> member lock FOR UPDATE -> INSERT -> commit -> audit
    const cBegin = createBody.indexOf('$this->db->beginTransaction();');
    const cTrainer = createBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const cMemberLock = createBody.indexOf('FOR UPDATE');
    const cInsert = createBody.indexOf('INSERT INTO training_programs');
    const cCommit = createBody.indexOf('$this->db->commit();', cInsert);
    const cAudit = createBody.indexOf('AuditLogger::log', cCommit);

    if (cBegin === -1 || cTrainer === -1 || cMemberLock === -1 || cInsert === -1 || cCommit === -1 || cAudit === -1 ||
        cBegin > cTrainer || cTrainer > cMemberLock || cMemberLock > cInsert || cInsert > cCommit || cCommit > cAudit) {
        console.error('❌ Mutation ordering invalid in create()');
        mutationOrderValid = false;
    }

    // Update ordering: beginTransaction -> getTrainerProfileIdForUpdate -> resource FOR UPDATE -> no-op check -> final UPDATE -> final mutation commit -> audit
    const uBegin = updateBody.indexOf('$this->db->beginTransaction();');
    const uTrainer = updateBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const uLock = updateBody.indexOf('FOR UPDATE');
    const uNoOp = updateBody.indexOf('if (!$changed) {');
    const uNoOpCommit = updateBody.indexOf('$this->db->commit();', uNoOp);
    const uUpdate = updateBody.indexOf('UPDATE training_programs', uNoOpCommit);
    const uMutationCommit = updateBody.indexOf('$this->db->commit();', uUpdate);
    const uAudit = updateBody.indexOf('AuditLogger::log', uMutationCommit);

    if (uBegin === -1 || uTrainer === -1 || uLock === -1 || uNoOp === -1 || uNoOpCommit === -1 || uUpdate === -1 || uMutationCommit === -1 || uAudit === -1 ||
        uBegin > uTrainer || uTrainer > uLock || uLock > uNoOp || uNoOp > uNoOpCommit || uNoOpCommit > uUpdate || uUpdate > uMutationCommit || uMutationCommit > uAudit) {
        console.error('❌ Mutation ordering invalid in update()');
        mutationOrderValid = false;
    }

    // Delete ordering: beginTransaction -> getTrainerProfileIdForUpdate -> resource FOR UPDATE -> UPDATE (archive) -> rowCount check -> commit -> audit
    const deleteBody = methods.delete;
    const dBegin = deleteBody.indexOf('$this->db->beginTransaction();');
    const dTrainer = deleteBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const dLock = deleteBody.indexOf('FOR UPDATE');
    const dUpdate = deleteBody.indexOf('UPDATE training_programs');
    const dRowCount = deleteBody.indexOf('$stmt->rowCount() !== 1', dUpdate);
    const dCommit = deleteBody.indexOf('$this->db->commit();', dRowCount);
    const dAudit = deleteBody.indexOf('AuditLogger::log', dCommit);

    if (dBegin === -1 || dTrainer === -1 || dLock === -1 || dUpdate === -1 || dRowCount === -1 || dCommit === -1 || dAudit === -1 ||
        dBegin > dTrainer || dTrainer > dLock || dLock > dUpdate || dUpdate > dRowCount || dRowCount > dCommit || dCommit > dAudit) {
        console.error('❌ Mutation ordering invalid in delete()');
        mutationOrderValid = false;
    }

    assert(
        mutationOrderValid,
        'Invariant 9: Mutation methods strictly order beginTransaction -> trainer lock -> resource/parent lock -> mutation -> commit -> audit'
    );

    // 10. Invariant 10: CREATE ownership lock & semantics
    const createSemanticsValid = createBody.includes("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL FOR UPDATE") &&
        createBody.includes("$stmt->execute([$memberId, $trainerId]);") &&
        createBody.includes("INSERT INTO training_programs") &&
        createBody.includes("$program_id = (int)$this->db->lastInsertId();") &&
        createBody.includes("$this->db->commit();") &&
        createBody.includes("Response::json(['id' => $program_id, 'uuid' => $uuid], 201);");

    assert(
        Boolean(createSemanticsValid),
        'Invariant 10: CREATE enforces parent member lock FOR UPDATE with 2 parameters, lastInsertId extraction, and 201 response'
    );

    // 11. Invariant 11: UPDATE ownership lock & final mutation boundary
    const updateLockMatch = updateBody.includes("SELECT tp.* \n                FROM training_programs tp\n                JOIN members m ON tp.member_id = m.id\n                WHERE tp.id = ? \n                  AND tp.trainer_id = ? \n                  AND tp.deleted_at IS NULL\n                  AND m.trainer_id = ?\n                  AND m.deleted_at IS NULL \n                FOR UPDATE") &&
        updateBody.includes("$stmt->execute([$id, $trainerId, $trainerId]);");

    const updateFinalMutationMatch = updateBody.includes("UPDATE training_programs \n                SET title = ?, status = ?, start_date = ?, end_date = ?, notes = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP\n                WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL") &&
        updateBody.includes("$stmt->execute([\n                $finalTitle, $finalStatus, $finalStartDate, $finalEndDate, $finalNotes, $currentAdminId, $id, $trainerId\n            ]);");

    assert(
        Boolean(updateLockMatch && updateFinalMutationMatch),
        'Invariant 11: UPDATE ownership lock validates 3-parameter FOR UPDATE join query and enforces final update trainer/active predicates'
    );

    // 12. Invariant 12: DELETE ownership lock & soft delete semantics
    const deleteLockMatch = deleteBody.includes("SELECT tp.* \n                FROM training_programs tp\n                JOIN members m ON tp.member_id = m.id\n                WHERE tp.id = ? \n                  AND tp.trainer_id = ? \n                  AND tp.deleted_at IS NULL\n                  AND m.trainer_id = ?\n                  AND m.deleted_at IS NULL \n                FOR UPDATE") &&
        deleteBody.includes("$stmt->execute([$id, $trainerId, $trainerId]);");

    const deleteSoftMutationMatch = deleteBody.includes("UPDATE training_programs \n                SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? \n                WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL") &&
        deleteBody.includes("$stmt->execute([$currentAdminId, $id, $trainerId]);") &&
        deleteBody.includes("$stmt->rowCount() !== 1") &&
        !deleteBody.includes("DELETE FROM");

    assert(
        Boolean(deleteLockMatch && deleteSoftMutationMatch),
        'Invariant 12: DELETE enforces 3-parameter FOR UPDATE lock, soft delete with rowCount validation, and no hard delete'
    );

    // 13. Invariant 13: PATCH idempotency early commit / no-op return
    const noOpEarlyCommit = updateBody.includes("if (!$changed) {\n                $this->db->commit();\n                Response::json(['success' => true]);\n            }");

    assert(
        Boolean(noOpEarlyCommit),
        'Invariant 13: Idempotent PATCH safely commits and returns 200 early without updating DB or firing AuditLogger'
    );

    // 14. Invariant 14: Balanced audit parser & 5-arg contract & privacy & dedicated inner try/catch isolation
    const mutationMethodNames = [
        { name: 'create', commitAnchor: 'INSERT INTO training_programs' },
        { name: 'update', commitAnchor: 'UPDATE training_programs' },
        { name: 'delete', commitAnchor: '$stmt->rowCount() !== 1' }
    ];
    let auditAllValid = true;

    for (const { name: mName, commitAnchor } of mutationMethodNames) {
        const mBody = methods[mName];
        const auditCall = extractBalancedCall(mBody, 'AuditLogger::log(');
        if (!auditCall) {
            console.error(`❌ Invariant 14: Missing AuditLogger::log in ${mName}`);
            auditAllValid = false;
            continue;
        }

        const args = splitTopLevelArgs(auditCall);
        if (args.length !== 5) {
            console.error(`❌ Invariant 14: ${mName} AuditLogger::log does not have exactly 5 arguments (got ${args.length})`);
            auditAllValid = false;
            continue;
        }

        const [actionArg, adminArg, tableArg, idArg, metaArg] = args;
        if (!actionArg.includes('trainer_training_program.')) {
            console.error(`❌ Invariant 14: ${mName} AuditLogger action is not trainer_training_program.*`);
            auditAllValid = false;
        }
        if (!adminArg.includes('$currentAdminId')) {
            auditAllValid = false;
        }
        if (!tableArg.includes('training_program')) {
            auditAllValid = false;
        }

        // Privacy check: Ensure metadata does NOT leak raw content values
        const sensitiveValueKeys = ['title', 'notes', 'start_date', 'end_date'];
        for (const sKey of sensitiveValueKeys) {
            if (metaArg.includes(`'${sKey}' =>`) || metaArg.includes(`"${sKey}" =>`)) {
                console.error(`❌ Invariant 14: Privacy leak in ${mName} audit metadata for key ${sKey}`);
                auditAllValid = false;
            }
        }

        // Mutation commit must be after the mutation statement (preventing no-op commit confusion in update)
        const anchorIdx = mBody.indexOf(commitAnchor);
        if (anchorIdx === -1) {
            console.error(`❌ Invariant 14: Missing mutation anchor '${commitAnchor}' in ${mName}`);
            auditAllValid = false;
            continue;
        }

        const mutationCommitIdx = mBody.indexOf('$this->db->commit();', anchorIdx);
        const auditIdx = mBody.indexOf(auditCall);
        if (mutationCommitIdx === -1 || auditIdx < mutationCommitIdx) {
            console.error(`❌ Invariant 14: Audit call in ${mName} is not post-mutation-commit`);
            auditAllValid = false;
            continue;
        }

        // Dedicated inner try/catch block enclosing AuditLogger::log
        const innerTryIdx = mBody.lastIndexOf('try', auditIdx);
        if (innerTryIdx === -1 || innerTryIdx < mutationCommitIdx) {
            console.error(`❌ Invariant 14: Audit call in ${mName} is not enclosed in a dedicated inner try block after commit`);
            auditAllValid = false;
            continue;
        }

        const tryOpenBrace = mBody.indexOf('{', innerTryIdx);
        if (tryOpenBrace === -1 || tryOpenBrace > auditIdx) {
            console.error(`❌ Invariant 14: Invalid try block syntax before audit in ${mName}`);
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
            console.error(`❌ Invariant 14: Audit call in ${mName} is outside its inner try block`);
            auditAllValid = false;
            continue;
        }

        const afterTry = mBody.slice(tryCloseBrace + 1).trimStart();
        const catchMatch = afterTry.match(/^catch\s*\(\s*\\?Throwable\s+\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*\s*\)\s*\{/);
        if (!catchMatch) {
            console.error(`❌ Invariant 14: Dedicated inner catch (Throwable) block missing after audit try in ${mName}`);
            auditAllValid = false;
            continue;
        }
    }

    assert(
        auditAllValid,
        'Invariant 14: Balanced audit parser verifies 5 top-level arguments, zero sensitive value leaks, post-commit position, and Throwable error isolation'
    );

    // 15. Invariant 15: Method-scoped transaction rollback in catch blocks
    let rollbackAllValid = true;
    for (const { name: mName } of mutationMethodNames) {
        const mBody = methods[mName];
        const catchBlock = mBody.slice(mBody.lastIndexOf('catch'));
        if (!catchBlock.includes('if ($this->db->inTransaction()) {') || !catchBlock.includes('$this->db->rollBack();')) {
            console.error(`❌ Invariant 15: Missing inTransaction rollback in ${mName} catch block`);
            rollbackAllValid = false;
        }
    }

    assert(
        rollbackAllValid,
        'Invariant 15: All mutation catch blocks enforce inTransaction conditional rollback before returning 500'
    );

    // 16. Invariant 16: Explicit regression invariants
    const noHardDeleteInController = !controllerCode.includes('DELETE FROM');
    assert(
        noHardDeleteInController,
        'Invariant 16: Controller strictly forbids hard delete statements'
    );

    console.log('\n----------------------------------------');
    if (hasErrors) {
        console.error('❌ Trainer Training Programs Verification FAILED.\n');
        process.exit(1);
    } else {
        console.log('✅ Trainer Training Programs Verification PASSED (All 16 invariants verified).\n');
        process.exit(0);
    }
}

verify();
