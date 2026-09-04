import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function extractBalanced(source, startIndex, openChar = '{', closeChar = '}') {
    if (startIndex < 0) return null;
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let inLineComment = false;
    let inBlockComment = false;
    
    let blockStart = source.indexOf(openChar, startIndex);
    if (blockStart === -1) return null;
    
    for (let i = blockStart; i < source.length; i++) {
        let c = source[i];
        let nextC = source[i+1];
        
        if (inLineComment) {
            if (c === '\n') inLineComment = false;
            continue;
        }
        if (inBlockComment) {
            if (c === '*' && nextC === '/') {
                inBlockComment = false;
                i++;
            }
            continue;
        }
        if (inString) {
            if (c === '\\') i++;
            else if (c === stringChar) inString = false;
            continue;
        }
        
        if (c === '/' && nextC === '/') {
            inLineComment = true;
            i++;
            continue;
        }
        if (c === '/' && nextC === '*') {
            inBlockComment = true;
            i++;
            continue;
        }
        if (c === '"' || c === "'") {
            inString = true;
            stringChar = c;
            continue;
        }
        
        if (c === openChar) braceCount++;
        if (c === closeChar) {
            braceCount--;
            if (braceCount === 0) return source.substring(blockStart, i + 1);
        }
    }
    return null;
}

function extractBalancedCall(source, functionName) {
    const fnIdx = source.indexOf(functionName);
    if (fnIdx === -1) return null;
    const parenIdx = source.indexOf("(", fnIdx);
    if (parenIdx === -1) return null;
    return extractBalanced(source, parenIdx, "(", ")");
}

function splitTopLevelArgs(argString) {
    let args = [];
    let currentArg = '';
    let braceCount = 0;
    let bracketCount = 0;
    let parenCount = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < argString.length; i++) {
        let c = argString[i];
        
        if (inString) {
            if (c === '\\') {
                currentArg += c + argString[i+1];
                i++;
                continue;
            }
            if (c === stringChar) inString = false;
            currentArg += c;
            continue;
        }
        
        if (c === '"' || c === "'") {
            inString = true;
            stringChar = c;
            currentArg += c;
            continue;
        }
        
        if (c === '{') braceCount++;
        else if (c === '}') braceCount--;
        else if (c === '[') bracketCount++;
        else if (c === ']') bracketCount--;
        else if (c === '(') parenCount++;
        else if (c === ')') parenCount--;
        
        if (c === ',' && braceCount === 0 && bracketCount === 0 && parenCount === 0) {
            args.push(currentArg.trim());
            currentArg = '';
        } else {
            currentArg += c;
        }
    }
    if (currentArg.trim() !== '') args.push(currentArg.trim());
    return args;
}

let totalInvariants = 0;
let passedInvariants = 0;
let failedInvariants = 0;

function checkInvariant(name, testFn) {
    totalInvariants++;
    try {
        testFn();
        passedInvariants++;
        console.log(`✅ PASS: ${name}`);
    } catch (e) {
        failedInvariants++;
        console.error(`❌ FAIL: ${name} -> ${e.message}`);
    }
}

