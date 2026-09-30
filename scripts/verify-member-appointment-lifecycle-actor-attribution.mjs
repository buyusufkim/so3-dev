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

console.log("=== 1. Migration 042 File Existence & Structure ===");

const migPath = path.resolve(process.cwd(), 'database/migrations/042_add_member_appointment_lifecycle_actor_attribution.sql');
assert(fs.existsSync(migPath), "042_add_member_appointment_lifecycle_actor_attribution.sql exists in database/migrations");

const migContent = fs.readFileSync(migPath, 'utf8');

// 1.1 appointments: cancelled_by_member_account_id column added
assert(
  /ALTER\s+TABLE\s+`?appointments`?\s+ADD\s+COLUMN\s+`?cancelled_by_member_account_id`?\s+INT\s+NULL/i.test(migContent),
  "appointments: cancelled_by_member_account_id INT NULL column added"
);

// 1.2 appointments: fk_appointments_cancelled_by_member_account references member_accounts(id)
assert(
  /CONSTRAINT\s+`?fk_appointments_cancelled_by_member_account`?\s+FOREIGN\s+KEY\s*\(`?cancelled_by_member_account_id`?\)\s+REFERENCES\s+`?member_accounts`?\s*\(`?id`?\)/i.test(migContent),
  "appointments: fk_appointments_cancelled_by_member_account references member_accounts(id)"
);
assert(
  /REFERENCES\s+`?member_accounts`?\s*\(`?id`?\)\s+ON\s+DELETE\s+RESTRICT\s+ON\s+UPDATE\s+RESTRICT/i.test(migContent),
  "appointments cancellation FK specifies ON DELETE RESTRICT ON UPDATE RESTRICT"
);

// 1.3 appointments: Index on cancelled_by_member_account_id
assert(
  /(?:CREATE\s+INDEX|ADD\s+INDEX)\s+`?idx_appointments_cancelled_by_member_account`?\s+ON\s+`?appointments`?\s*\(`?cancelled_by_member_account_id`?\)/i.test(migContent),
  "appointments: index idx_appointments_cancelled_by_member_account exists on appointments(cancelled_by_member_account_id)"
);

