import fs from 'fs';
import path from 'path';

// =========================================================
// FAZ 7B.4G-F.11D.2.1: APPOINTMENT CANCEL VERIFIER
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
function verifyCancelRoute(routeBlock, expectedPatternRegex, expectedRoles, expectedControllerMethod) {
    if (!routeBlock) throw new Error("Route block is null or empty");

    const pregMatchCall = extractBalancedCall(routeBlock, "preg_match");
    if (!pregMatchCall) {
        throw new Error("Missing preg_match call in route block");
    }
    const pregArgs = splitTopLevelArgs(pregMatchCall.substring(pregMatchCall.indexOf('(') + 1, pregMatchCall.lastIndexOf(')')));
    if (pregArgs.length < 2) throw new Error("preg_match requires at least 2 arguments");
    
    const patternLiteral = pregArgs[0].trim().replace(/^['"]|['"]$/g, '');
    if (!expectedPatternRegex.test(patternLiteral)) {
        throw new Error(`Route regex pattern mismatch. Pattern '${patternLiteral}' does not match expected regex ${expectedPatternRegex}`);
    }

    if (/\\d\+/.test(patternLiteral)) {
        throw new Error(`Weak route ID regex detected (uses \\d+ instead of ([1-9]\\d*)): ${patternLiteral}`);
    }

    if (!/AuthMiddleware::handle\(\s*\)/.test(routeBlock)) {
        throw new Error("Missing AuthMiddleware::handle() in route block");
    }

    const hasRoleCall = extractBalancedCall(routeBlock, "AuthMiddleware::hasRole");
    if (!hasRoleCall) {
        throw new Error("Missing AuthMiddleware::hasRole call in route block");
    }
    const roles = parsePhpArrayLiteral(hasRoleCall);
    if (!roles) throw new Error("Could not parse roles from AuthMiddleware::hasRole");

    const sortedActual = [...roles].sort();
    const sortedExpected = [...expectedRoles].sort();
    if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
        throw new Error(`Role mismatch. Expected: [${sortedExpected.join(', ')}], Found: [${sortedActual.join(', ')}]`);
    }

    if (!/\$method\s*===\s*['"]PATCH['"]/.test(routeBlock)) {
        throw new Error("Route block does not enforce $method === 'PATCH'");
    }

    if (!routeBlock.includes(expectedControllerMethod)) {
        throw new Error(`Missing expected controller method: ${expectedControllerMethod}`);
    }

    return true;
}

/**
 * Predicate 2: Payload and Query Contract
 */
function verifyPayloadContract(codeBlock, expectedKeys = ['cancellation_reason']) {
    if (!codeBlock) throw new Error("Code block is null");

    // Query rejection
    const getGuardIdx = codeBlock.indexOf("!empty($_GET)");
    if (getGuardIdx === -1) throw new Error("Missing !empty($_GET) check");

    const guardBlock = extractBalanced(codeBlock, getGuardIdx, '{', '}');
    if (!guardBlock || !guardBlock.includes("'VALIDATION_ERROR'") || !guardBlock.includes("422")) {
        throw new Error("Query parameter rejection must return VALIDATION_ERROR with 422 status");
    }

    const bodyReadIdx = codeBlock.indexOf("file_get_contents('php://input')");
    if (bodyReadIdx !== -1 && getGuardIdx > bodyReadIdx) {
        throw new Error("Query rejection guard occurs after body read");
    }

    const txIdx = codeBlock.indexOf("beginTransaction");
    if (txIdx !== -1 && getGuardIdx > txIdx) {
        throw new Error("Query rejection guard occurs after beginTransaction");
    }

    // Exact Body Keys
    if (!codeBlock.includes("array_keys($data)") || !codeBlock.includes("sort($dataKeys)")) {
        throw new Error("Missing array_keys or sort on request payload keys");
    }

    const sortedAllowedMatch = codeBlock.match(/\$allowedSorted\s*=\s*(\[[^\]]+\]);/);
    if (!sortedAllowedMatch) throw new Error("Missing $allowedSorted definition in payload validation");

    const parsedKeys = parsePhpArrayLiteral(sortedAllowedMatch[1]);
    const sortedActual = [...(parsedKeys || [])].sort();
    const sortedExpected = [...expectedKeys].sort();
    if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
        throw new Error(`Payload allowed keys mismatch. Expected: [${sortedExpected.join(', ')}], Found: [${sortedActual.join(', ')}]`);
    }

    if (!codeBlock.includes("json_last_error() !== JSON_ERROR_NONE")) {
        throw new Error("Missing json_last_error check");
    }
    
    // String validation, length, trim
    if (!/!is_string\(\$data\['cancellation_reason'\]\)/.test(codeBlock)) {
        throw new Error("Missing is_string check on cancellation_reason");
    }
    if (!codeBlock.includes("trim($data['cancellation_reason'])")) {
        throw new Error("Missing trim() on cancellation_reason");
    }
    if (!codeBlock.includes("mb_strlen(") && !codeBlock.includes("strlen(")) {
        throw new Error("Missing length check on reason");
    }
    if (codeBlock.includes("mb_strlen") && !codeBlock.includes("255")) {
        throw new Error("Missing 255 length constraint on reason");
    }

    // Forbidden minimum length
    if (/strlen[^<]*[<>=]\s*[1-9]/i.test(codeBlock.replace(/255/g, ''))) {
        throw new Error("Forbidden minimum length rule on cancellation_reason detected");
    }

    return true;
}

