import fs from 'fs';
import path from 'path';

const controllerPath = path.resolve('api/controllers/TrainerDashboardController.php');
const indexPath = path.resolve('api/index.php');
const adminDashboardControllerPath = path.resolve('api/controllers/AdminController.php');

let errors = [];

function assert(condition, message) {
    if (!condition) {
        errors.push(message);
    }
}

function reportInvariant(pass, name, details = '') {
    if (pass) {
        console.log(`✅ PASS: ${name}`);
    } else {
        const errorMsg = `❌ FAIL: ${name}${details ? ` -> ${details}` : ''}`;
        console.error(errorMsg);
        errors.push(errorMsg);
    }
}

console.log("Starting Trainer Dashboard Read API verification (Deterministic Contract Guard)...");

// Invariant 1: Required backend files exist
const filesExist = fs.existsSync(controllerPath) && fs.existsSync(indexPath);
reportInvariant(filesExist, "Invariant 1: Required backend files exist and are accessible");

if (!filesExist) {
    console.error("Critical files missing. Terminating verification.");
    process.exit(1);
}

const controllerContent = fs.readFileSync(controllerPath, 'utf8');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Invariant 2: Route wiring and role firewall
const routePattern = "preg_match('#^/api/trainer/dashboard$#', $requestUri)";
const routeIndex = indexContent.indexOf(routePattern);
let routePass = false;

if (routeIndex !== -1) {
    // Extract route block until the next dynamic matching comment or block
    const nextRouteIndex = indexContent.indexOf("// Dynamic matching for trainer members", routeIndex);
    const routeBlock = nextRouteIndex !== -1 
        ? indexContent.substring(routeIndex, nextRouteIndex) 
        : indexContent.substring(routeIndex, routeIndex + 400);

    const hasTrainerFirewall = routeBlock.includes("AuthMiddleware::hasRole(['trainer']);");
    const hasGetOnly = routeBlock.includes("if ($method === 'GET')");
    const callsController = routeBlock.includes("(new \\Controllers\\TrainerDashboardController())->index();");
    const setsMatched = routeBlock.includes("$matched = true;");

    const noPost = !routeBlock.includes("$method === 'POST'");
    const noPatch = !routeBlock.includes("$method === 'PATCH'");
    const noPut = !routeBlock.includes("$method === 'PUT'");
    const noDelete = !routeBlock.includes("$method === 'DELETE'");
    const noAdminRole = !routeBlock.includes("'admin'");

    routePass = hasTrainerFirewall && hasGetOnly && callsController && setsMatched &&
                noPost && noPatch && noPut && noDelete && noAdminRole;
}

reportInvariant(
    routePass,
    "Invariant 2: Route is defined with block-scoped trainer role firewall and strictly GET-only method mapping"
);

// Invariant 3: Controller read-only invariant (No mutation SQL, no transactions, no locks)
const hasNoInsert = !controllerContent.match(/\bINSERT\s+INTO\b/i);
const hasNoUpdate = !controllerContent.match(/\bUPDATE\s+[a-zA-Z0-9_]+\s+SET\b/i);
const hasNoDeleteSql = !controllerContent.match(/\bDELETE\s+FROM\b/i);
const hasNoReplace = !controllerContent.match(/\bREPLACE\s+INTO\b/i);
const hasNoBeginTransaction = !controllerContent.includes("beginTransaction");
const hasNoCommit = !controllerContent.includes("commit");
const hasNoRollback = !controllerContent.includes("rollBack");
const hasNoForUpdate = !controllerContent.includes("FOR UPDATE");

const readOnlyPass = hasNoInsert && hasNoUpdate && hasNoDeleteSql && hasNoReplace &&
                     hasNoBeginTransaction && hasNoCommit && hasNoRollback && hasNoForUpdate;

reportInvariant(
    readOnlyPass,
    "Invariant 3: Controller is strictly read-only without mutation SQL, transaction blocks, or row locking"
);

// Invariant 4: Trainer profile lookup contract
let profilePass = false;
const getProfileIndex = controllerContent.indexOf('private function getTrainerProfile()');
if (getProfileIndex !== -1) {
    const getProfileBlock = controllerContent.substring(
        getProfileIndex,
        controllerContent.indexOf('public function index()')
    );

    const hasSessionAdminId = getProfileBlock.includes("$adminId = (int)($_SESSION['admin_id'] ?? 0);");
    const hasAdminIdCheck = getProfileBlock.includes("if (!$adminId)");
    const hasTrainerQuery = getProfileBlock.includes("SELECT id, name FROM trainers") &&
                           getProfileBlock.includes("WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1");
    const hasParamBinding = getProfileBlock.includes("$stmt->bindValue(1, $adminId, PDO::PARAM_INT);");
    const has403Contract = getProfileBlock.includes("'TRAINER_PROFILE_NOT_LINKED', 403");
    const hasIntegerId = getProfileBlock.includes("'id' => (int)$trainer['id']");
    const hasDisplayName = getProfileBlock.includes("'display_name' => (string)$trainer['name']");
    const hasNoLockInProfile = !getProfileBlock.includes("FOR UPDATE");

    profilePass = hasSessionAdminId && hasAdminIdCheck && hasTrainerQuery && 
                  hasParamBinding && has403Contract && hasIntegerId && 
                  hasDisplayName && hasNoLockInProfile;
}

