import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const controllerPath = path.join(rootDir, 'api', 'controllers', 'TrainerMemberMeasurementController.php');
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
    console.log('Starting Trainer Member Measurements API verification (Deterministic Contract Guard)...\n');

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
        checkMemberOwnership: extractMethod(controllerCode, 'checkMemberOwnership'),
        checkMemberOwnershipForUpdate: extractMethod(controllerCode, 'checkMemberOwnershipForUpdate'),
        getJsonPayload: extractMethod(controllerCode, 'getJsonPayload'),
        validateMeasurement: extractMethod(controllerCode, 'validateMeasurement'),
        index: extractMethod(controllerCode, 'index'),
        show: extractMethod(controllerCode, 'show'),
        store: extractMethod(controllerCode, 'store'),
        update: extractMethod(controllerCode, 'update'),
        destroy: extractMethod(controllerCode, 'destroy'),
        restore: extractMethod(controllerCode, 'restore')
    };

    for (const [name, body] of Object.entries(methods)) {
        if (!body) {
            console.error(`❌ FAIL: Method ${name} could not be extracted from TrainerMemberMeasurementController.php`);
            process.exit(1);
        }
    }

    // 1. Invariant 1: Block-scoped route wiring & trainer firewall
    const collectionRoutePattern = '#^/api/trainer/members/([1-9]\\d*)/measurements$#';
    const detailRoutePattern = '#^/api/trainer/member-measurements/([1-9]\\d*)$#';
    const restoreRoutePattern = '#^/api/trainer/member-measurements/([1-9]\\d*)/restore$#';

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
        (restoreBlock.includes("$controller->restore((int)$matches[1]);") || restoreBlock.includes("(new \\Controllers\\TrainerMemberMeasurementController())->restore((int)$matches[1]);")) &&
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
        methods.getTrainerProfileId.includes("$stmt->bindValue(1, $adminId, PDO::PARAM_INT);") &&
        methods.getTrainerProfileId.includes("Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);") &&
        !methods.getTrainerProfileId.includes("FOR UPDATE");

    const getTrainerForUpdateValid = methods.getTrainerProfileIdForUpdate.includes("$adminId = (int)($_SESSION['admin_id'] ?? 0);") &&
        methods.getTrainerProfileIdForUpdate.includes("WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1") &&
        methods.getTrainerProfileIdForUpdate.includes("FOR UPDATE") &&
        methods.getTrainerProfileIdForUpdate.includes("$stmt->bindValue(1, $adminId, PDO::PARAM_INT);") &&
        methods.getTrainerProfileIdForUpdate.includes("Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);");

    assert(
        Boolean(getTrainerValid && getTrainerForUpdateValid),
        'Invariant 2: Trainer profile helpers use strict session cast, active filter, PARAM_INT binding and distinct FOR UPDATE semantics'
    );

    // 3. Invariant 3: Member ownership helper contracts (Method-scoped)
    const checkMemberOwnershipValid = methods.checkMemberOwnership.includes("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL") &&
        methods.checkMemberOwnership.includes("$stmt->bindValue(1, $memberId, PDO::PARAM_INT);") &&
        methods.checkMemberOwnership.includes("$stmt->bindValue(2, $trainerId, PDO::PARAM_INT);") &&
        methods.checkMemberOwnership.includes("Response::error('Member not found or not assigned to you.', 'NOT_FOUND', 404);") &&
        !methods.checkMemberOwnership.includes("FOR UPDATE");

    const checkMemberOwnershipForUpdateValid = methods.checkMemberOwnershipForUpdate.includes("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL FOR UPDATE") &&
        methods.checkMemberOwnershipForUpdate.includes("$stmt->bindValue(1, $memberId, PDO::PARAM_INT);") &&
        methods.checkMemberOwnershipForUpdate.includes("$stmt->bindValue(2, $trainerId, PDO::PARAM_INT);") &&
        methods.checkMemberOwnershipForUpdate.includes("Response::error('Member not found or not assigned to you.', 'NOT_FOUND', 404);") &&
        methods.checkMemberOwnershipForUpdate.includes("FOR UPDATE");

    assert(
        Boolean(checkMemberOwnershipValid && checkMemberOwnershipForUpdateValid),
        'Invariant 3: Member ownership helpers enforce trainer-member relation, deleted_at check, 404 contract, and distinct lock semantics'
    );

    // 4. Invariant 4: Strict JSON parser contract (Method-scoped)
    const jsonParserValid = methods.getJsonPayload.includes("explode(';', $contentType)[0]") &&
        methods.getJsonPayload.includes("application/json") &&
        methods.getJsonPayload.includes("Response::error('Content-Type must be exactly application/json', 'UNSUPPORTED_MEDIA_TYPE', 415);") &&
        methods.getJsonPayload.includes("strlen($raw) > 16384") &&
        methods.getJsonPayload.includes("Response::error('Payload too large', 'PAYLOAD_TOO_LARGE', 413);") &&
        methods.getJsonPayload.includes("json_last_error() !== JSON_ERROR_NONE") &&
        methods.getJsonPayload.includes("Response::error('Invalid JSON', 'BAD_REQUEST', 400);") &&
        methods.getJsonPayload.includes("!is_object($isObj)") &&
        methods.getJsonPayload.includes("Response::error('JSON root must be an object', 'BAD_REQUEST', 400);") &&
        !methods.getJsonPayload.includes("empty($payload)") &&
        !methods.getJsonPayload.includes("Payload cannot be empty");

    assert(
        Boolean(jsonParserValid),
        'Invariant 4: Strict JSON parser enforces application/json MIME parameters, 16KB limit, object root, and leaves empty payload handling to consumers'
    );

    // 5. Invariant 5: Exact allowlist & unknown key 422 rejection (Method-scoped for store and update)
    const expectedKeys = ['measured_at', 'weight_kg', 'body_fat_percent', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm', 'notes'];
    
    const storeAllowlistValid = expectedKeys.every(k => methods.store.includes(`'${k}'`)) &&
        methods.store.includes("foreach (array_keys($payload) as $key)") &&
        methods.store.includes("!in_array($key, $allowedKeys, true)") &&
        methods.store.includes("VALIDATION_ERROR', 422);");

    const updateAllowlistValid = expectedKeys.every(k => methods.update.includes(`'${k}'`)) &&
        methods.update.includes("foreach (array_keys($payload) as $key)") &&
        methods.update.includes("!in_array($key, $allowedKeys, true)") &&
        methods.update.includes("VALIDATION_ERROR', 422);");

    assert(
        Boolean(storeAllowlistValid && updateAllowlistValid),
        'Invariant 5: Exact 9-field allowlist and unknown-key 422 rejection enforced independently in store and update'
    );

    // 6. Invariant 6: Measurement validation helper & field validation contracts
    const validateMeasurementValid = methods.validateMeasurement.includes("if ($val === null) return null;") &&
        methods.validateMeasurement.includes("!is_int($val) && !is_float($val)") &&
        methods.validateMeasurement.includes("is_nan($val) || is_infinite($val)") &&
        methods.validateMeasurement.includes("if ($allowZero) {") &&
        methods.validateMeasurement.includes("$val < 0 || $val > $maxLimit") &&
        methods.validateMeasurement.includes("$val <= 0 || $val > $maxLimit") &&
        methods.validateMeasurement.includes("abs(round((float)$val, 2) - (float)$val)") &&
        methods.validateMeasurement.includes("at most 2 decimal places");

    const storeFieldValidations = methods.store.includes("preg_match('/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$/', $payload['measured_at'])") &&
        methods.store.includes("\\DateTime::createFromFormat('Y-m-d H:i:s', $payload['measured_at'])") &&
        methods.store.includes("mb_strlen($payload['notes'], 'UTF-8') > 1000") &&
        methods.store.includes("body_fat_percent', 100.0, true") &&
        methods.store.includes("weight_kg', 9999.99") &&
        methods.store.includes("$weight === null && $bf === null && $chest === null && $waist === null && $hip === null && $arm === null && $thigh === null");

    const updateFieldValidations = methods.update.includes("preg_match('/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$/', $payload['measured_at'])") &&
        methods.update.includes("\\DateTime::createFromFormat('Y-m-d H:i:s', $payload['measured_at'])") &&
        methods.update.includes("mb_strlen($payload['notes'], 'UTF-8') > 1000") &&
        methods.update.includes("body_fat_percent', 100.0, true") &&
        methods.update.includes("weight_kg', 9999.99");

    assert(
        Boolean(validateMeasurementValid && storeFieldValidations && updateFieldValidations),
        'Invariant 6: Measurement validator enforces null acceptance, NaN/Inf rejection, zero-allow rules, 2 decimals, calendar validation, and notes limit'
    );

    // 7. Invariant 7: Pagination contract & integer overflow guard (Index scope)
    const idxIndex = methods.index;
    const paginationValid = idxIndex.includes("$pageRaw = $_GET['page'] ?? '1';") &&
        idxIndex.includes("$perPageRaw = $_GET['per_page'] ?? '20';") &&
        idxIndex.includes("preg_match('/^[1-9]\\d*$/', $pageRaw)") &&
        idxIndex.includes("preg_match('/^[1-9]\\d*$/', $perPageRaw)") &&
        idxIndex.includes("$perPage > 100") &&
        idxIndex.includes("$maxPageForOffset = intdiv(PHP_INT_MAX, $perPage);") &&
        idxIndex.includes("($page - 1) > $maxPageForOffset") &&
        idxIndex.indexOf("$maxPageForOffset = intdiv(PHP_INT_MAX, $perPage);") < idxIndex.indexOf("$offset = ($page - 1) * $perPage;") &&
        idxIndex.includes("$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);") &&
        idxIndex.includes("$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);") &&
        idxIndex.includes("'items' => $items") &&
        idxIndex.includes("'pagination' => [");

    assert(
        Boolean(paginationValid),
        'Invariant 7: Pagination strictly enforces canonical integer validation, bounds, pre-multiplication overflow guard, and PARAM_INT binding'
    );

    // 8. Invariant 8: List ownership with separate COUNT and SELECT queries & deleted filter
    const countQueryMatch = idxIndex.includes("SELECT COUNT(*) FROM member_measurements JOIN members mem ON member_measurements.member_id = mem.id WHERE $where") &&
        idxIndex.includes("$countStmt->bindValue(':member_id', $memberId, PDO::PARAM_INT);") &&
        idxIndex.includes("$countStmt->bindValue(':measurement_trainer_id', $trainerId, PDO::PARAM_INT);") &&
        idxIndex.includes("$countStmt->bindValue(':member_trainer_id', $trainerId, PDO::PARAM_INT);");

    const selectQueryMatch = idxIndex.includes("FROM member_measurements") &&
        idxIndex.includes("JOIN members mem ON member_measurements.member_id = mem.id") &&
        idxIndex.includes("WHERE $where") &&
        idxIndex.includes("ORDER BY member_measurements.measured_at DESC, member_measurements.id DESC") &&
        idxIndex.includes("LIMIT :limit OFFSET :offset") &&
        idxIndex.includes("$stmt->bindValue(':member_id', $memberId, PDO::PARAM_INT);") &&
        idxIndex.includes("$stmt->bindValue(':measurement_trainer_id', $trainerId, PDO::PARAM_INT);") &&
        idxIndex.includes("$stmt->bindValue(':member_trainer_id', $trainerId, PDO::PARAM_INT);") &&
        idxIndex.includes("$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);") &&
        idxIndex.includes("$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);");

    const deletedFilterMatch = idxIndex.includes("$deleted = $_GET['deleted'] ?? 'active';") &&
        idxIndex.includes("!in_array($deleted, ['active', 'deleted', 'all'], true)") &&
        idxIndex.includes("if ($deleted === 'active') {") &&
        idxIndex.includes("$where .= \" AND member_measurements.deleted_at IS NULL\";") &&
        idxIndex.includes("} elseif ($deleted === 'deleted') {") &&
        idxIndex.includes("$where .= \" AND member_measurements.deleted_at IS NOT NULL\";");

    assert(
        Boolean(countQueryMatch && selectQueryMatch && deletedFilterMatch),
        'Invariant 8: List ownership restricts via separate COUNT/SELECT with full identity bindings and active/deleted filter semantics'
    );

    // 9. Invariant 9: Show endpoint ownership & binding
    const showMethod = methods.show;
    const showValid = showMethod.includes("AuthMiddleware::hasRole(['trainer']);") &&
        showMethod.includes("FROM member_measurements m") &&
        showMethod.includes("JOIN members mem ON m.member_id = mem.id") &&
        showMethod.includes("WHERE m.id = :id") &&
        showMethod.includes("m.trainer_id = :measurement_trainer_id") &&
        showMethod.includes("mem.trainer_id = :member_trainer_id") &&
        showMethod.includes("mem.deleted_at IS NULL") &&
        showMethod.includes("m.deleted_at IS NULL") &&
        showMethod.includes("$stmt->bindValue(':id', $id, PDO::PARAM_INT);") &&
        showMethod.includes("$stmt->bindValue(':measurement_trainer_id', $trainerId, PDO::PARAM_INT);") &&
        showMethod.includes("$stmt->bindValue(':member_trainer_id', $trainerId, PDO::PARAM_INT);") &&
        showMethod.includes("Response::error('Measurement not found', 'NOT_FOUND', 404);");

    assert(
        Boolean(showValid),
        'Invariant 9: Show endpoint verifies trainer identity, parent member ownership, active checks, and binds all 3 integer parameters'
    );

    // 10. Invariant 10: Strict mutation lock ordering
    let mutationOrderValid = true;

    // Store ordering: beginTransaction -> getTrainerProfileIdForUpdate -> checkMemberOwnershipForUpdate -> INSERT
    const storeBody = methods.store;
    const sBegin = storeBody.indexOf('$this->db->beginTransaction();');
    const sTrainer = storeBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const sMemberLock = storeBody.indexOf('$this->checkMemberOwnershipForUpdate($memberId, $trainerId);');
    const sInsert = storeBody.indexOf('INSERT INTO member_measurements');

    if (sBegin === -1 || sTrainer === -1 || sMemberLock === -1 || sInsert === -1 ||
        sBegin > sTrainer || sTrainer > sMemberLock || sMemberLock > sInsert) {
        mutationOrderValid = false;
    }

    // Update ordering: beginTransaction -> getTrainerProfileIdForUpdate -> resource FOR UPDATE -> UPDATE
    const updateBody = methods.update;
    const uBegin = updateBody.indexOf('$this->db->beginTransaction();');
    const uTrainer = updateBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const uLock = updateBody.indexOf('FOR UPDATE');
    const uUpdate = updateBody.indexOf('UPDATE member_measurements');

    if (uBegin === -1 || uTrainer === -1 || uLock === -1 || uUpdate === -1 ||
        uBegin > uTrainer || uTrainer > uLock || uLock > uUpdate) {
        mutationOrderValid = false;
    }

    // Destroy ordering: beginTransaction -> getTrainerProfileIdForUpdate -> resource FOR UPDATE -> UPDATE (archive)
    const destroyBody = methods.destroy;
    const dBegin = destroyBody.indexOf('$this->db->beginTransaction();');
    const dTrainer = destroyBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const dLock = destroyBody.indexOf('FOR UPDATE');
    const dUpdate = destroyBody.indexOf('UPDATE member_measurements');

    if (dBegin === -1 || dTrainer === -1 || dLock === -1 || dUpdate === -1 ||
        dBegin > dTrainer || dTrainer > dLock || dLock > dUpdate) {
        mutationOrderValid = false;
    }

    // Restore ordering: beginTransaction -> getTrainerProfileIdForUpdate -> resource FOR UPDATE -> UPDATE (restore)
    const restoreBody = methods.restore;
    const rBegin = restoreBody.indexOf('$this->db->beginTransaction();');
    const rTrainer = restoreBody.indexOf('$this->getTrainerProfileIdForUpdate();');
    const rLock = restoreBody.indexOf('FOR UPDATE');
    const rUpdate = restoreBody.indexOf('UPDATE member_measurements');

    if (rBegin === -1 || rTrainer === -1 || rLock === -1 || rUpdate === -1 ||
        rBegin > rTrainer || rTrainer > rLock || rLock > rUpdate) {
        mutationOrderValid = false;
    }

    assert(
        mutationOrderValid,
        'Invariant 10: All four mutation methods strictly order beginTransaction -> trainer lock -> resource/parent lock -> mutation execution'
    );

    // 11. Invariant 11: CREATE semantics & post-commit audit
    const createSemanticsValid = storeBody.includes("$this->checkMemberOwnershipForUpdate($memberId, $trainerId);") &&
        storeBody.includes("INSERT INTO member_measurements") &&
        storeBody.includes("$stmt->rowCount() !== 1") &&
        storeBody.includes("$newId = (int)$this->db->lastInsertId();") &&
        storeBody.includes("$this->db->commit();") &&
        storeBody.includes("Response::json(['id' => $newId, 'uuid' => $uuid], 201);") &&
        storeBody.indexOf("AuditLogger::log") > storeBody.indexOf("$this->db->commit();");

    assert(
        Boolean(createSemanticsValid),
        'Invariant 11: CREATE semantics verify parent ownership lock, lastInsertId extraction, 201 response, and post-commit audit'
    );

    // 12. Invariant 12: UPDATE empty payload 422 vs no-op 200 separation & lock semantics
    const emptyPayloadIdx = updateBody.indexOf("if (empty($payload)) {");
    const beginTxIdx = updateBody.indexOf("$this->db->beginTransaction();");
    const noOpIdx = updateBody.indexOf("if (empty($updates)) {");
    const updateSqlIdx = updateBody.indexOf("UPDATE member_measurements");
    const auditIdx = updateBody.indexOf("AuditLogger::log");

    const updateSemanticsValid = emptyPayloadIdx !== -1 &&
        beginTxIdx !== -1 &&
        emptyPayloadIdx < beginTxIdx &&
        updateBody.includes("Response::error(\"Payload cannot be empty\", 'VALIDATION_ERROR', 422);") &&
        updateBody.includes("SELECT m.*") &&
        updateBody.includes("FOR UPDATE") &&
        updateBody.includes("AND mem.deleted_at IS NULL") &&
        updateBody.includes("AND m.deleted_at IS NULL") &&
        noOpIdx !== -1 &&
        updateSqlIdx !== -1 &&
        noOpIdx < updateSqlIdx &&
        (auditIdx === -1 || noOpIdx < auditIdx) &&
        updateBody.includes("if (empty($updates)) {\n                $this->db->commit();\n                Response::json(['success' => true]);\n            }");

    assert(
        Boolean(updateSemanticsValid),
        'Invariant 12: UPDATE strictly differentiates pre-transaction empty payload 422 from post-lock no-op commit 200 without DB update or audit'
    );

    // 13. Invariant 13: DELETE semantics & 4/4 binding completeness
    const destroyArchiveQuery = destroyBody.includes("UPDATE member_measurements") &&
        destroyBody.includes("SET deleted_at = CURRENT_TIMESTAMP, updated_by = ?") &&
        destroyBody.includes("WHERE id = ?") &&
        destroyBody.includes("AND trainer_id = ?") &&
        destroyBody.includes("AND deleted_at IS NULL") &&
        destroyBody.includes("AND member_id IN (SELECT id FROM members WHERE trainer_id = ? AND deleted_at IS NULL)");

    const destroyBindings = destroyBody.includes("$deleteStmt->bindValue(1, $adminId, PDO::PARAM_INT);") &&
        destroyBody.includes("$deleteStmt->bindValue(2, $id, PDO::PARAM_INT);") &&
        destroyBody.includes("$deleteStmt->bindValue(3, $trainerId, PDO::PARAM_INT);") &&
        destroyBody.includes("$deleteStmt->bindValue(4, $trainerId, PDO::PARAM_INT);");

    const destroySemanticsValid = destroyArchiveQuery &&
        destroyBindings &&
        !destroyBody.includes("DELETE FROM") &&
        destroyBody.includes("$deleteStmt->rowCount() !== 1") &&
        destroyBody.includes("$this->db->commit();");

    assert(
        Boolean(destroySemanticsValid),
        'Invariant 13: DELETE enforces soft delete with exact 4/4 PARAM_INT bindings, rowCount check, and active parent boundary'
    );

    // 14. Invariant 14: RESTORE semantics & 4/4 binding completeness
    const restoreLockQuery = restoreBody.includes("SELECT m.id, m.member_id, m.deleted_at") &&
        restoreBody.includes("FROM member_measurements m") &&
        restoreBody.includes("JOIN members mem ON m.member_id = mem.id") &&
        restoreBody.includes("WHERE m.id = :id") &&
        restoreBody.includes("AND m.trainer_id = :measurement_trainer_id") &&
        restoreBody.includes("AND mem.trainer_id = :member_trainer_id") &&
        restoreBody.includes("AND mem.deleted_at IS NULL") &&
        !restoreBody.includes("AND m.deleted_at IS NULL") &&
        restoreBody.includes("FOR UPDATE");

    const restoreConflict = restoreBody.includes("if ($current['deleted_at'] === null) {") &&
        restoreBody.includes("Response::error('Measurement is not archived', 'MEASUREMENT_NOT_ARCHIVED', 409);");

    const restoreUpdateQuery = restoreBody.includes("UPDATE member_measurements") &&
        restoreBody.includes("SET deleted_at = NULL, updated_by = ?") &&
        restoreBody.includes("WHERE id = ?") &&
        restoreBody.includes("AND trainer_id = ?") &&
        restoreBody.includes("AND deleted_at IS NOT NULL") &&
        restoreBody.includes("AND member_id IN (SELECT id FROM members WHERE trainer_id = ? AND deleted_at IS NULL)");

    const restoreBindings = restoreBody.includes("$restoreStmt->bindValue(1, $adminId, PDO::PARAM_INT);") &&
        restoreBody.includes("$restoreStmt->bindValue(2, $id, PDO::PARAM_INT);") &&
        restoreBody.includes("$restoreStmt->bindValue(3, $trainerId, PDO::PARAM_INT);") &&
        restoreBody.includes("$restoreStmt->bindValue(4, $trainerId, PDO::PARAM_INT);");

    const restoreSemanticsValid = restoreLockQuery &&
        restoreConflict &&
        restoreUpdateQuery &&
        restoreBindings &&
        restoreBody.includes("$restoreStmt->rowCount() !== 1") &&
        restoreBody.includes("$this->db->commit();");

    assert(
        Boolean(restoreSemanticsValid),
        'Invariant 14: RESTORE enforces parent-only active lock, 409 conflict for active items, and exact 4/4 PARAM_INT restore query'
    );

    // 15. Invariant 15: Audit call extraction & 5-arg contract
    const mutationMethodNames = ['store', 'update', 'destroy', 'restore'];
    let auditAllValid = true;

    for (const mName of mutationMethodNames) {
        const mBody = methods[mName];
        const auditCall = extractBalancedCall(mBody, 'AuditLogger::log(');
        if (!auditCall) {
            console.error(`❌ Invariant 15: Missing AuditLogger::log in ${mName}`);
            auditAllValid = false;
            continue;
        }

        const args = splitTopLevelArgs(auditCall);
        if (args.length !== 5) {
            console.error(`❌ Invariant 15: ${mName} AuditLogger::log does not have exactly 5 arguments (got ${args.length})`);
            auditAllValid = false;
            continue;
        }

        const [actionArg, adminArg, tableArg, idArg, metaArg] = args;
        if (!actionArg.includes('trainer_member_measurement.')) {
            auditAllValid = false;
        }
        if (!adminArg.includes('$adminId')) {
            auditAllValid = false;
        }
        if (!tableArg.includes('member_measurements')) {
            auditAllValid = false;
        }

        // Privacy check: Ensure metadata does NOT leak raw measurement content values
        const sensitiveValueKeys = ['weight_kg', 'body_fat_percent', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm', 'notes', 'measured_at'];
        for (const sKey of sensitiveValueKeys) {
            // Note: $changedFields array containing string names is allowed in update, but actual values must not be logged
            if (metaArg.includes(`'${sKey}' =>`) || metaArg.includes(`"${sKey}" =>`)) {
                console.error(`❌ Invariant 15: Privacy leak in ${mName} audit metadata for key ${sKey}`);
                auditAllValid = false;
            }
        }

        // Audit error boundary: must be inside try/catch(Throwable $auditError) and post-commit
        const commitIdx = mBody.indexOf('$this->db->commit();');
        const auditIdx = mBody.indexOf(auditCall);
        if (commitIdx === -1 || auditIdx < commitIdx) {
            console.error(`❌ Invariant 15: Audit call in ${mName} is not post-commit`);
            auditAllValid = false;
        }

        if (!mBody.includes('catch (Throwable $auditError)')) {
            console.error(`❌ Invariant 15: Audit call in ${mName} is missing Throwable catch error boundary`);
            auditAllValid = false;
        }
    }

    assert(
        auditAllValid,
        'Invariant 15: Balanced audit parser verifies 5 top-level arguments, zero sensitive value leaks, post-commit position, and Throwable error isolation'
    );

    // 16. Invariant 16: Explicit regression invariants
    const noHardDeleteInController = !controllerCode.includes('DELETE FROM');
    const restoreRoutePreserved = indexCode.includes('trainer/member-measurements/([1-9]\\d*)/restore');
    const transactionSafety = (controllerCode.match(/if \(\$this->db->inTransaction\(\)\) \{\s*\$this->db->rollBack\(\);\s*\}/g) || []).length >= 5;
    const noSpuriousMutations = !indexCode.match(/#\^\/api\/trainer\/member-measurements\/.*?#.*?(PUT)/);

    assert(
        Boolean(noHardDeleteInController && restoreRoutePreserved && transactionSafety && noSpuriousMutations),
        'Invariant 16: Regression invariants guard against hard delete, restore removal, broken transaction rollbacks, or arbitrary route changes'
    );

    console.log('\n----------------------------------------');
    if (hasErrors) {
        console.error('❌ Trainer Member Measurements Verification FAILED.\n');
        process.exit(1);
    } else {
        console.log('✅ Trainer Member Measurements Verification PASSED (All 16 invariants verified).\n');
        process.exit(0);
    }
}

verify();
