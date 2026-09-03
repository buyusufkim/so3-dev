import fs from 'fs';
import path from 'path';

// =========================================================
// FAZ 7B.4G-F.11D.0: APPOINTMENT READ/CREATE VERIFIER (PHASE-BOUNDARY ADAPTED)
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

/**
 * Parses balanced brackets/parentheses/braces skipping comments and quoted strings.
 * Supports openChar: '{', '(', '[' and matching closeChar: '}', ')', ']'.
 */
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

        // Line comment handling
        if (inLineComment) {
            if (c === '\n' || c === '\r') {
                inLineComment = false;
            }
            continue;
        }

        // Block comment handling
        if (inBlockComment) {
            if (c === '*' && next === '/') {
                inBlockComment = false;
                i++;
            }
            continue;
        }

        // Single quote string
        if (inSingleQuote) {
            if (c === '\\') {
                i++; // skip escaped char
            } else if (c === "'") {
                inSingleQuote = false;
            }
            continue;
        }

        // Double quote string
        if (inDoubleQuote) {
            if (c === '\\') {
                i++; // skip escaped char
            } else if (c === '"') {
                inDoubleQuote = false;
            }
            continue;
        }

        // Backtick string
        if (inBacktick) {
            if (c === '\\') {
                i++;
            } else if (c === '`') {
                inBacktick = false;
            }
            continue;
        }

        // Check start of comment
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

        // Check start of string
        if (c === "'") {
            inSingleQuote = true;
            continue;
        }
        if (c === '"') {
            inDoubleQuote = true;
            continue;
        }
        if (c === '`') {
            inBacktick = true;
            continue;
        }

        // Delimiter counting
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

/**
 * Extracts a function block by searching for its signature and finding the outer balanced '{' ... '}'.
 */
function extractFunctionBlock(code, signature) {
    const idx = code.indexOf(signature);
    if (idx === -1) return null;
    return extractBalanced(code, idx, '{', '}');
}

/**
 * Extracts balanced call arguments e.g. AuditLogger::log(...) or AuthMiddleware::hasRole(...)
 */
function extractBalancedCall(code, prefix) {
    const idx = code.indexOf(prefix);
    if (idx === -1) return null;
    const parenIdx = code.indexOf('(', idx + prefix.length);
    if (parenIdx === -1) return null;
    return extractBalanced(code, idx, '(', ')');
}

/**
 * Splits top-level arguments of a comma-separated call while respecting quotes, brackets, parens, and comments.
 */
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
            if (c === '\\') {
                if (i + 1 < argsContent.length) { cur += argsContent[++i]; }
            } else if (c === "'") {
                inSingleQuote = false;
            }
            continue;
        }
        if (inDoubleQuote) {
            cur += c;
            if (c === '\\') {
                if (i + 1 < argsContent.length) { cur += argsContent[++i]; }
            } else if (c === '"') {
                inDoubleQuote = false;
            }
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
        if (c === "'") {
            inSingleQuote = true;
            cur += c;
            continue;
        }
        if (c === '"') {
            inDoubleQuote = true;
            cur += c;
            continue;
        }

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

/**
 * Extracts array elements from PHP array notation e.g. ['a', 'b', 'c']
 */
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
        // match 'val' or "val"
        const match = trimmed.match(/^['"]([^'"]+)['"]$/);
        if (match) {
            result.push(match[1]);
        } else {
            result.push(trimmed);
        }
    }
    return result;
}

/**
 * Extracts array key-value pairs from PHP array syntax like ['k1' => v1, 'k2' => v2]
 */
function parsePhpAssociativeArrayKeys(arrayStr) {
    const openBracket = arrayStr.indexOf('[');
    const closeBracket = arrayStr.lastIndexOf(']');
    if (openBracket === -1 || closeBracket === -1 || closeBracket <= openBracket) return null;
    const inner = arrayStr.substring(openBracket + 1, closeBracket).trim();
    if (!inner) return [];

    const rawPairs = splitTopLevelArgs(inner);
    const keys = [];
    for (const pair of rawPairs) {
        const parts = pair.split('=>');
        if (parts.length < 2) return null;
        const keyPart = parts[0].trim();
        const keyMatch = keyPart.match(/^['"]([^'"]+)['"]$/);
        if (keyMatch) {
            keys.push(keyMatch[1]);
        } else {
            keys.push(keyPart);
        }
    }
    return keys;
}

// =========================================================
// PREDICATES USED BOTH IN PRODUCTION & SELF-TESTS
// =========================================================

/**
 * Predicate 1: Exact RBAC set parser
 */
function verifyRouteRbacAndMethod(routeBlock, expectedRoles, expectedMethod) {
    if (!routeBlock) throw new Error("Route block is null or empty");

    // 1. Must call AuthMiddleware::handle()
    if (!/AuthMiddleware::handle\(\s*\)/.test(routeBlock)) {
        throw new Error("Missing AuthMiddleware::handle() in route block");
    }

    // 2. Extract AuthMiddleware::hasRole([...])
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

    // 3. Controller method check
    if (!routeBlock.includes(expectedMethod)) {
        throw new Error(`Missing expected controller call: ${expectedMethod}`);
    }

    return true;
}

/**
 * Predicate 2: Real global CSRF verification
 */
function verifyGlobalCsrf(indexSource) {
    // Look for mutation guard pattern:
    // if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) { CsrfMiddleware::handle(); }
    const csrfCallIdx = indexSource.indexOf("CsrfMiddleware::handle()");
    if (csrfCallIdx === -1) {
        throw new Error("Global CsrfMiddleware::handle() call not found");
    }

    // Find the enclosing if statement before this call
    const ifIdx = indexSource.lastIndexOf("if", csrfCallIdx);
    if (ifIdx === -1) {
        throw new Error("CsrfMiddleware::handle() is not enclosed in an if condition");
    }

    const guardBlock = extractBalanced(indexSource, ifIdx, '{', '}');
    if (!guardBlock || !guardBlock.includes("CsrfMiddleware::handle()")) {
        throw new Error("Failed to extract balanced CSRF mutation guard block");
    }

    // Verify required mutation methods are present
    const reqMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    for (const m of reqMethods) {
        const re = new RegExp(`['"]${m}['"]`);
        if (!re.test(guardBlock)) {
            throw new Error(`Global CSRF mutation guard misses HTTP method: ${m}`);
        }
    }

    // Verify guard occurs BEFORE route dispatch ($routes definition or lookup)
    const routesIdx = indexSource.indexOf("$routes");
    if (routesIdx !== -1 && ifIdx > routesIdx) {
        throw new Error("Global CSRF guard occurs after route definition/dispatch");
    }

    return true;
}

/**
 * Predicate 3: POST query rejection contract in handleCreate
 */
function verifyPostQueryRejection(handleCreateBlock) {
    if (!handleCreateBlock) throw new Error("handleCreate block is null");

    // Must check !empty($_GET)
    const getGuardIdx = handleCreateBlock.indexOf("!empty($_GET)");
    if (getGuardIdx === -1) {
        throw new Error("Missing !empty($_GET) check in handleCreate");
    }

    const guardBlock = extractBalanced(handleCreateBlock, getGuardIdx, '{', '}');
    if (!guardBlock) {
        throw new Error("Could not extract !empty($_GET) block");
    }

    // Must error with VALIDATION_ERROR and 422
    if (!guardBlock.includes("'VALIDATION_ERROR'") || !guardBlock.includes("422")) {
        throw new Error("Query parameter rejection must return VALIDATION_ERROR with 422 status");
    }

    // Must occur BEFORE input reading and transactions
    const bodyReadIdx = handleCreateBlock.indexOf("file_get_contents('php://input')");
    const jsonDecodeIdx = handleCreateBlock.indexOf("json_decode");
    const beginTxIdx = handleCreateBlock.indexOf("beginTransaction");

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
 * Predicate 4: Exact create payload sets
 */
function verifyCreatePayloadSet(methodBlock, expectedKeys) {
    if (!methodBlock) throw new Error("Method block is null");

    // Extract the call to handleCreate([...])
    const callBlock = extractBalancedCall(methodBlock, "handleCreate");
    if (!callBlock) {
        throw new Error("Missing handleCreate call in create method block");
    }

    // Extract inner array argument
    const inner = callBlock.substring(callBlock.indexOf('(') + 1, callBlock.lastIndexOf(')'));
    const args = splitTopLevelArgs(inner);
    if (args.length === 0) throw new Error("handleCreate has no arguments");

    const parsedKeys = parsePhpArrayLiteral(args[0]);
    if (!parsedKeys) throw new Error("Could not parse payload keys array");

    const sortedActual = [...parsedKeys].sort();
    const sortedExpected = [...expectedKeys].sort();

    if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
        throw new Error(`Payload keys mismatch. Expected: [${sortedExpected.join(', ')}], Found: [${sortedActual.join(', ')}]`);
    }

    return true;
}

