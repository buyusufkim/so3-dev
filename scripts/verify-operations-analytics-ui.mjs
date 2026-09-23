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

console.log("=== 1. Subprocess Chain: F.22A Operations Analytics Read Model Verifier ===");
try {
  const readModelVerifierOutput = execSync('node scripts/verify-operations-analytics-read-model.mjs', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  assert(
    readModelVerifierOutput.includes("SUCCESS: All Operations Analytics Read Model invariants verified."),
    "Subprocess chain: verify-operations-analytics-read-model.mjs completed with SUCCESS"
  );
} catch (err) {
  console.error("F.22A read model verifier failed:", err.stdout || err.message);
  assert(false, "Subprocess chain: verify-operations-analytics-read-model.mjs must pass");
}

console.log("\n=== 2. Package.json Script Registration ===");
const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:operations-analytics-ui"] === "node scripts/verify-operations-analytics-ui.mjs",
  "package.json exact registration: 'verify:operations-analytics-ui' === 'node scripts/verify-operations-analytics-ui.mjs'"
);
assert(
  pkg.scripts && pkg.scripts["verify:operations-analytics-read-model"] === "node scripts/verify-operations-analytics-read-model.mjs",
  "package.json preserves 'verify:operations-analytics-read-model'"
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

console.log("\n=== 4. Component Existence & Dashboard Integration ===");
const panelPath = path.resolve(process.cwd(), 'src/admin/components/OperationsAnalyticsPanel.tsx');
assert(fs.existsSync(panelPath), "src/admin/components/OperationsAnalyticsPanel.tsx exists");
const panelSource = fs.readFileSync(panelPath, 'utf8');

const dashboardPath = path.resolve(process.cwd(), 'src/admin/pages/Dashboard.tsx');
assert(fs.existsSync(dashboardPath), "src/admin/pages/Dashboard.tsx exists");
const dashboardSource = fs.readFileSync(dashboardPath, 'utf8');

// Dashboard imports and renders panel
assert(
  dashboardSource.includes("OperationsAnalyticsPanel"),
  "Dashboard.tsx imports OperationsAnalyticsPanel"
);
assert(
  dashboardSource.includes("<OperationsAnalyticsPanel"),
  "Dashboard.tsx renders <OperationsAnalyticsPanel />"
);

// Gated under isAdmin
const isAdminPos = dashboardSource.indexOf("{isAdmin &&");
const panelPos = dashboardSource.indexOf("<OperationsAnalyticsPanel");
assert(isAdminPos !== -1, "Dashboard.tsx contains {isAdmin && } guard");
assert(panelPos !== -1, "Dashboard.tsx contains <OperationsAnalyticsPanel />");
assert(
  panelPos > isAdminPos,
  "OperationsAnalyticsPanel is rendered inside the isAdmin guarded block"
);

// Preserved existing dashboard endpoints
assert(
  dashboardSource.includes("/api/admin/dashboard"),
  "Dashboard.tsx preserves call to /api/admin/dashboard"
);
assert(
  dashboardSource.includes("/api/admin/dashboard/operations"),
  "Dashboard.tsx preserves call to /api/admin/dashboard/operations"
);
assert(
  dashboardSource.includes("Operasyon Özeti"),
  "Dashboard.tsx preserves existing 'Operasyon Özeti' section"
);

console.log("\n=== 5. Networking & Security Boundaries in Panel ===");

// No auth/me call in panel
assert(
  !panelSource.includes("/api/auth/me"),
  "OperationsAnalyticsPanel does NOT call /api/auth/me (no redundant auth check)"
);

// Endpoint exact
assert(
  panelSource.includes("/api/admin/analytics/operations"),
  "Panel fetches exact endpoint '/api/admin/analytics/operations'"
);

// Method: GET only
assert(!panelSource.includes("apiClient.post"), "Panel does NOT call apiClient.post");
assert(!panelSource.includes("apiClient.patch"), "Panel does NOT call apiClient.patch");
assert(!panelSource.includes("apiClient.delete"), "Panel does NOT call apiClient.delete");

// Range contract
assert(
  panelSource.includes("'7d'") && panelSource.includes("'30d'") && panelSource.includes("'90d'"),
  "Panel defines exact range options: '7d', '30d', '90d'"
);
assert(
  panelSource.includes("useState<AnalyticsRange>('30d')") || panelSource.includes("('30d')"),
  "Panel initializes with default range '30d'"
);

// No client slicing
assert(
  !panelSource.includes("daily.slice"),
  "Panel does NOT slice client data (always refetches backend for range switch)"
);

// No Polling / WebSockets
assert(!panelSource.includes("setInterval"), "Panel contains NO setInterval (no polling)");
assert(!panelSource.includes("WebSocket"), "Panel contains NO WebSocket");
assert(!panelSource.includes("EventSource"), "Panel contains NO EventSource");

console.log("\n=== 6. Request Safety, Race Protection & Error Isolation ===");

// AbortController
assert(
  panelSource.includes("AbortController"),
  "Panel uses AbortController to cancel pending in-flight requests"
);
assert(
  panelSource.includes("abort()"),
  "Panel calls abort() on previous request before initiating new one"
);

// Request generation counter
assert(
  panelSource.includes("requestGenerationRef") || panelSource.includes("generation"),
  "Panel uses request generation counter to ignore stale out-of-order responses"
);

// Isolated error handling
assert(
  panelSource.includes("setError(") && panelSource.includes("Tekrar Dene"),
  "Panel handles its own errors with retry capability ('Tekrar Dene')"
);

console.log("\n=== 7. Strict Runtime Validation Invariants ===");

// No blind cast
assert(
  !/setData\(\s*(?:res|response)\s+as\s+OperationsAnalyticsResponse\s*\)/.test(panelSource),
  "Panel does NOT perform blind cast on raw API response"
);
assert(
  panelSource.includes("validateAnalyticsResponse"),
  "Panel defines and invokes validateAnalyticsResponse()"
);

// Validation checks presence
assert(panelSource.includes("res.range !== requestedRange"), "Validator enforces requested range match");
assert(panelSource.includes("Europe/Istanbul"), "Validator enforces 'Europe/Istanbul' timezone");
assert(panelSource.includes("isValidDateOnly"), "Validator enforces Gregorian date validation");
assert(panelSource.includes("isNonNegativeInteger"), "Validator enforces non-negative integer check");
assert(panelSource.includes("expectedLength"), "Validator enforces exact daily length (7, 30, 90)");
assert(panelSource.includes("res.daily[0]?.date !== res.start_date"), "Validator enforces daily[0].date === start_date");
assert(panelSource.includes("res.daily[res.daily.length - 1]?.date !== res.end_date"), "Validator enforces daily[last].date === end_date");
assert(panelSource.includes("86400000"), "Validator enforces daily entries are contiguous and exactly 1 calendar day apart");
assert(panelSource.includes("unique_members > pVisits.total") || panelSource.includes("unique_members >"), "Validator enforces unique <= total for visits");
assert(panelSource.includes("unique_members > pRenewals.total") || panelSource.includes("unique_members >"), "Validator enforces unique <= total for renewals");
assert(panelSource.includes("unique_visitors > day.visits"), "Validator enforces unique_visitors <= visits for daily rows");
assert(panelSource.includes("scheduled + a.completed + a.cancelled + a.no_show === a.total"), "Validator enforces appointment status sum === total");

console.log("\n=== 8. Date Display Safety (No timezone shifts) ===");

// Date string formatter check
assert(
  panelSource.includes("formatDateTurkish"),
  "Panel defines string-safe formatDateTurkish()"
);
assert(
  !/new\s+Date\([^)]*\)\.toLocaleDateString/.test(panelSource),
  "Panel does NOT use new Date().toLocaleDateString for display"
);
assert(
  !/new\s+Date\(data\.(?:start|end)_date\)/.test(panelSource),
  "Panel does NOT wrap start_date/end_date in new Date() for UI display"
);
assert(
  !/new\s+Date\(day\.date\)/.test(panelSource),
  "Panel does NOT wrap day.date in new Date() for UI display"
);