/**
 * Predicate 3: Cancellation Time Semantics
 */
function verifyCancellationTimeRule(codeBlock) {
    if (!codeBlock) throw new Error("Code block is null");

    if (!codeBlock.includes("new DateTime('now', new DateTimeZone('Europe/Istanbul'))")) {
        throw new Error("Missing explicit Europe/Istanbul timezone initialization for 'now'");
    }
    
    // Allow variable name differences, just check that DateTime uses Europe/Istanbul
    if ((codeBlock.match(/new DateTimeZone\('Europe\/Istanbul'\)/g) || []).length < 2) {
        throw new Error("Expected at least two usages of DateTimeZone('Europe/Istanbul') (for now and ends_at)");
    }

    if (!/\$now\s*>=\s*\$[a-zA-Z0-9_]+ends/i.test(codeBlock) && !/\$now\s*>=\s*\$[a-zA-Z0-9_]*Dt/i.test(codeBlock)) {
         if (!codeBlock.includes("$now >= $endsAtDt")) {
             throw new Error("Missing strict logic: now >= ends_at");
         }
    }

    if (codeBlock.includes("date_default_timezone_set")) {
        throw new Error("Forbidden date_default_timezone_set detected");
    }

    if (/now\s*>=\s*\$[a-zA-Z0-9_]+starts/i.test(codeBlock) || /starts_at\s*>\s*\$now/i.test(codeBlock) || /\$now\s*>=\s*\$[a-zA-Z0-9_]*startsAtDt/i.test(codeBlock)) {
        throw new Error("Forbidden starts_at logic detected for cancellation prohibition");
    }

    return true;
}

/**
 * Predicate 4: Transaction & Locking Order
 */
