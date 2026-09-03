import fs from 'fs';
import path from 'path';

// =========================================================
// FAZ 7B.4G-F.11D.1.2: APPOINTMENT RESCHEDULE VERIFIER
// =========================================================

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

// =========================================================
// 1. STRING / COMMENT-SAFE BALANCED PARSERS & HELPERS
// =========================================================

function extractBalanced(code, startIdx, openChar = '{', closeChar = '}') {
    if (startIdx < 0 || startIdx >= code.length) return null;
    const firstOpen = code.indexOf(openChar, startIdx);
    if (firstOpen === -1) return null;

    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = firstOpen; i < code.length; i++) {
        const c = code[i];
        const next = i + 1 < code.length ? code[i + 1] : '';

        if (inLineComment) {
            if (c === '\n' || c === '\r') inLineComment = false;
            continue;
        }
        if (inBlockComment) {
            if (c === '*' && next === '/') {
                inBlockComment = false;
                i++;
            }
            continue;
        }
        if (inSingleQuote) {
            if (c === '\\') i++;
            else if (c === "'") inSingleQuote = false;
            continue;
        }
        if (inDoubleQuote) {
            if (c === '\\') i++;
            else if (c === '"') inDoubleQuote = false;
            continue;
        }
        if (inBacktick) {
            if (c === '\\') i++;
            else if (c === '`') inBacktick = false;
            continue;
        }

        if (c === '/' && next === '/') {
            inLineComment = true;
            i++;
            continue;
        }
        if (c === '/' && next === '*') {
            inBlockComment = true;
            i++;
            continue;
        }

        if (c === "'") { inSingleQuote = true; continue; }
        if (c === '"') { inDoubleQuote = true; continue; }
        if (c === '`') { inBacktick = true; continue; }

        if (c === openChar) {
            depth++;
        } else if (c === closeChar) {
            depth--;
            if (depth === 0) {
                return code.substring(startIdx, i + 1);
            }
        }
    }
    return null;
}

function extractFunctionBlock(code, signature) {
    const idx = code.indexOf(signature);
    if (idx === -1) return null;
    return extractBalanced(code, idx, '{', '}');
}

function extractBalancedCall(code, prefix) {
    const idx = code.indexOf(prefix);
    if (idx === -1) return null;
    const parenIdx = code.indexOf('(', idx + prefix.length);
    if (parenIdx === -1) return null;
    return extractBalanced(code, idx, '(', ')');
}

function splitTopLevelArgs(argsContent) {
    const args = [];
    let cur = '';
    let parenDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < argsContent.length; i++) {
        const c = argsContent[i];
        const next = i + 1 < argsContent.length ? argsContent[i + 1] : '';

        if (inLineComment) {
            if (c === '\n' || c === '\r') inLineComment = false;
            cur += c;
            continue;
        }
        if (inBlockComment) {
            if (c === '*' && next === '/') {
                inBlockComment = false;
                cur += c + next;
                i++;
                continue;
            }
            cur += c;
            continue;
        }
        if (inSingleQuote) {
            cur += c;
            if (c === '\\' && i + 1 < argsContent.length) cur += argsContent[++i];
            else if (c === "'") inSingleQuote = false;
            continue;
        }
        if (inDoubleQuote) {
            cur += c;
            if (c === '\\' && i + 1 < argsContent.length) cur += argsContent[++i];
            else if (c === '"') inDoubleQuote = false;
            continue;
        }

        if (c === '/' && next === '/') {
            inLineComment = true;
            cur += c + next;
            i++;
            continue;
        }
        if (c === '/' && next === '*') {
            inBlockComment = true;
            cur += c + next;
            i++;
            continue;
        }
        if (c === "'") { inSingleQuote = true; cur += c; continue; }
        if (c === '"') { inDoubleQuote = true; cur += c; continue; }

        if (c === '(') parenDepth++;
        else if (c === ')') parenDepth--;
        else if (c === '{') braceDepth++;
        else if (c === '}') braceDepth--;
        else if (c === '[') bracketDepth++;
        else if (c === ']') bracketDepth--;

        if (c === ',' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
            args.push(cur.trim());
            cur = '';
        } else {
            cur += c;
        }
    }
    if (cur.trim().length > 0) {
        args.push(cur.trim());
    }
    return args;
}

function parsePhpArrayLiteral(arrayStr) {
    const openBracket = arrayStr.indexOf('[');
    const closeBracket = arrayStr.lastIndexOf(']');
    if (openBracket === -1 || closeBracket === -1 || closeBracket <= openBracket) return null;
    const inner = arrayStr.substring(openBracket + 1, closeBracket).trim();
    if (!inner) return [];

    const rawItems = splitTopLevelArgs(inner);
    const result = [];
    for (const item of rawItems) {
        const trimmed = item.trim();
        const match = trimmed.match(/^['"]([^'"]+)['"]$/);
        if (match) {
            result.push(match[1]);
        } else {
            result.push(trimmed);
        }
    }
    return result;
}

// =========================================================
// 2. REUSABLE PREDICATES FOR PRODUCTION & SELF-TESTS
// =========================================================

/**
 * Predicate 1: Route verification (exact regex, RBAC, method, target controller method)
 */