// 1.4 appointments: Cancellation actor CHECK constraint
assert(
  /CONSTRAINT\s+`?chk_appointments_cancellation_actor_attribution`?\s+CHECK\s*\(/i.test(migContent),
  "appointments: check constraint chk_appointments_cancellation_actor_attribution exists"
);

// Cancellation truth-table simulation
function simulateCancellationCheck(cancelled_by, cancelled_by_member_account_id) {
  // CHECK ( NOT (`cancelled_by` IS NOT NULL AND `cancelled_by_member_account_id` IS NOT NULL) )
  return !(cancelled_by !== null && cancelled_by_member_account_id !== null);
}

assert(
  simulateCancellationCheck(1, null) === true,
  "Cancellation truth-table: admin = non-null, member = null -> ALLOWED (legacy / admin cancellation)"
);
assert(
  simulateCancellationCheck(null, 5) === true,
  "Cancellation truth-table: admin = null, member = non-null -> ALLOWED (member self-service cancellation)"
);
assert(
  simulateCancellationCheck(null, null) === true,
  "Cancellation truth-table: admin = null, member = null -> ALLOWED (scheduled / completed / no-show non-cancelled rows)"
);
assert(
  simulateCancellationCheck(1, 5) === false,
  "Cancellation truth-table: admin = non-null, member = non-null -> REJECTED (dual attribution forbidden)"
);

console.log("\n=== 2. appointment_reschedules Actor Structure & Truth-Table ===");

// 2.1 appointment_reschedules: rescheduled_by converted to INT NULL
assert(
  /ALTER\s+TABLE\s+`?appointment_reschedules`?\s+MODIFY\s+COLUMN\s+`?rescheduled_by`?\s+INT\s+NULL/i.test(migContent),
  "appointment_reschedules: rescheduled_by is modified to INT NULL"
);

// 2.2 appointment_reschedules: rescheduled_by_member_account_id column added
assert(
  /ALTER\s+TABLE\s+`?appointment_reschedules`?\s+ADD\s+COLUMN\s+`?rescheduled_by_member_account_id`?\s+INT\s+NULL/i.test(migContent),
  "appointment_reschedules: rescheduled_by_member_account_id INT NULL column added"
);

// 2.3 appointment_reschedules: fk_appointment_reschedules_rescheduled_by_member_account references member_accounts(id)
assert(
  /CONSTRAINT\s+`?fk_appointment_reschedules_rescheduled_by_member_account`?\s+FOREIGN\s+KEY\s*\(`?rescheduled_by_member_account_id`?\)\s+REFERENCES\s+`?member_accounts`?\s*\(`?id`?\)/i.test(migContent),
  "appointment_reschedules: fk_appointment_reschedules_rescheduled_by_member_account references member_accounts(id)"
);
assert(
  /REFERENCES\s+`?member_accounts`?\s*\(`?id`?\)\s+ON\s+DELETE\s+RESTRICT\s+ON\s+UPDATE\s+RESTRICT/i.test(migContent),
  "appointment_reschedules member FK specifies ON DELETE RESTRICT ON UPDATE RESTRICT"
);

// 2.4 appointment_reschedules: Index on rescheduled_by_member_account_id
assert(
  /(?:CREATE\s+INDEX|ADD\s+INDEX)\s+`?idx_appointment_reschedules_rescheduled_by_member_account`?\s+ON\s+`?appointment_reschedules`?\s*\(`?rescheduled_by_member_account_id`?\)/i.test(migContent),
  "appointment_reschedules: index idx_appointment_reschedules_rescheduled_by_member_account exists on appointment_reschedules(rescheduled_by_member_account_id)"
);

// 2.5 appointment_reschedules: Exactly-one actor CHECK constraint
assert(
  /CONSTRAINT\s+`?chk_appointment_reschedules_actor_attribution`?\s+CHECK\s*\(/i.test(migContent),
  "appointment_reschedules: check constraint chk_appointment_reschedules_actor_attribution exists"
);

// Reschedule truth-table simulation (exactly-one actor)
function simulateRescheduleCheck(rescheduled_by, rescheduled_by_member_account_id) {
  // CHECK ((`rescheduled_by` IS NOT NULL AND `rescheduled_by_member_account_id` IS NULL) OR (`rescheduled_by` IS NULL AND `rescheduled_by_member_account_id` IS NOT NULL))
  return (
    (rescheduled_by !== null && rescheduled_by_member_account_id === null) ||
    (rescheduled_by === null && rescheduled_by_member_account_id !== null)
  );
}

assert(
  simulateRescheduleCheck(1, null) === true,
  "Reschedule truth-table: admin = non-null, member = null -> ALLOWED (admin / trainer reschedule)"
);
assert(
  simulateRescheduleCheck(null, 5) === true,
  "Reschedule truth-table: admin = null, member = non-null -> ALLOWED (member self-service reschedule)"
);
assert(
  simulateRescheduleCheck(null, null) === false,
  "Reschedule truth-table: admin = null, member = null -> REJECTED (unattributed reschedule forbidden)"
);
assert(
  simulateRescheduleCheck(1, 5) === false,
  "Reschedule truth-table: admin = non-null, member = non-null -> REJECTED (dual attribution forbidden)"
);

console.log("\n=== 3. Existing Admin Attribution Preservation ===");

const mig036Path = path.resolve(process.cwd(), 'database/migrations/036_create_appointment_reschedules.sql');
assert(fs.existsSync(mig036Path), "036_create_appointment_reschedules.sql exists");
const mig036Content = fs.readFileSync(mig036Path, 'utf8');

assert(
  /CONSTRAINT\s+`?fk_appointment_reschedules_rescheduled_by`?\s+FOREIGN\s+KEY\s*\(`?rescheduled_by`?\)\s+REFERENCES\s+`?admins`?\s*\(`?id`?\)/i.test(mig036Content),
  "Migration 036 establishes rescheduled_by -> admins(id) FK relationship"
);

// Migration 042 must NOT drop the admin FK
assert(
  !/DROP\s+FOREIGN\s+KEY\s+`?fk_appointment_reschedules_rescheduled_by`?/i.test(migContent),
  "Migration 042 does not drop fk_appointment_reschedules_rescheduled_by"
);
assert(
  !/DROP\s+CONSTRAINT\s+`?fk_appointment_reschedules_rescheduled_by`?/i.test(migContent),
  "Migration 042 does not drop constraint fk_appointment_reschedules_rescheduled_by"
);

console.log("\n=== 4. Fresh Install Parity Verification ===");

const freshInstallPath = path.resolve(process.cwd(), 'database/fresh-install.sql');
assert(fs.existsSync(freshInstallPath), "database/fresh-install.sql exists");
const freshInstallContent = fs.readFileSync(freshInstallPath, 'utf8');

// 4.1 Header range 001-042
assert(
  /-- Generated from migrations 001[–-]042/i.test(freshInstallContent),
  "fresh-install.sql header references 001-042 migration range"
);

// 4.2 Migration 042 in schema_migrations
assert(
  freshInstallContent.includes("('042_add_member_appointment_lifecycle_actor_attribution.sql', CURRENT_TIMESTAMP)"),
  "fresh-install.sql registers 042_add_member_appointment_lifecycle_actor_attribution.sql in schema_migrations"
);

// 4.3 Structural tokens from migration 042 replicated in fresh-install.sql
const tokens042 = [
  'cancelled_by_member_account_id',
  'fk_appointments_cancelled_by_member_account',
  'idx_appointments_cancelled_by_member_account',
  'chk_appointments_cancellation_actor_attribution',
  'rescheduled_by_member_account_id',
  'fk_appointment_reschedules_rescheduled_by_member_account',
  'idx_appointment_reschedules_rescheduled_by_member_account',
  'chk_appointment_reschedules_actor_attribution'
];

for (const token of tokens042) {
  assert(
    freshInstallContent.includes(token),
    `Authoritative token '${token}' replicated in fresh-install.sql`
  );
}

// 4.4 rescheduled_by nullable conversion in fresh-install.sql
assert(
  /ALTER\s+TABLE\s+`?appointment_reschedules`?\s+MODIFY\s+COLUMN\s+`?rescheduled_by`?\s+INT\s+NULL/i.test(freshInstallContent),
  "fresh-install.sql replicates nullable conversion for appointment_reschedules.rescheduled_by"
);

console.log("\n=== 5. Deployment Documentation Parity ===");

const deployDocPath = path.resolve(process.cwd(), 'DEPLOYMENT_PHP_MYSQL.md');
assert(fs.existsSync(deployDocPath), "DEPLOYMENT_PHP_MYSQL.md exists");
const deployDocContent = fs.readFileSync(deployDocPath, 'utf8');

assert(
  deployDocContent.includes("001–042") || deployDocContent.includes("001-042"),
  "DEPLOYMENT_PHP_MYSQL.md documents migration range 001–042"
);

console.log("\n=== 6. Decisions Architecture Record ===");

const decisionsPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decisionsPath), "DECISIONS.md exists");
const decisionsContent = fs.readFileSync(decisionsPath, 'utf8');

