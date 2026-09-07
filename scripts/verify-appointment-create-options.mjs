import fs from 'fs';
import path from 'path';

let total = 0;
let passed = 0;
let failed = 0;

function assert(condition, message) {
    total++;
    if (condition) {
        passed++;
        console.log(`✅ PASS: ${message}`);
    } else {
        failed++;
        console.error(`❌ FAIL: ${message}`);
    }
}

// ---------------------------------------------------------
// Helper: Find index of a token outside strings and comments
// ---------------------------------------------------------
function indexOfOutsideStringsAndComments(code, searchString, startFrom = 0) {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = startFrom; i < code.length; i++) {
        if (!inSingleQuote && !inDoubleQuote && !inLineComment && !inBlockComment) {
            if (code.startsWith(searchString, i)) {
                return i;
            }
        }

        const c = code[i];
        const next = code[i + 1] || '';

        if ((inSingleQuote || inDoubleQuote) && c === '\\') {
            i++;
            continue;
        }

        if (inLineComment) {
            if (c === '\n' || c === '\r') {
                inLineComment = false;
            }
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
            if (c === "'") inSingleQuote = false;
            continue;
        }

        if (inDoubleQuote) {
            if (c === '"') inDoubleQuote = false;
            continue;
        }

        if (c === '/' && next === '/') {
            inLineComment = true;
            i++;
            continue;
        }
        if (c === '#') {
            inLineComment = true;
            continue;
        }
        if (c === '/' && next === '*') {
            inBlockComment = true;
            i++;
            continue;
        }
        if (c === "'") {
            inSingleQuote = true;
            continue;
        }
        if (c === '"') {
            inDoubleQuote = true;
            continue;
        }
    }
    return -1;
}

// ---------------------------------------------------------
// Helper: String/Comment Safe Balanced Bracket Extraction
// ---------------------------------------------------------
function getMethodBlock(code, searchString, braceStartSearchStr = '{') {
    const startIndex = indexOfOutsideStringsAndComments(code, searchString);
    if (startIndex === -1) return null;
    
    const braceIndex = indexOfOutsideStringsAndComments(code, braceStartSearchStr, startIndex);
    if (braceIndex === -1) return null;

    const braceEndSearchStr = braceStartSearchStr === '{' ? '}' : (braceStartSearchStr === '[' ? ']' : ')');

    let braceCount = 0;
    let started = false;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inLineComment = false;
    let inBlockComment = false;
    
    let endIndex = -1;

    for (let i = braceIndex; i < code.length; i++) {
        const c = code[i];
        const next = code[i+1] || '';
        
        if ((inSingleQuote || inDoubleQuote) && c === '\\') {
            i++; 
            continue;
        }

        if (inLineComment) {
            if (c === '\n' || c === '\r') {
                inLineComment = false;
            }
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
            if (c === "'") inSingleQuote = false;
            continue;
        }
        
        if (inDoubleQuote) {
            if (c === '"') inDoubleQuote = false;
            continue;
        }
        
        if (c === '/' && next === '/') {
            inLineComment = true;
            i++;
            continue;
        }
        if (c === '#') {
            inLineComment = true;
            continue;
        }
        if (c === '/' && next === '*') {
            inBlockComment = true;
            i++;
            continue;
        }
        if (c === "'") {
            inSingleQuote = true;
            continue;
        }
        if (c === '"') {
            inDoubleQuote = true;
            continue;
        }
        
        if (c === braceStartSearchStr) {
            braceCount++;
            started = true;
        } else if (c === braceEndSearchStr) {
            braceCount--;
        }
        
        if (started && braceCount === 0) {
            endIndex = i + 1;
            break;
        }
    }
    
    return endIndex !== -1 ? code.substring(startIndex, endIndex) : null;
}

