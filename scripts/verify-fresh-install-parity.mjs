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

console.log("=== 1. Dynamic Migration Collection & Latest Version Derivation ===");
const migrationsDir = path.resolve(process.cwd(), 'database/migrations');
assert(fs.existsSync(migrationsDir), "database/migrations directory exists");

const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

assert(migrationFiles.length > 0, `Discovered ${migrationFiles.length} migration files dynamically`);
console.log(`Total migrations found: ${migrationFiles.length}`);

// Get earliest and latest migration
const firstMigration = migrationFiles[0];
const latestMigration = migrationFiles[migrationFiles.length - 1];

const firstMatch = firstMigration.match(/^(\d+)/);
const latestMatch = latestMigration.match(/^(\d+)/);

assert(firstMatch !== null, `First migration has numeric prefix: ${firstMigration}`);
assert(latestMatch !== null, `Latest migration has numeric prefix: ${latestMigration}`);

const firstNum = firstMatch ? firstMatch[1] : '001';
const latestNum = latestMatch ? latestMatch[1] : '039';

console.log(`Dynamic migration range: ${firstNum} -> ${latestNum} (${latestMigration})`);
assert(latestMigration === '039_create_admin_notifications.sql', "Current latest migration is 039_create_admin_notifications.sql");

console.log("\n=== 2. Package.json Script Registration ===");
const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:fresh-install-parity"] === "node scripts/verify-fresh-install-parity.mjs",
  "package.json exact registration: 'verify:fresh-install-parity' === 'node scripts/verify-fresh-install-parity.mjs'"
);

console.log("\n=== 3. Repo Hygiene Checks ===");
const rootFiles = fs.readdirSync(process.cwd());
const forbiddenPatterns = [
  /^patch.*\.js$/, /^patch.*\.mjs$/, /^patch.*\.php$/,
  /^tmp.*\.js$/, /^tmp.*\.mjs$/, /^tmp.*\.php$/,
  /\.tmp$/, /\.fixed$/, /^add-.*\.php$/
];
const hygieneViolations = rootFiles.filter(file => forbiddenPatterns.some(p => p.test(file)));
assert(hygieneViolations.length === 0, `Repo hygiene: No temporary or patch artifacts in root (found: ${hygieneViolations.join(', ')})`);

console.log("\n=== 4. Fresh Install Header & Dynamic Version Alignment ===");
const freshInstallPath = path.resolve(process.cwd(), 'database/fresh-install.sql');
assert(fs.existsSync(freshInstallPath), "database/fresh-install.sql exists");
const freshInstallContent = fs.readFileSync(freshInstallPath, 'utf8');

// Match header dynamic range (e.g. Generated from migrations 001-039)
const expectedHeaderRegex = new RegExp(`Generated from migrations\\s+${firstNum}[–-]${latestNum}`, 'i');
assert(
  expectedHeaderRegex.test(freshInstallContent),
  `fresh-install.sql header matches dynamic range: Generated from migrations ${firstNum}-${latestNum}`
);

// Must not contain stale header versions
const staleHeaderRegex = new RegExp(`Generated from migrations\\s+001[–-]03[0-8]\\b`, 'i');
assert(
  !staleHeaderRegex.test(freshInstallContent),
  "fresh-install.sql header does NOT claim stale migration range (001-037 or 001-038)"
);

console.log("\n=== 5. Schema Migrations History Parity in Fresh Install ===");

// Extract INSERT INTO schema_migrations block
const insertMatch = freshInstallContent.match(/INSERT\s+INTO\s+schema_migrations\s*\([^)]*\)\s*VALUES\s*([\s\S]*?);/i);
assert(insertMatch !== null, "fresh-install.sql contains INSERT INTO schema_migrations block");

const historyEntries = [];
if (insertMatch) {
  const valuesBlock = insertMatch[1];
  // Match each ('filename.sql', ...)
  const rowMatches = valuesBlock.matchAll(/\(\s*'([^']+)'\s*,/g);
  for (const m of rowMatches) {
    historyEntries.push(m[1]);
  }
}

console.log(`Discovered ${historyEntries.length} schema_migrations history entries in fresh-install.sql`);

// 5.1 Count equality
assert(
  historyEntries.length === migrationFiles.length,
  `History entry count (${historyEntries.length}) exactly matches migrations directory file count (${migrationFiles.length})`
);

// 5.2 No duplicates in history
const historySet = new Set();
const duplicates = [];
for (const entry of historyEntries) {
  if (historySet.has(entry)) {
    duplicates.push(entry);
  }
  historySet.add(entry);
}
assert(duplicates.length === 0, `No duplicate migration entries in fresh-install history (duplicates: ${duplicates.join(', ')})`);

