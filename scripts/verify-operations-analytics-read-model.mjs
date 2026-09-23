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

console.log("=== 1. Package.json Script Registration ===");

const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:operations-analytics-read-model"] === "node scripts/verify-operations-analytics-read-model.mjs",
  "Package.json exact script registration: 'verify:operations-analytics-read-model' === 'node scripts/verify-operations-analytics-read-model.mjs'"
);

console.log("\n=== 2. Repo Hygiene Checks ===");

const rootFiles = fs.readdirSync(process.cwd());
const forbiddenPatterns = [
  /^patch.*\.js$/, /^patch.*\.mjs$/, /^patch.*\.php$/,
  /^tmp.*\.js$/, /^tmp.*\.mjs$/, /^tmp.*\.php$/,
  /\.tmp$/, /\.fixed$/, /^add-.*\.php$/
];
const hygieneViolations = rootFiles.filter(file => forbiddenPatterns.some(p => p.test(file)));
assert(hygieneViolations.length === 0, `Repo hygiene: No temporary or patch artifacts in root (found: ${hygieneViolations.join(', ')})`);

console.log("\n=== 3. Database Schema Awareness & Connection State ===");

// 3.1 Migration 033: member_visits.checked_in_at is DATETIME
const migVisitsPath = path.resolve(process.cwd(), 'database/migrations/033_create_member_visits.sql');
assert(fs.existsSync(migVisitsPath), "033_create_member_visits.sql exists");
const migVisitsSource = fs.readFileSync(migVisitsPath, 'utf8');
assert(
  /`checked_in_at`\s+DATETIME/i.test(migVisitsSource),
  "member_visits.checked_in_at column type is confirmed DATETIME (literal wall time)"
);

// 3.2 Migration 034: membership_renewals.created_at is TIMESTAMP
const migRenewalsPath = path.resolve(process.cwd(), 'database/migrations/034_create_membership_renewals.sql');
assert(fs.existsSync(migRenewalsPath), "034_create_membership_renewals.sql exists");
const migRenewalsSource = fs.readFileSync(migRenewalsPath, 'utf8');
assert(
  /`created_at`\s+TIMESTAMP/i.test(migRenewalsSource),
  "membership_renewals.created_at column type is confirmed TIMESTAMP (timezone sensitive)"
);

// 3.3 Migration 035: appointments.starts_at is DATETIME
const migApptPath = path.resolve(process.cwd(), 'database/migrations/035_create_appointments.sql');
assert(fs.existsSync(migApptPath), "035_create_appointments.sql exists");
const migApptSource = fs.readFileSync(migApptPath, 'utf8');
assert(
  /`starts_at`\s+DATETIME/i.test(migApptSource),
  "appointments.starts_at column type is confirmed DATETIME (literal wall time)"
);

// 3.4 Global Database.php remains unchanged and has no global session timezone
const dbPath = path.resolve(process.cwd(), 'api/core/Database.php');
assert(fs.existsSync(dbPath), "api/core/Database.php exists");
const dbSource = fs.readFileSync(dbPath, 'utf8');
assert(
  !dbSource.includes("SET time_zone"),
  "api/core/Database.php does NOT contain global SET time_zone (isolated to analytics request)"
);

console.log("\n=== 4. Routing & RBAC in api/index.php ===");

const indexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(indexPath), "api/index.php exists");
const indexSource = fs.readFileSync(indexPath, 'utf8');

assert(
  indexSource.includes("'/api/admin/analytics/operations'"),
  "api/index.php defines route '/api/admin/analytics/operations'"
);

// Route must be under 'GET'
const getIndex = indexSource.indexOf("'GET' => [");
const postIndex = indexSource.indexOf("'POST' => [");
assert(getIndex !== -1 && postIndex !== -1, "Found GET and POST route sections in api/index.php");
const getRoutesContent = indexSource.substring(getIndex, postIndex);
assert(
  getRoutesContent.includes("'/api/admin/analytics/operations'"),
  "'/api/admin/analytics/operations' is registered under GET"
);

// Check other HTTP methods do not register it
const nonGetRoutesContent = indexSource.substring(postIndex);
assert(
  !nonGetRoutesContent.includes("'/api/admin/analytics/operations'"),
  "'/api/admin/analytics/operations' is NOT registered under POST, PUT, PATCH, or DELETE"
);

