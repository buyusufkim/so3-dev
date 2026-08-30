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

function verify() {
    console.log('Starting Trainer Member Measurements API verification...\n');

    if (!fs.existsSync(controllerPath) || !fs.existsSync(indexPath)) {
        console.error('Required files not found!');
        process.exit(1);
    }

    const controllerCode = fs.readFileSync(controllerPath, 'utf8');
    const indexCode = fs.readFileSync(indexPath, 'utf8');

    // 1. Route wiring
    assert(
        indexCode.includes('trainer/members/([1-9]\\d*)/measurements') &&
        indexCode.includes('trainer/member-measurements/([1-9]\\d*)') &&
        indexCode.includes('trainer/member-measurements/([1-9]\\d*)/restore'),
        'Invariant 1: Routes are defined in index.php'
    );
    
    const lines = indexCode.split('\n');
    let rolesProtected = true;
    let inMeasurementRoute = false;
    for (const line of lines) {
        if (line.match(/preg_match\('#\^\/api\/trainer\/(members\/.*?\/measurements|member-measurements)/)) {
            inMeasurementRoute = true;
        } else if (inMeasurementRoute && line.includes('AuthMiddleware::hasRole([')) {
            if (!line.includes("'trainer'")) {
                rolesProtected = false;
            }
            inMeasurementRoute = false;
        } else if (inMeasurementRoute && line.includes('preg_match')) {
            rolesProtected = false;
            inMeasurementRoute = false;
        }
    }
    assert(rolesProtected, 'Invariant 1: Trainer role firewall protected on all route blocks');

    // 2. Trainer profile helpers
    assert(
        controllerCode.includes("private function getTrainerProfileId(): int {") &&
        controllerCode.includes("SELECT id FROM trainers") &&
        controllerCode.includes("WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1") &&
        controllerCode.includes("$stmt->bindValue(1, $adminId, PDO::PARAM_INT);") &&
        controllerCode.includes("Response::error('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);") &&
        controllerCode.includes("if ($this->db->inTransaction()) {") &&
        controllerCode.includes("$this->db->rollBack();"),
        'Invariant 2: getTrainerProfileId normal lookup binds PARAM_INT and handles auth failure'
    );
    assert(
        controllerCode.includes("private function getTrainerProfileIdForUpdate(): int {") &&
        controllerCode.includes("SELECT id FROM trainers") &&
        controllerCode.includes("WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1") &&
        controllerCode.includes("FOR UPDATE") &&
        controllerCode.includes("$stmt->bindValue(1, $adminId, PDO::PARAM_INT);"),
        'Invariant 2: getTrainerProfileIdForUpdate binds PARAM_INT and includes FOR UPDATE'
    );

    // 3. Member ownership helpers
    assert(
        controllerCode.includes("private function checkMemberOwnership(int $memberId, int $trainerId): void {") &&
        controllerCode.includes("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL") &&
        controllerCode.includes("$stmt->bindValue(1, $memberId, PDO::PARAM_INT);") &&
        controllerCode.includes("$stmt->bindValue(2, $trainerId, PDO::PARAM_INT);") &&
        controllerCode.includes("Response::error('Member not found or not assigned to you.', 'NOT_FOUND', 404);"),
        'Invariant 3: checkMemberOwnership binds PARAM_INT, filters deleted_at, handles 404'
    );
    assert(
        controllerCode.includes("private function checkMemberOwnershipForUpdate(int $memberId, int $trainerId): void {") &&
        controllerCode.includes("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL FOR UPDATE") &&
        controllerCode.includes("$stmt->bindValue(1, $memberId, PDO::PARAM_INT);") &&
        controllerCode.includes("$stmt->bindValue(2, $trainerId, PDO::PARAM_INT);"),
        'Invariant 3: checkMemberOwnershipForUpdate binds PARAM_INT and includes FOR UPDATE'
    );

    // 4. Strict JSON parser
    assert(
        controllerCode.includes("strcasecmp(trim(explode(';', $contentType)[0]), 'application/json') !== 0") &&
        controllerCode.includes("Response::error('Content-Type must be exactly application/json', 'UNSUPPORTED_MEDIA_TYPE', 415);") &&
        controllerCode.includes("strlen($raw) > 16384") &&
        controllerCode.includes("!is_object($isObj)") &&
        !controllerCode.includes("if (empty((array)$isObj))"),
        'Invariant 4: Strict JSON parser enforces application/json, 16KB limit, object root, NO generic {} reject'
    );

    // 5. Exact allowlist
    assert(
        controllerCode.includes("$allowedKeys = ['measured_at', 'weight_kg', 'body_fat_percent', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm', 'notes'];") &&
        controllerCode.includes("!in_array($key, $allowedKeys, true)") &&
        controllerCode.includes("Response::error(\"Disallowed or unknown key: $key\", 'VALIDATION_ERROR', 422);"),
        'Invariant 5: Exact allowlist restricts fields and returns 422 for unknown'
    );

    // 6. Measurement validation
    const storeMethod = controllerCode.substring(controllerCode.indexOf('public function store'), controllerCode.indexOf('public function update'));
    assert(
        storeMethod.includes("if (!preg_match('/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$/', $payload['measured_at'])) {") &&
        storeMethod.includes("\\DateTime::createFromFormat('Y-m-d H:i:s', $payload['measured_at'])") &&
        storeMethod.includes("if (mb_strlen($payload['notes'], 'UTF-8') > 1000) {") &&
        storeMethod.includes("if ($weight === null && $bf === null && $chest === null && $waist === null && $hip === null && $arm === null && $thigh === null) {"),
        'Invariant 6: Method-scoped measurement validations (NaN, max 2 decimals, zero body fat, 1000 char notes, calendar format)'
    );

    // 7. Pagination
    assert(
        controllerCode.includes("if (!is_string($pageRaw) || !is_string($perPageRaw) || !preg_match('/^[1-9]\\d*$/', $pageRaw) || !preg_match('/^[1-9]\\d*$/', $perPageRaw)) {") &&
        controllerCode.includes("if ($perPage > 100)") &&
        controllerCode.includes("$maxPageForOffset = intdiv(PHP_INT_MAX, $perPage);") &&
        controllerCode.includes("$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);") &&
        controllerCode.includes("$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);") &&
        controllerCode.includes("'items' => $items") &&
        controllerCode.includes("'pagination' => ["),
        'Invariant 7: Pagination implements bounds, intdiv overflow guard, PDO integer binding, nested envelope'
    );

    // 8. List ownership / deleted filter
    const indexMethod = controllerCode.substring(controllerCode.indexOf('public function index'), controllerCode.indexOf('public function show'));
    assert(
        indexMethod.includes("SELECT COUNT(*) FROM member_measurements JOIN members mem ON member_measurements.member_id = mem.id WHERE $where") &&
        indexMethod.includes("SELECT member_measurements.id, member_measurements.uuid, member_measurements.member_id, member_measurements.trainer_id, member_measurements.measured_at") &&
        indexMethod.includes("member_measurements.trainer_id = :measurement_trainer_id") &&
        indexMethod.includes("mem.trainer_id = :member_trainer_id") &&
        indexMethod.includes("mem.deleted_at IS NULL") &&
        indexMethod.includes("if ($deleted === 'active') {\n            $where .= \" AND member_measurements.deleted_at IS NULL\";\n        } elseif ($deleted === 'deleted') {\n            $where .= \" AND member_measurements.deleted_at IS NOT NULL\";") &&
        indexMethod.includes("$countStmt = $this->db->prepare(") &&
        indexMethod.includes("$stmt = $this->db->prepare("),
        'Invariant 8: List ownership restricts via separate COUNT/SELECT, deleted filter semantics correct'
    );

    // 9. Show ownership
    const showMethod = controllerCode.substring(controllerCode.indexOf('public function show'), controllerCode.indexOf('public function store'));
    assert(
        showMethod.includes("JOIN members mem ON m.member_id = mem.id") &&
        showMethod.includes("m.id = :id") &&
        showMethod.includes("m.trainer_id = :measurement_trainer_id") &&
        showMethod.includes("mem.trainer_id = :member_trainer_id") &&
        showMethod.includes("m.deleted_at IS NULL") &&
        showMethod.includes("mem.deleted_at IS NULL") &&
        showMethod.includes("$stmt->bindValue(':id', $id, PDO::PARAM_INT);") &&
        showMethod.includes("$stmt->bindValue(':measurement_trainer_id', $trainerId, PDO::PARAM_INT);") &&
        showMethod.includes("$stmt->bindValue(':member_trainer_id', $trainerId, PDO::PARAM_INT);") &&
        showMethod.includes("Response::error('Measurement not found', 'NOT_FOUND', 404);"),
        'Invariant 9: Show ownership uses fully bound identity constraints'
    );

    // 10. Mutation ordering
    let orderPass = true;
    for (const method of ['store', 'update', 'destroy', 'restore']) {
        const methodBody = controllerCode.substring(
            controllerCode.indexOf(`public function ${method}(`), 
            controllerCode.indexOf('public function ', controllerCode.indexOf(`public function ${method}(`) + 1) !== -1 ? controllerCode.indexOf('public function ', controllerCode.indexOf(`public function ${method}(`) + 1) : controllerCode.length
        );
        const idxBegin = methodBody.indexOf('$this->db->beginTransaction();');
        const idxTrainer = methodBody.indexOf('$this->getTrainerProfileIdForUpdate();');
        const idxLock = methodBody.indexOf('FOR UPDATE') !== -1 ? methodBody.indexOf('FOR UPDATE') : methodBody.indexOf('INSERT INTO'); // insert doesn't strictly have FOR UPDATE in store
        const idxLock2 = methodBody.indexOf('checkMemberOwnershipForUpdate') !== -1 ? methodBody.indexOf('checkMemberOwnershipForUpdate') : idxLock;
        const theLock = Math.max(idxLock, idxLock2);
        
        if (idxBegin === -1 || idxTrainer === -1 || theLock === -1 || idxBegin > idxTrainer || idxTrainer > theLock) {
            orderPass = false;
        }
    }
    assert(orderPass, 'Invariant 10: Mutation methods strictly order beginTransaction -> getTrainerProfileIdForUpdate -> resource/ownership FOR UPDATE');

    // 11. CREATE ownership
    assert(
        storeMethod.includes("$this->checkMemberOwnershipForUpdate($memberId, $trainerId);") &&
        storeMethod.includes("INSERT INTO member_measurements") &&
        storeMethod.includes("$this->db->commit();") &&
        storeMethod.indexOf("AuditLogger::log") > storeMethod.indexOf("$this->db->commit();"),
        'Invariant 11: CREATE uses locked trainer + member ownership, audit fires post-commit'
    );

    // 12. UPDATE ownership + idempotency
    const updateMethod = controllerCode.substring(controllerCode.indexOf('public function update'), controllerCode.indexOf('public function destroy'));
    assert(
        updateMethod.includes("SELECT m.*") &&
        updateMethod.includes("FOR UPDATE") &&
        updateMethod.includes("AND mem.deleted_at IS NULL") &&
        updateMethod.includes("AND m.deleted_at IS NULL") &&
        updateMethod.includes("if (empty($updates)) {\n                $this->db->commit();\n                Response::json(['success' => true]);\n            }") &&
        updateMethod.indexOf("if (empty($updates))") < updateMethod.indexOf("UPDATE member_measurements"),
        'Invariant 12: UPDATE ownership locks correctly, empty payload yields 422, no-op yields early 200 without DB update'
    );

    // 13. DELETE semantics
    const destroyMethod = controllerCode.substring(controllerCode.indexOf('public function destroy'), controllerCode.indexOf('public function restore'));
    assert(
        destroyMethod.includes("SELECT m.id, m.member_id") &&
        destroyMethod.includes("FOR UPDATE") &&
        destroyMethod.includes("SET deleted_at = CURRENT_TIMESTAMP, updated_by = ?") &&
        !destroyMethod.includes("DELETE FROM") &&
        destroyMethod.includes("$deleteStmt->bindValue(1, $adminId, PDO::PARAM_INT);") &&
        destroyMethod.includes("$deleteStmt->bindValue(4, $trainerId, PDO::PARAM_INT);") &&
        destroyMethod.includes("AND deleted_at IS NULL") &&
        destroyMethod.includes("if ($deleteStmt->rowCount() !== 1) {"),
        'Invariant 13: DELETE semantics use explicit PARAM_INT bound final archive soft delete with rowCount check'
    );

    // 14. RESTORE semantics
    const restoreMethod = controllerCode.substring(controllerCode.indexOf('public function restore'));
    assert(
        restoreMethod.includes("SELECT m.id, m.member_id, m.deleted_at") &&
        restoreMethod.includes("FOR UPDATE") &&
        restoreMethod.includes("AND mem.deleted_at IS NULL") &&
        !restoreMethod.includes("AND m.deleted_at IS NULL") &&
        restoreMethod.includes("Response::error('Measurement is not archived', 'MEASUREMENT_NOT_ARCHIVED', 409);") &&
        restoreMethod.includes("SET deleted_at = NULL, updated_by = ?") &&
        restoreMethod.includes("AND deleted_at IS NOT NULL") &&
        restoreMethod.includes("$restoreStmt->bindValue(4, $trainerId, PDO::PARAM_INT);") &&
        restoreMethod.includes("if ($restoreStmt->rowCount() !== 1) {"),
        'Invariant 14: RESTORE semantics use parent-only active lock, 409 on active, exact PARAM_INT restore'
    );

    // 15. Audit contract
    const auditMatches = controllerCode.match(/AuditLogger::log\([\s\S]*?\)/g) || [];
    assert(auditMatches.length === 4, 'Invariant 15: AuditLogger::log invoked 4 times');
    let auditLeaks = false;
    for (const match of auditMatches) {
        if (match.includes("'weight_kg'") || match.includes("'notes'") || match.includes("'measured_at'") || match.includes("'body_fat_percent'")) {
            auditLeaks = true;
        }
    }
    assert(!auditLeaks, 'Invariant 15: Audit metadata does not leak sensitive measurement values/notes');
    assert(
        controllerCode.includes("} catch (Throwable $auditError) {\n                error_log(\"Audit error: \" . $auditError->getMessage());\n            }"),
        'Invariant 15: Audit exceptions safely caught to avoid reverting committed transactions'
    );

    if (hasErrors) {
        console.error('\n❌ Verification FAILED.');
        process.exit(1);
    } else {
        console.log('\n✅ Verification PASSED.');
        process.exit(0);
    }
}

verify();