function verifyRbac(routeStr, expectedRoles) {
    const hasRoleMatch = routeStr.match(/AuthMiddleware::hasRole\(\[([^\]]+)\]\)/);
    if (!hasRoleMatch) throw new Error("Missing AuthMiddleware::hasRole");
    const roles = hasRoleMatch[1].split(',').map(r => r.replace(/['"\s]/g, ''));
    if (roles.length !== expectedRoles.length || !roles.every(r => expectedRoles.includes(r))) {
        throw new Error(`Expected roles ${expectedRoles.join(',')}, found ${roles.join(',')}`);
    }
}

function verifyExactJsonContract(block) {
    if (!block.includes("!empty($_GET)")) throw new Error("Missing non-empty $_GET rejection (422)");
    
    const objDecodeMatch = block.match(/json_decode\(\$rawBody\)/);
    const assocDecodeMatch = block.match(/json_decode\(\$rawBody,\s*true\)/);
    if (!objDecodeMatch || !assocDecodeMatch) throw new Error("Missing separate top-level object check (json_decode without true)");
    
    if (!block.includes("is_object")) throw new Error("Missing is_object validation (422)");
    if (!block.includes("count($data) > 0")) throw new Error("Missing count > 0 empty object validation (422)");
}

function verifyActorNormalization(block) {
    if (block.includes("preg_match('/^[1-9]\\d*$/', (string)$adminId)")) {
        throw new Error("Unsafe arbitrary (string) coercion before regex forbidden");
    }
    if (!block.match(/is_int\(\$adminId\)/)) throw new Error("Missing is_int check");
    if (!block.match(/preg_match\(['"]\/\^\[1-9\]\\d\*\$\/['"],\s*\$adminId\)/)) throw new Error("Missing canonical string regex normalization");
    if (!block.match(/\$adminId\s*=\s*\(int\)\$adminId/)) throw new Error("Missing (int) cast");
}

function verifyTransactionBeforeDiscovery(block) {
    const beginTxIdx = block.indexOf("$this->db->beginTransaction()");
    const discIdx = block.indexOf("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
    if (discIdx === -1) throw new Error("Missing discovery query");
    if (beginTxIdx === -1) throw new Error("Missing beginTransaction");
    
    if (discIdx < beginTxIdx) {
        throw new Error("Discovery query must happen AFTER beginTransaction to satisfy transaction-before-discovery");
    }
    const discSnippet = block.substring(discIdx, block.indexOf(";", discIdx));
    if (/FOR\s+UPDATE/i.test(discSnippet)) throw new Error("Discovery query must be non-locking");
}

function verifyLockOrder(block) {
    const memLock = block.indexOf("FROM members WHERE id = ? FOR UPDATE");
    const trnLock = block.indexOf("FROM trainers WHERE id = ? FOR UPDATE");
    const appLock = block.indexOf("FROM appointments WHERE id = ? FOR UPDATE");
    
    if (memLock === -1 || trnLock === -1 || appLock === -1) throw new Error("Missing participant locks");
    if (!(memLock < trnLock && trnLock < appLock)) throw new Error("Locks must be ordered: member -> trainer -> appointment");
}

function verifyEligibilityAbsence(block) {
    if (block.includes("deleted_at IS NULL") || block.includes("status = 'active'") || block.includes("is_active = 1")) {
        throw new Error("Historical eligibility checks (deleted_at, active) forbidden during terminalization");
    }
}

function verifyTrainerOwnership(block) {
    if (block.includes("getTrainerProfileId")) throw new Error("getTrainerProfileId dependency forbidden");
    if (block.match(/(?<!\(int\))\$trainer\['admin_id'\]\s*!==\s*\$adminId/)) throw new Error("Raw strict !== ownership comparison forbidden (must normalize to int)");
    if (!block.match(/\(int\)\$trainer\['admin_id'\]\s*!==\s*\$adminId/)) throw new Error("Missing normalized (int)$trainer['admin_id'] ownership check");
}

function verifyNowAfterLock(block) {
    const appLockIdx = block.indexOf("FROM appointments WHERE id = ? FOR UPDATE");
    const nowIdx = block.indexOf("new \\DateTime('now'");
    if (nowIdx === -1) throw new Error("Missing $now creation");
    if (nowIdx < appLockIdx) throw new Error("$now creation must happen AFTER appointment lock");
    if (block.includes("date_default_timezone_set")) throw new Error("date_default_timezone_set forbidden");
    if (block.match(/\$now\s*>=\s*\$startsAtDt/)) throw new Error("starts_at restriction forbidden");
}

function verifyCompletedUpdate(block) {
    const updMatch = block.match(/UPDATE\s+appointments\s+SET\s+status\s*=\s*'completed'([^;]+)/is);
    if (!updMatch) throw new Error("Missing completed UPDATE branch");
    const updCode = updMatch[1];
    
    if (!updCode.includes("completed_by = ?")) throw new Error("Missing completed_by");
    if (!updCode.includes("completed_at = ?")) throw new Error("Missing completed_at");
    if (!updCode.includes("updated_by = ?")) throw new Error("Missing updated_by");
    
    const forbidden = ["no_show_by", "cancelled_by", "cancellation_reason", "starts_at", "ends_at", "member_id", "trainer_id"];
    for (const f of forbidden) {
        if (updCode.includes(f)) throw new Error(`completed UPDATE must not mutate ${f}`);
    }
}

function verifyNoShowUpdate(block) {
    const updMatch = block.match(/UPDATE\s+appointments\s+SET\s+status\s*=\s*'no_show'([^;]+)/is);
    if (!updMatch) throw new Error("Missing no_show UPDATE branch");
    const updCode = updMatch[1];
    
    if (!updCode.includes("no_show_by = ?")) throw new Error("Missing no_show_by");
    if (!updCode.includes("no_show_at = ?")) throw new Error("Missing no_show_at");
    if (!updCode.includes("updated_by = ?")) throw new Error("Missing updated_by");
    
    const forbidden = ["completed_by", "cancelled_by", "cancellation_reason", "starts_at", "ends_at", "member_id", "trainer_id"];
    for (const f of forbidden) {
        if (updCode.includes(f)) throw new Error(`no_show UPDATE must not mutate ${f}`);
    }
}

function verifyNoSideEffects(block) {
    if (block.includes("INSERT INTO member_visits")) throw new Error("member_visits INSERT forbidden");
    if (block.includes("INSERT INTO appointment_reschedules")) throw new Error("appointment_reschedules INSERT forbidden");
    if (block.match(/DELETE\s+FROM\s+appointments/i)) throw new Error("DELETE FROM appointments forbidden");
}

function verifyResponsePrivacy(block) {
    const responseJsonIdx = block.indexOf("Response::json");
    if (responseJsonIdx === -1) throw new Error("Missing Response::json");
    const responseBlock = extractBalancedCall(block.substring(responseJsonIdx), "Response::json");
    
    const forbidden = ["completed_by", "completed_at", "no_show_by", "no_show_at", "cancelled_by", "cancelled_at", "updated_by"];
    for (const f of forbidden) {
        if (responseBlock.includes(`'${f}'`)) throw new Error(`Response leaks ${f}`);
    }
}

function verifyAudit(block, action) {
    const regex = new RegExp(`\\\\Core\\\\AuditLogger::log\\s*\\(\\s*'${action}'`);
    const match = block.match(regex);
    if (!match) throw new Error(`Missing audit action: ${action}`);
    
    const startIdx = block.indexOf(match[0]);
    const callStr = extractBalancedCall(block.substring(startIdx), "AuditLogger::log");
    
    const args = splitTopLevelArgs(callStr.substring(1, callStr.length - 1));
    if (args.length !== 5) throw new Error(`Audit must have 5 arguments, found ${args.length}`);
    
    if (!args[1].includes("$adminId")) throw new Error("Arg 2 must be actor adminId");
    if (!args[2].includes("'appointment'")) throw new Error("Arg 3 must be entity type");
    if (!args[3].includes("$id")) throw new Error("Arg 4 must be entity id");
}

// ---------------------------------------------------------
// Negative Self-Tests
// ---------------------------------------------------------
console.log("--- Starting Negative Self-Tests ---");

let caught;
function assertThrows(fn) {
    caught = false;
    try { fn(); } catch (e) { caught = true; }
    if (!caught) throw new Error("Expected failure but passed");
}

// 1. Admin RBAC PASS; +editor FAIL
checkInvariant("Self-Test 1: Admin exact RBAC PASS; +editor FAIL", () => {
    verifyRbac("AuthMiddleware::hasRole(['super_admin', 'admin'])", ['super_admin', 'admin']);
    assertThrows(() => verifyRbac("AuthMiddleware::hasRole(['super_admin', 'admin', 'editor'])", ['super_admin', 'admin']));
});

// 2. Trainer exact RBAC PASS; +admin FAIL
checkInvariant("Self-Test 2: Trainer exact RBAC PASS; +admin FAIL", () => {
    verifyRbac("AuthMiddleware::hasRole(['trainer'])", ['trainer']);
    assertThrows(() => verifyRbac("AuthMiddleware::hasRole(['trainer', 'admin'])", ['trainer']));
});

// 3, 4, 5 route regexes covered in main suite.

// 6, 7, 8: Exact {} body
checkInvariant("Self-Test: JSON Payload parser", () => {
    const good = "!empty($_GET) json_decode($rawBody) is_object count($data) > 0 json_decode($rawBody, true)";
    verifyExactJsonContract(good);
    assertThrows(() => verifyExactJsonContract("json_decode($rawBody, true) is_object count($data) > 0"));
});

// 9, 10: Actor coercion
checkInvariant("Self-Test: Actor coercion", () => {
    const good = "if (!is_int($adminId)) { if (is_string($adminId) && preg_match('/^[1-9]\\d*$/', $adminId)) { $adminId = (int)$adminId;";
    verifyActorNormalization(good);
    assertThrows(() => verifyActorNormalization("preg_match('/^[1-9]\\d*$/', (string)$adminId)"));
});

// 11. Discovery before transaction FAIL
checkInvariant("Self-Test: Transaction ordering", () => {
    assertThrows(() => verifyTransactionBeforeDiscovery("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ? $this->db->beginTransaction()"));
});

// 12. Appointment-first lock FAIL
checkInvariant("Self-Test: Lock order", () => {
    assertThrows(() => verifyLockOrder("FROM appointments WHERE id = ? FOR UPDATE FROM members WHERE id = ? FOR UPDATE FROM trainers WHERE id = ? FOR UPDATE"));
});

// 13. Trainer-before-member FAIL
checkInvariant("Self-Test: Trainer before member FAIL", () => {
    assertThrows(() => verifyLockOrder("FROM trainers WHERE id = ? FOR UPDATE FROM members WHERE id = ? FOR UPDATE FROM appointments WHERE id = ? FOR UPDATE"));
});

// 14. Injected member active FAIL
checkInvariant("Self-Test: Eligibility absence", () => {
    verifyEligibilityAbsence("");
    assertThrows(() => verifyEligibilityAbsence("status = 'active'"));
});

// 16, 17. Ownership normalization
checkInvariant("Self-Test: Trainer ownership normalization", () => {
    verifyTrainerOwnership("if ((int)$trainer['admin_id'] !== $adminId)");
    assertThrows(() => verifyTrainerOwnership("if ($trainer['admin_id'] !== $adminId)"));
});

// 18. Now before lock FAIL
checkInvariant("Self-Test: Lock-after-now", () => {
    assertThrows(() => verifyNowAfterLock("new \\DateTime('now' FROM appointments WHERE id = ? FOR UPDATE"));
});

// 19. Starts_at guard FAIL
checkInvariant("Self-Test: starts_at terminalization guard", () => {
    assertThrows(() => verifyNowAfterLock("FROM appointments WHERE id = ? FOR UPDATE new \\DateTime('now' if ($now >= $startsAtDt)"));
});

// 20, 21. UPDATE pollution
checkInvariant("Self-Test: UPDATE pollution", () => {
    const goodCompleted = "UPDATE appointments SET status = 'completed', completed_by = ?, completed_at = ?, updated_by = ?";
    verifyCompletedUpdate(goodCompleted);
    assertThrows(() => verifyCompletedUpdate("UPDATE appointments SET status = 'completed', no_show_by = ?"));
    
    const goodNoShow = "UPDATE appointments SET status = 'no_show', no_show_by = ?, no_show_at = ?, updated_by = ?";
    verifyNoShowUpdate(goodNoShow);
    assertThrows(() => verifyNoShowUpdate("UPDATE appointments SET status = 'no_show', completed_by = ?"));
});

// 22. member_visits INSERT FAIL
checkInvariant("Self-Test: member_visits INSERT FAIL", () => {
    assertThrows(() => verifyNoSideEffects("INSERT INTO member_visits"));
});

// 23. Terminal actor field in response FAIL
checkInvariant("Self-Test: Privacy", () => {
    const good = "Response::json(['status' => 'completed'])";
    verifyResponsePrivacy(good);
    assertThrows(() => verifyResponsePrivacy("Response::json(['completed_by' => 1])"));
});

// 24. Audit IDs swapped FAIL
checkInvariant("Self-Test: Audit arguments", () => {
    const good = "\\Core\\AuditLogger::log('appointment.completed', $adminId, 'appointment', $id, [])";
    verifyAudit(good, 'appointment.completed');
    assertThrows(() => verifyAudit("\\Core\\AuditLogger::log('appointment.completed', $id, 'appointment', $adminId, [])", 'appointment.completed'));
});


// ---------------------------------------------------------
// Production Source Loading
// ---------------------------------------------------------
console.log("--- Loading Production Sources (Fail-Closed) ---");

const indexSrc = fs.readFileSync(path.join(rootDir, 'api/index.php'), 'utf8');
const controllerSrc = fs.readFileSync(path.join(rootDir, 'api/controllers/AppointmentController.php'), 'utf8');

// 1. Exact four routes
const completeAdminMatch = indexSrc.match(/if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/complete\$#'[^}]+\}\s*\}/s);
if (!completeAdminMatch) throw new Error("FAIL: completeAdmin route missing or malformed");
const noShowAdminMatch = indexSrc.match(/if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/no-show\$#'[^}]+\}\s*\}/s);
if (!noShowAdminMatch) throw new Error("FAIL: noShowAdmin route missing or malformed");
const completeTrainerMatch = indexSrc.match(/if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/trainer\/appointments\/\(\[1-9\]\\d\*\)\/complete\$#'[^}]+\}\s*\}/s);
if (!completeTrainerMatch) throw new Error("FAIL: completeTrainer route missing or malformed");
const noShowTrainerMatch = indexSrc.match(/if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/trainer\/appointments\/\(\[1-9\]\\d\*\)\/no-show\$#'[^}]+\}\s*\}/s);
if (!noShowTrainerMatch) throw new Error("FAIL: noShowTrainer route missing or malformed");

// 2. Global CSRF bypass check
const methodNotGuarded = /if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/(admin|trainer)\/appointments\/\(\[1-9\]\\d\*\)\/(complete|no-show)\$#'/g;
while (true) {
    const match = methodNotGuarded.exec(indexSrc);
    if (!match) break;
    const block = extractBalanced(indexSrc, indexSrc.indexOf("{", match.index));
    if (block && block.includes("CsrfMiddleware")) throw new Error("CSRF bypass inside terminalization routes is forbidden");
}

// Extract handleTerminalize
const handleMatch = controllerSrc.match(/private\s+function\s+handleTerminalize\s*\(/);
if (!handleMatch) throw new Error("FAIL: handleTerminalize method missing");
const handleStart = controllerSrc.indexOf("{", handleMatch.index);
const handleTerminalizeBlock = extractBalanced(controllerSrc, handleStart);
if (!handleTerminalizeBlock) throw new Error("FAIL: Could not extract handleTerminalize block");


console.log("--- Running Production Invariant Checks ---");

checkInvariant("Exact Route Matrix: Admin complete", () => {
    verifyRbac(completeAdminMatch[0], ['super_admin', 'admin']);
    if (!completeAdminMatch[0].includes("completeAdminAppointment((int)$matches[1])")) throw new Error("Wrong controller method");
});

checkInvariant("Exact Route Matrix: Admin no-show", () => {
    verifyRbac(noShowAdminMatch[0], ['super_admin', 'admin']);
    if (!noShowAdminMatch[0].includes("noShowAdminAppointment((int)$matches[1])")) throw new Error("Wrong controller method");
});

checkInvariant("Exact Route Matrix: Trainer complete", () => {
    verifyRbac(completeTrainerMatch[0], ['trainer']);
    if (!completeTrainerMatch[0].includes("completeTrainerAppointment((int)$matches[1])")) throw new Error("Wrong controller method");
});

checkInvariant("Exact Route Matrix: Trainer no-show", () => {
    verifyRbac(noShowTrainerMatch[0], ['trainer']);
    if (!noShowTrainerMatch[0].includes("noShowTrainerAppointment((int)$matches[1])")) throw new Error("Wrong controller method");
});

checkInvariant("Reception Terminalization Absence", () => {
    if (indexSrc.includes("/api/reception/appointments/") && indexSrc.includes("/complete")) {
        const receptionComplete = indexSrc.match(/if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/reception\/appointments\/\(\[1-9\]\\d\*\)\/complete\$#'/);
        if (receptionComplete) throw new Error("Reception complete route is forbidden");
    }
});

checkInvariant("Internal Target Whitelist", () => {
    if (!handleTerminalizeBlock.includes("$targetStatus !== 'completed' && $targetStatus !== 'no_show'")) {
        throw new Error("Missing exact completed/no_show whitelist");
    }
});

checkInvariant("Exact {} JSON Contract", () => {
    verifyExactJsonContract(handleTerminalizeBlock);
});

checkInvariant("Actor Normalization", () => {
    verifyActorNormalization(handleTerminalizeBlock);
});

checkInvariant("Transaction-before-discovery", () => {
    verifyTransactionBeforeDiscovery(handleTerminalizeBlock);
});

checkInvariant("Member->Trainer->Appointment Lock Order", () => {
    verifyLockOrder(handleTerminalizeBlock);
});

checkInvariant("Historical Eligibility Absence", () => {
    verifyEligibilityAbsence(handleTerminalizeBlock);
});

checkInvariant("Trainer Ownership Normalization", () => {
    verifyTrainerOwnership(handleTerminalizeBlock);
});

checkInvariant("Locked Appointment Revalidation", () => {
    if (!handleTerminalizeBlock.includes("APPOINTMENT_CHANGED")) throw new Error("Missing APPOINTMENT_CHANGED");
    if (!handleTerminalizeBlock.includes("$lockedApp['status'] !== 'scheduled'")) throw new Error("Missing scheduled-only guard");
});

checkInvariant("Lock-after-now and End boundary", () => {
    verifyNowAfterLock(handleTerminalizeBlock);
});

checkInvariant("Exact COMPLETED UPDATE", () => {
    verifyCompletedUpdate(handleTerminalizeBlock);
});

checkInvariant("Exact NO_SHOW UPDATE", () => {
    verifyNoShowUpdate(handleTerminalizeBlock);
});

checkInvariant("Side-effects Absence", () => {
    verifyNoSideEffects(handleTerminalizeBlock);
    if (!handleTerminalizeBlock.includes("$updStmt->rowCount() === 0")) throw new Error("Missing rowCount check");
});

checkInvariant("Persisted Response Privacy", () => {
    verifyResponsePrivacy(handleTerminalizeBlock);
});

checkInvariant("Commit-Before-Audit", () => {
    const commitIdx = handleTerminalizeBlock.indexOf("$this->db->commit()");
    const auditIdx = handleTerminalizeBlock.indexOf("AuditLogger::log");
    if (commitIdx === -1 || auditIdx === -1 || commitIdx > auditIdx) {
        throw new Error("db->commit() must strictly precede AuditLogger::log");
    }
    const auditCatchIdx = handleTerminalizeBlock.indexOf("catch", auditIdx);
    const auditCatchBlock = extractBalanced(handleTerminalizeBlock, auditCatchIdx);
    if (auditCatchBlock.includes("rollBack") || auditCatchBlock.includes("Response::error")) {
        throw new Error("Audit catch must not rollback or return Response::error");
    }
});

checkInvariant("Audit Argument Order", () => {
    verifyAudit(handleTerminalizeBlock, 'appointment.completed');
    verifyAudit(handleTerminalizeBlock, 'appointment.no_show');
});

checkInvariant("Outer Exception Safety", () => {
    const lastCatchIdx = handleTerminalizeBlock.lastIndexOf("catch");
    const outerCatchBlock = extractBalanced(handleTerminalizeBlock, lastCatchIdx);
    if (!outerCatchBlock.includes("$this->db->inTransaction()") || !outerCatchBlock.includes("$this->db->rollBack()")) {
        throw new Error("Outer catch must verify inTransaction and rollBack");
    }
});

checkInvariant("Temporary Artifact Absence", () => {
    const forbiddenArtifacts = ['patch.cjs', 'patch.js', 'patch_index.php', 'AppointmentController.php.tmp', 'AppointmentController.php.fixed'];
    for (const art of forbiddenArtifacts) {
        if (fs.existsSync(path.resolve(rootDir, art))) throw new Error(`Forbidden artifact ${art}`);
    }
});

console.log("---------------------------------------------------------");
console.log(`Total Invariants: ${totalInvariants}`);
console.log(`Passed: ${passedInvariants}`);
console.log(`Failed: ${failedInvariants}`);
console.log("---------------------------------------------------------");
if (failedInvariants > 0 || passedInvariants !== totalInvariants) {
    console.error(`❌ Appointment Terminalization Final Verifier FAILED.`);
    process.exit(1);
} else {
    console.log(`✅ Appointment Terminalization Final Verifier PASSED.`);
    process.exit(0);
}