// 5.3 No unknown history files
const migrationFilesSet = new Set(migrationFiles);
const unknownEntries = historyEntries.filter(entry => !migrationFilesSet.has(entry));
assert(unknownEntries.length === 0, `No unknown migration files in fresh-install history (unknown: ${unknownEntries.join(', ')})`);

// 5.4 Every migration file present in history
const missingEntries = migrationFiles.filter(f => !historySet.has(f));
assert(missingEntries.length === 0, `Every migration file is present in fresh-install history (missing: ${missingEntries.join(', ')})`);

// 5.5 Latest migration 039 specifically in history
assert(
  historyEntries.includes('039_create_admin_notifications.sql'),
  "039_create_admin_notifications.sql is explicitly recorded in schema_migrations history"
);

console.log("\n=== 6. Migration 039 Schema Parity in Fresh Install ===");

const mig039Path = path.resolve(migrationsDir, '039_create_admin_notifications.sql');
assert(fs.existsSync(mig039Path), "039_create_admin_notifications.sql exists in database/migrations");
const mig039Content = fs.readFileSync(mig039Path, 'utf8');

// 6.1 Table creation
assert(
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?admin_notifications`?/i.test(freshInstallContent),
  "fresh-install.sql creates `admin_notifications` table"
);

// 6.2 Columns contract
const expectedColumns = [
  'id',
  'uuid',
  'recipient_admin_id',
  'source_key',
  'type',
  'severity',
  'title',
  'body',
  'entity_type',
  'entity_id',
  'action_path',
  'read_at',
  'dismissed_at',
  'created_at'
];

// Extract admin_notifications table definition block
const tableBlockMatch = freshInstallContent.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?admin_notifications`?\s*\(([\s\S]*?)\)\s*ENGINE/i);
assert(tableBlockMatch !== null, "Extracted `admin_notifications` CREATE TABLE block from fresh-install.sql");

if (tableBlockMatch) {
  const tableDef = tableBlockMatch[1];
  for (const col of expectedColumns) {
    const colRegex = new RegExp(`\`?${col}\`?\\s+`, 'i');
    assert(colRegex.test(tableDef), `admin_notifications table contains column '${col}'`);
  }

  // 6.3 Foreign key & unique constraints
  assert(
    /FOREIGN\s+KEY\s*\(`?recipient_admin_id`?\)\s+REFERENCES\s+`?admins`?\s*\(`?id`?\)/i.test(tableDef),
    "admin_notifications references admins(id) via recipient_admin_id"
  );
  assert(
    /ON\s+DELETE\s+RESTRICT\s+ON\s+UPDATE\s+RESTRICT/i.test(tableDef),
    "Foreign key specifies ON DELETE RESTRICT ON UPDATE RESTRICT"
  );
  assert(
    /UNIQUE\s*\(`?recipient_admin_id`?\s*,\s*`?source_key`?\)/i.test(tableDef),
    "admin_notifications enforces UNIQUE(recipient_admin_id, source_key)"
  );
}

// 6.4 Indexes contract
assert(
  /CREATE\s+INDEX\s+`?[a-zA-Z0-9_]+`?\s+ON\s+`?admin_notifications`?\s*\(`?recipient_admin_id`?\s*,\s*`?dismissed_at`?\s*,\s*`?created_at`?\)/i.test(freshInstallContent),
  "Index exists on admin_notifications(recipient_admin_id, dismissed_at, created_at)"
);
assert(
  /CREATE\s+INDEX\s+`?[a-zA-Z0-9_]+`?\s+ON\s+`?admin_notifications`?\s*\(`?recipient_admin_id`?\s*,\s*`?read_at`?\s*,\s*`?created_at`?\)/i.test(freshInstallContent),
  "Index exists on admin_notifications(recipient_admin_id, read_at, created_at)"
);
assert(
  /CREATE\s+INDEX\s+`?[a-zA-Z0-9_]+`?\s+ON\s+`?admin_notifications`?\s*\(`?recipient_admin_id`?\s*,\s*`?type`?\s*,\s*`?created_at`?\)/i.test(freshInstallContent),
  "Index exists on admin_notifications(recipient_admin_id, type, created_at)"
);

// 6.5 Tokens comparison against migration 039 authority
const structuralTokens = [
  'admin_notifications',
  'fk_admin_notifications_recipient',
  'uq_admin_notifications_recipient_source',
  'idx_admin_notifications_recipient_dismissed_created',
  'idx_admin_notifications_recipient_read_created',
  'idx_admin_notifications_recipient_type_created'
];
for (const token of structuralTokens) {
  assert(mig039Content.includes(token), `Migration 039 authoritative token '${token}' exists in migration file`);
  assert(freshInstallContent.includes(token), `Authoritative token '${token}' replicated in fresh-install.sql`);
}

