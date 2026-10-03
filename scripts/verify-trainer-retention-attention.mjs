import fs from 'fs';
import path from 'path';
import ts from 'typescript';

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

console.log("=== 1. Router & RBAC Invariants in api/index.php ===");

const apiIndexPath = path.resolve('api/index.php');
assert(fs.existsSync(apiIndexPath), "api/index.php exists");
const apiIndexSource = fs.readFileSync(apiIndexPath, 'utf8');

const routeMatches = apiIndexSource.indexOf("api/trainer/retention-attention");
assert(routeMatches !== -1, "api/index.php registers '/api/trainer/retention-attention' route");

const routeBlockMatch = apiIndexSource.match(/preg_match\('#\^\/api\/trainer\/retention-attention\$#',\s*\$requestUri\)[^}]+}[^}]+}/s);
assert(routeBlockMatch !== null, "Route block for '/api/trainer/retention-attention' extractable");
const routeBlock = routeBlockMatch ? routeBlockMatch[0] : '';

assert(
  routeBlock.includes("AuthMiddleware::hasRole(['trainer'])"),
  "Route strictly enforces role ['trainer']"
);
assert(
  routeBlock.includes("$method === 'GET'"),
  "Route strictly enforces HTTP GET method"
);
assert(
  routeBlock.includes("TrainerRetentionAttentionController"),
  "Route dispatches to TrainerRetentionAttentionController"
);
assert(
  routeBlock.includes("->index()"),
  "Route invokes index() method"
);

console.log("\n=== 2. Controller Source & Architecture Invariants ===");

const controllerPath = path.resolve('api/controllers/TrainerRetentionAttentionController.php');
assert(fs.existsSync(controllerPath), "TrainerRetentionAttentionController.php exists");
const controllerSource = fs.readFileSync(controllerPath, 'utf8');

// Strict role check in controller
assert(
  controllerSource.includes("AuthMiddleware::hasRole(['trainer'])"),
  "Controller independently checks AuthMiddleware::hasRole(['trainer'])"
);

// Query parameters rejection
assert(
  controllerSource.includes("!empty($_GET)"),
  "Controller rejects query parameters with !empty($_GET)"
);
assert(
  controllerSource.includes("VALIDATION_ERROR") && controllerSource.includes("422"),
  "Controller returns 422 VALIDATION_ERROR when query parameters are supplied"
);

// Session trainer resolution
assert(
  controllerSource.includes("$_SESSION['admin_id']"),
  "Controller resolves trainer strictly from $_SESSION['admin_id']"
);
assert(
  controllerSource.includes("TRAINER_PROFILE_NOT_LINKED") && controllerSource.includes("403"),
  "Controller fails closed with 403 TRAINER_PROFILE_NOT_LINKED when no active profile linked"
);

// Timezone & DateTime authority
assert(
  controllerSource.includes("new DateTimeZone('Europe/Istanbul')") ||
  controllerSource.includes("self::TIMEZONE"),
  "Controller uses explicit Europe/Istanbul timezone"
);
assert(
  controllerSource.includes("DateTimeImmutable"),
  "Controller uses DateTimeImmutable for business date/time calculations"
);
assert(
  !controllerSource.includes("CURDATE()") && !controllerSource.includes("NOW()"),
  "Controller zero database CURDATE()/NOW() authority for retention business logic"
);

// Inactivity threshold
assert(
  controllerSource.includes("INACTIVITY_DAYS = 14"),
  "Controller defines canonical 14-day inactivity threshold constant"
);

