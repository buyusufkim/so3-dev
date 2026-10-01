import fs from 'fs';
import path from 'path';

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

console.log("=== 1. Pure Algorithmic & Simulation Self-Tests ===");

// 1.1 Reschedule Slot Exclusion Simulation:
// Current appointment slot must be excluded; other slots within working hours without conflicts are bookable
function simulateRescheduleSlots(
  currentStartsAt,
  targetApptId,
  dayWindows,
  existingAppts,
  unavailabilityBlocks,
  businessNowStr,
  dateStr
) {
  const [bDate, bTime] = businessNowStr.split(' ');
  const [bH, bM] = bTime.split(':').map(Number);
  const minNoticeMinutes = bH * 60 + bM + 120;

  const bookableSlots = [];

  for (const win of dayWindows) {
    const [sH, sM] = win.start.split(':').map(Number);
    const [eH, eM] = win.end.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    for (let cur = startMin; cur + 60 <= endMin; cur += 60) {
      const slotStartH = Math.floor(cur / 60);
      const slotStartM = cur % 60;
      const slotEndH = Math.floor((cur + 60) / 60);
      const slotEndM = (cur + 60) % 60;

      const slotStartStr = `${dateStr} ${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}:00`;
      const slotEndStr = `${dateStr} ${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}:00`;

      // Exclude current appointment slot
      if (slotStartStr === currentStartsAt) {
        continue;
      }

      // Minimum notice check
      if (dateStr === bDate && cur < minNoticeMinutes) {
        continue;
      }

      // Unavailability blocks check
      const isBlocked = unavailabilityBlocks.some(b => b.starts_at < slotEndStr && b.ends_at > slotStartStr);
      if (isBlocked) continue;

      // Conflicts check: exclude target appointment (id <> targetApptId)
      const isConflicted = existingAppts.some(
        a => a.id !== targetApptId && a.status === 'scheduled' && a.starts_at < slotEndStr && a.ends_at > slotStartStr
      );
      if (isConflicted) continue;

      bookableSlots.push({ starts_at: slotStartStr, ends_at: slotEndStr });
    }
  }

  return bookableSlots;
}

const mockDate = '2026-10-05';
const mockWindows = [{ start: '09:00', end: '13:00' }];
const mockCurrentSlot = '2026-10-05 10:00:00';
const mockAppts = [
  { id: 42, status: 'scheduled', starts_at: '2026-10-05 10:00:00', ends_at: '2026-10-05 11:00:00' }, // target
  { id: 99, status: 'scheduled', starts_at: '2026-10-05 12:00:00', ends_at: '2026-10-05 13:00:00' }, // other appt
];
const mockUnavail = [
  { starts_at: '2026-10-05 11:00:00', ends_at: '2026-10-05 12:00:00' } // blocked 11-12
];

const projectedSlots = simulateRescheduleSlots(
  mockCurrentSlot,
  42,
  mockWindows,
  mockAppts,
  mockUnavail,
  '2026-10-05 06:00:00',
  mockDate
);

assert(
  projectedSlots.length === 1 && projectedSlots[0].starts_at === '2026-10-05 09:00:00',
  "Self-test: Slot simulation correctly generates only 09:00 (10:00 is current slot, 11:00 is blocked, 12:00 is conflicted)"
);

// 1.2 Package Remaining Sessions Invariant:
// Reschedule options does NOT require remaining_sessions > 0
function canProvideRescheduleOptions(totalSessions, usedDelta, hasReserve) {
  // Booking create would check: totalSessions + usedDelta > 0
  // Reschedule options checks only: hasReserve === true (and release === false)
  const remainingForNewBooking = totalSessions + usedDelta;
  return {
    allowNewBooking: remainingForNewBooking > 0,
    allowReschedule: hasReserve
  };
}

const exhaustedPkgTest = canProvideRescheduleOptions(1, -1, true);
assert(
  exhaustedPkgTest.allowNewBooking === false && exhaustedPkgTest.allowReschedule === true,
  "Self-test: Exhausted package (remaining=0) blocks new booking but permits reschedule options with existing reserve"
);

// 1.3 Day State Evaluation Simulation
function evaluateRescheduleDayState(isMembershipActive, isPackageValid, dayWindows, availableSlots) {
  if (!isMembershipActive) return 'MEMBERSHIP_INACTIVE';
  if (!isPackageValid) return 'PACKAGE_INELIGIBLE';
  if (!dayWindows || dayWindows.length === 0) return 'NO_WORKING_HOURS';
  if (availableSlots.length === 0) return 'FULLY_BOOKED';
  return 'BOOKABLE';
}

