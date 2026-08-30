import fs from 'fs';
import path from 'path';

const controllerPath = path.resolve('api/controllers/TrainerMemberController.php');
const indexPath = path.resolve('api/index.php');

const controllerContent = fs.readFileSync(controllerPath, 'utf8');
const indexContent = fs.readFileSync(indexPath, 'utf8');

let errors = [];

function assert(condition, message) {
    if (!condition) {
        errors.push(message);
    }
}

console.log("Starting Trainer Member Read API verification...");

// 1. Route wiring
const membersIndexBlock = indexContent.substring(
    indexContent.indexOf("preg_match('#^/api/trainer/members$#', $requestUri)"),
    indexContent.indexOf("preg_match('#^/api/trainer/members/(\\d+)$#', $requestUri")
);
const membersDetailBlock = indexContent.substring(
    indexContent.indexOf("preg_match('#^/api/trainer/members/(\\d+)$#', $requestUri"),
    indexContent.indexOf("// Dynamic matching for trainer member progress notes")
);

const hasIndexRoute = membersIndexBlock.includes("AuthMiddleware::hasRole(['trainer']);") &&
                      membersIndexBlock.includes("if ($method === 'GET')") &&
                      membersIndexBlock.includes("(new \\Controllers\\TrainerMemberController())->index();");
assert(hasIndexRoute, "Invariant 1: Missing strictly block-scoped route wiring for /api/trainer/members GET");

const hasDetailRoute = membersDetailBlock.includes("AuthMiddleware::hasRole(['trainer']);") &&
                       membersDetailBlock.includes("if ($method === 'GET')") &&
                       membersDetailBlock.includes("(new \\Controllers\\TrainerMemberController())->show($id);");
assert(hasDetailRoute, "Invariant 1: Missing strictly block-scoped route wiring for /api/trainer/members/:id GET");

// Ensure no POST/PATCH/DELETE for trainer member index/detail itself.
const noMutations = !membersIndexBlock.match(/if \(\$method === '(?:POST|PATCH|DELETE)'\)/) &&
                    !membersDetailBlock.match(/if \(\$method === '(?:POST|PATCH|DELETE)'\)/);
assert(noMutations, "Invariant 1: POST/PATCH/DELETE routes must not be added for trainer members");

if (hasIndexRoute && hasDetailRoute && noMutations) {
    console.log("✅ PASS: Invariant 1: Routes are defined and protected with block-scoped trainer role firewall");
}

// 2. Trainer profile contract
const getTrainerMethod = controllerContent.substring(
    controllerContent.indexOf('private function getTrainerProfileId()'),
    controllerContent.indexOf('private function validatePaginationParam')
);
assert(getTrainerMethod.includes("$adminId = (int)($_SESSION['admin_id'] ?? 0);"), "Invariant 2: getTrainerProfileId missing explicit int cast for admin_id");
assert(getTrainerMethod.includes("WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1"), "Invariant 2: getTrainerProfileId missing correct WHERE clause");
assert(getTrainerMethod.includes("$stmt->bindValue(1, $adminId, PDO::PARAM_INT);"), "Invariant 2: getTrainerProfileId missing PDO::PARAM_INT binding");
assert(getTrainerMethod.includes("Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);"), "Invariant 2: getTrainerProfileId missing 403 contract");
assert(!controllerContent.includes("beginTransaction") && !controllerContent.includes("FOR UPDATE"), "Invariant 2: Read controller should not include transaction or FOR UPDATE");

if (getTrainerMethod.includes("PARAM_INT")) {
    console.log("✅ PASS: Invariant 2: Trainer profile contract securely binds integer admin_id without mutations");
}

// Extract index and show methods
const indexMethod = controllerContent.substring(
    controllerContent.indexOf('public function index()'),
    controllerContent.indexOf('public function show($id)')
);
const showMethod = controllerContent.substring(
    controllerContent.indexOf('public function show($id)'),
    controllerContent.length
);

// 3. Pagination validation
assert(indexMethod.includes("$page = $this->validatePaginationParam($pageInput, 1, 1);"), "Invariant 3: page default/min validation missing");
assert(indexMethod.includes("$perPage = $this->validatePaginationParam($perPageInput, 20, 1, 100);"), "Invariant 3: per_page default/min/max validation missing");
assert(indexMethod.includes("if ($page === false) {") && indexMethod.includes("'VALIDATION_ERROR', 422"), "Invariant 3: page invalid 422 missing");

