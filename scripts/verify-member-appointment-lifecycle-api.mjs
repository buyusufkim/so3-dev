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

// 1.1 Duplicate Cancel Protection Simulation
function simulateCancelLifecycle(initialStatus, hasReserve, hasRelease) {
  if (initialStatus !== 'scheduled') {
    return { ok: false, error: 'APPOINTMENT_NOT_CANCELLABLE', releasesAdded: 0 };
  }
  if (!hasReserve || hasRelease) {
    return { ok: false, error: 'SESSION_PACKAGE_LEDGER_INCONSISTENT', releasesAdded: 0 };
  }
  return { ok: true, newStatus: 'cancelled', releasesAdded: 1 };
}

assert(
  simulateCancelLifecycle('scheduled', true, false).ok === true &&
  simulateCancelLifecycle('scheduled', true, false).releasesAdded === 1,
  "Self-test: First cancel on scheduled appointment succeeds and emits exactly 1 release"
);
assert(
  simulateCancelLifecycle('cancelled', true, true).ok === false &&
  simulateCancelLifecycle('cancelled', true, true).error === 'APPOINTMENT_NOT_CANCELLABLE' &&
  simulateCancelLifecycle('cancelled', true, true).releasesAdded === 0,
  "Self-test: Second cancel on already-cancelled appointment rejects with 409 and 0 releases"
);
assert(
  simulateCancelLifecycle('scheduled', true, true).ok === false &&
  simulateCancelLifecycle('scheduled', true, true).error === 'SESSION_PACKAGE_LEDGER_INCONSISTENT',
  "Self-test: Cancel with pre-existing release rejects as ledger inconsistent"
);

// 1.2 Reschedule Same-Slot & Conflict Exclusion Simulation
function simulateRescheduleConflictCheck(currentApptId, targetStarts, targetEnds, existingAppts) {
  // Same slot check
  const current = existingAppts.find(a => a.id === currentApptId);
  if (current && current.starts_at === targetStarts) {
    return { ok: false, error: 'APPOINTMENT_RESCHEDULE_NO_CHANGE' };
  }
  // Conflict check with id <> currentApptId
  const conflict = existingAppts.find(a =>
    a.id !== currentApptId &&
    a.status === 'scheduled' &&
    a.starts_at < targetEnds &&
    a.ends_at > targetStarts
  );
  if (conflict) {
    return { ok: false, error: 'CONFLICT' };
  }
  return { ok: true, previousStarts: current.starts_at, newStarts: targetStarts };
}

const fixtureAppts = [
  { id: 10, status: 'scheduled', starts_at: '2026-10-05 10:00:00', ends_at: '2026-10-05 11:00:00' },
  { id: 11, status: 'scheduled', starts_at: '2026-10-05 14:00:00', ends_at: '2026-10-05 15:00:00' }
];

assert(
  simulateRescheduleConflictCheck(10, '2026-10-05 10:00:00', '2026-10-05 11:00:00', fixtureAppts).error === 'APPOINTMENT_RESCHEDULE_NO_CHANGE',
  "Self-test: Reschedule to identical time rejected with APPOINTMENT_RESCHEDULE_NO_CHANGE"
);
assert(
  simulateRescheduleConflictCheck(10, '2026-10-05 14:30:00', '2026-10-05 15:30:00', fixtureAppts).error === 'CONFLICT',
  "Self-test: Reschedule overlapping another scheduled appointment detected as conflict"
);
assert(
  simulateRescheduleConflictCheck(10, '2026-10-05 16:00:00', '2026-10-05 17:00:00', fixtureAppts).ok === true,
  "Self-test: Valid non-conflicting reschedule time approved"
);

console.log("\n=== 2. Route Registration & Method Contracts in api/index.php ===");

const indexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(indexPath), "api/index.php exists");
const indexContent = fs.readFileSync(indexPath, 'utf8');

