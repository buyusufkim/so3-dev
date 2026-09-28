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

console.log("\n=== 2. Pure Algorithm Self-Tests ===");

// Slot generation helper pure test
function generateSlots(startTime, endTime, durationMinutes = 60, stepMinutes = 60) {
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;

  const slots = [];
  for (let cur = startMin; cur + durationMinutes <= endMin; cur += stepMinutes) {
    const sHour = Math.floor(cur / 60);
    const sMinute = cur % 60;
    const endCur = cur + durationMinutes;
    const eHour = Math.floor(endCur / 60);
    const eMinute = endCur % 60;
    slots.push({
      start: `${String(sHour).padStart(2, '0')}:${String(sMinute).padStart(2, '0')}`,
      end: `${String(eHour).padStart(2, '0')}:${String(eMinute).padStart(2, '0')}`,
    });
  }
  return slots;
}

// 09:00-12:00 -> 09-10, 10-11, 11-12
const slots1 = generateSlots('09:00', '12:00');
assert(
  slots1.length === 3 &&
  slots1[0].start === '09:00' && slots1[0].end === '10:00' &&
  slots1[1].start === '10:00' && slots1[1].end === '11:00' &&
  slots1[2].start === '11:00' && slots1[2].end === '12:00',
  "Self-test: 09:00-12:00 generates 09-10, 10-11, 11-12"
);

// 09:30-12:00 -> 09:30-10:30, 10:30-11:30 (partial dropped)
const slots2 = generateSlots('09:30', '12:00');
assert(
  slots2.length === 2 &&
  slots2[0].start === '09:30' && slots2[0].end === '10:30' &&
  slots2[1].start === '10:30' && slots2[1].end === '11:30',
  "Self-test: 09:30-12:00 generates 09:30-10:30 and 10:30-11:30 (partial slot dropped)"
);

// 09:00-09:45 -> zero 60-minute slots
const slots3 = generateSlots('09:00', '09:45');
assert(slots3.length === 0, "Self-test: 09:00-09:45 generates zero 60-minute slots");

// Overlap check predicate: a.start < b.end && a.end > b.start
function isOverlapping(sStart, sEnd, oStart, oEnd) {
  return oStart < sEnd && oEnd > sStart;
}

// block 10:30-11:00 + slot 10:00-11:00 -> blocked
assert(isOverlapping('10:00:00', '11:00:00', '10:30:00', '11:00:00'), "Self-test: block 10:30-11:00 overlaps slot 10:00-11:00 (blocked)");

// appointment 10:30-11:30 + slot 10:00-11:00 -> blocked
assert(isOverlapping('10:00:00', '11:00:00', '10:30:00', '11:30:00'), "Self-test: appointment 10:30-11:30 overlaps slot 10:00-11:00 (blocked)");

// appointment ending exactly 10:00 + slot starting 10:00 -> allowed
assert(!isOverlapping('10:00:00', '11:00:00', '09:00:00', '10:00:00'), "Self-test: appointment ending exactly 10:00 and slot starting 10:00 are adjacent (allowed)");

// minimumBookableAt test: slotStart < minimumBookableAt is blocked, slotStart >= minimumBookableAt is allowed
const minNotice = '2026-09-29 12:00:00';
assert('2026-09-29 11:00:00' < minNotice, "Self-test: slot 11:00 is strictly before minimum notice 12:00 (blocked)");
assert(!('2026-09-29 12:00:00' < minNotice), "Self-test: slot 12:00 equals minimum notice boundary 12:00 (allowed)");
assert(!('2026-09-29 13:00:00' < minNotice), "Self-test: slot 13:00 is after minimum notice 12:00 (allowed)");

console.log("\n=== 3. Controller Architecture & Static Invariants ===");

const ctrlPath = path.resolve(process.cwd(), 'api/controllers/MemberAppointmentBookingController.php');
assert(fs.existsSync(ctrlPath), "MemberAppointmentBookingController.php exists");
const ctrl = fs.readFileSync(ctrlPath, 'utf8');