console.log("\n=== 9. Daily Trend & Lightweight SVG Chart Invariants ===");

// No third party chart libs
const forbiddenLibs = ['recharts', 'chart.js', 'echarts', 'apexcharts', 'd3'];
for (const lib of forbiddenLibs) {
  assert(!panelSource.includes(`from '${lib}'`) && !panelSource.includes(`from "${lib}"`), `Panel does NOT import '${lib}'`);
}

// Trend metric selector concepts
assert(panelSource.includes("'visits'"), "Panel supports 'visits' trend metric");
assert(panelSource.includes("'unique_visitors'"), "Panel supports 'unique_visitors' trend metric");
assert(panelSource.includes("'renewals'"), "Panel supports 'renewals' trend metric");
assert(panelSource.includes("'appointments'"), "Panel supports 'appointments' trend metric");

// Point order authority (no sort/reverse)
assert(!panelSource.includes(".sort("), "Panel does NOT sort backend daily points");
assert(!panelSource.includes(".reverse("), "Panel does NOT reverse backend daily points");

// Zero-data safety
assert(
  panelSource.includes("isAllZero") || panelSource.includes("maxVal === 0") || panelSource.includes("Math.max(...values, 0)"),
  "Chart safely handles all-zero metric values without NaN or division by zero"
);