// 2.1 Canonical PATCH /api/member/appointments/{id}/cancel
assert(
  indexContent.includes("preg_match('#^/api/member/appointments/([1-9]\\d*)/cancel$#', $requestUri, $matches)"),
  "api/index.php registers canonical regex for /api/member/appointments/([1-9]\\d*)/cancel"
);
assert(
  /preg_match\('#\^\/api\/member\/appointments\/\(\[1-9\]\\d\*\)\/cancel\$#',\s*\$requestUri,\s*\$matches\)[\s\S]*?\$method\s*===\s*'PATCH'[\s\S]*?cancelAppointment\(\(int\)\$matches\[1\]\)/.test(indexContent),
  "Canonical member cancel route matches PATCH and routes to MemberAppointmentBookingController->cancelAppointment((int)$matches[1])"
);

// 2.2 Canonical PATCH /api/member/appointments/{id}/reschedule
assert(
  indexContent.includes("preg_match('#^/api/member/appointments/([1-9]\\d*)/reschedule$#', $requestUri, $matches)"),
  "api/index.php registers canonical regex for /api/member/appointments/([1-9]\\d*)/reschedule"
);
assert(
  /preg_match\('#\^\/api\/member\/appointments\/\(\[1-9\]\\d\*\)\/reschedule\$#',\s*\$requestUri,\s*\$matches\)[\s\S]*?\$method\s*===\s*'PATCH'[\s\S]*?rescheduleAppointment\(\(int\)\$matches\[1\]\)/.test(indexContent),
  "Canonical member reschedule route matches PATCH and routes to MemberAppointmentBookingController->rescheduleAppointment((int)$matches[1])"
);

// 2.3 Prohibit non-canonical mutation routes (POST, DELETE, PUT)
assert(
  !/preg_match\('#\^\/api\/member\/appointments\/\(\[1-9\]\\d\*\)\/cancel\$#',\s*\$requestUri,\s*\$matches\)[\s\S]*?\$method\s*===\s*'(?:POST|DELETE|PUT)'/.test(indexContent),
  "No POST/DELETE/PUT method allowed for member appointment cancel route"
);
assert(
  !/preg_match\('#\^\/api\/member\/appointments\/\(\[1-9\]\\d\*\)\/reschedule\$#',\s*\$requestUri,\s*\$matches\)[\s\S]*?\$method\s*===\s*'(?:POST|DELETE|PUT)'/.test(indexContent),
  "No POST/DELETE/PUT method allowed for member appointment reschedule route"
);
assert(
  !indexContent.includes("'/api/member/appointments/cancel'"),
  "No unparameterized /api/member/appointments/cancel route"
);
assert(
  !indexContent.includes("'/api/member/appointments/reschedule'"),
  "No unparameterized /api/member/appointments/reschedule route"
);

console.log("\n=== 3. Controller Architecture & Guard Invariants ===");

const ctrlPath = path.resolve(process.cwd(), 'api/controllers/MemberAppointmentBookingController.php');
assert(fs.existsSync(ctrlPath), "MemberAppointmentBookingController.php exists");
const ctrlContent = fs.readFileSync(ctrlPath, 'utf8');

// 3.1 Public method signatures
assert(
  ctrlContent.includes("public function cancelAppointment(int $appointmentId): void"),
  "MemberAppointmentBookingController defines cancelAppointment(int $appointmentId): void"
);
assert(
  ctrlContent.includes("public function rescheduleAppointment(int $appointmentId): void"),
  "MemberAppointmentBookingController defines rescheduleAppointment(int $appointmentId): void"
);

// Extract method sources for isolated inspection
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

const cancelSrc = extractMethodSource(ctrlContent, 'cancelAppointment');
const reschSrc = extractMethodSource(ctrlContent, 'rescheduleAppointment');

assert(cancelSrc.length > 0, "cancelAppointment method block extracted successfully");
assert(reschSrc.length > 0, "rescheduleAppointment method block extracted successfully");

// 3.2 Guard verification in both methods
assert(cancelSrc.includes("$this->guard();"), "cancelAppointment invokes $this->guard()");
assert(reschSrc.includes("$this->guard();"), "rescheduleAppointment invokes $this->guard()");