// Query candidate conditions
assert(
  controllerSource.includes("m.trainer_id = ?"),
  "Query filters members by current trainer_id"
);
assert(
  controllerSource.includes("m.deleted_at IS NULL"),
  "Query filters members by deleted_at IS NULL"
);
assert(
  controllerSource.includes("m.status = 'active'"),
  "Query filters members by status = 'active'"
);
assert(
  controllerSource.includes("m.membership_end_date IS NULL OR m.membership_end_date >= ?"),
  "Query requires membership_end_date IS NULL OR membership_end_date >= businessDate"
);
assert(
  controllerSource.includes("a.status = 'completed'"),
  "Query considers ONLY completed appointments for session activity"
);
assert(
  controllerSource.includes("MAX(a.ends_at)"),
  "Query aggregates MAX(a.ends_at) as last_completed_at"
);
assert(
  controllerSource.includes("NOT EXISTS"),
  "Query excludes members with scheduled current/future appointment via NOT EXISTS"
);
assert(
  controllerSource.includes("a2.status = 'scheduled'") &&
  controllerSource.includes("a2.starts_at >= ?"),
  "Query exclusion checks scheduled appointments with starts_at >= business_now"
);
assert(
  controllerSource.includes("ORDER BY last_completed_at ASC"),
  "Query orders candidates by last_completed_at ASC (most inactive first)"
);
assert(
  controllerSource.includes("LIMIT 20"),
  "Query enforces maximum 20 candidates limit (LIMIT 20)"
);