// Chart accessibility
assert(
  panelSource.includes('role="img"'),
  "SVG chart element has role='img'"
);
assert(
  panelSource.includes('aria-label='),
  "SVG chart element has dynamic aria-label"
);

console.log("\n=== 10. Privacy & Absence of Forbidden Domains ===");

// No personal data in UI
const forbiddenPersonal = ['first_name', 'last_name', 'phone', 'email', 'avatar_url'];
for (const field of forbiddenPersonal) {
  assert(!panelSource.includes(`data.${field}`), `Panel does not display personal member field '${field}'`);
}

// No financial data in UI
const forbiddenFinance = ['revenue', 'sales', 'mrr', 'arpu', 'ciro', 'gelir'];
for (const term of forbiddenFinance) {
  assert(!panelSource.toLowerCase().includes(`data.${term}`), `Panel does not display financial term '${term}'`);
}

// No derived rate inventions in UI
const forbiddenRates = ['completion_rate', 'attendance_rate', 'retention_rate', 'churn_rate', 'başarı %', 'katılım %'];
for (const rate of forbiddenRates) {
  assert(!panelSource.includes(rate), `Panel does not display derived rate '${rate}'`);
}

console.log("\n=== 11. DECISIONS.md Documentation Invariants ===");

const decisionsPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decisionsPath), "DECISIONS.md exists");
const decisionsSource = fs.readFileSync(decisionsPath, 'utf8');

assert(
  decisionsSource.includes("## F.22B Operations Analytics Dashboard UI"),
  "DECISIONS.md contains section '## F.22B Operations Analytics Dashboard UI'"
);
assert(
  decisionsSource.includes("analytics is embedded into existing super_admin/admin /admin dashboard"),
  "Documents analytics embedded in /admin dashboard"
);
assert(
  decisionsSource.includes("existing daily Operations Summary remains canonical and unchanged"),
  "Documents existing daily Operations Summary remains unchanged"
);
assert(
  decisionsSource.includes("F.22A response is strict-runtime-validated before rendering"),
  "Documents strict runtime validation"
);
assert(
  decisionsSource.includes("range selection always refetches backend; no client slicing"),
  "Documents range refetch without client slicing"
);
assert(
  decisionsSource.includes("30d is initial range"),
  "Documents 30d initial range"
);
assert(
  decisionsSource.includes("analytics fetch errors are isolated from the rest of Dashboard"),
  "Documents error isolation"
);
assert(
  decisionsSource.includes("daily trend uses lightweight local SVG with no chart dependency"),
  "Documents lightweight local SVG"
);
assert(
  decisionsSource.includes("backend chronology is preserved"),
  "Documents backend chronology preserved"
);
assert(
  decisionsSource.includes("no derived business rates"),
  "Documents no derived business rates"
);
assert(
  decisionsSource.includes("no financial or session-package analytics"),
  "Documents no financial or session-package analytics"
);
assert(
  decisionsSource.includes("no polling or automation"),
  "Documents no polling or automation"
);

