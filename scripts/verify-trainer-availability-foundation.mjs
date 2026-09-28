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

console.log("=== 1. Self-Tests: Overlap Predicates ===");

function checkTimeOverlap(w1, w2) {
  return w1.start < w2.end && w1.end > w2.start;
}

// 09:00–12:00 + 12:00–15:00 → allowed (not overlapping)
assert(!checkTimeOverlap({ start: '09:00', end: '12:00' }, { start: '12:00', end: '15:00' }), "Adjacent windows (09:00-12:00 and 12:00-15:00) are allowed");

// 09:00–12:00 + 11:59–15:00 → rejected (overlapping)
assert(checkTimeOverlap({ start: '09:00', end: '12:00' }, { start: '11:59', end: '15:00' }), "Overlapping windows (09:00-12:00 and 11:59-15:00) are rejected");

// 09:00–12:00 + 09:00–12:00 → rejected (exact duplicate)
assert(checkTimeOverlap({ start: '09:00', end: '12:00' }, { start: '09:00', end: '12:00' }), "Duplicate windows (09:00-12:00 and 09:00-12:00) are rejected");

function checkBlockOverlap(b1, b2) {
  return b1.start < b2.end && b1.end > b2.start;
}

// Datetime blocks adjacent -> allowed
assert(
  !checkBlockOverlap(
    { start: '2026-10-10 09:00:00', end: '2026-10-10 12:00:00' },
    { start: '2026-10-10 12:00:00', end: '2026-10-10 15:00:00' }
  ),
  "Adjacent blocks are allowed"
);

// Datetime blocks overlapping -> rejected
assert(
  checkBlockOverlap(
    { start: '2026-10-10 09:00:00', end: '2026-10-10 12:00:00' },
    { start: '2026-10-10 11:59:59', end: '2026-10-10 15:00:00' }
  ),
  "Overlapping datetime blocks are rejected"
);

// Datetime blocks exact duplicate -> rejected
assert(
  checkBlockOverlap(
    { start: '2026-10-10 09:00:00', end: '2026-10-10 12:00:00' },
    { start: '2026-10-10 09:00:00', end: '2026-10-10 12:00:00' }
  ),
  "Duplicate datetime blocks are rejected"
);

console.log("\n=== 2. Migration 041 Schema & Contracts ===");

const migPath = path.resolve(process.cwd(), 'database/migrations/041_create_trainer_availability.sql');
assert(fs.existsSync(migPath), "041_create_trainer_availability.sql exists in database/migrations");
const migContent = fs.readFileSync(migPath, 'utf8');

// Weekly windows table
assert(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?trainer_availability_windows`?/i.test(migContent), "Creates trainer_availability_windows table");
assert(/`?day_of_week`?\s+TINYINT\s+UNSIGNED\s+NOT\s+NULL/i.test(migContent), "day_of_week is TINYINT UNSIGNED NOT NULL");
assert(/`?start_time`?\s+TIME\s+NOT\s+NULL/i.test(migContent), "start_time is TIME NOT NULL");
assert(/`?end_time`?\s+TIME\s+NOT\s+NULL/i.test(migContent), "end_time is TIME NOT NULL");
assert(/chk_trainer_availability_weekday/i.test(migContent) && /BETWEEN\s+1\s+AND\s+7/i.test(migContent), "Enforces ISO weekday 1..7 check constraint");
assert(/chk_trainer_availability_time_range/i.test(migContent) && /`?start_time`?\s*<\s*`?end_time`?/i.test(migContent), "Enforces start_time < end_time check constraint");
assert(/fk_trainer_availability_trainer/i.test(migContent) && /REFERENCES\s+`?trainers`?\s*\(`?id`?\)/i.test(migContent), "FK references trainers(id) on delete restrict");
assert(/fk_trainer_availability_created_by/i.test(migContent) && /REFERENCES\s+`?admins`?\s*\(`?id`?\)/i.test(migContent), "created_by FK references admins(id)");
assert(/fk_trainer_availability_updated_by/i.test(migContent) && /REFERENCES\s+`?admins`?\s*\(`?id`?\)/i.test(migContent), "updated_by FK references admins(id)");
assert(/uq_trainer_availability_window/i.test(migContent) && /UNIQUE\s*\([^)]*trainer_id[^)]*day_of_week[^)]*start_time[^)]*end_time[^)]*\)/i.test(migContent), "Unique constraint on (trainer_id, day_of_week, start_time, end_time)");

// Unavailability blocks table
assert(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?trainer_unavailability_blocks`?/i.test(migContent), "Creates trainer_unavailability_blocks table");
assert(/`?starts_at`?\s+DATETIME\s+NOT\s+NULL/i.test(migContent), "starts_at is DATETIME NOT NULL");
assert(/`?ends_at`?\s+DATETIME\s+NOT\s+NULL/i.test(migContent), "ends_at is DATETIME NOT NULL");
assert(/`?reason`?\s+VARCHAR\(255\)\s+NULL/i.test(migContent), "reason is VARCHAR(255) NULL");
assert(/chk_trainer_unavailability_time_range/i.test(migContent) && /`?starts_at`?\s*<\s*`?ends_at`?/i.test(migContent), "Enforces starts_at < ends_at check constraint");
assert(/fk_trainer_unavailability_trainer/i.test(migContent) && /REFERENCES\s+`?trainers`?\s*\(`?id`?\)/i.test(migContent), "blocks FK references trainers(id)");
assert(/idx_trainer_unavailability_lookup/i.test(migContent) && /INDEX\s+`?idx_trainer_unavailability_lookup`?\s+ON\s+`?trainer_unavailability_blocks`?\s*\(`?trainer_id`?\s*,\s*`?starts_at`?\s*,\s*`?ends_at`?\)/i.test(migContent), "Lookup index exists on (trainer_id, starts_at, ends_at)");