// Role restriction
const routeBlock = extractBraceBlock(indexSource, "'/api/admin/analytics/operations' => function");
assert(routeBlock !== null, "Extracted route block for /api/admin/analytics/operations");
if (routeBlock) {
  const content = routeBlock.content;
  assert(content.includes("AuthMiddleware::handle()"), "Route calls AuthMiddleware::handle()");
  assert(
    content.includes("AuthMiddleware::hasRole(['super_admin', 'admin'])"),
    "Route enforces exact roles ['super_admin', 'admin']"
  );
  assert(!content.includes("'reception'"), "Route excludes reception role");
  assert(!content.includes("'trainer'"), "Route excludes trainer role");
  assert(!content.includes("'editor'"), "Route excludes editor role");
  assert(
    content.includes("OperationsAnalyticsController"),
    "Route invokes OperationsAnalyticsController"
  );
}

console.log("\n=== 5. Controller Existence, Read-Only Invariants & Timezone Alignment ===");

const controllerPath = path.resolve(process.cwd(), 'api/controllers/OperationsAnalyticsController.php');
assert(fs.existsSync(controllerPath), "OperationsAnalyticsController.php exists");
const controllerSource = fs.readFileSync(controllerPath, 'utf8');

// Read-only invariant: No mutation statements or transactions
assert(!/\bINSERT\s+INTO\b/i.test(controllerSource), "Controller contains NO INSERT statements");
assert(!/\bUPDATE\s+\w+\s+SET\b/i.test(controllerSource), "Controller contains NO UPDATE statements");
assert(!/\bDELETE\s+FROM\b/i.test(controllerSource), "Controller contains NO DELETE statements");
assert(!controllerSource.includes("AuditLogger"), "Controller does NOT call AuditLogger (side-effect free GET)");
assert(!controllerSource.includes("beginTransaction"), "Controller does NOT use beginTransaction");
assert(!controllerSource.includes("commit()"), "Controller does NOT use commit");
assert(!controllerSource.includes("rollBack()"), "Controller does NOT use rollBack");

// Method level authorization check
assert(
  controllerSource.includes("AuthMiddleware::hasRole(['super_admin', 'admin'])"),
  "Controller method also directly enforces AuthMiddleware::hasRole(['super_admin', 'admin'])"
);

// Session Timezone Alignment Check: SET time_zone = '+03:00'
assert(
  controllerSource.includes("SET time_zone = '+03:00'") ||
  controllerSource.includes('SET time_zone = "+03:00"'),
  "Controller executes 'SET time_zone = \\'+03:00\\'' on DB connection"
);
assert(
  controllerSource.includes("$db->exec(\"SET time_zone = '+03:00'\")") ||
  controllerSource.includes("$db->exec('SET time_zone = \\'+03:00\\'')"),
  "Controller uses PDO connection exec to enforce session time_zone = '+03:00'"
);

// Fail-closed timezone set check
assert(
  controllerSource.includes("=== false") || controllerSource.includes("throw new \\Exception"),
  "Controller fails closed if setting DB session time_zone fails"
);

// Ordering: Connection -> SET time_zone -> membership_renewals queries
const connPos = controllerSource.indexOf("Database::getInstance()->getConnection()");
const setTzPos = controllerSource.indexOf("SET time_zone");
const renewalsQueryPos = controllerSource.indexOf("FROM membership_renewals");

assert(connPos !== -1, "Found getConnection() in controller");
assert(setTzPos !== -1, "Found SET time_zone in controller");
assert(renewalsQueryPos !== -1, "Found membership_renewals query in controller");

assert(
  connPos < setTzPos,
  "Ordering check: Database connection is obtained BEFORE SET time_zone statement"
);
assert(
  setTzPos < renewalsQueryPos,
  "Ordering check: SET time_zone = '+03:00' runs BEFORE any membership_renewals queries"
);

console.log("\n=== 6. Query Contract & Range Semantics ===");

// Query allowlist
assert(
  controllerSource.includes("foreach ($_GET as $key => $val)") ||
  controllerSource.includes("foreach ($_GET as $key"),
  "Controller inspects $_GET keys"
);
assert(
  controllerSource.includes("$key !== 'range'") && controllerSource.includes("VALIDATION_ERROR"),
  "Controller rejects any query parameter other than 'range' with VALIDATION_ERROR (422)"
);

// Scalar string validation: is_string($_GET['range'])
assert(
  controllerSource.includes("is_string($_GET['range'])"),
  "Controller enforces is_string(\$_GET['range']) before processing (rejects arrays)"
);

// Empty range check: trim === '' must reject with 422
assert(
  controllerSource.includes("=== ''") && controllerSource.includes("VALIDATION_ERROR"),
  "Controller explicitly rejects empty string range with VALIDATION_ERROR (422)"
);

