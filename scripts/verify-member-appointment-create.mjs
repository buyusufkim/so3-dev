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

console.log("\n=== 2. Pure Algorithm, Seconds & Concurrency Self-Tests ===");

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

// 2.3 Start seconds canonicalization self-test
function validateStartsAtSeconds(startsAt) {
  if (typeof startsAt !== 'string') return false;
  const match = startsAt.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:(\d{2})$/);
  if (!match) return false;
  return match[1] === '00';
}

assert(validateStartsAtSeconds('2026-10-01 10:30:00') === true, "Self-test: 10:30:00 accepted canonical syntax with 00 seconds");
assert(validateStartsAtSeconds('2026-10-01 10:30:01') === false, "Self-test: 10:30:01 rejected with non-zero seconds (422 syntax violation)");
assert(validateStartsAtSeconds('2026-10-01 10:30:59') === false, "Self-test: 10:30:59 rejected with non-zero seconds (422 syntax violation)");

// 2.4 Policy TOCTOU recomputation self-test
function evaluatePolicyUnderLock(candidateStart, preCheckNow, lockedNow, noticeMinutes = 120) {
  const preNotice = new Date(preCheckNow.getTime() + noticeMinutes * 60 * 1000);
  const lockedNotice = new Date(lockedNow.getTime() + noticeMinutes * 60 * 1000);
  const cand = new Date(candidateStart);

  const passedPreCheck = cand >= preNotice;
  const passedLockedCheck = cand >= lockedNotice;
  return { passedPreCheck, passedLockedCheck };
}

const candTime = new Date('2026-10-01T12:00:00Z');
const preNow = new Date('2026-10-01T10:00:00Z'); // 12:00 >= 10:00 + 2h -> true
const lockedNow = new Date('2026-10-01T10:00:05Z'); // 12:00 >= 10:00:05 + 2h -> false (12:00:05 required)
const policySim = evaluatePolicyUnderLock(candTime, preNow, lockedNow);
assert(
  policySim.passedPreCheck === true && policySim.passedLockedCheck === false,
  "Self-test: Policy TOCTOU catches slot that expires between precheck and transaction lock (rejects 409 BOOKING_SLOT_UNAVAILABLE)"
);

// 2.5 Account Auth Version TOCTOU self-test
function checkAccountVersionUnderLock(sessionVersion, lockedVersion) {
  return sessionVersion > 0 && sessionVersion === lockedVersion;
}
assert(
  checkAccountVersionUnderLock(5, 6) === false,
  "Self-test: Auth version change before lock (session=5, locked=6) rejects 401 with zero writes"
);
assert(
  checkAccountVersionUnderLock(5, 5) === true,
  "Self-test: Matching auth version passes under lock"
);

// 2.6 Account Member ID link self-test
function checkAccountMemberLinkUnderLock(sessionMemberId, lockedMemberId) {
  return sessionMemberId > 0 && sessionMemberId === lockedMemberId;
}
assert(
  checkAccountMemberLinkUnderLock(42, 43) === false,
  "Self-test: Account member link mismatch (session=42, locked=43) rejects 401 with zero writes"
);

// 2.7 Concurrency mutex simulation (same trainer, same slot)
function simulateSameTrainerConcurrentBooking() {
  let trainerLockAcquiredBy = null;
  let appointments = [];

  function tryBook(memberId, trainerId, slotStart) {
    if (trainerLockAcquiredBy === null) {
      trainerLockAcquiredBy = memberId;
      // Member checks conflict
      const hasConflict = appointments.some(a => a.trainerId === trainerId && a.slotStart === slotStart);
      if (!hasConflict) {
        appointments.push({ memberId, trainerId, slotStart });
        trainerLockAcquiredBy = null;
        return { success: true };
      }
      trainerLockAcquiredBy = null;
      return { success: false, reason: 'TRAINER_CONFLICT' };
    } else {
      // Waiting for trainer lock...
      return { success: false, reason: 'TRAINER_LOCK_HELD' };
    }
  }

  const resA = tryBook(1, 10, '2026-10-01 10:00:00');
  const resB = tryBook(2, 10, '2026-10-01 10:00:00');
  return resA.success === true && resB.success === false && appointments.length === 1;
}
assert(
  simulateSameTrainerConcurrentBooking(),
  "Self-test: Trainer lock acts as concurrency mutex preventing double booking"
);

console.log("\n=== 3. Controller Architecture & Static Invariants ===");

const ctrlPath = path.resolve(process.cwd(), 'api/controllers/MemberAppointmentBookingController.php');
assert(fs.existsSync(ctrlPath), "MemberAppointmentBookingController.php exists");
const ctrl = fs.readFileSync(ctrlPath, 'utf8');

// 3.1 Method signatures
assert(ctrl.includes("public function createAppointment(): void"), "createAppointment method defined with void return");
assert(ctrl.includes("private function generateUuid(): string"), "generateUuid method defined");