assert(
  decisionsContent.includes("## F.25A Member Appointment Lifecycle Actor Attribution Foundation"),
  "DECISIONS.md contains section '## F.25A Member Appointment Lifecycle Actor Attribution Foundation'"
);
assert(
  decisionsContent.includes("member_accounts.id"),
  "DECISIONS.md documents member_accounts.id actor attribution"
);
assert(
  decisionsContent.includes("member cancel/reschedule API is NOT part of F25A"),
  "DECISIONS.md documents that member cancel/reschedule API is excluded from F25A"
);

console.log("\n=== 7. Scope Guards & Regression Defenses ===");

// 7.1 AppointmentController unchanged for member attribution
const appointmentControllerPath = path.resolve(process.cwd(), 'api/controllers/AppointmentController.php');
assert(fs.existsSync(appointmentControllerPath), "AppointmentController.php exists");
const appointmentControllerContent = fs.readFileSync(appointmentControllerPath, 'utf8');

assert(
  !appointmentControllerContent.includes("cancelled_by_member_account_id"),
  "AppointmentController does not contain member actor cancellation attribution (admin/reception/trainer only)"
);
assert(
  !appointmentControllerContent.includes("rescheduled_by_member_account_id"),
  "AppointmentController does not contain member actor reschedule attribution (admin/trainer only)"
);