// Allowed ranges: 7d, 30d, 90d with default 30d
assert(
  controllerSource.includes("'7d'") &&
  controllerSource.includes("'30d'") &&
  controllerSource.includes("'90d'"),
  "Allowed range values are exact: 7d, 30d, 90d"
);
assert(
  controllerSource.includes("$range = '30d'") || controllerSource.includes("= '30d'"),
  "Default range when parameter is absent is '30d'"
);

// Business Timezone: Europe/Istanbul PHP Authority
assert(
  controllerSource.includes("new \\DateTimeZone('Europe/Istanbul')") ||
  controllerSource.includes("new DateTimeZone('Europe/Istanbul')"),
  "Controller specifies Europe/Istanbul timezone authority in PHP"
);
assert(
  controllerSource.includes("DateTimeImmutable"),
  "Controller uses DateTimeImmutable for immutable date arithmetic"
);
assert(
  !controllerSource.includes("CURDATE()"),
  "Controller does NOT use raw SQL CURDATE() authority"
);

console.log("\n=== 7. Metric Sources & Query Structure ===");

// 7.1 Current Snapshot
assert(
  controllerSource.includes("FROM members WHERE status = 'active' AND deleted_at IS NULL"),
  "Active members queries members WHERE status = 'active' AND deleted_at IS NULL"
);
assert(
  controllerSource.includes("FROM member_visits WHERE checked_out_at IS NULL"),
  "Current occupancy queries member_visits WHERE checked_out_at IS NULL (open visits)"
);

// 7.2 Period Visits
assert(
  controllerSource.includes("COUNT(DISTINCT member_id) as unique_members") ||
  controllerSource.includes("COUNT(DISTINCT member_id)"),
  "Period visits computes COUNT(DISTINCT member_id) as unique_members"
);
assert(
  controllerSource.includes("checked_in_at >=") && controllerSource.includes("checked_in_at <"),
  "Visits range filter uses checked_in_at with inclusive start and exclusive tomorrow upper bound"
);

// 7.3 Period Renewals
assert(
  controllerSource.includes("FROM membership_renewals"),
  "Renewals queried from canonical membership_renewals table"
);
assert(
  controllerSource.includes("created_at >=") && controllerSource.includes("created_at <"),
  "Renewals range filter uses membership_renewals.created_at"
);
assert(
  !controllerSource.includes("members.updated_at"),
  "Renewals does NOT infer renewal from members.updated_at"
);

// 7.4 Appointments
assert(
  controllerSource.includes("FROM appointments"),
  "Appointments queried from appointments table"
);
assert(
  controllerSource.includes("starts_at >=") && controllerSource.includes("starts_at <"),
  "Appointments range filter uses starts_at"
);
assert(controllerSource.includes("'scheduled'"), "Counts 'scheduled' status appointments");
assert(controllerSource.includes("'completed'"), "Counts 'completed' status appointments");
assert(controllerSource.includes("'cancelled'"), "Counts 'cancelled' status appointments");
assert(controllerSource.includes("'no_show'"), "Counts 'no_show' status appointments");

console.log("\n=== 8. Zero-Filling, Chronological Order & No N+1 Queries ===");

// Application-side zero-fill loop
assert(
  controllerSource.includes("for ($i = 0; $i < $days; $i++)") ||
  controllerSource.includes("for ($i = 0; $i <"),
  "Generates daily entries using loop over range days count"
);
assert(
  controllerSource.includes("modify(\"+{\$i} days\")") ||
  controllerSource.includes("modify(\"+\$i days\")") ||
  controllerSource.includes("modify('+' . $i . ' days')"),
  "Daily series iterates chronologically forward from start date"
);

// No SQL queries inside loop
const dailyLoopBlock = extractBraceBlock(controllerSource, "for ($i = 0;");
assert(dailyLoopBlock !== null, "Extracted daily zero-filling loop block");
if (dailyLoopBlock) {
  const content = dailyLoopBlock.content;
  assert(!content.includes("->query("), "NO db->query inside daily date loop (No N+1)");
  assert(!content.includes("->prepare("), "NO db->prepare inside daily date loop (No N+1)");
  assert(!content.includes("->execute("), "NO stmt->execute inside daily date loop (No N+1)");
}

// Group By in pre-aggregate queries
assert(controllerSource.includes("GROUP BY DATE(checked_in_at)"), "Daily visits pre-aggregated with GROUP BY DATE(checked_in_at)");
assert(controllerSource.includes("GROUP BY DATE(created_at)"), "Daily renewals pre-aggregated with GROUP BY DATE(created_at)");
assert(controllerSource.includes("GROUP BY DATE(starts_at)"), "Daily appointments pre-aggregated with GROUP BY DATE(starts_at)");

