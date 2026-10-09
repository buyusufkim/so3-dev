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

console.log("=== 1. Package.json Script Registration ===");
const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:community-updates-foundation"] === "node scripts/verify-community-updates-foundation.mjs",
  "Package.json exact registration: 'verify:community-updates-foundation' === 'node scripts/verify-community-updates-foundation.mjs'"
);

console.log("\n=== 2. Database Migration 044 Invariants ===");
const migrationPath = path.resolve(process.cwd(), 'database/migrations/044_create_community_updates.sql');
assert(fs.existsSync(migrationPath), "044_create_community_updates.sql exists in database/migrations");
const migContent = fs.readFileSync(migrationPath, 'utf8');

assert(
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?community_updates`?/i.test(migContent),
  "Migration 044 creates `community_updates` table"
);

const expectedColumns = [
  'id',
  'uuid',
  'title',
  'body',
  'status',
  'published_at',
  'created_by_admin_id',
  'updated_by_admin_id',
  'created_at',
  'updated_at',
  'deleted_at'
];

for (const col of expectedColumns) {
  assert(
    new RegExp(`\`?${col}\`?\\s+`, 'i').test(migContent),
    `Migration 044 contains column '${col}'`
  );
}

assert(
  /ENUM\s*\(\s*'draft'\s*,\s*'published'\s*\)/i.test(migContent),
  "Migration 044 status column is ENUM('draft', 'published')"
);
assert(
  /DEFAULT\s+'draft'/i.test(migContent),
  "Migration 044 status defaults to 'draft'"
);
assert(
  /VARCHAR\(160\)/i.test(migContent),
  "Migration 044 title column is VARCHAR(160)"
);
assert(
  /`?body`?\s+TEXT/i.test(migContent),
  "Migration 044 body column is TEXT"
);
assert(
  /FOREIGN\s+KEY\s*\(`?created_by_admin_id`?\)\s+REFERENCES\s+`?admins`?\s*\(`?id`?\)/i.test(migContent),
  "Migration 044 has FK on created_by_admin_id referencing admins(id)"
);
assert(
  /FOREIGN\s+KEY\s*\(`?updated_by_admin_id`?\)\s+REFERENCES\s+`?admins`?\s*\(`?id`?\)/i.test(migContent),
  "Migration 044 has FK on updated_by_admin_id referencing admins(id)"
);
assert(
  /idx_community_updates_status_pub_del_id/i.test(migContent),
  "Migration 044 defines index on status, published_at, deleted_at, id"
);
assert(
  /idx_community_updates_deleted_id/i.test(migContent),
  "Migration 044 defines index on deleted_at, id"
);

console.log("\n=== 3. Fresh Install Parity for Migration 044 ===");
const freshInstallPath = path.resolve(process.cwd(), 'database/fresh-install.sql');
assert(fs.existsSync(freshInstallPath), "database/fresh-install.sql exists");
const freshContent = fs.readFileSync(freshInstallPath, 'utf8');