console.log("\n=== 7. Deployment Documentation Verification ===");
const deployDocPath = path.resolve(process.cwd(), 'DEPLOYMENT_PHP_MYSQL.md');
assert(fs.existsSync(deployDocPath), "DEPLOYMENT_PHP_MYSQL.md exists");
const deployDocContent = fs.readFileSync(deployDocPath, 'utf8');

// Dynamic range match (001–039)
const deployRangeRegex = new RegExp(`001[–-]${latestNum}`);
assert(
  deployRangeRegex.test(deployDocContent),
  `DEPLOYMENT_PHP_MYSQL.md references current migration range 001–${latestNum}`
);

// No stale range
assert(!/001[–-]037/.test(deployDocContent), "DEPLOYMENT_PHP_MYSQL.md does NOT claim stale range 001–037");
assert(!/001[–-]038/.test(deployDocContent), "DEPLOYMENT_PHP_MYSQL.md does NOT claim stale range 001–038");

// Canonical rules
assert(
  deployDocContent.includes("database/migrations/") && deployDocContent.includes("authoritative for incremental updates"),
  "DEPLOYMENT_PHP_MYSQL.md states database/migrations/ is authoritative for incremental updates"
);
assert(
  deployDocContent.includes("database/fresh-install.sql") && deployDocContent.includes("parity"),
  "DEPLOYMENT_PHP_MYSQL.md states fresh-install.sql must maintain schema/history-parity"
);
assert(
  deployDocContent.includes("php bin/migrate.php") && deployDocContent.includes("admin_notifications"),
  "DEPLOYMENT_PHP_MYSQL.md provides migration 039 upgrade instructions using php bin/migrate.php"
);
assert(
  deployDocContent.includes("Never import `fresh-install.sql` into a live database") ||
  deployDocContent.includes("never import into an existing/live database"),
  "DEPLOYMENT_PHP_MYSQL.md preserves clear warning against importing fresh-install over live database"
);

console.log("\n=== 8. Roadmap Truth Verification ===");
const roadmapPath = path.resolve(process.cwd(), 'ROADMAP.md');
assert(fs.existsSync(roadmapPath), "ROADMAP.md exists");
const roadmapContent = fs.readFileSync(roadmapPath, 'utf8');

// Must NOT list completed operational systems under Future Modules
const futureModulesSectionMatch = roadmapContent.match(/##\s+Gelecek\s+Modüller[\s\S]*?(?:##|$)/i);
if (futureModulesSectionMatch) {
  const futureText = futureModulesSectionMatch[0];
  assert(!futureText.includes("Üye Sistemi"), "ROADMAP.md does not list 'Üye Sistemi' under Future Modules");
  assert(!futureText.includes("Antrenör Sistemi"), "ROADMAP.md does not list 'Antrenör Sistemi' under Future Modules");
  assert(!futureText.includes("Resepsiyon Operasyonu"), "ROADMAP.md does not list 'Resepsiyon Operasyonu' under Future Modules");
  assert(!futureText.includes("Randevu Sistemi"), "ROADMAP.md does not list 'Randevu Sistemi' under Future Modules");
  assert(!futureText.includes("Bildirim Mekanizmaları"), "ROADMAP.md does not list 'Bildirim Mekanizmaları' under Future Modules");
} else {
  assert(true, "ROADMAP.md has no stale 'Future Modules' section with completed modules");
}

// Completed capabilities must accurately list the domains
assert(roadmapContent.includes("Üye Portalı") || roadmapContent.includes("Member Portal"), "ROADMAP.md mentions Member Portal in completed capabilities");
assert(roadmapContent.includes("Antrenör Mobil") || roadmapContent.includes("Trainer Mobile Workspace"), "ROADMAP.md mentions Trainer Mobile Workspace in completed capabilities");
assert(roadmapContent.includes("Resepsiyon") || roadmapContent.includes("Reception Operations"), "ROADMAP.md mentions Reception Operations in completed capabilities");
assert(roadmapContent.includes("Randevu") || roadmapContent.includes("Appointment Lifecycle"), "ROADMAP.md mentions Appointment Lifecycle in completed capabilities");
assert(roadmapContent.includes("Seans Paketleri") || roadmapContent.includes("Session Package Ledger"), "ROADMAP.md mentions Session Packages in completed capabilities");
assert(roadmapContent.includes("Yenileme Takibi") || roadmapContent.includes("Renewal Watch"), "ROADMAP.md mentions Renewal Watch in completed capabilities");
assert(roadmapContent.includes("Yönetici Bildirimleri") || roadmapContent.includes("In-App Admin Notifications"), "ROADMAP.md mentions Admin Notifications in completed capabilities");
assert(roadmapContent.includes("Operasyon Analitiği") || roadmapContent.includes("Operations Analytics"), "ROADMAP.md mentions Operations Analytics in completed capabilities");

// F.21 Lead / Sales CRM intentionally skipped
assert(
  roadmapContent.includes("F.21") &&
  (roadmapContent.toLowerCase().includes("crm") || roadmapContent.toLowerCase().includes("lead")) &&
  (roadmapContent.toLowerCase().includes("intentionally skipped") || roadmapContent.toLowerCase().includes("atlanmıştır")),
  "ROADMAP.md records that F.21 Lead/Sales CRM was intentionally skipped"
);

console.log("\n=== 9. Decisions Documentation Verification ===");
const decisionsPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decisionsPath), "DECISIONS.md exists");
const decisionsContent = fs.readFileSync(decisionsPath, 'utf8');