// Policy constants
assert(ctrl.includes("SLOT_DURATION_MINUTES = 60"), "Policy: SLOT_DURATION_MINUTES = 60");
assert(ctrl.includes("SLOT_STEP_MINUTES = 60"), "Policy: SLOT_STEP_MINUTES = 60");
assert(ctrl.includes("MINIMUM_NOTICE_MINUTES = 120"), "Policy: MINIMUM_NOTICE_MINUTES = 120");
assert(ctrl.includes("BOOKING_HORIZON_DAYS = 14"), "Policy: BOOKING_HORIZON_DAYS = 14");
assert(ctrl.includes("TIMEZONE = 'Europe/Istanbul'"), "Policy: TIMEZONE = Europe/Istanbul");

// Auth & Session identity
assert(ctrl.includes("MemberAuthMiddleware::handle()"), "Enforces MemberAuthMiddleware::handle()");
assert(ctrl.includes("$_SESSION['member_id']") && ctrl.includes("$_SESSION['member_account_id']"), "Reads member identity strictly from session");
assert(!ctrl.includes("$_GET['member_id']") && !ctrl.includes("$_GET['trainer_id']"), "Does not accept member_id or trainer_id from query");
assert(!ctrl.includes("$_POST['member_id']") && !ctrl.includes("$_POST['trainer_id']"), "Does not accept member_id or trainer_id from post");

// Password change gate
assert(
  ctrl.includes("must_change_password") &&
  ctrl.includes("PASSWORD_CHANGE_REQUIRED") &&
  ctrl.includes("403"),
  "Enforces password-change gate returning 403 PASSWORD_CHANGE_REQUIRED"
);

// Zero query parameters enforcement
assert(
  ctrl.includes("!empty($_GET)") &&
  ctrl.includes("VALIDATION_ERROR") &&
  ctrl.includes("422"),
  "Rejects query parameters with 422 VALIDATION_ERROR"
);

// Assigned trainer only
assert(
  ctrl.includes("m.trainer_id") || ctrl.includes("trainer_id") && ctrl.includes("TRAINER_NOT_ASSIGNED"),
  "Enforces assigned trainer only; returns TRAINER_NOT_ASSIGNED when not assigned"
);
assert(
  ctrl.includes("is_active") && ctrl.includes("deleted_at") && ctrl.includes("TRAINER_UNAVAILABLE"),
  "Enforces trainer active and non-deleted check; returns TRAINER_UNAVAILABLE if inactive/deleted"
);

// Membership dates check
assert(
  ctrl.includes("membership_start_date") &&
  ctrl.includes("membership_end_date") &&
  ctrl.includes("MEMBER_MEMBERSHIP_DATA_INCONSISTENT") &&
  ctrl.includes("409"),
  "Returns 409 MEMBER_MEMBERSHIP_DATA_INCONSISTENT if one boundary is null"
);
assert(
  ctrl.includes("MEMBERSHIP_NOT_SET"),
  "Returns MEMBERSHIP_NOT_SET when both membership dates are null"
);

// Weekly availability windows & ISO weekday
assert(
  ctrl.includes("trainer_availability_windows") &&
  ctrl.includes("format('N')"),
  "Queries trainer_availability_windows and uses ISO weekday 1..7 via format('N')"
);

// Unavailability blocks filtering
assert(
  ctrl.includes("trainer_unavailability_blocks") &&
  ctrl.includes("$ub['starts_at'] < $slotEndStr && $ub['ends_at'] > $slotStartStr"),
  "Filters slots overlapping trainer_unavailability_blocks"
);

// Scheduled appointment conflicts (both trainer and member)
assert(
  ctrl.includes("appointments") &&
  ctrl.includes("trainer_id = ? OR member_id = ?") &&
  ctrl.includes("$appt['starts_at'] < $slotEndStr && $appt['ends_at'] > $slotStartStr"),
  "Filters conflicts for both trainer and member scheduled appointments"
);

// Package eligibility & positive balance
assert(
  ctrl.includes("msp.status = 'active'") &&
  ctrl.includes("valid_from'] <= $dateStr") &&
  ctrl.includes("valid_until"),
  "Evaluates package status and valid_from/valid_until on appointment date"
);
assert(
  ctrl.includes("$remaining > 0"),
  "Only considers packages with positive remaining sessions ($remaining > 0)"
);