reportInvariant(
    profilePass,
    "Invariant 4: Trainer profile helper enforces active profile lookup, PARAM_INT binding, and 403 error contract"
);

// Invariant 5: Member metrics isolation
let memberMetricsPass = false;
const indexMethodIndex = controllerContent.indexOf('public function index()');
const indexMethodBlock = indexMethodIndex !== -1 ? controllerContent.substring(indexMethodIndex) : '';

const memberQueryMatch = indexMethodBlock.includes("FROM members") &&
                         indexMethodBlock.includes("WHERE trainer_id = ? AND deleted_at IS NULL") &&
                         indexMethodBlock.includes("COUNT(*) as total") &&
                         indexMethodBlock.includes("SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count") &&
                         indexMethodBlock.includes("SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_count");

const memberBindingMatch = indexMethodBlock.includes("$memberStmt->bindValue(1, $trainerId, PDO::PARAM_INT);");

const memberNormalizationMatch = indexMethodBlock.includes("'total' => (int)($memberRow['total'] ?? 0)") &&
                                 indexMethodBlock.includes("'active' => (int)($memberRow['active_count'] ?? 0)") &&
                                 indexMethodBlock.includes("'inactive' => (int)($memberRow['inactive_count'] ?? 0)");

memberMetricsPass = Boolean(memberQueryMatch && memberBindingMatch && memberNormalizationMatch);

reportInvariant(
    memberMetricsPass,
    "Invariant 5: Member metrics enforce strict trainer_id filter, deleted_at IS NULL, status counts, and integer normalization"
);

// Invariant 6: Training program metrics isolation
let programMetricsPass = false;

const programQueryMatch = indexMethodBlock.includes("FROM training_programs tp") &&
                          indexMethodBlock.includes("INNER JOIN members m ON tp.member_id = m.id AND m.trainer_id = ? AND m.deleted_at IS NULL") &&
                          indexMethodBlock.includes("WHERE tp.trainer_id = ? AND tp.deleted_at IS NULL") &&
                          indexMethodBlock.includes("SUM(CASE WHEN tp.status = 'draft' THEN 1 ELSE 0 END) as draft_count") &&
                          indexMethodBlock.includes("SUM(CASE WHEN tp.status = 'active' THEN 1 ELSE 0 END) as active_count") &&
                          indexMethodBlock.includes("SUM(CASE WHEN tp.status = 'archived' THEN 1 ELSE 0 END) as archived_count");

const programBindingsMatch = indexMethodBlock.includes("$programStmt->bindValue(1, $trainerId, PDO::PARAM_INT);") &&
                             indexMethodBlock.includes("$programStmt->bindValue(2, $trainerId, PDO::PARAM_INT);");

const programNormalizationMatch = indexMethodBlock.includes("$draft = (int)($programRow['draft_count'] ?? 0);") &&
                                  indexMethodBlock.includes("$active = (int)($programRow['active_count'] ?? 0);") &&
                                  indexMethodBlock.includes("$archived = (int)($programRow['archived_count'] ?? 0);") &&
                                  indexMethodBlock.includes("'total' => $draft + $active + $archived");

programMetricsPass = Boolean(programQueryMatch && programBindingsMatch && programNormalizationMatch);

reportInvariant(
    programMetricsPass,
    "Invariant 6: Training program metrics enforce dual trainer_id joins, deleted_at filters, status counts, and total calculation"
);

// Invariant 7: Recent members query isolation, sorting, limit 5, and normalization
let recentMembersPass = false;

const recentQueryMatch = indexMethodBlock.includes("FROM members m") &&
                         indexMethodBlock.includes("WHERE m.trainer_id = ? AND m.deleted_at IS NULL") &&
                         indexMethodBlock.includes("ORDER BY m.updated_at DESC, m.id DESC") &&
                         indexMethodBlock.includes("LIMIT 5");

const recentBindingMatch = indexMethodBlock.includes("$recentStmt->bindValue(1, $trainerId, PDO::PARAM_INT);");

const recentFieldsMatch = indexMethodBlock.includes("m.id, m.uuid, m.first_name, m.last_name, m.status, m.updated_at") &&
                          indexMethodBlock.includes("'id' => (int)$row['id']") &&
                          indexMethodBlock.includes("'uuid' => (string)$row['uuid']") &&
                          indexMethodBlock.includes("'first_name' => (string)$row['first_name']") &&
                          indexMethodBlock.includes("'last_name' => (string)$row['last_name']") &&
                          indexMethodBlock.includes("'status' => (string)$row['status']") &&
                          indexMethodBlock.includes("'updated_at' => (string)$row['updated_at']");