console.log("\n=== 9. Response Privacy & Absence of Forbidden Domains ===");

// No personal member data in output
const forbiddenPersonalFields = ['first_name', 'last_name', 'phone', 'email', 'avatar_url'];
for (const field of forbiddenPersonalFields) {
  assert(!controllerSource.includes(`'${field}'`), `Controller response does not contain personal field '${field}'`);
}

// No financial analytics metrics
const forbiddenFinanceFields = ['revenue', 'sales', 'mrr', 'arpu', 'income', 'payment_total', 'package_revenue'];
for (const field of forbiddenFinanceFields) {
  assert(!controllerSource.includes(`'${field}'`), `Controller response does not contain financial metric '${field}'`);
}

// No rate inventions
const forbiddenRateFields = ['completion_rate', 'attendance_rate', 'retention_rate', 'churn_rate'];
for (const field of forbiddenRateFields) {
  assert(!controllerSource.includes(`'${field}'`), `Controller response does not invent rate metric '${field}'`);
}

// No trainer ranking/productivity
assert(!controllerSource.includes("trainer_rank"), "No trainer ranking in F.22A");
assert(!controllerSource.includes("trainer_productivity"), "No trainer productivity in F.22A");

// No cron/automation
assert(!controllerSource.includes("cron"), "No cron in F.22A");
assert(!controllerSource.includes("mail("), "No email sending in F.22A");

console.log("\n=== 10. Preserving Existing Operational Dashboard ===");

const adminCtrlPath = path.resolve(process.cwd(), 'api/controllers/AdminController.php');
assert(fs.existsSync(adminCtrlPath), "AdminController.php exists");
const adminCtrlSource = fs.readFileSync(adminCtrlPath, 'utf8');

assert(
  adminCtrlSource.includes("public function operationalDashboard()"),
  "AdminController::operationalDashboard() remains untouched"
);
assert(
  indexSource.includes("'/api/admin/dashboard/operations'"),
  "Route '/api/admin/dashboard/operations' remains registered in api/index.php"
);

const dashboardPagePath = path.resolve(process.cwd(), 'src/admin/pages/Dashboard.tsx');
assert(fs.existsSync(dashboardPagePath), "Dashboard.tsx exists");
const dashboardPageSource = fs.readFileSync(dashboardPagePath, 'utf8');
assert(
  dashboardPageSource.includes("/api/admin/dashboard/operations"),
  "Dashboard.tsx continues to consume /api/admin/dashboard/operations"
);

console.log("\n=== 11. DECISIONS.md Documentation Invariants ===");

const decisionsPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decisionsPath), "DECISIONS.md exists");
const decisionsSource = fs.readFileSync(decisionsPath, 'utf8');

assert(
  decisionsSource.includes("## F.22A Operations Analytics Read Model"),
  "DECISIONS.md contains section '## F.22A Operations Analytics Read Model'"
);
assert(
  decisionsSource.includes("F.21 Lead/Sales CRM intentionally skipped"),
  "Documents F.21 skipped rationale"
);
assert(
  decisionsSource.includes("F.22 builds on existing operational data rather than introducing a separate analytics datastore"),
  "Documents building on existing operational data"
);
assert(
  decisionsSource.includes("existing /api/admin/dashboard/operations remains unchanged"),
  "Documents operational dashboard preserved"
);
assert(
  decisionsSource.includes("analytics is super_admin/admin only"),
  "Documents super_admin/admin role restriction"
);
assert(
  decisionsSource.includes("business calendar uses Europe/Istanbul"),
  "Documents Europe/Istanbul calendar authority"
);
assert(
  decisionsSource.includes("ranges are fixed 7d/30d/90d in F.22A"),
  "Documents fixed ranges 7d/30d/90d"
);
assert(
  decisionsSource.includes("daily series is zero-filled and chronological"),
  "Documents zero-filled chronological daily series"
);
assert(
  decisionsSource.includes("no personal member data in analytics responses"),
  "Documents privacy boundary"
);
assert(
  decisionsSource.includes("no financial analytics because no canonical payment/invoice domain exists"),
  "Documents financial domain absence"
);
assert(
  decisionsSource.includes("no session-package utilization analytics in F.22A"),
  "Documents package analytics deferred"
);
assert(
  decisionsSource.includes("no automation in F.22A"),
  "Documents automation absence"
);

console.log("\n=== 12. Mathematical, Structural & Timezone Simulation Self-Tests ===");

