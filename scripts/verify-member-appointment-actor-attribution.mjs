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

console.log("=== 1. Migration 040 File Existence & Structure ===");

const migPath = path.resolve(process.cwd(), 'database/migrations/040_add_member_appointment_actor_attribution.sql');
assert(fs.existsSync(migPath), "040_add_member_appointment_actor_attribution.sql exists in database/migrations");

const migContent = fs.readFileSync(migPath, 'utf8');

// 1.1 appointments: created_by nullable
assert(
  /ALTER\s+TABLE\s+`?appointments`?\s+MODIFY\s+COLUMN\s+`?created_by`?\s+INT\s+NULL/i.test(migContent),
  "appointments: created_by is modified to INT NULL"
);

// 1.2 appointments: created_by_member_account_id column added
assert(
  /ALTER\s+TABLE\s+`?appointments`?\s+ADD\s+COLUMN\s+`?created_by_member_account_id`?\s+INT\s+NULL/i.test(migContent),
  "appointments: created_by_member_account_id INT NULL column added"
);

// 1.3 appointments: FK to member_accounts(id)
assert(
  /CONSTRAINT\s+`?fk_appointments_created_by_member_account`?\s+FOREIGN\s+KEY\s*\(`?created_by_member_account_id`?\)\s+REFERENCES\s+`?member_accounts`?\s*\(`?id`?\)/i.test(migContent),
  "appointments: fk_appointments_created_by_member_account references member_accounts(id)"
);
assert(
  /ON\s+DELETE\s+RESTRICT\s+ON\s+UPDATE\s+RESTRICT/i.test(migContent),
  "appointments: FK uses ON DELETE RESTRICT ON UPDATE RESTRICT"
);

// 1.4 appointments: Index on created_by_member_account_id
assert(
  /(?:CREATE\s+INDEX|ADD\s+INDEX)\s+`?idx_appointments_created_by_member_account`?/i.test(migContent),
  "appointments: index idx_appointments_created_by_member_account exists"
);