recentMembersPass = Boolean(recentQueryMatch && recentBindingMatch && recentFieldsMatch);

reportInvariant(
    recentMembersPass,
    "Invariant 7: Recent members query enforces trainer ownership, minimal fields, updated_at DESC ordering, and LIMIT 5"
);

// Invariant 8: Privacy and minimal data contract (Negative Invariant)
// Ensure no sensitive personal data or notes are selected or returned in the response
const sqlQueriesOnly = (controllerContent.match(/SELECT[\s\S]*?FROM/gi) || []).join(' ');

const noPhoneInSql = !sqlQueriesOnly.includes("phone");
const noEmailInSql = !sqlQueriesOnly.includes("email");
const noEmergencyContactInSql = !sqlQueriesOnly.includes("emergency_contact");
const noNotesInSql = !sqlQueriesOnly.includes("notes") && !sqlQueriesOnly.includes("note");
const noPasswordInSql = !sqlQueriesOnly.includes("password");
const noAuditLogs = !controllerContent.includes("AuditLogger") && !controllerContent.includes("audit_logs");

const privacyPass = noPhoneInSql && noEmailInSql && noEmergencyContactInSql && 
                    noNotesInSql && noPasswordInSql && noAuditLogs;

reportInvariant(
    privacyPass,
    "Invariant 8: Privacy invariant confirms zero leaks of phone, email, emergency contacts, notes, or credentials"
);

// Invariant 9: Response contract structure
const hasResponseJson = controllerContent.includes("Response::json([");
const hasTrainerSection = controllerContent.includes("'trainer' => [") &&
                          controllerContent.includes("'id' => (int)$trainer['id']") &&
                          controllerContent.includes("'display_name' => (string)$trainer['display_name']");
const hasMembersSection = controllerContent.includes("'members' => $memberMetrics");
const hasProgramsSection = controllerContent.includes("'training_programs' => $programMetrics");
const hasRecentSection = controllerContent.includes("'recent_members' => $recentMembers");

const responseContractPass = hasResponseJson && hasTrainerSection && 
                             hasMembersSection && hasProgramsSection && hasRecentSection;

reportInvariant(
    responseContractPass,
    "Invariant 9: Final JSON response strictly adheres to the trainer, members, training_programs, and recent_members contract"
);

// Invariant 10: No query parameters or external filters accepted
const noGetSuperglobal = !controllerContent.includes("$_GET");
const noPostSuperglobal = !controllerContent.includes("$_POST");
const noRequestSuperglobal = !controllerContent.includes("$_REQUEST");
const noPaginationInput = !controllerContent.includes("validatePaginationParam");

const noQueryParamPass = noGetSuperglobal && noPostSuperglobal && noRequestSuperglobal && noPaginationInput;

reportInvariant(
    noQueryParamPass,
    "Invariant 10: Endpoint is a static operational overview accepting zero query parameters or arbitrary filters"
);

// Invariant 11: Empty dataset semantics
const handlesEmptyMemberRow = controllerContent.includes("$memberRow = $memberStmt->fetch(PDO::FETCH_ASSOC) ?: [];");
const handlesEmptyProgramRow = controllerContent.includes("$programRow = $programStmt->fetch(PDO::FETCH_ASSOC) ?: [];");
const handlesEmptyRecentRows = controllerContent.includes("$recentRows = $recentStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];");
const no404OnEmpty = !indexMethodBlock.includes("404");

const emptySemanticsPass = handlesEmptyMemberRow && handlesEmptyProgramRow && handlesEmptyRecentRows && no404OnEmpty;

reportInvariant(
    emptySemanticsPass,
    "Invariant 11: Empty dataset returns 200 with zero metrics and empty array without throwing 404"
);

// Invariant 12: Admin dashboard isolation
let adminIsolationPass = false;
if (fs.existsSync(adminDashboardControllerPath)) {
    const adminIndexBlock = indexContent.includes("'/api/admin/dashboard' => function()");
    const adminControllerContent = fs.readFileSync(adminDashboardControllerPath, 'utf8');
    const adminHasDashboard = adminControllerContent.includes("public function dashboard()");
    adminIsolationPass = adminIndexBlock && adminHasDashboard;
}

reportInvariant(
    adminIsolationPass,
    "Invariant 12: Existing admin dashboard route and AdminController remain completely isolated and intact"
);

// Summary & Exit
console.log("----------------------------------------");
if (errors.length === 0) {
    console.log("✅ Trainer Dashboard API Verification PASSED (All 12 invariants verified).");
    process.exit(0);
} else {
    console.error(`❌ Trainer Dashboard API Verification FAILED (${errors.length} errors found).`);
    process.exit(1);
}