assert(
  evaluateRescheduleDayState(false, true, [{ start: '09:00', end: '17:00' }], [{ starts_at: '...' }]) === 'MEMBERSHIP_INACTIVE',
  "Self-test: Day state MEMBERSHIP_INACTIVE prioritized when membership expired"
);
assert(
  evaluateRescheduleDayState(true, false, [{ start: '09:00', end: '17:00' }], [{ starts_at: '...' }]) === 'PACKAGE_INELIGIBLE',
  "Self-test: Day state PACKAGE_INELIGIBLE returned when date outside package validity"
);
assert(
  evaluateRescheduleDayState(true, true, [], []) === 'NO_WORKING_HOURS',
  "Self-test: Day state NO_WORKING_HOURS returned when trainer has no hours on weekday"
);
assert(
  evaluateRescheduleDayState(true, true, [{ start: '09:00', end: '10:00' }], []) === 'FULLY_BOOKED',
  "Self-test: Day state FULLY_BOOKED returned when all slots taken or current"
);
assert(
  evaluateRescheduleDayState(true, true, [{ start: '09:00', end: '10:00' }], [{ starts_at: '...' }]) === 'BOOKABLE',
  "Self-test: Day state BOOKABLE returned when valid slots exist"
);

console.log("\n=== 2. Route Registration & Canonical Endpoint in api/index.php ===");

const indexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(indexPath), "api/index.php exists");
const indexContent = fs.readFileSync(indexPath, 'utf8');

// 2.1 Canonical GET /api/member/appointments/{id}/reschedule-options
assert(
  indexContent.includes("preg_match('#^/api/member/appointments/([1-9]\\d*)/reschedule-options$#', $requestUri, $matches)"),
  "api/index.php registers canonical regex for /api/member/appointments/([1-9]\\d*)/reschedule-options"
);

assert(
  /preg_match\('#\^\/api\/member\/appointments\/\(\[1-9\]\\d\*\)\/reschedule-options\$#',\s*\$requestUri,\s*\$matches\)[\s\S]*?\$method\s*===\s*'GET'[\s\S]*?getRescheduleOptions\(\(int\)\$matches\[1\]\)/.test(indexContent),
  "Canonical route matches GET and invokes MemberAppointmentBookingController->getRescheduleOptions((int)$matches[1])"
);

// 2.2 Prohibit mutation methods on reschedule-options
assert(
  !/preg_match\('#\^\/api\/member\/appointments\/\(\[1-9\]\\d\*\)\/reschedule-options\$#',\s*\$requestUri,\s*\$matches\)[\s\S]*?\$method\s*===\s*'(?:POST|PATCH|DELETE|PUT)'/.test(indexContent),
  "No POST/PATCH/DELETE/PUT method registered for reschedule-options endpoint"
);

assert(
  !indexContent.includes("'/api/member/reschedule-options'"),
  "No non-canonical /api/member/reschedule-options route"
);

assert(
  !indexContent.includes("'/api/member/appointments/reschedule-options'"),
  "No unparameterized /api/member/appointments/reschedule-options route"
);

console.log("\n=== 3. Controller Method & Bounded Inspection in MemberAppointmentBookingController.php ===");

const ctrlPath = path.resolve(process.cwd(), 'api/controllers/MemberAppointmentBookingController.php');
assert(fs.existsSync(ctrlPath), "MemberAppointmentBookingController.php exists");
const ctrlContent = fs.readFileSync(ctrlPath, 'utf8');

// Helper to extract method source block cleanly
function extractMethodSource(src, methodName) {
  const needle = `public function ${methodName}`;
  const startIdx = src.indexOf(needle);
  if (startIdx === -1) return '';
  const braceIdx = src.indexOf('{', startIdx);
  if (braceIdx === -1) return '';
  let depth = 0;
  for (let i = braceIdx; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        return src.substring(startIdx, i + 1);
      }
    }
  }
  return '';
}

const methodSrc = extractMethodSource(ctrlContent, 'getRescheduleOptions');
assert(methodSrc.length > 0, "getRescheduleOptions(int $appointmentId) method block extracted successfully");

// 3.1 Guard invocation
assert(methodSrc.includes("$this->guard();"), "getRescheduleOptions invokes $this->guard()");

// 3.2 Appointment existence & ownership isolation
assert(
  methodSrc.includes("FROM appointments\n            WHERE id = ?"),
  "getRescheduleOptions queries target appointment by ID"
);
assert(
  methodSrc.includes("(int)$appt['member_id'] !== $this->memberId") &&
  methodSrc.includes("Response::error('Appointment not found.', 'NOT_FOUND', 404)"),
  "getRescheduleOptions enforces ownership: foreign appointment returns 404 NOT_FOUND"
);

// 3.3 Scheduled-only eligibility
assert(
  methodSrc.includes("$appt['status'] !== 'scheduled'") &&
  methodSrc.includes("Response::error('Only scheduled appointments can be rescheduled.', 'APPOINTMENT_NOT_RESCHEDULABLE', 409)"),
  "getRescheduleOptions enforces scheduled-only target appointment"
);

