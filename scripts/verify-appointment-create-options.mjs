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

// 8. method rejects nonempty query
assert(controllerCode.includes("if (!empty($_GET)) {"), "Method rejects nonempty query");

// 9. SQL selects only id, name
const sqlSelectRegex = /SELECT\s+id,\s*name\s+FROM\s+trainers/i;
assert(sqlSelectRegex.test(controllerCode), "SQL selects exactly id, name");

// 10. deleted_at IS NULL
assert(controllerCode.includes("deleted_at IS NULL"), "deleted_at IS NULL filter exists");

// 11. is_active = 1
assert(controllerCode.includes("is_active = 1"), "is_active = 1 filter exists");

// 12. ORDER BY sort_order ASC, id ASC
assert(controllerCode.includes("ORDER BY sort_order ASC, id ASC"), "ORDER BY sort_order ASC, id ASC exists");

// 13-15 response formatting
assert(controllerCode.includes("'id' => (int)\$t['id']"), "Integer normalization for ID");
assert(controllerCode.includes("'name' => (string)\$t['name']"), "String normalization for name");
assert(controllerCode.includes("Response::json(['items' => $"), "Response root exact conceptual items");

// 17-18. no lifecycle writes
const methodCodeRegex = /public function getReceptionAppointmentTrainers.*?Response::(json|error)/s;
const methodCodeMatch = controllerCode.match(methodCodeRegex);
const methodCode = methodCodeMatch ? methodCodeMatch[0] : "";

// 16. no sensitive trainer fields
assert(!methodCode.includes("admin_id") && !methodCode.includes("email") && !methodCode.includes("bio") && !methodCode.includes("credentials"), "No sensitive fields exposed");

assert(
    !methodCode.includes("INSERT") && 
    !methodCode.includes("UPDATE") && 
    !methodCode.includes("DELETE") && 
    !methodCode.includes("AuditLogger"), 
    "No lifecycle writes or transactions"
);

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