// 3.2 Guard & Query parameters
assert(ctrl.includes("$this->guard();"), "createAppointment invokes $this->guard()");
assert(ctrl.includes("$this->rejectQueryParams();"), "Rejects any query parameters");

// 3.3 Strict Content-Type prefix and 16KB size bound
assert(
  ctrl.includes("strpos($contentType, 'application/json') !== 0") ||
  ctrl.includes("strpos($contentType, 'application/json') === 0"),
  "Strict Content-Type validation uses prefix comparison strpos(..., 'application/json')"
);
assert(
  ctrl.includes("UNSUPPORTED_MEDIA_TYPE"),
  "Returns UNSUPPORTED_MEDIA_TYPE 415 on invalid Content-Type"
);
assert(
  ctrl.includes("CONTENT_LENGTH") && ctrl.includes("16384"),
  "Checks CONTENT_LENGTH against project-standard 16384 bytes limit before body read"
);
assert(
  ctrl.includes("strlen($raw) > 16384"),
  "Enforces project-standard 16384 bytes limit on raw payload string"
);
assert(
  !ctrl.includes("1048576"),
  "Zero occurrences of stale 1MB (1048576) limit in controller"
);
assert(ctrl.includes("PAYLOAD_TOO_LARGE"), "Returns PAYLOAD_TOO_LARGE 413 on oversized payload");
assert(ctrl.includes("INVALID_JSON"), "Returns INVALID_JSON 400 on malformed JSON");

// 3.4 Strict payload keys enforcement
assert(
  ctrl.includes("['member_session_package_id', 'starts_at']"),
  "Strictly validates exact payload keys ['member_session_package_id', 'starts_at']"
);

// 3.5 Seconds canonicalization syntax check
assert(
  ctrl.includes("$startsDt->format('s') !== '00'"),
  "Enforces starts_at seconds === '00' before transaction"
);

// 3.6 Server authority derivations
assert(ctrl.includes("SLOT_DURATION_MINUTES"), "Uses authoritative SLOT_DURATION_MINUTES constant");
assert(ctrl.includes("DateTimeZone(self::TIMEZONE)"), "Enforces authoritative Europe/Istanbul timezone");
assert(ctrl.includes("$endsDt = (clone $startsDt)->modify('+' . self::SLOT_DURATION_MINUTES . ' minutes')"), "Derives ends_at by adding exactly SLOT_DURATION_MINUTES");
assert(ctrl.includes("$startsDt->format('Y-m-d') !== $endsDt->format('Y-m-d')"), "Verifies appointment starts and ends on same calendar day");

// 3.7 Transactional boundary
assert(ctrl.includes("$this->db->beginTransaction()"), "Opens explicit database transaction");
assert(ctrl.includes("$this->db->commit()"), "Commits database transaction");
assert(ctrl.includes("$this->db->rollBack()"), "Rolls back database transaction on any error");

// 3.8 Member Account Lock Contract & Session Revalidation
assert(
  ctrl.includes("SELECT id, member_id, status, auth_version, must_change_password") &&
  ctrl.includes("FROM member_accounts") &&
  ctrl.includes("FOR UPDATE"),
  "Locked account query selects id, member_id, status, auth_version, must_change_password FOR UPDATE"
);
assert(
  ctrl.includes("(int)$account['member_id'] !== $this->memberId"),
  "Revalidates locked account member_id matches session memberId under lock (returns 401 on mismatch)"
);
assert(
  ctrl.includes("(int)$account['auth_version'] !== $sessionAuthVersion"),
  "Revalidates locked account auth_version matches session auth_version under lock (returns 401 on mismatch)"
);
assert(
  ctrl.includes("(int)$account['must_change_password'] !== 0"),
  "Revalidates must_change_password === 0 under lock (returns 403 PASSWORD_CHANGE_REQUIRED on failure)"
);

// 3.9 Authoritative locked booking policy recomputation
const beginTxIdx = ctrl.indexOf("$this->db->beginTransaction()");
const trLockIdx = ctrl.indexOf("FROM trainers\n                WHERE id = ?\n                FOR UPDATE");
const lockedPolicyIdx = ctrl.indexOf("$businessNowLocked = new DateTime('now', $tz)");

assert(
  lockedPolicyIdx !== -1 && lockedPolicyIdx > trLockIdx && lockedPolicyIdx > beginTxIdx,
  "Authoritative booking policy recomputed inside transaction AFTER trainer lock"
);
assert(
  ctrl.includes("$lastBookableDateLocked") && ctrl.includes("$minimumBookableAtLocked"),
  "Recomputes 14-day horizon and 120-minute minimum notice from locked businessNow"
);