// No status columns
assert(!/`?status`?/i.test(migContent), "No status column in availability tables");
assert(!/`?is_active`?/i.test(migContent), "No is_active column in availability tables");
assert(!/`?deleted_at`?/i.test(migContent), "No deleted_at column in availability tables (no soft delete)");

console.log("\n=== 3. Routes & RBAC in api/index.php ===");

const indexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(indexPath), "api/index.php exists");
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Admin availability routes
assert(
  indexContent.includes('/api/admin/trainers/([1-9]\\d*)/availability'),
  "Admin availability route pattern /api/admin/trainers/:id/availability registered"
);
assert(
  indexContent.includes("AuthMiddleware::hasRole(['super_admin', 'admin'])"),
  "Admin availability route requires super_admin or admin role"
);

// Trainer availability routes
assert(
  indexContent.includes('/api/trainer/availability'),
  "Trainer availability route /api/trainer/availability registered"
);
assert(
  indexContent.includes("AuthMiddleware::hasRole(['trainer'])"),
  "Trainer availability route requires trainer role"
);

// Forbidden availability routes
assert(!indexContent.includes('/api/member/availability'), "No member availability route");
assert(!indexContent.includes('/api/member/appointments/availability'), "No member appointment availability route");
assert(!indexContent.includes('/api/reception/trainers/') && !indexContent.includes('/api/reception/availability'), "No reception availability route");
assert(!indexContent.includes('/api/editor/availability'), "No editor availability route");

console.log("\n=== 4. Controller Implementation & Constraints ===");

const ctrlPath = path.resolve(process.cwd(), 'api/controllers/TrainerAvailabilityController.php');
assert(fs.existsSync(ctrlPath), "TrainerAvailabilityController.php exists");
const ctrlContent = fs.readFileSync(ctrlPath, 'utf8');

// Self-only trainer resolution
assert(
  ctrlContent.includes("$_SESSION['admin_id']") &&
  ctrlContent.includes("trainers WHERE admin_id = ?"),
  "Trainer self methods resolve trainer strictly from session admin_id -> trainers.admin_id"
);
assert(
  !ctrlContent.includes("$_GET['trainer_id']") && !ctrlContent.includes("$data['trainer_id']"),
  "Trainer self methods forbid client-supplied trainer_id"
);

// Inactive trainer check for trainer self
assert(
  ctrlContent.includes("TRAINER_INELIGIBLE") && ctrlContent.includes("is_active"),
  "Inactive trainer self-access is rejected with TRAINER_INELIGIBLE (403)"
);

// Strict query parameter rejection
assert(
  ctrlContent.includes("!empty($_GET)") && ctrlContent.includes("VALIDATION_ERROR"),
  "Controller rejects non-empty query parameters with 422 VALIDATION_ERROR"
);

// Content-Type enforcement
assert(
  ctrlContent.includes("strpos($contentType, 'application/json')"),
  "PUT requires application/json Content-Type"
);

// Strict payload allowlist
assert(
  ctrlContent.includes("['unavailability_blocks', 'weekly_windows']"),
  "Payload strictly checks top-level keys: weekly_windows, unavailability_blocks"
);
assert(
  ctrlContent.includes("['day_of_week', 'end_time', 'start_time']"),
  "Weekly window items strictly check keys: day_of_week, start_time, end_time"
);
assert(
  ctrlContent.includes("['ends_at', 'reason', 'starts_at']"),
  "Unavailability block items strictly check keys: starts_at, ends_at, reason"
);