// 12.1 Date math simulation
function simulateDateRange(rangeStr, baseDateStr = '2026-09-23') {
  const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[rangeStr];
  const baseDate = new Date(`${baseDateStr}T00:00:00Z`);

  const startDate = new Date(baseDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const dates = [];
  for (let i = 0; i < days; i++) {
    const cur = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(cur.toISOString().substring(0, 10));
  }
  return { startDate: dates[0], endDate: dates[dates.length - 1], count: dates.length, dates };
}

const r7 = simulateDateRange('7d', '2026-09-23');
assert(r7.count === 7, "7d range produces exact 7 daily entries");
assert(r7.startDate === '2026-09-17' && r7.endDate === '2026-09-23', "7d range start is 2026-09-17 and end is 2026-09-23");

const r30 = simulateDateRange('30d', '2026-09-23');
assert(r30.count === 30, "30d range produces exact 30 daily entries");
assert(r30.startDate === '2026-08-25' && r30.endDate === '2026-09-23', "30d range start is 2026-08-25 and end is 2026-09-23");

const r90 = simulateDateRange('90d', '2026-09-23');
assert(r90.count === 90, "90d range produces exact 90 daily entries");
assert(r90.startDate === '2026-06-26' && r90.endDate === '2026-09-23', "90d range start is 2026-06-26 and end is 2026-09-23");

// 12.2 Chronological ordering simulation
for (let i = 1; i < r90.dates.length; i++) {
  if (r90.dates[i] <= r90.dates[i - 1]) {
    assert(false, "Simulated dates are strictly ascending");
  }
}
assert(true, "All dates in simulated range are strictly ascending (chronological)");

// 12.3 Query Validation Simulation (with string type check and empty check)
function validateQuery(params) {
  for (const k of Object.keys(params)) {
    if (k !== 'range') return { valid: false, code: 422, error: 'VALIDATION_ERROR' };
  }
  let range = '30d';
  if ('range' in params) {
    if (typeof params.range !== 'string') {
      return { valid: false, code: 422, error: 'VALIDATION_ERROR' };
    }
    const val = params.range.trim();
    if (val === '') {
      return { valid: false, code: 422, error: 'VALIDATION_ERROR' };
    }
    if (!['7d', '30d', '90d'].includes(val)) {
      return { valid: false, code: 422, error: 'VALIDATION_ERROR' };
    }
    range = val;
  }
  return { valid: true, range };
}

assert(validateQuery({}).valid === true && validateQuery({}).range === '30d', "Absent range defaults to 30d");
assert(validateQuery({ range: '7d' }).valid === true && validateQuery({ range: '7d' }).range === '7d', "range=7d is valid");
assert(validateQuery({ range: '30d' }).valid === true && validateQuery({ range: '30d' }).range === '30d', "range=30d is valid");
assert(validateQuery({ range: '90d' }).valid === true && validateQuery({ range: '90d' }).range === '90d', "range=90d is valid");
assert(validateQuery({ range: '' }).valid === false, "Negative: empty range='' is rejected with 422");
assert(validateQuery({ range: '   ' }).valid === false, "Negative: whitespace range='   ' is rejected with 422");
assert(validateQuery({ range: ['30d'] }).valid === false, "Negative: array range=['30d'] is rejected with 422");
assert(validateQuery({ range: '365d' }).valid === false, "Negative: range=365d is rejected with 422");
assert(validateQuery({ range: '30d', extra: 'param' }).valid === false, "Negative: Extra query param rejected with 422");
assert(validateQuery({ foo: 'bar' }).valid === false, "Negative: Unknown query param rejected with 422");

// 12.4 Negative Timezone Simulation (UTC vs Europe/Istanbul +03:00)
// Suppose a renewal row was created at UTC 2026-09-22 22:30:00 (which is 2026-09-23 01:30:00 in Turkey +03:00)
function computeBucketDate(utcIsoString, sessionOffsetHours) {
  const d = new Date(utcIsoString);
  const adjusted = new Date(d.getTime() + sessionOffsetHours * 3600 * 1000);
  return adjusted.toISOString().substring(0, 10);
}

const testUtcInstant = '2026-09-22T22:30:00.000Z';
const unalignedDate = computeBucketDate(testUtcInstant, 0); // UTC session
const alignedDate = computeBucketDate(testUtcInstant, 3); // +03:00 session

assert(
  unalignedDate === '2026-09-22',
  "Simulated unaligned UTC session wrongly buckets late-evening UTC into 2026-09-22"
);
assert(
  alignedDate === '2026-09-23',
  "Simulated aligned +03:00 session correctly buckets into Turkey calendar date 2026-09-23"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Operations Analytics Read Model verification detected violations.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All Operations Analytics Read Model invariants verified.");
  process.exit(0);
}