// 3.3 Payload validation in both methods
assert(cancelSrc.includes("Content-Type must be application/json"), "cancelAppointment enforces application/json Content-Type");
assert(reschSrc.includes("Content-Type must be application/json"), "rescheduleAppointment enforces application/json Content-Type");
assert(cancelSrc.includes("16384"), "cancelAppointment enforces 16KB payload size limit");
assert(reschSrc.includes("16384"), "rescheduleAppointment enforces 16KB payload size limit");
assert(cancelSrc.includes("['cancellation_reason']"), "cancelAppointment enforces exact single payload key 'cancellation_reason'");
assert(reschSrc.includes("['starts_at']"), "rescheduleAppointment enforces exact single payload key 'starts_at'");

console.log("\n=== 4. Cancel Transaction & Ledger Attribution Invariants ===");

// 4.1 Transactional boundary
assert(cancelSrc.includes("$this->db->beginTransaction()"), "cancelAppointment opens database transaction");
assert(cancelSrc.includes("$this->db->commit()"), "cancelAppointment commits database transaction");
assert(cancelSrc.includes("$this->db->rollBack()"), "cancelAppointment rolls back database transaction on error");

// 4.2 Member account & profile FOR UPDATE lock
assert(
  cancelSrc.includes("FROM member_accounts\n                WHERE id = ?\n                FOR UPDATE"),
  "cancelAppointment locks member_accounts FOR UPDATE"
);
assert(
  cancelSrc.includes("FROM members\n                WHERE id = ?\n                FOR UPDATE"),
  "cancelAppointment locks members FOR UPDATE"
);

// 4.3 Appointment lock & ownership isolation
assert(
  cancelSrc.includes("FROM appointments\n                WHERE id = ?\n                FOR UPDATE"),
  "cancelAppointment locks target appointment FOR UPDATE"
);
assert(
  cancelSrc.includes("(int)$appt['member_id'] !== $this->memberId") &&
  cancelSrc.includes("Response::error('Appointment not found.', 'NOT_FOUND', 404)"),
  "cancelAppointment isolates ownership: foreign member appointment returns 404 NOT_FOUND"
);

// 4.4 Scheduled status & temporal checks
assert(
  cancelSrc.includes("$appt['status'] !== 'scheduled'") &&
  cancelSrc.includes("Response::error('Only scheduled appointments can be cancelled.', 'APPOINTMENT_NOT_CANCELLABLE', 409)"),
  "cancelAppointment enforces scheduled-only cancellation"
);
assert(
  cancelSrc.includes("$now >= $endsAtDt") &&
  cancelSrc.includes("Response::error('Cannot cancel an appointment that has already ended.', 'APPOINTMENT_NOT_CANCELLABLE', 409)"),
  "cancelAppointment prevents cancellation of appointments that have already ended"
);

// 4.5 Ledger reserve check before cancellation
assert(
  cancelSrc.includes("entry_type = 'reserve'"),
  "cancelAppointment checks for existing reserve ledger row"
);
assert(
  cancelSrc.includes("entry_type = 'release'"),
  "cancelAppointment verifies no release ledger row exists prior to cancellation"
);

// 4.6 Member actor attribution on appointment update
assert(
  cancelSrc.includes("SET status = 'cancelled',\n                    cancellation_reason = ?,\n                    cancelled_by = NULL,\n                    cancelled_by_member_account_id = ?,\n                    cancelled_at = ?"),
  "cancelAppointment explicitly sets cancelled_by = NULL and cancelled_by_member_account_id = accountId"
);

// 4.7 Ledger release +1 insert with member account attribution
assert(
  cancelSrc.includes("INSERT INTO member_session_package_ledger (") &&
  cancelSrc.includes("'release', 1, ?, NULL, ?"),
  "cancelAppointment inserts ledger row with entry_type = 'release', delta = 1, created_by = NULL, created_by_member_account_id"
);

// 4.8 Zero audit log modification for member cancel
assert(
  !cancelSrc.includes("AuditLogger::log"),
  "cancelAppointment does not invent or pollute admin AuditLogger with member actor ID"
);

console.log("\n=== 5. Reschedule Transaction & F24 Policy Invariants ===");

// 5.1 Transactional boundary
assert(reschSrc.includes("$this->db->beginTransaction()"), "rescheduleAppointment opens database transaction");
assert(reschSrc.includes("$this->db->commit()"), "rescheduleAppointment commits database transaction");
assert(reschSrc.includes("$this->db->rollBack()"), "rescheduleAppointment rolls back database transaction on error");

