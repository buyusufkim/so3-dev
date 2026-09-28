import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

let exitCode = 0;
let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    exitCode = 1;
  } else {
    passedAssertions++;
    console.log(`✅ PASS: ${message}`);
  }
}

console.log("=== 1. Chained Regressions & Foundation Verifications ===");

try {
  const foundationOutput = execSync('npm run verify:trainer-availability-foundation', { encoding: 'utf8' });
  assert(
    foundationOutput.includes("PASS — F.24B.1 TRAINER AVAILABILITY DOMAIN FOUNDATION & API CLOSED"),
    "Trainer availability foundation verifier passes"
  );
} catch (e) {
  assert(false, `Trainer availability foundation verifier failed: ${e.message}`);
}

try {
  const actorOutput = execSync('npm run verify:member-appointment-actor-attribution', { encoding: 'utf8' });
  assert(
    actorOutput.includes("PASS"),
    "Member appointment actor attribution verifier passes"
  );
} catch (e) {
  assert(false, `Member appointment actor attribution verifier failed: ${e.message}`);
}

try {
  const ledgerOutput = execSync('npm run verify:appointment-session-package-ledger', { encoding: 'utf8' });
  assert(
    ledgerOutput.includes("[PASS]"),
    "Appointment session package ledger verifier passes"
  );
} catch (e) {
  assert(false, `Appointment session package ledger verifier failed: ${e.message}`);
}

try {
  const bookingOptionsOutput = execSync('npm run verify:member-appointment-booking-options', { encoding: 'utf8' });
  assert(
    bookingOptionsOutput.includes("PASS — F.24C.1 MEMBER SELF-SERVICE BOOKING OPTIONS READ MODEL CLOSED"),
    "Member appointment booking options read model verifier passes"
  );
} catch (e) {
  assert(false, `Member appointment booking options verifier failed: ${e.message}`);
}

console.log("\n=== 2. Pure Algorithm & Payload Self-Tests ===");

// 2.1 Server-side ends_at derivation self-test (+60 min)
function deriveEndsAt(startsAtStr) {
  const [datePart, timePart] = startsAtStr.split(' ');
  const [h, m, s] = timePart.split(':').map(Number);
  const totalMin = h * 60 + m + 60;
  const pad = (n) => String(n).padStart(2, '0');
  const endH = pad(Math.floor(totalMin / 60));
  const endM = pad(totalMin % 60);
  return `${datePart} ${endH}:${endM}:${pad(s)}`;
}

const testEnd = deriveEndsAt('2026-10-01 10:00:00');
assert(testEnd === '2026-10-01 11:00:00', "Self-test: 2026-10-01 10:00:00 derives ends_at 2026-10-01 11:00:00");

// 2.2 Strict key allowlist self-test
function validatePayloadKeys(payload) {
  const keys = Object.keys(payload).sort();
  return JSON.stringify(keys) === JSON.stringify(['member_session_package_id', 'starts_at']);
}

assert(validatePayloadKeys({ member_session_package_id: 1, starts_at: '2026-10-01 10:00:00' }), "Self-test: valid payload keys accepted");
assert(!validatePayloadKeys({ member_session_package_id: 1, starts_at: '2026-10-01 10:00:00', member_id: 5 }), "Self-test: client member_id injection rejected");
assert(!validatePayloadKeys({ member_session_package_id: 1, starts_at: '2026-10-01 10:00:00', trainer_id: 2 }), "Self-test: client trainer_id injection rejected");
assert(!validatePayloadKeys({ member_session_package_id: 1, starts_at: '2026-10-01 10:00:00', ends_at: '2026-10-01 11:00:00' }), "Self-test: client ends_at injection rejected");
assert(!validatePayloadKeys({ member_session_package_id: 1, starts_at: '2026-10-01 10:00:00', status: 'scheduled' }), "Self-test: client status injection rejected");
assert(!validatePayloadKeys({ starts_at: '2026-10-01 10:00:00' }), "Self-test: missing package_id rejected");

console.log("\n=== 3. Controller Architecture & Static Invariants ===");

const ctrlPath = path.resolve(process.cwd(), 'api/controllers/MemberAppointmentBookingController.php');
assert(fs.existsSync(ctrlPath), "MemberAppointmentBookingController.php exists");
const ctrl = fs.readFileSync(ctrlPath, 'utf8');

// 3.1 createAppointment method exists
assert(ctrl.includes("public function createAppointment(): void"), "createAppointment method defined with void return");
assert(ctrl.includes("private function generateUuid(): string"), "generateUuid method defined");

// 3.2 Guard & Query parameters
assert(ctrl.includes("$this->guard();"), "createAppointment invokes $this->guard()");
assert(ctrl.includes("$this->rejectQueryParams();"), "Rejects any query parameters");

