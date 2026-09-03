import fs from 'fs';
import path from 'path';

let totalInvariants = 0;
let passedInvariants = 0;
let failedInvariants = 0;

function checkInvariant(name, fn) {
    totalInvariants++;
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passedInvariants++;
    } catch (e) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Reason: ${e.message}`);
        failedInvariants++;
    }
}

function extractBlock(code, functionSignature) {
    const startIdx = code.indexOf(functionSignature);
    if (startIdx === -1) return null;

    let braceCount = 0;
    let started = false;
    let i = startIdx;

    for (; i < code.length; i++) {
        if (code[i] === '{') {
            braceCount++;
            started = true;
        } else if (code[i] === '}') {
            braceCount--;
        }
        if (started && braceCount === 0) {
            return code.substring(startIdx, i + 1);
        }
    }
    return null;
}

// ---------------------------------------------------------
// Negative Self-Tests
// ---------------------------------------------------------
checkInvariant('Negative Self-Test A: Exact create key set rejects arbitrary keys', () => {
    const allowed = ['member_id', 'trainer_id', 'starts_at', 'ends_at'].sort();
    const good = ['member_id', 'trainer_id', 'starts_at', 'ends_at'].sort();
    const bad = ['member_id', 'trainer_id', 'starts_at', 'ends_at', 'status'].sort();
    if (JSON.stringify(good) !== JSON.stringify(allowed)) throw new Error("Self-test A failed on good");
    if (JSON.stringify(bad) === JSON.stringify(allowed)) throw new Error("Self-test A failed on bad");
});

checkInvariant('Negative Self-Test B: Trainer payload forbids trainer_id', () => {
    const allowedTrainer = ['member_id', 'starts_at', 'ends_at'].sort();
    const payloadWithTrainerId = ['member_id', 'starts_at', 'ends_at', 'trainer_id'].sort();
    if (JSON.stringify(payloadWithTrainerId) === JSON.stringify(allowedTrainer)) throw new Error("Self-test B failed");
});

checkInvariant('Negative Self-Test C: Overlap rejects <= and >=', () => {
    const re = /starts_at\s*<\s*\?\s*AND\s*ends_at\s*>\s*\?/;
    if (!re.test('starts_at < ? AND ends_at > ?')) throw new Error("Failed to match strict canonical");
    if (re.test('starts_at <= ? AND ends_at >= ?')) throw new Error("Matched forbidden operators");
});

checkInvariant('Negative Self-Test D: Lock order rejects trainer-before-member', () => {
    const lockTextGood = "SELECT members... SELECT trainers...";
    const lockTextBad = "SELECT trainers... SELECT members...";
    
    let idxMemG = lockTextGood.indexOf("members");
    let idxTrG = lockTextGood.indexOf("trainers");
    if (idxMemG > idxTrG) throw new Error("Good lock order failed self test");

    let idxMemB = lockTextBad.indexOf("members");
    let idxTrB = lockTextBad.indexOf("trainers");
    if (idxMemB < idxTrB) throw new Error("Bad lock order allowed");
});

checkInvariant('Negative Self-Test E: Persisted-fetch ordering rejects commit-before-fetch', () => {
    const good = "SELECT id, uuid... commit()";
    const bad = "commit() ... SELECT id, uuid";
    if (good.indexOf("SELECT") > good.indexOf("commit")) throw new Error("Good failed");
    if (bad.indexOf("SELECT") < bad.indexOf("commit")) throw new Error("Bad passed");
});

checkInvariant('Negative Self-Test F: Audit ordering rejects audit-before-commit', () => {
    const good = "commit(); AuditLogger::log";
    const bad = "AuditLogger::log(); commit();";
    if (good.indexOf("commit") > good.indexOf("AuditLogger::log")) throw new Error("Good failed");
    if (bad.indexOf("commit") < bad.indexOf("AuditLogger::log")) throw new Error("Bad passed");
});

checkInvariant('Negative Self-Test G: Exact Audit metadata rejects extra field', () => {
    const getKeys = (obj) => Object.keys(obj).sort();
    const exact = getKeys({member_id:1, trainer_id:1, starts_at:1, ends_at:1});
    const extra = getKeys({member_id:1, trainer_id:1, starts_at:1, ends_at:1, email:1});
    if (JSON.stringify(exact) === JSON.stringify(extra)) throw new Error("Failed to reject extra key");
});

checkInvariant('Negative Self-Test H: Route RBAC rejects editor', () => {
    const roles = "AuthMiddleware::hasRole(['super_admin', 'admin'])";
    if (roles.includes("'editor'")) throw new Error("Editor found in good RBAC");
    const badRoles = "AuthMiddleware::hasRole(['super_admin', 'admin', 'editor'])";
    if (!badRoles.includes("'editor'")) throw new Error("Editor not found in bad RBAC");
});

checkInvariant('Negative Self-Test I: Privacy projection rejects sensitive', () => {
    const projection = "SELECT id, uuid, name FROM trainers";
    const badProjection = "SELECT id, uuid, email, phone FROM trainers";
    const regex = /phone|email|emergency_contact|blood_group|password|credentials/;
    if (regex.test(projection)) throw new Error("Matched valid projection");
    if (!regex.test(badProjection)) throw new Error("Failed to match bad projection");
});

checkInvariant('Negative Self-Test J: Secure UUID rejects mt_rand', () => {
    const good = "random_bytes(16)";
    const bad = "mt_rand(0, 0xffff)";
    const r = /mt_rand|uniqid|rand\(/;
    if (r.test(good)) throw new Error("Matched on good");
    if (!r.test(bad)) throw new Error("Failed to match bad");
});


// ---------------------------------------------------------
// Load Files
// ---------------------------------------------------------
const files = {
    controller: 'api/controllers/AppointmentController.php',
    index: 'api/index.php',
    response: 'api/core/Response.php',
    audit: 'api/core/AuditLogger.php',
    migration: 'database/migrations/035_create_appointments.sql'
};

const contents = {};
for (const [key, filepath] of Object.entries(files)) {
    if (!fs.existsSync(filepath)) {
        console.error(`❌ FAIL — PRODUCTION CONTRACT DEFECT: Missing required file: ${filepath}`);
        process.exit(1);
    }
    contents[key] = fs.readFileSync(filepath, 'utf8');
}

// Extract essential blocks
const getTrainerProfileIdBlock = extractBlock(contents.controller, "private function getTrainerProfileId(");
const parseWindowDateBlock = extractBlock(contents.controller, "private function parseWindowDate(");
const handleReadBlock = extractBlock(contents.controller, "private function handleRead(");
const handleCreateBlock = extractBlock(contents.controller, "private function handleCreate(");
const getAdminAppointmentsBlock = extractBlock(contents.controller, "public function getAdminAppointments(");
const createAdminAppointmentBlock = extractBlock(contents.controller, "public function createAdminAppointment(");
const getReceptionAppointmentsBlock = extractBlock(contents.controller, "public function getReceptionAppointments(");
const createReceptionAppointmentBlock = extractBlock(contents.controller, "public function createReceptionAppointment(");
const getTrainerAppointmentsBlock = extractBlock(contents.controller, "public function getTrainerAppointments(");
const createTrainerAppointmentBlock = extractBlock(contents.controller, "public function createTrainerAppointment(");

const blocks = {
    getTrainerProfileIdBlock, parseWindowDateBlock, handleReadBlock, handleCreateBlock,
    getAdminAppointmentsBlock, createAdminAppointmentBlock, getReceptionAppointmentsBlock,
    createReceptionAppointmentBlock, getTrainerAppointmentsBlock, createTrainerAppointmentBlock
};

checkInvariant('Fail-closed extractions: Ensure all critical controller blocks are present', () => {
    for (const [name, block] of Object.entries(blocks)) {
        if (!block) throw new Error(`Could not extract ${name} from AppointmentController.php`);
    }
});

// Extract route blocks from index.php
const getAdminRoute = extractBlock(contents.index, "'/api/admin/appointments' => function() {");
const postAdminRoute = extractBlock(contents.index.substring(contents.index.indexOf("'POST' =>")), "'/api/admin/appointments' => function() {");
const getReceptionRoute = extractBlock(contents.index, "'/api/reception/appointments' => function() {");
const postReceptionRoute = extractBlock(contents.index.substring(contents.index.indexOf("'POST' =>")), "'/api/reception/appointments' => function() {");
const getTrainerRoute = extractBlock(contents.index, "'/api/trainer/appointments' => function() {");
const postTrainerRoute = extractBlock(contents.index.substring(contents.index.indexOf("'POST' =>")), "'/api/trainer/appointments' => function() {");

const routes = { getAdminRoute, postAdminRoute, getReceptionRoute, postReceptionRoute, getTrainerRoute, postTrainerRoute };
checkInvariant('Fail-closed extractions: Ensure all six appointment route blocks exist in api/index.php', () => {
    for (const [name, block] of Object.entries(routes)) {
        if (!block) throw new Error(`Could not extract route block: ${name}`);
    }
});


// ---------------------------------------------------------
// Route and RBAC
// ---------------------------------------------------------
checkInvariant('Exact route matrix: RBAC and controller methods', () => {
    if (!routes.getAdminRoute.includes("['super_admin', 'admin']")) throw new Error("getAdminRoute wrong RBAC");
    if (!routes.getAdminRoute.includes("getAdminAppointments()")) throw new Error("getAdminRoute wrong method");
    if (routes.getAdminRoute.includes("'editor'")) throw new Error("getAdminRoute editor leak");
    
    if (!routes.postAdminRoute.includes("['super_admin', 'admin']")) throw new Error("postAdminRoute wrong RBAC");
    if (!routes.postAdminRoute.includes("createAdminAppointment()")) throw new Error("postAdminRoute wrong method");

    if (!routes.getReceptionRoute.includes("['super_admin', 'admin', 'reception']")) throw new Error("getReceptionRoute wrong RBAC");
    if (!routes.getReceptionRoute.includes("getReceptionAppointments()")) throw new Error("getReceptionRoute wrong method");

    if (!routes.postReceptionRoute.includes("['super_admin', 'admin', 'reception']")) throw new Error("postReceptionRoute wrong RBAC");
    if (!routes.postReceptionRoute.includes("createReceptionAppointment()")) throw new Error("postReceptionRoute wrong method");

    if (!routes.getTrainerRoute.includes("['trainer']")) throw new Error("getTrainerRoute wrong RBAC");
    if (!routes.getTrainerRoute.includes("getTrainerAppointments()")) throw new Error("getTrainerRoute wrong method");

    if (!routes.postTrainerRoute.includes("['trainer']")) throw new Error("postTrainerRoute wrong RBAC");
    if (!routes.postTrainerRoute.includes("createTrainerAppointment()")) throw new Error("postTrainerRoute wrong method");
});

checkInvariant('Global CSRF contract', () => {
    // In our framework, we assume index.php doesn't disable it for POST.
    const allPostRoutes = [routes.postAdminRoute, routes.postReceptionRoute, routes.postTrainerRoute];
    for (let r of allPostRoutes) {
        if (r.includes('csrf_bypass') || r.includes('bypass_csrf')) throw new Error("CSRF bypass found in appointment POST route");
    }
});

// ---------------------------------------------------------
// Controller Constraints
// ---------------------------------------------------------
checkInvariant('Public controller surface: exact capability set', () => {
    const regex = /public\s+function\s+(\w+)\s*\(/g;
    let match;
    const pubMethods = [];
    while ((match = regex.exec(contents.controller)) !== null) {
        pubMethods.push(match[1]);
    }
    const allowed = ['__construct', 'getAdminAppointments', 'createAdminAppointment', 'getReceptionAppointments', 'createReceptionAppointment', 'getTrainerAppointments', 'createTrainerAppointment'].sort();
    pubMethods.sort();
    if (JSON.stringify(pubMethods) !== JSON.stringify(allowed)) {
        throw new Error(`Public methods mismatch. Found: ${pubMethods.join(',')}`);
    }
    const forbidden = ['reschedule', 'cancel', 'complete', 'noShow', 'no_show', 'delete', 'destroy', 'updateAppointment'];
    for (const f of forbidden) {
        if (pubMethods.includes(f)) throw new Error(`Forbidden method found: ${f}`);
    }
});

checkInvariant('Secure UUID guard', () => {
    const getUuidBlock = extractBlock(contents.controller, "private function generateUuid(");
    if (!getUuidBlock) throw new Error("generateUuid block missing");
    if (!getUuidBlock.includes("random_bytes(16)")) throw new Error("Missing random_bytes(16)");
    if (!getUuidBlock.includes("bin2hex")) throw new Error("Missing bin2hex");
    if (/mt_rand|uniqid|rand\(/.test(contents.controller)) throw new Error("Forbidden random generator used");
});

checkInvariant('Canonical error contract', () => {
    if (/Response::json\s*\(\s*\[\s*['"]error['"]\s*=>/.test(contents.controller)) {
        throw new Error("Found forbidden Response::json(['error' => ...] pattern");
    }
    const requiredCodes = [
        'UNAUTHORIZED', 'FORBIDDEN', 'TRAINER_PROFILE_NOT_LINKED', 'NOT_FOUND',
        'MEMBER_INELIGIBLE', 'TRAINER_INELIGIBLE', 'TRAINER_CONFLICT',
        'MEMBER_CONFLICT', 'VALIDATION_ERROR', 'INVALID_JSON', 'INTERNAL_ERROR'
    ];
    for (const c of requiredCodes) {
        if (!contents.controller.includes(`'${c}'`) && !contents.controller.includes(`"${c}"`)) {
            throw new Error(`Missing required error code: ${c}`);
        }
    }
});

checkInvariant('Strict datetime parser', () => {
    if (!parseWindowDateBlock.includes("'Europe/Istanbul'")) throw new Error("Missing Europe/Istanbul");
    if (!parseWindowDateBlock.includes("Y-m-d H:i:s")) throw new Error("Missing Y-m-d H:i:s format");
    if (!parseWindowDateBlock.includes("VALIDATION_ERROR") || !parseWindowDateBlock.includes("422")) throw new Error("Missing 422 VALIDATION_ERROR");
    if (/date_default_timezone_set|UTC|\+30|\+45|\+60|P1M|DateInterval/i.test(parseWindowDateBlock)) {
        throw new Error("Forbidden datetime modification found");
    }
});

// ---------------------------------------------------------
// Read Operations
// ---------------------------------------------------------
checkInvariant('Read query allowlists', () => {
    if (!getAdminAppointmentsBlock.includes("['from', 'to', 'trainer_id', 'member_id']")) throw new Error("Admin read lacks exact array");
    if (!getReceptionAppointmentsBlock.includes("['from', 'to', 'trainer_id', 'member_id']")) throw new Error("Reception read lacks exact array");
    if (!getTrainerAppointmentsBlock.includes("['from', 'to', 'member_id']")) throw new Error("Trainer read lacks exact array");
    if (getTrainerAppointmentsBlock.includes("'trainer_id'")) throw new Error("Trainer allowlist contains trainer_id");
});

checkInvariant('Required bounded window', () => {
    if (!handleReadBlock.includes("isset($queryParams['from'])") || !handleReadBlock.includes("isset($queryParams['to'])")) {
        throw new Error("Missing requirement for from and to");
    }
    if (!handleReadBlock.includes("is_string($queryParams['from'])") || !handleReadBlock.includes("is_string($queryParams['to'])")) {
        throw new Error("Missing string check for from and to");
    }
    if (!handleReadBlock.includes("$fromDt >= $toDt")) throw new Error("Missing from < to check");
    if (!handleReadBlock.includes("31")) throw new Error("Missing 31 calendar days check");
});

checkInvariant('Optional ID scalar guards', () => {
    const trainerCheck = "is_string($queryParams['trainer_id'])";
    const memberCheck = "is_string($queryParams['member_id'])";
    const regexCheck = "/^[1-9]\\d*$/";
    if (!handleReadBlock.includes(trainerCheck) || !handleReadBlock.includes(memberCheck)) throw new Error("Missing is_string ID guard");
    if (!handleReadBlock.includes(regexCheck)) throw new Error("Missing canonical positive integer regex guard");
});

checkInvariant('Read overlap SQL', () => {
    const re = /a\.starts_at\s*<\s*\?\s*AND\s*a\.ends_at\s*>\s*\?/;
    if (!re.test(handleReadBlock)) throw new Error("Overlap SQL missing or tampered");
    if (/BETWEEN\\s|starts_at\\s*<=|ends_at\\s*>=/.test(handleReadBlock)) throw new Error("Forbidden overlap semantics found");
    if (/WHERE.*?status\s*=\s*['"]scheduled['"]/s.test(handleReadBlock)) throw new Error("Read SQL filters by scheduled status");
});

checkInvariant('Read projection privacy', () => {
    const forbidden = /phone|email|emergency_contact|blood_group|membership_start_date|membership_end_date|notes|measurement|progress_note|password|credentials|audit_metadata/;
    if (forbidden.test(handleReadBlock)) throw new Error("Forbidden sensitive concept found in Read Projection");

    if (!handleReadBlock.includes("m.first_name") || !handleReadBlock.includes("m.last_name") || !handleReadBlock.includes("t.name")) {
        throw new Error("Missing required projection fields");
    }
});

checkInvariant('Trainer schema-column parity', () => {
    if (handleReadBlock.includes("t.display_name")) throw new Error("Forbidden t.display_name used");
    if (!handleReadBlock.includes("t.name as trainer_name")) throw new Error("Missing exact t.name AS trainer_name");
});

checkInvariant('Read exception safety', () => {
    if (!handleReadBlock.includes("catch (Throwable $e)")) throw new Error("Missing catch Throwable in handleRead");
    if (!handleReadBlock.includes("'INTERNAL_ERROR', 500")) throw new Error("Missing generic 500 return");
    
    const catchBlock = handleReadBlock.substring(handleReadBlock.lastIndexOf('catch'));
    if (catchBlock.includes("$e->getMessage()") && catchBlock.includes("Response::error")) {
        const respCall = catchBlock.substring(catchBlock.indexOf("Response::error"), catchBlock.indexOf(";", catchBlock.indexOf("Response::error")));
        if (respCall.includes("$e->getMessage()")) throw new Error("Exception text leaked in Response::error");
    }
});

checkInvariant('Trainer own-scope resolver', () => {
    if (!getTrainerProfileIdBlock.includes("admin_id = ?")) throw new Error("admin_id not checked");
    if (!getTrainerProfileIdBlock.includes("deleted_at IS NULL")) throw new Error("deleted_at IS NULL not checked");
    if (!getTrainerProfileIdBlock.includes("is_active = 1")) throw new Error("is_active = 1 not checked");
    if (!getTrainerProfileIdBlock.includes("TRAINER_PROFILE_NOT_LINKED")) throw new Error("Missing TRAINER_PROFILE_NOT_LINKED");
});


// ---------------------------------------------------------
// Create Operations
// ---------------------------------------------------------
checkInvariant('Exact create payload sets', () => {
    if (!createAdminAppointmentBlock.includes("['member_id', 'trainer_id', 'starts_at', 'ends_at']")) throw new Error("Admin payload mismatch");
    if (!createReceptionAppointmentBlock.includes("['member_id', 'trainer_id', 'starts_at', 'ends_at']")) throw new Error("Reception payload mismatch");
    if (!createTrainerAppointmentBlock.includes("['member_id', 'starts_at', 'ends_at']")) throw new Error("Trainer payload mismatch");
});

checkInvariant('Create JSON contract', () => {
    if (!handleCreateBlock.includes("php://input")) throw new Error("Missing php://input");
    if (!handleCreateBlock.includes("INVALID_JSON")) throw new Error("Missing INVALID_JSON");
    if (!handleCreateBlock.includes("VALIDATION_ERROR")) throw new Error("Missing VALIDATION_ERROR");
    if (!handleCreateBlock.includes("is_int($data['member_id'])")) throw new Error("Missing member_id integer check");
});

checkInvariant('Create temporal contract', () => {
    if (!handleCreateBlock.includes("$startsDt >= $endsDt")) throw new Error("Missing starts_at strictly before ends_at check");
    if (!handleCreateBlock.includes("Y-m-d")) throw new Error("Missing calendar day Y-m-d check");
});

checkInvariant('Session actor', () => {
    if (!handleCreateBlock.includes("$_SESSION['admin_id']")) throw new Error("Missing $_SESSION['admin_id']");
    if (!handleCreateBlock.includes("'UNAUTHORIZED'")) throw new Error("Missing UNAUTHORIZED");
});


checkInvariant('Deterministic participant lock order', () => {
    const beginTx = handleCreateBlock.indexOf("beginTransaction");
    const memLock = handleCreateBlock.indexOf("SELECT id, deleted_at, status, membership_end_date, trainer_id FROM members WHERE id = ? FOR UPDATE");
    const trLock = handleCreateBlock.indexOf("SELECT id, deleted_at, is_active, admin_id FROM trainers WHERE id = ? FOR UPDATE");
    const trConf = handleCreateBlock.indexOf("trainer_id = ? AND status = 'scheduled'");
    const memConf = handleCreateBlock.indexOf("member_id = ? AND status = 'scheduled'");
    const insert = handleCreateBlock.indexOf("INSERT INTO appointments");
    const persistFetch = handleCreateBlock.indexOf("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
    const commit = handleCreateBlock.indexOf("commit()");
    const audit = handleCreateBlock.indexOf("AuditLogger::log");
    const resp201 = handleCreateBlock.indexOf("201");

    if (beginTx === -1 || memLock === -1 || trLock === -1 || trConf === -1 || memConf === -1 || insert === -1 || persistFetch === -1 || commit === -1 || audit === -1 || resp201 === -1) {
        throw new Error("One or more required lock/operation statements not found in handleCreate");
    }

    if (!(beginTx < memLock && memLock < trLock && trLock < trConf && trConf < memConf && memConf < insert && insert < persistFetch && persistFetch < commit && commit < audit && audit < resp201)) {
        throw new Error("Monotonic lock/execution ordering failed");
    }
});

checkInvariant('Member lock + eligibility', () => {
    if (!handleCreateBlock.includes("MEMBER_INELIGIBLE")) throw new Error("Missing MEMBER_INELIGIBLE error");
    if (!handleCreateBlock.includes("membership_end_date")) throw new Error("Missing membership_end_date check");
    if (!handleCreateBlock.includes("NOT_FOUND")) throw new Error("Missing NOT_FOUND for member");
    if (handleCreateBlock.includes("membership_start_date")) throw new Error("Forbidden membership_start_date logic found");
});

checkInvariant('Trainer assignment restriction', () => {
    if (!handleCreateBlock.includes("$forcedTrainerId !== null && (int)$member['trainer_id'] !== $forcedTrainerId")) {
        throw new Error("Missing trainer assignment check for member.trainer_id");
    }
});

checkInvariant('Trainer lock + eligibility', () => {
    if (!handleCreateBlock.includes("TRAINER_INELIGIBLE")) throw new Error("Missing TRAINER_INELIGIBLE error");
    if (!handleCreateBlock.includes("$forcedTrainerId !== null && (int)$trainer['admin_id'] !== $adminId")) {
        throw new Error("Missing admin_id check for trainer scope");
    }
});

checkInvariant('Exact conflict semantics', () => {
    if (!handleCreateBlock.includes("TRAINER_CONFLICT")) throw new Error("Missing TRAINER_CONFLICT");
    if (!handleCreateBlock.includes("MEMBER_CONFLICT")) throw new Error("Missing MEMBER_CONFLICT");
    if (!handleCreateBlock.replace(/\s+/g, ' ').includes("trainer_id = ? AND status = 'scheduled' AND starts_at < ? AND ends_at > ?")) {
        throw new Error("Exact trainer overlap query mismatch");
    }
});

checkInvariant('Appointment INSERT exactness', () => {
    const insertSql = extractBlock(handleCreateBlock, "INSERT INTO appointments");
    if (!handleCreateBlock.includes("INSERT INTO appointments (uuid, member_id, trainer_id, starts_at, ends_at, status, created_by)")) {
        throw new Error("INSERT column definition mismatch");
    }
    const forbidden = /notes|visit_id|branch_id|training_program_id|payment|updated_by|cancellation_reason/;
    if (forbidden.test(insertSql)) throw new Error("Forbidden columns in INSERT");
    if (!handleCreateBlock.includes("'scheduled'")) throw new Error("Status is not hardcoded to scheduled");
});

checkInvariant('Persisted-row response', () => {
    if (!handleCreateBlock.includes("lastInsertId()")) throw new Error("Missing lastInsertId()");
    if (!handleCreateBlock.includes("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?")) {
        throw new Error("Missing exact persisted SELECT query");
    }
    if (!handleCreateBlock.includes("Failed to retrieve persisted appointment")) throw new Error("Missing 500 error for failed persisted fetch");
});

checkInvariant('Commit-before-audit', () => {
    const commitIdx = handleCreateBlock.indexOf("commit()");
    const auditIdx = handleCreateBlock.indexOf("AuditLogger::log");
    if (commitIdx > auditIdx) throw new Error("Audit before commit!");
});

checkInvariant('Exact AuditLogger contract', () => {
    const auditBlock = extractBlock(handleCreateBlock, "AuditLogger::log(");
    if (!auditBlock) throw new Error("AuditLogger block missing");
    if (!auditBlock.includes("'appointment.created'")) throw new Error("Missing action appointment.created");
    if (!auditBlock.includes("'appointment'")) throw new Error("Missing entityType appointment");
    if (!auditBlock.includes("'member_id'") || !auditBlock.includes("'trainer_id'") || !auditBlock.includes("'starts_at'") || !auditBlock.includes("'ends_at'")) {
        throw new Error("Missing required metadata keys in audit");
    }
    const metaStr = extractBlock(auditBlock, "[");
    if (/email|name|phone/i.test(metaStr)) throw new Error("Forbidden sensitive metadata in Audit");
    if (auditBlock.includes("$this->db")) throw new Error("PDO connection injected into AuditLogger");
});

checkInvariant('Audit failure isolation', () => {
    const auditTryCatch = extractBlock(handleCreateBlock.substring(handleCreateBlock.indexOf("6. Audit")), "try {");
    if (!auditTryCatch || !auditTryCatch.includes("AuditLogger::log")) throw new Error("Audit missing local try/catch");
    if (auditTryCatch.includes("rollBack")) throw new Error("Audit catch block contains rollback");
    if (auditTryCatch.includes("Response::error") || auditTryCatch.includes("500")) throw new Error("Audit catch block alters response");
});

checkInvariant('Create unexpected-error safety', () => {
    const lastCatch = handleCreateBlock.substring(handleCreateBlock.lastIndexOf("catch (Throwable $e)"));
    if (!lastCatch.includes("inTransaction")) throw new Error("Missing inTransaction check");
    if (!lastCatch.includes("rollBack")) throw new Error("Missing rollBack in catch");
    if (!lastCatch.includes("'INTERNAL_ERROR', 500")) throw new Error("Missing generic 500 Response");
});

// ---------------------------------------------------------
// Global Contracts
// ---------------------------------------------------------
checkInvariant('Schema cross-contract', () => {
    const schema = contents.migration;
    if (!schema.includes("starts_at") || !schema.includes("ends_at") || !schema.includes("status")) {
        throw new Error("Schema missing key columns");
    }
    if (schema.includes("deleted_at")) throw new Error("Appointments schema requires deleted_at unexpectedly");
});

checkInvariant('Lifecycle absence', () => {
    const controller = contents.controller;
    const forbidden = /reschedule|cancel|complete|no-show|DELETE FROM appointments|UPDATE appointments/;
    if (forbidden.test(controller)) throw new Error("Lifecycle mutations found in C.1 bounded scope");
});

checkInvariant('Temporary artifact absence', () => {
    if (fs.existsSync('patch_index.php')) throw new Error("patch_index.php exists");
    const rootFiles = fs.readdirSync('.');
    for (const f of rootFiles) {
        if (f.endsWith('.fixed') || f.endsWith('.tmp')) throw new Error(`Artifact found: ${f}`);
    }
});


// ---------------------------------------------------------
// Result
// ---------------------------------------------------------
console.log('----------------------------------------');
if (failedInvariants === 0) {
    console.log(`✅ Appointment Read/Create Verification PASSED (All ${passedInvariants}/${totalInvariants} invariants verified).`);
    process.exit(0);
} else {
    console.error(`❌ Appointment Read/Create Verification FAILED (${failedInvariants} out of ${totalInvariants} failed).`);
    process.exit(1);
}