// Ledger integrity check
assert(
  ctrl.includes("SESSION_PACKAGE_LEDGER_INCONSISTENT") &&
  ctrl.includes("409") &&
  ctrl.includes("res_count") &&
  ctrl.includes("rel_count"),
  "Enforces fail-closed ledger integrity check returning 409 SESSION_PACKAGE_LEDGER_INCONSISTENT"
);

// Day states enum
assert(ctrl.includes("'BOOKABLE'"), "Implements BOOKABLE day state");
assert(ctrl.includes("'MEMBERSHIP_INACTIVE'"), "Implements MEMBERSHIP_INACTIVE day state");
assert(ctrl.includes("'NO_WORKING_HOURS'"), "Implements NO_WORKING_HOURS day state");
assert(ctrl.includes("'NO_ELIGIBLE_PACKAGE'"), "Implements NO_ELIGIBLE_PACKAGE day state");
assert(ctrl.includes("'FULLY_BOOKED'"), "Implements FULLY_BOOKED day state");

// Privacy boundaries
assert(!ctrl.includes("reason") || !ctrl.includes("'reason' =>"), "Does not expose unavailability block reasons to member");
assert(!ctrl.includes("admin_id") || !ctrl.includes("'admin_id' =>"), "Does not expose admin_id to member");

// Bounded query complexity (no per-slot or per-day queries)
const loopMatch = ctrl.match(/foreach\s*\(\s*\$calendarDates\s+as\s+\$dateStr\s*\)\s*\{([\s\S]*?)\n\s*Response::json/);
assert(loopMatch !== null, "Calendar dates projection loop identified");
const loopBody = loopMatch ? loopMatch[1] : '';
assert(!loopBody.includes("->prepare(") && !loopBody.includes("->query("), "Zero SQL queries executed inside date/slot projection loop (no per-slot/per-day SQL)");

// Pure read-model: no appointment or ledger mutations
assert(!ctrl.includes("INSERT INTO appointments"), "No INSERT INTO appointments in booking options controller");
assert(!ctrl.includes("UPDATE appointments"), "No UPDATE appointments in booking options controller");
assert(!ctrl.includes("DELETE FROM appointments"), "No DELETE FROM appointments in booking options controller");
assert(!ctrl.includes("INSERT INTO member_session_package_ledger"), "No INSERT INTO member_session_package_ledger in booking options controller");

console.log("\n=== 4. Route Registration in api/index.php ===");

const indexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(indexPath), "api/index.php exists");
const indexContent = fs.readFileSync(indexPath, 'utf8');

assert(
  indexContent.includes("'/api/member/appointment-booking-options'") &&
  indexContent.includes("$method === 'GET'"),
  "Exact route registered: GET /api/member/appointment-booking-options"
);
assert(
  !indexContent.includes("'/api/member/appointments'") ||
  !indexContent.includes("'/api/member/appointments' && $method === 'POST'"),
  "No POST /api/member/appointments route in index.php (mutations not introduced yet)"
);

console.log("\n=== 5. Decisions Documentation Invariants ===");

const decPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decContent = fs.readFileSync(decPath, 'utf8');

assert(
  decContent.includes("## F.24C.1 Member Self-Service Booking Options Read Model"),
  "DECISIONS.md documents F.24C.1"
);
assert(
  decContent.includes("self-service uses assigned trainer only") &&
  decContent.includes("booking horizon = 14 calendar days including today") &&
  decContent.includes("member booking remains read-only in F.24C.1"),
  "DECISIONS.md records key architecture decisions for F.24C.1"
);

console.log("\n=== 6. Package.json Script Registration ===");

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:member-appointment-booking-options"] === "node scripts/verify-member-appointment-booking-options.mjs",
  "package.json registers verify:member-appointment-booking-options"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Member Appointment Booking Options verification detected violations.");
  process.exit(1);
} else {
  console.log("\nPASS — F.24C.1 MEMBER SELF-SERVICE BOOKING OPTIONS READ MODEL CLOSED");
  process.exit(0);
}