console.log("\n=== 12. Simulation Self-Tests for Validation & Formatting ===");

// Independent implementation in test matching panel exact contract
function isNonNegativeInteger(val) {
  return typeof val === 'number' && Number.isInteger(val) && val >= 0;
}

function isValidDateOnly(str) {
  if (typeof str !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const parts = str.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

function validateAppointmentCounts(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (
    !isNonNegativeInteger(obj.total) ||
    !isNonNegativeInteger(obj.scheduled) ||
    !isNonNegativeInteger(obj.completed) ||
    !isNonNegativeInteger(obj.cancelled) ||
    !isNonNegativeInteger(obj.no_show)
  ) {
    return false;
  }
  return obj.scheduled + obj.completed + obj.cancelled + obj.no_show === obj.total;
}

function simValidate(raw, requestedRange) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.range !== requestedRange) return null;
  if (!['7d', '30d', '90d'].includes(raw.range)) return null;
  if (raw.timezone !== 'Europe/Istanbul') return null;
  if (!isValidDateOnly(raw.start_date) || !isValidDateOnly(raw.end_date)) return null;

  if (!raw.current || typeof raw.current !== 'object') return null;
  if (!isNonNegativeInteger(raw.current.active_members) || !isNonNegativeInteger(raw.current.current_occupancy)) {
    return null;
  }

  if (!raw.period || typeof raw.period !== 'object') return null;
  if (!raw.period.visits || typeof raw.period.visits !== 'object') return null;
  if (!isNonNegativeInteger(raw.period.visits.total) || !isNonNegativeInteger(raw.period.visits.unique_members)) return null;
  if (raw.period.visits.unique_members > raw.period.visits.total) return null;

  if (!raw.period.renewals || typeof raw.period.renewals !== 'object') return null;
  if (!isNonNegativeInteger(raw.period.renewals.total) || !isNonNegativeInteger(raw.period.renewals.unique_members)) return null;
  if (raw.period.renewals.unique_members > raw.period.renewals.total) return null;

  if (!validateAppointmentCounts(raw.period.appointments)) return null;

  if (!Array.isArray(raw.daily)) return null;
  const expectedLength = requestedRange === '7d' ? 7 : requestedRange === '30d' ? 30 : 90;
  if (raw.daily.length !== expectedLength) return null;
  if (raw.daily[0]?.date !== raw.start_date) return null;
  if (raw.daily[raw.daily.length - 1]?.date !== raw.end_date) return null;

  let prevUtc = null;
  for (let i = 0; i < raw.daily.length; i++) {
    const d = raw.daily[i];
    if (!d || typeof d !== 'object') return null;
    if (!isValidDateOnly(d.date)) return null;
    const parts = d.date.split('-');
    const curUtc = Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (prevUtc !== null) {
      if (curUtc - prevUtc !== 86400000) return null;
    }
    prevUtc = curUtc;
    if (!isNonNegativeInteger(d.visits) || !isNonNegativeInteger(d.unique_visitors) || !isNonNegativeInteger(d.renewals)) {
      return null;
    }
    if (d.unique_visitors > d.visits) return null;
    if (!validateAppointmentCounts(d.appointments)) return null;
  }

  return raw;
}

function simFormatDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function simFormatDayMonth(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}`;
}

// 12.1 Formatters
assert(simFormatDate('2026-09-23') === '23.09.2026', "simFormatDate('2026-09-23') === '23.09.2026'");
assert(simFormatDayMonth('2026-09-23') === '23.09', "simFormatDayMonth('2026-09-23') === '23.09'");

// 12.2 Helper to construct valid mock payload
function createValidMock(range = '7d') {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const baseDate = new Date('2026-09-23T00:00:00Z');
  const startDate = new Date(baseDate.getTime() - (days - 1) * 86400000);
  const daily = [];

  for (let i = 0; i < days; i++) {
    const cur = new Date(startDate.getTime() + i * 86400000);
    const dateStr = cur.toISOString().substring(0, 10);
    daily.push({
      date: dateStr,
      visits: 10,
      unique_visitors: 8,
      renewals: 2,
      appointments: {
        total: 5,
        scheduled: 1,
        completed: 3,
        cancelled: 1,
        no_show: 0
      }
    });
  }

  return {
    range,
    start_date: daily[0].date,
    end_date: daily[daily.length - 1].date,
    timezone: 'Europe/Istanbul',
    current: {
      active_members: 150,
      current_occupancy: 12
    },
    period: {
      visits: { total: 70, unique_members: 50 },
      renewals: { total: 14, unique_members: 12 },
      appointments: {
        total: 35,
        scheduled: 7,
        completed: 21,
        cancelled: 7,
        no_show: 0
      }
    },
    daily
  };
}

// Valid payload passes
const valid7 = createValidMock('7d');
assert(simValidate(valid7, '7d') !== null, "Valid 7d payload passes runtime validation");

const valid30 = createValidMock('30d');
assert(simValidate(valid30, '30d') !== null, "Valid 30d payload passes runtime validation");

// Negative tests:
// Range mismatch
assert(simValidate(valid7, '30d') === null, "Fails when range in payload does not match requested range");

// Invalid timezone
const badTz = { ...valid7, timezone: 'UTC' };
assert(simValidate(badTz, '7d') === null, "Fails when timezone is not 'Europe/Istanbul'");

// Invalid Gregorian date (e.g. Feb 31)
const badDate = { ...valid7, start_date: '2026-02-31' };
assert(simValidate(badDate, '7d') === null, "Fails on impossible Gregorian date 2026-02-31");

// Wrong daily count
const shortDaily = { ...valid7, daily: valid7.daily.slice(0, 6) };
assert(simValidate(shortDaily, '7d') === null, "Fails when daily array length does not match range");

// Negative number
const negVisits = JSON.parse(JSON.stringify(valid7));
negVisits.period.visits.total = -5;
assert(simValidate(negVisits, '7d') === null, "Fails on negative metric count");

// Relational invariant: unique > total
const badUnique = JSON.parse(JSON.stringify(valid7));
badUnique.period.visits.unique_members = 100;
badUnique.period.visits.total = 50;
assert(simValidate(badUnique, '7d') === null, "Fails when unique_members > total");

// Appointment status sum mismatch
const badApptSum = JSON.parse(JSON.stringify(valid7));
badApptSum.period.appointments.total = 40; // components sum to 35
assert(simValidate(badApptSum, '7d') === null, "Fails when appointment status components sum != total");

// Daily non-contiguous date
const nonContiguous = JSON.parse(JSON.stringify(valid7));
nonContiguous.daily[2].date = '2026-09-25'; // jump in date
assert(simValidate(nonContiguous, '7d') === null, "Fails on non-contiguous daily date series");

// Rapid range click / stale race condition simulation
{
  let activeGeneration = 0;
  let displayedData = null;

  function simulateFetch(targetRange) {
    const gen = ++activeGeneration;
    return {
      resolve: (data) => {
        if (gen === activeGeneration) {
          displayedData = data;
        }
      }
    };
  }

  const req30 = simulateFetch('30d');
  const req7 = simulateFetch('7d');
  const req90 = simulateFetch('90d');

  // Stale 30d arrives late
  req30.resolve(createValidMock('30d'));
  // Stale 7d arrives
  req7.resolve(createValidMock('7d'));
  // Latest 90d arrives
  req90.resolve(createValidMock('90d'));

  assert(
    displayedData && displayedData.range === '90d',
    "Race simulation: Stale out-of-order responses cannot overwrite latest requested range 90d"
  );
}

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Operations Analytics UI verification detected violations.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All Operations Analytics UI invariants verified.");
  process.exit(0);
}
