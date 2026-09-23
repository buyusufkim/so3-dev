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

function extractBraceBlock(text, startKeyword) {
  const startIndex = text.indexOf(startKeyword);
  if (startIndex === -1) return null;
  let braceStartIndex = text.indexOf('{', startIndex);
  if (braceStartIndex === -1) return null;
  let depth = 1;
  let i = braceStartIndex + 1;
  let insideString = false;
  let quoteChar = null;

  while (i < text.length && depth > 0) {
    const char = text[i];
    if (!insideString) {
      if (char === "'" || char === '"' || char === '`') {
        insideString = true;
        quoteChar = char;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
      } else if (char === '/' && i + 1 < text.length) {
        if (text[i + 1] === '/') {
          while (i < text.length && text[i] !== '\n') i++;
          continue;
        } else if (text[i + 1] === '*') {
          while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
          i++;
          continue;
        }
      }
    } else {
      if (char === '\\') {
        i++;
      } else if (char === quoteChar) {
        insideString = false;
      }
    }
    i++;
  }
  return { content: text.substring(startIndex, i), startIndex, endIndex: i };
}

console.log("=== 1. Chaining Authoritative Verifiers ===");

// 1.1 Chain F.20A Authority
try {
  console.log("Running verify:renewal-watch-read-model...");
  execSync('node scripts/verify-renewal-watch-read-model.mjs', { stdio: 'inherit' });
  assert(true, "Chain F.20A verify-renewal-watch-read-model.mjs passed successfully");
} catch (e) {
  assert(false, "Chain F.20A verify-renewal-watch-read-model.mjs failed");
}

// 1.2 Chain F.20C Authority
try {
  console.log("Running verify:admin-notification-foundation...");
  execSync('node scripts/verify-admin-notification-foundation.mjs', { stdio: 'inherit' });
  assert(true, "Chain F.20C verify-admin-notification-foundation.mjs passed successfully");
} catch (e) {
  assert(false, "Chain F.20C verify-admin-notification-foundation.mjs failed");
}

console.log("\n=== 2. Package.json Script Registration ===");

const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:renewal-notification-materializer"] === "node scripts/verify-renewal-notification-materializer.mjs",
  "Package.json exact script registration: 'verify:renewal-notification-materializer' === 'node scripts/verify-renewal-notification-materializer.mjs'"
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

console.log("\n=== 4. Negative Self-Tests & Invariant Simulations ===");

// 4.1 Recipient role filtering simulation
function isEligibleRecipient(role, status) {
  const allowedRoles = ['super_admin', 'admin', 'reception'];
  return status === 'active' && allowedRoles.includes(role);
}
assert(isEligibleRecipient('super_admin', 'active') === true, "Self-test: super_admin active is eligible");
assert(isEligibleRecipient('admin', 'active') === true, "Self-test: admin active is eligible");
assert(isEligibleRecipient('reception', 'active') === true, "Self-test: reception active is eligible");
assert(isEligibleRecipient('trainer', 'active') === false, "Self-test: trainer is NOT eligible");
assert(isEligibleRecipient('editor', 'active') === false, "Self-test: editor is NOT eligible");
assert(isEligibleRecipient('admin', 'inactive') === false, "Self-test: inactive admin is NOT eligible");

// 4.2 Member candidate eligibility simulation
function isEligibleCandidate(member, todayStr, windowEndStr) {
  if (member.deleted_at !== null) return false;
  if (member.status !== 'active') return false;
  if (!member.membership_end_date) return false;
  return member.membership_end_date <= windowEndStr;
}
assert(isEligibleCandidate({ deleted_at: null, status: 'active', membership_end_date: '2026-09-20' }, '2026-09-23', '2026-10-07') === true, "Self-test: Active expired candidate eligible");
assert(isEligibleCandidate({ deleted_at: '2026-09-01', status: 'active', membership_end_date: '2026-09-20' }, '2026-09-23', '2026-10-07') === false, "Self-test: Deleted candidate rejected");
assert(isEligibleCandidate({ deleted_at: null, status: 'frozen', membership_end_date: '2026-09-20' }, '2026-09-23', '2026-10-07') === false, "Self-test: Inactive candidate rejected");
assert(isEligibleCandidate({ deleted_at: null, status: 'active', membership_end_date: null }, '2026-09-23', '2026-10-07') === false, "Self-test: Null end date candidate rejected");
assert(isEligibleCandidate({ deleted_at: null, status: 'active', membership_end_date: '2026-10-20' }, '2026-09-23', '2026-10-07') === false, "Self-test: Out of window candidate rejected");