/**
 * Predicate 5: Overlap SQL operators
 */
function verifyOverlapSql(sqlString) {
    // Must be strictly starts_at < ? AND ends_at > ? (or with table alias a.)
    const canonicalRe = /(?:a\.)?starts_at\s*<\s*\?\s*AND\s*(?:a\.)?ends_at\s*>\s*\?/;
    if (!canonicalRe.test(sqlString)) {
        throw new Error("SQL overlap must strictly use 'starts_at < ? AND ends_at > ?'");
    }

    // Forbidden operators
    if (/BETWEEN/i.test(sqlString)) {
        throw new Error("Forbidden BETWEEN operator in overlap logic");
    }
    if (/starts_at\s*<=|ends_at\s*>=/.test(sqlString)) {
        throw new Error("Forbidden <= or >= operator in overlap logic");
    }

    return true;
}

/**
 * Predicate 6: Monotonic execution ordering in handleCreate
 */
function verifyCreateExecutionOrder(code) {
    const markers = [
        { name: "POST query rejection", token: "!empty($_GET)" },
        { name: "body read", token: "file_get_contents('php://input')" },
        { name: "actor validation", token: "$_SESSION['admin_id']" },
        { name: "beginTransaction", token: "beginTransaction" },
        { name: "member FOR UPDATE", token: "FROM members WHERE id = ? FOR UPDATE" },
        { name: "trainer FOR UPDATE", token: "FROM trainers WHERE id = ? FOR UPDATE" },
        { name: "trainer conflict SELECT", token: "trainer_id = ? AND status = 'scheduled'" },
        { name: "member conflict SELECT", token: "member_id = ? AND status = 'scheduled'" },
        { name: "INSERT appointments", token: "INSERT INTO appointments" },
        { name: "lastInsertId", token: "lastInsertId" },
        { name: "persisted SELECT", token: "SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?" },
        { name: "persisted-missing guard", token: "Failed to retrieve persisted appointment" },
        { name: "commit", token: "commit()" },
        { name: "AuditLogger", token: "AuditLogger::log" },
        { name: "HTTP 201 success", token: "201" }
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
 * Predicate 7: Read projection privacy
 */
function verifyReadProjectionPrivacy(selectSqlAndMapping) {
    const forbidden = [
        'phone', 'email', 'emergency_contact', 'blood_group',
        'membership_start_date', 'membership_end_date', 'notes',
        'measurement', 'progress_note', 'password', 'credentials', 'audit_metadata'
    ];

    for (const f of forbidden) {
        const re = new RegExp(`\\b${f}\\b`, 'i');
        if (re.test(selectSqlAndMapping)) {
            throw new Error(`Forbidden private field in read projection: ${f}`);
        }
    }

    // Required fields check
    const required = [
        'a.id', 'a.uuid', 'a.starts_at', 'a.ends_at', 'a.status',
        'm.id', 'm.uuid', 'm.first_name', 'm.last_name',
        't.id', 't.uuid', 't.name'
    ];
    for (const r of required) {
        if (!selectSqlAndMapping.includes(r)) {
            throw new Error(`Missing required projection field: ${r}`);
        }
    }

    return true;
}

/**
 * Predicate 8: Secure UUID implementation
 */
function verifySecureUuid(uuidFuncBlock, entireController) {
    if (!uuidFuncBlock) throw new Error("generateUuid block missing");

    if (!uuidFuncBlock.includes("random_bytes(16)")) {
        throw new Error("generateUuid must use random_bytes(16)");
    }
    if (!/0x0f\s*\|\s*0x40/.test(uuidFuncBlock)) {
        throw new Error("generateUuid must set version 4 bit mask (0x0f | 0x40)");
    }
    if (!/0x3f\s*\|\s*0x80/.test(uuidFuncBlock)) {
        throw new Error("generateUuid must set variant bit mask (0x3f | 0x80)");
    }
    if (!uuidFuncBlock.includes("bin2hex")) {
        throw new Error("generateUuid must use bin2hex");
    }

    if (/mt_rand|uniqid|rand\(/.test(entireController)) {
        throw new Error("Forbidden pseudo-random generator found in AppointmentController");
    }

    return true;
}

/**
 * Predicate 9: Exact AuditLogger call parser
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

    // Arg 1: 'appointment.created'
    if (!/^['"]appointment\.created['"]$/.test(args[0])) {
        throw new Error(`Arg 1 mismatch. Expected 'appointment.created', found: ${args[0]}`);
    }

    // Arg 2: $adminId (variable, not a string or object)
    if (!/^\$adminId\b/.test(args[1])) {
        throw new Error(`Arg 2 mismatch. Expected $adminId, found: ${args[1]}`);
    }

    // Arg 3: 'appointment'
    if (!/^['"]appointment['"]$/.test(args[2])) {
        throw new Error(`Arg 3 mismatch. Expected 'appointment', found: ${args[2]}`);
    }

    // Arg 4: $appId
    if (!/^\$appId\b/.test(args[3])) {
        throw new Error(`Arg 4 mismatch. Expected $appId, found: ${args[3]}`);
    }

    // Arg 5: Metadata array with exact keys
    const metaKeys = parsePhpAssociativeArrayKeys(args[4]);
    if (!metaKeys) {
        throw new Error("Arg 5 could not be parsed as PHP associative array");
    }

    const expectedKeys = ['ends_at', 'member_id', 'starts_at', 'trainer_id'].sort();
    const actualKeys = [...metaKeys].sort();

    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
        throw new Error(`Audit metadata keys mismatch. Expected: [${expectedKeys.join(', ')}], Found: [${actualKeys.join(', ')}]`);
    }

    // Check for forbidden PDO injection in call
    if (auditCallBlock.includes("$this->db") || auditCallBlock.includes("PDO")) {
        throw new Error("Forbidden PDO connection passed into AuditLogger call");
    }

    return true;
}

/**
 * Predicate 10: Appointment No-Delete Contract
 * Verifies that neither controller nor router implements hard or soft deletion for appointments.
 */
function verifyAppointmentNoDelete(controllerSource, indexSource = '') {
    // 1. Hard delete SQL statement
    if (/DELETE\s+FROM\s+appointments/i.test(controllerSource)) {
        throw new Error("Forbidden DELETE FROM appointments in controller");
    }
    if (/DELETE\s+FROM\s+appointments/i.test(indexSource)) {
        throw new Error("Forbidden DELETE FROM appointments in router (index.php)");
    }

    // 2. Delete / destroy appointment methods
    if (/\b(?:deleteAppointment|destroyAppointment)\b/i.test(controllerSource)) {
        throw new Error("Forbidden deleteAppointment or destroyAppointment method in controller");
    }
    if (/\b(?:deleteAppointment|destroyAppointment)\b/i.test(indexSource)) {
        throw new Error("Forbidden deleteAppointment or destroyAppointment method in router");
    }

    // 3. DELETE HTTP routes for appointments
    const deleteIdx = indexSource.indexOf("'DELETE' =>");
    if (deleteIdx !== -1) {
        const deleteSection = extractBalanced(indexSource, deleteIdx, '[', ']');
        if (deleteSection && /appointments/i.test(deleteSection)) {
            throw new Error("Forbidden appointment route in DELETE HTTP section of router");
        }
    }
    if (/DELETE['"]?\s*=>\s*\[[^\]]*appointments/is.test(indexSource)) {
        throw new Error("Forbidden appointment route in DELETE HTTP map");
    }
    if (/\$method\s*===\s*['"]DELETE['"][^;]*appointments/i.test(indexSource)) {
        throw new Error("Forbidden DELETE appointment dispatch in router");
    }

    // 4. Soft-delete appointment mutation
    // appointments table has no deleted_at column; updating deleted_at or status='deleted' on appointments is forbidden
    if (/UPDATE\s+appointments\b[^;]*\bdeleted_at\b/i.test(controllerSource)) {
        throw new Error("Forbidden soft-delete appointment mutation (deleted_at) in controller");
    }
    if (/UPDATE\s+appointments\b[^;]*\bdeleted_at\b/i.test(indexSource)) {
        throw new Error("Forbidden soft-delete appointment mutation (deleted_at) in router");
    }
    if (/UPDATE\s+appointments\b[^;]*status\s*=\s*['"]deleted['"]/i.test(controllerSource)) {
        throw new Error("Forbidden soft-delete appointment status ('deleted') in controller");
    }

    return true;
}

/**
 * Predicate 11: Required Read/Create Public Surface
 * Verifies that the controller defines the 6 required read/create public entry methods exactly once.
 * Allows optional __construct and allows future public lifecycle methods.
 */
function verifyRequiredPublicSurface(controllerSource) {
    if (!controllerSource) throw new Error("Controller source is null or empty");

    const requiredMethods = [
        'getAdminAppointments',
        'createAdminAppointment',
        'getReceptionAppointments',
        'createReceptionAppointment',
        'getTrainerAppointments',
        'createTrainerAppointment'
    ];

    // Find all public methods in the controller
    const pubRegex = /public\s+function\s+(\w+)\s*\(/g;
    let match;
    const publicMethodCounts = {};
    while ((match = pubRegex.exec(controllerSource)) !== null) {
        const methodName = match[1];
        publicMethodCounts[methodName] = (publicMethodCounts[methodName] || 0) + 1;
    }

    // Check if any required method exists as private or protected
    const nonPublicRegex = /(?:private|protected)\s+function\s+(\w+)\s*\(/g;
    let nonPubMatch;
    const nonPublicMethods = new Set();
    while ((nonPubMatch = nonPublicRegex.exec(controllerSource)) !== null) {
        nonPublicMethods.add(nonPubMatch[1]);
    }

    for (const req of requiredMethods) {
        if (nonPublicMethods.has(req)) {
            throw new Error(`Required method '${req}' is declared as private or protected`);
        }
        const count = publicMethodCounts[req] || 0;
        if (count === 0) {
            throw new Error(`Required public method '${req}' is missing or renamed`);
        }
        if (count > 1) {
            throw new Error(`Required public method '${req}' is duplicated (${count} declarations found)`);
        }
    }

    return true;
}

// =========================================================
// 2. NEGATIVE SELF-TESTS (USING REAL PRODUCTION PREDICATES)
// =========================================================

checkInvariant('Self-Test 1: String/comment-safe balanced extractor handles quotes and comments', () => {
    const synthetic = `
        function testFoo() {
            $str1 = "closing brace } inside string";
            $str2 = 'another { brace';
            // Comment with { and }
            /* Multi-line
               comment with } and { */
            if (true) {
                return ['nested' => [1, 2, 3]];
            }
        }
        function other() {}
    `;
    const extracted = extractFunctionBlock(synthetic, "function testFoo(");
    if (!extracted) throw new Error("Failed to extract block");
    if (!extracted.includes("return ['nested' => [1, 2, 3]];")) {
        throw new Error("Extracted block was cut short by strings/comments");
    }
    if (extracted.includes("function other()")) {
        throw new Error("Extracted block over-extended");
    }
});

checkInvariant('Self-Test 2: Exact RBAC set parser accepts canonical and rejects extra/missing roles', () => {
    const canonicalAdmin = `
        AuthMiddleware::handle();
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        (new Controller())->getAdminAppointments();
    `;
    verifyRouteRbacAndMethod(canonicalAdmin, ['super_admin', 'admin'], 'getAdminAppointments()');

    const adminWithEditor = `
        AuthMiddleware::handle();
        AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
        (new Controller())->getAdminAppointments();
    `;
    let editorFailed = false;
    try {
        verifyRouteRbacAndMethod(adminWithEditor, ['super_admin', 'admin'], 'getAdminAppointments()');
    } catch {
        editorFailed = true;
    }
    if (!editorFailed) throw new Error("Failed to reject admin + editor");

    const onlyAdmin = `
        AuthMiddleware::handle();
        AuthMiddleware::hasRole(['admin']);
        (new Controller())->getAdminAppointments();
    `;
    let onlyAdminFailed = false;
    try {
        verifyRouteRbacAndMethod(onlyAdmin, ['super_admin', 'admin'], 'getAdminAppointments()');
    } catch {
        onlyAdminFailed = true;
    }
    if (!onlyAdminFailed) throw new Error("Failed to reject missing super_admin");

    const receptionCanonical = `
        AuthMiddleware::handle();
        AuthMiddleware::hasRole(['admin', 'reception', 'super_admin']);
        (new Controller())->getReceptionAppointments();
    `;
    verifyRouteRbacAndMethod(receptionCanonical, ['super_admin', 'admin', 'reception'], 'getReceptionAppointments()');

    const trainerWithAdmin = `
        AuthMiddleware::handle();
        AuthMiddleware::hasRole(['trainer', 'admin']);
        (new Controller())->getTrainerAppointments();
    `;
    let trainerAdminFailed = false;
    try {
        verifyRouteRbacAndMethod(trainerWithAdmin, ['trainer'], 'getTrainerAppointments()');
    } catch {
        trainerAdminFailed = true;
    }
    if (!trainerAdminFailed) throw new Error("Failed to reject trainer + admin");
});

checkInvariant('Self-Test 3: Real global CSRF verification detects missing methods, missing handle, or late dispatch', () => {
    const goodIndex = `
        $method = $_SERVER['REQUEST_METHOD'];
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            CsrfMiddleware::handle();
        }
        $routes = ['POST' => []];
    `;
    verifyGlobalCsrf(goodIndex);

    const missingPost = `
        if (in_array($method, ['PUT', 'PATCH', 'DELETE'])) {
            CsrfMiddleware::handle();
        }
        $routes = [];
    `;
    let postFailed = false;
    try { verifyGlobalCsrf(missingPost); } catch { postFailed = true; }
    if (!postFailed) throw new Error("Failed to reject missing POST in global CSRF");

    const missingHandle = `
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            // no handle call
        }
        $routes = [];
    `;
    let handleFailed = false;
    try { verifyGlobalCsrf(missingHandle); } catch { handleFailed = true; }
    if (!handleFailed) throw new Error("Failed to reject missing handle call in global CSRF");

    const lateCsrf = `
        $routes = ['POST' => []];
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            CsrfMiddleware::handle();
        }
    `;
    let lateFailed = false;
    try { verifyGlobalCsrf(lateCsrf); } catch { lateFailed = true; }
    if (!lateFailed) throw new Error("Failed to reject late CSRF guard");
});

checkInvariant('Self-Test 4: POST query rejection ordering and status codes', () => {
    const canonical = `
        private function handleCreate($keys) {
            if (!empty($_GET)) {
                Response::error('Query not allowed', 'VALIDATION_ERROR', 422);
            }
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            $this->db->beginTransaction();
        }
    `;
    verifyPostQueryRejection(canonical);

    const afterTx = `
        private function handleCreate($keys) {
            $input = file_get_contents('php://input');
            $this->db->beginTransaction();
            if (!empty($_GET)) {
                Response::error('Query not allowed', 'VALIDATION_ERROR', 422);
            }
        }
    `;
    let afterTxFailed = false;
    try { verifyPostQueryRejection(afterTx); } catch { afterTxFailed = true; }
    if (!afterTxFailed) throw new Error("Failed to reject query check placed after transaction");

    const wrongStatus = `
        private function handleCreate($keys) {
            if (!empty($_GET)) {
                Response::error('Query not allowed', 'VALIDATION_ERROR', 400);
            }
            $input = file_get_contents('php://input');
        }
    `;
    let wrongStatusFailed = false;
    try { verifyPostQueryRejection(wrongStatus); } catch { wrongStatusFailed = true; }
    if (!wrongStatusFailed) throw new Error("Failed to reject wrong status code (400 instead of 422)");

    const missingGuard = `
        private function handleCreate($keys) {
            $input = file_get_contents('php://input');
        }
    `;
    let missingFailed = false;
    try { verifyPostQueryRejection(missingGuard); } catch { missingFailed = true; }
    if (!missingFailed) throw new Error("Failed to reject missing $_GET guard");
});

checkInvariant('Self-Test 5: Exact create payload sets reject extra or missing fields', () => {
    const adminGood = `
        public function createAdmin() {
            $this->handleCreate(['member_id', 'trainer_id', 'starts_at', 'ends_at']);
        }
    `;
    verifyCreatePayloadSet(adminGood, ['member_id', 'trainer_id', 'starts_at', 'ends_at']);

    const adminWithStatus = `
        public function createAdmin() {
            $this->handleCreate(['member_id', 'trainer_id', 'starts_at', 'ends_at', 'status']);
        }
    `;
    let statusFailed = false;
    try { verifyCreatePayloadSet(adminWithStatus, ['member_id', 'trainer_id', 'starts_at', 'ends_at']); } catch { statusFailed = true; }
    if (!statusFailed) throw new Error("Failed to reject extra status key");

    const adminWithNotes = `
        public function createAdmin() {
            $this->handleCreate(['member_id', 'trainer_id', 'starts_at', 'ends_at', 'notes']);
        }
    `;
    let notesFailed = false;
    try { verifyCreatePayloadSet(adminWithNotes, ['member_id', 'trainer_id', 'starts_at', 'ends_at']); } catch { notesFailed = true; }
    if (!notesFailed) throw new Error("Failed to reject extra notes key");

    const trainerWithTrainerId = `
        public function createTrainer() {
            $this->handleCreate(['member_id', 'starts_at', 'ends_at', 'trainer_id'], $trainerId);
        }
    `;
    let trainerIdFailed = false;
    try { verifyCreatePayloadSet(trainerWithTrainerId, ['member_id', 'starts_at', 'ends_at']); } catch { trainerIdFailed = true; }
    if (!trainerIdFailed) throw new Error("Failed to reject trainer_id in trainer payload");
});

checkInvariant('Self-Test 6: Overlap SQL operators reject <=, >=, and BETWEEN', () => {
    verifyOverlapSql("SELECT id FROM appointments WHERE a.starts_at < ? AND a.ends_at > ?");
    verifyOverlapSql("SELECT id FROM appointments WHERE starts_at < ? AND ends_at > ?");

    let lteFailed = false;
    try { verifyOverlapSql("starts_at <= ? AND ends_at >= ?"); } catch { lteFailed = true; }
    if (!lteFailed) throw new Error("Failed to reject <= and >=");

    let betweenFailed = false;
    try { verifyOverlapSql("starts_at BETWEEN ? AND ?"); } catch { betweenFailed = true; }
    if (!betweenFailed) throw new Error("Failed to reject BETWEEN");
});

checkInvariant('Self-Test 7: Monotonic execution ordering rejects transposed operations', () => {
    const canonicalOrder = `
        if (!empty($_GET)) {}
        file_get_contents('php://input');
        $_SESSION['admin_id'];
        $this->db->beginTransaction();
        $this->db->prepare("SELECT id, deleted_at, status, membership_end_date, trainer_id FROM members WHERE id = ? FOR UPDATE");
        $this->db->prepare("SELECT id, deleted_at, is_active, admin_id FROM trainers WHERE id = ? FOR UPDATE");
        $this->db->prepare("trainer_id = ? AND status = 'scheduled' FOR UPDATE");
        $this->db->prepare("member_id = ? AND status = 'scheduled' FOR UPDATE");
        $this->db->prepare("INSERT INTO appointments");
        $this->db->lastInsertId();
        $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
        throw new Exception("Failed to retrieve persisted appointment");
        $this->db->commit();
        AuditLogger::log();
        Response::json([], 201);
    `;
    verifyCreateExecutionOrder(canonicalOrder);

    // Trainer lock before member lock
    const trainerFirst = canonicalOrder.replace("FROM members WHERE id = ? FOR UPDATE", "PLACEHOLDER_MEM")
        .replace("FROM trainers WHERE id = ? FOR UPDATE", "FROM members WHERE id = ? FOR UPDATE")
        .replace("PLACEHOLDER_MEM", "FROM trainers WHERE id = ? FOR UPDATE");
    let trOrderFailed = false;
    try { verifyCreateExecutionOrder(trainerFirst); } catch { trOrderFailed = true; }
    if (!trOrderFailed) throw new Error("Failed to reject trainer lock before member lock");

    // Commit before persisted fetch
    const commitEarly = canonicalOrder.replace("Failed to retrieve persisted appointment", "TEMP")
        .replace("$this->db->commit();", "Failed to retrieve persisted appointment")
        .replace("TEMP", "$this->db->commit();");
    let commitEarlyFailed = false;
    try { verifyCreateExecutionOrder(commitEarly); } catch { commitEarlyFailed = true; }
    if (!commitEarlyFailed) throw new Error("Failed to reject commit before persisted fetch");

    // Audit before commit
    const auditEarly = canonicalOrder.replace("$this->db->commit();", "TEMP")
        .replace("AuditLogger::log();", "$this->db->commit();")
        .replace("TEMP", "AuditLogger::log();");
    let auditEarlyFailed = false;
    try { verifyCreateExecutionOrder(auditEarly); } catch { auditEarlyFailed = true; }
    if (!auditEarlyFailed) throw new Error("Failed to reject audit before commit");
});

checkInvariant('Self-Test 8: Read projection privacy rejects phone, email, etc.', () => {
    const canonicalProjection = `
        SELECT 
            a.id, a.uuid, a.starts_at, a.ends_at, a.status,
            m.id, m.uuid, m.first_name, m.last_name,
            t.id, t.uuid, t.name
        FROM appointments a
    `;
    verifyReadProjectionPrivacy(canonicalProjection);

    let phoneFailed = false;
    try { verifyReadProjectionPrivacy(canonicalProjection + ", m.phone"); } catch { phoneFailed = true; }
    if (!phoneFailed) throw new Error("Failed to reject phone in read projection");

    let emailFailed = false;
    try { verifyReadProjectionPrivacy(canonicalProjection + ", t.email"); } catch { emailFailed = true; }
    if (!emailFailed) throw new Error("Failed to reject email in read projection");
});

checkInvariant('Self-Test 9: Secure UUID helper rejects mt_rand and missing bitmasks', () => {
    const goodHelper = `
        private function generateUuid() {
            $data = random_bytes(16);
            $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
            $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
            return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
        }
    `;
    verifySecureUuid(goodHelper, goodHelper);

    const mtRandHelper = `
        private function generateUuid() {
            return sprintf('%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff));
        }
    `;
    let mtRandFailed = false;
    try { verifySecureUuid(mtRandHelper, mtRandHelper); } catch { mtRandFailed = true; }
    if (!mtRandFailed) throw new Error("Failed to reject mt_rand UUID generator");
});

checkInvariant('Self-Test 10: Exact AuditLogger call parser rejects extra keys, bad args, or PDO injection', () => {
    const canonicalCall = `
        AuditLogger::log(
            'appointment.created',
            $adminId,
            'appointment',
            $appId,
            [
                'member_id' => (int)$persistedApp['member_id'],
                'trainer_id' => (int)$persistedApp['trainer_id'],
                'starts_at' => $persistedApp['starts_at'],
                'ends_at' => $persistedApp['ends_at']
            ]
        )
    `;
    verifyAuditLoggerCall(canonicalCall);

    // 6th argument (e.g. PDO injection)
    const sixthArgCall = `
        AuditLogger::log(
            'appointment.created',
            $adminId,
            'appointment',
            $appId,
            [
                'member_id' => (int)$persistedApp['member_id'],
                'trainer_id' => (int)$persistedApp['trainer_id'],
                'starts_at' => $persistedApp['starts_at'],
                'ends_at' => $persistedApp['ends_at']
            ],
            $this->db
        )
    `;
    let sixthArgFailed = false;
    try { verifyAuditLoggerCall(sixthArgCall); } catch { sixthArgFailed = true; }
    if (!sixthArgFailed) throw new Error("Failed to reject 6th argument in AuditLogger call");

    // Extra metadata key (email)
    const emailMetaCall = `
        AuditLogger::log(
            'appointment.created',
            $adminId,
            'appointment',
            $appId,
            [
                'member_id' => (int)$persistedApp['member_id'],
                'trainer_id' => (int)$persistedApp['trainer_id'],
                'starts_at' => $persistedApp['starts_at'],
                'ends_at' => $persistedApp['ends_at'],
                'email' => 'bad@test.com'
            ]
        )
    `;
    let emailFailed = false;
    try { verifyAuditLoggerCall(emailMetaCall); } catch { emailFailed = true; }
    if (!emailFailed) throw new Error("Failed to reject email in audit metadata");

    // Description string in place of $adminId
    const wrongArg2Call = `
        AuditLogger::log(
            'appointment.created',
            'Created new appointment',
            'appointment',
            $appId,
            [
                'member_id' => 1,
                'trainer_id' => 2,
                'starts_at' => '2026-09-01 10:00:00',
                'ends_at' => '2026-09-01 11:00:00'
            ]
        )
    `;
    let wrongArg2Failed = false;
    try { verifyAuditLoggerCall(wrongArg2Call); } catch { wrongArg2Failed = true; }
    if (!wrongArg2Failed) throw new Error("Failed to reject description string at adminId position");

    // Missing required metadata key (ends_at)
    const missingKeyCall = `
        AuditLogger::log(
            'appointment.created',
            $adminId,
            'appointment',
            $appId,
            [
                'member_id' => 1,
                'trainer_id' => 2,
                'starts_at' => '2026-09-01 10:00:00'
            ]
        )
    `;
    let missingKeyFailed = false;
    try { verifyAuditLoggerCall(missingKeyCall); } catch { missingKeyFailed = true; }
    if (!missingKeyFailed) throw new Error("Failed to reject missing ends_at in audit metadata");
});

checkInvariant('Self-Test 11 (Phase Boundary A): Additional lifecycle public method allowed in controller', () => {
    const synthetic = `
        class AppointmentController {
            public function __construct() {}
            public function getAdminAppointments() {}
            public function createAdminAppointment() {}
            public function getReceptionAppointments() {}
            public function createReceptionAppointment() {}
            public function getTrainerAppointments() {}
            public function createTrainerAppointment() {}
            public function rescheduleAdminAppointment() {}
            public function cancelReceptionAppointment() {}
        }
    `;
    verifyRequiredPublicSurface(synthetic);
});

checkInvariant('Self-Test 12 (Phase Boundary B): Required public read/create method missing or non-public fails verification', () => {
    const missingGetAdmin = `
        class AppointmentController {
            public function __construct() {}
            public function createAdminAppointment() {}
            public function getReceptionAppointments() {}
            public function createReceptionAppointment() {}
            public function getTrainerAppointments() {}
            public function createTrainerAppointment() {}
        }
    `;
    let failed = false;
    try { verifyRequiredPublicSurface(missingGetAdmin); } catch { failed = true; }
    if (!failed) throw new Error("Failed to reject missing getAdminAppointments");

    const privateGetTrainer = `
        class AppointmentController {
            public function getAdminAppointments() {}
            public function createAdminAppointment() {}
            public function getReceptionAppointments() {}
            public function createReceptionAppointment() {}
            private function getTrainerAppointments() {}
            public function createTrainerAppointment() {}
        }
    `;
    let privateFailed = false;
    try { verifyRequiredPublicSurface(privateGetTrainer); } catch { privateFailed = true; }
    if (!privateFailed) throw new Error("Failed to reject private getTrainerAppointments");
});

checkInvariant('Self-Test 13 (Phase Boundary C): Required public read/create method duplicate fails verification', () => {
    const duplicateCreateAdmin = `
        class AppointmentController {
            public function getAdminAppointments() {}
            public function createAdminAppointment() {}
            public function createAdminAppointment() {}
            public function getReceptionAppointments() {}
            public function createReceptionAppointment() {}
            public function getTrainerAppointments() {}
            public function createTrainerAppointment() {}
        }
    `;
    let failed = false;
    try { verifyRequiredPublicSurface(duplicateCreateAdmin); } catch { failed = true; }
    if (!failed) throw new Error("Failed to reject duplicated createAdminAppointment");
});

checkInvariant('Self-Test 14 (Phase Boundary D): Lifecycle route coexistence with six canonical read/create routes', () => {
    const syntheticIndex = `
        $routes = [
            'GET' => [
                '/api/admin/appointments' => function() {
                    AuthMiddleware::handle();
                    AuthMiddleware::hasRole(['super_admin', 'admin']);
                    (new AppointmentController())->getAdminAppointments();
                },
                '/api/reception/appointments' => function() {
                    AuthMiddleware::handle();
                    AuthMiddleware::hasRole(['super_admin', 'admin', 'reception']);
                    (new AppointmentController())->getReceptionAppointments();
                },
                '/api/trainer/appointments' => function() {
                    AuthMiddleware::handle();
                    AuthMiddleware::hasRole(['trainer']);
                    (new AppointmentController())->getTrainerAppointments();
                },
            ],
            'POST' => [
                '/api/admin/appointments' => function() {
                    AuthMiddleware::handle();
                    AuthMiddleware::hasRole(['super_admin', 'admin']);
                    (new AppointmentController())->createAdminAppointment();
                },
                '/api/reception/appointments' => function() {
                    AuthMiddleware::handle();
                    AuthMiddleware::hasRole(['super_admin', 'admin', 'reception']);
                    (new AppointmentController())->createReceptionAppointment();
                },
                '/api/trainer/appointments' => function() {
                    AuthMiddleware::handle();
                    AuthMiddleware::hasRole(['trainer']);
                    (new AppointmentController())->createTrainerAppointment();
                },
            ],
            'PATCH' => [
                '/api/admin/appointments/{id}/reschedule' => function() {
                    AuthMiddleware::handle();
                    AuthMiddleware::hasRole(['super_admin', 'admin']);
                    (new AppointmentController())->rescheduleAdminAppointment();
                }
            ]
        ];
    `;
    const getSec = extractBalanced(syntheticIndex, syntheticIndex.indexOf("'GET' =>"), '[', ']');
    const postSec = extractBalanced(syntheticIndex, syntheticIndex.indexOf("'POST' =>"), '[', ']');

    const gAdmin = extractRouteClosure(getSec, '/api/admin/appointments');
    const pAdmin = extractRouteClosure(postSec, '/api/admin/appointments');
    const gRecep = extractRouteClosure(getSec, '/api/reception/appointments');
    const pRecep = extractRouteClosure(postSec, '/api/reception/appointments');
    const gTrain = extractRouteClosure(getSec, '/api/trainer/appointments');
    const pTrain = extractRouteClosure(postSec, '/api/trainer/appointments');

    if (!gAdmin || !pAdmin || !gRecep || !pRecep || !gTrain || !pTrain) {
        throw new Error("Failed to extract canonical read/create routes in presence of lifecycle route");
    }

    verifyRouteRbacAndMethod(gAdmin, ['super_admin', 'admin'], 'getAdminAppointments()');
    verifyRouteRbacAndMethod(pAdmin, ['super_admin', 'admin'], 'createAdminAppointment()');
    verifyRouteRbacAndMethod(gRecep, ['super_admin', 'admin', 'reception'], 'getReceptionAppointments()');
    verifyRouteRbacAndMethod(pRecep, ['super_admin', 'admin', 'reception'], 'createReceptionAppointment()');
    verifyRouteRbacAndMethod(gTrain, ['trainer'], 'getTrainerAppointments()');
    verifyRouteRbacAndMethod(pTrain, ['trainer'], 'createTrainerAppointment()');
});

checkInvariant('Self-Test 15 (Phase Boundary E): Appointment hard-delete or delete route rejected by No-Delete predicate', () => {
    const hardDeleteController = `
        public function someMethod() {
            $this->db->prepare("DELETE FROM appointments WHERE id = ?");
        }
    `;
    let hdFailed = false;
    try { verifyAppointmentNoDelete(hardDeleteController, ""); } catch { hdFailed = true; }
    if (!hdFailed) throw new Error("Failed to reject DELETE FROM appointments in controller");

    const deleteRouteIndex = `
        $routes = [
            'DELETE' => [
                '/api/admin/appointments/{id}' => function() {}
            ]
        ];
    `;
    let drFailed = false;
    try { verifyAppointmentNoDelete("", deleteRouteIndex); } catch { drFailed = true; }
    if (!drFailed) throw new Error("Failed to reject DELETE route for appointments in index");

    const deleteMethodController = `
        public function deleteAppointment($id) {}
    `;
    let dmFailed = false;
    try { verifyAppointmentNoDelete(deleteMethodController, ""); } catch { dmFailed = true; }
    if (!dmFailed) throw new Error("Failed to reject deleteAppointment in controller");

    const softDeleteController = `
        $this->db->prepare("UPDATE appointments SET deleted_at = NOW() WHERE id = ?");
    `;
    let sdFailed = false;
    try { verifyAppointmentNoDelete(softDeleteController, ""); } catch { sdFailed = true; }
    if (!sdFailed) throw new Error("Failed to reject soft-delete appointment mutation");
});

checkInvariant('Self-Test 16 (Phase Boundary F): Normal UPDATE allowed by No-Delete predicate', () => {
    const lifecycleUpdateController = `
        public function rescheduleAdminAppointment($id) {
            $stmt = $this->db->prepare("UPDATE appointments SET starts_at = ?, ends_at = ?, status = 'scheduled' WHERE id = ?");
        }
    `;
    const safeIndex = `
        $routes = [
            'PATCH' => [
                '/api/admin/appointments/{id}/reschedule' => function() {}
            ]
        ];
    `;
    verifyAppointmentNoDelete(lifecycleUpdateController, safeIndex);
});


// =========================================================
// 3. LOAD PRODUCTION SOURCE FILES
// =========================================================

const requiredFiles = {
    controller: 'api/controllers/AppointmentController.php',
    index: 'api/index.php',
    response: 'api/core/Response.php',
    audit: 'api/core/AuditLogger.php',
    trainersMigration: 'database/migrations/022_create_trainers.sql',
    appointmentsMigration: 'database/migrations/035_create_appointments.sql',
    packageJson: 'package.json'
};

const src = {};
for (const [key, filepath] of Object.entries(requiredFiles)) {
    if (!fs.existsSync(filepath)) {
        console.error(`❌ FAIL — PRODUCTION CONTRACT DEFECT: Missing required file: ${filepath}`);
        process.exit(1);
    }
    src[key] = fs.readFileSync(filepath, 'utf8');
}


// =========================================================
// 4. BALANCED BLOCK EXTRACTIONS ON PRODUCTION CODE
// =========================================================

// Controller methods
const generateUuidBlock = extractFunctionBlock(src.controller, "private function generateUuid(");
const getTrainerProfileIdBlock = extractFunctionBlock(src.controller, "private function getTrainerProfileId(");
const parseWindowDateBlock = extractFunctionBlock(src.controller, "private function parseWindowDate(");
const handleReadBlock = extractFunctionBlock(src.controller, "private function handleRead(");
const handleCreateBlock = extractFunctionBlock(src.controller, "private function handleCreate(");
const getAdminAppointmentsBlock = extractFunctionBlock(src.controller, "public function getAdminAppointments(");
const createAdminAppointmentBlock = extractFunctionBlock(src.controller, "public function createAdminAppointment(");
const getReceptionAppointmentsBlock = extractFunctionBlock(src.controller, "public function getReceptionAppointments(");
const createReceptionAppointmentBlock = extractFunctionBlock(src.controller, "public function createReceptionAppointment(");
const getTrainerAppointmentsBlock = extractFunctionBlock(src.controller, "public function getTrainerAppointments(");
const createTrainerAppointmentBlock = extractFunctionBlock(src.controller, "public function createTrainerAppointment(");

checkInvariant('Fail-Closed: All critical AppointmentController blocks must extract successfully', () => {
    const criticalBlocks = {
        generateUuidBlock, getTrainerProfileIdBlock, parseWindowDateBlock, handleReadBlock, handleCreateBlock,
        getAdminAppointmentsBlock, createAdminAppointmentBlock, getReceptionAppointmentsBlock,
        createReceptionAppointmentBlock, getTrainerAppointmentsBlock, createTrainerAppointmentBlock
    };
    for (const [name, block] of Object.entries(criticalBlocks)) {
        if (!block) throw new Error(`Could not extract function block: ${name}`);
    }
});

// Extract GET and POST sections from api/index.php
const getSectionIdx = src.index.indexOf("'GET' =>");
if (getSectionIdx === -1) {
    console.error("❌ FAIL — PRODUCTION CONTRACT DEFECT: Missing 'GET' section in api/index.php");
    process.exit(1);
}
const getRoutesSection = extractBalanced(src.index, getSectionIdx, '[', ']');

const postSectionIdx = src.index.indexOf("'POST' =>");
if (postSectionIdx === -1) {
    console.error("❌ FAIL — PRODUCTION CONTRACT DEFECT: Missing 'POST' section in api/index.php");
    process.exit(1);
}
const postRoutesSection = extractBalanced(src.index, postSectionIdx, '[', ']');

checkInvariant('Fail-Closed: Balanced extraction of GET and POST route arrays in api/index.php', () => {
    if (!getRoutesSection) throw new Error("Could not extract balanced 'GET' routes section");
    if (!postRoutesSection) throw new Error("Could not extract balanced 'POST' routes section");
});

// Extract exact six routes from their respective HTTP sections
function extractRouteClosure(sectionCode, routePath) {
    const routeIdx = sectionCode.indexOf(`'${routePath}'`);
    if (routeIdx === -1) return null;
    const fnIdx = sectionCode.indexOf("function()", routeIdx);
    if (fnIdx === -1) return null;
    return extractBalanced(sectionCode, fnIdx, '{', '}');
}

const getAdminRoute = extractRouteClosure(getRoutesSection, '/api/admin/appointments');
const postAdminRoute = extractRouteClosure(postRoutesSection, '/api/admin/appointments');
const getReceptionRoute = extractRouteClosure(getRoutesSection, '/api/reception/appointments');
const postReceptionRoute = extractRouteClosure(postRoutesSection, '/api/reception/appointments');
const getTrainerRoute = extractRouteClosure(getRoutesSection, '/api/trainer/appointments');
const postTrainerRoute = extractRouteClosure(postRoutesSection, '/api/trainer/appointments');

checkInvariant('Fail-Closed: All six appointment route blocks exist in their respective HTTP sections', () => {
    const allRoutes = { getAdminRoute, postAdminRoute, getReceptionRoute, postReceptionRoute, getTrainerRoute, postTrainerRoute };
    for (const [name, block] of Object.entries(allRoutes)) {
        if (!block) throw new Error(`Could not extract route closure: ${name}`);
    }
});


// =========================================================
// 5. PRODUCTION CONTRACT INVARIANTS
// =========================================================

// Route & RBAC Matrix
checkInvariant('Exact Route Matrix: Admin routes require exact [super_admin, admin] and AuthMiddleware::handle()', () => {
    verifyRouteRbacAndMethod(getAdminRoute, ['super_admin', 'admin'], 'getAdminAppointments()');
    verifyRouteRbacAndMethod(postAdminRoute, ['super_admin', 'admin'], 'createAdminAppointment()');
});

checkInvariant('Exact Route Matrix: Reception routes require exact [super_admin, admin, reception] and AuthMiddleware::handle()', () => {
    verifyRouteRbacAndMethod(getReceptionRoute, ['super_admin', 'admin', 'reception'], 'getReceptionAppointments()');
    verifyRouteRbacAndMethod(postReceptionRoute, ['super_admin', 'admin', 'reception'], 'createReceptionAppointment()');
});

checkInvariant('Exact Route Matrix: Trainer routes require exact [trainer] and AuthMiddleware::handle()', () => {
    verifyRouteRbacAndMethod(getTrainerRoute, ['trainer'], 'getTrainerAppointments()');
    verifyRouteRbacAndMethod(postTrainerRoute, ['trainer'], 'createTrainerAppointment()');
});

// Global CSRF
checkInvariant('Global CSRF: index.php contains top-level pre-dispatch CSRF guard and no appointment bypass', () => {
    verifyGlobalCsrf(src.index);
    const postRoutes = [postAdminRoute, postReceptionRoute, postTrainerRoute];
    for (const r of postRoutes) {
        if (/csrf_bypass|bypass_csrf/i.test(r)) {
            throw new Error("Appointment POST route contains CSRF bypass");
        }
    }
});

// POST query rejection
checkInvariant('POST Query Rejection: handleCreate rejects non-empty $_GET with 422 VALIDATION_ERROR before body/transaction', () => {
    verifyPostQueryRejection(handleCreateBlock);
});

// Exact Create Payload Sets
checkInvariant('Exact Create Payload Sets: Admin and Reception require [ends_at, member_id, starts_at, trainer_id]', () => {
    verifyCreatePayloadSet(createAdminAppointmentBlock, ['member_id', 'trainer_id', 'starts_at', 'ends_at']);
    verifyCreatePayloadSet(createReceptionAppointmentBlock, ['member_id', 'trainer_id', 'starts_at', 'ends_at']);
});

checkInvariant('Exact Create Payload Sets: Trainer requires exact [ends_at, member_id, starts_at] and forbids trainer_id', () => {
    verifyCreatePayloadSet(createTrainerAppointmentBlock, ['member_id', 'starts_at', 'ends_at']);
});

// Strict Datetime Parser
checkInvariant('Strict Datetime: parseWindowDate enforces Europe/Istanbul, Y-m-d H:i:s, round-trip check, and 422', () => {
    if (!parseWindowDateBlock.includes("new DateTimeZone('Europe/Istanbul')")) {
        throw new Error("Missing DateTimeZone('Europe/Istanbul')");
    }
    if (!parseWindowDateBlock.includes("Y-m-d H:i:s")) {
        throw new Error("Missing Y-m-d H:i:s format validation");
    }
    // Round-trip check: $dt->format('Y-m-d H:i:s') !== $dateStr
    if (!/\$dt->format\(\s*['"]Y-m-d H:i:s['"]\s*\)\s*!==\s*\$dateStr/.test(parseWindowDateBlock)) {
        throw new Error("Missing strict round-trip equality check ($dt->format(...) !== $dateStr)");
    }
    if (!parseWindowDateBlock.includes("'VALIDATION_ERROR'") || !parseWindowDateBlock.includes("422")) {
        throw new Error("parseWindowDate must error with VALIDATION_ERROR and status 422");
    }
    if (/date_default_timezone_set|UTC|\+30|\+45|\+60|P1M|DateInterval/i.test(parseWindowDateBlock)) {
        throw new Error("Forbidden datetime modification found in parseWindowDate");
    }
});

// Bounded Read Window
checkInvariant('Bounded Read: handleRead requires from & to strings, from < to, max 31 calendar days, and no fallback', () => {
    if (!handleReadBlock.includes("isset($queryParams['from'])") || !handleReadBlock.includes("isset($queryParams['to'])")) {
        throw new Error("handleRead must require 'from' and 'to' query parameters");
    }
    if (!handleReadBlock.includes("is_string($queryParams['from'])") || !handleReadBlock.includes("is_string($queryParams['to'])")) {
        throw new Error("handleRead must enforce string type on 'from' and 'to'");
    }
    if (!handleReadBlock.includes("$fromDt >= $toDt")) {
        throw new Error("handleRead must check from strictly before to ($fromDt >= $toDt error)");
    }
    // Structural 31-day diff check
    if (!/\$diff->days\s*>\s*31\s*\|\|\s*\(\s*\$diff->days\s*==\s*31\s*&&\s*\(\s*\$diff->h\s*>\s*0\s*\|\|\s*\$diff->i\s*>\s*0\s*\|\|\s*\$diff->s\s*>\s*0\s*\)\s*\)/.test(handleReadBlock)) {
        throw new Error("handleRead must structurally enforce upper limit of 31 calendar days");
    }
});

// Read Query Overlap Semantics
checkInvariant('Read Query Overlap: strictly starts_at < requestedTo AND ends_at > requestedFrom without status filter', () => {
    verifyOverlapSql(handleReadBlock);
    if (/WHERE.*?status\s*=\s*['"]scheduled['"]/s.test(handleReadBlock)) {
        throw new Error("Read SQL query must not filter out non-scheduled appointments (calendar must read terminal states too)");
    }
});

// Read Projection Privacy
checkInvariant('Read Projection Privacy: only allows essential non-sensitive identifiers and trainer name', () => {
    // Extract SELECT query and item construction from handleRead
    const selectIdx = handleReadBlock.indexOf("SELECT");
    const jsonIdx = handleReadBlock.indexOf("Response::json");
    if (selectIdx === -1 || jsonIdx === -1) throw new Error("Could not find SELECT query or Response::json in handleRead");
    const readProjectionScope = handleReadBlock.substring(selectIdx, jsonIdx);

    verifyReadProjectionPrivacy(readProjectionScope);
});

// Trainer Schema Parity
checkInvariant('Trainer Schema Parity: migration defines name and read query uses t.name AS trainer_name', () => {
    if (!/`name`\s+VARCHAR/i.test(src.trainersMigration)) {
        throw new Error("022_create_trainers.sql does not define 'name' column");
    }
    if (/`display_name`/i.test(src.trainersMigration)) {
        throw new Error("022_create_trainers.sql unexpectedly defines display_name");
    }
    if (!/t\.name\s+as\s+trainer_name/i.test(handleReadBlock)) {
        throw new Error("Read query must select 't.name as trainer_name'");
    }
    if (/t\.display_name/i.test(handleReadBlock)) {
        throw new Error("Forbidden t.display_name in read query");
    }
});

// Secure UUID Generation
checkInvariant('Secure UUID: generateUuid uses random_bytes(16) with v4 bitmasks and bin2hex', () => {
    verifySecureUuid(generateUuidBlock, src.controller);
});

// Canonical Response Error Contract
checkInvariant('Canonical Response Error Contract: Response::error exists and no ad-hoc error arrays in controller', () => {
    if (!src.response.includes("public static function error(")) {
        throw new Error("Response::error method missing in api/core/Response.php");
    }
    if (/Response::json\s*\(\s*\[\s*['"]error['"]\s*=>/.test(src.controller)) {
        throw new Error("Controller uses ad-hoc Response::json(['error' => ...]) instead of Response::error()");
    }
    const requiredCodes = [
        'UNAUTHORIZED', 'FORBIDDEN', 'TRAINER_PROFILE_NOT_LINKED', 'NOT_FOUND',
        'MEMBER_INELIGIBLE', 'TRAINER_INELIGIBLE', 'TRAINER_CONFLICT',
        'MEMBER_CONFLICT', 'VALIDATION_ERROR', 'INVALID_JSON', 'INTERNAL_ERROR'
    ];
    for (const c of requiredCodes) {
        if (!src.controller.includes(`'${c}'`) && !src.controller.includes(`"${c}"`)) {
            throw new Error(`Missing required error code: ${c}`);
        }
    }
});

// Deterministic Create Execution Order
checkInvariant('Deterministic Execution Order: handleCreate enforces strict monotonic sequence of operations', () => {
    verifyCreateExecutionOrder(handleCreateBlock);
});

// Member Eligibility & Branch Semantics
checkInvariant('Member Eligibility: lock query FOR UPDATE with deleted, active, and end_date validation', () => {
    if (!handleCreateBlock.includes("SELECT id, deleted_at, status, membership_end_date, trainer_id FROM members WHERE id = ? FOR UPDATE")) {
        throw new Error("Member lock query signature mismatch or missing FOR UPDATE");
    }
    if (!handleCreateBlock.includes("NOT_FOUND") || !handleCreateBlock.includes("Member not found or deleted.")) {
        throw new Error("Missing NOT_FOUND 404 for deleted or missing member");
    }
    if (!handleCreateBlock.includes("MEMBER_INELIGIBLE") || !handleCreateBlock.includes("Member is not active.")) {
        throw new Error("Missing MEMBER_INELIGIBLE 409 for inactive member");
    }
    if (!handleCreateBlock.includes("membership_end_date")) {
        throw new Error("Missing membership_end_date check");
    }
    if (handleCreateBlock.includes("membership_start_date")) {
        throw new Error("Forbidden membership_start_date check found in create eligibility");
    }
});

// Trainer Eligibility & Own Scope
checkInvariant('Trainer Eligibility: lock query FOR UPDATE, active check, and forced trainer scoping', () => {
    if (!handleCreateBlock.includes("SELECT id, deleted_at, is_active, admin_id FROM trainers WHERE id = ? FOR UPDATE")) {
        throw new Error("Trainer lock query signature mismatch or missing FOR UPDATE");
    }
    if (!handleCreateBlock.includes("TRAINER_INELIGIBLE") || !handleCreateBlock.includes("Trainer is inactive.")) {
        throw new Error("Missing TRAINER_INELIGIBLE 409 for inactive trainer");
    }
    if (!handleCreateBlock.includes("$forcedTrainerId !== null && (int)$trainer['admin_id'] !== $adminId")) {
        throw new Error("Missing trainer profile ownership check ((int)$trainer['admin_id'] !== $adminId)");
    }
    if (!handleCreateBlock.includes("$forcedTrainerId !== null && (int)$member['trainer_id'] !== $forcedTrainerId")) {
        throw new Error("Missing member assignment restriction ((int)$member['trainer_id'] !== $forcedTrainerId)");
    }
});

// Both Conflict Queries Exactness
checkInvariant('Conflict Exactness: trainer conflict verified before member conflict with strict overlap and FOR UPDATE', () => {
    const trConfIdx = handleCreateBlock.indexOf("trainer_id = ? AND status = 'scheduled'");
    const memConfIdx = handleCreateBlock.indexOf("member_id = ? AND status = 'scheduled'");

    if (trConfIdx === -1 || memConfIdx === -1) {
        throw new Error("Missing trainer or member conflict query in handleCreate");
    }
    if (trConfIdx > memConfIdx) {
        throw new Error("Trainer conflict query must execute before member conflict query");
    }

    const trSnippet = handleCreateBlock.substring(trConfIdx, handleCreateBlock.indexOf(';', trConfIdx));
    verifyOverlapSql(trSnippet);
    if (!trSnippet.includes("FOR UPDATE")) throw new Error("Trainer conflict query lacks FOR UPDATE");

    const memSnippet = handleCreateBlock.substring(memConfIdx, handleCreateBlock.indexOf(';', memConfIdx));
    verifyOverlapSql(memSnippet);
    if (!memSnippet.includes("FOR UPDATE")) throw new Error("Member conflict query lacks FOR UPDATE");
});

// Exact SQL INSERT
checkInvariant('Exact INSERT Parser: column set is exact, status is server-literal scheduled, created_by is actor', () => {
    const insertIdx = handleCreateBlock.indexOf("INSERT INTO appointments");
    if (insertIdx === -1) throw new Error("INSERT INTO appointments missing");
    const insertSemicolon = handleCreateBlock.indexOf(';', insertIdx);
    const insertSqlText = handleCreateBlock.substring(insertIdx, insertSemicolon);

    const colsMatch = insertSqlText.match(/INSERT\s+INTO\s+appointments\s*\(([^)]+)\)/i);
    if (!colsMatch) throw new Error("Could not parse columns from INSERT statement");

    const cols = colsMatch[1].split(',').map(c => c.trim()).sort();
    const expectedCols = ['created_by', 'ends_at', 'member_id', 'starts_at', 'status', 'trainer_id', 'uuid'].sort();

    if (JSON.stringify(cols) !== JSON.stringify(expectedCols)) {
        throw new Error(`INSERT columns mismatch. Expected: [${expectedCols.join(', ')}], Found: [${cols.join(', ')}]`);
    }

    // Verify status is literal 'scheduled'
    if (!insertSqlText.includes("'scheduled'")) {
        throw new Error("INSERT statement must insert server-literal 'scheduled'");
    }

    // Verify created_by is session $adminId
    const executeIdx = handleCreateBlock.indexOf("execute", insertSemicolon);
    const executeCall = extractBalanced(handleCreateBlock, executeIdx, '(', ')');
    const bindAdminIdIdx = handleCreateBlock.indexOf("$adminId, PDO::PARAM_INT", insertSemicolon);
    if (bindAdminIdIdx === -1 && (!executeCall || !executeCall.includes("$adminId"))) {
        throw new Error("created_by must be bound to session $adminId");
    }
});

// Persisted-Row Contract & Success Response Truth
checkInvariant('Persisted-Row Contract: fetch row by lastInsertId and build 201 response strictly from persisted row', () => {
    const lastInsertIdx = handleCreateBlock.indexOf("lastInsertId()");
    const fetchIdx = handleCreateBlock.indexOf("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
    const guardIdx = handleCreateBlock.indexOf("Failed to retrieve persisted appointment");
    const commitIdx = handleCreateBlock.indexOf("commit()");
    const resp201Idx = handleCreateBlock.indexOf("201");

    if (lastInsertIdx === -1 || fetchIdx === -1 || guardIdx === -1 || commitIdx === -1 || resp201Idx === -1) {
        throw new Error("Missing lastInsertId, persisted fetch, guard, commit, or 201 response");
    }

    if (!(lastInsertIdx < fetchIdx && fetchIdx < guardIdx && guardIdx < commitIdx && commitIdx < resp201Idx)) {
        throw new Error("Persisted row fetch and validation must happen before commit");
    }

    const resp201Block = extractBalancedCall(handleCreateBlock.substring(commitIdx), "Response::json");
    if (!resp201Block) throw new Error("Could not extract Response::json 201 block");

    if (!resp201Block.includes("$persistedApp['id']") || !resp201Block.includes("$persistedApp['uuid']") ||
        !resp201Block.includes("$persistedApp['starts_at']") || !resp201Block.includes("$persistedApp['ends_at']") ||
        !resp201Block.includes("$persistedApp['status']")) {
        throw new Error("201 success response must strictly source appointment data from $persistedApp");
    }

    if (resp201Block.includes("$data['starts_at']") || resp201Block.includes("$data['ends_at']")) {
        throw new Error("201 response contains unverified client $data instead of persisted DB row");
    }
});

// Exact AuditLogger Call Contract
checkInvariant('Exact AuditLogger Call: 5 arguments, action appointment.created, exact metadata keys', () => {
    const auditCall = extractBalancedCall(handleCreateBlock, "AuditLogger::log");
    verifyAuditLoggerCall(auditCall);
});

// Commit-Before-Audit & Audit Failure Isolation
checkInvariant('Commit-Before-Audit: audit call occurs in isolated local try/catch after commit and never alters 201 response', () => {
    const commitIdx = handleCreateBlock.indexOf("commit()");
    const auditCallIdx = handleCreateBlock.indexOf("AuditLogger::log");
    if (commitIdx === -1 || auditCallIdx === -1 || commitIdx > auditCallIdx) {
        throw new Error("Audit call must be strictly after commit()");
    }

    // Find the enclosing local try block for audit
    const auditTryIdx = handleCreateBlock.lastIndexOf("try", auditCallIdx);
    if (auditTryIdx === -1 || auditTryIdx < commitIdx) {
        throw new Error("Audit call must be wrapped in its own local try/catch block after commit()");
    }

    const auditTryCatch = extractBalanced(handleCreateBlock, auditTryIdx, '{', '}');
    // Extract the catch block immediately following
    const catchIdx = handleCreateBlock.indexOf("catch", auditTryIdx + auditTryCatch.length);
    const catchBlock = extractBalanced(handleCreateBlock, catchIdx, '{', '}');

    if (!catchBlock) throw new Error("Missing catch block for audit logging");
    if (/rollBack|Response::error|Response::json|INSERT/i.test(catchBlock)) {
        throw new Error("Audit catch block must not alter response or rollback transaction");
    }
});

// Appointment No-Delete Contract
checkInvariant('Appointment No-Delete Contract', () => {
    verifyAppointmentNoDelete(src.controller, src.index);
});

// Temporary Artifact Absence
checkInvariant('Temporary Artifact Absence: patch.js, patch_index.php, and root *.tmp, *.fixed absent', () => {
    if (fs.existsSync('patch.js')) throw new Error("patch.js exists");
    if (fs.existsSync('patch_index.php')) throw new Error("patch_index.php exists");
    const rootFiles = fs.readdirSync('.');
    for (const f of rootFiles) {
        if (f.endsWith('.fixed') || f.endsWith('.tmp')) throw new Error(`Artifact found: ${f}`);
    }
});

// Required Read/Create Public Surface
checkInvariant('Required Read/Create Public Surface', () => {
    verifyRequiredPublicSurface(src.controller);
});


// =========================================================
// 6. FINAL EVALUATION & EXIT
// =========================================================

console.log('---------------------------------------------------------');
console.log(`Total Invariants: ${totalInvariants}`);
console.log(`Passed: ${passedInvariants}`);
console.log(`Failed: ${failedInvariants}`);
console.log('---------------------------------------------------------');

if (failedInvariants === 0) {
    console.log(`✅ Appointment Read/Create Final Verifier PASSED (All ${passedInvariants}/${totalInvariants} invariants verified).`);
    process.exit(0);
} else {
    console.error(`❌ Appointment Read/Create Final Verifier FAILED (${failedInvariants} out of ${totalInvariants} failed).`);
    process.exit(1);
}