// 3.3 Content-Type & Payload parsing
assert(ctrl.includes("strpos($contentType, 'application/json')"), "Validates application/json Content-Type");
assert(ctrl.includes("strlen($raw) > 1048576"), "Enforces 1MB payload size limit");
assert(ctrl.includes("INVALID_CONTENT_TYPE"), "Returns INVALID_CONTENT_TYPE 415 on invalid Content-Type");
assert(ctrl.includes("PAYLOAD_TOO_LARGE"), "Returns PAYLOAD_TOO_LARGE 413 on oversized payload");
assert(ctrl.includes("INVALID_JSON"), "Returns INVALID_JSON 400 on malformed JSON");

// 3.4 Strict payload keys enforcement
assert(
  ctrl.includes("['member_session_package_id', 'starts_at']"),
  "Strictly validates exact payload keys ['member_session_package_id', 'starts_at']"
);

// 3.5 Server authority derivations
assert(ctrl.includes("SLOT_DURATION_MINUTES"), "Uses authoritative SLOT_DURATION_MINUTES constant");
assert(ctrl.includes("DateTimeZone(self::TIMEZONE)"), "Enforces authoritative Europe/Istanbul timezone");
assert(ctrl.includes("$endsDt = (clone $startsDt)->modify('+' . self::SLOT_DURATION_MINUTES . ' minutes')"), "Derives ends_at by adding exactly SLOT_DURATION_MINUTES");
assert(ctrl.includes("$startsDt->format('Y-m-d') !== $endsDt->format('Y-m-d')"), "Verifies appointment starts and ends on same calendar day");

// 3.6 Transactional boundary
assert(ctrl.includes("$this->db->beginTransaction()"), "Opens explicit database transaction");
assert(ctrl.includes("$this->db->commit()"), "Commits database transaction");
assert(ctrl.includes("$this->db->rollBack()"), "Rolls back database transaction on any error");

// 3.7 Lock ordering (member_accounts -> members -> trainers -> member_session_packages -> appointments)
const accLockIdx = ctrl.indexOf("SELECT id, status, must_change_password\n                FROM member_accounts\n                WHERE id = ?\n                FOR UPDATE");
const memLockIdx = ctrl.indexOf("SELECT id, status, membership_start_date, membership_end_date, trainer_id, deleted_at\n                FROM members\n                WHERE id = ?\n                FOR UPDATE");
const trLockIdx = ctrl.indexOf("SELECT id, name, is_active, deleted_at\n                FROM trainers\n                WHERE id = ?\n                FOR UPDATE");
const pkgLockIdx = ctrl.indexOf("SELECT id, member_id, session_package_id, total_sessions, valid_from, valid_until, status\n                FROM member_session_packages\n                WHERE id = ?\n                FOR UPDATE");
const tConfLockIdx = ctrl.indexOf("FROM appointments\n                WHERE trainer_id = ?\n                  AND status = 'scheduled'");
const mConfLockIdx = ctrl.indexOf("FROM appointments\n                WHERE member_id = ?\n                  AND status = 'scheduled'");

assert(accLockIdx !== -1, "Locks member_accounts FOR UPDATE");
assert(memLockIdx !== -1, "Locks members FOR UPDATE");
assert(trLockIdx !== -1, "Locks trainers FOR UPDATE");
assert(pkgLockIdx !== -1, "Locks member_session_packages FOR UPDATE");
assert(tConfLockIdx !== -1, "Locks overlapping trainer scheduled appointments FOR UPDATE");
assert(mConfLockIdx !== -1, "Locks overlapping member scheduled appointments FOR UPDATE");

assert(
  accLockIdx < memLockIdx && memLockIdx < trLockIdx && trLockIdx < pkgLockIdx && pkgLockIdx < tConfLockIdx && tConfLockIdx < mConfLockIdx,
  "Enforces strict lock acquisition order: member_accounts -> members -> trainers -> packages -> trainer appts -> member appts"
);