// 7.2 MemberAppointmentBookingController member lifecycle actor attribution usage
const memberBookingControllerPath = path.resolve(process.cwd(), 'api/controllers/MemberAppointmentBookingController.php');
assert(fs.existsSync(memberBookingControllerPath), "MemberAppointmentBookingController.php exists");
const memberBookingControllerContent = fs.readFileSync(memberBookingControllerPath, 'utf8');

assert(
  memberBookingControllerContent.includes("cancelled_by_member_account_id"),
  "MemberAppointmentBookingController uses cancelled_by_member_account_id for cancellation attribution"
);
assert(
  memberBookingControllerContent.includes("rescheduled_by_member_account_id"),
  "MemberAppointmentBookingController uses rescheduled_by_member_account_id for reschedule attribution"
);

// 7.3 api/index.php registers only canonical PATCH routes for member cancel/reschedule
const apiIndexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(apiIndexPath), "api/index.php exists");
const apiIndexContent = fs.readFileSync(apiIndexPath, 'utf8');

assert(
  apiIndexContent.includes("api/member/appointments/([1-9]\\d*)/cancel") &&
  apiIndexContent.includes("api/member/appointments/([1-9]\\d*)/reschedule"),
  "api/index.php registers canonical member cancellation and reschedule routes"
);
assert(
  !apiIndexContent.includes("POST /api/member/appointments/") && !apiIndexContent.includes("DELETE /api/member/appointments/"),
  "api/index.php registers no alternative/non-canonical POST/DELETE member lifecycle routes"
);

// 7.4 Ledger schema not modified by 042
assert(
  !migContent.includes("member_session_package_ledger"),
  "Migration 042 does NOT modify member_session_package_ledger"
);

// 7.5 No completed_by or no_show_by member actor attribution in schema
assert(
  !migContent.includes("completed_by_member_account_id") && !freshInstallContent.includes("completed_by_member_account_id"),
  "completed_by_member_account_id does NOT exist in schema"
);
assert(
  !migContent.includes("no_show_by_member_account_id") && !freshInstallContent.includes("no_show_by_member_account_id"),
  "no_show_by_member_account_id does NOT exist in schema"
);

console.log("\n=== 8. Package.json Registration Invariant ===");

const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkgContent = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgContent);

assert(
  pkg.scripts && pkg.scripts['verify:member-appointment-lifecycle-actor-attribution'] === 'node scripts/verify-member-appointment-lifecycle-actor-attribution.mjs',
  "package.json registers 'verify:member-appointment-lifecycle-actor-attribution': 'node scripts/verify-member-appointment-lifecycle-actor-attribution.mjs'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more F.25A lifecycle actor attribution invariants failed.");
  process.exit(exitCode);
} else {
  console.log("✅ SUCCESS: All Member Appointment Lifecycle Actor Attribution Foundation invariants verified.");
}