function verifyRescheduleRoute(routeBlock, expectedPatternRegex, expectedRoles, expectedControllerMethod) {
    if (!routeBlock) throw new Error("Route block is null or empty");

    // 1. Verify exact positive integer route regex
    const pregMatchCall = extractBalancedCall(routeBlock, "preg_match");
    if (!pregMatchCall) {
        throw new Error("Missing preg_match call in route block");
    }
    const pregArgs = splitTopLevelArgs(pregMatchCall.substring(pregMatchCall.indexOf('(') + 1, pregMatchCall.lastIndexOf(')')));
    if (pregArgs.length < 2) {
        throw new Error("preg_match requires at least 2 arguments");
    }
    const patternLiteral = pregArgs[0].trim().replace(/^['"]|['"]$/g, '');
    if (!expectedPatternRegex.test(patternLiteral)) {
        throw new Error(`Route regex pattern mismatch. Pattern '${patternLiteral}' does not match expected regex ${expectedPatternRegex}`);
    }

    // Explicit rejection of weak \\d+ regex
    if (/\\d\+/.test(patternLiteral)) {
        throw new Error(`Weak route ID regex detected (uses \\d+ instead of ([1-9]\\d*)): ${patternLiteral}`);
    }

    // 2. AuthMiddleware::handle() must be present
    if (!/AuthMiddleware::handle\(\s*\)/.test(routeBlock)) {
        throw new Error("Missing AuthMiddleware::handle() in route block");
    }

    // 3. AuthMiddleware::hasRole([...]) exact match
    const hasRoleCall = extractBalancedCall(routeBlock, "AuthMiddleware::hasRole");
    if (!hasRoleCall) {
        throw new Error("Missing AuthMiddleware::hasRole call in route block");
    }
    const roles = parsePhpArrayLiteral(hasRoleCall);
    if (!roles) {
        throw new Error("Could not parse roles from AuthMiddleware::hasRole");
    }

    const sortedActual = [...roles].sort();
    const sortedExpected = [...expectedRoles].sort();
    if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
        throw new Error(`Role mismatch. Expected: [${sortedExpected.join(', ')}], Found: [${sortedActual.join(', ')}]`);
    }

    // 4. HTTP method must be PATCH
    if (!/\$method\s*===\s*['"]PATCH['"]/.test(routeBlock)) {
        throw new Error("Route block does not enforce $method === 'PATCH'");
    }

    // 5. Controller method check
    if (!routeBlock.includes(expectedControllerMethod)) {
        throw new Error(`Missing expected controller method: ${expectedControllerMethod}`);
    }

    return true;
}

/**
 * Predicate 2: Actor normalization semantics simulator & code check
 */
function testActorNormalizationPredicate(rawVal) {
    let adminId = rawVal;
    if (typeof adminId === 'string' && /^[1-9]\d*$/.test(adminId)) {
        adminId = parseInt(adminId, 10);
    }
    if (typeof adminId !== 'number' || !Number.isInteger(adminId) || adminId <= 0) {
        return null;
    }
    return adminId;
}

function verifyActorNormalizationCode(codeBlock, errorStatus = 401, errorCode = 'UNAUTHORIZED') {
    if (!codeBlock) throw new Error("Code block is null");

    // Must check $_SESSION['admin_id']
    if (!codeBlock.includes("$_SESSION['admin_id']")) {
        throw new Error("Missing $_SESSION['admin_id'] access");
    }

    // Must have regex ^[1-9]\d*$ check for strings
    if (!/is_string\(\$adminId\)\s*&&\s*preg_match\(\s*['"]\/\^\[1-9\]\\d\*\$\/['"],\s*\$adminId\s*\)/.test(codeBlock)) {
        throw new Error("Missing exact string regex normalization: /^[1-9]\\d*$/");
    }

    // Must cast to (int)
    if (!/\$adminId\s*=\s*\(int\)\$adminId/.test(codeBlock)) {
        throw new Error("Missing (int) casting on numeric string");
    }

    // Must validate !is_int($adminId) || $adminId <= 0
    if (!/!is_int\(\$adminId\)\s*\|\|\s*\$adminId\s*<=\s*0/.test(codeBlock)) {
        throw new Error("Missing integer validation: !is_int($adminId) || $adminId <= 0");
    }

    // Must return expected error and status
    const statusRe = new RegExp(`\\b${errorStatus}\\b`);
    const codeRe = new RegExp(`['"]${errorCode}['"]`);
    if (!statusRe.test(codeBlock) || !codeRe.test(codeBlock)) {
        throw new Error(`Missing expected error status ${errorStatus} or code ${errorCode}`);
    }

    return true;
}

/**
 * Predicate 3: Query rejection ordering
 */
function verifyQueryRejectionOrdering(codeBlock) {
    if (!codeBlock) throw new Error("Code block is null");

    const getGuardIdx = codeBlock.indexOf("!empty($_GET)");
    if (getGuardIdx === -1) {
        throw new Error("Missing !empty($_GET) check");
    }

    const guardBlock = extractBalanced(codeBlock, getGuardIdx, '{', '}');
    if (!guardBlock) {
        throw new Error("Could not extract !empty($_GET) block");
    }

    if (!guardBlock.includes("'VALIDATION_ERROR'") || !guardBlock.includes("422")) {
        throw new Error("Query parameter rejection must return VALIDATION_ERROR with 422 status");
    }

    const bodyReadIdx = codeBlock.indexOf("file_get_contents('php://input')");
    const jsonDecodeIdx = codeBlock.indexOf("json_decode");
    const beginTxIdx = codeBlock.indexOf("beginTransaction");

    if (bodyReadIdx !== -1 && getGuardIdx > bodyReadIdx) {
        throw new Error("Query rejection guard occurs after body read");
    }
    if (jsonDecodeIdx !== -1 && getGuardIdx > jsonDecodeIdx) {
        throw new Error("Query rejection guard occurs after json_decode");
    }
    if (beginTxIdx !== -1 && getGuardIdx > beginTxIdx) {
        throw new Error("Query rejection guard occurs after beginTransaction");
    }

    return true;
}

/**
 * Predicate 4: Exact payload contract
 */
function verifyPayloadContract(codeBlock, expectedKeys = ['ends_at', 'starts_at']) {
    if (!codeBlock) throw new Error("Code block is null");

    // Check array_keys and sort
    if (!codeBlock.includes("array_keys($data)") || !codeBlock.includes("sort($dataKeys)")) {
        throw new Error("Missing array_keys or sort on request payload keys");
    }

    // Check exact allowed sorted array
    const sortedAllowedMatch = codeBlock.match(/\$allowedSorted\s*=\s*(\[[^\]]+\]);/);
    if (!sortedAllowedMatch) {
        throw new Error("Missing $allowedSorted definition in payload validation");
    }

    const parsedKeys = parsePhpArrayLiteral(sortedAllowedMatch[1]);
    if (!parsedKeys) {
        throw new Error("Could not parse $allowedSorted array literal");
    }

    const sortedActual = [...parsedKeys].sort();
    const sortedExpected = [...expectedKeys].sort();
    if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
        throw new Error(`Payload allowed keys mismatch. Expected: [${sortedExpected.join(', ')}], Found: [${sortedActual.join(', ')}]`);
    }

    // Must check JSON error
    if (!codeBlock.includes("json_last_error() !== JSON_ERROR_NONE")) {
        throw new Error("Missing json_last_error check");
    }
    if (!codeBlock.includes("'INVALID_JSON'") || !codeBlock.includes("400")) {
        throw new Error("Invalid JSON must return INVALID_JSON and 400");
    }

    // Must check string type on starts_at and ends_at
    if (!/!is_string\(\$data\['starts_at'\]\)\s*\|\|\s*!is_string\(\$data\['ends_at'\]\)/.test(codeBlock)) {
        throw new Error("Missing is_string check on starts_at and ends_at");
    }

    return true;
}

/**
 * Predicate 5: Deterministic transaction ordering
 */
function verifyRescheduleExecutionOrder(code) {
    const markers = [
        { name: "query rejection", token: "!empty($_GET)" },
        { name: "body read", token: "file_get_contents('php://input')" },
        { name: "startsDt < endsDt", token: "$startsDt >= $endsDt" },
        { name: "actor validation", token: "$_SESSION['admin_id']" },
        { name: "beginTransaction", token: "beginTransaction" },
        { name: "discovery SELECT", token: "$discStmt" },
        { name: "member FOR UPDATE", token: "FROM members WHERE id = ? FOR UPDATE" },
        { name: "trainer FOR UPDATE", token: "FROM trainers WHERE id = ? FOR UPDATE" },
        { name: "appointment FOR UPDATE", token: "FROM appointments WHERE id = ? FOR UPDATE" },
        { name: "trainer conflict SELECT", token: "WHERE id <> ? AND trainer_id = ? AND status = 'scheduled'" },
        { name: "member conflict SELECT", token: "WHERE id <> ? AND member_id = ? AND status = 'scheduled'" },
        { name: "history INSERT", token: "INSERT INTO appointment_reschedules" },
        { name: "appointment UPDATE", token: "UPDATE appointments" },
        { name: "persisted SELECT", token: "$fetchStmt" },
        { name: "commit", token: "commit()" },
        { name: "AuditLogger", token: "AuditLogger::log" },
        { name: "HTTP 200 success", token: "200" }
    ];

    let lastIdx = -1;
    let lastName = "START";

    for (const m of markers) {
        const idx = code.indexOf(m.token);
        if (idx === -1) {
            throw new Error(`Required ordering marker missing: ${m.name} (${m.token})`);
        }
        if (idx < lastIdx) {
            throw new Error(`Ordering violation: '${m.name}' occurred before '${lastName}'`);
        }
        lastIdx = idx;
        lastName = m.name;
    }

    return true;
}

/**
 * Predicate 6: Conflict query validation
 */
function verifyConflictQuery(sqlString, entityType) {
    if (!sqlString) throw new Error("Conflict SQL string is null");

    // Must check id <> ?
    if (!/id\s*<>\s*\?/.test(sqlString)) {
        throw new Error("Conflict query must exclude current appointment using 'id <> ?'");
    }

    // Must check entity_id = ?
    const entityField = entityType === 'trainer' ? 'trainer_id' : 'member_id';
    const entityRe = new RegExp(`${entityField}\\s*=\\s*\\?`);
    if (!entityRe.test(sqlString)) {
        throw new Error(`Conflict query must filter by ${entityField} = ?`);
    }

    // Must check status = 'scheduled'
    if (!/status\s*=\s*'scheduled'/.test(sqlString)) {
        throw new Error("Conflict query must restrict to status = 'scheduled'");
    }

    // Must use strict overlap: starts_at < ? AND ends_at > ?
    if (!/starts_at\s*<\s*\?\s*AND\s*ends_at\s*>\s*\?/.test(sqlString)) {
        throw new Error("Conflict query must use strict overlap: 'starts_at < ? AND ends_at > ?'");
    }

    // Must have FOR UPDATE
    if (!/FOR\s+UPDATE/i.test(sqlString)) {
        throw new Error("Conflict query must lock rows with FOR UPDATE");
    }

    // Must forbid <=, >=, BETWEEN
    if (/BETWEEN/i.test(sqlString)) {
        throw new Error("Conflict query contains forbidden BETWEEN operator");
    }
    if (/starts_at\s*<=|ends_at\s*>=/.test(sqlString)) {
        throw new Error("Conflict query contains forbidden <= or >= operator");
    }

    return true;
}

/**
 * Predicate 7: History INSERT statement and columns
 */
function verifyHistoryInsert(insertSql) {
    if (!insertSql) throw new Error("History INSERT SQL is null");

    const match = insertSql.match(/INSERT\s+INTO\s+`?appointment_reschedules`?\s*\(([^)]+)\)/i);
    if (!match) {
        throw new Error("Failed to parse history INSERT column list");
    }

    const columns = match[1].split(',').map(c => c.trim().replace(/[`'"]/g, ''));
    const expected = [
        'uuid',
        'appointment_id',
        'previous_starts_at',
        'previous_ends_at',
        'new_starts_at',
        'new_ends_at',
        'rescheduled_by'
    ];

    const sortedActual = [...columns].sort();
    const sortedExpected = [...expected].sort();
    if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
        throw new Error(`History INSERT columns mismatch. Expected: [${sortedExpected.join(', ')}], Found: [${sortedActual.join(', ')}]`);
    }

    // Forbidden columns
    const forbidden = ['notes', 'reason', 'status', 'member_id', 'trainer_id', 'updated_at', 'deleted_at'];
    for (const f of forbidden) {
        if (columns.includes(f)) {
            throw new Error(`Forbidden column in history INSERT: ${f}`);
        }
    }

    return true;
}

/**
 * Predicate 8: Exact Appointment UPDATE statement
 */
function verifyAppointmentUpdate(updateSql) {
    if (!updateSql) throw new Error("Appointment UPDATE SQL is null");

    const setMatch = updateSql.match(/UPDATE\s+`?appointments`?\s+SET\s+(.+?)\s+WHERE\s+(.+)/is);
    if (!setMatch) {
        throw new Error("Failed to parse UPDATE appointments SET clause");
    }

    const setClause = setMatch[1].trim();
    const whereClause = setMatch[2].trim();

    const assignments = setClause.split(',').map(a => a.trim());
    const updatedCols = assignments.map(a => {
        const parts = a.split('=');
        return parts[0].trim().replace(/[`'"]/g, '');
    });

    const expectedCols = ['starts_at', 'ends_at', 'updated_by'];
    const sortedActual = [...updatedCols].sort();
    const sortedExpected = [...expectedCols].sort();
    if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
        throw new Error(`UPDATE columns mismatch. Expected: [${sortedExpected.join(', ')}], Found: [${sortedActual.join(', ')}]`);
    }

    // Check WHERE clause targets id
    if (!/id\s*=\s*\?/.test(whereClause)) {
        throw new Error("UPDATE statement must target current appointment using 'WHERE id = ?'");
    }

    // Forbidden mutable columns
    const forbiddenCols = ['status', 'member_id', 'trainer_id', 'created_by', 'cancelled_by', 'completed_by', 'no_show_by'];
    for (const f of forbiddenCols) {
        if (updatedCols.includes(f)) {
            throw new Error(`Forbidden column mutation in UPDATE: ${f}`);
        }
    }

    return true;
}

/**
 * Predicate 9: AuditLogger call
 */
function verifyAuditLoggerCall(auditCallBlock) {
    if (!auditCallBlock) throw new Error("AuditLogger call block missing");

    const openParen = auditCallBlock.indexOf('(');
    const closeParen = auditCallBlock.lastIndexOf(')');
    if (openParen === -1 || closeParen === -1 || closeParen <= openParen) {
        throw new Error("Malformed AuditLogger call syntax");
    }

    const inner = auditCallBlock.substring(openParen + 1, closeParen);
    const args = splitTopLevelArgs(inner);

    if (args.length !== 5) {
        throw new Error(`AuditLogger::log must have exactly 5 arguments, found ${args.length}`);
    }

    // Arg 1: 'appointment.rescheduled'
    if (!/^['"]appointment\.rescheduled['"]$/.test(args[0])) {
        throw new Error(`Arg 1 mismatch. Expected 'appointment.rescheduled', found: ${args[0]}`);
    }

    // Arg 2: $adminId
    if (!/^\$adminId\b/.test(args[1])) {
        throw new Error(`Arg 2 mismatch. Expected $adminId, found: ${args[1]}`);
    }

    // Arg 3: 'appointment'
    if (!/^['"]appointment['"]$/.test(args[2])) {
        throw new Error(`Arg 3 mismatch. Expected 'appointment', found: ${args[2]}`);
    }

    // Arg 4: $appointmentId
    if (!/^\$appointmentId\b/.test(args[3])) {
        throw new Error(`Arg 4 mismatch. Expected $appointmentId, found: ${args[3]}`);
    }

    // Arg 5: Metadata associative array
    const metaStr = args[4];
    const openBracket = metaStr.indexOf('[');
    const closeBracket = metaStr.lastIndexOf(']');
    if (openBracket === -1 || closeBracket === -1) {
        throw new Error("Metadata must be an associative array literal");
    }

    const metaInner = metaStr.substring(openBracket + 1, closeBracket);
    const pairs = splitTopLevelArgs(metaInner);
    const keys = [];
    for (const p of pairs) {
        const parts = p.split('=>');
        if (parts.length < 2) throw new Error(`Invalid metadata key-value pair: ${p}`);
        const k = parts[0].trim().replace(/^['"]|['"]$/g, '');
        keys.push(k);
    }

    const expectedKeys = ['new_ends_at', 'new_starts_at', 'previous_ends_at', 'previous_starts_at'];
    const sortedActual = [...keys].sort();
    const sortedExpected = [...expectedKeys].sort();
    if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
        throw new Error(`Metadata keys mismatch. Expected: [${sortedExpected.join(', ')}], Found: [${sortedActual.join(', ')}]`);
    }

    return true;
}

// =========================================================
// 3. NEGATIVE SELF-TESTS (MINIMUM 16)
// =========================================================

console.log("--- Starting Negative Self-Tests ---");

checkInvariant("Self-Test 1: Exact RBAC set parser accepts canonical and rejects extra/missing roles", () => {
    const canonicalRoute = `
        if (preg_match('#^/api/admin/appointments/([1-9]\\d*)/reschedule$#', $requestUri, $matches)) {
            AuthMiddleware::handle();
            AuthMiddleware::hasRole(['super_admin', 'admin']);
            if ($method === 'PATCH') {
                (new \\Controllers\\AppointmentController())->rescheduleAdminAppointment((int)$matches[1]);
            }
        }
    `;
    verifyRescheduleRoute(canonicalRoute, /#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/reschedule\$\#/, ['super_admin', 'admin'], 'rescheduleAdminAppointment');

    const extraRoleRoute = canonicalRoute.replace("['super_admin', 'admin']", "['super_admin', 'admin', 'trainer']");
    let caughtExtra = false;
    try {
        verifyRescheduleRoute(extraRoleRoute, /#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/reschedule\$\#/, ['super_admin', 'admin'], 'rescheduleAdminAppointment');
    } catch {
        caughtExtra = true;
    }
    if (!caughtExtra) throw new Error("Failed to reject route with extra roles");

    const missingRoleRoute = canonicalRoute.replace("['super_admin', 'admin']", "['super_admin']");
    let caughtMissing = false;
    try {
        verifyRescheduleRoute(missingRoleRoute, /#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/reschedule\$\#/, ['super_admin', 'admin'], 'rescheduleAdminAppointment');
    } catch {
        caughtMissing = true;
    }
    if (!caughtMissing) throw new Error("Failed to reject route with missing roles");
});

checkInvariant("Self-Test 2: Weak route ID regex (\\d+) rejected", () => {
    const weakRoute = `
        if (preg_match('#^/api/admin/appointments/(\\d+)/reschedule$#', $requestUri, $matches)) {
            AuthMiddleware::handle();
            AuthMiddleware::hasRole(['super_admin', 'admin']);
            if ($method === 'PATCH') {
                (new \\Controllers\\AppointmentController())->rescheduleAdminAppointment((int)$matches[1]);
            }
        }
    `;
    let caught = false;
    try {
        verifyRescheduleRoute(weakRoute, /#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/reschedule\$\#/, ['super_admin', 'admin'], 'rescheduleAdminAppointment');
    } catch {
        caught = true;
    }
    if (!caught) throw new Error("Failed to reject weak \\d+ route regex");
});

checkInvariant("Self-Test 3: Numeric-string actor accepted and normalized to int", () => {
    if (testActorNormalizationPredicate("42") !== 42) throw new Error("String '42' was not normalized to 42");
    if (testActorNormalizationPredicate("1") !== 1) throw new Error("String '1' was not normalized to 1");
    if (testActorNormalizationPredicate(7) !== 7) throw new Error("Int 7 was not accepted");
});

checkInvariant("Self-Test 4: Invalid actor representations rejected", () => {
    const invalidInputs = ["1.5", null, 0, "0", -1, "-1", "abc", [], {}, undefined, true, false];
    for (const inv of invalidInputs) {
        if (testActorNormalizationPredicate(inv) !== null) {
            throw new Error(`Invalid actor ${JSON.stringify(inv)} was not rejected`);
        }
    }
});

checkInvariant("Self-Test 5: Exact 2-key payload validation rejects extra or missing keys", () => {
    const canonicalCode = `
        $dataKeys = array_keys($data);
        sort($dataKeys);
        $allowedSorted = ['ends_at', 'starts_at'];
        if ($dataKeys !== $allowedSorted) { Response::error('Exact payload keys required.', 'VALIDATION_ERROR', 422); }
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) { Response::error('Malformed JSON payload.', 'INVALID_JSON', 400); }
        if (!is_string($data['starts_at']) || !is_string($data['ends_at'])) { Response::error('starts_at and ends_at must be strings.', 'VALIDATION_ERROR', 422); }
    `;
    verifyPayloadContract(canonicalCode, ['ends_at', 'starts_at']);

    const extraKeyCode = canonicalCode.replace("['ends_at', 'starts_at']", "['ends_at', 'notes', 'starts_at']");
    let caughtExtra = false;
    try {
        verifyPayloadContract(extraKeyCode, ['ends_at', 'starts_at']);
    } catch {
        caughtExtra = true;
    }
    if (!caughtExtra) throw new Error("Failed to reject extra payload key in $allowedSorted");
});

checkInvariant("Self-Test 6: Query guard after transaction rejected", () => {
    const invertedCode = `
        $this->db->beginTransaction();
        if (!empty($_GET)) {
            Response::error('Query parameters are not allowed.', 'VALIDATION_ERROR', 422);
        }
    `;
    let caught = false;
    try {
        verifyQueryRejectionOrdering(invertedCode);
    } catch {
        caught = true;
    }
    if (!caught) throw new Error("Failed to reject query guard placed after beginTransaction");
});

checkInvariant("Self-Test 7: Member->trainer->appointment lock order verified in canonical code", () => {
    const canonical = `
        if (!empty($_GET)) {}
        $data = json_decode(file_get_contents('php://input'), true);
        if ($startsDt >= $endsDt) {}
        $adminId = $_SESSION['admin_id'] ?? null;
        $this->db->beginTransaction();
        $discStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
        $memStmt = $this->db->prepare("SELECT id, deleted_at, status, membership_end_date, trainer_id FROM members WHERE id = ? FOR UPDATE");
        $trainStmt = $this->db->prepare("SELECT id, deleted_at, is_active, admin_id FROM trainers WHERE id = ? FOR UPDATE");
        $appStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ? FOR UPDATE");
        $tConfStmt = $this->db->prepare("SELECT id FROM appointments WHERE id <> ? AND trainer_id = ? AND status = 'scheduled' AND starts_at < ? AND ends_at > ? FOR UPDATE");
        $mConfStmt = $this->db->prepare("SELECT id FROM appointments WHERE id <> ? AND member_id = ? AND status = 'scheduled' AND starts_at < ? AND ends_at > ? FOR UPDATE");
        $histStmt = $this->db->prepare("INSERT INTO appointment_reschedules (...)");
        $updStmt = $this->db->prepare("UPDATE appointments SET ...");
        $fetchStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
        $this->db->commit();
        AuditLogger::log('appointment.rescheduled', $adminId, 'appointment', $appointmentId, []);
        Response::json([], 200);
    `;
    verifyRescheduleExecutionOrder(canonical);
});

checkInvariant("Self-Test 8: Appointment-lock-first rejected", () => {
    const invertedLocks = `
        if (!empty($_GET)) {}
        $data = json_decode(file_get_contents('php://input'), true);
        if ($startsDt >= $endsDt) {}
        $adminId = $_SESSION['admin_id'] ?? null;
        $this->db->beginTransaction();
        $discStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
        $appStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ? FOR UPDATE");
        $memStmt = $this->db->prepare("SELECT id, deleted_at, status, membership_end_date, trainer_id FROM members WHERE id = ? FOR UPDATE");
        $trainStmt = $this->db->prepare("SELECT id, deleted_at, is_active, admin_id FROM trainers WHERE id = ? FOR UPDATE");
        $tConfStmt = $this->db->prepare("SELECT id FROM appointments WHERE id <> ? AND trainer_id = ? AND status = 'scheduled' AND starts_at < ? AND ends_at > ? FOR UPDATE");
        $mConfStmt = $this->db->prepare("SELECT id FROM appointments WHERE id <> ? AND member_id = ? AND status = 'scheduled' AND starts_at < ? AND ends_at > ? FOR UPDATE");
        $histStmt = $this->db->prepare("INSERT INTO appointment_reschedules (...)");
        $updStmt = $this->db->prepare("UPDATE appointments SET ...");
        $fetchStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
        $this->db->commit();
        AuditLogger::log('appointment.rescheduled', $adminId, 'appointment', $appointmentId, []);
        Response::json([], 200);
    `;
    let caught = false;
    try {
        verifyRescheduleExecutionOrder(invertedLocks);
    } catch {
        caught = true;
    }
    if (!caught) throw new Error("Failed to reject appointment lock occurring before member lock");
});

checkInvariant("Self-Test 9: Conflict query without id <> rejected", () => {
    const badConflictSql = "SELECT id FROM appointments WHERE trainer_id = ? AND status = 'scheduled' AND starts_at < ? AND ends_at > ? FOR UPDATE";
    let caught = false;
    try {
        verifyConflictQuery(badConflictSql, 'trainer');
    } catch {
        caught = true;
    }
    if (!caught) throw new Error("Failed to reject conflict query missing 'id <> ?'");
});

checkInvariant("Self-Test 10: <= / >= overlap operators rejected in conflict query", () => {
    const badOverlapSql = "SELECT id FROM appointments WHERE id <> ? AND trainer_id = ? AND status = 'scheduled' AND starts_at <= ? AND ends_at >= ? FOR UPDATE";
    let caught = false;
    try {
        verifyConflictQuery(badOverlapSql, 'trainer');
    } catch {
        caught = true;
    }
    if (!caught) throw new Error("Failed to reject conflict query using <= or >=");
});

checkInvariant("Self-Test 11: History-after-update rejected", () => {
    const historyAfterUpdate = `
        if (!empty($_GET)) {}
        $data = json_decode(file_get_contents('php://input'), true);
        if ($startsDt >= $endsDt) {}
        $adminId = $_SESSION['admin_id'] ?? null;
        $this->db->beginTransaction();
        $discStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
        $memStmt = $this->db->prepare("SELECT id, deleted_at, status, membership_end_date, trainer_id FROM members WHERE id = ? FOR UPDATE");
        $trainStmt = $this->db->prepare("SELECT id, deleted_at, is_active, admin_id FROM trainers WHERE id = ? FOR UPDATE");
        $appStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ? FOR UPDATE");
        $tConfStmt = $this->db->prepare("SELECT id FROM appointments WHERE id <> ? AND trainer_id = ? AND status = 'scheduled' AND starts_at < ? AND ends_at > ? FOR UPDATE");
        $mConfStmt = $this->db->prepare("SELECT id FROM appointments WHERE id <> ? AND member_id = ? AND status = 'scheduled' AND starts_at < ? AND ends_at > ? FOR UPDATE");
        $updStmt = $this->db->prepare("UPDATE appointments SET ...");
        $histStmt = $this->db->prepare("INSERT INTO appointment_reschedules (...)");
        $fetchStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
        $this->db->commit();
        AuditLogger::log('appointment.rescheduled', $adminId, 'appointment', $appointmentId, []);
        Response::json([], 200);
    `;
    let caught = false;
    try {
        verifyRescheduleExecutionOrder(historyAfterUpdate);
    } catch {
        caught = true;
    }
    if (!caught) throw new Error("Failed to reject history insert after update");
});

checkInvariant("Self-Test 12: History extra notes column rejected", () => {
    const badHistorySql = "INSERT INTO appointment_reschedules (uuid, appointment_id, previous_starts_at, previous_ends_at, new_starts_at, new_ends_at, rescheduled_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    let caught = false;
    try {
        verifyHistoryInsert(badHistorySql);
    } catch {
        caught = true;
    }
    if (!caught) throw new Error("Failed to reject history INSERT with forbidden notes column");
});

checkInvariant("Self-Test 13: UPDATE changing status rejected", () => {
    const badUpdateSql = "UPDATE appointments SET starts_at = ?, ends_at = ?, status = ?, updated_by = ? WHERE id = ?";
    let caught = false;
    try {
        verifyAppointmentUpdate(badUpdateSql);
    } catch {
        caught = true;
    }
    if (!caught) throw new Error("Failed to reject UPDATE mutating status");
});

checkInvariant("Self-Test 14: Persisted fetch after commit rejected", () => {
    const fetchAfterCommit = `
        if (!empty($_GET)) {}
        $data = json_decode(file_get_contents('php://input'), true);
        if ($startsDt >= $endsDt) {}
        $adminId = $_SESSION['admin_id'] ?? null;
        $this->db->beginTransaction();
        $discStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
        $memStmt = $this->db->prepare("SELECT id, deleted_at, status, membership_end_date, trainer_id FROM members WHERE id = ? FOR UPDATE");
        $trainStmt = $this->db->prepare("SELECT id, deleted_at, is_active, admin_id FROM trainers WHERE id = ? FOR UPDATE");
        $appStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ? FOR UPDATE");
        $tConfStmt = $this->db->prepare("SELECT id FROM appointments WHERE id <> ? AND trainer_id = ? AND status = 'scheduled' AND starts_at < ? AND ends_at > ? FOR UPDATE");
        $mConfStmt = $this->db->prepare("SELECT id FROM appointments WHERE id <> ? AND member_id = ? AND status = 'scheduled' AND starts_at < ? AND ends_at > ? FOR UPDATE");
        $histStmt = $this->db->prepare("INSERT INTO appointment_reschedules (...)");
        $updStmt = $this->db->prepare("UPDATE appointments SET ...");
        $this->db->commit();
        $fetchStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
        AuditLogger::log('appointment.rescheduled', $adminId, 'appointment', $appointmentId, []);
        Response::json([], 200);
    `;
    let caught = false;
    try {
        verifyRescheduleExecutionOrder(fetchAfterCommit);
    } catch {
        caught = true;
    }
    if (!caught) throw new Error("Failed to reject persisted fetch occurring after commit");
});

checkInvariant("Self-Test 15: Audit-before-commit rejected", () => {
    const auditBeforeCommit = `
        if (!empty($_GET)) {}
        $data = json_decode(file_get_contents('php://input'), true);
        if ($startsDt >= $endsDt) {}
        $adminId = $_SESSION['admin_id'] ?? null;
        $this->db->beginTransaction();
        $discStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
        $memStmt = $this->db->prepare("SELECT id, deleted_at, status, membership_end_date, trainer_id FROM members WHERE id = ? FOR UPDATE");
        $trainStmt = $this->db->prepare("SELECT id, deleted_at, is_active, admin_id FROM trainers WHERE id = ? FOR UPDATE");
        $appStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ? FOR UPDATE");
        $tConfStmt = $this->db->prepare("SELECT id FROM appointments WHERE id <> ? AND trainer_id = ? AND status = 'scheduled' AND starts_at < ? AND ends_at > ? FOR UPDATE");
        $mConfStmt = $this->db->prepare("SELECT id FROM appointments WHERE id <> ? AND member_id = ? AND status = 'scheduled' AND starts_at < ? AND ends_at > ? FOR UPDATE");
        $histStmt = $this->db->prepare("INSERT INTO appointment_reschedules (...)");
        $updStmt = $this->db->prepare("UPDATE appointments SET ...");
        $fetchStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
        AuditLogger::log('appointment.rescheduled', $adminId, 'appointment', $appointmentId, []);
        $this->db->commit();
        Response::json([], 200);
    `;
    let caught = false;
    try {
        verifyRescheduleExecutionOrder(auditBeforeCommit);
    } catch {
        caught = true;
    }
    if (!caught) throw new Error("Failed to reject audit occurring before commit");
});

checkInvariant("Self-Test 16: Audit extra metadata keys rejected", () => {
    const badAuditCall = "AuditLogger::log('appointment.rescheduled', $adminId, 'appointment', $appointmentId, ['new_ends_at' => $newEnds, 'new_starts_at' => $newStarts, 'previous_ends_at' => $prevEnds, 'previous_starts_at' => $prevStarts, 'reason' => 'user requested'])";
    let caught = false;
    try {
        verifyAuditLoggerCall(badAuditCall);
    } catch {
        caught = true;
    }
    if (!caught) throw new Error("Failed to reject extra metadata in AuditLogger::log");
});

// =========================================================
// 4. PRODUCTION SOURCE LOADING & EXTRACTION
// =========================================================

console.log("--- Loading Production Sources (Fail-Closed) ---");

const controllerPath = path.resolve('api/controllers/AppointmentController.php');
const indexPath = path.resolve('api/index.php');
const auditLoggerPath = path.resolve('api/core/AuditLogger.php');
const migration035Path = path.resolve('database/migrations/035_create_appointments.sql');
const migration036Path = path.resolve('database/migrations/036_create_appointment_reschedules.sql');

if (!fs.existsSync(controllerPath)) throw new Error(`Missing required file: ${controllerPath}`);
if (!fs.existsSync(indexPath)) throw new Error(`Missing required file: ${indexPath}`);
if (!fs.existsSync(auditLoggerPath)) throw new Error(`Missing required file: ${auditLoggerPath}`);
if (!fs.existsSync(migration035Path)) throw new Error(`Missing required file: ${migration035Path}`);
if (!fs.existsSync(migration036Path)) throw new Error(`Missing required file: ${migration036Path}`);

const controllerSource = fs.readFileSync(controllerPath, 'utf8');
const indexSource = fs.readFileSync(indexPath, 'utf8');
const auditLoggerSource = fs.readFileSync(auditLoggerPath, 'utf8');
const migration035Source = fs.readFileSync(migration035Path, 'utf8');
const migration036Source = fs.readFileSync(migration036Path, 'utf8');

// Balanced extraction of handleReschedule
const handleRescheduleBlock = extractFunctionBlock(controllerSource, "private function handleReschedule(");
if (!handleRescheduleBlock) {
    throw new Error("FAIL: Could not extract handleReschedule method block from AppointmentController.php");
}

// Balanced extraction of public entry points
const rescheduleAdminBlock = extractFunctionBlock(controllerSource, "public function rescheduleAdminAppointment(");
const rescheduleReceptionBlock = extractFunctionBlock(controllerSource, "public function rescheduleReceptionAppointment(");
const rescheduleTrainerBlock = extractFunctionBlock(controllerSource, "public function rescheduleTrainerAppointment(");

if (!rescheduleAdminBlock) throw new Error("FAIL: Missing rescheduleAdminAppointment in AppointmentController.php");
if (!rescheduleReceptionBlock) throw new Error("FAIL: Missing rescheduleReceptionAppointment in AppointmentController.php");
if (!rescheduleTrainerBlock) throw new Error("FAIL: Missing rescheduleTrainerAppointment in AppointmentController.php");

// Route blocks extraction from api/index.php
function extractRouteBlockByRegex(indexSrc, regexPatternStr) {
    const idx = indexSrc.indexOf(regexPatternStr);
    if (idx === -1) return null;
    const ifIdx = indexSrc.lastIndexOf("if", idx);
    if (ifIdx === -1) return null;
    return extractBalanced(indexSrc, ifIdx, '{', '}');
}

const adminRouteBlock = extractRouteBlockByRegex(indexSource, '#^/api/admin/appointments/([1-9]\\d*)/reschedule$#');
const receptionRouteBlock = extractRouteBlockByRegex(indexSource, '#^/api/reception/appointments/([1-9]\\d*)/reschedule$#');
const trainerRouteBlock = extractRouteBlockByRegex(indexSource, '#^/api/trainer/appointments/([1-9]\\d*)/reschedule$#');

if (!adminRouteBlock) throw new Error("FAIL: Could not extract admin reschedule route block from api/index.php");
if (!receptionRouteBlock) throw new Error("FAIL: Could not extract reception reschedule route block from api/index.php");
if (!trainerRouteBlock) throw new Error("FAIL: Could not extract trainer reschedule route block from api/index.php");

console.log("--- Running Production Invariant Checks ---");

// =========================================================
// 5. PRODUCTION INVARIANT CHECKS
// =========================================================

checkInvariant("Exact Route Matrix: Admin route requires exact [super_admin, admin], PATCH method, and rescheduleAdminAppointment", () => {
    verifyRescheduleRoute(
        adminRouteBlock,
        /#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/reschedule\$\#/,
        ['super_admin', 'admin'],
        'rescheduleAdminAppointment'
    );
});

checkInvariant("Exact Route Matrix: Reception route requires exact [super_admin, admin, reception], PATCH method, and rescheduleReceptionAppointment", () => {
    verifyRescheduleRoute(
        receptionRouteBlock,
        /#\^\/api\/reception\/appointments\/\(\[1-9\]\\d\*\)\/reschedule\$\#/,
        ['super_admin', 'admin', 'reception'],
        'rescheduleReceptionAppointment'
    );
});

checkInvariant("Exact Route Matrix: Trainer route requires exact [trainer], PATCH method, and rescheduleTrainerAppointment", () => {
    verifyRescheduleRoute(
        trainerRouteBlock,
        /#\^\/api\/trainer\/appointments\/\(\[1-9\]\\d\*\)\/reschedule\$\#/,
        ['trainer'],
        'rescheduleTrainerAppointment'
    );
});

checkInvariant("Global CSRF: Mutation guard covers PATCH method before route dispatch without bypass", () => {
    const csrfIdx = indexSource.indexOf("CsrfMiddleware::handle()");
    if (csrfIdx === -1) throw new Error("Global CsrfMiddleware::handle() missing");
    const ifIdx = indexSource.lastIndexOf("if", csrfIdx);
    const guardBlock = extractBalanced(indexSource, ifIdx, '{', '}');
    if (!guardBlock) throw new Error("Failed to extract CSRF guard block");

    if (!guardBlock.includes("'PATCH'")) {
        throw new Error("CsrfMiddleware::handle() does not cover PATCH requests");
    }
    // Check no bypass for reschedule
    if (/reschedule/i.test(guardBlock)) {
        throw new Error("Illegal reschedule bypass detected in global CSRF guard");
    }
});

checkInvariant("Public Entry Methods: Reschedule methods exist exactly once as public, and handleReschedule as private", () => {
    const adminMatches = controllerSource.match(/public\s+function\s+rescheduleAdminAppointment\s*\(/g) || [];
    const receptionMatches = controllerSource.match(/public\s+function\s+rescheduleReceptionAppointment\s*\(/g) || [];
    const trainerMatches = controllerSource.match(/public\s+function\s+rescheduleTrainerAppointment\s*\(/g) || [];
    const handleMatches = controllerSource.match(/private\s+function\s+handleReschedule\s*\(/g) || [];

    if (adminMatches.length !== 1) throw new Error(`rescheduleAdminAppointment must appear exactly once, found ${adminMatches.length}`);
    if (receptionMatches.length !== 1) throw new Error(`rescheduleReceptionAppointment must appear exactly once, found ${receptionMatches.length}`);
    if (trainerMatches.length !== 1) throw new Error(`rescheduleTrainerAppointment must appear exactly once, found ${trainerMatches.length}`);
    if (handleMatches.length !== 1) throw new Error(`handleReschedule must appear exactly once, found ${handleMatches.length}`);
});

checkInvariant("Trainer Own-Scope Entry: rescheduleTrainerAppointment resolves trainer ID strictly from session admin ID", () => {
    verifyActorNormalizationCode(rescheduleTrainerBlock, 401, 'UNAUTHORIZED');

    if (!/getTrainerProfileId\(\s*\$adminId\s*\)/.test(rescheduleTrainerBlock)) {
        throw new Error("rescheduleTrainerAppointment must call getTrainerProfileId($adminId)");
    }
    if (!/handleReschedule\(\s*\$id\s*,\s*\$trainerId\s*\)/.test(rescheduleTrainerBlock)) {
        throw new Error("rescheduleTrainerAppointment must invoke handleReschedule($id, $trainerId)");
    }
    // Must not accept trainer_id from client input
    if (rescheduleTrainerBlock.includes("$_POST") || rescheduleTrainerBlock.includes("$_GET") || rescheduleTrainerBlock.includes("php://input")) {
        throw new Error("rescheduleTrainerAppointment must not read input directly (delegate to handleReschedule)");
    }
});

checkInvariant("Actor Normalization in handleReschedule: String numeric IDs normalized to int, invalid rejected with 401", () => {
    verifyActorNormalizationCode(handleRescheduleBlock, 401, 'UNAUTHORIZED');
});

checkInvariant("Query Rejection Contract: handleReschedule rejects query parameters with 422 VALIDATION_ERROR before body or transaction", () => {
    verifyQueryRejectionOrdering(handleRescheduleBlock);
});

checkInvariant("Exact Payload Contract: handleReschedule accepts only [ends_at, starts_at] as strings and rejects malformed JSON with 400", () => {
    verifyPayloadContract(handleRescheduleBlock, ['ends_at', 'starts_at']);
});

checkInvariant("Strict Datetime Rules: Strict Europe/Istanbul parsing, starts_at < ends_at, same calendar day, no future-only rule", () => {
    if (!handleRescheduleBlock.includes("parseWindowDate($data['starts_at'], 'starts_at')")) {
        throw new Error("handleReschedule must parse starts_at with parseWindowDate");
    }
    if (!handleRescheduleBlock.includes("parseWindowDate($data['ends_at'], 'ends_at')")) {
        throw new Error("handleReschedule must parse ends_at with parseWindowDate");
    }
    if (!/\$startsDt\s*>=\s*\$endsDt/.test(handleRescheduleBlock)) {
        throw new Error("handleReschedule must enforce $startsDt >= $endsDt check");
    }
    if (!/\$startsDt->format\('Y-m-d'\)\s*!==\s*\$endsDt->format\('Y-m-d'\)/.test(handleRescheduleBlock)) {
        throw new Error("handleReschedule must enforce same calendar day (Europe/Istanbul)");
    }
    // Prohibited rules
    if (/starts_at\s*>=\s*NOW/i.test(handleRescheduleBlock) || /\$startsDt\s*<=\s*new DateTime/.test(handleRescheduleBlock)) {
        throw new Error("Prohibited future-only restriction detected");
    }
    if (/UTC/i.test(handleRescheduleBlock)) {
        throw new Error("Prohibited UTC conversion detected");
    }
});

checkInvariant("Deterministic Transaction Ordering: handleReschedule enforces strict monotonic sequence of operations", () => {
    verifyRescheduleExecutionOrder(handleRescheduleBlock);
});

checkInvariant("Discovery Contract: Non-locking SELECT checks appointment existence, status, and forced trainer scope before lock", () => {
    const discMatch = handleRescheduleBlock.match(/SELECT\s+id,\s*uuid,\s*member_id,\s*trainer_id,\s*starts_at,\s*ends_at,\s*status\s+FROM\s+appointments\s+WHERE\s+id\s*=\s*\?/);
    if (!discMatch) {
        throw new Error("Discovery query missing or column list mismatch");
    }
    // Ensure discovery query does NOT have FOR UPDATE
    const discSnippet = handleRescheduleBlock.substring(handleRescheduleBlock.indexOf(discMatch[0]), handleRescheduleBlock.indexOf(";", handleRescheduleBlock.indexOf(discMatch[0])));
    if (/FOR\s+UPDATE/i.test(discSnippet)) {
        throw new Error("Discovery query must be non-locking (no FOR UPDATE)");
    }

    if (!handleRescheduleBlock.includes("Response::error('Appointment not found.', 'NOT_FOUND', 404)")) {
        throw new Error("Missing 404 NOT_FOUND on failed discovery");
    }
    if (!handleRescheduleBlock.includes("Response::error('Unauthorized trainer profile access.', 'FORBIDDEN', 403)")) {
        throw new Error("Missing 403 FORBIDDEN on forced trainer scope discovery mismatch");
    }
});

checkInvariant("Member Lock & Eligibility: FOR UPDATE lock verifies existence, active status, membership_end_date, and trainer scope", () => {
    const memQueryMatch = handleRescheduleBlock.match(/SELECT\s+id,\s*deleted_at,\s*status,\s*membership_end_date,\s*trainer_id\s+FROM\s+members\s+WHERE\s+id\s*=\s*\?\s+FOR\s+UPDATE/);
    if (!memQueryMatch) {
        throw new Error("Member lock query missing or column list mismatch");
    }

    if (!handleRescheduleBlock.includes("Response::error('Member is not active.', 'MEMBER_INELIGIBLE', 409)")) {
        throw new Error("Missing active status check on member");
    }
    if (!handleRescheduleBlock.includes("Response::error('Appointment date exceeds membership end date.', 'MEMBER_INELIGIBLE', 409)")) {
        throw new Error("Missing membership_end_date expiration check on member");
    }
    if (handleRescheduleBlock.includes("membership_start_date")) {
        throw new Error("Forbidden membership_start_date check in reschedule logic");
    }
    if (!handleRescheduleBlock.includes("Response::error('Trainer can only manage appointments for assigned members.', 'FORBIDDEN', 403)")) {
        throw new Error("Missing trainer assigned member check");
    }
});

checkInvariant("Trainer Lock & Eligibility: FOR UPDATE lock verifies existence, is_active=1, and forced trainer admin_id match", () => {
    const trainQueryMatch = handleRescheduleBlock.match(/SELECT\s+id,\s*deleted_at,\s*is_active,\s*admin_id\s+FROM\s+trainers\s+WHERE\s+id\s*=\s*\?\s+FOR\s+UPDATE/);
    if (!trainQueryMatch) {
        throw new Error("Trainer lock query missing or column list mismatch");
    }

    if (!handleRescheduleBlock.includes("Response::error('Trainer is inactive.', 'TRAINER_INELIGIBLE', 409)")) {
        throw new Error("Missing trainer is_active check");
    }
});

checkInvariant("Locked Appointment Revalidation: FOR UPDATE lock revalidates participants, scheduled-only, and no-op condition", () => {
    const appQueryMatch = handleRescheduleBlock.match(/SELECT\s+id,\s*uuid,\s*member_id,\s*trainer_id,\s*starts_at,\s*ends_at,\s*status\s+FROM\s+appointments\s+WHERE\s+id\s*=\s*\?\s+FOR\s+UPDATE/);
    if (!appQueryMatch) {
        throw new Error("Appointment lock query missing or column list mismatch");
    }

    if (!handleRescheduleBlock.includes("Response::error('Appointment participants have changed.', 'APPOINTMENT_CHANGED', 409)")) {
        throw new Error("Missing participant revalidation check");
    }
    if (!handleRescheduleBlock.includes("Response::error('Only scheduled appointments can be rescheduled.', 'APPOINTMENT_NOT_RESCHEDULABLE', 409)")) {
        throw new Error("Missing status === 'scheduled' revalidation check");
    }
    if (!handleRescheduleBlock.includes("Response::error('At least one time value must change.', 'VALIDATION_ERROR', 422)")) {
        throw new Error("Missing no-op time comparison check");
    }
});

checkInvariant("Conflict Exactness: Trainer conflict and Member conflict queries enforce id <> ?, strict overlap, and FOR UPDATE", () => {
    const tConfMatch = handleRescheduleBlock.match(/SELECT\s+id\s+FROM\s+appointments\s+WHERE\s+id\s*<>\s*\?\s+AND\s+trainer_id\s*=\s*\?\s+AND\s+status\s*=\s*'scheduled'\s+AND\s+starts_at\s*<\s*\?\s+AND\s+ends_at\s*>\s*\?\s+FOR\s+UPDATE/is);
    if (!tConfMatch) {
        throw new Error("Trainer conflict SQL query mismatch");
    }
    verifyConflictQuery(tConfMatch[0], 'trainer');

    const mConfMatch = handleRescheduleBlock.match(/SELECT\s+id\s+FROM\s+appointments\s+WHERE\s+id\s*<>\s*\?\s+AND\s+member_id\s*=\s*\?\s+AND\s+status\s*=\s*'scheduled'\s+AND\s+starts_at\s*<\s*\?\s+AND\s+ends_at\s*>\s*\?\s+FOR\s+UPDATE/is);
    if (!mConfMatch) {
        throw new Error("Member conflict SQL query mismatch");
    }
    verifyConflictQuery(mConfMatch[0], 'member');

    const tIdx = handleRescheduleBlock.indexOf("TRAINER_CONFLICT");
    const mIdx = handleRescheduleBlock.indexOf("MEMBER_CONFLICT");
    if (tIdx === -1 || mIdx === -1 || tIdx > mIdx) {
        throw new Error("Trainer conflict check must precede Member conflict check");
    }
});

checkInvariant("History Schema Parity & Atomicity: appointment_reschedules INSERT matches Migration 036 and precedes UPDATE", () => {
    // Migration 036 check
    if (!migration036Source.includes("CREATE TABLE IF NOT EXISTS `appointment_reschedules`")) {
        throw new Error("Migration 036 does not define appointment_reschedules table");
    }

    const histMatch = handleRescheduleBlock.match(/INSERT\s+INTO\s+appointment_reschedules\s*\([^)]+\)\s*VALUES\s*\([^)]+\)/is);
    if (!histMatch) {
        throw new Error("History INSERT statement missing in handleReschedule");
    }
    verifyHistoryInsert(histMatch[0]);

    // UUID helper check
    if (!handleRescheduleBlock.includes("$historyUuid = $this->generateUuid()")) {
        throw new Error("History record must use $this->generateUuid()");
    }

    // Must execute before appointment UPDATE
    const histIdx = handleRescheduleBlock.indexOf(histMatch[0]);
    const updIdx = handleRescheduleBlock.indexOf("UPDATE appointments");
    if (histIdx === -1 || updIdx === -1 || histIdx > updIdx) {
        throw new Error("History INSERT must be prepared and executed strictly before appointment UPDATE");
    }
});

checkInvariant("Exact Appointment UPDATE: Updates only starts_at, ends_at, updated_by and checks rowCount() === 0", () => {
    const updMatch = handleRescheduleBlock.match(/UPDATE\s+appointments\s+SET\s+starts_at\s*=\s*\?,\s*ends_at\s*=\s*\?,\s*updated_by\s*=\s*\?\s+WHERE\s+id\s*=\s*\?/is);
    if (!updMatch) {
        throw new Error("Appointment UPDATE statement mismatch");
    }
    verifyAppointmentUpdate(updMatch[0]);

    if (!handleRescheduleBlock.includes("$updStmt->rowCount() === 0")) {
        throw new Error("Missing rowCount() === 0 check on UPDATE");
    }
    if (!handleRescheduleBlock.includes("Response::error('Failed to update appointment.', 'INTERNAL_ERROR', 500)")) {
        throw new Error("Missing 500 INTERNAL_ERROR on rowCount() === 0");
    }
});

checkInvariant("Persisted-Row Contract: Post-update SELECT provides persisted values for HTTP 200 response", () => {
    const fetchSnippet = handleRescheduleBlock.match(/\$fetchStmt\s*=\s*\$this->db->prepare\("SELECT\s+id,\s*uuid,\s*member_id,\s*trainer_id,\s*starts_at,\s*ends_at,\s*status\s+FROM\s+appointments\s+WHERE\s+id\s*=\s*\?"\);/);
    if (!fetchSnippet) {
        throw new Error("Persisted appointment SELECT statement missing");
    }

    if (!handleRescheduleBlock.includes("Response::error('Failed to retrieve persisted appointment.', 'INTERNAL_ERROR', 500)")) {
        throw new Error("Missing 500 check on missing persisted row");
    }

    // Check response uses $persistedApp
    if (!handleRescheduleBlock.includes("'starts_at' => $persistedApp['starts_at']")) {
        throw new Error("Success response must source starts_at from $persistedApp");
    }
    if (!handleRescheduleBlock.includes("'ends_at' => $persistedApp['ends_at']")) {
        throw new Error("Success response must source ends_at from $persistedApp");
    }
});

checkInvariant("Commit-Before-Audit: Database commit occurs strictly before AuditLogger::log in isolated try/catch", () => {
    const commitIdx = handleRescheduleBlock.indexOf("$this->db->commit()");
    const auditIdx = handleRescheduleBlock.indexOf("AuditLogger::log");
    if (commitIdx === -1 || auditIdx === -1 || commitIdx > auditIdx) {
        throw new Error("db->commit() must strictly precede AuditLogger::log");
    }

    // Audit call verification
    const auditCallBlock = extractBalancedCall(handleRescheduleBlock, "AuditLogger::log");
    if (!auditCallBlock) throw new Error("Missing AuditLogger::log call in handleReschedule");
    verifyAuditLoggerCall(auditCallBlock);

    // Isolated catch must not rollback or call Response::error
    const auditTryIdx = handleRescheduleBlock.lastIndexOf("try", auditIdx);
    const auditCatchIdx = handleRescheduleBlock.indexOf("catch", auditIdx);
    const auditCatchBlock = extractBalanced(handleRescheduleBlock, auditCatchIdx, '{', '}');
    if (!auditCatchBlock) throw new Error("Failed to extract audit catch block");

    if (auditCatchBlock.includes("rollBack") || auditCatchBlock.includes("Response::error")) {
        throw new Error("Audit failure catch block must never roll back or return Response::error");
    }
});

checkInvariant("Outer Exception Safety: Catches Throwable, rolls back if inTransaction, returns generic 500 error", () => {
    const lastCatchIdx = handleRescheduleBlock.lastIndexOf("catch");
    const outerCatchBlock = extractBalanced(handleRescheduleBlock, lastCatchIdx, '{', '}');
    if (!outerCatchBlock) throw new Error("Failed to extract outer catch block");

    if (!outerCatchBlock.includes("$this->db->inTransaction()") || !outerCatchBlock.includes("$this->db->rollBack()")) {
        throw new Error("Outer catch must verify inTransaction and rollBack");
    }
    if (!outerCatchBlock.includes("Response::error('An unexpected error occurred.', 'INTERNAL_ERROR', 500)")) {
        throw new Error("Outer catch must return generic INTERNAL_ERROR 500 without leaking details");
    }
});

checkInvariant("Appointment Hard-Delete Prohibition: AppointmentController contains no hard-delete SQL on appointments", () => {
    if (/DELETE\s+FROM\s+`?appointments`?/i.test(controllerSource)) {
        throw new Error("AppointmentController contains prohibited hard-delete SQL on appointments table");
    }
});

checkInvariant("Temporary Artifact Absence: Repository contains no patch or temporary files", () => {
    const forbiddenArtifacts = [
        'patch.cjs',
        'patch.js',
        'patch_index.php',
        'AppointmentController.php.tmp',
        'AppointmentController.php.fixed'
    ];

    for (const art of forbiddenArtifacts) {
        if (fs.existsSync(path.resolve(art))) {
            throw new Error(`Forbidden temporary artifact exists in workspace: ${art}`);
        }
    }
});

// =========================================================
// SUMMARY & EXIT
// =========================================================

console.log("---------------------------------------------------------");
console.log(`Total Invariants: ${totalInvariants}`);
console.log(`Passed: ${passedInvariants}`);
console.log(`Failed: ${failedInvariants}`);
console.log("---------------------------------------------------------");

if (failedInvariants > 0) {
    console.error(`❌ Appointment Reschedule Final Verifier FAILED with ${failedInvariants} error(s).`);
    process.exit(1);
} else {
    console.log(`✅ Appointment Reschedule Final Verifier PASSED (All ${passedInvariants}/${totalInvariants} invariants verified).`);
    process.exit(0);
}
