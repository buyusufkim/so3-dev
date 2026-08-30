import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const controllerPath = path.join(rootDir, 'api', 'controllers', 'TrainerMemberProgressNoteController.php');
const indexPath = path.join(rootDir, 'api', 'index.php');

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
    console.log('Starting Trainer Member Progress Notes API verification (Deterministic Contract Guard)...\n');

    if (!fs.existsSync(controllerPath) || !fs.existsSync(indexPath)) {
        console.error('❌ FAIL: Required files not found!');
        process.exit(1);
    }

    const controllerCode = fs.readFileSync(controllerPath, 'utf8');
    const indexCode = fs.readFileSync(indexPath, 'utf8');

    // Extract all methods
    const methods = {
        getTrainerProfileId: extractMethod(controllerCode, 'getTrainerProfileId'),
        getTrainerProfileIdForUpdate: extractMethod(controllerCode, 'getTrainerProfileIdForUpdate'),
        getJsonPayload: extractMethod(controllerCode, 'getJsonPayload'),
        index: extractMethod(controllerCode, 'index'),
        show: extractMethod(controllerCode, 'show'),
        store: extractMethod(controllerCode, 'store'),
        update: extractMethod(controllerCode, 'update'),
        destroy: extractMethod(controllerCode, 'destroy'),
        restore: extractMethod(controllerCode, 'restore')
    };

    for (const [name, body] of Object.entries(methods)) {
        if (!body) {
            console.error(`❌ FAIL: Method ${name} could not be extracted from TrainerMemberProgressNoteController.php`);
            process.exit(1);
        }
    }

    // 1. Invariant 1: Block-scoped route wiring & trainer firewall
    const collectionRoutePattern = '#^/api/trainer/members/([1-9]\\d*)/progress-notes$#';
    const detailRoutePattern = '#^/api/trainer/member-progress-notes/([1-9]\\d*)$#';
    const restoreRoutePattern = '#^/api/trainer/member-progress-notes/([1-9]\\d*)/restore$#';

    const collectionBlock = extractRouteBlock(indexCode, collectionRoutePattern);
    const detailBlock = extractRouteBlock(indexCode, detailRoutePattern);
    const restoreBlock = extractRouteBlock(indexCode, restoreRoutePattern);

    const collectionRouteValid = collectionBlock &&
        collectionBlock.includes("AuthMiddleware::hasRole(['trainer']);") &&
        collectionBlock.includes("$method === 'GET'") &&
        collectionBlock.includes("$controller->index($memberId);") &&
        collectionBlock.includes("$method === 'POST'") &&
        collectionBlock.includes("$controller->store($memberId);") &&
        !collectionBlock.includes("$method === 'PATCH'") &&
        !collectionBlock.includes("$method === 'DELETE'");

    const detailRouteValid = detailBlock &&
        detailBlock.includes("AuthMiddleware::hasRole(['trainer']);") &&
        detailBlock.includes("$method === 'GET'") &&
        detailBlock.includes("$controller->show($id);") &&
        detailBlock.includes("$method === 'PATCH'") &&
        detailBlock.includes("$controller->update($id);") &&
        detailBlock.includes("$method === 'DELETE'") &&
        detailBlock.includes("$controller->destroy($id);") &&
        !detailBlock.includes("$method === 'POST'");

    const restoreRouteValid = restoreBlock &&
        restoreBlock.includes("AuthMiddleware::hasRole(['trainer']);") &&
        restoreBlock.includes("$method === 'POST'") &&
        (restoreBlock.includes("$controller->restore((int)$matches[1]);") || restoreBlock.includes("(new \\Controllers\\TrainerMemberProgressNoteController())->restore((int)$matches[1]);")) &&
        !restoreBlock.includes("$method === 'GET'") &&
        !restoreBlock.includes("$method === 'PATCH'") &&
        !restoreBlock.includes("$method === 'DELETE'");

    assert(
        Boolean(collectionRouteValid && detailRouteValid && restoreRouteValid),
        'Invariant 1: Routes are defined with block-scoped trainer role firewall and strictly mapped methods'
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
        jsonParser.includes("Response::error('Content-Type must be exactly application/json', 'UNSUPPORTED_MEDIA_TYPE', 415);") &&
        jsonParser.includes("strlen($raw) > 16384") &&
        jsonParser.includes("Response::error('Payload too large', 'PAYLOAD_TOO_LARGE', 413);") &&
        jsonParser.includes("json_last_error() !== JSON_ERROR_NONE") &&
        jsonParser.includes("!is_object($isObj)") &&
        jsonParser.includes("Response::error('Invalid JSON', 'BAD_REQUEST', 400);") &&
        jsonParser.includes("$allowlist = ['recorded_at', 'note'];") &&
        jsonParser.includes("foreach (array_keys($data) as $key)") &&
        jsonParser.includes("!in_array($key, $allowlist, true)") &&
        jsonParser.includes("VALIDATION_ERROR', 422);") &&
        !jsonParser.includes("empty($data)") &&
        !jsonParser.includes("Payload cannot be empty");

    assert(
        Boolean(jsonParserValid),
        'Invariant 3: Strict JSON parser enforces application/json MIME parameters, 16KB limit, object root, exact allowlist, and leaves empty payload handling to consumers'
    );

    // 4. Invariant 4: Field validations in store and update (Method-scoped)
    const storeBody = methods.store;
    const updateBody = methods.update;

    const storeFieldValidations = storeBody.includes("DateTime::createFromFormat('Y-m-d H:i:s', $payload['recorded_at'])") &&
        storeBody.includes("$d->format('Y-m-d H:i:s') !== $payload['recorded_at']") &&
        storeBody.includes("trim($payload['note']) === ''") &&
        storeBody.includes("mb_strlen($payload['note'], 'UTF-8')") &&
        storeBody.includes("$noteLen < 1 || $noteLen > 5000");

    const updateFieldValidations = updateBody.includes("DateTime::createFromFormat('Y-m-d H:i:s', $payload['recorded_at'])") &&
        updateBody.includes("$d->format('Y-m-d H:i:s') !== $payload['recorded_at']") &&
        updateBody.includes("trim($payload['note']) === ''") &&
        updateBody.includes("mb_strlen($payload['note'], 'UTF-8')") &&
        updateBody.includes("$noteLen < 1 || $noteLen > 5000");

    assert(
        Boolean(storeFieldValidations && updateFieldValidations),
        'Invariant 4: Field validators enforce exact DateTime format, non-empty trimmed note, and 1-5000 UTF-8 length bound'
    );

    // 5. Invariant 5: Pagination contract & integer overflow guard (Index scope)
    const idxIndex = methods.index;
    const paginationValid = idxIndex.includes("$pageRaw = $_GET['page'] ?? '1';") &&
        idxIndex.includes("$perPageRaw = $_GET['per_page'] ?? '20';") &&
        idxIndex.includes("preg_match('/^[1-9]\\d*$/', $pageRaw)") &&
        idxIndex.includes("preg_match('/^[1-9]\\d*$/', $perPageRaw)") &&
        idxIndex.includes("$perPage > 100") &&
        idxIndex.includes("($page - 1) > intdiv(PHP_INT_MAX, $perPage)") &&
        idxIndex.indexOf("($page - 1) > intdiv(PHP_INT_MAX, $perPage)") < idxIndex.indexOf("$offset = ($page - 1) * $perPage;") &&
        idxIndex.includes("$stmt->bindValue(4, $perPage, PDO::PARAM_INT);") &&
        idxIndex.includes("$stmt->bindValue(5, $offset, PDO::PARAM_INT);") &&
        idxIndex.includes("'items' => $items") &&
        idxIndex.includes("'pagination' => [");

    assert(
        Boolean(paginationValid),
        'Invariant 5: Pagination strictly enforces canonical integer validation, bounds, pre-multiplication overflow guard, and PARAM_INT binding'
    );

    // 6. Invariant 6: List ownership with separate COUNT and SELECT queries & deleted filter
    const countQueryMatch = idxIndex.includes("SELECT COUNT(*) FROM member_progress_notes pn JOIN members m ON pn.member_id = m.id WHERE $whereClause") &&
        idxIndex.includes("$countStmt->bindValue(1, $memberId, PDO::PARAM_INT);") &&
        idxIndex.includes("$countStmt->bindValue(2, $trainerId, PDO::PARAM_INT);") &&
        idxIndex.includes("$countStmt->bindValue(3, $trainerId, PDO::PARAM_INT);");

    const selectQueryMatch = idxIndex.includes("FROM member_progress_notes pn") &&
        idxIndex.includes("JOIN members m ON pn.member_id = m.id") &&
        idxIndex.includes("WHERE $whereClause") &&
        idxIndex.includes("ORDER BY pn.recorded_at DESC, pn.id DESC") &&
        idxIndex.includes("LIMIT ? OFFSET ?") &&
        idxIndex.includes("$stmt->bindValue(1, $memberId, PDO::PARAM_INT);") &&
        idxIndex.includes("$stmt->bindValue(2, $trainerId, PDO::PARAM_INT);") &&
        idxIndex.includes("$stmt->bindValue(3, $trainerId, PDO::PARAM_INT);") &&
        idxIndex.includes("$stmt->bindValue(4, $perPage, PDO::PARAM_INT);") &&
        idxIndex.includes("$stmt->bindValue(5, $offset, PDO::PARAM_INT);");

    const memberCheckMatch = idxIndex.includes("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL") &&
        idxIndex.includes("$memberCheckStmt->bindValue(1, $memberId, PDO::PARAM_INT);") &&
        idxIndex.includes("$memberCheckStmt->bindValue(2, $trainerId, PDO::PARAM_INT);") &&
        idxIndex.includes("Response::error('Member not found', 'NOT_FOUND', 404);");

    const deletedFilterMatch = idxIndex.includes("$deleted = $_GET['deleted'] ?? 'active';") &&
        idxIndex.includes("!in_array($deleted, ['active', 'deleted', 'all'], true)") &&
        idxIndex.includes("if ($deleted === 'active') {") &&
        idxIndex.includes("$where[] = \"pn.deleted_at IS NULL\";") &&
        idxIndex.includes("} elseif ($deleted === 'deleted') {") &&
        idxIndex.includes("$where[] = \"pn.deleted_at IS NOT NULL\";");

    assert(
        Boolean(countQueryMatch && selectQueryMatch && memberCheckMatch && deletedFilterMatch),
        'Invariant 6: List ownership restricts via member precheck and separate COUNT/SELECT with full identity bindings and active/deleted filters'
    );

    // 7. Invariant 7: Show endpoint ownership & 404 contract
    const showMethod = methods.show;
    const showValid = showMethod.includes("AuthMiddleware::hasRole(['trainer']);") &&
        showMethod.includes("FROM member_progress_notes pn") &&
        showMethod.includes("JOIN members m ON pn.member_id = m.id") &&
        showMethod.includes("WHERE pn.id = ?") &&
        showMethod.includes("pn.deleted_at IS NULL") &&
        showMethod.includes("m.trainer_id = ?") &&
        showMethod.includes("pn.trainer_id = ?") &&
        showMethod.includes("m.deleted_at IS NULL") &&
        showMethod.includes("$stmt->execute([$id, $trainerId, $trainerId]);") &&
        showMethod.includes("Response::error('Progress note not found', 'NOT_FOUND', 404);");

    assert(
        Boolean(showValid),
        'Invariant 7: Show endpoint verifies trainer identity, parent member ownership, active checks, and binds all 3 integer parameters'
    );

    // 8. Invariant 8: Strict mutation lock ordering
    let mutationOrderValid = true;

    // Store ordering: beginTransaction -> getTrainerProfileIdForUpdate -> member ownership FOR UPDATE -> INSERT -> commit -> audit
    const sBegin = storeBody.indexOf('$this->db->beginTransaction();');
    const sTrainer = storeBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const sMemberLock = storeBody.indexOf('FOR UPDATE');
    const sInsert = storeBody.indexOf('INSERT INTO member_progress_notes');
    const sCommit = storeBody.indexOf('$this->db->commit();');
    const sAudit = storeBody.indexOf('AuditLogger::log');

    if (sBegin === -1 || sTrainer === -1 || sMemberLock === -1 || sInsert === -1 || sCommit === -1 || sAudit === -1 ||
        sBegin > sTrainer || sTrainer > sMemberLock || sMemberLock > sInsert || sInsert > sCommit || sCommit > sAudit) {
        mutationOrderValid = false;
    }

    // Update ordering: beginTransaction -> getTrainerProfileIdForUpdate -> resource FOR UPDATE -> no-op check -> UPDATE -> commit -> audit
    const uBegin = updateBody.indexOf('$this->db->beginTransaction();');
    const uTrainer = updateBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const uLock = updateBody.indexOf('FOR UPDATE');
    const uNoOp = updateBody.indexOf('if (empty($updateFields)) {');
    const uUpdate = updateBody.indexOf('UPDATE member_progress_notes');
    const uMutationCommit = updateBody.indexOf('$this->db->commit();', uUpdate);
    const uAudit = updateBody.indexOf('AuditLogger::log');

    if (uBegin === -1 || uTrainer === -1 || uLock === -1 || uNoOp === -1 || uUpdate === -1 || uMutationCommit === -1 || uAudit === -1 ||
        uBegin > uTrainer || uTrainer > uLock || uLock > uNoOp || uNoOp > uUpdate || uUpdate > uMutationCommit || uMutationCommit > uAudit) {
        mutationOrderValid = false;
    }

    // Destroy ordering: beginTransaction -> getTrainerProfileIdForUpdate -> resource FOR UPDATE -> UPDATE (archive) -> commit -> audit
    const destroyBody = methods.destroy;
    const dBegin = destroyBody.indexOf('$this->db->beginTransaction();');
    const dTrainer = destroyBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const dLock = destroyBody.indexOf('FOR UPDATE');
    const dUpdate = destroyBody.indexOf('UPDATE member_progress_notes');
    const dCommit = destroyBody.indexOf('$this->db->commit();');
    const dAudit = destroyBody.indexOf('AuditLogger::log');

    if (dBegin === -1 || dTrainer === -1 || dLock === -1 || dUpdate === -1 || dCommit === -1 || dAudit === -1 ||
        dBegin > dTrainer || dTrainer > dLock || dLock > dUpdate || dUpdate > dCommit || dCommit > dAudit) {
        mutationOrderValid = false;
    }

    // Restore ordering: beginTransaction -> getTrainerProfileIdForUpdate -> resource FOR UPDATE -> UPDATE (restore) -> commit -> audit
    const restoreBody = methods.restore;
    const rBegin = restoreBody.indexOf('$this->db->beginTransaction();');
    const rTrainer = restoreBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const rLock = restoreBody.indexOf('FOR UPDATE');
    const rUpdate = restoreBody.indexOf('UPDATE member_progress_notes');
    const rCommit = restoreBody.indexOf('$this->db->commit();');
    const rAudit = restoreBody.indexOf('AuditLogger::log');

    if (rBegin === -1 || rTrainer === -1 || rLock === -1 || rUpdate === -1 || rCommit === -1 || rAudit === -1 ||
        rBegin > rTrainer || rTrainer > rLock || rLock > rUpdate || rUpdate > rCommit || rCommit > rAudit) {
        mutationOrderValid = false;
    }

    assert(
        mutationOrderValid,
        'Invariant 8: All four mutation methods strictly order beginTransaction -> trainer lock -> resource/parent lock -> mutation -> commit -> audit'
    );

    // 9. Invariant 9: CREATE semantics & member lock
    const createSemanticsValid = storeBody.includes("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL FOR UPDATE") &&
        storeBody.includes("INSERT INTO member_progress_notes") &&
        storeBody.includes("$insertStmt->rowCount() !== 1") &&
        storeBody.includes("$newId = (int)$this->db->lastInsertId();") &&
        storeBody.includes("$this->db->commit();") &&
        storeBody.includes("Response::json(['id' => $newId, 'uuid' => $uuid], 201);");

    assert(
        Boolean(createSemanticsValid),
        'Invariant 9: CREATE semantics verify parent member lock FOR UPDATE, lastInsertId extraction, 201 response, and rowCount check'
    );

    // 10. Invariant 10: UPDATE empty payload 422 vs no-op 200 separation & lock semantics
    const emptyPayloadIdx = updateBody.indexOf("if (empty($payload)) {");
    const beginTxIdx = updateBody.indexOf("$this->db->beginTransaction();");
    const emptyValidatedIdx = updateBody.indexOf("if (empty($validated)) {");
    const noOpIdx = updateBody.indexOf("if (empty($updateFields)) {");
    const updateSqlIdx = updateBody.indexOf("UPDATE member_progress_notes");
    const updateAuditIdx = updateBody.indexOf("AuditLogger::log");

    const updateSemanticsValid = emptyPayloadIdx !== -1 &&
        beginTxIdx !== -1 &&
        emptyPayloadIdx < beginTxIdx &&
        emptyValidatedIdx !== -1 &&
        emptyValidatedIdx < beginTxIdx &&
        updateBody.includes("Response::error('Empty payload', 'VALIDATION_ERROR', 422);") &&
        updateBody.includes("SELECT pn.*, m.trainer_id as current_member_trainer, m.deleted_at as member_deleted_at") &&
        updateBody.includes("FOR UPDATE") &&
        updateBody.includes("AND m.deleted_at IS NULL") &&
        updateBody.includes("AND pn.deleted_at IS NULL") &&
        updateBody.includes("$stmt->bindValue(':id', $id, PDO::PARAM_INT);") &&
        updateBody.includes("$stmt->bindValue(':pn_trainer_id', $trainerId, PDO::PARAM_INT);") &&
        updateBody.includes("$stmt->bindValue(':m_trainer_id', $trainerId, PDO::PARAM_INT);") &&
        noOpIdx !== -1 &&
        updateSqlIdx !== -1 &&
        noOpIdx < updateSqlIdx &&
        (updateAuditIdx === -1 || noOpIdx < updateAuditIdx) &&
        updateBody.includes("if (empty($updateFields)) {\n                $this->db->commit();\n                Response::json(['success' => true]);\n                return;\n            }") &&
        updateBody.includes("AND member_id IN (SELECT id FROM members WHERE trainer_id = ? AND deleted_at IS NULL)");

    assert(
        Boolean(updateSemanticsValid),
        'Invariant 10: UPDATE strictly differentiates pre-transaction empty payload 422 from post-lock no-op commit 200 without DB update or audit'
    );

    // 11. Invariant 11: DELETE soft delete semantics & parent boundary
    const destroyArchiveQuery = destroyBody.includes("SELECT pn.id, pn.member_id, pn.deleted_at, m.trainer_id as current_member_trainer, m.deleted_at as member_deleted_at") &&
        destroyBody.includes("FOR UPDATE") &&
        destroyBody.includes("UPDATE member_progress_notes") &&
        destroyBody.includes("SET deleted_at = CURRENT_TIMESTAMP, updated_by = ?") &&
        destroyBody.includes("WHERE id = ?") &&
        destroyBody.includes("AND trainer_id = ?") &&
        destroyBody.includes("AND deleted_at IS NULL") &&
        destroyBody.includes("AND member_id IN (SELECT id FROM members WHERE trainer_id = ? AND deleted_at IS NULL)");

    const destroyBindings = destroyBody.includes("$delStmt->execute([$adminId, $id, $trainerId, $trainerId]);") &&
        destroyBody.includes("$stmt->bindValue(':id', $id, PDO::PARAM_INT);") &&
        destroyBody.includes("$stmt->bindValue(':pn_trainer_id', $trainerId, PDO::PARAM_INT);") &&
        destroyBody.includes("$stmt->bindValue(':m_trainer_id', $trainerId, PDO::PARAM_INT);");

    const destroySemanticsValid = destroyArchiveQuery &&
        destroyBindings &&
        !destroyBody.includes("DELETE FROM") &&
        destroyBody.includes("$delStmt->rowCount() !== 1") &&
        destroyBody.includes("$this->db->commit();");

    assert(
        Boolean(destroySemanticsValid),
        'Invariant 11: DELETE enforces soft delete with rowCount check, active parent boundary, and no hard delete'
    );

    // 12. Invariant 12: RESTORE parent-only active lock & 409 conflict
    const restoreLockQuery = restoreBody.includes("SELECT pn.id, pn.member_id, pn.deleted_at, m.trainer_id as current_member_trainer, m.deleted_at as member_deleted_at") &&
        restoreBody.includes("FROM member_progress_notes pn") &&
        restoreBody.includes("JOIN members m ON pn.member_id = m.id") &&
        restoreBody.includes("WHERE pn.id = :id") &&
        restoreBody.includes("AND pn.trainer_id = :pn_trainer_id") &&
        restoreBody.includes("AND m.trainer_id = :m_trainer_id") &&
        restoreBody.includes("AND m.deleted_at IS NULL") &&
        !restoreBody.includes("AND pn.deleted_at IS NULL") &&
        restoreBody.includes("FOR UPDATE");

    const restoreConflict = restoreBody.includes("if ($current['deleted_at'] === null) {") &&
        restoreBody.includes("Response::error('Progress note is not archived', 'PROGRESS_NOTE_NOT_ARCHIVED', 409);");

    const restoreUpdateQuery = restoreBody.includes("UPDATE member_progress_notes") &&
        restoreBody.includes("SET deleted_at = NULL, updated_by = ?") &&
        restoreBody.includes("WHERE id = ?") &&
        restoreBody.includes("AND trainer_id = ?") &&
        restoreBody.includes("AND deleted_at IS NOT NULL") &&
        restoreBody.includes("AND member_id IN (SELECT id FROM members WHERE trainer_id = ? AND deleted_at IS NULL)");

    const restoreBindings = restoreBody.includes("$resStmt->execute([$adminId, $id, $trainerId, $trainerId]);") &&
        restoreBody.includes("$stmt->bindValue(':id', $id, PDO::PARAM_INT);") &&
        restoreBody.includes("$stmt->bindValue(':pn_trainer_id', $trainerId, PDO::PARAM_INT);") &&
        restoreBody.includes("$stmt->bindValue(':m_trainer_id', $trainerId, PDO::PARAM_INT);");

    const restoreSemanticsValid = restoreLockQuery &&
        restoreConflict &&
        restoreUpdateQuery &&
        restoreBindings &&
        restoreBody.includes("$resStmt->rowCount() !== 1") &&
        restoreBody.includes("$this->db->commit();");

    assert(
        Boolean(restoreSemanticsValid),
        'Invariant 12: RESTORE enforces parent-only active lock (no pn.deleted_at IS NULL), 409 conflict for active items, and rowCount verification'
    );

    // 13. Invariant 13: Audit call extraction & 5-arg contract
    const mutationMethodNames = ['store', 'update', 'destroy', 'restore'];
    let auditAllValid = true;

    for (const mName of mutationMethodNames) {
        const mBody = methods[mName];
        const auditCall = extractBalancedCall(mBody, 'AuditLogger::log(');
        if (!auditCall) {
            console.error(`❌ Invariant 13: Missing AuditLogger::log in ${mName}`);
            auditAllValid = false;
            continue;
        }

        const args = splitTopLevelArgs(auditCall);
        if (args.length !== 5) {
            console.error(`❌ Invariant 13: ${mName} AuditLogger::log does not have exactly 5 arguments (got ${args.length})`);
            auditAllValid = false;
            continue;
        }

        const [actionArg, adminArg, tableArg, idArg, metaArg] = args;
        if (!actionArg.includes('trainer_member_progress_note.')) {
            console.error(`❌ Invariant 13: ${mName} AuditLogger action is not trainer_member_progress_note.*`);
            auditAllValid = false;
        }
        if (!adminArg.includes('$adminId')) {
            auditAllValid = false;
        }
        if (!tableArg.includes('member_progress_notes')) {
            auditAllValid = false;
        }

        // Privacy check: Ensure metadata does NOT leak raw progress note content values
        const sensitiveValueKeys = ['note', 'recorded_at'];
        for (const sKey of sensitiveValueKeys) {
            // Check for key mappings like 'note' => $payload['note']
            if (metaArg.includes(`'${sKey}' =>`) || metaArg.includes(`"${sKey}" =>`)) {
                console.error(`❌ Invariant 13: Privacy leak in ${mName} audit metadata for key ${sKey}`);
                auditAllValid = false;
            }
        }

        // Audit error boundary: must be inside try/catch(Throwable $e) and post-commit
        const commitIdx = mBody.indexOf('$this->db->commit();');
        const auditIdx = mBody.indexOf(auditCall);
        if (commitIdx === -1 || auditIdx < commitIdx) {
            console.error(`❌ Invariant 13: Audit call in ${mName} is not post-commit`);
            auditAllValid = false;
        }

        if (!mBody.includes('catch (Throwable $e)') && !mBody.includes('catch (Throwable $auditError)')) {
            console.error(`❌ Invariant 13: Audit call in ${mName} is missing Throwable catch error boundary`);
            auditAllValid = false;
        }
    }

    assert(
        auditAllValid,
        'Invariant 13: Balanced audit parser verifies 5 top-level arguments, zero sensitive value leaks, post-commit position, and Throwable error isolation'
    );

    // 14. Invariant 14: Method-scoped transaction rollback in catch blocks
    let rollbackAllValid = true;
    for (const mName of mutationMethodNames) {
        const mBody = methods[mName];
        const catchBlock = mBody.slice(mBody.lastIndexOf('catch'));
        if (!catchBlock.includes('if ($this->db->inTransaction()) {') || !catchBlock.includes('$this->db->rollBack();')) {
            console.error(`❌ Invariant 14: Missing inTransaction rollback in ${mName} catch block`);
            rollbackAllValid = false;
        }
    }

    assert(
        rollbackAllValid,
        'Invariant 14: All 4 mutation catch blocks enforce inTransaction conditional rollback before returning 500'
    );

    // 15. Invariant 15: Named placeholders uniqueness
    const namedPlaceholdersValid = controllerCode.includes(":pn_trainer_id") && controllerCode.includes(":m_trainer_id");
    assert(
        namedPlaceholdersValid,
        'Invariant 15: Named placeholders are uniquely defined across joined entity filters'
    );

    // 16. Invariant 16: Explicit regression invariants
    const noHardDeleteInController = !controllerCode.includes('DELETE FROM');
    const restoreRoutePreserved = indexCode.includes('trainer/member-progress-notes/([1-9]\\d*)/restore');
    const noSpuriousMutations = !indexCode.match(/#\^\/api\/trainer\/member-progress-notes\/.*?#.*?(PUT)/);

    assert(
        Boolean(noHardDeleteInController && restoreRoutePreserved && noSpuriousMutations),
        'Invariant 16: Regression invariants guard against hard delete, restore removal, or arbitrary PUT methods'
    );

    console.log('\n----------------------------------------');
    if (hasErrors) {
        console.error('❌ Trainer Member Progress Notes Verification FAILED.\n');
        process.exit(1);
    } else {
        console.log('✅ Trainer Member Progress Notes Verification PASSED (All 16 invariants verified).\n');
        process.exit(0);
    }
}

verify();