// 4.3 Source key structure simulation
function generateSourceKey(memberId, endDate, stage) {
  return `membership-renewal:${memberId}:${endDate}:${stage}`;
}
const validKey = generateSourceKey(42, '2026-10-01', 'upcoming');
assert(validKey === "membership-renewal:42:2026-10-01:upcoming", "Self-test: Generates correct canonical source key");
assert(!/:\d+-days/.test(validKey) && !/:\d+$/.test(validKey), "Self-test: Source key does not contain countdown days");

// 4.4 Deduplication safety simulation
function testDedupeStrategy(sql) {
  if (/REPLACE\s+INTO/i.test(sql)) return false;
  if (/ON\s+DUPLICATE\s+KEY\s+UPDATE.*read_at\s*=/is.test(sql)) return false;
  if (/ON\s+DUPLICATE\s+KEY\s+UPDATE.*dismissed_at\s*=/is.test(sql)) return false;
  return /ON\s+DUPLICATE\s+KEY\s+UPDATE\s+id\s*=\s*id/i.test(sql);
}
assert(testDedupeStrategy("INSERT INTO admin_notifications (...) VALUES (...) ON DUPLICATE KEY UPDATE id = id") === true, "Self-test: Passes no-op duplicate strategy");
assert(testDedupeStrategy("REPLACE INTO admin_notifications (...) VALUES (...)") === false, "Self-test: Rejects REPLACE INTO");
assert(testDedupeStrategy("INSERT INTO admin_notifications (...) VALUES (...) ON DUPLICATE KEY UPDATE read_at = NULL") === false, "Self-test: Rejects read_at reset on duplicate");
assert(testDedupeStrategy("INSERT INTO admin_notifications (...) VALUES (...) ON DUPLICATE KEY UPDATE dismissed_at = NULL") === false, "Self-test: Rejects dismissed_at reset on duplicate");

console.log("\n=== 5. Routing Invariants in api/index.php ===");

const apiIndexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(apiIndexPath), "api/index.php exists");
const apiIndexSource = fs.readFileSync(apiIndexPath, 'utf8');

// Route check: POST /api/reception/renewal-notifications/materialize
const routeBlock = extractBraceBlock(apiIndexSource, "preg_match('#^/api/reception/renewal-notifications/materialize$#', $requestUri)");
assert(routeBlock !== null, "Route block for /api/reception/renewal-notifications/materialize found in api/index.php");
if (routeBlock) {
  const content = routeBlock.content;
  assert(content.includes("AuthMiddleware::hasRole"), "Route enforces AuthMiddleware::hasRole");
  assert(content.includes("'super_admin'"), "Role allowlist includes super_admin");
  assert(content.includes("'admin'"), "Role allowlist includes admin");
  assert(content.includes("'reception'"), "Role allowlist includes reception");
  assert(!content.includes("'trainer'"), "Role allowlist excludes trainer");
  assert(!content.includes("'editor'"), "Role allowlist excludes editor");
  assert(content.includes("$method === 'POST'"), "Route is strictly POST only");
  assert(!content.includes("$method === 'GET'"), "Route rejects GET");
  assert(!content.includes("$method === 'PATCH'"), "Route rejects PATCH");
  assert(!content.includes("$method === 'DELETE'"), "Route rejects DELETE");
  assert(content.includes("RenewalNotificationMaterializerController"), "Invokes RenewalNotificationMaterializerController");
  assert(content.includes("->materialize()"), "Invokes ->materialize() action");
}