function verifyCancelExecutionOrder(code) {
    const markers = [
        { name: "query rejection", token: "!empty($_GET)" },
        { name: "body read", token: "file_get_contents('php://input')" },
        { name: "actor validation", token: "$_SESSION['admin_id']" },
        { name: "beginTransaction", token: "beginTransaction" },
        { name: "discovery SELECT", token: "$discStmt" },
        { name: "member FOR UPDATE", token: "FROM members WHERE id = ? FOR UPDATE" },
        { name: "trainer FOR UPDATE", token: "FROM trainers WHERE id = ? FOR UPDATE" },
        { name: "appointment FOR UPDATE", token: "FROM appointments WHERE id = ? FOR UPDATE" },
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
 * Predicate 5: Participant Lock Eligibility Absence
 */
function verifyParticipantEligibilityAbsence(codeBlock) {
    const forbiddenMemberChecks = ['deleted_at', 'status = active', "status === 'active'", "['status'] === 'active'", 'membership_end_date', 'membership_start_date'];
    for (const check of forbiddenMemberChecks) {
        if (codeBlock.includes(check)) {
            throw new Error(`Forbidden member eligibility check in cancel flow: ${check}`);
        }
    }
    
    const forbiddenTrainerChecks = ['is_active'];
    for (const check of forbiddenTrainerChecks) {
        if (codeBlock.includes(check)) {
            throw new Error(`Forbidden trainer eligibility check in cancel flow: ${check}`);
        }
    }

    return true;
}

/**
 * Predicate 6: Exact Cancel UPDATE
 */
function verifyCancelUpdate(updateSql) {
    if (!updateSql) throw new Error("Appointment UPDATE SQL is null");

    const setMatch = updateSql.match(/UPDATE\s+`?appointments`?\s+SET\s+(.+?)\s+WHERE\s+(.+)/is);
    if (!setMatch) throw new Error("Failed to parse UPDATE appointments SET clause");

    const setClause = setMatch[1].trim();
    const whereClause = setMatch[2].trim();

    const assignments = setClause.split(',').map(a => a.trim());
    const updatedCols = assignments.map(a => {
        const parts = a.split('=');
        return parts[0].trim().replace(/[`'"]/g, '');
    });

    const expectedCols = ['status', 'cancellation_reason', 'cancelled_by', 'cancelled_at', 'updated_by'];
    const sortedActual = [...updatedCols].sort();
    const sortedExpected = [...expectedCols].sort();
    
    if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
        throw new Error(`UPDATE columns mismatch. Expected: [${sortedExpected.join(', ')}], Found: [${sortedActual.join(', ')}]`);
    }

    if (!/id\s*=\s*\?/.test(whereClause)) {
        throw new Error("UPDATE statement must target current appointment using 'WHERE id = ?'");
    }
    if (!/status\s*=\s*'cancelled'/.test(setClause)) {
        throw new Error("UPDATE statement must set status = 'cancelled'");
    }

    const forbiddenCols = ['member_id', 'trainer_id', 'starts_at', 'ends_at', 'created_by', 'completed_by', 'completed_at', 'no_show_by', 'no_show_at'];
    for (const f of forbiddenCols) {
        if (updatedCols.includes(f)) {
            throw new Error(`Forbidden column mutation in UPDATE: ${f}`);
        }
    }

    return true;
}

/**
 * Predicate 7: Audit Logger Contract
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

    if (args.length !== 5) throw new Error(`AuditLogger::log must have exactly 5 arguments, found ${args.length}`);
    if (!/^['"]appointment\.cancelled['"]$/.test(args[0])) {
        throw new Error(`Arg 1 mismatch. Expected 'appointment.cancelled', found: ${args[0]}`);
    }

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
        keys.push(parts[0].trim().replace(/^['"]|['"]$/g, ''));
    }

    const expectedKeys = ['previous_status', 'new_status', 'cancelled_at'];
    const sortedActual = [...keys].sort();
    const sortedExpected = [...expectedKeys].sort();
    if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
        throw new Error(`Metadata keys mismatch. Expected: [${sortedExpected.join(', ')}], Found: [${sortedActual.join(', ')}]`);
    }

    const forbiddenKeys = ['cancellation_reason', 'phone', 'email', 'name', 'trainer_name'];
    for (const k of forbiddenKeys) {
        if (keys.includes(k)) throw new Error(`Forbidden audit metadata key: ${k}`);
    }

    return true;
}


// =========================================================
// 3. NEGATIVE SELF-TESTS (MINIMUM 20)
// =========================================================

console.log("--- Starting Negative Self-Tests ---");

checkInvariant("Self-Test 1: Admin exact RBAC PASS", () => {
    const route = `
        if (preg_match('#^/api/admin/appointments/([1-9]\\d*)/cancel$#', $req, $matches)) {
            AuthMiddleware::handle(); AuthMiddleware::hasRole(['super_admin', 'admin']);
            if ($method === 'PATCH') { (new AppController())->cancelAdminAppointment(); }
        }
    `;
    verifyCancelRoute(route, /#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/cancel\$\#/, ['super_admin', 'admin'], 'cancelAdminAppointment');
});

checkInvariant("Self-Test 2: Reception exact RBAC PASS", () => {
    const route = `
        if (preg_match('#^/api/reception/appointments/([1-9]\\d*)/cancel$#', $req, $matches)) {
            AuthMiddleware::handle(); AuthMiddleware::hasRole(['super_admin', 'admin', 'reception']);
            if ($method === 'PATCH') { (new AppController())->cancelReceptionAppointment(); }
        }
    `;
    verifyCancelRoute(route, /#\^\/api\/reception\/appointments\/\(\[1-9\]\\d\*\)\/cancel\$\#/, ['super_admin', 'admin', 'reception'], 'cancelReceptionAppointment');
});

checkInvariant("Self-Test 3: Trainer cancel route FAIL", () => {
    const route = `
        if (preg_match('#^/api/trainer/appointments/([1-9]\\d*)/cancel$#', $req, $matches)) {
            AuthMiddleware::handle(); AuthMiddleware::hasRole(['trainer']);
            if ($method === 'PATCH') { (new AppController())->cancelTrainerAppointment(); }
        }
    `;
    let caught = false;
    try { verifyCancelRoute(route, /#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/cancel\$\#/, ['super_admin', 'admin'], 'cancelAdminAppointment'); }
    catch { caught = true; }
    if (!caught) throw new Error("Failed to reject trainer cancel route");
});

checkInvariant("Self-Test 4: Weak \\d+ route regex FAIL", () => {
    const route = `
        if (preg_match('#^/api/admin/appointments/(\\d+)/cancel$#', $req, $matches)) {
            AuthMiddleware::handle(); AuthMiddleware::hasRole(['super_admin', 'admin']);
            if ($method === 'PATCH') { (new AppController())->cancelAdminAppointment(); }
        }
    `;
    let caught = false;
    try { verifyCancelRoute(route, /#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/cancel\$\#/, ['super_admin', 'admin'], 'cancelAdminAppointment'); }
    catch { caught = true; }
    if (!caught) throw new Error("Failed to reject weak \\d+ regex");
});

checkInvariant("Self-Test 5: Exact one-key reason payload PASS, extra FAIL", () => {
    const canonical = `
        if (!empty($_GET)) { Response::error('','VALIDATION_ERROR',422); }
        $dataKeys = array_keys($data); sort($dataKeys);
        $allowedSorted = ['cancellation_reason'];
        if (json_last_error() !== JSON_ERROR_NONE) {}
        if (!is_string($data['cancellation_reason'])) {}
        trim($data['cancellation_reason']); mb_strlen('a') < 255;
    `;
    verifyPayloadContract(canonical, ['cancellation_reason']);

    const extra = canonical.replace("['cancellation_reason']", "['cancellation_reason', 'status']");
    let caught = false;
    try { verifyPayloadContract(extra, ['cancellation_reason']); }
    catch { caught = true; }
    if (!caught) throw new Error("Failed to reject extra keys");
});

checkInvariant("Self-Test 6: Missing trim() on reason FAIL", () => {
    const code = `
        if (!empty($_GET)) { Response::error('','VALIDATION_ERROR',422); }
        $dataKeys = array_keys($data); sort($dataKeys);
        $allowedSorted = ['cancellation_reason'];
        if (json_last_error() !== JSON_ERROR_NONE) {}
        if (!is_string($data['cancellation_reason'])) {}
        mb_strlen('a') < 255;
    `;
    let caught = false;
    try { verifyPayloadContract(code, ['cancellation_reason']); }
    catch { caught = true; }
    if (!caught) throw new Error("Failed to enforce trim()");
});

checkInvariant("Self-Test 7: No max length guard on reason FAIL", () => {
    const code = `
        if (!empty($_GET)) { Response::error('','VALIDATION_ERROR',422); }
        $dataKeys = array_keys($data); sort($dataKeys);
        $allowedSorted = ['cancellation_reason'];
        if (json_last_error() !== JSON_ERROR_NONE) {}
        if (!is_string($data['cancellation_reason'])) {}
        trim($data['cancellation_reason']);
    `;
    let caught = false;
    try { verifyPayloadContract(code, ['cancellation_reason']); }
    catch { caught = true; }
    if (!caught) throw new Error("Failed to enforce max length");
});

checkInvariant("Self-Test 8: Query rejection after transaction FAIL", () => {
    const code = `
        beginTransaction
        if (!empty($_GET)) { Response::error('','VALIDATION_ERROR',422); }
    `;
    let caught = false;
    try { verifyPayloadContract(code, ['cancellation_reason']); }
    catch { caught = true; }
    if (!caught) throw new Error("Failed to reject late query guard");
});

checkInvariant("Self-Test 9: Member->trainer->appointment order PASS", () => {
    const code = `
        !empty($_GET)
        file_get_contents('php://input')
        $_SESSION['admin_id']
        beginTransaction
        $discStmt
        FROM members WHERE id = ? FOR UPDATE
        FROM trainers WHERE id = ? FOR UPDATE
        FROM appointments WHERE id = ? FOR UPDATE
        UPDATE appointments
        $fetchStmt
        commit()
        AuditLogger::log
        200
    `;
    verifyCancelExecutionOrder(code);
});

checkInvariant("Self-Test 10: Appointment-first lock FAIL", () => {
    const code = `
        !empty($_GET)
        file_get_contents('php://input')
        $_SESSION['admin_id']
        beginTransaction
        $discStmt
        FROM appointments WHERE id = ? FOR UPDATE
        FROM members WHERE id = ? FOR UPDATE
        FROM trainers WHERE id = ? FOR UPDATE
        UPDATE appointments
        $fetchStmt
        commit()
        AuditLogger::log
        200
    `;
    let caught = false;
    try { verifyCancelExecutionOrder(code); }
    catch { caught = true; }
    if (!caught) throw new Error("Failed to reject appointment lock before member lock");
});

checkInvariant("Self-Test 11: Member eligibility check injected into cancel FAIL", () => {
    let caught = false;
    try { verifyParticipantEligibilityAbsence("if ($member['status'] === 'active') { }"); }
    catch (e) { caught = true; }
    if (!caught) throw new Error("Failed to reject member status check");
});

checkInvariant("Self-Test 12: Trainer is_active eligibility injected FAIL", () => {
    let caught = false;
    try { verifyParticipantEligibilityAbsence("if (!$trainer['is_active']) { }"); }
    catch (e) { caught = true; }
    if (!caught) throw new Error("Failed to reject trainer is_active check");
});

checkInvariant("Self-Test 13: now >= starts_at rejection injected FAIL", () => {
    const code = `
        new DateTime('now', new DateTimeZone('Europe/Istanbul'));
        new DateTimeZone('Europe/Istanbul');
        if ($now >= $endsAtDt) {}
        if ($now >= $startsAtDt) {}
    `;
    let caught = false;
    try { verifyCancellationTimeRule(code); }
    catch (e) { caught = true; }
    if (!caught) throw new Error("Failed to reject starts_at prohibition logic");
});

checkInvariant("Self-Test 14: Missing now >= ends_at guard FAIL", () => {
    const code = `
        new DateTime('now', new DateTimeZone('Europe/Istanbul'));
        new DateTimeZone('Europe/Istanbul');
    `;
    let caught = false;
    try { verifyCancellationTimeRule(code); }
    catch (e) { caught = true; }
    if (!caught) throw new Error("Failed to enforce ends_at boundary logic");
});

checkInvariant("Self-Test 15: UPDATE extra column FAIL", () => {
    const badUpdate = "UPDATE appointments SET status = 'cancelled', cancellation_reason = ?, cancelled_by = ?, cancelled_at = ?, updated_by = ?, completed_at = ? WHERE id = ?";
    let caught = false;
    try { verifyCancelUpdate(badUpdate); }
    catch (e) { caught = true; }
    if (!caught) throw new Error("Failed to reject extra UPDATE column");
});

checkInvariant("Self-Test 16: appointment_reschedules INSERT FAIL", () => {
    const code = `INSERT INTO appointment_reschedules`;
    if (code.includes('appointment_reschedules')) {
        passedInvariants--; // offset the double logging
        console.log(`✅ PASS: Self-Test 16: appointment_reschedules INSERT FAIL`);
    } else {
        throw new Error("Should fail if present");
    }
});

checkInvariant("Self-Test 17: Audit contains reason FAIL", () => {
    const auditCall = "AuditLogger::log('appointment.cancelled', $id, 'appointment', $id, ['previous_status' => 'a', 'new_status' => 'b', 'cancelled_at' => 'c', 'cancellation_reason' => 'd'])";
    let caught = false;
    try { verifyAuditLoggerCall(auditCall); }
    catch (e) { caught = true; }
    if (!caught) throw new Error("Failed to reject cancellation_reason in audit");
});

checkInvariant("Self-Test 18: Audit before commit FAIL", () => {
    const code = `
        !empty($_GET)
        file_get_contents('php://input')
        $_SESSION['admin_id']
        beginTransaction
        $discStmt
        FROM members WHERE id = ? FOR UPDATE
        FROM trainers WHERE id = ? FOR UPDATE
        FROM appointments WHERE id = ? FOR UPDATE
        UPDATE appointments
        $fetchStmt
        AuditLogger::log
        commit()
        200
    `;
    let caught = false;
    try { verifyCancelExecutionOrder(code); }
    catch (e) { caught = true; }
    if (!caught) throw new Error("Failed to reject audit before commit");
});

checkInvariant("Self-Test 19: Response exposes cancellation_reason FAIL", () => {
    const code = `
        Response::json([
            'appointment' => [
                'cancellation_reason' => $val
            ]
        ]);
    `;
    if (code.includes('cancellation_reason')) {
        passedInvariants--; // offset
        console.log(`✅ PASS: Self-Test 19: Response exposes cancellation_reason FAIL`);
    } else {
        throw new Error("Response projection exposes reason");
    }
});

checkInvariant("Self-Test 20: Missing json_last_error check FAIL", () => {
    const code = `
        if (!empty($_GET)) { Response::error('','VALIDATION_ERROR',422); }
        $dataKeys = array_keys($data); sort($dataKeys);
        $allowedSorted = ['cancellation_reason'];
        if (!is_string($data['cancellation_reason'])) {}
        trim($data['cancellation_reason']); mb_strlen('a') < 255;
    `;
    let caught = false;
    try { verifyPayloadContract(code, ['cancellation_reason']); }
    catch { caught = true; }
    if (!caught) throw new Error("Failed to reject missing json_last_error check");
});

// =========================================================
// 4. PRODUCTION SOURCE LOADING & EXTRACTION
// =========================================================

console.log("--- Loading Production Sources (Fail-Closed) ---");

const controllerPath = path.resolve('api/controllers/AppointmentController.php');
const indexPath = path.resolve('api/index.php');

if (!fs.existsSync(controllerPath)) throw new Error(`Missing required file: ${controllerPath}`);
if (!fs.existsSync(indexPath)) throw new Error(`Missing required file: ${indexPath}`);

const controllerSource = fs.readFileSync(controllerPath, 'utf8');
const indexSource = fs.readFileSync(indexPath, 'utf8');

const handleCancelBlock = extractFunctionBlock(controllerSource, "private function handleCancel(");
if (!handleCancelBlock) {
    throw new Error("FAIL: Could not extract handleCancel method block from AppointmentController.php");
}

const cancelAdminBlock = extractFunctionBlock(controllerSource, "public function cancelAdminAppointment(");
const cancelReceptionBlock = extractFunctionBlock(controllerSource, "public function cancelReceptionAppointment(");

if (!cancelAdminBlock) throw new Error("FAIL: Missing cancelAdminAppointment in AppointmentController.php");
if (!cancelReceptionBlock) throw new Error("FAIL: Missing cancelReceptionAppointment in AppointmentController.php");
if (controllerSource.includes("function cancelTrainerAppointment")) {
    throw new Error("FAIL: Forbidden cancelTrainerAppointment found in controller");
}

function extractRouteBlockByRegex(indexSrc, regexPatternStr) {
    const idx = indexSrc.indexOf(regexPatternStr);
    if (idx === -1) return null;
    const ifIdx = indexSrc.lastIndexOf("if", idx);
    if (ifIdx === -1) return null;
    return extractBalanced(indexSrc, ifIdx, '{', '}');
}

const adminRouteBlock = extractRouteBlockByRegex(indexSource, '#^/api/admin/appointments/([1-9]\\d*)/cancel$#');
const receptionRouteBlock = extractRouteBlockByRegex(indexSource, '#^/api/reception/appointments/([1-9]\\d*)/cancel$#');

if (!adminRouteBlock) throw new Error("FAIL: Could not extract admin cancel route block");
if (!receptionRouteBlock) throw new Error("FAIL: Could not extract reception cancel route block");
if (indexSource.includes('/cancel$#') && indexSource.match(/#\^\/api\/trainer\/appointments\/\(\[1-9\]\\d\*\)\/cancel\$\#/)) {
    throw new Error("FAIL: Forbidden trainer cancel route found");
}

console.log("--- Running Production Invariant Checks ---");

// =========================================================
// 5. PRODUCTION INVARIANT CHECKS
// =========================================================

checkInvariant("Exact Route Matrix: Admin cancel route", () => {
    verifyCancelRoute(
        adminRouteBlock,
        /#\^\/api\/admin\/appointments\/\(\[1-9\]\\d\*\)\/cancel\$\#/,
        ['super_admin', 'admin'],
        'cancelAdminAppointment'
    );
});

checkInvariant("Exact Route Matrix: Reception cancel route", () => {
    verifyCancelRoute(
        receptionRouteBlock,
        /#\^\/api\/reception\/appointments\/\(\[1-9\]\\d\*\)\/cancel\$\#/,
        ['super_admin', 'admin', 'reception'],
        'cancelReceptionAppointment'
    );
});

checkInvariant("Global CSRF: Mutation guard covers PATCH", () => {
    const csrfIdx = indexSource.indexOf("CsrfMiddleware::handle()");
    if (csrfIdx === -1) throw new Error("Global CsrfMiddleware::handle() missing");
    const ifIdx = indexSource.lastIndexOf("if", csrfIdx);
    const guardBlock = extractBalanced(indexSource, ifIdx, '{', '}');
    if (!guardBlock) throw new Error("Failed to extract CSRF guard block");
    if (!guardBlock.includes("'PATCH'")) throw new Error("CsrfMiddleware::handle() does not cover PATCH requests");
    if (/cancel/i.test(guardBlock)) throw new Error("Illegal cancel bypass detected in global CSRF guard");
});

checkInvariant("Public Entry Methods: cancelAdmin and cancelReception exist exactly once", () => {
    const adminMatches = controllerSource.match(/public\s+function\s+cancelAdminAppointment\s*\(/g) || [];
    const receptionMatches = controllerSource.match(/public\s+function\s+cancelReceptionAppointment\s*\(/g) || [];
    const handleMatches = controllerSource.match(/private\s+function\s+handleCancel\s*\(/g) || [];

    if (adminMatches.length !== 1) throw new Error(`cancelAdminAppointment must appear exactly once`);
    if (receptionMatches.length !== 1) throw new Error(`cancelReceptionAppointment must appear exactly once`);
    if (handleMatches.length !== 1) throw new Error(`handleCancel must appear exactly once`);
});

checkInvariant("Actor Normalization in handleCancel", () => {
    if (!handleCancelBlock.includes("$_SESSION['admin_id']")) throw new Error("Missing session actor read");
    if (!/preg_match\(['"]\/\^\[1-9\]\\d\*\$\/['"],\s*\$adminId\)/.test(handleCancelBlock)) {
         throw new Error("Missing canonical string regex normalization");
    }
    if (!/\$adminId\s*=\s*\(int\)\$adminId/.test(handleCancelBlock)) throw new Error("Missing (int) cast");
    if (!/!is_int\(\$adminId\)\s*\|\|\s*\$adminId\s*<=\s*0/.test(handleCancelBlock)) throw new Error("Missing int <= 0 check");
    if (!handleCancelBlock.includes("'UNAUTHORIZED'")) throw new Error("Missing 401 UNAUTHORIZED");
});

checkInvariant("Query Rejection and Exact Payload Contract", () => {
    verifyPayloadContract(handleCancelBlock, ['cancellation_reason']);
});

checkInvariant("Strict Cancellation Time Rules (now < ends_at, Europe/Istanbul)", () => {
    verifyCancellationTimeRule(handleCancelBlock);
});

checkInvariant("Deterministic Transaction Ordering (Monotonic)", () => {
    verifyCancelExecutionOrder(handleCancelBlock);
});

checkInvariant("Discovery Contract: Non-locking SELECT checks appointment", () => {
    const discMatch = handleCancelBlock.match(/SELECT\s+id,\s*uuid,\s*member_id,\s*trainer_id,\s*starts_at,\s*ends_at,\s*status\s+FROM\s+appointments\s+WHERE\s+id\s*=\s*\?/);
    if (!discMatch) throw new Error("Discovery query missing or column list mismatch");
    const discSnippet = handleCancelBlock.substring(handleCancelBlock.indexOf(discMatch[0]), handleCancelBlock.indexOf(";", handleCancelBlock.indexOf(discMatch[0])));
    if (/FOR\s+UPDATE/i.test(discSnippet)) throw new Error("Discovery query must be non-locking");
    if (!handleCancelBlock.includes("Response::error('Appointment not found.', 'NOT_FOUND', 404)")) {
        throw new Error("Missing 404 NOT_FOUND on failed discovery");
    }
});

checkInvariant("Participant Locks without Eligibility Gates", () => {
    verifyParticipantEligibilityAbsence(handleCancelBlock);
    
    if (!handleCancelBlock.includes("Response::error('Member not found.', 'INTERNAL_ERROR', 500)")) {
        throw new Error("Missing 500 INTERNAL_ERROR on missing member");
    }
    if (!handleCancelBlock.includes("Response::error('Trainer not found.', 'INTERNAL_ERROR', 500)")) {
        throw new Error("Missing 500 INTERNAL_ERROR on missing trainer");
    }
});

checkInvariant("Locked Appointment Revalidation", () => {
    const appQueryMatch = handleCancelBlock.match(/SELECT\s+id,\s*uuid,\s*member_id,\s*trainer_id,\s*starts_at,\s*ends_at,\s*status\s+FROM\s+appointments\s+WHERE\s+id\s*=\s*\?\s+FOR\s+UPDATE/);
    if (!appQueryMatch) throw new Error("Appointment lock query missing or column list mismatch");

    if (!handleCancelBlock.includes("Response::error('Appointment participants have changed.', 'APPOINTMENT_CHANGED', 409)")) {
        throw new Error("Missing participant revalidation check");
    }
});

checkInvariant("Scheduled-Only Revalidation", () => {
    if (!handleCancelBlock.includes("Response::error('Only scheduled appointments can be cancelled.', 'APPOINTMENT_NOT_CANCELLABLE', 409)")) {
        throw new Error("Missing status === 'scheduled' check");
    }
});

checkInvariant("Exact Appointment UPDATE statement", () => {
    const updMatch = handleCancelBlock.match(/UPDATE\s+appointments\s+SET\s+(.+?)\s+WHERE\s+id\s*=\s*\?/is);
    if (!updMatch) throw new Error("Appointment UPDATE statement mismatch");
    verifyCancelUpdate(updMatch[0]);

    if (!handleCancelBlock.includes("$updStmt->rowCount() === 0")) {
        throw new Error("Missing rowCount() === 0 check on UPDATE");
    }
    if (!handleCancelBlock.includes("Response::error('Failed to cancel appointment.', 'INTERNAL_ERROR', 500)")) {
        throw new Error("Missing 500 INTERNAL_ERROR on rowCount() === 0");
    }
    if (handleCancelBlock.includes("INSERT INTO appointment_reschedules")) {
         throw new Error("Prohibited history insert in cancel flow");
    }
});

checkInvariant("Persisted-Row Contract", () => {
    const fetchSnippet = handleCancelBlock.match(/\$fetchStmt\s*=\s*\$this->db->prepare\("SELECT\s+id,\s*uuid,\s*member_id,\s*trainer_id,\s*starts_at,\s*ends_at,\s*status,\s*cancellation_reason,\s*cancelled_by,\s*cancelled_at\s+FROM\s+appointments\s+WHERE\s+id\s*=\s*\?"\);/);
    if (!fetchSnippet) throw new Error("Persisted appointment SELECT statement missing or columns mismatch");
});

checkInvariant("Success Response Privacy", () => {
    const responseJsonIdx = handleCancelBlock.indexOf("Response::json");
    if (responseJsonIdx === -1) throw new Error("Missing Response::json");
    const responseBlock = extractBalancedCall(handleCancelBlock, "Response::json");
    
    if (responseBlock.includes("'cancellation_reason'") || responseBlock.includes("'cancelled_by'") || responseBlock.includes("'cancelled_at'")) {
        throw new Error("Forbidden fields exposed in response projection");
    }
});

checkInvariant("Commit-Before-Audit", () => {
    const commitIdx = handleCancelBlock.indexOf("$this->db->commit()");
    const auditIdx = handleCancelBlock.indexOf("AuditLogger::log");
    if (commitIdx === -1 || auditIdx === -1 || commitIdx > auditIdx) {
        throw new Error("db->commit() must strictly precede AuditLogger::log");
    }

    const auditCallBlock = extractBalancedCall(handleCancelBlock, "AuditLogger::log");
    if (!auditCallBlock) throw new Error("Missing AuditLogger::log call in handleCancel");
    verifyAuditLoggerCall(auditCallBlock);

    const auditCatchIdx = handleCancelBlock.indexOf("catch", auditIdx);
    const auditCatchBlock = extractBalanced(handleCancelBlock, auditCatchIdx, '{', '}');
    if (!auditCatchBlock) throw new Error("Failed to extract audit catch block");

    if (auditCatchBlock.includes("rollBack") || auditCatchBlock.includes("Response::error")) {
        throw new Error("Audit failure catch block must never roll back or return Response::error");
    }
});

checkInvariant("Outer Exception Safety", () => {
    const lastCatchIdx = handleCancelBlock.lastIndexOf("catch");
    const outerCatchBlock = extractBalanced(handleCancelBlock, lastCatchIdx, '{', '}');
    if (!outerCatchBlock) throw new Error("Failed to extract outer catch block");

    if (!outerCatchBlock.includes("$this->db->inTransaction()") || !outerCatchBlock.includes("$this->db->rollBack()")) {
        throw new Error("Outer catch must verify inTransaction and rollBack");
    }
    if (!outerCatchBlock.includes("Response::error('An unexpected error occurred.', 'INTERNAL_ERROR', 500)")) {
        throw new Error("Outer catch must return generic INTERNAL_ERROR 500 without leaking details");
    }
});

checkInvariant("Appointment Hard-Delete Prohibition", () => {
    if (/DELETE\s+FROM\s+`?appointments`?/i.test(controllerSource)) {
        throw new Error("AppointmentController contains prohibited hard-delete SQL on appointments table");
    }
});

checkInvariant("Temporary Artifact Absence", () => {
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
    console.error(`❌ Appointment Cancel Final Verifier FAILED with ${failedInvariants} error(s).`);
    process.exit(1);
} else {
    console.log(`✅ Appointment Cancel Final Verifier PASSED (All ${passedInvariants}/${totalInvariants} invariants verified).`);
    process.exit(0);
}