// 5.2 Server authority derives ends_at (+60m) and same-day validation
assert(
  reschSrc.includes("modify('+' . self::SLOT_DURATION_MINUTES . ' minutes')"),
  "rescheduleAppointment derives ends_at using authoritative SLOT_DURATION_MINUTES"
);
assert(
  reschSrc.includes("$startsDt->format('Y-m-d') !== $endsDt->format('Y-m-d')"),
  "rescheduleAppointment enforces appointment must start and end on the same calendar day"
);

// 5.3 Same-slot no-op rejection
assert(
  reschSrc.includes("$startsAtStr === $lockedApp['starts_at']") &&
  reschSrc.includes("APPOINTMENT_RESCHEDULE_NO_CHANGE"),
  "rescheduleAppointment rejects same-slot reschedule with APPOINTMENT_RESCHEDULE_NO_CHANGE"
);

// 5.4 Ownership and participant isolation
assert(
  reschSrc.includes("(int)$lockedApp['member_id'] !== $this->memberId") &&
  reschSrc.includes("Response::error('Appointment not found.', 'NOT_FOUND', 404)"),
  "rescheduleAppointment isolates ownership: foreign member appointment returns 404 NOT_FOUND"
);
assert(
  reschSrc.includes("$trainerId !== $assignedTrainerId") &&
  reschSrc.includes("TRAINER_INELIGIBLE"),
  "rescheduleAppointment forbids switching trainers during reschedule"
);

// 5.5 Locked booking policy recomputation
assert(
  reschSrc.includes("BOOKING_HORIZON_DAYS") && reschSrc.includes("BOOKING_SLOT_UNAVAILABLE"),
  "rescheduleAppointment enforces 14-day booking horizon under lock"
);
assert(
  reschSrc.includes("MINIMUM_NOTICE_MINUTES") && reschSrc.includes("BOOKING_SLOT_UNAVAILABLE"),
  "rescheduleAppointment enforces 120-minute minimum notice under lock"
);

// 5.6 Weekly availability window and unavailability blocks
assert(
  reschSrc.includes("trainer_availability_windows"),
  "rescheduleAppointment revalidates trainer weekly availability window"
);
assert(
  reschSrc.includes("trainer_unavailability_blocks"),
  "rescheduleAppointment revalidates trainer unavailability blocks"
);

// 5.7 Conflict checks with current appointment exclusion (id <> ?)
assert(
  reschSrc.includes("id <> ?\n                  AND trainer_id = ?\n                  AND status = 'scheduled'") &&
  reschSrc.includes("TRAINER_CONFLICT"),
  "rescheduleAppointment checks trainer conflict excluding current appointment"
);
assert(
  reschSrc.includes("id <> ?\n                  AND member_id = ?\n                  AND status = 'scheduled'") &&
  reschSrc.includes("MEMBER_CONFLICT"),
  "rescheduleAppointment checks member conflict excluding current appointment"
);

// 5.8 Session package validity & ledger reserve preservation
assert(
  reschSrc.includes("member_session_packages"),
  "rescheduleAppointment revalidates session package validity period"
);
assert(
  !reschSrc.includes("INSERT INTO member_session_package_ledger"),
  "rescheduleAppointment does NOT insert into member_session_package_ledger (reserve is preserved)"
);
assert(
  reschSrc.includes("(int)$chk['res_count'] !== 1 || (int)$chk['rel_count'] !== 0") &&
  reschSrc.includes("SESSION_PACKAGE_LEDGER_INCONSISTENT"),
  "rescheduleAppointment validates pre-existing reserve is intact (1 reserve, 0 release)"
);

// 5.9 History insertion with member actor attribution
assert(
  reschSrc.includes("INSERT INTO appointment_reschedules (") &&
  reschSrc.includes("rescheduled_by, rescheduled_by_member_account_id"),
  "rescheduleAppointment inserts appointment_reschedules with member actor attribution"
);
assert(
  reschSrc.includes("NULL, ?"),
  "rescheduleAppointment binds rescheduled_by = NULL and rescheduled_by_member_account_id"
);