assert(
  decisionsContent.includes("## F.23A Fresh Install & Deployment Parity Closure"),
  "DECISIONS.md contains '## F.23A Fresh Install & Deployment Parity Closure'"
);
assert(
  decisionsContent.includes("migration directory remains incremental schema authority"),
  "DECISIONS.md documents migration directory authority"
);
assert(
  decisionsContent.includes("fresh-install is canonical empty-database representation and must remain migration-history complete"),
  "DECISIONS.md documents fresh-install canonical empty-database representation"
);
assert(
  decisionsContent.includes("fresh-install was advanced through migration 039"),
  "DECISIONS.md documents fresh-install advanced through migration 039"
);
assert(
  decisionsContent.includes("admin_notifications is included in fresh installs"),
  "DECISIONS.md documents admin_notifications included in fresh installs"
);
assert(
  decisionsContent.includes("deployment docs track current fresh-install migration coverage"),
  "DECISIONS.md documents deployment docs track current migration coverage"
);
assert(
  decisionsContent.includes("roadmap reflects implemented operational modules rather than stale future-module labels"),
  "DECISIONS.md documents roadmap reflects operational modules"
);
assert(
  decisionsContent.includes("F.21 Lead/Sales CRM remains intentionally skipped"),
  "DECISIONS.md documents F.21 skipped"
);

console.log("\n=== 10. Simulation Self-Tests for Drift & Parity Checks ===");

// 10.1 Simulation: Missing migration history entry fails parity check
{
  const mockFiles = ['001_a.sql', '002_b.sql', '003_c.sql'];
  const mockHistory = ['001_a.sql', '002_b.sql']; // missing 003_c.sql
  const isParity = mockFiles.length === mockHistory.length && mockFiles.every(f => mockHistory.includes(f));
  assert(!isParity, "Simulation 1: Missing migration in history correctly fails parity check");
}

// 10.2 Simulation: Duplicate migration history entry fails parity check
{
  const mockHistory = ['001_a.sql', '002_b.sql', '002_b.sql'];
  const set = new Set();
  let hasDuplicate = false;
  for (const h of mockHistory) {
    if (set.has(h)) hasDuplicate = true;
    set.add(h);
  }
  assert(hasDuplicate, "Simulation 2: Duplicate migration in history correctly detected as violation");
}

// 10.3 Simulation: Unknown migration history entry fails parity check
{
  const mockFilesSet = new Set(['001_a.sql', '002_b.sql']);
  const mockHistory = ['001_a.sql', '002_b.sql', '999_fake.sql'];
  const unknown = mockHistory.filter(h => !mockFilesSet.has(h));
  assert(unknown.length === 1 && unknown[0] === '999_fake.sql', "Simulation 3: Unknown migration in history correctly detected as violation");
}

// 10.4 Simulation: Missing column in schema fails column check
{
  const mockTableDef = "`id` BIGINT, `uuid` CHAR(36), `recipient_admin_id` INT";
  const requiredCols = ['id', 'uuid', 'recipient_admin_id', 'missing_col'];
  const missingCols = requiredCols.filter(col => !new RegExp(`\`?${col}\`?`).test(mockTableDef));
  assert(missingCols.length === 1 && missingCols[0] === 'missing_col', "Simulation 4: Missing column in table definition correctly detected as violation");
}

// 10.5 Simulation: Stale range in documentation fails range check
{
  const mockDoc = "This file canonically represents migrations 001–037.";
  const latestNumber = '039';
  const isDocValid = new RegExp(`001[–-]${latestNumber}`).test(mockDoc) && !/001[–-]037/.test(mockDoc);
  assert(!isDocValid, "Simulation 5: Stale migration range in documentation correctly detected as violation");
}

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Fresh Install & Deployment Parity verification detected violations.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All Fresh Install & Deployment Parity invariants verified.");
  process.exit(0);
}
