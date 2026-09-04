import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// --- Helper Functions ---
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

// --- Predicates ---

function verifyRoute(routeStr, expectedMethod, expectedRoles, expectedIdExtraction, expectedAction) {
    // method check
    if (!routeStr.includes(`$method === '${expectedMethod}'`)) throw new Error(`Missing ${expectedMethod} method check`);
    
    // role check
    const hasRoleMatch = routeStr.match(/AuthMiddleware::hasRole\(\[([^\]]+)\]\)/);
    if (!hasRoleMatch) throw new Error("Missing AuthMiddleware::hasRole");
    const roles = hasRoleMatch[1].split(',').map(r => r.replace(/['"\s]/g, ''));
    if (roles.length !== expectedRoles.length || !roles.every(r => expectedRoles.includes(r))) {
        throw new Error(`Expected roles ${expectedRoles.join(',')}, found ${roles.join(',')}`);
    }
    
    // AuthMiddleware handle
    if (!routeStr.includes("AuthMiddleware::handle()")) throw new Error("Missing AuthMiddleware::handle()");
    
    // controller action and ID extraction
    if (!routeStr.includes(`${expectedAction}(${expectedIdExtraction})`)) {
        throw new Error(`Missing ${expectedAction} call with ${expectedIdExtraction}`);
    }
}

function verifyReceptionTerminalizationAbsent(controllerSource, indexSource) {
    if (indexSource.includes('/api/reception/appointments/') && (indexSource.includes('/complete') || indexSource.includes('/no-show'))) {
         const completeRe = /preg_match\(\s*'#\^\/api\/reception\/appointments\/\(\[1-9\]\\d\*\)\/complete\$#'/;
         const noshowRe = /preg_match\(\s*'#\^\/api\/reception\/appointments\/\(\[1-9\]\\d\*\)\/no-show\$#'/;
         if (completeRe.test(indexSource)) throw new Error("Reception complete route is forbidden");
         if (noshowRe.test(indexSource)) throw new Error("Reception no-show route is forbidden");
    }
    
    if (controllerSource.includes("completeReceptionAppointment")) throw new Error("completeReceptionAppointment is forbidden");
    if (controllerSource.includes("noShowReceptionAppointment")) throw new Error("noShowReceptionAppointment is forbidden");
}

function verifyGlobalCsrfPositive(indexSource) {
    const globalCsrfMatch = indexSource.match(/if\s*\(\s*in_array\s*\(\s*\$method,\s*\[(.*?)\]\s*\)\s*\)/s);
    if (!globalCsrfMatch) throw new Error("Missing global mutation method guard");
    
    const methodsStr = globalCsrfMatch[1];
    const extractedMethods = [...methodsStr.matchAll(/'([A-Z]+)'/g)].map(m => m[1]);
    const expectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    
    if (extractedMethods.length !== expectedMethods.length) throw new Error("Global CSRF method count mismatch");
    for (const em of extractedMethods) {
        if (!expectedMethods.includes(em)) throw new Error(`Extra method ${em} in global CSRF guard`);
    }
    for (const em of expectedMethods) {
        if (!extractedMethods.includes(em)) throw new Error(`Missing method ${em} in global CSRF guard`);
    }
    
    const guardBlock = extractBalanced(indexSource, globalCsrfMatch.index);
    if (!guardBlock) throw new Error("Failed to extract global CSRF guard block");
    if (!guardBlock.includes("CsrfMiddleware::handle()")) {
        throw new Error("CsrfMiddleware::handle() missing in global guard");
    }
    
    const completeAdminIdx = indexSource.search(/if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/complete\$#'/);
    const noShowAdminIdx = indexSource.search(/if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/no-show\$#'/);
    const completeTrainerIdx = indexSource.search(/if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/trainer\/appointments\/\(\[1-9\]\\d\*\)\/complete\$#'/);
    const noShowTrainerIdx = indexSource.search(/if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/trainer\/appointments\/\(\[1-9\]\\d\*\)\/no-show\$#'/);
    
    if (completeAdminIdx === -1 || noShowAdminIdx === -1 || completeTrainerIdx === -1 || noShowTrainerIdx === -1) {
        throw new Error("Missing terminalization route dispatch in indexSource");
    }
    const earliestTerminalizationRouteIndex = Math.min(completeAdminIdx, noShowAdminIdx, completeTrainerIdx, noShowTrainerIdx);
    if (globalCsrfMatch.index > earliestTerminalizationRouteIndex) {
        throw new Error("Global CSRF guard must appear before all terminalization routes dispatch");
    }
}

function verifyExactJsonContract(block) {
    const beginTxIdx = block.indexOf("$this->db->beginTransaction()");
    
    const getCheckIdx = block.indexOf("!empty($_GET)");
    if (getCheckIdx === -1) throw new Error("Missing non-empty $_GET rejection");
    if (getCheckIdx > beginTxIdx) throw new Error("Validation must be before beginTransaction");
    
    const getCheckBlock = extractBalanced(block, getCheckIdx);
    if (!getCheckBlock || !getCheckBlock.includes("Response::error") || (!getCheckBlock.includes("422") && !getCheckBlock.includes("VALIDATION_ERROR"))) {
        throw new Error("non-empty $_GET must reject with 422 VALIDATION_ERROR");
    }

    const emptyBodyIdx = block.indexOf("empty(trim($rawBody))");
    if (emptyBodyIdx === -1) throw new Error("Missing empty(trim($rawBody)) empty/whitespace body guard");
    
    const emptyBodyBlock = extractBalanced(block, emptyBodyIdx);
    if (!emptyBodyBlock || !emptyBodyBlock.includes("400") || !emptyBodyBlock.includes("INVALID_JSON")) {
        throw new Error("Empty body must reject with 400 INVALID_JSON");
    }
    if (emptyBodyIdx > beginTxIdx) throw new Error("Validation must be before beginTransaction");

    const decodeObjIdx = block.indexOf("json_decode($rawBody)");
    if (decodeObjIdx === -1) throw new Error("Missing json_decode($rawBody)");

    const lastErrIdx = block.indexOf("json_last_error() !== JSON_ERROR_NONE");
    if (lastErrIdx === -1) throw new Error("Missing json_last_error() !== JSON_ERROR_NONE check");
    const lastErrBlock = extractBalanced(block, block.lastIndexOf("if", lastErrIdx));
    if (!lastErrBlock || !lastErrBlock.includes("400") || !lastErrBlock.includes("INVALID_JSON")) {
        throw new Error("json_last_error failure must reject with 400 INVALID_JSON");
    }
    if (lastErrIdx > beginTxIdx) throw new Error("Validation must be before beginTransaction");

    const isObjectIdx = block.indexOf("is_object");
    if (isObjectIdx === -1) throw new Error("Missing is_object validation");
    const isObjectBlock = extractBalanced(block, block.lastIndexOf("if", isObjectIdx));
    if (!isObjectBlock || !isObjectBlock.includes("422") || !isObjectBlock.includes("VALIDATION_ERROR")) {
        throw new Error("is_object failure must reject with 422 VALIDATION_ERROR");
    }
    if (isObjectIdx > beginTxIdx) throw new Error("Validation must be before beginTransaction");

    const decodeAssocIdx = block.indexOf("json_decode($rawBody, true)");
    if (decodeAssocIdx === -1) throw new Error("Missing json_decode($rawBody, true)");
    
    const countCheckIdx = block.indexOf("count($data) > 0");
    if (countCheckIdx === -1) throw new Error("Missing count($data) > 0 empty object validation");
    const countCheckBlock = extractBalanced(block, block.lastIndexOf("if", countCheckIdx));
    if (!countCheckBlock || !countCheckBlock.includes("422") || !countCheckBlock.includes("VALIDATION_ERROR")) {
        throw new Error("count($data) > 0 must reject with 422 VALIDATION_ERROR");
    }
    if (countCheckIdx > beginTxIdx) throw new Error("Validation must be before beginTransaction");
}

function verifyActorNormalization(block) {
    if (block.includes("preg_match('/^[1-9]\\d*$/', (string)$adminId)")) {
        throw new Error("Unsafe arbitrary (string) coercion before regex forbidden");
    }
    if (!block.match(/is_int\(\$adminId\)/)) throw new Error("Missing is_int check");
    if (!block.match(/preg_match\(['"]\/\^\[1-9\]\\d\*\$\/['"],\s*\$adminId\)/)) throw new Error("Missing canonical string regex normalization");
    if (!block.match(/\$adminId\s*=\s*\(int\)\$adminId/)) throw new Error("Missing (int) cast");
    
    const unauthorizedCheckIdx = block.indexOf("UNAUTHORIZED");
    if (unauthorizedCheckIdx === -1 || !block.includes("401")) throw new Error("Missing UNAUTHORIZED 401 rejection");
}

function verifyOrdering(block) {
    const beginTxIdx = block.indexOf("$this->db->beginTransaction()");
    const discIdx = block.indexOf("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
    if (discIdx === -1) throw new Error("Missing non-locking discovery query");
    if (beginTxIdx === -1) throw new Error("Missing beginTransaction");
    if (discIdx < beginTxIdx) throw new Error("Discovery before beginTransaction");
    
    const memLockIdx = block.indexOf("FROM members WHERE id = ? FOR UPDATE");
    const trnLockIdx = block.indexOf("FROM trainers WHERE id = ? FOR UPDATE");
    const appLockIdx = block.indexOf("FROM appointments WHERE id = ? FOR UPDATE");
    
    if (memLockIdx === -1 || trnLockIdx === -1 || appLockIdx === -1) throw new Error("Missing participant locks");
    if (!(discIdx < memLockIdx && memLockIdx < trnLockIdx && trnLockIdx < appLockIdx)) {
        throw new Error("Lock order must be discovery -> member -> trainer -> appointment");
    }
    
    const scheduledGuardIdx = block.indexOf("'scheduled'");
    if (scheduledGuardIdx === -1 || scheduledGuardIdx < appLockIdx) throw new Error("Scheduled-only guard must be after appointment lock");
    
    const nowIdx = block.indexOf("new \\DateTime('now'");
    if (nowIdx === -1 || nowIdx < scheduledGuardIdx) throw new Error("$now creation must be after scheduled-only guard (and appointment lock)");
    
    const updateTargetIdx = block.indexOf("UPDATE appointments");
    const rowCountIdx = block.indexOf("rowCount() === 0");
    const persistedSelectIdx = block.indexOf("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status, completed_by, completed_at, no_show_by, no_show_at FROM appointments WHERE id = ?");
    const commitIdx = block.indexOf("$this->db->commit()");
    const auditIdx = block.indexOf("AuditLogger::log");
    
    if (updateTargetIdx === -1) throw new Error("Missing UPDATE appointments");
    if (rowCountIdx === -1) throw new Error("Missing rowCount() check");
    if (persistedSelectIdx === -1) throw new Error("Missing persisted row fetch");
    if (commitIdx === -1) throw new Error("Missing commit");
    if (auditIdx === -1) throw new Error("Missing audit log");
    
    if (!(updateTargetIdx < rowCountIdx && rowCountIdx < persistedSelectIdx && persistedSelectIdx < commitIdx && commitIdx < auditIdx)) {
        throw new Error("Order must be: UPDATE -> rowCount guard -> persisted SELECT -> commit -> audit -> response");
    }
}

function verifyHistoricalEligibilityAbsence(block) {
    const forbidden = [
        "deleted_at IS NULL", 
        "status = 'active'", 
        "is_active = 1",
        "deleted_at",
        "membership_start_date",
        "membership_end_date",
        "$member['status']",
        '$member["status"]',
        "$trainer['is_active']",
        '$trainer["is_active"]',
        "getTrainerProfileId"
    ];
    for (const f of forbidden) {
        if (block.includes(f)) throw new Error(`Historical eligibility check '${f}' is forbidden`);
    }
}

function verifyTrainerOwnership(block) {
    if (block.includes("getTrainerProfileId")) throw new Error("getTrainerProfileId dependency forbidden");
    if (block.match(/(?<!\(int\))\$trainer\['admin_id'\]\s*!==\s*\$adminId/)) throw new Error("Raw strict !== ownership comparison forbidden (must normalize to int)");
    if (!block.match(/\(int\)\$trainer\['admin_id'\]\s*!==\s*\$adminId/)) throw new Error("Missing normalized (int)$trainer['admin_id'] ownership check");
    
    const trainerLockIdx = block.indexOf("FROM trainers WHERE id = ? FOR UPDATE");
    const ownershipCheckIdx = block.indexOf("(int)$trainer['admin_id'] !== $adminId");
    if (ownershipCheckIdx < trainerLockIdx) throw new Error("Trainer ownership block must be after participant trainer lock");
}

function verifyTimeBoundary(block) {
    const scheduledGuardIdx = block.indexOf("'scheduled'");
    if (scheduledGuardIdx === -1) throw new Error("Missing scheduled status guard");
    const scheduledGuardBlock = extractBalanced(block, block.lastIndexOf("if", scheduledGuardIdx));
    if (!scheduledGuardBlock || !scheduledGuardBlock.includes("409")) throw new Error("scheduled guard must reject with 409");
    
    const nowIdx = block.indexOf("new \\DateTime('now'");
    if (nowIdx === -1 || nowIdx < scheduledGuardIdx) throw new Error("Missing now creation after scheduled guard");
    
    if (!block.includes("$terminalizedAt = $now->format('Y-m-d H:i:s')")) {
        throw new Error("Missing $terminalizedAt = $now->format('Y-m-d H:i:s')");
    }
    
    if (!block.includes("APPOINTMENT_NOT_TERMINALIZABLE") || !block.includes("409")) {
        throw new Error("Missing APPOINTMENT_NOT_TERMINALIZABLE 409 rejection");
    }
    if (!block.includes("new \\DateTime('now', new \\DateTimeZone('Europe/Istanbul'))")) {
        throw new Error("Missing explicit DateTime with Europe/Istanbul");
    }
    if (!block.match(/\$now\s*<\s*\$endsAtDt/)) {
        throw new Error("Missing $now < $endsAtDt boundary guard");
    }
    
    const forbidden = ["date_default_timezone_set", "NOW()"];
    for (const f of forbidden) {
        if (block.includes(f)) throw new Error(`Forbidden time boundary construct: ${f}`);
    }
    if (block.match(/\$now\s*>=\s*\$startsAtDt/)) throw new Error("starts_at based rejection is forbidden");
    if (block.includes("starts_at") && block.match(/\$now\s*<\s*\$startsAtDt/)) throw new Error("starts_at based rejection is forbidden");
}

function verifyCompletedUpdate(block) {
    const updMatch = block.match(/UPDATE\s+appointments\s+SET\s+(.+?)\s+WHERE/is);
    if (!updMatch) throw new Error("Missing completed UPDATE branch");
    const updCode = updMatch[1];
    
    if (!updCode.includes("status = 'completed'")) throw new Error("Missing status = 'completed'");
    if (!updCode.includes("completed_by = ?")) throw new Error("Missing completed_by");
    if (!updCode.includes("completed_at = ?")) throw new Error("Missing completed_at");
    if (!updCode.includes("updated_by = ?")) throw new Error("Missing updated_by");
    
    // Exact column set parser
    const parts = updCode.split(',');
    let columns = [];
    for (let part of parts) {
        part = part.trim();
        if (part === '') continue;
        let colName = part.split('=')[0].trim();
        columns.push(colName);
    }
    
    const expected = ["status", "completed_by", "completed_at", "updated_by"];
    for (const c of columns) {
        if (!expected.includes(c)) throw new Error(`completed UPDATE must not mutate extra column ${c}`);
    }
    if (columns.length !== expected.length) throw new Error(`completed UPDATE column count mismatch`);
}

function verifyNoShowUpdate(block) {
    const matches = [...block.matchAll(/UPDATE\s+appointments\s+SET\s+(.+?)\s+WHERE/igs)];
    let updCode = null;
    for (const m of matches) {
        if (m[1].includes("'no_show'")) {
            updCode = m[1];
            break;
        }
    }
    if (!updCode) throw new Error("Missing no_show UPDATE branch");
    
    if (!updCode.includes("status = 'no_show'")) throw new Error("Missing status = 'no_show'");
    if (!updCode.includes("no_show_by = ?")) throw new Error("Missing no_show_by");
    if (!updCode.includes("no_show_at = ?")) throw new Error("Missing no_show_at");
    if (!updCode.includes("updated_by = ?")) throw new Error("Missing updated_by");

    const parts = updCode.split(',');
    let columns = [];
    for (let part of parts) {
        part = part.trim();
        if (part === '') continue;
        let colName = part.split('=')[0].trim();
        columns.push(colName);
    }
    
    const expected = ["status", "no_show_by", "no_show_at", "updated_by"];
    for (const c of columns) {
        if (!expected.includes(c)) throw new Error(`no_show UPDATE must not mutate extra column ${c}`);
    }
    if (columns.length !== expected.length) throw new Error(`no_show UPDATE column count mismatch`);
}

function verifyNoSideEffects(block) {
    if (block.includes("INSERT INTO member_visits")) throw new Error("member_visits INSERT forbidden");
    if (block.includes("visit_id")) throw new Error("visit_id forbidden");
    if (block.includes("INSERT INTO appointment_reschedules")) throw new Error("appointment_reschedules INSERT forbidden");
    if (block.match(/DELETE\s+FROM\s+appointments/i)) throw new Error("DELETE FROM appointments forbidden");
}

function verifyPersistedRowContract(block) {
    const fetchSnippet = block.match(/SELECT\s+id,\s*uuid,\s*member_id,\s*trainer_id,\s*starts_at,\s*ends_at,\s*status,\s*completed_by,\s*completed_at,\s*no_show_by,\s*no_show_at\s+FROM\s+appointments\s+WHERE\s+id\s*=\s*\?/is);
    if (!fetchSnippet) throw new Error("Persisted row SELECT statement missing or columns mismatch");
    
    const fetchStmtBlockIdx = block.indexOf(fetchSnippet[0]);
    if (fetchStmtBlockIdx === -1) throw new Error("Missing persisted row fetch");
    const afterFetch = block.substring(fetchStmtBlockIdx);
    if (!afterFetch.includes("INTERNAL_ERROR") || !afterFetch.includes("500") || !afterFetch.includes("rollBack()")) {
        throw new Error("Missing INTERNAL_ERROR 500 / rollback on missing persisted row");
    }
}

function verifyResponsePrivacy(block) {
    const responseJsonIdx = block.indexOf("Response::json");
    if (responseJsonIdx === -1) throw new Error("Missing Response::json");
    const responseBlock = extractBalancedCall(block.substring(responseJsonIdx), "Response::json");
    
    const requiredKeys = ["'id'", "'uuid'", "'member_id'", "'trainer_id'", "'starts_at'", "'ends_at'", "'status'"];
    for (const r of requiredKeys) {
        if (!responseBlock.includes(r)) throw new Error(`Response missing required key: ${r}`);
    }
    
    const lines = responseBlock.split('\n');
    for (const line of lines) {
        const matches = [...line.matchAll(/'([a-zA-Z_]+)'\s*=>/g)];
        for (const m of matches) {
            const key = `'${m[1]}'`;
            if (!requiredKeys.includes(key) && m[1] !== 'data' && m[1] !== 'appointment') {
                throw new Error(`Response contains extra key: ${key}`);
            }
        }
    }

    if (!responseBlock.includes("(int)$persisted['id']") || !responseBlock.includes("(int)$persisted['member_id']") || !responseBlock.includes("(int)$persisted['trainer_id']")) {
        throw new Error("Response IDs must be strictly (int) normalized from persisted row");
    }

    const forbidden = ["completed_by", "completed_at", "no_show_by", "no_show_at", "cancelled_by", "cancelled_at", "updated_by"];
    for (const f of forbidden) {
        if (responseBlock.includes(`'${f}'`)) throw new Error(`Response leaks ${f}`);
    }
}

function verifyAuditContract(block, action) {
    const regex = new RegExp(`\\\\Core\\\\AuditLogger::log\\s*\\(\\s*'${action}'`);
    const match = block.match(regex);
    if (!match) throw new Error(`Missing audit action: ${action}`);
    
    const startIdx = block.indexOf(match[0]);
    const callStr = extractBalancedCall(block.substring(startIdx), "AuditLogger::log");
    
    const args = splitTopLevelArgs(callStr.substring(1, callStr.length - 1));
    if (args.length !== 5) throw new Error(`Audit must have 5 arguments, found ${args.length}`);
    
    if (args[0] !== `'${action}'`) throw new Error("Arg 1 mismatch");
    if (!args[1].includes("$adminId")) throw new Error("Arg 2 must be actor adminId (No ID swap)");
    if (!args[2].includes("'appointment'")) throw new Error("Arg 3 must be entity type");
    if (!args[3].includes("$id")) throw new Error("Arg 4 must be entity id (No ID swap)");
    
    const metadataStr = args[4];
    if (!metadataStr.includes("'previous_status' => $lockedApp['status']")) throw new Error("metadata missing previous_status from $lockedApp");
    if (!metadataStr.includes("'new_status' => $persisted['status']")) throw new Error("metadata missing new_status from $persisted");
    
    const matches = [...metadataStr.matchAll(/'([a-zA-Z_]+)'\s*=>/g)];
    const keys = matches.map(m => m[1]);
    
    if (action === 'appointment.completed') {
        if (!metadataStr.includes("'completed_at' => $persisted['completed_at']")) throw new Error("metadata missing completed_at from $persisted");
        
        const expected = ["previous_status", "new_status", "completed_at"];
        for (const key of keys) {
            if (!expected.includes(key)) throw new Error(`extra metadata ${key} in completed audit`);
        }
        if (keys.length !== expected.length) throw new Error("completed audit metadata count mismatch");
    } else if (action === 'appointment.no_show') {
        if (!metadataStr.includes("'no_show_at' => $persisted['no_show_at']")) throw new Error("metadata missing no_show_at from $persisted");
        
        const expected = ["previous_status", "new_status", "no_show_at"];
        for (const key of keys) {
            if (!expected.includes(key)) throw new Error(`extra metadata ${key} in no_show audit`);
        }
        if (keys.length !== expected.length) throw new Error("no_show audit metadata count mismatch");
    }
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

checkInvariant("Self-Test 1: Global CSRF", () => {
    const good = `
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) { CsrfMiddleware::handle(); }
        if (preg_match('#^/api/admin/appointments/([1-9]\\d*)/complete$#')) {}
        if (preg_match('#^/api/admin/appointments/([1-9]\\d*)/no-show$#')) {}
        if (preg_match('#^/api/trainer/appointments/([1-9]\\d*)/complete$#')) {}
        if (preg_match('#^/api/trainer/appointments/([1-9]\\d*)/no-show$#')) {}
    `;
    verifyGlobalCsrfPositive(good);
    assertThrows(() => verifyGlobalCsrfPositive(good.replace("'POST'", "'POST', 'GET'")));
    assertThrows(() => verifyGlobalCsrfPositive(good.replace("'PATCH', ", "")));
    
    const badOrderAdmin = `
        if (preg_match('#^/api/admin/appointments/([1-9]\\d*)/complete$#')) {}
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) { CsrfMiddleware::handle(); }
        if (preg_match('#^/api/admin/appointments/([1-9]\\d*)/no-show$#')) {}
        if (preg_match('#^/api/trainer/appointments/([1-9]\\d*)/complete$#')) {}
        if (preg_match('#^/api/trainer/appointments/([1-9]\\d*)/no-show$#')) {}
    `;
    assertThrows(() => verifyGlobalCsrfPositive(badOrderAdmin));
    
    const badOrderTrainer = `
        if (preg_match('#^/api/trainer/appointments/([1-9]\\d*)/complete$#')) {}
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) { CsrfMiddleware::handle(); }
        if (preg_match('#^/api/admin/appointments/([1-9]\\d*)/complete$#')) {}
        if (preg_match('#^/api/admin/appointments/([1-9]\\d*)/no-show$#')) {}
        if (preg_match('#^/api/trainer/appointments/([1-9]\\d*)/no-show$#')) {}
    `;
    assertThrows(() => verifyGlobalCsrfPositive(badOrderTrainer));
});

checkInvariant("Self-Test 2: Reception Absence", () => {
    verifyReceptionTerminalizationAbsent("", "");
    assertThrows(() => verifyReceptionTerminalizationAbsent("", "if (preg_match('#^/api/reception/appointments/([1-9]\\d*)/complete$#'"));
    assertThrows(() => verifyReceptionTerminalizationAbsent("", "if (preg_match('#^/api/reception/appointments/([1-9]\\d*)/no-show$#'"));
    assertThrows(() => verifyReceptionTerminalizationAbsent("completeReceptionAppointment", ""));
    assertThrows(() => verifyReceptionTerminalizationAbsent("noShowReceptionAppointment", ""));
});

checkInvariant("Self-Test 3: Exact JSON Contract", () => {
    const good = `
        if (!empty($_GET)) { Response::error('','VALIDATION_ERROR', 422); }
        if (empty(trim($rawBody))) { Response::error('', 'INVALID_JSON', 400); }
        $dataObj = json_decode($rawBody);
        if (json_last_error() !== JSON_ERROR_NONE) { Response::error('', 'INVALID_JSON', 400); }
        if (!is_object($dataObj)) { Response::error('','VALIDATION_ERROR', 422); }
        $data = json_decode($rawBody, true);
        if (count($data) > 0) { Response::error('','VALIDATION_ERROR', 422); }
        $this->db->beginTransaction();
    `;
    verifyExactJsonContract(good);
    assertThrows(() => verifyExactJsonContract(good.replace("if (empty(trim($rawBody))) { Response::error('', 'INVALID_JSON', 400); }", "$stray = trim($rawBody);")));
    assertThrows(() => verifyExactJsonContract(good.replace("is_object", "is_array")));
    assertThrows(() => verifyExactJsonContract(good.replace("count($data) > 0", "")));
    assertThrows(() => verifyExactJsonContract("$this->db->beginTransaction();" + good.replace("$this->db->beginTransaction();", ""))); // tx order
});

checkInvariant("Self-Test 4: Transaction & Lock Ordering", () => {
    const good = `
        $this->db->beginTransaction();
        SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?
        FROM members WHERE id = ? FOR UPDATE
        FROM trainers WHERE id = ? FOR UPDATE
        FROM appointments WHERE id = ? FOR UPDATE
        'scheduled'
        new \\DateTime('now'
        UPDATE appointments
        rowCount() === 0
        SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status, completed_by, completed_at, no_show_by, no_show_at FROM appointments WHERE id = ?
        $this->db->commit();
        AuditLogger::log
    `;
    verifyOrdering(good);
    assertThrows(() => verifyOrdering(good.replace("$this->db->beginTransaction();", "") + "$this->db->beginTransaction();")); // disc before tx
    assertThrows(() => verifyOrdering(good.replace("FROM members WHERE id = ? FOR UPDATE", "XXXX").replace("FROM trainers WHERE id = ? FOR UPDATE", "FROM members WHERE id = ? FOR UPDATE").replace("XXXX", "FROM trainers WHERE id = ? FOR UPDATE"))); // trainer before member
    assertThrows(() => verifyOrdering("new \\DateTime('now'" + good.replace("new \\DateTime('now'", ""))); // now before guard
    assertThrows(() => verifyOrdering(good.replace("$this->db->commit();", "") + "$this->db->commit();")); // audit before commit
});

checkInvariant("Self-Test 5: Historical Eligibility", () => {
    verifyHistoricalEligibilityAbsence("");
    assertThrows(() => verifyHistoricalEligibilityAbsence("deleted_at IS NULL"));
    assertThrows(() => verifyHistoricalEligibilityAbsence("$member['status']"));
    assertThrows(() => verifyHistoricalEligibilityAbsence("membership_end_date"));
    assertThrows(() => verifyHistoricalEligibilityAbsence("getTrainerProfileId"));
});

checkInvariant("Self-Test 6: Trainer Ownership", () => {
    const good = `
        FROM trainers WHERE id = ? FOR UPDATE
        if ((int)$trainer['admin_id'] !== $adminId)
    `;
    verifyTrainerOwnership(good);
    assertThrows(() => verifyTrainerOwnership(good.replace("(int)", "")));
    assertThrows(() => verifyTrainerOwnership("if ((int)$trainer['admin_id'] !== $adminId) FROM trainers WHERE id = ? FOR UPDATE"));
});

checkInvariant("Self-Test 7: Time Boundary", () => {
    const good = `
        if ('scheduled') { Response::error('', '', 409); }
        $now = new \\DateTime('now', new \\DateTimeZone('Europe/Istanbul'));
        $terminalizedAt = $now->format('Y-m-d H:i:s');
        if ($now < $endsAtDt) { Response::error('','APPOINTMENT_NOT_TERMINALIZABLE',409); }
    `;
    verifyTimeBoundary(good);
    assertThrows(() => verifyTimeBoundary(good.replace("Europe/Istanbul", "")));
    assertThrows(() => verifyTimeBoundary(good.replace("<", "==")));
    assertThrows(() => verifyTimeBoundary(good + " NOW() "));
});

checkInvariant("Self-Test 8: Exact UPDATEs", () => {
    const goodCompleted = "UPDATE appointments SET status = 'completed', completed_by = ?, completed_at = ?, updated_by = ? WHERE";
    verifyCompletedUpdate(goodCompleted);
    assertThrows(() => verifyCompletedUpdate("UPDATE appointments SET status = 'completed', completed_by = ?, completed_at = ?, updated_by = ?, no_show_at = ? WHERE"));
    assertThrows(() => verifyCompletedUpdate("UPDATE appointments SET status = 'completed', completed_by = ?, completed_at = ?, updated_by = ?, foo = ? WHERE"));
    
    const goodNoShow = "UPDATE appointments SET status = 'completed', completed_by = ?, completed_at = ?, updated_by = ? WHERE \n UPDATE appointments SET status = 'no_show', no_show_by = ?, no_show_at = ?, updated_by = ? WHERE";
    verifyNoShowUpdate(goodNoShow);
    assertThrows(() => verifyNoShowUpdate("UPDATE appointments SET status = 'no_show', no_show_by = ?, no_show_at = ?, updated_by = ?, completed_at = ? WHERE"));
});

checkInvariant("Self-Test 9: Side Effects", () => {
    verifyNoSideEffects("");
    assertThrows(() => verifyNoSideEffects("INSERT INTO member_visits"));
    assertThrows(() => verifyNoSideEffects("visit_id"));
    assertThrows(() => verifyNoSideEffects("DELETE FROM appointments"));
});

checkInvariant("Self-Test 10: Response Privacy", () => {
    const good = `
        Response::json([
            'id' => (int)$persisted['id'],
            'uuid' => $persisted['uuid'],
            'member_id' => (int)$persisted['member_id'],
            'trainer_id' => (int)$persisted['trainer_id'],
            'starts_at' => $persisted['starts_at'],
            'ends_at' => $persisted['ends_at'],
            'status' => $persisted['status']
        ]);
    `;
    verifyResponsePrivacy(good);
    assertThrows(() => verifyResponsePrivacy(good.replace("(int)", ""))); // missing int normalization
    assertThrows(() => verifyResponsePrivacy(good.replace("'uuid' =>", "'uuid' => 'x', 'foo' => "))); // extra key
    assertThrows(() => verifyResponsePrivacy(good.replace("'uuid' =>", "'uuid' => 'x', 'completed_at' => "))); // forbidden key
});

checkInvariant("Self-Test 11: Audit Metadata Contract", () => {
    const goodCompleted = `\\Core\\AuditLogger::log('appointment.completed', $adminId, 'appointment', $id, ['previous_status' => $lockedApp['status'], 'new_status' => $persisted['status'], 'completed_at' => $persisted['completed_at']])`;
    verifyAuditContract(goodCompleted, 'appointment.completed');
    assertThrows(() => verifyAuditContract(goodCompleted.replace("$adminId", "TMP").replace("$id", "$adminId").replace("TMP", "$id"), 'appointment.completed')); // id swap
    assertThrows(() => verifyAuditContract(goodCompleted.replace("'completed_at'", "'foo'"), 'appointment.completed')); // missing completed_at
    assertThrows(() => verifyAuditContract(goodCompleted.replace("])", ", 'no_show_at' => 'bar'])"), 'appointment.completed')); // extra no_show_at
    
    const goodNoShow = `\\Core\\AuditLogger::log('appointment.no_show', $adminId, 'appointment', $id, ['previous_status' => $lockedApp['status'], 'new_status' => $persisted['status'], 'no_show_at' => $persisted['no_show_at']])`;
    verifyAuditContract(goodNoShow, 'appointment.no_show');
});


// ---------------------------------------------------------
// Production Source Loading
// ---------------------------------------------------------
console.log("--- Loading Production Sources (Fail-Closed) ---");

const indexSrc = fs.readFileSync(path.join(rootDir, 'api/index.php'), 'utf8');
const controllerSrc = fs.readFileSync(path.join(rootDir, 'api/controllers/AppointmentController.php'), 'utf8');

// 1. Exact four routes using balanced extraction
function extractRouteBlock(indexSource, regexStr) {
    const match = indexSource.match(regexStr);
    if (!match) return null;
    return extractBalanced(indexSource, indexSource.indexOf("{", match.index));
}

const completeAdminMatch = extractRouteBlock(indexSrc, /if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/complete\$#'/);
if (!completeAdminMatch) throw new Error("FAIL: completeAdmin route missing or malformed");
const noShowAdminMatch = extractRouteBlock(indexSrc, /if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/no-show\$#'/);
if (!noShowAdminMatch) throw new Error("FAIL: noShowAdmin route missing or malformed");
const completeTrainerMatch = extractRouteBlock(indexSrc, /if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/trainer\/appointments\/\(\[1-9\]\\d\*\)\/complete\$#'/);
if (!completeTrainerMatch) throw new Error("FAIL: completeTrainer route missing or malformed");
const noShowTrainerMatch = extractRouteBlock(indexSrc, /if\s*\(\s*preg_match\s*\(\s*'#\^\/api\/trainer\/appointments\/\(\[1-9\]\\d\*\)\/no-show\$#'/);
if (!noShowTrainerMatch) throw new Error("FAIL: noShowTrainer route missing or malformed");

// Extract handleTerminalize
const handleMatch = controllerSrc.match(/private\s+function\s+handleTerminalize\s*\(/);
if (!handleMatch) throw new Error("FAIL: handleTerminalize method missing");
const handleStart = controllerSrc.indexOf("{", handleMatch.index);
const handleTerminalizeBlock = extractBalanced(controllerSrc, handleStart);
if (!handleTerminalizeBlock) throw new Error("FAIL: Could not extract handleTerminalize block");


console.log("--- Running Production Invariant Checks ---");

checkInvariant("Exact Route Matrix: Admin complete", () => {
    verifyRoute(completeAdminMatch, 'PATCH', ['super_admin', 'admin'], '(int)$matches[1]', 'completeAdminAppointment');
});

checkInvariant("Exact Route Matrix: Admin no-show", () => {
    verifyRoute(noShowAdminMatch, 'PATCH', ['super_admin', 'admin'], '(int)$matches[1]', 'noShowAdminAppointment');
});

checkInvariant("Exact Route Matrix: Trainer complete", () => {
    verifyRoute(completeTrainerMatch, 'PATCH', ['trainer'], '(int)$matches[1]', 'completeTrainerAppointment');
});

checkInvariant("Exact Route Matrix: Trainer no-show", () => {
    verifyRoute(noShowTrainerMatch, 'PATCH', ['trainer'], '(int)$matches[1]', 'noShowTrainerAppointment');
});

checkInvariant("Reception Terminalization Absence", () => {
    verifyReceptionTerminalizationAbsent(controllerSrc, indexSrc);
});

checkInvariant("Global CSRF Guard Positive", () => {
    verifyGlobalCsrfPositive(indexSrc);
});

checkInvariant("Public entry methods exact-once", () => {
    const expected = ['completeAdminAppointment', 'noShowAdminAppointment', 'completeTrainerAppointment', 'noShowTrainerAppointment'];
    for (const action of expected) {
        const matches = controllerSrc.match(new RegExp(`public\\s+function\\s+${action}\\s*\\(`, 'g'));
        if (!matches || matches.length !== 1) throw new Error(`${action} must appear exactly once`);
    }
    const internalMatches = controllerSrc.match(/private\s+function\s+handleTerminalize\s*\(/g);
    if (!internalMatches || internalMatches.length !== 1) throw new Error(`handleTerminalize must appear exactly once`);
    
    // Internal hard-coded target targets
    if (!controllerSrc.includes("$this->handleTerminalize($id, 'admin', 'completed')")) throw new Error("Missing hard-coded admin/completed target");
    if (!controllerSrc.includes("$this->handleTerminalize($id, 'admin', 'no_show')")) throw new Error("Missing hard-coded admin/no_show target");
    if (!controllerSrc.includes("$this->handleTerminalize($id, 'trainer', 'completed')")) throw new Error("Missing hard-coded trainer/completed target");
    if (!controllerSrc.includes("$this->handleTerminalize($id, 'trainer', 'no_show')")) throw new Error("Missing hard-coded trainer/no_show target");
});

checkInvariant("Exact {} JSON Contract", () => {
    verifyExactJsonContract(handleTerminalizeBlock);
});

checkInvariant("Actor Normalization", () => {
    verifyActorNormalization(handleTerminalizeBlock);
});

checkInvariant("Transaction and Lock Ordering", () => {
    verifyOrdering(handleTerminalizeBlock);
});

checkInvariant("Historical Eligibility Absence", () => {
    verifyHistoricalEligibilityAbsence(handleTerminalizeBlock);
});

checkInvariant("Trainer Ownership Normalization", () => {
    verifyTrainerOwnership(handleTerminalizeBlock);
});

checkInvariant("Scheduled-only & Lock-after-now boundary", () => {
    verifyTimeBoundary(handleTerminalizeBlock);
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

checkInvariant("Persisted Row Contract", () => {
    verifyPersistedRowContract(handleTerminalizeBlock);
});

checkInvariant("Persisted Response Privacy", () => {
    verifyResponsePrivacy(handleTerminalizeBlock);
});

checkInvariant("Audit Metadata Contract", () => {
    verifyAuditContract(handleTerminalizeBlock, 'appointment.completed');
    verifyAuditContract(handleTerminalizeBlock, 'appointment.no_show');
});

checkInvariant("Commit-Before-Audit Isolation", () => {
    const commitIdx = handleTerminalizeBlock.indexOf("$this->db->commit()");
    const auditIdx = handleTerminalizeBlock.indexOf("AuditLogger::log");
    
    const auditCatchIdx = handleTerminalizeBlock.indexOf("catch", auditIdx);
    const auditCatchBlock = extractBalanced(handleTerminalizeBlock, auditCatchIdx);
    if (auditCatchBlock.includes("rollBack") || auditCatchBlock.includes("Response::error")) {
        throw new Error("Audit catch must not rollback or return Response::error");
    }
    if (auditCatchBlock.includes("UPDATE appointments") || auditCatchBlock.includes("retry")) {
        throw new Error("Audit catch must not contain UPDATE or retry logic");
    }
});

checkInvariant("Temporary Artifact Absence", () => {
    const forbiddenArtifacts = ['test.mjs', 'test2.mjs', 'test3.mjs', 'patch.cjs', 'patch.js', 'patch_index.php', 'test-audit-keys.mjs', 'test-csrf.mjs'];
    for (const art of forbiddenArtifacts) {
        if (fs.existsSync(path.resolve(rootDir, art))) throw new Error(`Forbidden artifact ${art}`);
    }
    
    const files = fs.readdirSync(rootDir);
    for (const file of files) {
        if (file.endsWith('.tmp') || file.endsWith('.fixed')) {
            throw new Error(`Forbidden temporary artifact found: ${file}`);
        }
    }
});

console.log("---------------------------------------------------------");
console.log(`Total Invariants: ${totalInvariants}`);
console.log(`Passed: ${passedInvariants}`);
console.log(`Failed: ${failedInvariants}`);
console.log("---------------------------------------------------------");
if (failedInvariants !== 0 || passedInvariants !== totalInvariants) {
    console.error(`❌ Appointment Terminalization Final Verifier FAILED.`);
    process.exit(1);
} else {
    console.log(`✅ Appointment Terminalization Final Verifier PASSED.`);
    process.exit(0);
}

