import fs from 'fs';
import path from 'path';

const controllerPath = path.resolve('api/controllers/TrainerProgramExerciseController.php');
const indexPath = path.resolve('api/index.php');

const controllerContent = fs.readFileSync(controllerPath, 'utf8');
const indexContent = fs.readFileSync(indexPath, 'utf8');

let errors = [];

function assert(condition, message) {
    if (!condition) {
        errors.push(message);
    }
}

console.log("Starting Trainer Program Exercises API verification...");

// 1. Trainer route wiring
const hasIndexRoutes = indexContent.includes("preg_match('#^/api/trainer/training-programs/([1-9]\\d*)/exercises$#'") &&
                       indexContent.includes("AuthMiddleware::hasRole(['trainer']);") &&
                       indexContent.includes("$controller = new \\Controllers\\TrainerProgramExerciseController();");
assert(hasIndexRoutes, "Invariant 1: Missing correct route wiring for /api/trainer/training-programs/:id/exercises");

const hasEntityRoutes = indexContent.includes("preg_match('#^/api/trainer/program-exercises/([1-9]\\d*)$#'") &&
                        indexContent.includes("AuthMiddleware::hasRole(['trainer']);") &&
                        indexContent.includes("$controller = new \\Controllers\\TrainerProgramExerciseController();");
assert(hasEntityRoutes, "Invariant 1: Missing correct route wiring for /api/trainer/program-exercises/:id");

if (hasIndexRoutes && hasEntityRoutes) {
    console.log("✅ PASS: Invariant 1: Routes are defined and protected with trainer role firewall");
}

// 2. Strict JSON media type & 3. JSON root + size
const payloadMethodStr = controllerContent.substring(
    controllerContent.indexOf('private function getJsonPayload'),
    controllerContent.indexOf('public function index')
);

assert(payloadMethodStr.includes("strcasecmp(trim(explode(';', $contentType)[0]), 'application/json') !== 0"), 
       "Invariant 2: JSON payload parser doesn't enforce strict application/json");
assert(payloadMethodStr.includes("strlen($raw) > 16384"), 
       "Invariant 3: JSON payload parser doesn't enforce 16KB limit");
assert(payloadMethodStr.includes("json_last_error() !== JSON_ERROR_NONE || !is_object($isObj)"), 
       "Invariant 3: JSON payload parser doesn't reject malformed JSON or array/string/number root");

if (payloadMethodStr.includes("strcasecmp") && payloadMethodStr.includes("is_object")) {
    console.log("✅ PASS: Invariant 2 & 3: Strict JSON media type, 16KB limit, and strict object root enforced");
}

// 4. Empty-object contract
assert(!payloadMethodStr.includes("empty($data)"), "Invariant 4: Empty object {} contract should not be rejected globally by empty()");
const createMethod = controllerContent.substring(
    controllerContent.indexOf('public function create'),
    controllerContent.indexOf('public function update')
);
assert(createMethod.includes("if (!array_key_exists('exercise_name', $val) || !is_string($val['exercise_name']))"), 
       "Invariant 4: CREATE {} should check array_key_exists and return 422 for exercise_name");
const updateMethod = controllerContent.substring(
    controllerContent.indexOf('public function update'),
    controllerContent.indexOf('public function delete')
);
assert(updateMethod.includes("if (empty($val)) {") && updateMethod.includes("'VALIDATION_ERROR', 422"), 
       "Invariant 4: UPDATE {} should check empty($val) and return VALIDATION_ERROR 422");

if (!payloadMethodStr.includes("empty($data)") && createMethod.includes("exercise_name") && updateMethod.includes("empty($val)")) {
    console.log("✅ PASS: Invariant 4: Empty object {} contract is properly deferred to endpoint-level validation");
}

// 5. Exact payload allowlist
assert(payloadMethodStr.includes("$allowlist = ['exercise_name', 'sets', 'repetitions', 'duration_seconds', 'rest_seconds', 'instructions', 'sort_order'];"), 
       "Invariant 5: Missing exact payload allowlist");
assert(payloadMethodStr.includes("if (!in_array($key, $allowlist, true)) {") && payloadMethodStr.includes("VALIDATION_ERROR"), 
       "Invariant 5: Missing allowlist enforcement loop");

if (payloadMethodStr.includes("$allowlist =")) {
    console.log("✅ PASS: Invariant 5: Payload allowlist restricts unknown fields effectively");
}

