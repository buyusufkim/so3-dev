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

console.log("=== 1. Self-Tests & Negative Invariant Tests ===");

// Negative test 1: SQL query without recipient isolation
function testRecipientIsolation(sql) {
  return /recipient_admin_id\s*=\s*:admin_id/i.test(sql);
}
assert(
  testRecipientIsolation("UPDATE admin_notifications SET read_at = NOW() WHERE id = :id") === false,
  "Self-test: Correctly fails SQL update without recipient_admin_id"
);
assert(
  testRecipientIsolation("UPDATE admin_notifications SET read_at = NOW() WHERE id = :id AND recipient_admin_id = :admin_id") === true,
  "Self-test: Passes SQL update with recipient_admin_id"
);

// Negative test 2: Exposed internal fields
function testExposedInternalFields(code) {
  return /['"](recipient_admin_id|source_key)['"]\s*=>/.test(code);
}
assert(
  testExposedInternalFields("'recipient_admin_id' => $row['recipient_admin_id']") === true,
  "Self-test: Detects exposure of recipient_admin_id"
);
assert(
  testExposedInternalFields("'source_key' => $row['source_key']") === true,
  "Self-test: Detects exposure of source_key"
);
assert(
  testExposedInternalFields("'title' => (string)$row['title']") === false,
  "Self-test: Passes safe projection"
);

// Negative test 3: Forbidden notification routes (create, delete, restore, unread)
function testForbiddenRoutes(code) {
  const isPost = /(POST|'POST'|"POST").*\/api\/admin\/notifications(\/|\$|['"#])|\/api\/admin\/notifications.*(POST|'POST'|"POST")/s.test(code);
  const isDelete = /(DELETE|'DELETE'|"DELETE").*\/api\/admin\/notifications|\/api\/admin\/notifications.*(DELETE|'DELETE'|"DELETE")/s.test(code);
  const isRestore = /\/api\/admin\/notifications\/.*\/restore/.test(code);
  const isUnread = /\/api\/admin\/notifications\/.*\/unread/.test(code);
  return isPost || isDelete || isRestore || isUnread;
}
assert(
  testForbiddenRoutes("if (preg_match('#^/api/admin/notifications$#', $requestUri) && $method === 'POST')") === true,
  "Self-test: Detects forbidden POST create route"
);
assert(
  testForbiddenRoutes("if (preg_match('#^/api/admin/notifications/(\\d+)$#', $requestUri) && $method === 'DELETE')") === true,
  "Self-test: Detects forbidden DELETE route"
);
assert(
  testForbiddenRoutes("if (preg_match('#^/api/admin/notifications/([1-9]\\d*)/read$#', $requestUri) && $method === 'PATCH')") === false,
  "Self-test: Allows valid PATCH mark-read route"
);

// Negative test 4: Inappropriate role restriction
function testRoleRestriction(code) {
  return /AuthMiddleware::hasRole\s*\(/.test(code);
}
assert(
  testRoleRestriction("AuthMiddleware::hasRole(['super_admin', 'admin']);") === true,
  "Self-test: Detects role allowlist restriction"
);
assert(
  testRoleRestriction("AuthMiddleware::handle();") === false,
  "Self-test: Allows generic AuthMiddleware::handle"
);

// Negative test 5: Content-Type header validation
function testContentTypeValidation(contentType) {
  if (!contentType || typeof contentType !== 'string') return false;
  return contentType.trim().toLowerCase().startsWith('application/json');
}
assert(
  testContentTypeValidation("application/json") === true,
  "Self-test: Accepts canonical Content-Type: application/json"
);
assert(
  testContentTypeValidation("application/json; charset=utf-8") === true,
  "Self-test: Accepts Content-Type: application/json; charset=utf-8"
);
assert(
  testContentTypeValidation("text/plain") === false,
  "Self-test: Rejects Content-Type: text/plain"
);
assert(
  testContentTypeValidation("application/x-www-form-urlencoded") === false,
  "Self-test: Rejects Content-Type: application/x-www-form-urlencoded"
);
assert(
  testContentTypeValidation("multipart/form-data") === false,
  "Self-test: Rejects Content-Type: multipart/form-data"
);
assert(
  testContentTypeValidation("") === false,
  "Self-test: Rejects missing/empty Content-Type"
);
assert(
  testContentTypeValidation(null) === false,
  "Self-test: Rejects null Content-Type"
);

// Negative test 6: Empty JSON object payload validation
function testPayloadValidation(rawBody) {
  if (rawBody === '') return { valid: false, code: 'VALIDATION_ERROR', status: 422 };
  let decoded;
  try {
    decoded = JSON.parse(rawBody);
  } catch (e) {
    return { valid: false, code: 'INVALID_JSON', status: 400 };
  }
  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    return { valid: false, code: 'VALIDATION_ERROR', status: 422 };
  }
  if (Object.keys(decoded).length !== 0) {
    return { valid: false, code: 'VALIDATION_ERROR', status: 422 };
  }
  return { valid: true };
}
assert(testPayloadValidation("{}").valid === true, "Self-test: Accepts empty JSON object {}");
assert(testPayloadValidation("{").code === 'INVALID_JSON', "Self-test: Rejects malformed JSON with INVALID_JSON / 400");
assert(testPayloadValidation('{"foo":"bar"}').code === 'VALIDATION_ERROR', "Self-test: Rejects non-empty JSON object with VALIDATION_ERROR / 422");
assert(testPayloadValidation("[]").code === 'VALIDATION_ERROR', "Self-test: Rejects array with VALIDATION_ERROR / 422");
assert(testPayloadValidation("").code === 'VALIDATION_ERROR', "Self-test: Rejects empty body with VALIDATION_ERROR / 422");

console.log("\n=== 2. Package.json Script Registration ===");

const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:admin-notification-foundation"] === "node scripts/verify-admin-notification-foundation.mjs",
  "Package.json exact script registration: 'verify:admin-notification-foundation' === 'node scripts/verify-admin-notification-foundation.mjs'"
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

console.log("\n=== 4. Migration & Schema Invariants (039_create_admin_notifications.sql) ===");

const migrationPath = path.resolve(process.cwd(), 'database/migrations/039_create_admin_notifications.sql');
assert(fs.existsSync(migrationPath), "039_create_admin_notifications.sql exists");
const migrationSource = fs.readFileSync(migrationPath, 'utf8');

assert(
  migrationSource.includes("CREATE TABLE IF NOT EXISTS `admin_notifications`") ||
  migrationSource.includes("CREATE TABLE `admin_notifications`"),
  "Migration creates exact table `admin_notifications`"
);
assert(!migrationSource.includes("CREATE TABLE IF NOT EXISTS `notifications`"), "Migration does NOT use generic `notifications` table name");

// Check core schema columns
assert(/`id`\s+BIGINT\s+UNSIGNED\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/i.test(migrationSource), "Schema includes `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY");
assert(/`uuid`\s+CHAR\(36\)\s+NOT\s+NULL\s+UNIQUE/i.test(migrationSource), "Schema includes `uuid` CHAR(36) NOT NULL UNIQUE");
assert(/`recipient_admin_id`\s+INT\s+NOT\s+NULL/i.test(migrationSource), "Schema includes `recipient_admin_id` INT NOT NULL");
assert(/`source_key`\s+VARCHAR\(191\)\s+NOT\s+NULL/i.test(migrationSource), "Schema includes `source_key` VARCHAR(191) NOT NULL");
assert(/`type`\s+VARCHAR\(64\)\s+NOT\s+NULL/i.test(migrationSource), "Schema includes `type` VARCHAR(64) NOT NULL");
assert(/`severity`\s+ENUM\('info',\s*'warning',\s*'critical'\)\s+NOT\s+NULL\s+DEFAULT\s+'info'/i.test(migrationSource), "Schema includes `severity` ENUM('info','warning','critical') NOT NULL DEFAULT 'info'");
assert(/`title`\s+VARCHAR\(160\)\s+NOT\s+NULL/i.test(migrationSource), "Schema includes `title` VARCHAR(160) NOT NULL");
assert(/`body`\s+VARCHAR\(1000\)\s+NOT\s+NULL/i.test(migrationSource), "Schema includes `body` VARCHAR(1000) NOT NULL");
assert(/`entity_type`\s+VARCHAR\(64\)\s+NULL/i.test(migrationSource), "Schema includes `entity_type` VARCHAR(64) NULL");
assert(/`entity_id`\s+BIGINT\s+UNSIGNED\s+NULL/i.test(migrationSource), "Schema includes `entity_id` BIGINT UNSIGNED NULL");
assert(/`action_path`\s+VARCHAR\(255\)\s+NULL/i.test(migrationSource), "Schema includes `action_path` VARCHAR(255) NULL");
assert(/`read_at`\s+DATETIME\s+NULL/i.test(migrationSource), "Schema includes `read_at` DATETIME NULL");
assert(/`dismissed_at`\s+DATETIME\s+NULL/i.test(migrationSource), "Schema includes `dismissed_at` DATETIME NULL");
assert(/`created_at`\s+TIMESTAMP\s+NOT\s+NULL\s+DEFAULT\s+CURRENT_TIMESTAMP/i.test(migrationSource), "Schema includes `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");

// Negative schema invariants
assert(!/updated_at/i.test(migrationSource), "Schema excludes optional `updated_at` column");
assert(!/(metadata|payload|data)_json/i.test(migrationSource), "Schema excludes generic JSON blob columns");
assert(!/INSERT\s+INTO/i.test(migrationSource), "Schema contains zero seed rows (empty on fresh install)");

// Foreign key
assert(
  /FOREIGN\s+KEY\s*\(`recipient_admin_id`\)\s*REFERENCES\s*`admins`\s*\(`id`\)\s*ON\s+DELETE\s+RESTRICT\s+ON\s+UPDATE\s+RESTRICT/i.test(migrationSource),
  "Foreign key: recipient_admin_id REFERENCES admins(id) ON DELETE RESTRICT ON UPDATE RESTRICT"
);

// Idempotency unique key
assert(
  /UNIQUE\s*(\([`\w\s,]*\)|KEY\s*[`\w\s]*\([`\w\s,]*\))\s*\(`recipient_admin_id`,\s*`source_key`\)/i.test(migrationSource) ||
  /CONSTRAINT\s+[`\w]+\s+UNIQUE\s*\(`recipient_admin_id`,\s*`source_key`\)/i.test(migrationSource),
  "Idempotency key: UNIQUE (`recipient_admin_id`, `source_key`)"
);

// Indexes
assert(
  /INDEX.*`recipient_admin_id`,\s*`dismissed_at`,\s*`created_at`/i.test(migrationSource),
  "Index on (`recipient_admin_id`, `dismissed_at`, `created_at`)"
);
assert(
  /INDEX.*`recipient_admin_id`,\s*`read_at`,\s*`created_at`/i.test(migrationSource),
  "Index on (`recipient_admin_id`, `read_at`, `created_at`)"
);
assert(
  /INDEX.*`recipient_admin_id`,\s*`type`,\s*`created_at`/i.test(migrationSource),
  "Index on (`recipient_admin_id`, `type`, `created_at`)"
);

console.log("\n=== 5. Routing Invariants in api/index.php ===");

const apiIndexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(apiIndexPath), "api/index.php exists");
const apiIndexSource = fs.readFileSync(apiIndexPath, 'utf8');

// Route 1: GET /api/admin/notifications
const listRouteBlock = extractBraceBlock(apiIndexSource, "preg_match('#^/api/admin/notifications$#', $requestUri)");
assert(listRouteBlock !== null, "Route block for /api/admin/notifications found in api/index.php");
if (listRouteBlock) {
  const content = listRouteBlock.content;
  assert(content.includes("AuthMiddleware::handle();"), "List route invokes AuthMiddleware::handle()");
  assert(!content.includes("AuthMiddleware::hasRole"), "List route has NO role restriction (generic admin realm)");
  assert(content.includes("$method === 'GET'"), "List route enforces GET method only");
  assert(content.includes("AdminNotificationController"), "List route invokes AdminNotificationController");
  assert(content.includes("->index()"), "List route invokes ->index()");
}

// Route 2: PATCH /api/admin/notifications/([1-9]\d*)/read
const readRouteBlock = extractBraceBlock(apiIndexSource, "preg_match('#^/api/admin/notifications/([1-9]\\d*)/read$#', $requestUri");
assert(readRouteBlock !== null, "Route block for /api/admin/notifications/:id/read found in api/index.php");
if (readRouteBlock) {
  const content = readRouteBlock.content;
  assert(content.includes("AuthMiddleware::handle();"), "Mark-read route invokes AuthMiddleware::handle()");
  assert(!content.includes("AuthMiddleware::hasRole"), "Mark-read route has NO role restriction");
  assert(content.includes("$method === 'PATCH'"), "Mark-read route enforces PATCH method only");
  assert(content.includes("AdminNotificationController"), "Mark-read route invokes AdminNotificationController");
  assert(content.includes("->markRead("), "Mark-read route invokes ->markRead()");
}

// Route 3: PATCH /api/admin/notifications/([1-9]\d*)/dismiss
const dismissRouteBlock = extractBraceBlock(apiIndexSource, "preg_match('#^/api/admin/notifications/([1-9]\\d*)/dismiss$#', $requestUri");
assert(dismissRouteBlock !== null, "Route block for /api/admin/notifications/:id/dismiss found in api/index.php");
if (dismissRouteBlock) {
  const content = dismissRouteBlock.content;
  assert(content.includes("AuthMiddleware::handle();"), "Dismiss route invokes AuthMiddleware::handle()");
  assert(!content.includes("AuthMiddleware::hasRole"), "Dismiss route has NO role restriction");
  assert(content.includes("$method === 'PATCH'"), "Dismiss route enforces PATCH method only");
  assert(content.includes("AdminNotificationController"), "Dismiss route invokes AdminNotificationController");
  assert(content.includes("->dismiss("), "Dismiss route invokes ->dismiss()");
}

// Ensure no forbidden routes
assert(!/POST.*\/api\/admin\/notifications(\/|\$|['"#])/i.test(apiIndexSource), "No POST /api/admin/notifications (no client create route)");
assert(!/DELETE.*\/api\/admin\/notifications/i.test(apiIndexSource), "No DELETE /api/admin/notifications");
assert(!/\/api\/admin\/notifications\/.*\/restore/i.test(apiIndexSource), "No /restore endpoint");
assert(!/\/api\/admin\/notifications\/.*\/unread/i.test(apiIndexSource), "No /unread endpoint");
assert(!/\/api\/member(-auth)?\/notifications/i.test(apiIndexSource), "Member realm isolation: zero member notification routes");

console.log("\n=== 6. Controller Implementation Invariants (AdminNotificationController.php) ===");

const controllerPath = path.resolve(process.cwd(), 'api/controllers/AdminNotificationController.php');
assert(fs.existsSync(controllerPath), "AdminNotificationController.php exists");
const controllerSource = fs.readFileSync(controllerPath, 'utf8');

assert(controllerSource.includes("namespace Controllers;"), "Controller uses namespace Controllers;");
assert(controllerSource.includes("class AdminNotificationController"), "Declares AdminNotificationController class");

// Session ID Authority
assert(
  controllerSource.includes("$_SESSION['admin_id']"),
  "Controller derives recipient identity strictly from $_SESSION['admin_id']"
);
assert(
  !/\$_(GET|POST|REQUEST)\s*\[\s*['"](recipient_admin_id|admin_id|user_id)['"]\s*\]/.test(controllerSource),
  "Controller NEVER accepts admin_id / recipient_admin_id from request params"
);

// Method: index()
const indexBlock = extractBraceBlock(controllerSource, "public function index()");
assert(indexBlock !== null, "Extracted index() method block");
if (indexBlock) {
  const content = indexBlock.content;
  // Strict query param allowlist
  assert(content.includes("$allowedKeys = ['view', 'page', 'per_page'];"), "index() enforces exact query allowlist: ['view', 'page', 'per_page']");
  assert(content.includes("array_diff($requestKeys, $allowedKeys)"), "index() rejects unknown query parameters");
  assert(content.includes("'VALIDATION_ERROR', 422"), "index() returns 422 on extra query keys");

  // Validate view
  assert(content.includes("in_array($view, ['active', 'unread', 'dismissed'], true)"), "index() validates view strictly in ['active', 'unread', 'dismissed']");

  // Validate pagination
  assert(content.includes("/^[1-9]\\d*$/"), "index() uses canonical decimal integer regex for page/per_page");
  assert(content.includes("$perPage < 1 || $perPage > 100"), "index() restricts per_page to 1..100");

  // Recipient isolation in SQL
  assert(content.includes("recipient_admin_id = :admin_id"), "index() enforces recipient_admin_id = :admin_id in SQL");
  assert(content.includes("unreadStmt = $db->prepare"), "index() executes separate query for unread_count");
  assert(content.includes("AND dismissed_at IS NULL \n                  AND read_at IS NULL") ||
         content.includes("AND dismissed_at IS NULL AND read_at IS NULL"), "unread_count query defines active unread items");
  assert(content.includes("ORDER BY created_at DESC, id DESC"), "index() uses exact deterministic order: created_at DESC, id DESC");
  assert(content.includes("LIMIT :limit OFFSET :offset"), "index() implements LIMIT/OFFSET pagination");
}

// Helper: validateEmptyJsonPayload()
const helperBlock = extractBraceBlock(controllerSource, "private function validateEmptyJsonPayload()");
assert(helperBlock !== null, "Extracted validateEmptyJsonPayload() helper method block");
if (helperBlock) {
  const content = helperBlock.content;
  // Content-Type enforcement
  assert(content.includes("CONTENT_TYPE"), "Helper checks CONTENT_TYPE header");
  assert(content.includes("application/json"), "Helper requires application/json media type");
  assert(content.includes("'UNSUPPORTED_MEDIA_TYPE', 415"), "Helper returns 415 UNSUPPORTED_MEDIA_TYPE on invalid media type");
  
  // Query parameter rejection
  assert(content.includes("!empty($_GET)"), "Helper rejects query parameters with 422");
  
  // Body parsing and validation
  assert(content.includes("file_get_contents('php://input')"), "Helper reads raw body");
  assert(content.includes("json_last_error() !== JSON_ERROR_NONE"), "Helper validates JSON format");
  assert(content.includes("'INVALID_JSON', 400"), "Helper returns 400 INVALID_JSON on malformed JSON");
  assert(content.includes("!($decoded instanceof \\stdClass)"), "Helper rejects non-object (e.g. array) payloads");
  assert(content.includes("count(get_object_vars($decoded)) !== 0"), "Helper enforces empty JSON object {}");
  assert(content.includes("'VALIDATION_ERROR', 422"), "Helper returns 422 VALIDATION_ERROR on non-empty body or non-object");
  assert(content.includes("16384") && content.includes("'PAYLOAD_TOO_LARGE', 413"), "Helper guards payload size with 413 PAYLOAD_TOO_LARGE");
}

// Method: markRead($id)
const markReadBlock = extractBraceBlock(controllerSource, "public function markRead($id)");
assert(markReadBlock !== null, "Extracted markRead($id) method block");
if (markReadBlock) {
  const content = markReadBlock.content;
  // Enforce JSON Content-Type and empty body via helper or inline
  const enforcesJsonPayload = content.includes("validateEmptyJsonPayload()") ||
    (content.includes("CONTENT_TYPE") && content.includes("application/json") && content.includes("415"));
  assert(enforcesJsonPayload, "markRead() enforces JSON Content-Type and empty payload validation");
  assert(content.includes("$this->validateEmptyJsonPayload()"), "markRead() invokes shared validateEmptyJsonPayload() helper");

  // Ownership & Recipient isolation
  assert(content.includes("WHERE id = :id AND recipient_admin_id = :admin_id"), "markRead() checks existence with recipient isolation");
  assert(content.includes("'NOT_FOUND', 404"), "markRead() returns 404 if not found for current recipient");

  // Idempotency: update only if currently unread
  assert(content.includes("$row['read_at'] === null"), "markRead() updates only if read_at is null");
  assert(content.includes("SET read_at = CURRENT_TIMESTAMP"), "markRead() sets read_at = CURRENT_TIMESTAMP");
  assert(!content.includes("dismissed_at = NULL"), "markRead() does not undismiss or modify dismissed_at");
}

// Method: dismiss($id)
const dismissBlock = extractBraceBlock(controllerSource, "public function dismiss($id)");
assert(dismissBlock !== null, "Extracted dismiss($id) method block");
if (dismissBlock) {
  const content = dismissBlock.content;
  // Enforce JSON Content-Type and empty body via helper or inline
  const enforcesJsonPayload = content.includes("validateEmptyJsonPayload()") ||
    (content.includes("CONTENT_TYPE") && content.includes("application/json") && content.includes("415"));
  assert(enforcesJsonPayload, "dismiss() enforces JSON Content-Type and empty payload validation");
  assert(content.includes("$this->validateEmptyJsonPayload()"), "dismiss() invokes shared validateEmptyJsonPayload() helper");

  // Ownership & Recipient isolation
  assert(content.includes("WHERE id = :id AND recipient_admin_id = :admin_id"), "dismiss() checks existence with recipient isolation");
  assert(content.includes("'NOT_FOUND', 404"), "dismiss() returns 404 if not found for current recipient");

  // Idempotency & Semantics: dismiss implies read
  assert(content.includes("$row['dismissed_at'] === null"), "dismiss() updates only if dismissed_at is null");
  assert(content.includes("dismissed_at = CURRENT_TIMESTAMP"), "dismiss() sets dismissed_at = CURRENT_TIMESTAMP");
  assert(content.includes("COALESCE(read_at, CURRENT_TIMESTAMP)"), "dismiss() implies read: sets read_at = COALESCE(read_at, CURRENT_TIMESTAMP)");
}

// Safe Projection Mapper
const mapperBlock = extractBraceBlock(controllerSource, "private function mapNotification(array $row): array");
assert(mapperBlock !== null, "Extracted mapNotification helper method");
if (mapperBlock) {
  const content = mapperBlock.content;
  const expectedFields = [
    "'id'", "'uuid'", "'type'", "'severity'", "'title'", "'body'",
    "'entity_type'", "'entity_id'", "'action_path'",
    "'is_read'", "'read_at'", "'is_dismissed'", "'dismissed_at'", "'created_at'"
  ];
  for (const field of expectedFields) {
    assert(content.includes(field), `mapNotification includes field ${field}`);
  }
  assert(!testExposedInternalFields(content), "mapNotification NEVER exposes recipient_admin_id or source_key");
}

// No audit logging in controller
assert(
  !controllerSource.includes("AuditLogger::log"),
  "Audit boundary: mark-read and dismiss are NOT logged to audit log"
);

// No producer / INSERT in controller
assert(
  !/INSERT\s+INTO\s+admin_notifications/i.test(controllerSource),
  "Controller contains zero INSERT statements (producer is separate in future phase)"
);

console.log("\n=== 7. Frontend Isolation & DECISIONS.md Invariants ===");

// Check DECISIONS.md
const decisionsPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decisionsPath), "DECISIONS.md exists");
const decisionsSource = fs.readFileSync(decisionsPath, 'utf8');

assert(
  decisionsSource.includes("## F.20C In-App Notification Persistence & Inbox API Foundation"),
  "DECISIONS.md contains '## F.20C In-App Notification Persistence & Inbox API Foundation' section"
);
assert(decisionsSource.includes("admin_notifications is per-recipient admin-realm persistence"), "DECISIONS.md documents per-recipient admin-realm persistence");
assert(decisionsSource.includes("recipient identity always comes from admin session"), "DECISIONS.md documents session-based recipient authority");
assert(decisionsSource.includes("unique recipient_admin_id + source_key provides future producer idempotency"), "DECISIONS.md documents dedupe idempotency");
assert(decisionsSource.includes("dismiss implies read"), "DECISIONS.md documents dismiss-implies-read");

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Admin Notification Foundation verification detected violations.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All Admin Notification Foundation invariants verified.");
  process.exit(0);
}
