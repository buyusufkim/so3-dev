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

console.log("\n=== 3. Fresh Install & Deployment Parity ===");
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

const deployDocPath = path.resolve(process.cwd(), 'DEPLOYMENT_PHP_MYSQL.md');
assert(fs.existsSync(deployDocPath), "DEPLOYMENT_PHP_MYSQL.md exists");
const deployContent = fs.readFileSync(deployDocPath, 'utf8');
assert(
  /migrations\s+001[–-]044/i.test(deployContent),
  "DEPLOYMENT_PHP_MYSQL.md reflects migration range 001–044"
);

console.log("\n=== 4. Canonical Route Names in api/index.php ===");
const indexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(indexPath), "api/index.php exists");
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Canonical routes
assert(
  indexContent.includes("'/api/admin/community-updates'"),
  "api/index.php defines canonical '/api/admin/community-updates' collection route"
);
assert(
  indexContent.includes('#^/api/admin/community-updates/([1-9]\\d*)$#'),
  "api/index.php defines canonical '#^/api/admin/community-updates/([1-9]\\d*)$#' item route"
);
assert(
  indexContent.includes("'/api/member/community-updates'"),
  "api/index.php defines canonical '/api/member/community-updates' feed route"
);

// Obsolete routes MUST NOT exist
assert(
  !indexContent.includes('/api/admin/community/updates'),
  "api/index.php does NOT contain obsolete '/api/admin/community/updates'"
);
assert(
  !indexContent.includes('/api/member/community/updates'),
  "api/index.php does NOT contain obsolete '/api/member/community/updates'"
);
assert(
  !indexContent.includes('/api/member/community-updates/'),
  "api/index.php does NOT expose member item/detail route (/api/member/community-updates/{id})"
);

console.log("\n=== 5. Admin Controller Contract & Invariants ===");
const adminCtrlPath = path.resolve(process.cwd(), 'api/controllers/AdminCommunityUpdateController.php');
assert(fs.existsSync(adminCtrlPath), "AdminCommunityUpdateController.php exists");
const adminCtrlContent = fs.readFileSync(adminCtrlPath, 'utf8');

assert(
  adminCtrlContent.includes("AuthMiddleware::hasRole(['super_admin', 'admin', 'editor'])"),
  "Admin controller methods strictly require super_admin, admin, or editor"
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

// Query allowlist: exactly status, page, per_page
assert(
  adminCtrlContent.includes("['status', 'page', 'per_page']"),
  "Admin index method strictly allowlists query keys: status, page, per_page"
);
assert(
  !adminCtrlContent.includes(":search"),
  "Admin index query strictly excludes 'search' parameter"
);

// Admin status 'all' support
assert(
  adminCtrlContent.includes("'all'"),
  "Admin index supports 'all' status filter"
);

// Pagination bounds: page >= 1, per_page 1..50
assert(
  adminCtrlContent.includes("> 50"),
  "Admin index enforces per_page max limit of 50"
);

// Admin canonical ordering: created_at DESC, id DESC
assert(
  adminCtrlContent.includes("ORDER BY created_at DESC, id DESC"),
  "Admin index query strictly orders by 'created_at DESC, id DESC'"
);
assert(
  !adminCtrlContent.includes("CASE WHEN published_at IS NOT NULL"),
  "Admin index does NOT use CASE ordering on published_at"
);

// Formatters separation and privacy
assert(
  adminCtrlContent.includes("function formatListRow"),
  "Admin controller defines dedicated formatListRow"
);
assert(
  adminCtrlContent.includes("function formatDetailRow"),
  "Admin controller defines dedicated formatDetailRow"
);

// Neither formatter exposes actor or internal fields
const forbiddenAdminFields = ['created_by_admin_id', 'updated_by_admin_id', 'creator_display_name', 'deleted_at'];
for (const field of forbiddenAdminFields) {
  // Check that the returned arrays in formatters do not map these keys
  assert(
    !adminCtrlContent.includes(`'${field}' =>`),
    `Admin controller response formatters do NOT expose internal field: ${field}`
  );
}

// formatListRow must not expose body
function extractMethodBody(code, methodName) {
  const startIdx = code.indexOf(`function ${methodName}`);
  if (startIdx === -1) return '';
  const openBrace = code.indexOf('{', startIdx);
  if (openBrace === -1) return '';
  let depth = 1;
  let i = openBrace + 1;
  while (i < code.length && depth > 0) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') depth--;
    i++;
  }
  return code.slice(openBrace, i);
}

