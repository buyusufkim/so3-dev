import fs from 'fs';
import path from 'path';

const controllerPath = path.resolve(process.cwd(), 'api/controllers/AppointmentController.php');
const indexPath = path.resolve(process.cwd(), 'api/index.php');

const controllerCode = fs.readFileSync(controllerPath, 'utf8');
const indexCode = fs.readFileSync(indexPath, 'utf8');

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

console.log('Starting Reception Appointment Trainer Picker Options Verification...');

// 1. exact GET route exists
assert(indexCode.includes("'/api/reception/appointment-trainers' => function() {"), "Exact GET route exists");

// 3. AuthMiddleware::handle()
// 4. exact roles super_admin/admin/reception
const routeBlockRegex = /\/api\/reception\/appointment-trainers'.*?AuthMiddleware::handle\(\);.*?AuthMiddleware::hasRole\(\['super_admin', 'admin', 'reception'\]\);.*?getReceptionAppointmentTrainers/s;
assert(routeBlockRegex.test(indexCode), "Route enforces AuthMiddleware and super_admin/admin/reception roles, calls correct method");

// 6. no POST/PATCH/DELETE equivalent
const postIndexCode = indexCode.substring(indexCode.indexOf("'POST' => ["));
assert(!postIndexCode.includes("'/api/reception/appointment-trainers'"), "No POST alias");

// Ensure method block extraction is balanced
function getMethodBlock(code, methodName) {
    const startIndex = code.indexOf(`public function ${methodName}`);
    if (startIndex === -1) return null;
    
    let braceCount = 0;
    let started = false;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < code.length; i++) {
        if (code[i] === '{') {
            braceCount++;
            started = true;
        } else if (code[i] === '}') {
            braceCount--;
        }
        
        if (started && braceCount === 0) {
            endIndex = i + 1;
            break;
        }
    }
    
    return started ? code.substring(startIndex, endIndex) : null;
}

const methodCode = getMethodBlock(controllerCode, 'getReceptionAppointmentTrainers');
assert(methodCode !== null && methodCode.length > 0, 'Method extraction fail-closed');

if (methodCode) {
    // 8. method rejects nonempty query
    assert(methodCode.includes("if (!empty($_GET)) {"), "Method rejects nonempty query");

    // Exact response error argument check for validation
    assert(methodCode.includes("Response::error('Query parameter kabul edilmez.', 'VALIDATION_ERROR', 422);"), "Query error exact code/status/message");

    // 9. SQL selects only id, name
    const sqlSelectRegex = /SELECT\s+id,\s*name\s+FROM\s+trainers/i;
    assert(sqlSelectRegex.test(methodCode), "SQL selects exactly id, name");

    // 10. deleted_at IS NULL
    assert(methodCode.includes("deleted_at IS NULL"), "deleted_at IS NULL filter exists");

    // 11. is_active = 1
    assert(methodCode.includes("is_active = 1"), "is_active = 1 filter exists");

    // 12. ORDER BY sort_order ASC, id ASC
    assert(methodCode.includes("ORDER BY sort_order ASC, id ASC"), "ORDER BY sort_order ASC, id ASC exists");

    // 13-15 response formatting
    assert(methodCode.includes("'id' => (int)\$t['id']"), "Integer normalization for ID");
    assert(methodCode.includes("'name' => (string)\$t['name']"), "String normalization for name");
    assert(methodCode.includes("Response::json(['items' => $"), "Response root exact conceptual items");

    // Exact response error argument check for internal error
    assert(methodCode.includes("Response::error('Eğitmen listesi alınırken beklenmedik bir hata oluştu.', 'INTERNAL_ERROR', 500);"), "Internal error exact code/status/message");

    // 16. no sensitive trainer fields
    assert(!methodCode.includes("admin_id") && !methodCode.includes("email") && !methodCode.includes("bio") && !methodCode.includes("credentials"), "No sensitive fields exposed");

    assert(
        !methodCode.includes("INSERT") && 
        !methodCode.includes("UPDATE") && 
        !methodCode.includes("DELETE") && 
        !methodCode.includes("AuditLogger") &&
        !methodCode.includes("beginTransaction") &&
        !methodCode.includes("commit") &&
        !methodCode.includes("rollBack") &&
        !methodCode.includes("appointment_reschedules") &&
        !methodCode.includes("member_visits"), 
        "No lifecycle writes or transactions"
    );
}

const postRegex = /'POST' => \[([\s\S]*?)\]/s;
const patchRegex = /'PATCH' => \[([\s\S]*?)\]/s;
const deleteRegex = /'DELETE' => \[([\s\S]*?)\]/s;

const matchPost = indexCode.match(postRegex);
const matchPatch = indexCode.match(patchRegex);
const matchDelete = indexCode.match(deleteRegex);

const postContent = matchPost ? matchPost[1] : '';
const patchContent = matchPatch ? matchPatch[1] : '';
const deleteContent = matchDelete ? matchDelete[1] : '';

assert(!postContent.includes("'/api/reception/appointment-trainers'"), "No POST alias");
assert(!patchContent.includes("'/api/reception/appointment-trainers'"), "No PATCH alias");
assert(!deleteContent.includes("'/api/reception/appointment-trainers'"), "No DELETE alias");

assert(!indexCode.includes("'/api/public/appointment-trainers'"), "No public alias");
assert(!indexCode.includes("'/api/trainer/appointment-trainers'"), "No trainer alias");
assert(!indexCode.includes("'/api/admin/appointment-trainers'"), "No admin alias");

// Strict exact route logic extraction
const exactRouteRegex = /'\/api\/reception\/appointment-trainers'\s*=>\s*function\(\)\s*\{[^\}]*AuthMiddleware::handle\(\);[^\}]*AuthMiddleware::hasRole\(\['super_admin', 'admin', 'reception'\]\);[^\}]*getReceptionAppointmentTrainers\(\);[^\}]*\}/;
assert(exactRouteRegex.test(indexCode), "Strict GET route extraction");

console.log('=======================================================');
console.log(`Total Invariants Verified: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('=======================================================');

if (failed > 0) {
    console.error(`❌ SUCCESS FAILED: ${failed} invariant(s) failed.`);
    process.exit(1);
} else {
    console.log(`✅ SUCCESS: All Trainer Picker API Verification invariants verified.`);
    process.exit(0);
}
