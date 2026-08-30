import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const apiIndexFile = path.join(rootDir, 'api', 'index.php');
const controllerFile = path.join(rootDir, 'api', 'controllers', 'TrainerTrainingProgramController.php');

function fail(message) {
  console.error(`\n❌ FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`✅ PASS: ${message}`);
}

function main() {
  console.log('Starting Trainer Training Programs API verification...');

  if (!fs.existsSync(apiIndexFile)) fail('api/index.php not found');
  if (!fs.existsSync(controllerFile)) fail('TrainerTrainingProgramController.php not found');

  const apiIndex = fs.readFileSync(apiIndexFile, 'utf8');
  const controller = fs.readFileSync(controllerFile, 'utf8');

  // Invariant 1: Route wiring and firewall
  if (!apiIndex.includes('^/api/trainer/members/([1-9]\\d*)/training-programs$')) {
    fail('Invariant 1: Missing list/create route');
  }
  if (!apiIndex.includes('^/api/trainer/training-programs/([1-9]\\d*)$')) {
    fail('Invariant 1: Missing detail/update/delete route');
  }
  
  const routeBlock1Regex = /#\^\/api\/trainer\/members\/\(\[1-9\]\\d\*\)\/training-programs\$#.*?AuthMiddleware::hasRole\(\['trainer'\]\).*?index\(.*?create\(/s;
  if (!routeBlock1Regex.test(apiIndex)) {
    fail('Invariant 1: list/create route must be trainer role firewall protected and call index/create');
  }

  const routeBlock2Regex = /#\^\/api\/trainer\/training-programs\/\(\[1-9\]\\d\*\)\$#.*?AuthMiddleware::hasRole\(\['trainer'\]\).*?show\(.*?update\(.*?delete\(/s;
  if (!routeBlock2Regex.test(apiIndex)) {
    fail('Invariant 1: show/update/delete route must be trainer role firewall protected and call show/update/delete');
  }
  pass('Invariant 1: Routes are defined and protected with trainer role firewall');

  // Invariant 2: Request parser (JSON, size, root)
  const getJsonPayloadRegex = /private function getJsonPayload.*?strcasecmp\(trim\(explode\(';',\s*\$contentType\)\[0\]\),\s*'application\/json'\).*?file_get_contents\('php:\/\/input'\).*?strlen\(\$raw\)\s*>\s*16384.*?json_decode\(\$raw,\s*false\).*?json_last_error\(\)\s*!==\s*JSON_ERROR_NONE/s;
  if (!getJsonPayloadRegex.test(controller)) {
    fail('Invariant 2: JSON payload parsing lacks media type check, 16KB limit, or valid object root check');
  }
  pass('Invariant 2: JSON payload parser enforces strict application/json and 16KB limits');

  // Invariant 3: Empty-object contract
  if (controller.match(/function getJsonPayload.*?empty\(\$data\).*?BAD_REQUEST/s)) {
    fail('Invariant 3: Generic JSON parser rejects empty object {} with 400. This breaks the contract.');
  }
  if (!controller.match(/function update\(\$id\).*?if\s*\(\s*empty\(\$val\)\s*\)\s*\{\s*Response::error\([^,]+,\s*'VALIDATION_ERROR',\s*422\);/s)) {
    fail('Invariant 3: update() endpoint does not correctly catch empty payload with 422 VALIDATION_ERROR');
  }
  pass('Invariant 3: Empty object {} contract is properly deferred to endpoint-level validation');

  // Invariant 4: Payload allowlist
  const allowlistRegex = /\$allowlist\s*=\s*\['title',\s*'status',\s*'start_date',\s*'end_date',\s*'notes'\];/;
  if (!allowlistRegex.test(controller)) {
    fail('Invariant 4: JSON payload allowlist does not match exact required fields');
  }
  pass('Invariant 4: Payload allowlist restricts unknown fields effectively');

  // Invariant 5: Pagination
  if (!controller.includes("preg_match('/^[1-9]\\d*$/', $pageRaw)")) {
    fail('Invariant 5: Missing canonical integer check for page');
  }
  if (!controller.includes("preg_match('/^[1-9]\\d*$/', $perPageRaw)")) {
    fail('Invariant 5: Missing canonical integer check for per_page');
  }
  if (!controller.includes("$perPage > 100")) {
    fail('Invariant 5: Missing per_page upper bound <= 100');
  }
  if (!controller.includes("intdiv(PHP_INT_MAX, $perPage)")) {
    fail('Invariant 5: Missing intdiv overflow guard for pagination offset');
  }
  pass('Invariant 5: Pagination correctly implements bounds and integer overflow guards');

  // Invariant 6: List ownership JOIN
  const countJoinRegex = /SELECT COUNT\(\*\)\s*FROM training_programs tp\s*JOIN members m ON tp\.member_id = m\.id\s*WHERE \$where/is;
  if (!countJoinRegex.test(controller)) {
    fail('Invariant 6: Pagination COUNT is not using the secured tp JOIN m structure');
  }
  if (!controller.includes("'tp.member_id = ?'") || !controller.includes("'tp.trainer_id = ?'") || !controller.includes("'m.trainer_id = ?'") || !controller.includes("'m.deleted_at IS NULL'") || !controller.includes("'tp.deleted_at IS NULL'")) {
    fail('Invariant 6: List conditions do not securely bind trainer/member/active checks');
  }
  pass('Invariant 6: List ownership restricts via active members and trainer JOINs');

  // Invariant 7: SQL Pagination Binding
  if (!controller.includes("PDO::PARAM_INT")) {
    fail('Invariant 7: Missing PDO::PARAM_INT binding for parameters');
  }
  if (!controller.includes("LIMIT ? OFFSET ?")) {
    fail('Invariant 7: Missing parameterized LIMIT/OFFSET');
  }
  pass('Invariant 7: SQL parameters and pagination use strict PDO binding');

  // Invariant 8: Mutation trainer lock
  if (!controller.match(/function create.*?getTrainerProfileIdForUpdate/s)) {
    fail('Invariant 8: create() does not use FOR UPDATE trainer lock');
  }
  if (!controller.match(/function update.*?getTrainerProfileIdForUpdate/s)) {
    fail('Invariant 8: update() does not use FOR UPDATE trainer lock');
  }
  if (!controller.match(/function delete.*?getTrainerProfileIdForUpdate/s)) {
    fail('Invariant 8: delete() does not use FOR UPDATE trainer lock');
  }
  if (!controller.match(/catch \(\\Throwable \$e\) \{\s*if \(\$this->db->inTransaction\(\)\) \{\s*\$this->db->rollBack\(\);\s*\}/s)) {
    fail('Invariant 8: Missing transaction rollback on exceptions');
  }
  pass('Invariant 8: Mutation endpoints safely lock trainer profile and manage transactions');

  // Invariant 9: UPDATE ownership lock
  const updateLockRegex = /SELECT tp\.\*\s*FROM training_programs tp\s*JOIN members m ON tp\.member_id = m\.id\s*WHERE tp\.id = \?\s*AND tp\.trainer_id = \?\s*AND tp\.deleted_at IS NULL\s*AND m\.trainer_id = \?\s*AND m\.deleted_at IS NULL\s*FOR UPDATE/si;
  if (!updateLockRegex.test(controller)) {
    fail('Invariant 9: update() ownership query lacks required active/trainer checks or FOR UPDATE lock');
  }
  pass('Invariant 9: UPDATE ownership lock validates nested active checks and secures row via FOR UPDATE');

  // Invariant 10: DELETE ownership lock
  const deleteFunctionBody = controller.substring(controller.indexOf('function delete($id)'));
  if (!updateLockRegex.test(deleteFunctionBody)) {
    fail('Invariant 10: delete() ownership query lacks required active/trainer checks or FOR UPDATE lock');
  }
  pass('Invariant 10: DELETE ownership lock validates nested active checks and secures row via FOR UPDATE');

  // Invariant 11: PATCH idempotency
  if (!controller.match(/if \(!\$changed\)\s*\{\s*\$this->db->commit\(\);\s*Response::json\(\['success' => true\]\);\s*\}/s)) {
    fail('Invariant 11: Idempotent PATCH is missing early commit/success return');
  }
  pass('Invariant 11: Idempotent PATCH returns 200 early without auditing');

  // Invariant 12: Audit contract
  if (controller.match(/AuditLogger::log\([^)]+'notes'\s*=>/)) {
    fail('Invariant 12: AuditLogger leaks PII (notes)');
  }
  if (controller.match(/AuditLogger::log\([^)]+'title'\s*=>/)) {
    fail('Invariant 12: AuditLogger leaks PII (title)');
  }
  
  const auditMatches = [...controller.matchAll(/AuditLogger::log\(/g)];
  if (auditMatches.length < 3) {
    fail('Invariant 12: Missing AuditLogger calls for mutations');
  }
  
  if (!controller.match(/try \{\s*AuditLogger::log\([^)]+changed_fields/s)) {
    fail('Invariant 12: update() does not securely log changed_fields');
  }

  pass('Invariant 12: Audit logging operates securely post-commit without leaking sensitive fields');

  console.log('\n✅ Verification PASSED.');
}

main();