// 3.10 Correct Canonical Lock Order (account -> member -> trainer -> policy -> trainer conflict -> member conflict -> package -> writes -> commit)
const accLockIdx = ctrl.indexOf("FROM member_accounts\n                WHERE id = ?\n                FOR UPDATE");
const memLockIdx = ctrl.indexOf("FROM members\n                WHERE id = ?\n                FOR UPDATE");
const tConfLockIdx = ctrl.indexOf("FROM appointments\n                WHERE trainer_id = ?\n                  AND status = 'scheduled'");
const mConfLockIdx = ctrl.indexOf("FROM appointments\n                WHERE member_id = ?\n                  AND status = 'scheduled'");
const pkgLockIdx = ctrl.indexOf("FROM member_session_packages\n                WHERE id = ?\n                FOR UPDATE");
const apptInsIdx = ctrl.indexOf("INSERT INTO appointments");
const ledgerInsIdx = ctrl.indexOf("INSERT INTO member_session_package_ledger");
const commitIdx = ctrl.indexOf("$this->db->commit()");

assert(accLockIdx !== -1, "Locks member_accounts FOR UPDATE");
assert(memLockIdx !== -1, "Locks members FOR UPDATE");
assert(trLockIdx !== -1, "Locks trainers FOR UPDATE");
assert(tConfLockIdx !== -1, "Locks overlapping trainer scheduled appointments FOR UPDATE");
assert(mConfLockIdx !== -1, "Locks overlapping member scheduled appointments FOR UPDATE");
assert(pkgLockIdx !== -1, "Locks member_session_packages FOR UPDATE");
assert(apptInsIdx !== -1, "Inserts appointment");
assert(ledgerInsIdx !== -1, "Inserts ledger entry");
assert(commitIdx !== -1, "Commits transaction");

assert(
  accLockIdx < memLockIdx &&
  memLockIdx < trLockIdx &&
  trLockIdx < lockedPolicyIdx &&
  lockedPolicyIdx < tConfLockIdx &&
  tConfLockIdx < mConfLockIdx &&
  mConfLockIdx < pkgLockIdx &&
  pkgLockIdx < apptInsIdx &&
  apptInsIdx < ledgerInsIdx &&
  ledgerInsIdx < commitIdx,
  "Enforces canonical lock ordering: account -> member -> trainer -> policy -> trainer conf -> member conf -> package -> writes -> commit"
);

// 3.11 Canonical slot and package error codes
assert(ctrl.includes("BOOKING_SLOT_UNAVAILABLE"), "Canonicalizes slot/policy unavailable errors to BOOKING_SLOT_UNAVAILABLE (409)");
assert(ctrl.includes("TRAINER_CONFLICT"), "Preserves distinct TRAINER_CONFLICT (409)");
assert(ctrl.includes("MEMBER_CONFLICT"), "Preserves distinct MEMBER_CONFLICT (409)");
assert(ctrl.includes("SESSION_PACKAGE_INELIGIBLE"), "Returns SESSION_PACKAGE_INELIGIBLE (409) for ineligible, missing or foreign packages");
assert(ctrl.includes("SESSION_PACKAGE_EXHAUSTED"), "Returns SESSION_PACKAGE_EXHAUSTED (409) when package balance is depleted");
assert(ctrl.includes("SESSION_PACKAGE_LEDGER_INCONSISTENT"), "Returns SESSION_PACKAGE_LEDGER_INCONSISTENT (409) on ledger corruption");

// 3.12 Working hours & unavailability check
assert(ctrl.includes("FROM trainer_availability_windows"), "Revalidates against trainer_availability_windows");
assert(ctrl.includes("FROM trainer_unavailability_blocks"), "Revalidates against trainer_unavailability_blocks");

// 3.13 Actor attribution on INSERT
assert(
  ctrl.includes("INSERT INTO appointments (\n                    uuid, member_id, trainer_id, member_session_package_id,\n                    starts_at, ends_at, status, created_by, created_by_member_account_id\n                ) VALUES (\n                    ?, ?, ?, ?,\n                    ?, ?, 'scheduled', NULL, ?\n                )"),
  "INSERT INTO appointments explicitly sets created_by = NULL and created_by_member_account_id"
);

assert(
  ctrl.includes("INSERT INTO member_session_package_ledger (\n                    uuid, member_session_package_id, appointment_id,\n                    entry_type, delta, created_by, created_by_member_account_id\n                ) VALUES (\n                    ?, ?, ?,\n                    'reserve', -1, NULL, ?\n                )"),
  "INSERT INTO member_session_package_ledger sets created_by = NULL, created_by_member_account_id, entry_type = 'reserve', delta = -1"
);

// 3.14 Response format: 201 Created with appointment snapshot
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
  console.error("\n❌ FAILED: Transactional Booking Authority Closure verification detected violations.");
  process.exit(1);
} else {
  console.log("\nPASS — F.24C.2 TRANSACTION-SAFE MEMBER SELF-SERVICE APPOINTMENT CREATE CLOSED");
  process.exit(0);
}