assert(
  /Generated from migrations 001-044/i.test(freshContent),
  "fresh-install.sql header reflects range 001-044"
);
assert(
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?community_updates`?/i.test(freshContent),
  "fresh-install.sql creates `community_updates` table"
);
assert(
  /'044_create_community_updates\.sql'/i.test(freshContent),
  "fresh-install.sql records '044_create_community_updates.sql' in schema_migrations"
);

console.log("\n=== 4. Deployment Documentation Parity ===");
const deployDocPath = path.resolve(process.cwd(), 'DEPLOYMENT_PHP_MYSQL.md');
assert(fs.existsSync(deployDocPath), "DEPLOYMENT_PHP_MYSQL.md exists");
const deployContent = fs.readFileSync(deployDocPath, 'utf8');

assert(
  /migrations\s+001[–-]044/i.test(deployContent),
  "DEPLOYMENT_PHP_MYSQL.md reflects migration range 001–044"
);

console.log("\n=== 5. Router Verification in api/index.php ===");
const indexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(indexPath), "api/index.php exists");
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Admin routes
assert(
  indexContent.includes('/api/admin/community/updates'),
  "Router defines /api/admin/community/updates route"
);
assert(
  indexContent.includes('#^/api/admin/community/updates/([1-9]\\d*)$#'),
  "Router defines regex for /api/admin/community/updates/{id} requiring positive ID without leading zero"
);
assert(
  indexContent.includes('AdminCommunityUpdateController'),
  "Router invokes AdminCommunityUpdateController for admin routes"
);

// Member routes
assert(
  indexContent.includes('/api/member/community/updates'),
  "Router defines /api/member/community/updates route"
);
assert(
  indexContent.includes('#^/api/member/community/updates/([1-9]\\d*)$#'),
  "Router defines regex for /api/member/community/updates/{id} requiring positive ID without leading zero"
);
assert(
  indexContent.includes('MemberCommunityUpdateController'),
  "Router invokes MemberCommunityUpdateController for member routes"
);

// Role guard check for admin
assert(
  indexContent.includes("AuthMiddleware::hasRole(['super_admin', 'admin', 'editor'])"),
  "Admin community routes require super_admin, admin, or editor"
);

console.log("\n=== 6. Admin Controller Invariants ===");
const adminCtrlPath = path.resolve(process.cwd(), 'api/controllers/AdminCommunityUpdateController.php');
assert(fs.existsSync(adminCtrlPath), "AdminCommunityUpdateController.php exists");
const adminCtrlContent = fs.readFileSync(adminCtrlPath, 'utf8');

assert(
  adminCtrlContent.includes("namespace Controllers;"),
  "AdminCommunityUpdateController has Controllers namespace"
);
assert(
  adminCtrlContent.includes("AuthMiddleware::hasRole(['super_admin', 'admin', 'editor'])"),
  "Admin controller methods enforce role guard"
);
assert(
  adminCtrlContent.includes("AuditLogger::log('community_update.create'"),
  "Admin controller logs community_update.create audit event"
);
assert(
  adminCtrlContent.includes("AuditLogger::log('community_update.update'"),
  "Admin controller logs community_update.update audit event"
);
assert(
  adminCtrlContent.includes("AuditLogger::log('community_update.delete'"),
  "Admin controller logs community_update.delete audit event"
);
assert(
  adminCtrlContent.includes("deleted_at = NOW()"),
  "Admin destroy method implements soft-delete"
);
assert(
  adminCtrlContent.includes("beginTransaction") && adminCtrlContent.includes("commit") && adminCtrlContent.includes("rollBack"),
  "Admin mutations use atomic transactions"
);
assert(
  !adminCtrlContent.includes("comments") && !adminCtrlContent.includes("likes"),
  "Admin controller anti-scope: zero comments or likes"
);

console.log("\n=== 7. Member Controller Invariants ===");
const memberCtrlPath = path.resolve(process.cwd(), 'api/controllers/MemberCommunityUpdateController.php');
assert(fs.existsSync(memberCtrlPath), "MemberCommunityUpdateController.php exists");
const memberCtrlContent = fs.readFileSync(memberCtrlPath, 'utf8');

assert(
  memberCtrlContent.includes("namespace Controllers;"),
  "MemberCommunityUpdateController has Controllers namespace"
);
assert(
  memberCtrlContent.includes("MemberAuthMiddleware::handle()"),
  "Member controller invokes MemberAuthMiddleware"
);
assert(
  memberCtrlContent.includes("must_change_password"),
  "Member controller guards against pending password changes"
);
assert(
  memberCtrlContent.includes("status = 'published'") && memberCtrlContent.includes("published_at IS NOT NULL"),
  "Member controller queries strictly published records"
);
assert(
  memberCtrlContent.includes("deleted_at IS NULL"),
  "Member controller ignores soft-deleted updates"
);
assert(
  !memberCtrlContent.includes("created_by_admin_id") && !memberCtrlContent.includes("creator_display_name") && !memberCtrlContent.includes("updated_by_admin_id"),
  "Member controller does NOT expose admin/author internal IDs or names"
);
assert(
  !memberCtrlContent.includes("INSERT") && !memberCtrlContent.includes("UPDATE") && !memberCtrlContent.includes("DELETE"),
  "Member controller is strictly read-only (zero mutation SQL)"
);
assert(
  !memberCtrlContent.includes("comments") && !memberCtrlContent.includes("likes") && !memberCtrlContent.includes("reactions"),
  "Member controller anti-scope: zero comments, likes, reactions"
);

console.log("\n=== 8. Anti-Scope Architectural Hygiene Guard ===");
const forbiddenKeywords = [
  'community_comments',
  'community_likes',
  'community_reactions',
  'community_followers',
  'moderation_queue'
];

for (const kw of forbiddenKeywords) {
  assert(!migContent.includes(kw), `Migration does not mention forbidden anti-scope feature: ${kw}`);
  assert(!indexContent.includes(kw), `api/index.php does not mention forbidden anti-scope feature: ${kw}`);
  assert(!adminCtrlContent.includes(kw), `Admin controller does not mention forbidden anti-scope feature: ${kw}`);
  assert(!memberCtrlContent.includes(kw), `Member controller does not mention forbidden anti-scope feature: ${kw}`);
}

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Community Updates Foundation verification detected violations.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All Community Updates Foundation invariants verified.");
  process.exit(0);
}