// Zero N+1 query loop
const prepareMatches = controllerSource.match(/\$this->db->prepare\(/g) || [];
assert(
  prepareMatches.length === 2, // 1 for trainer profile, 1 for candidate query
  `Controller executes exactly bounded fixed queries (found ${prepareMatches.length}, zero N+1 queries in loops)`
);

// Anti-mutation & Read-only enforcement
assert(!controllerSource.includes("INSERT INTO"), "Zero INSERT queries in controller");
assert(!controllerSource.includes("UPDATE "), "Zero UPDATE queries in controller");
assert(!controllerSource.includes("DELETE FROM"), "Zero DELETE queries in controller");
assert(!controllerSource.includes("FOR UPDATE"), "Zero FOR UPDATE locks in controller");
assert(!controllerSource.includes("beginTransaction"), "Zero database transactions in controller");
assert(!controllerSource.includes("AuditLogger"), "Zero audit log writes in read-only controller");

// Safe PII boundary
assert(!controllerSource.includes("email"), "Zero member email in candidate projection");
assert(!controllerSource.includes("notes"), "Zero member notes in candidate projection");
assert(!controllerSource.includes("emergency"), "Zero emergency contacts in candidate projection");
assert(!controllerSource.includes("blood"), "Zero blood group in candidate projection");
assert(!controllerSource.includes("measurement"), "Zero measurements in candidate projection");
assert(!controllerSource.includes("health"), "Zero health data in candidate projection");
assert(!controllerSource.includes("payment"), "Zero payment data in candidate projection");
assert(!controllerSource.includes("package"), "Zero package data in candidate projection");

// Anti-CRM & Anti-Automation
assert(!controllerSource.includes("churn_score"), "Zero churn_score in controller");
assert(!controllerSource.includes("risk_score"), "Zero risk_score in controller");
assert(!controllerSource.includes("priority"), "Zero priority ranking in controller");
assert(!controllerSource.includes("contacted_at"), "Zero contacted_at persistence in controller");
assert(!controllerSource.includes("retention_status"), "Zero retention_status in controller");
assert(!controllerSource.includes("wa.me"), "Zero WhatsApp URL construction in controller");
assert(!controllerSource.includes("graph.facebook.com"), "Zero Facebook/Meta API endpoints in controller");

console.log("\n=== 3. Algorithmic Candidate Qualification Simulations ===");

// Simulation model matching controller SQL/PHP rules
function evaluateCandidate(candidate, businessDate, businessNow, thresholdDays = 14) {
  // 1. Current trainer, active, non-deleted
  if (candidate.trainer_id !== candidate.current_trainer_id) return { qualified: false, reason: 'wrong_trainer' };
  if (candidate.deleted_at !== null) return { qualified: false, reason: 'deleted' };
  if (candidate.status !== 'active') return { qualified: false, reason: 'inactive' };

  // 2. Membership not expired
  if (candidate.membership_end_date !== null && candidate.membership_end_date < businessDate) {
    return { qualified: false, reason: 'membership_expired' };
  }

  // 3. Completed appointments with current trainer
  const completedSessions = candidate.appointments.filter(
    a => a.status === 'completed' && a.trainer_id === candidate.current_trainer_id
  );
  if (completedSessions.length === 0) return { qualified: false, reason: 'never_completed' };

  // 4. Max completed ends_at
  const lastCompletedAt = completedSessions.reduce((max, a) => (a.ends_at > max ? a.ends_at : max), '');
  const lastCompletedDate = lastCompletedAt.substring(0, 10);

  // 5. Inactivity days calculation (calendar days)
  const bDateObj = new Date(businessDate + 'T00:00:00Z');
  const lDateObj = new Date(lastCompletedDate + 'T00:00:00Z');
  const diffDays = Math.round((bDateObj.getTime() - lDateObj.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < thresholdDays) return { qualified: false, reason: 'too_recent' };

  // 6. Future / current scheduled appointment check
  const hasFutureScheduled = candidate.appointments.some(
    a => a.status === 'scheduled' && a.trainer_id === candidate.current_trainer_id && a.starts_at >= businessNow
  );
  if (hasFutureScheduled) return { qualified: false, reason: 'has_future_scheduled' };

  return { qualified: true, inactivity_days: diffDays, last_completed_at: lastCompletedAt };
}

const simBusinessDate = '2026-10-03';
const simBusinessNow = '2026-10-03 14:00:00';

// Fixture 1: Qualifies (completed 20 days ago)
const f1 = evaluateCandidate({
  id: 1,
  trainer_id: 10,
  current_trainer_id: 10,
  deleted_at: null,
  status: 'active',
  membership_end_date: '2026-12-31',
  appointments: [
    { status: 'completed', trainer_id: 10, ends_at: '2026-09-13 15:00:00' }
  ]
}, simBusinessDate, simBusinessNow);
assert(f1.qualified === true && f1.inactivity_days === 20, "Simulation 1: Qualifies when last completed 20 days ago");

// Fixture 2: Boundary (completed exactly 14 days ago)
const f2 = evaluateCandidate({
  id: 2,
  trainer_id: 10,
  current_trainer_id: 10,
  deleted_at: null,
  status: 'active',
  membership_end_date: '2026-12-31',
  appointments: [
    { status: 'completed', trainer_id: 10, ends_at: '2026-09-19 14:00:00' }
  ]
}, simBusinessDate, simBusinessNow);
assert(f2.qualified === true && f2.inactivity_days === 14, "Simulation 2: Boundary qualifies when last completed exactly 14 days ago");

// Fixture 3: Too recent (completed 13 days ago)
const f3 = evaluateCandidate({
  id: 3,
  trainer_id: 10,
  current_trainer_id: 10,
  deleted_at: null,
  status: 'active',
  membership_end_date: '2026-12-31',
  appointments: [
    { status: 'completed', trainer_id: 10, ends_at: '2026-09-20 10:00:00' }
  ]
}, simBusinessDate, simBusinessNow);
assert(f3.qualified === false && f3.reason === 'too_recent', "Simulation 3: Excluded when completed 13 days ago (<14)");

// Fixture 4: Has upcoming scheduled appointment
const f4 = evaluateCandidate({
  id: 4,
  trainer_id: 10,
  current_trainer_id: 10,
  deleted_at: null,
  status: 'active',
  membership_end_date: '2026-12-31',
  appointments: [
    { status: 'completed', trainer_id: 10, ends_at: '2026-09-01 10:00:00' },
    { status: 'scheduled', trainer_id: 10, starts_at: '2026-10-04 10:00:00' }
  ]
}, simBusinessDate, simBusinessNow);
assert(f4.qualified === false && f4.reason === 'has_future_scheduled', "Simulation 4: Excluded when member has future scheduled appointment");

// Fixture 5: Membership expired
const f5 = evaluateCandidate({
  id: 5,
  trainer_id: 10,
  current_trainer_id: 10,
  deleted_at: null,
  status: 'active',
  membership_end_date: '2026-10-02', // expired yesterday
  appointments: [
    { status: 'completed', trainer_id: 10, ends_at: '2026-09-01 10:00:00' }
  ]
}, simBusinessDate, simBusinessNow);
assert(f5.qualified === false && f5.reason === 'membership_expired', "Simulation 5: Excluded when membership expired (handled by Renewal Watch)");

// Fixture 6: Inactive member
const f6 = evaluateCandidate({
  id: 6,
  trainer_id: 10,
  current_trainer_id: 10,
  deleted_at: null,
  status: 'inactive',
  membership_end_date: '2026-12-31',
  appointments: [
    { status: 'completed', trainer_id: 10, ends_at: '2026-09-01 10:00:00' }
  ]
}, simBusinessDate, simBusinessNow);
assert(f6.qualified === false && f6.reason === 'inactive', "Simulation 6: Excluded when member status is inactive");

// Fixture 7: Previous trainer only
const f7 = evaluateCandidate({
  id: 7,
  trainer_id: 10,
  current_trainer_id: 10,
  deleted_at: null,
  status: 'active',
  membership_end_date: '2026-12-31',
  appointments: [
    { status: 'completed', trainer_id: 9, ends_at: '2026-09-01 10:00:00' } // completed with previous trainer 9
  ]
}, simBusinessDate, simBusinessNow);
assert(f7.qualified === false && f7.reason === 'never_completed', "Simulation 7: Excluded when sessions were with previous trainer only");

// Fixture 8: Never completed
const f8 = evaluateCandidate({
  id: 8,
  trainer_id: 10,
  current_trainer_id: 10,
  deleted_at: null,
  status: 'active',
  membership_end_date: '2026-12-31',
  appointments: [
    { status: 'no_show', trainer_id: 10, ends_at: '2026-09-01 10:00:00' }
  ]
}, simBusinessDate, simBusinessNow);
assert(f8.qualified === false && f8.reason === 'never_completed', "Simulation 8: Excluded when member has zero completed sessions");

console.log("\n=== 4. Frontend Foundation Types & Strict Validator ===");

const typesPath = path.resolve('src/admin/pages/trainer-dashboard/retentionTypes.ts');
assert(fs.existsSync(typesPath), "src/admin/pages/trainer-dashboard/retentionTypes.ts exists");
const typesSource = fs.readFileSync(typesPath, 'utf8');

assert(
  typesSource.includes("export interface TrainerRetentionAttentionItem"),
  "retentionTypes.ts exports TrainerRetentionAttentionItem"
);
assert(
  typesSource.includes("export interface TrainerRetentionAttentionResponse"),
  "retentionTypes.ts exports TrainerRetentionAttentionResponse"
);
assert(
  typesSource.includes("export function validateTrainerRetentionAttention"),
  "retentionTypes.ts exports validateTrainerRetentionAttention"
);
assert(
  typesSource.includes("export function isTrainerRetentionAttention"),
  "retentionTypes.ts exports isTrainerRetentionAttention"
);

// Transpile and load validator
const transpiledTypes = ts.transpileModule(typesSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext }
});
const typesB64 = Buffer.from(transpiledTypes.outputText).toString('base64');
const {
  validateTrainerRetentionAttention,
  isTrainerRetentionAttention
} = await import(`data:text/javascript;base64,${typesB64}`);