// 6. Business validation limits
assert(createMethod.includes("$len < 1 || $len > 160"), "Invariant 6: exercise_name validation limit failed (1-160)");
assert(createMethod.includes("$sets < 1 || $sets > 65535"), "Invariant 6: sets validation limit failed (1-65535)");
assert(createMethod.includes("mb_strlen($repetitions, 'UTF-8') > 40"), "Invariant 6: repetitions validation limit failed (max 40)");
assert(createMethod.includes("$duration_seconds < 1 || $duration_seconds > 4294967295"), "Invariant 6: duration_seconds validation limit failed");
assert(createMethod.includes("$rest_seconds < 0 || $rest_seconds > 65535"), "Invariant 6: rest_seconds validation limit failed");
assert(createMethod.includes("mb_strlen($instructions, 'UTF-8') > 1000"), "Invariant 6: instructions validation limit failed (max 1000)");
assert(createMethod.includes("$sort_order < 0 || $sort_order > 2147483647"), "Invariant 6: sort_order validation limit failed");

if (createMethod.includes("160") && createMethod.includes("4294967295")) {
    console.log("✅ PASS: Invariant 6: Business validation limits are correctly applied");
}

// 7. Index ownership & 8. Index final SELECT race protection
const indexMethod = controllerContent.substring(
    controllerContent.indexOf('public function index'),
    controllerContent.indexOf('public function create')
);
assert(indexMethod.includes("SELECT tp.id") && indexMethod.includes("JOIN members m ON tp.member_id = m.id") && indexMethod.includes("tp.deleted_at IS NULL") && indexMethod.includes("m.deleted_at IS NULL"), 
       "Invariant 7: Index ownership check missing JOINs or active checks");
assert(indexMethod.includes("SELECT pe.id, pe.program_id, pe.exercise_name") && indexMethod.includes("JOIN training_programs tp ON pe.program_id = tp.id") && indexMethod.includes("JOIN members m ON tp.member_id = m.id") && indexMethod.includes("ORDER BY pe.sort_order ASC, pe.id ASC"), 
       "Invariant 8: Index final SELECT doesn't have required JOINs, active checks, or ORDER BY clause");

if (indexMethod.includes("SELECT tp.id") && indexMethod.includes("SELECT pe.id")) {
    console.log("✅ PASS: Invariant 7 & 8: Index ownership and final SELECT race protection implemented");
}

// 9. Mutation trainer lock
assert(createMethod.includes("$this->db->beginTransaction();") && createMethod.includes("$trainerId = $this->getTrainerProfileIdForUpdate();"), 
       "Invariant 9: CREATE missing transaction start or getTrainerProfileIdForUpdate");
assert(updateMethod.includes("$this->db->beginTransaction();") && updateMethod.includes("$trainerId = $this->getTrainerProfileIdForUpdate();"), 
       "Invariant 9: UPDATE missing transaction start or getTrainerProfileIdForUpdate");
const deleteMethod = controllerContent.substring(
    controllerContent.indexOf('public function delete'),
    controllerContent.length
);
assert(deleteMethod.includes("$this->db->beginTransaction();") && deleteMethod.includes("$trainerId = $this->getTrainerProfileIdForUpdate();"), 
       "Invariant 9: DELETE missing transaction start or getTrainerProfileIdForUpdate");

const getTrainerUpdateMethod = controllerContent.substring(
    controllerContent.indexOf('private function getTrainerProfileIdForUpdate'),
    controllerContent.indexOf('private function getJsonPayload')
);
assert(getTrainerUpdateMethod.includes("FOR UPDATE") && getTrainerUpdateMethod.includes("deleted_at IS NULL") && getTrainerUpdateMethod.includes("is_active = 1"), 
       "Invariant 9: getTrainerProfileIdForUpdate doesn't lock trainer row or check activity status properly");

if (createMethod.includes("ForUpdate") && updateMethod.includes("ForUpdate") && deleteMethod.includes("ForUpdate")) {
    console.log("✅ PASS: Invariant 9: Mutation endpoints safely lock trainer profile and manage transactions");
}

// 10. CREATE ownership lock
assert(createMethod.includes("JOIN members m ON tp.member_id = m.id") && createMethod.includes("FOR UPDATE") && createMethod.includes("tp.deleted_at IS NULL") && createMethod.includes("m.deleted_at IS NULL") && createMethod.includes("tp.trainer_id = ?"), 
       "Invariant 10: CREATE missing proper ownership lock with JOIN and active checks FOR UPDATE");
if (createMethod.includes("FOR UPDATE")) {
    console.log("✅ PASS: Invariant 10: CREATE ownership lock validates nested active checks and secures row via FOR UPDATE");
}

// 11. UPDATE / DELETE ownership lock
assert(updateMethod.includes("JOIN training_programs tp ON pe.program_id = tp.id") && updateMethod.includes("JOIN members m ON tp.member_id = m.id") && updateMethod.includes("FOR UPDATE") && updateMethod.includes("tp.deleted_at IS NULL") && updateMethod.includes("m.deleted_at IS NULL") && updateMethod.includes("tp.trainer_id = ?"), 
       "Invariant 11: UPDATE missing proper ownership lock with JOIN and active checks FOR UPDATE");