// Side effect safety: GET routes must NOT trigger materialization
const renewalWatchBlock = extractBraceBlock(apiIndexSource, "preg_match('#^/api/reception/renewal-watch$#', $requestUri)");
if (renewalWatchBlock) {
  assert(!renewalWatchBlock.content.includes("RenewalNotificationMaterializerController"), "GET /api/reception/renewal-watch has NO materializer side effect");
}
const adminNotifBlock = extractBraceBlock(apiIndexSource, "preg_match('#^/api/admin/notifications$#', $requestUri)");
if (adminNotifBlock) {
  assert(!adminNotifBlock.content.includes("RenewalNotificationMaterializerController"), "GET /api/admin/notifications has NO materializer side effect");
}

// Generic create route forbidden
assert(!/POST.*\/api\/admin\/notifications(\/|\$|['"#])/i.test(apiIndexSource), "Still no generic POST /api/admin/notifications");

console.log("\n=== 6. Controller Implementation Invariants (RenewalNotificationMaterializerController.php) ===");

const controllerPath = path.resolve(process.cwd(), 'api/controllers/RenewalNotificationMaterializerController.php');
assert(fs.existsSync(controllerPath), "RenewalNotificationMaterializerController.php exists");
const controllerSource = fs.readFileSync(controllerPath, 'utf8');

assert(controllerSource.includes("namespace Controllers;"), "Controller uses namespace Controllers;");
assert(controllerSource.includes("class RenewalNotificationMaterializerController"), "Declares RenewalNotificationMaterializerController class");

// Method: materialize()
const materializeBlock = extractBraceBlock(controllerSource, "public function materialize()");
assert(materializeBlock !== null, "Extracted materialize() method block");

if (materializeBlock) {
  const content = materializeBlock.content;

  // JSON media type and empty body enforcement
  assert(content.includes("$this->validateEmptyJsonPayload()"), "materialize() invokes $this->validateEmptyJsonPayload()");

  // Business time authority: Europe/Istanbul
  assert(content.includes("new DateTimeZone('Europe/Istanbul')"), "Uses DateTimeZone('Europe/Istanbul')");
  assert(content.includes("new DateTimeImmutable"), "Uses DateTimeImmutable for business date");
  assert(!content.includes("CURDATE()"), "Does NOT use raw MySQL CURDATE() authority");

  // Fixed 14-day window
  assert(content.includes("$windowDays = 14;"), "Fixed window_days = 14");
  assert(!/\$_GET\s*\[\s*['"]window_days['"]\s*\]/.test(controllerSource), "Does NOT accept window_days from GET");
  assert(!/\$_(POST|REQUEST)\s*\[\s*['"]window_days['"]\s*\]/.test(controllerSource), "Does NOT accept window_days from POST");

  // Candidate member query
  assert(content.includes("FROM members"), "Queries from members table");
  assert(content.includes("deleted_at IS NULL"), "Candidate query filters deleted_at IS NULL");
  assert(content.includes("status = 'active'"), "Candidate query filters status = 'active'");
  assert(content.includes("membership_end_date IS NOT NULL"), "Candidate query filters membership_end_date IS NOT NULL");
  assert(content.includes("membership_end_date <= :window_end"), "Candidate query filters membership_end_date <= :window_end");

  // Recipient query
  assert(content.includes("FROM admins"), "Queries from admins table");
  assert(content.includes("role IN ('super_admin', 'admin', 'reception')"), "Recipient query filters role IN ('super_admin', 'admin', 'reception')");
  assert(!/role.*trainer/i.test(content), "Recipient query does not include trainer");
  assert(!/role.*editor/i.test(content), "Recipient query does not include editor");

  // Three lifecycle types
  assert(content.includes("'membership_renewal_upcoming'"), "Produces 'membership_renewal_upcoming'");
  assert(content.includes("'membership_renewal_today'"), "Produces 'membership_renewal_today'");
  assert(content.includes("'membership_renewal_expired'"), "Produces 'membership_renewal_expired'");

  // Severity mappings
  assert(content.includes("'info'"), "Maps upcoming to 'info'");
  assert(content.includes("'warning'"), "Maps today to 'warning'");
  assert(content.includes("'critical'"), "Maps expired to 'critical'");

  // Titles
  assert(content.includes("'Üyelik süresi yaklaşıyor'"), "Upcoming title: 'Üyelik süresi yaklaşıyor'");
  assert(content.includes("'Üyelik bugün sona eriyor'"), "Today title: 'Üyelik bugün sona eriyor'");
  assert(content.includes("'Üyelik süresi geçti'"), "Expired title: 'Üyelik süresi geçti'");

  // Source key structure
  assert(content.includes('membership-renewal:'), "Source key contains 'membership-renewal:' prefix");
  assert(!content.includes("today:upcoming"), "Source key does not concatenate today with stage");
  assert(!/membership-renewal:.*:\d+-days/.test(content), "Source key does not contain countdown days");

  // Entity link & action path
  assert(content.includes("':entity_type', 'member'"), "Sets entity_type = 'member'");
  assert(content.includes("':action_path', '/admin/reception'"), "Sets action_path = '/admin/reception'");

  // Insert & deduplication
  assert(content.includes("INSERT INTO admin_notifications"), "Inserts into admin_notifications");
  assert(content.includes("ON DUPLICATE KEY UPDATE id = id"), "Uses idempotent no-op duplicate strategy: ON DUPLICATE KEY UPDATE id = id");
  assert(!content.includes("REPLACE INTO"), "Does NOT use destructive REPLACE INTO");
  assert(!/ON DUPLICATE KEY UPDATE.*read_at/is.test(content), "Does NOT mutate read_at on duplicate");
  assert(!/ON DUPLICATE KEY UPDATE.*dismissed_at/is.test(content), "Does NOT mutate dismissed_at on duplicate");

  // Transaction
  assert(content.includes("$db->beginTransaction()"), "Uses $db->beginTransaction()");
  assert(content.includes("$db->commit()"), "Uses $db->commit()");
  assert(content.includes("$db->rollBack()"), "Uses $db->rollBack()");

  // Response shape
  const responseJsonBlock = extractBraceBlock(content, "Response::json(");
  assert(responseJsonBlock !== null, "Extracted Response::json payload block");
  if (responseJsonBlock) {
    const jsonContent = responseJsonBlock.content;
    assert(jsonContent.includes("'as_of_date'"), "Response includes as_of_date");
    assert(jsonContent.includes("'window_days'"), "Response includes window_days");
    assert(jsonContent.includes("'recipient_count'"), "Response includes recipient_count");
    assert(jsonContent.includes("'candidates'"), "Response includes candidates counts");
    assert(jsonContent.includes("'attempted_count'"), "Response includes attempted_count");
    assert(jsonContent.includes("'created_count'"), "Response includes created_count");
    assert(jsonContent.includes("'duplicate_count'"), "Response includes duplicate_count");
    assert(!jsonContent.includes("source_key"), "Response NEVER leaks source_key");
    assert(!jsonContent.includes("first_name") && !jsonContent.includes("last_name"), "Response NEVER leaks member names");
    assert(!jsonContent.includes("recipient_admin_id"), "Response NEVER leaks recipient IDs");
  }
}

// Payload validation helper
const helperBlock = extractBraceBlock(controllerSource, "private function validateEmptyJsonPayload()");
assert(helperBlock !== null, "Extracted validateEmptyJsonPayload() helper in materializer");
if (helperBlock) {
  const content = helperBlock.content;
  assert(content.includes("CONTENT_TYPE"), "Helper checks CONTENT_TYPE");
  assert(content.includes("application/json"), "Helper requires application/json");
  assert(content.includes("'UNSUPPORTED_MEDIA_TYPE', 415"), "Returns 415 UNSUPPORTED_MEDIA_TYPE");
  assert(content.includes("16384") && content.includes("'PAYLOAD_TOO_LARGE', 413"), "Guards 16KB payload limit with 413");
  assert(content.includes("'INVALID_JSON', 400"), "Returns 400 INVALID_JSON on malformed JSON");
  assert(content.includes("!empty($_GET)"), "Rejects query parameters with 422");
  assert(content.includes("count(get_object_vars($decoded)) !== 0"), "Enforces empty JSON object {}");
}

// UUID generator
const uuidBlock = extractBraceBlock(controllerSource, "private function generateUuid()");
assert(uuidBlock !== null, "Extracted generateUuid() helper in materializer");
if (uuidBlock) {
  const content = uuidBlock.content;
  assert(content.includes("random_bytes(16)"), "generateUuid uses random_bytes(16)");
  assert(content.includes("0x40") && content.includes("0x80"), "generateUuid conforms to RFC 4122 v4");
}

// Prohibitions: No member mutation, no notification user state mutation, no audit spam, no delivery channels
assert(!/UPDATE\s+members/i.test(controllerSource), "Does NOT update members");
assert(!/INSERT\s+INTO\s+membership_renewals/i.test(controllerSource), "Does NOT insert into membership_renewals");
assert(!/DELETE\s+FROM\s+members/i.test(controllerSource), "Does NOT delete members");
assert(!/UPDATE\s+admin_notifications\s+SET\s+(read_at|dismissed_at)/i.test(controllerSource), "Does NOT update notification user state");
assert(!controllerSource.includes("AuditLogger::log"), "Does NOT write to AuditLogger");
assert(!/\bmail\s*\(/i.test(controllerSource), "No mail() channel");
assert(!/SMTP|WhatsApp|FCM|Twilio/i.test(controllerSource), "No external notification delivery channels");

console.log("\n=== 7. DECISIONS.md Documentation Invariants ===");

const decisionsPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decisionsPath), "DECISIONS.md exists");
const decisionsSource = fs.readFileSync(decisionsPath, 'utf8');

assert(
  decisionsSource.includes("## F.20D Renewal Notification Materializer"),
  "DECISIONS.md contains '## F.20D Renewal Notification Materializer' section"
);
assert(decisionsSource.includes("renewal notifications are trusted server-generated events"), "Documents server-generated event nature");
assert(decisionsSource.includes("materialization uses explicit POST boundary, never GET side effects"), "Documents POST-only boundary");
assert(decisionsSource.includes("eligible members mirror F.20A active/non-deleted/end-date rules"), "Documents candidate eligibility parity with F.20A");
assert(decisionsSource.includes("fixed 14-day window"), "Documents fixed 14-day window");
assert(decisionsSource.includes("eligible recipients are active super_admin/admin/reception accounts"), "Documents recipient eligibility");
assert(decisionsSource.includes("upcoming/today/expired are separate lifecycle event types"), "Documents 3 stage lifecycle types");
assert(decisionsSource.includes("source key includes member + expiry date + lifecycle stage"), "Documents stage-based source key");
assert(decisionsSource.includes("unique recipient + source key is concurrency/idempotency authority"), "Documents unique constraint authority");
assert(decisionsSource.includes("duplicate materialization never resets read/dismiss state"), "Documents state preservation on dedupe");
assert(decisionsSource.includes("no generic client notification creation route"), "Documents absence of generic notification create route");
assert(decisionsSource.includes("no frontend trigger, cron, or external delivery in F.20D"), "Documents absence of frontend/cron/delivery in F.20D");

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Renewal Notification Materializer verification detected violations.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All Renewal Notification Materializer invariants verified.");
  process.exit(0);
}