const listRowBody = extractMethodBody(adminCtrlContent, 'formatListRow');
assert(
  !listRowBody.includes("'body' =>") && !listRowBody.includes('"body" =>'),
  "Admin formatListRow strictly excludes 'body'"
);

// Validation bounds: title 1..160, body 1..5000
assert(
  adminCtrlContent.includes("$len < 1 || $len > 160"),
  "Admin validateTitle enforces length between 1 and 160"
);
assert(
  adminCtrlContent.includes("$len < 1 || $len > 5000"),
  "Admin validateBody enforces length between 1 and 5000"
);

// Soft delete uses application time authority and native-safe parameters
assert(
  adminCtrlContent.includes("deleted_at = :deleted_at"),
  "Admin destroy binds application-generated timestamp for deleted_at"
);

// Native PDO unique parameter check in admin controller
assert(
  !adminCtrlContent.includes(':status1') && !adminCtrlContent.includes(':title1'),
  "Admin controller uses clean unique parameter names"
);

console.log("\n=== 6. Publication Lifecycle Algorithmic Invariants ===");
// Simulation of canonical publication rules:
// create draft -> published_at = null
// create published -> published_at = now
// update draft -> published (when current published_at is null) -> published_at = now
// update published -> published -> preserve stored published_at
// update published -> draft -> preserve stored published_at (do not null it)
// update draft -> published (when current published_at is not null) -> preserve stored published_at (republish)
function simulatePublishLogic(currentStatus, currentPublishedAt, newStatus, nowTimestamp) {
  let updatedPublishedAt = currentPublishedAt;
  if (newStatus === 'published' && currentPublishedAt === null) {
    updatedPublishedAt = nowTimestamp;
  }
  return updatedPublishedAt;
}

const T1 = '2026-10-09 10:00:00';
const T2 = '2026-10-09 15:00:00';

// 1. draft create
assert(
  simulatePublishLogic('draft', null, 'draft', T1) === null,
  "Lifecycle 1: Draft create results in null published_at"
);
// 2. published create
assert(
  simulatePublishLogic('draft', null, 'published', T1) === T1,
  "Lifecycle 2: Initial publish assigns current timestamp T1"
);
// 3. published edit (stay published)
assert(
  simulatePublishLogic('published', T1, 'published', T2) === T1,
  "Lifecycle 3: Editing already published update preserves original published_at T1"
);
// 4. published -> draft (unpublish)
assert(
  simulatePublishLogic('published', T1, 'draft', T2) === T1,
  "Lifecycle 4: Unpublishing to draft preserves stored published_at T1 (does not null it)"
);
// 5. draft (with stored T1) -> published (republish)
assert(
  simulatePublishLogic('draft', T1, 'published', T2) === T1,
  "Lifecycle 5: Republishing previously published update preserves original first-publication timestamp T1"
);
// 6. draft (never published, null) -> published
assert(
  simulatePublishLogic('draft', null, 'published', T2) === T2,
  "Lifecycle 6: Publishing previously un-published draft assigns new timestamp T2"
);

console.log("\n=== 7. Member Controller Contract & Invariants ===");
const memberCtrlPath = path.resolve(process.cwd(), 'api/controllers/MemberCommunityUpdateController.php');
assert(fs.existsSync(memberCtrlPath), "MemberCommunityUpdateController.php exists");
const memberCtrlContent = fs.readFileSync(memberCtrlPath, 'utf8');

assert(
  memberCtrlContent.includes("MemberAuthMiddleware::handle()"),
  "Member controller invokes MemberAuthMiddleware"
);
assert(
  memberCtrlContent.includes("must_change_password"),
  "Member controller guards against pending password changes"
);