// Input limits
assert(
  ctrlContent.includes("count($data['weekly_windows']) > 28"),
  "Enforces maximum of 28 weekly windows"
);
assert(
  ctrlContent.includes("count($data['unavailability_blocks']) > 100"),
  "Enforces maximum of 100 unavailability blocks"
);

// Time validation & overlap detection
assert(
  ctrlContent.includes("startMinutes >= $endMinutes"),
  "Enforces start_time strictly before end_time"
);
assert(
  ctrlContent.includes("$existing['startMinutes'] < $endMinutes && $existing['endMinutes'] > $startMinutes"),
  "Controller detects and rejects overlapping weekly windows on the same weekday"
);
assert(
  ctrlContent.includes("$existing['starts_at'] < $b['ends_at'] && $existing['ends_at'] > $b['starts_at']"),
  "Controller detects and rejects overlapping unavailability blocks"
);

// Canonical sorting
assert(
  ctrlContent.includes("day_of_week") && ctrlContent.includes("startMinutes"),
  "Weekly windows are canonically sorted by day_of_week, start_time"
);

// Transactional snapshot replacement
assert(
  ctrlContent.includes("$this->db->beginTransaction()"),
  "PUT initiates database transaction"
);
assert(
  ctrlContent.includes("WHERE id = ? FOR UPDATE"),
  "PUT locks target trainer row FOR UPDATE"
);
assert(
  ctrlContent.includes("DELETE FROM trainer_availability_windows WHERE trainer_id = ?"),
  "PUT deletes existing weekly windows before replacement"
);
assert(
  ctrlContent.includes("DELETE FROM trainer_unavailability_blocks WHERE trainer_id = ?"),
  "PUT deletes existing unavailability blocks before replacement"
);
assert(
  ctrlContent.includes("$this->db->commit()"),
  "PUT commits transaction on success"
);
assert(
  ctrlContent.includes("$this->db->rollBack()"),
  "PUT rolls back transaction on error"
);

// Audit logging
assert(
  ctrlContent.includes("AuditLogger::log") &&
  ctrlContent.includes("'trainer.availability.updated'") &&
  ctrlContent.includes("'weekly_window_count'") &&
  ctrlContent.includes("'unavailability_block_count'"),
  "AuditLogger records trainer.availability.updated with window and block counts"
);

// Zero appointment mutation in availability domain
assert(
  !ctrlContent.includes("INSERT INTO appointments") &&
  !ctrlContent.includes("UPDATE appointments") &&
  !ctrlContent.includes("DELETE FROM appointments") &&
  !ctrlContent.includes("member_session_package_ledger"),
  "TrainerAvailabilityController never mutates appointments or session package ledger"
);

// Zero slot duration concepts
assert(
  !ctrlContent.includes("available_slots") &&
  !ctrlContent.includes("slot_duration") &&
  !ctrlContent.includes("booking_horizon") &&
  !ctrlContent.includes("minimum_notice"),
  "Controller contains zero slot duration or booking horizon logic"
);

console.log("\n=== 5. Fresh Install Parity Chained Verification ===");

try {
  const freshParityOutput = execSync('node scripts/verify-fresh-install-parity.mjs', { encoding: 'utf8' });
  assert(freshParityOutput.includes("SUCCESS"), "Dynamic fresh install parity verifier passes");
} catch (e) {
  assert(false, `Dynamic fresh install parity verifier failed: ${e.message}`);
}

console.log("\n=== 6. Architecture Documentation Invariants ===");

const decPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decContent = fs.readFileSync(decPath, 'utf8');

assert(
  decContent.includes("## F.24B.1 Trainer Availability Domain Foundation & API"),
  "DECISIONS.md records F.24B.1 decision"
);
assert(
  decContent.includes("ISO weekday recurring same-day windows"),
  "DECISIONS.md documents weekly availability semantics"
);
assert(
  decContent.includes("specific unavailability is represented by datetime blocks"),
  "DECISIONS.md documents unavailability blocks"
);
assert(
  decContent.includes("availability configuration does not mutate existing appointments"),
  "DECISIONS.md documents existing appointments remain untouched"
);
assert(
  decContent.includes("Europe/Istanbul remains business timezone"),
  "DECISIONS.md documents Europe/Istanbul timezone"
);

console.log("\n=== 7. Package.json Script Registration ===");

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:trainer-availability-foundation"] === "node scripts/verify-trainer-availability-foundation.mjs",
  "package.json registers verify:trainer-availability-foundation"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Trainer Availability Domain Foundation verification detected violations.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All Trainer Availability Domain Foundation invariants verified.");
  process.exit(0);
}