if (indexMethod.includes("validatePaginationParam") && indexMethod.includes("VALIDATION_ERROR")) {
    console.log("✅ PASS: Invariant 3: Pagination parameter validation with 422 returns securely guards types");
}

// 4. Pagination overflow
assert(indexMethod.includes("if (($page - 1) > intdiv(PHP_INT_MAX, $perPage)) {") && indexMethod.includes("'Geçersiz sayfa numarası', 'VALIDATION_ERROR', 422"), "Invariant 4: Pagination overflow guard missing or invalid");
// Check offset comes after overflow guard
const overflowIndex = indexMethod.indexOf("intdiv(PHP_INT_MAX, $perPage)");
const offsetIndex = indexMethod.indexOf("$offset = ($page - 1) * $perPage;");
assert(overflowIndex < offsetIndex && overflowIndex !== -1, "Invariant 4: Overflow guard must run before offset calculation");

if (overflowIndex < offsetIndex && overflowIndex !== -1) {
    console.log("✅ PASS: Invariant 4: Pagination integer overflow safely guarded via intdiv before calculation");
}

// 5. Filter contract
assert(indexMethod.includes("!in_array($status, ['active', 'inactive'])"), "Invariant 5: status filter strictly limits to active/inactive");
assert(indexMethod.includes("is_array($q) || is_bool($q) || is_object($q)"), "Invariant 5: q filter rejects complex types");
assert(indexMethod.includes("$q = trim((string)$q);"), "Invariant 5: q filter casts to string and trims");
assert(indexMethod.includes("if ($q !== null && $q !== '') {"), "Invariant 5: q filter prevents empty string LIKE clauses");
assert(indexMethod.includes("(m.first_name LIKE ? OR m.last_name LIKE ? OR m.phone LIKE ? OR m.email LIKE ?)"), "Invariant 5: q filter misses one or more required target fields");

if (indexMethod.includes("['active', 'inactive']") && indexMethod.includes("trim((string)$q)")) {
    console.log("✅ PASS: Invariant 5: Filter contract restricts status and q types and handles boundaries properly");
}

// Scopes for COUNT and SELECT
const countScope = indexMethod.substring(
    indexMethod.indexOf('// Count'),
    indexMethod.indexOf('$total = $countStmt->fetchColumn();')
);

const selectScope = indexMethod.substring(
    indexMethod.indexOf('$sql = "'),
    indexMethod.indexOf('$items = $stmt->fetchAll(PDO::FETCH_ASSOC);')
);

// 6. List ownership
assert(countScope.includes("FROM members m WHERE \" . $where"), "Invariant 6: COUNT query must strictly use FROM members m WHERE \" . $where");
assert(selectScope.includes("FROM members m") && selectScope.includes("WHERE $where") && selectScope.includes("LIMIT ? OFFSET ?"), "Invariant 6: SELECT query must use FROM members m WHERE $where LIMIT ? OFFSET ?");
assert(indexMethod.includes("$conditions = ['m.trainer_id = ?', 'm.deleted_at IS NULL'];"), "Invariant 6: Base condition must restrict by trainer_id and deleted_at");
assert(!countScope.includes("$countStmt->execute($params);"), "Invariant 6: execute($params) must not be used");

if (countScope.includes("FROM members m") && selectScope.includes("FROM members m")) {
    console.log("✅ PASS: Invariant 6: List ownership securely scoped separately for COUNT and SELECT queries");
}

// 7. COUNT typed binding
const countSearchBindings = (countScope.match(/\$countStmt->bindValue\(\$paramIndex\+\+, \$search, PDO::PARAM_STR\);/g) || []).length;
assert(countSearchBindings === 4, `Invariant 7: COUNT requires exactly 4 search bindings, found ${countSearchBindings}`);
assert(countScope.includes("$countStmt->bindValue(1, $trainerId, PDO::PARAM_INT);"), "Invariant 7: COUNT trainer_id missing PARAM_INT");
assert(countScope.includes("$countStmt->bindValue($paramIndex++, $status, PDO::PARAM_STR);"), "Invariant 7: COUNT status missing PARAM_STR");
assert(!countScope.match(/\$countStmt->execute\(\$params\)/), "Invariant 7: COUNT implicit execute($params) must not be used");

if (countSearchBindings === 4 && countScope.includes("PDO::PARAM_INT")) {
    console.log("✅ PASS: Invariant 7: COUNT query securely maps all variables with explicit PDO types and exact parameter counts");
}