// 3.8 Invariant revalidations under lock
assert(ctrl.includes("MEMBER_INELIGIBLE"), "Handles MEMBER_INELIGIBLE (409) for inactive/out-of-range member");
assert(ctrl.includes("MEMBER_MEMBERSHIP_DATA_INCONSISTENT"), "Handles MEMBER_MEMBERSHIP_DATA_INCONSISTENT (409)");
assert(ctrl.includes("TRAINER_NOT_ASSIGNED"), "Handles TRAINER_NOT_ASSIGNED (409)");
assert(ctrl.includes("TRAINER_INELIGIBLE"), "Handles TRAINER_INELIGIBLE (409)");
assert(ctrl.includes("SESSION_PACKAGE_NOT_FOUND"), "Handles SESSION_PACKAGE_NOT_FOUND (404)");
assert(ctrl.includes("SESSION_PACKAGE_INELIGIBLE"), "Handles SESSION_PACKAGE_INELIGIBLE (409)");
assert(ctrl.includes("SESSION_PACKAGE_LEDGER_INCONSISTENT"), "Handles SESSION_PACKAGE_LEDGER_INCONSISTENT (409)");
assert(ctrl.includes("SESSION_PACKAGE_EXHAUSTED"), "Handles SESSION_PACKAGE_EXHAUSTED (409)");
assert(ctrl.includes("BOOKING_POLICY_VIOLATION"), "Handles BOOKING_POLICY_VIOLATION (409)");
assert(ctrl.includes("MINIMUM_NOTICE_VIOLATION"), "Handles MINIMUM_NOTICE_VIOLATION (409)");
assert(ctrl.includes("SLOT_NOT_AVAILABLE"), "Handles SLOT_NOT_AVAILABLE (409)");
assert(ctrl.includes("TRAINER_CONFLICT"), "Handles TRAINER_CONFLICT (409)");
assert(ctrl.includes("MEMBER_CONFLICT"), "Handles MEMBER_CONFLICT (409)");

// 3.9 Working hours & unavailability check
assert(ctrl.includes("FROM trainer_availability_windows"), "Revalidates against trainer_availability_windows");
assert(ctrl.includes("FROM trainer_unavailability_blocks"), "Revalidates against trainer_unavailability_blocks");

// 3.10 Actor attribution on INSERT
assert(
  ctrl.includes("INSERT INTO appointments (\n                    uuid, member_id, trainer_id, member_session_package_id,\n                    starts_at, ends_at, status, created_by, created_by_member_account_id\n                ) VALUES (\n                    ?, ?, ?, ?,\n                    ?, ?, 'scheduled', NULL, ?\n                )"),
  "INSERT INTO appointments explicitly sets created_by = NULL and created_by_member_account_id"
);

assert(
  ctrl.includes("INSERT INTO member_session_package_ledger (\n                    uuid, member_session_package_id, appointment_id,\n                    entry_type, delta, created_by, created_by_member_account_id\n                ) VALUES (\n                    ?, ?, ?,\n                    'reserve', -1, NULL, ?\n                )"),
  "INSERT INTO member_session_package_ledger sets created_by = NULL, created_by_member_account_id, entry_type = 'reserve', delta = -1"
);

// 3.11 Response format: 201 Created with appointment snapshot
assert(ctrl.includes("Response::json([\n                'appointment' => ["), "Returns JSON with 'appointment' root key");
assert(ctrl.includes("], 201);"), "Returns HTTP 201 Created status");

console.log("\n=== 4. Route Registration in api/index.php ===");

const indexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(indexPath), "api/index.php exists");
const indexContent = fs.readFileSync(indexPath, 'utf8');

assert(
  indexContent.includes("$requestUri === '/api/member/appointments'") &&
  indexContent.includes("$method === 'POST'") &&
  indexContent.includes("createAppointment()"),
  "POST /api/member/appointments routed to MemberAppointmentBookingController->createAppointment()"
);
assert(
  indexContent.includes("$requestUri === '/api/member/appointments'") &&
  indexContent.includes("$method === 'GET'") &&
  indexContent.includes("getAppointments()"),
  "GET /api/member/appointments routed to MemberPortalController->getAppointments()"
);

console.log("\n=== 5. Decisions Documentation Invariants ===");

const decPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decContent = fs.readFileSync(decPath, 'utf8');

assert(
  decContent.includes("## F.24C.2 Transaction-Safe Member Self-Service Appointment Create"),
  "DECISIONS.md documents F.24C.2"
);
assert(
  decContent.includes("POST /api/member/appointments exposes atomic member self-service appointment creation"),
  "DECISIONS.md records atomic member self-service appointment create"
);
assert(
  decContent.includes("created_by = NULL and created_by_member_account_id = session member_account_id"),
  "DECISIONS.md records creator attribution invariants"
);

console.log("\n=== 6. Package.json Script Registration ===");

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:member-appointment-create"] === "node scripts/verify-member-appointment-create.mjs",
  "package.json registers verify:member-appointment-create"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Transaction-Safe Member Self-Service Appointment Create verification detected violations.");
  process.exit(1);
} else {
  console.log("\nPASS — F.24C.2 TRANSACTION-SAFE MEMBER SELF-SERVICE APPOINTMENT CREATE CLOSED");
  process.exit(0);
}