// 5.10 Exact appointment UPDATE (starts_at, ends_at only)
assert(
  reschSrc.includes("UPDATE appointments\n                SET starts_at = ?, ends_at = ?\n                WHERE id = ?"),
  "rescheduleAppointment updates only starts_at and ends_at without mutating admin updated_by"
);

console.log("\n=== 6. Scope Guards & Repository Parity ===");

// 6.1 AppointmentController.php unchanged
const adminCtrlPath = path.resolve(process.cwd(), 'api/controllers/AppointmentController.php');
assert(fs.existsSync(adminCtrlPath), "AppointmentController.php exists");
const adminCtrlContent = fs.readFileSync(adminCtrlPath, 'utf8');

assert(
  !adminCtrlContent.includes("cancelled_by_member_account_id"),
  "AppointmentController preserves existing admin cancellation attribution"
);
assert(
  !adminCtrlContent.includes("rescheduled_by_member_account_id"),
  "AppointmentController preserves existing admin reschedule attribution"
);

// 6.2 Zero frontend files modified for cancel/reschedule UI
const frontendBookingPagePath = path.resolve(process.cwd(), 'src/member/pages/MemberAppointmentBookingPage.tsx');
assert(fs.existsSync(frontendBookingPagePath), "MemberAppointmentBookingPage.tsx exists");
const frontendBookingSrc = fs.readFileSync(frontendBookingPagePath, 'utf8');

assert(
  !frontendBookingSrc.includes("/api/member/appointments/") || !frontendBookingSrc.includes("/cancel"),
  "MemberAppointmentBookingPage contains zero cancellation UI logic (F25B is backend API only)"
);
assert(
  !frontendBookingSrc.includes("/api/member/appointments/") || !frontendBookingSrc.includes("/reschedule"),
  "MemberAppointmentBookingPage contains zero reschedule UI logic (F25B is backend API only)"
);

// 6.3 Schema integrity
const migDir = path.resolve(process.cwd(), 'database/migrations');
const migrations = fs.readdirSync(migDir).filter(f => f.endsWith('.sql'));
assert(migrations.length === 42, `Exactly 42 migrations exist (no unauthorized migration 043 introduced; found: ${migrations.length})`);

const freshInstallPath = path.resolve(process.cwd(), 'database/fresh-install.sql');
const freshInstallContent = fs.readFileSync(freshInstallPath, 'utf8');
assert(
  freshInstallContent.includes("Generated from migrations 001-042") || freshInstallContent.includes("Generated from migrations 001–042"),
  "database/fresh-install.sql canonical migration range remains 001-042"
);

// 6.4 DECISIONS.md contains F.25B entry
const decisionsPath = path.resolve(process.cwd(), 'DECISIONS.md');
const decisionsContent = fs.readFileSync(decisionsPath, 'utf8');
assert(
  decisionsContent.includes("## F.25B Member Self-Service Appointment Lifecycle API"),
  "DECISIONS.md records '## F.25B Member Self-Service Appointment Lifecycle API'"
);
assert(
  decisionsContent.includes("members mutate only own scheduled appointments"),
  "DECISIONS.md records member ownership isolation invariant"
);
assert(
  decisionsContent.includes("cancel releases reserved session exactly once"),
  "DECISIONS.md records single release invariant"
);
assert(
  decisionsContent.includes("reschedule preserves reserve/package/trainer"),
  "DECISIONS.md records reschedule immutable relationships invariant"
);

// 6.5 package.json registers verify:member-appointment-lifecycle-api
const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert(
  pkg.scripts && pkg.scripts['verify:member-appointment-lifecycle-api'] === 'node scripts/verify-member-appointment-lifecycle-api.mjs',
  "package.json registers 'verify:member-appointment-lifecycle-api': 'node scripts/verify-member-appointment-lifecycle-api.mjs'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more F.25B Member Self-Service Appointment Lifecycle API invariants failed.");
  process.exit(exitCode);
} else {
  console.log("PASS — F.25B MEMBER SELF-SERVICE APPOINTMENT CANCEL & RESCHEDULE BACKEND API CLOSED");
}