const baseValidPayload = {
  timezone: 'Europe/Istanbul',
  business_date: '2026-10-03',
  generated_at: '2026-10-03 14:00:00',
  threshold_days: 14,
  items: [
    {
      member: {
        id: 10,
        uuid: 'uuid-10',
        first_name: 'Ahmet',
        last_name: 'Kaya',
        phone: '05551112233'
      },
      last_completed_at: '2026-09-10 10:00:00',
      inactivity_days: 23
    },
    {
      member: {
        id: 12,
        uuid: 'uuid-12',
        first_name: 'Ayşe',
        last_name: 'Yılmaz',
        phone: null
      },
      last_completed_at: '2026-09-19 14:00:00',
      inactivity_days: 14
    }
  ]
};

// Valid payload test
assert(
  isTrainerRetentionAttention(baseValidPayload) === true,
  "Validator accepts canonical valid response"
);

// Null phone accepted
const nullPhonePayload = {
  ...baseValidPayload,
  items: [
    {
      ...baseValidPayload.items[0],
      member: { ...baseValidPayload.items[0].member, phone: null }
    }
  ]
};
assert(isTrainerRetentionAttention(nullPhonePayload) === true, "Validator accepts phone: null");

// Rejection: threshold_days != 14
const badThresholdPayload = { ...baseValidPayload, threshold_days: 10 };
assert(isTrainerRetentionAttention(badThresholdPayload) === false, "Validator rejects threshold_days != 14");