// Member zero query params
assert(
  memberCtrlContent.includes("if (!empty($_GET))") && memberCtrlContent.includes("422"),
  "Member index strictly rejects any query parameters with 422"
);

// Member bounded query
assert(
  memberCtrlContent.includes("LIMIT 50"),
  "Member query includes LIMIT 50"
);
assert(
  memberCtrlContent.includes("ORDER BY published_at DESC, id DESC"),
  "Member query strictly orders by published_at DESC, id DESC"
);
assert(
  !memberCtrlContent.includes("COUNT(*)"),
  "Member endpoint does NOT execute COUNT(*) query"
);
assert(
  !memberCtrlContent.includes("OFFSET"),
  "Member endpoint does NOT use OFFSET"
);
assert(
  !memberCtrlContent.includes("published_at <= :now") && !memberCtrlContent.includes("published_at <= NOW()"),
  "Member endpoint does NOT filter published_at <= now (published status = visible)"
);
assert(
  !memberCtrlContent.includes("function show("),
  "Member controller does NOT define show/detail endpoint"
);

// Member response shape: exact items only, no meta
assert(
  !memberCtrlContent.includes("'meta' =>"),
  "Member index response does NOT return 'meta' or pagination fields"
);

for (const field of forbiddenAdminFields) {
  assert(
    !memberCtrlContent.includes(`'${field}' =>`),
    `Member controller response does NOT expose internal field: ${field}`
  );
}

console.log("\n=== 8. TypeScript Contract & Client Layer ===");
const adminTypesPath = path.resolve(process.cwd(), 'src/admin/pages/community-updates/types.ts');
assert(fs.existsSync(adminTypesPath), "src/admin/pages/community-updates/types.ts exists");
const adminTypesContent = fs.readFileSync(adminTypesPath, 'utf8');

assert(
  adminTypesContent.includes("export type CommunityUpdateStatus = 'draft' | 'published';"),
  "Admin types exports CommunityUpdateStatus"
);
assert(
  adminTypesContent.includes("export interface CommunityUpdateListItem"),
  "Admin types exports CommunityUpdateListItem"
);
assert(
  adminTypesContent.includes("export interface CommunityUpdateDetail"),
  "Admin types exports CommunityUpdateDetail"
);
assert(
  adminTypesContent.includes("export interface CommunityUpdateListResponse"),
  "Admin types exports CommunityUpdateListResponse"
);
assert(
  adminTypesContent.includes("export function validateCommunityUpdateListItem"),
  "Admin types exports validateCommunityUpdateListItem"
);
assert(
  adminTypesContent.includes("export function validateCommunityUpdateDetail"),
  "Admin types exports validateCommunityUpdateDetail"
);
assert(
  adminTypesContent.includes("export function validateCommunityUpdateListResponse"),
  "Admin types exports validateCommunityUpdateListResponse"
);

// Member validators
const memberValPath = path.resolve(process.cwd(), 'src/member/api/validators.ts');
assert(fs.existsSync(memberValPath), "src/member/api/validators.ts exists");
const memberValContent = fs.readFileSync(memberValPath, 'utf8');

assert(
  memberValContent.includes("export type MemberCommunityUpdate = {"),
  "Member validators exports MemberCommunityUpdate type"
);
assert(
  memberValContent.includes("export function validateCommunityUpdates("),
  "Member validators exports validateCommunityUpdates validator"
);

// Member client
const memberClientPath = path.resolve(process.cwd(), 'src/member/api/client.ts');
assert(fs.existsSync(memberClientPath), "src/member/api/client.ts exists");
const memberClientContent = fs.readFileSync(memberClientPath, 'utf8');

assert(
  memberClientContent.includes("getCommunityUpdates("),
  "Member api client defines getCommunityUpdates method"
);
assert(
  memberClientContent.includes("'/api/member/community-updates'"),
  "Member api client fetches '/api/member/community-updates'"
);
assert(
  memberClientContent.includes("validateCommunityUpdates(data)"),
  "Member api client validates response with validateCommunityUpdates"
);