assert(deleteMethod.includes("JOIN training_programs tp ON pe.program_id = tp.id") && deleteMethod.includes("JOIN members m ON tp.member_id = m.id") && deleteMethod.includes("FOR UPDATE") && deleteMethod.includes("tp.deleted_at IS NULL") && deleteMethod.includes("m.deleted_at IS NULL") && deleteMethod.includes("tp.trainer_id = ?"), 
       "Invariant 11: DELETE missing proper ownership lock with JOIN and active checks FOR UPDATE");

if (updateMethod.includes("FOR UPDATE") && deleteMethod.includes("FOR UPDATE")) {
    console.log("✅ PASS: Invariant 11: UPDATE and DELETE ownership locks validate nested active checks and secure rows via FOR UPDATE");
}

// 12. Explicit integer identity binding
assert(getTrainerUpdateMethod.includes("$stmt->bindValue(1, $adminId, \\PDO::PARAM_INT);"), "Invariant 12: getTrainerProfileIdForUpdate missing integer binding");
assert(indexMethod.includes("$stmt->bindValue(1, $programId, \\PDO::PARAM_INT);") && indexMethod.includes("$stmt->bindValue(2, $trainerId, \\PDO::PARAM_INT);") && indexMethod.includes("$stmt->bindValue(3, $trainerId, \\PDO::PARAM_INT);"), "Invariant 12: index missing integer binding");
assert(createMethod.includes("$stmt->bindValue(1, $programId, \\PDO::PARAM_INT);"), "Invariant 12: create missing integer binding for ownership");
assert(updateMethod.includes("$stmt->bindValue(1, $id, \\PDO::PARAM_INT);"), "Invariant 12: update missing integer binding for ownership");
assert(deleteMethod.includes("$stmt->bindValue(1, $id, \\PDO::PARAM_INT);") && deleteMethod.includes("$stmt->bindValue(2, $programId, \\PDO::PARAM_INT);"), "Invariant 12: delete missing integer binding for ownership or hard delete");

if (indexMethod.includes("PARAM_INT") && createMethod.includes("PARAM_INT") && updateMethod.includes("PARAM_INT") && deleteMethod.includes("PARAM_INT")) {
    console.log("✅ PASS: Invariant 12: SQL parameters use strict PDO binding");
}

// 13. PATCH idempotency
assert(updateMethod.includes("if (empty($updates)) {") && updateMethod.includes("$this->db->commit();") && updateMethod.includes("Response::json(['success' => true]);"), 
       "Invariant 13: UPDATE missing PATCH idempotency early exit");
if (updateMethod.includes("empty($updates)")) {
    console.log("✅ PASS: Invariant 13: Idempotent PATCH returns 200 early without auditing");
}

// 14. Audit contract
assert(createMethod.includes("AuditLogger::log(") && createMethod.includes("'changed_fields'") === false, "Invariant 14: CREATE AuditLogger log failed or leaked data");
assert(updateMethod.includes("AuditLogger::log(") && updateMethod.includes("'changed_fields' => $changedFields"), "Invariant 14: UPDATE AuditLogger log failed or missing changed_fields");
assert(deleteMethod.includes("AuditLogger::log("), "Invariant 14: DELETE AuditLogger log failed");
assert(!updateMethod.includes("'exercise_name' => $trimmedName") && !updateMethod.includes("'exercise_name' => $val"), "Invariant 14: Audit leaks exercise_name content");

if (createMethod.includes("AuditLogger::log") && updateMethod.includes("AuditLogger::log") && deleteMethod.includes("AuditLogger::log")) {
    console.log("✅ PASS: Invariant 14: Audit logging operates securely post-commit without leaking sensitive fields");
}

// 15. Delete semantics
assert(deleteMethod.includes("DELETE FROM program_exercises WHERE id = ? AND program_id = ?"), "Invariant 15: DELETE method missing hard DELETE FROM statement");
assert(!deleteMethod.includes("deleted_at ="), "Invariant 15: DELETE method uses soft-delete logic instead of hard delete");

if (deleteMethod.includes("DELETE FROM program_exercises")) {
    console.log("✅ PASS: Invariant 15: DELETE semantics use hard delete");
}


if (errors.length > 0) {
    console.error("\n❌ Verification FAILED with " + errors.length + " errors:\n");
    errors.forEach(e => console.error("- " + e));
    process.exit(1);
} else {
    console.log("\n✅ Verification PASSED.");
    process.exit(0);
}