// 1.5 appointments: Mutual exclusivity check constraint
assert(
  /CONSTRAINT\s+`?chk_appointments_creator_attribution`?\s+CHECK\s*\(/i.test(migContent),
  "appointments: check constraint chk_appointments_creator_attribution exists"
);
assert(
  /`?created_by`?\s+IS\s+NOT\s+NULL\s+AND\s+`?created_by_member_account_id`?\s+IS\s+NULL/i.test(migContent) &&
  /`?created_by`?\s+IS\s+NULL\s+AND\s+`?created_by_member_account_id`?\s+IS\s+NOT\s+NULL/i.test(migContent),
  "appointments: check constraint enforces mutual exclusivity between admin and member account creator"
);

console.log("\n=== 2. member_session_package_ledger Attribution Structure ===");

// 2.1 member_session_package_ledger: created_by nullable
assert(
  /ALTER\s+TABLE\s+`?member_session_package_ledger`?\s+MODIFY\s+COLUMN\s+`?created_by`?\s+INT\s+NULL/i.test(migContent),
  "member_session_package_ledger: created_by is modified to INT NULL"
);

// 2.2 member_session_package_ledger: created_by_member_account_id column added
assert(
  /ALTER\s+TABLE\s+`?member_session_package_ledger`?\s+ADD\s+COLUMN\s+`?created_by_member_account_id`?\s+INT\s+NULL/i.test(migContent),
  "member_session_package_ledger: created_by_member_account_id INT NULL column added"
);

// 2.3 member_session_package_ledger: FK to member_accounts(id)
assert(
  /CONSTRAINT\s+`?fk_mspl_created_by_member_account`?\s+FOREIGN\s+KEY\s*\(`?created_by_member_account_id`?\)\s+REFERENCES\s+`?member_accounts`?\s*\(`?id`?\)/i.test(migContent),
  "member_session_package_ledger: fk_mspl_created_by_member_account references member_accounts(id)"
);

// 2.4 member_session_package_ledger: Index on created_by_member_account_id
assert(
  /(?:CREATE\s+INDEX|ADD\s+INDEX)\s+`?idx_mspl_created_by_member_account`?/i.test(migContent),
  "member_session_package_ledger: index idx_mspl_created_by_member_account exists"
);

// 2.5 member_session_package_ledger: Mutual exclusivity check constraint
assert(
  /CONSTRAINT\s+`?chk_mspl_creator_attribution`?\s+CHECK\s*\(/i.test(migContent),
  "member_session_package_ledger: check constraint chk_mspl_creator_attribution exists"
);
assert(
  /`?created_by`?\s+IS\s+NOT\s+NULL\s+AND\s+`?created_by_member_account_id`?\s+IS\s+NULL/i.test(migContent) &&
  /`?created_by`?\s+IS\s+NULL\s+AND\s+`?created_by_member_account_id`?\s+IS\s+NOT\s+NULL/i.test(migContent),
  "member_session_package_ledger: check constraint enforces mutual exclusivity between admin and member account creator"
);

// 2.6 Zero business mutation in migration
assert(
  !/\bINSERT\s+INTO\s+`?appointments`?/i.test(migContent) &&
  !/\bUPDATE\s+`?appointments`?/i.test(migContent) &&
  !/\bDELETE\s+FROM\s+`?appointments`?/i.test(migContent) &&
  !/\bINSERT\s+INTO\s+`?member_session_package_ledger`?/i.test(migContent),
  "Migration 040 contains zero business mutations"
);

console.log("\n=== 3. Canonical Fresh Install Parity ===");

const freshPath = path.resolve(process.cwd(), 'database/fresh-install.sql');
assert(fs.existsSync(freshPath), "database/fresh-install.sql exists");
const freshContent = fs.readFileSync(freshPath, 'utf8');

assert(
  freshContent.includes('040_add_member_appointment_actor_attribution.sql'),
  "fresh-install.sql records 040_add_member_appointment_actor_attribution.sql in schema_migrations"
);
assert(
  freshContent.includes('fk_appointments_created_by_member_account'),
  "fresh-install.sql replicates fk_appointments_created_by_member_account constraint"
);
assert(
  freshContent.includes('chk_appointments_creator_attribution'),
  "fresh-install.sql replicates chk_appointments_creator_attribution check constraint"
);
assert(
  freshContent.includes('fk_mspl_created_by_member_account'),
  "fresh-install.sql replicates fk_mspl_created_by_member_account constraint"
);
assert(
  freshContent.includes('chk_mspl_creator_attribution'),
  "fresh-install.sql replicates chk_mspl_creator_attribution check constraint"
);

console.log("\n=== 4. Admin-Realm Appointment & Ledger Invariant Preservation ===");

const apptCtrlPath = path.resolve(process.cwd(), 'api/controllers/AppointmentController.php');
assert(fs.existsSync(apptCtrlPath), "AppointmentController.php exists");
const apptCtrl = fs.readFileSync(apptCtrlPath, 'utf8');

// Admin appointment creation continues to insert created_by with $adminId
assert(
  apptCtrl.includes("INSERT INTO appointments (uuid, member_id, trainer_id, member_session_package_id, starts_at, ends_at, status, created_by)"),
  "AppointmentController preserves existing admin INSERT INTO appointments signature with created_by"
);
assert(
  apptCtrl.includes("$insStmt->bindValue(7, $adminId, PDO::PARAM_INT);"),
  "AppointmentController binds session $adminId to created_by"
);

// Ledger reservation continues to insert created_by with $adminId
assert(
  apptCtrl.includes("INSERT INTO member_session_package_ledger (uuid, member_session_package_id, appointment_id, entry_type, delta, created_by)"),
  "AppointmentController preserves existing reserve ledger INSERT with created_by"
);
assert(
  apptCtrl.includes("$resStmt->bindValue(4, $adminId, PDO::PARAM_INT);"),
  "AppointmentController binds session $adminId to ledger reserve created_by"
);

// Ledger cancellation release continues to insert created_by with $adminId
assert(
  apptCtrl.includes("$insRel->bindValue(5, $adminId, \\PDO::PARAM_INT);") ||
  apptCtrl.includes("$insRel->bindValue(5, $adminId, PDO::PARAM_INT);"),
  "AppointmentController binds session $adminId to ledger release created_by"
);

console.log("\n=== 5. Decisions Architecture Record ===");

const decPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decContent = fs.readFileSync(decPath, 'utf8');

assert(
  decContent.includes("## F.24A Member Appointment Actor Attribution Foundation"),
  "DECISIONS.md has '## F.24A Member Appointment Actor Attribution Foundation' section"
);
assert(
  decContent.includes("member_accounts.id"),
  "DECISIONS.md documents member_accounts.id actor attribution"
);
assert(
  decContent.includes("chk_appointments_creator_attribution"),
  "DECISIONS.md documents mutual exclusivity check constraint"
);
assert(
  decContent.includes("no member booking or availability endpoint"),
  "DECISIONS.md explicitly confirms no booking/availability endpoints in this foundation phase"
);

console.log("\n=== 6. Package.json Script Registration ===");

const pkgJsonPath = path.resolve(process.cwd(), 'package.json');
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

assert(
  pkgJson.scripts && pkgJson.scripts["verify:member-appointment-actor-attribution"] === "node scripts/verify-member-appointment-actor-attribution.mjs",
  "package.json registers verify:member-appointment-actor-attribution"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Member Appointment Actor Attribution Foundation verification detected violations.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All Member Appointment Actor Attribution Foundation invariants verified.");
  process.exit(0);
}