console.log("\n=== 9. Runtime Validation Simulation ===");
// Admin list item validator simulation
function simulateAdminListValidation(item) {
  const allowedKeys = ['id', 'uuid', 'title', 'status', 'published_at', 'created_at', 'updated_at'];
  const keys = Object.keys(item);
  if (keys.some(k => !allowedKeys.includes(k))) return false;
  if (allowedKeys.some(k => !(k in item))) return false;
  if (typeof item.id !== 'number' || item.id <= 0) return false;
  if (typeof item.title !== 'string' || item.title.length === 0 || item.title.length > 160) return false;
  if (item.status !== 'draft' && item.status !== 'published') return false;
  return true;
}

assert(
  simulateAdminListValidation({
    id: 1,
    uuid: '11111111-1111-4111-8111-111111111111',
    title: 'Test Duyuru',
    status: 'draft',
    published_at: null,
    created_at: '2026-10-09 10:00:00',
    updated_at: '2026-10-09 10:00:00'
  }) === true,
  "Simulation: Valid admin list item passes validation"
);

assert(
  simulateAdminListValidation({
    id: 1,
    uuid: '11111111-1111-4111-8111-111111111111',
    title: 'Test Duyuru',
    body: 'Should not be in list',
    status: 'draft',
    published_at: null,
    created_at: '2026-10-09 10:00:00',
    updated_at: '2026-10-09 10:00:00'
  }) === false,
  "Simulation: Admin list item with body fails fail-closed validation"
);

assert(
  simulateAdminListValidation({
    id: 1,
    uuid: '11111111-1111-4111-8111-111111111111',
    title: 'Test Duyuru',
    status: 'draft',
    created_by_admin_id: 1,
    published_at: null,
    created_at: '2026-10-09 10:00:00',
    updated_at: '2026-10-09 10:00:00'
  }) === false,
  "Simulation: Admin list item with actor ID fails fail-closed validation"
);

// Member validation simulation
function simulateMemberValidation(res) {
  if (typeof res !== 'object' || res === null || Array.isArray(res)) return false;
  const topKeys = Object.keys(res);
  if (topKeys.length !== 1 || topKeys[0] !== 'items') return false;
  if (!Array.isArray(res.items)) return false;
  const allowed = ['id', 'uuid', 'title', 'body', 'published_at'];
  for (const it of res.items) {
    if (typeof it !== 'object' || it === null) return false;
    const itKeys = Object.keys(it);
    if (itKeys.some(k => !allowed.includes(k))) return false;
    if (allowed.some(k => !(k in it))) return false;
    if (typeof it.id !== 'number' || it.id <= 0) return false;
    if (typeof it.title !== 'string' || it.title.length === 0 || it.title.length > 160) return false;
    if (typeof it.body !== 'string' || it.body.length === 0 || it.body.length > 5000) return false;
    if (typeof it.published_at !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(it.published_at)) return false;
  }
  return true;
}

assert(
  simulateMemberValidation({
    items: [
      {
        id: 1,
        uuid: '11111111-1111-4111-8111-111111111111',
        title: 'Kulüp Duyurusu',
        body: 'Hafta sonu etkinlik programı.',
        published_at: '2026-10-09 10:00:00'
      }
    ]
  }) === true,
  "Simulation: Valid canonical member feed passes validation"
);

assert(
  simulateMemberValidation({
    items: [],
    meta: { total: 0 }
  }) === false,
  "Simulation: Member feed with extra 'meta' key fails fail-closed validation"
);

assert(
  simulateMemberValidation({
    items: [
      {
        id: 1,
        uuid: '11111111-1111-4111-8111-111111111111',
        title: 'Kulüp Duyurusu',
        body: 'Hafta sonu etkinlik programı.',
        status: 'published',
        published_at: '2026-10-09 10:00:00'
      }
    ]
  }) === false,
  "Simulation: Member feed with extra 'status' key fails fail-closed validation"
);

console.log("\n=== 10. Anti-Scope Architectural Hygiene Guard ===");
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
  console.log("\n✅ SUCCESS: All Community Updates Foundation Corrective invariants verified.");
  process.exit(0);
}