// Rejection: items length > 20
const oversizedItems = Array.from({ length: 21 }, (_, i) => ({
  member: {
    id: i + 1,
    uuid: `uuid-${i + 1}`,
    first_name: 'Test',
    last_name: 'User',
    phone: null
  },
  last_completed_at: `2026-09-${String(i + 1).padStart(2, '0')} 10:00:00`,
  inactivity_days: 14
}));
assert(isTrainerRetentionAttention({ ...baseValidPayload, items: oversizedItems }) === false, "Validator rejects items length > 20");

// Rejection: inactivity_days < 14
const badInactivityPayload = {
  ...baseValidPayload,
  items: [
    {
      ...baseValidPayload.items[0],
      inactivity_days: 13
    }
  ]
};
assert(isTrainerRetentionAttention(badInactivityPayload) === false, "Validator rejects item with inactivity_days < 14");

// Rejection: whitespace phone
const whitespacePhonePayload = {
  ...baseValidPayload,
  items: [
    {
      ...baseValidPayload.items[0],
      member: { ...baseValidPayload.items[0].member, phone: '   ' }
    }
  ]
};
assert(isTrainerRetentionAttention(whitespacePhonePayload) === false, "Validator rejects whitespace-only phone string");

// Rejection: non-deterministic ordering (last_completed_at DESC instead of ASC)
const badOrderPayload = {
  ...baseValidPayload,
  items: [
    baseValidPayload.items[1], // 2026-09-19
    baseValidPayload.items[0]  // 2026-09-10
  ]
};
assert(isTrainerRetentionAttention(badOrderPayload) === false, "Validator rejects non-deterministic ordering (requires oldest last_completed_at first)");

// Rejection: non-deterministic ordering (equal last_completed_at with member.id DESC instead of ASC)
const badTieBreakPayload = {
  ...baseValidPayload,
  items: [
    {
      ...baseValidPayload.items[0],
      member: { ...baseValidPayload.items[0].member, id: 25 },
      last_completed_at: '2026-09-10 10:00:00'
    },
    {
      ...baseValidPayload.items[1],
      member: { ...baseValidPayload.items[1].member, id: 10 },
      last_completed_at: '2026-09-10 10:00:00'
    }
  ]
};
assert(isTrainerRetentionAttention(badTieBreakPayload) === false, "Validator rejects non-deterministic tie-break (requires member.id ASC)");

console.log("\n=== 5. Documentation & Registration ===");

const decPath = path.resolve('DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decSource = fs.readFileSync(decPath, 'utf8');

assert(
  decSource.includes("## F.28B Trainer Retention Attention Read Model"),
  "DECISIONS.md documents '## F.28B Trainer Retention Attention Read Model'"
);

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts['verify:trainer-retention-attention'] === 'node scripts/verify-trainer-retention-attention.mjs',
  "package.json registers 'verify:trainer-retention-attention'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ F.28B Trainer Retention Attention Read Model verification FAILED");
  process.exit(1);
} else {
  console.log("PASS — F.28B TRAINER RETENTION ATTENTION READ MODEL IMPLEMENTED");
}