// ---------------------------------------------------------
// Core Predicates
// ---------------------------------------------------------
function checkInvariants(controllerCode, indexCode) {
    const methodCode = getMethodBlock(controllerCode, 'public function getReceptionAppointmentTrainers()');
    if (!methodCode) return { success: false, reason: 'Method extraction failed' };
    
    const getBucketCode = getMethodBlock(indexCode, "'GET' => [", '[');
    if (!getBucketCode) return { success: false, reason: 'GET bucket extraction failed' };
    const routeClosure = getMethodBlock(getBucketCode, "'/api/reception/appointment-trainers'");
    if (!routeClosure) return { success: false, reason: 'Route closure not found in GET bucket' };
    
    if (!routeClosure.includes('AuthMiddleware::handle();') ||
        !routeClosure.includes("AuthMiddleware::hasRole(['super_admin', 'admin', 'reception']);") ||
        !routeClosure.includes('(new \\Controllers\\AppointmentController())->getReceptionAppointmentTrainers();') ||
        routeClosure.includes("'editor'")) {
        return { success: false, reason: 'Route closure content invalid or has extra role' };
    }
    
    // Dynamic namespace aliases check (all styles)
    const aliases = ["/api/public/appointment-trainers", "/api/trainer/appointment-trainers", "/api/admin/appointment-trainers"];
    for (const a of aliases) {
        if (indexCode.includes(a)) return { success: false, reason: `Forbidden namespace alias found: ${a}` };
    }
    
    const postBucketCode = getMethodBlock(indexCode, "'POST' => [", '[');
    const patchBucketCode = getMethodBlock(indexCode, "'PATCH' => [", '[');
    const deleteBucketCode = getMethodBlock(indexCode, "'DELETE' => [", '[');
    
    if (postBucketCode && postBucketCode.includes("'/api/reception/appointment-trainers'")) return { success: false, reason: 'Static POST alias' };
    if (patchBucketCode && patchBucketCode.includes("'/api/reception/appointment-trainers'")) return { success: false, reason: 'Static PATCH alias' };
    if (deleteBucketCode && deleteBucketCode.includes("'/api/reception/appointment-trainers'")) return { success: false, reason: 'Static DELETE alias' };
    
    // Dynamic mutation alias
    const pathStr = '/api/reception/appointment-trainers';
    if (indexCode.includes("preg_match('#^/api/reception/appointment-trainers$#'") || indexCode.includes(`=== '${pathStr}'`)) {
        return { success: false, reason: 'Dynamic mutation alias block detected' };
    }

    // Full method sensitive field guard
    const sensitiveFields = ['admin_id', 'email', 'bio', 'instagram_username', 'role_title', 'branch_id', 'profile_media_id', 'credentials', 'password'];
    for (const sf of sensitiveFields) {
        if (methodCode.includes(sf)) return { success: false, reason: `Sensitive field found in method: ${sf}` };
    }

    // Read-only guard case-insensitive (mutations)
    const lowerMethod = methodCode.toLowerCase();
    const mutations = ['insert into', 'update trainers', 'delete from', 'begintransaction', 'commit', 'rollback', 'auditlogger', 'appointment_reschedules', 'member_visits'];
    for (const mut of mutations) {
        if (lowerMethod.includes(mut)) return { success: false, reason: `Mutation detected: ${mut}` };
    }

    const sqlMatch = methodCode.match(/SELECT\s+(.+?)\s+FROM\s+trainers\s+WHERE\s+(.+?)\s*"/s);
    if (!sqlMatch) return { success: false, reason: 'SQL SELECT statement missing or malformed' };
    
    const selectCols = sqlMatch[1].split(',').map(s => s.trim().toLowerCase());
    if (selectCols.length !== 2 || !selectCols.includes('id') || !selectCols.includes('name')) return { success: false, reason: 'SQL SELECT extra/missing keys' };
    
    const filters = sqlMatch[2];
    if (!filters.includes('deleted_at IS NULL') || !filters.includes('is_active = 1')) return { success: false, reason: 'SQL WHERE missing conditions' };
    if (!methodCode.includes('ORDER BY sort_order ASC, id ASC')) return { success: false, reason: 'SQL ORDER BY is invalid' };
    
    const arrayMapBlock = getMethodBlock(methodCode, 'array_map(function', '{');
    if (!arrayMapBlock) return { success: false, reason: 'Response item normalization missing' };
    
    const arrayMapReturn = getMethodBlock(arrayMapBlock, 'return [', '[');
    if (!arrayMapReturn) return { success: false, reason: 'Response item return missing' };
    
    if (!arrayMapReturn.includes("'id' => (int)$t['id']")) return { success: false, reason: 'Response item id missing exact cast' };
    if (!arrayMapReturn.includes("'name' => (string)$t['name']")) return { success: false, reason: 'Response item name missing exact cast' };
    
    const keyMatches = arrayMapReturn.match(/=>/g);
    if (!keyMatches || keyMatches.length !== 2) return { success: false, reason: 'Response item contains extra or missing keys' };
    
    // Response root exact items-only check
    const jsonBlock = getMethodBlock(methodCode, 'Response::json([', '[');
    if (!jsonBlock) return { success: false, reason: 'Response::json block missing' };
    const rootMatches = jsonBlock.match(/=>/g);
    if (!rootMatches || rootMatches.length !== 1) return { success: false, reason: 'Response root has extra or missing keys' };
    if (!jsonBlock.includes("'items' =>")) return { success: false, reason: 'Response root does not contain exactly items key' };
    
    if (!methodCode.includes("if (!empty($_GET)) {")) return { success: false, reason: 'nonempty $_GET check missing' };
    if (!methodCode.includes("Response::error('Query parameter kabul edilmez.', 'VALIDATION_ERROR', 422);")) return { success: false, reason: 'Query error exact positional args invalid' };
    if (!methodCode.includes("Response::error('Eğitmen listesi alınırken beklenmedik bir hata oluştu.', 'INTERNAL_ERROR', 500);")) return { success: false, reason: 'Internal error exact positional args invalid' };
    
    return { success: true };
}

// ---------------------------------------------------------
// Negative Self Tests
// ---------------------------------------------------------
console.log('--- Starting Negative Self-Tests ---');

const controllerPath = path.resolve(process.cwd(), 'api/controllers/AppointmentController.php');
const indexPath = path.resolve(process.cwd(), 'api/index.php');

if (fs.existsSync('test-braces.js')) {
    console.error("❌ FAIL: forbidden test-braces.js artifact found.");
    process.exit(1);
}
if (fs.existsSync('test-mods.js')) {
    console.error("❌ FAIL: forbidden test-mods.js artifact found.");
    process.exit(1);
}

const rawControllerCode = fs.readFileSync(controllerPath, 'utf8');
const rawIndexCode = fs.readFileSync(indexPath, 'utf8');

const negatives = [
    { name: 'method missing', controllerMod: c => c.replace('public function getReceptionAppointmentTrainers()', 'public function someOtherMethod()'), indexMod: i => i },
    { name: 'unmatched method brace', controllerMod: c => c.replace('public function getReceptionAppointmentTrainers() {', 'public function getReceptionAppointmentTrainers() { {'), indexMod: i => i },
    { name: 'GET moved to POST', controllerMod: c => c, indexMod: i => i.replace("'GET' => [", "'GET' => [], 'POST' => [") },
    { name: 'AuthMiddleware removed', controllerMod: c => c, indexMod: i => i.replace("'/api/reception/appointment-trainers' => function() {\n            AuthMiddleware::handle();", "'/api/reception/appointment-trainers' => function() {\n") },
    { name: 'reception role removed', controllerMod: c => c, indexMod: i => i.replace("appointment-trainers' => function() {\n            AuthMiddleware::handle();\n            AuthMiddleware::hasRole(['super_admin', 'admin', 'reception']);", "appointment-trainers' => function() {\n            AuthMiddleware::handle();\n            AuthMiddleware::hasRole(['super_admin', 'admin']);") },
    { name: 'editor added', controllerMod: c => c, indexMod: i => i.replace("appointment-trainers' => function() {\n            AuthMiddleware::handle();\n            AuthMiddleware::hasRole(['super_admin', 'admin', 'reception']);", "appointment-trainers' => function() {\n            AuthMiddleware::handle();\n            AuthMiddleware::hasRole(['super_admin', 'admin', 'reception', 'editor']);") },
    { name: 'wrong controller method', controllerMod: c => c, indexMod: i => i.replace('getReceptionAppointmentTrainers()', 'someOtherMethod()') },
    { name: 'dynamic POST alias', controllerMod: c => c, indexMod: i => i + `\nif (preg_match('#^/api/reception/appointment-trainers$#', $req)) { if ($method === 'POST') {} }` },
    { name: 'dynamic PATCH alias', controllerMod: c => c, indexMod: i => i + `\nif (preg_match('#^/api/reception/appointment-trainers$#', $req)) { if ($method === 'PATCH') {} }` },
    { name: 'dynamic DELETE alias', controllerMod: c => c, indexMod: i => i + `\nif (preg_match('#^/api/reception/appointment-trainers$#', $req)) { if ($method === 'DELETE') {} }` },
    { name: 'public alias', controllerMod: c => c, indexMod: i => i + `\n'/api/public/appointment-trainers' => function() {}` },
    { name: 'trainer alias', controllerMod: c => c, indexMod: i => i + `\n'/api/trainer/appointment-trainers' => function() {}` },
    { name: 'admin alias', controllerMod: c => c, indexMod: i => i + `\n'/api/admin/appointment-trainers' => function() {}` },
    { name: 'active filter removed', controllerMod: c => c.replace('AND is_active = 1', ''), indexMod: i => i },
    { name: 'deleted filter removed', controllerMod: c => c.replace('WHERE deleted_at IS NULL AND', 'WHERE '), indexMod: i => i },
    { name: 'order removed', controllerMod: c => c.replace('ORDER BY sort_order ASC, id ASC', ''), indexMod: i => i },
    { name: 'extra SQL field', controllerMod: c => c.replace('SELECT id, name', 'SELECT id, name, admin_id'), indexMod: i => i },
    { name: 'extra response field', controllerMod: c => c.replace("'name' => (string)$t['name']", "'name' => (string)$t['name'], 'role_title' => 'admin'"), indexMod: i => i },
    { name: 'UPDATE injection', controllerMod: c => c.replace('SELECT id, name', 'UPDATE trainers SET foo = 1; SELECT id, name'), indexMod: i => i },
    { name: 'AuditLogger injection', controllerMod: c => c.replace("Response::json(['items' => $normalizedTrainers]);", "AuditLogger::log(); Response::json(['items' => $normalizedTrainers]);"), indexMod: i => i },
    { name: 'query error args swapped', controllerMod: c => c.replace("Response::error('Query parameter kabul edilmez.', 'VALIDATION_ERROR', 422);", "Response::error('VALIDATION_ERROR', 'Query parameter kabul edilmez.', 422);"), indexMod: i => i },
    { name: 'internal error args swapped', controllerMod: c => c.replace("Response::error('Eğitmen listesi alınırken beklenmedik bir hata oluştu.', 'INTERNAL_ERROR', 500);", "Response::error('INTERNAL_ERROR', 'Eğitmen listesi alınırken beklenmedik bir hata oluştu.', 500);"), indexMod: i => i },
    { name: 'raw exception response leak', controllerMod: c => c.replace("Response::error('Eğitmen listesi alınırken beklenmedik bir hata oluştu.', 'INTERNAL_ERROR', 500);", "Response::error($e->getMessage(), 'INTERNAL_ERROR', 500);"), indexMod: i => i },
    // NEW CHECKS
    { name: 'commented fake method', controllerMod: c => c.replace('public function getReceptionAppointmentTrainers()', '// public function getReceptionAppointmentTrainers()\npublic function someOther()'), indexMod: i => i },
    { name: 'string fake method', controllerMod: c => c.replace('public function getReceptionAppointmentTrainers()', '"public function getReceptionAppointmentTrainers()"\npublic function someOther()'), indexMod: i => i },
    { name: 'commented fake GET route', controllerMod: c => c, indexMod: i => i.replace("'GET' => [", "// 'GET' => [\n'GET' => []") },
    { name: 'extra response root key', controllerMod: c => c.replace("Response::json(['items' => $normalizedTrainers]);", "Response::json(['items' => $normalizedTrainers, 'metadata' => []]);"), indexMod: i => i },
    { name: 'direct equality DELETE', controllerMod: c => c, indexMod: i => i + "\nif ($requestUri === '/api/reception/appointment-trainers' && $method === 'DELETE') {}" },
    { name: 'direct equality POST', controllerMod: c => c, indexMod: i => i + "\nif ($requestUri === '/api/reception/appointment-trainers' && $method === 'POST') {}" },
    { name: 'dynamic public preg_match alias', controllerMod: c => c, indexMod: i => i + "\nif (preg_match('#^/api/public/appointment-trainers$#', $requestUri)) {}" },
    { name: 'dynamic admin equality alias', controllerMod: c => c, indexMod: i => i + "\nif ($requestUri === '/api/admin/appointment-trainers') {}" },
    { name: 'second SELECT admin_id', controllerMod: c => c.replace(/SELECT id, name\s+FROM trainers/, 'SELECT admin_id FROM foo; SELECT id, name\n            FROM trainers'), indexMod: i => i },
    { name: 'hidden role_title read', controllerMod: c => c.replace(/SELECT id, name\s+FROM trainers/, 'SELECT id, name\n            FROM trainers; $x = $t["role_title"];'), indexMod: i => i },
    { name: 'lowercase UPDATE trainers', controllerMod: c => c.replace(/SELECT id, name\s+FROM trainers/, 'update trainers set foo=1; SELECT id, name\n            FROM trainers'), indexMod: i => i }
];

let negativePassed = 0;
for (const tc of negatives) {
    const res = checkInvariants(tc.controllerMod(rawControllerCode), tc.indexMod(rawIndexCode));
    if (!res.success) {
        console.log(`✅ PASS: Negative self-test '${tc.name}' correctly blocked: ${res.reason}`);
        negativePassed++;
    } else {
        console.error(`❌ FAIL: Negative self-test '${tc.name}' incorrectly allowed!`);
    }
}
assert(negativePassed === negatives.length, `Negative self-tests count ${negativePassed}/${negatives.length}`);

// Special positive string-brace test: adding string inside method shouldn't fail extraction
const stringBraceCode = rawControllerCode.replace('public function getReceptionAppointmentTrainers() {', 'public function getReceptionAppointmentTrainers() { $test = "}";');
const stringBraceRes = checkInvariants(stringBraceCode, rawIndexCode);
if (stringBraceRes.success) {
    assert(true, 'Method extraction is string/comment safe');
} else {
    assert(false, `Method extraction string safe failed: ${stringBraceRes.reason}`);
}

// ---------------------------------------------------------
// Production Invariants
// ---------------------------------------------------------
console.log('--- Loading Production Sources (Fail-Closed) ---');
const prodRes = checkInvariants(rawControllerCode, rawIndexCode);

console.log('--- Running Production Invariant Checks ---');

if (prodRes.success) {
    assert(true, 'Production invariant checks passed completely');
} else {
    assert(false, `Production invariant failed: ${prodRes.reason}`);
}

console.log('---------------------------------------------------------');
console.log(`Total Assertions: ${total}`);
console.log(`Passed Assertions: ${passed}`);
console.log(`Failed Assertions: ${failed}`);
console.log('---------------------------------------------------------');

if (failed > 0) {
    console.error(`❌ SUCCESS FAILED: ${failed} assertion(s) failed.`);
    process.exit(1);
} else {
    console.log(`✅ Appointment Create Options Final Verifier PASSED.`);
    process.exit(0);
}