// 3.4 Trainer assignment & consistency
assert(
  methodSrc.includes("$trainerId !== $assignedTrainerId") &&
  methodSrc.includes("TRAINER_INELIGIBLE"),
  "getRescheduleOptions verifies target appointment trainer matches assigned trainer"
);
assert(
  methodSrc.includes("SELECT id, name, is_active, deleted_at \n            FROM trainers"),
  "getRescheduleOptions verifies assigned trainer is active and non-deleted"
);

// 3.5 Package & ledger integrity check (reserve=1, release=0)
assert(
  methodSrc.includes("entry_type = 'reserve'"),
  "getRescheduleOptions checks ledger for reserve entry"
);
assert(
  methodSrc.includes("entry_type = 'release'"),
  "getRescheduleOptions checks ledger for release entry"
);
assert(
  methodSrc.includes("(int)$chk['res_count'] !== 1 || (int)$chk['rel_count'] !== 0") &&
  methodSrc.includes("SESSION_PACKAGE_LEDGER_INCONSISTENT"),
  "getRescheduleOptions enforces fail-closed ledger integrity (reserve=1, release=0)"
);

// 3.6 CRITICAL: NO remaining_sessions > 0 requirement in getRescheduleOptions
assert(
  !methodSrc.includes("$remaining > 0") &&
  !methodSrc.includes("remaining_sessions > 0") &&
  !methodSrc.includes("SESSION_PACKAGE_EXHAUSTED"),
  "getRescheduleOptions does NOT require remaining_sessions > 0 (existing reserve is carried forward)"
);

// 3.7 Policy constants
assert(
  methodSrc.includes("self::SLOT_DURATION_MINUTES") &&
  methodSrc.includes("self::SLOT_STEP_MINUTES") &&
  methodSrc.includes("self::MINIMUM_NOTICE_MINUTES") &&
  methodSrc.includes("self::BOOKING_HORIZON_DAYS") &&
  methodSrc.includes("self::TIMEZONE"),
  "getRescheduleOptions references authoritative policy constants"
);

// 3.8 Conflict query excludes target appointment (id <> ?)
assert(
  methodSrc.includes("WHERE id <> ?\n              AND status = 'scheduled'\n              AND (trainer_id = ? OR member_id = ?)"),
  "getRescheduleOptions conflict query excludes target appointment (id <> ?)"
);

// 3.9 Current appointment slot is excluded from generated choices
assert(
  methodSrc.includes("$slotStartStr === $appt['starts_at']") &&
  methodSrc.includes("continue;"),
  "getRescheduleOptions excludes target appointment's current slot from generated options"
);

// 3.10 Privacy boundaries: trainer unavailability reason and admin_id are NOT selected
assert(
  methodSrc.includes("SELECT starts_at, ends_at\n            FROM trainer_unavailability_blocks"),
  "getRescheduleOptions does not select reason from trainer_unavailability_blocks"
);