// 8. SELECT typed binding
const selectSearchBindings = (selectScope.match(/\$stmt->bindValue\(\$paramIndex\+\+, \$search, PDO::PARAM_STR\);/g) || []).length;
assert(selectSearchBindings === 4, `Invariant 8: SELECT requires exactly 4 search bindings, found ${selectSearchBindings}`);
assert(selectScope.includes("$stmt->bindValue(1, $trainerId, PDO::PARAM_INT);"), "Invariant 8: SELECT trainer_id missing PARAM_INT");
assert(selectScope.includes("$stmt->bindValue($paramIndex++, $status, PDO::PARAM_STR);"), "Invariant 8: SELECT status missing PARAM_STR");
assert(selectScope.includes("$stmt->bindValue($paramIndex++, $perPage, PDO::PARAM_INT);"), "Invariant 8: SELECT LIMIT missing PARAM_INT");
assert(selectScope.includes("$stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);"), "Invariant 8: SELECT OFFSET missing PARAM_INT");

if (selectSearchBindings === 4 && selectScope.includes("PDO::PARAM_INT")) {
    console.log("✅ PASS: Invariant 8: SELECT query securely maps all variables with explicit PDO types and exact parameter counts");
}

// 9. List response contract
assert(indexMethod.includes("'items' => $normalizedItems"), "Invariant 9: Response missing items key");
assert(indexMethod.includes("'pagination' => ["), "Invariant 9: Response missing pagination object");
assert(indexMethod.includes("'total' => (int)$total") && indexMethod.includes("'page' => $page") && indexMethod.includes("'per_page' => $perPage") && indexMethod.includes("'last_page' => (int)$lastPage"), "Invariant 9: Response missing full pagination fields");
assert(indexMethod.includes("$item['id'] = (int)$item['id'];"), "Invariant 9: Response missing item id integer normalization");

if (indexMethod.includes("'pagination' =>") && indexMethod.includes("(int)$item['id']")) {
    console.log("✅ PASS: Invariant 9: List response envelops items and pagination correctly with normalized ids");
}

// 10. Detail ID validation
assert(showMethod.includes("is_array($id) || is_bool($id) || is_object($id)"), "Invariant 10: Detail missing initial parameter type checks");
assert(showMethod.includes("$filteredId = filter_var($idStr, FILTER_VALIDATE_INT);"), "Invariant 10: Detail missing int validation filter");
assert(showMethod.includes("$stmt->bindValue(1, $idInt, PDO::PARAM_INT);"), "Invariant 10: Detail missing PARAM_INT binding for member id");
assert(showMethod.includes("$stmt->bindValue(2, $trainerId, PDO::PARAM_INT);"), "Invariant 10: Detail missing PARAM_INT binding for trainer id");

if (showMethod.includes("FILTER_VALIDATE_INT") && showMethod.includes("PARAM_INT")) {
    console.log("✅ PASS: Invariant 10: Detail endpoint securely validates IDs and binds them explicitly");
}

// 11. Detail ownership
assert(showMethod.includes("WHERE m.id = ? AND m.trainer_id = ? AND m.deleted_at IS NULL"), "Invariant 11: Detail query missing compound ownership constraints");
assert(showMethod.includes("if (!$member) {") && showMethod.includes("'NOT_FOUND', 404"), "Invariant 11: Detail endpoint missing 404 block for inaccessible members");

if (showMethod.includes("m.trainer_id = ?") && showMethod.includes("404")) {
    console.log("✅ PASS: Invariant 11: Detail read query properly restricts access based on trainer ownership");
}

// 12. Detail response shape
assert(showMethod.includes("m.id, m.uuid, m.first_name, m.last_name, m.phone, m.email,"), "Invariant 12: Detail select missing basic fields");
assert(showMethod.includes("m.status, m.membership_start_date, m.membership_end_date,"), "Invariant 12: Detail select missing membership fields");
assert(showMethod.includes("m.emergency_contact_name, m.emergency_contact_phone, m.notes,"), "Invariant 12: Detail select missing contact or notes fields");
assert(showMethod.includes("m.created_at, m.updated_at"), "Invariant 12: Detail select missing timestamps");

if (showMethod.includes("m.uuid") && showMethod.includes("m.emergency_contact_name")) {
    console.log("✅ PASS: Invariant 12: Detail response shape precisely preserves all specific member features");
}

if (errors.length > 0) {
    console.error("\n❌ Verification FAILED with " + errors.length + " errors:\n");
    errors.forEach(e => console.error("- " + e));
    process.exit(1);
} else {
    console.log("\n✅ Verification PASSED.");
    process.exit(0);
}