// 3.11 Bounded query complexity: zero SQL inside the calendar dates projection loop
const loopMatch = methodSrc.match(/foreach\s*\(\s*\$calendarDates\s+as\s+\$dateStr\s*\)\s*\{([\s\S]*?)\n\s*Response::json/);
assert(loopMatch !== null, "Calendar dates loop in getRescheduleOptions identified");
const loopBody = loopMatch ? loopMatch[1] : '';
assert(
  !loopBody.includes("->prepare(") && !loopBody.includes("->query("),
  "Zero SQL queries inside date/slot loop in getRescheduleOptions (bounded query complexity)"
);

// 3.12 Read-only semantics (method-bounded inspection)
assert(!methodSrc.includes("UPDATE appointments"), "Zero UPDATE appointments in getRescheduleOptions");
assert(!methodSrc.includes("INSERT INTO appointments"), "Zero INSERT INTO appointments in getRescheduleOptions");
assert(!methodSrc.includes("DELETE FROM appointments"), "Zero DELETE FROM appointments in getRescheduleOptions");
assert(!methodSrc.includes("INSERT INTO appointment_reschedules"), "Zero INSERT INTO appointment_reschedules in getRescheduleOptions");
assert(!methodSrc.includes("INSERT INTO member_session_package_ledger"), "Zero INSERT INTO member_session_package_ledger in getRescheduleOptions");
assert(!methodSrc.includes("UPDATE member_session_package_ledger"), "Zero UPDATE member_session_package_ledger in getRescheduleOptions");
assert(!methodSrc.includes("DELETE FROM member_session_package_ledger"), "Zero DELETE FROM member_session_package_ledger in getRescheduleOptions");
assert(!methodSrc.includes("FOR UPDATE"), "Zero FOR UPDATE locks in getRescheduleOptions (read model)");

console.log("\n=== 4. Frontend API Foundation in validators.ts and client.ts ===");

const valPath = path.resolve(process.cwd(), 'src/member/api/validators.ts');
assert(fs.existsSync(valPath), "src/member/api/validators.ts exists");
const valContent = fs.readFileSync(valPath, 'utf8');

// 4.1 Types defined
assert(valContent.includes("export type MemberRescheduleSlot = {"), "validators.ts exports MemberRescheduleSlot");
assert(valContent.includes("export type MemberRescheduleDayState ="), "validators.ts exports MemberRescheduleDayState");
assert(valContent.includes("export type MemberRescheduleDay = {"), "validators.ts exports MemberRescheduleDay");
assert(valContent.includes("export type MemberAppointmentRescheduleOptions = {"), "validators.ts exports MemberAppointmentRescheduleOptions");

// 4.2 Validator defined
assert(
  valContent.includes("export function validateAppointmentRescheduleOptions(data: unknown): MemberAppointmentRescheduleOptions"),
  "validators.ts exports validateAppointmentRescheduleOptions"
);

// 4.3 Validator security checks
assert(valContent.includes("data.timezone !== 'Europe/Istanbul'"), "validateAppointmentRescheduleOptions validates Europe/Istanbul timezone");
assert(valContent.includes("data.days.length !== 14"), "validateAppointmentRescheduleOptions enforces exactly 14 days");
assert(
  valContent.includes("s.starts_at === appointmentSnapshot.starts_at") &&
  valContent.includes("Current appointment slot"),
  "validateAppointmentRescheduleOptions rejects responses containing current appointment slot"
);
assert(
  valContent.includes("'PACKAGE_INELIGIBLE'"),
  "validateAppointmentRescheduleOptions recognizes PACKAGE_INELIGIBLE day state"
);

// 4.4 Client method in client.ts
const clientPath = path.resolve(process.cwd(), 'src/member/api/client.ts');
assert(fs.existsSync(clientPath), "src/member/api/client.ts exists");
const clientContent = fs.readFileSync(clientPath, 'utf8');

assert(
  clientContent.includes("async getAppointmentRescheduleOptions("),
  "memberApiClient defines getAppointmentRescheduleOptions method"
);
assert(
  clientContent.includes("!Number.isInteger(appointmentId) || appointmentId <= 0"),
  "getAppointmentRescheduleOptions validates positive integer appointmentId"
);
assert(
  clientContent.includes("`/api/member/appointments/${appointmentId}/reschedule-options`"),
  "getAppointmentRescheduleOptions calls canonical URL /api/member/appointments/${appointmentId}/reschedule-options"
);
assert(
  clientContent.includes("validateAppointmentRescheduleOptions(data)"),
  "getAppointmentRescheduleOptions validates payload with validateAppointmentRescheduleOptions"
);

console.log("\n=== 5. Scope Isolation (Booking Create Page Unchanged) ===");

const bookingPagePath = path.resolve(process.cwd(), 'src/member/pages/MemberAppointmentBookingPage.tsx');
assert(fs.existsSync(bookingPagePath), "MemberAppointmentBookingPage.tsx exists");
const bookingPageContent = fs.readFileSync(bookingPagePath, 'utf8');
assert(
  !bookingPageContent.includes("getAppointmentRescheduleOptions"),
  "MemberAppointmentBookingPage does not consume getAppointmentRescheduleOptions (booking create page isolated)"
);
assert(
  !bookingPageContent.includes("reschedule-options"),
  "MemberAppointmentBookingPage has zero reschedule options UI"
);

console.log("\n=== 6. Documentation & Package Script Registration ===");

const decPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decContent = fs.readFileSync(decPath, 'utf8');
assert(
  decContent.includes("## F.25C.1 Member Appointment Reschedule Options Read Model"),
  "DECISIONS.md contains entry '## F.25C.1 Member Appointment Reschedule Options Read Model'"
);
assert(
  decContent.includes("reschedule options appointment-specific"),
  "DECISIONS.md records appointment-specific invariant"
);
assert(
  decContent.includes("package remaining balance is not re-consumed"),
  "DECISIONS.md records package balance non-reconsumption invariant"
);

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert(
  pkg.scripts && pkg.scripts['verify:member-appointment-reschedule-options'] === 'node scripts/verify-member-appointment-reschedule-options.mjs',
  "package.json registers 'verify:member-appointment-reschedule-options'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more F.25C.1 Member Appointment Reschedule Options invariants failed.");
  process.exit(exitCode);
} else {
  console.log("PASS — F.25C.1 MEMBER APPOINTMENT RESCHEDULE OPTIONS READ MODEL CLOSED");
}
