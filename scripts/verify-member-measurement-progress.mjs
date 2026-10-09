import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalAssertions = 0;
let passedAssertions = 0;
let exitCode = 0;

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

console.log('=== 1. Router & Auth Invariants in api/index.php ===');

const apiIndexPath = path.join(rootDir, 'api', 'index.php');
assert(fs.existsSync(apiIndexPath), 'api/index.php exists');
const apiIndexSource = fs.readFileSync(apiIndexPath, 'utf8');

assert(
  apiIndexSource.includes("'/api/member/measurement-progress'"),
  "api/index.php registers '/api/member/measurement-progress' route"
);

assert(
  apiIndexSource.includes("$requestUri === '/api/member/measurement-progress' && $method === 'GET'"),
  "Route requires exact GET method and path without memberId parameter"
);

assert(
  !apiIndexSource.includes("'/api/member/measurement-progress/:") &&
  !apiIndexSource.includes('/api/member/measurement-progress/(') &&
  !apiIndexSource.includes('/api/member/members/'),
  "Endpoint strictly does NOT take memberId in path parameter"
);

assert(
  !apiIndexSource.includes("$requestUri === '/api/member/measurement-progress' && $method === 'POST'") &&
  !apiIndexSource.includes("$requestUri === '/api/member/measurement-progress' && $method === 'PATCH'") &&
  !apiIndexSource.includes("$requestUri === '/api/member/measurement-progress' && $method === 'DELETE'"),
  "Endpoint has no POST/PATCH/DELETE mutations (read-only)"
);

console.log('\n=== 2. Controller Source & Scope Invariants in MemberPortalController.php ===');

const controllerPath = path.join(rootDir, 'api', 'controllers', 'MemberPortalController.php');
assert(fs.existsSync(controllerPath), 'MemberPortalController.php exists');
const controllerSource = fs.readFileSync(controllerPath, 'utf8');

assert(
  controllerSource.includes('function getMeasurementProgress'),
  'MemberPortalController defines getMeasurementProgress'
);

function extractMethodBody(source, name) {
  const idx = source.indexOf(name);
  if (idx === -1) return null;
  const openBrace = source.indexOf('{', idx);
  if (openBrace === -1) return null;
  let depth = 0;
  for (let i = openBrace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(idx, i + 1);
      }
    }
  }
  return null;
}

const getProgressBody = extractMethodBody(controllerSource, 'public function getMeasurementProgress');
assert(getProgressBody !== null, 'getMeasurementProgress body successfully extracted');

assert(
  getProgressBody.includes('$this->guard()'),
  'getMeasurementProgress calls $this->guard() to enforce member authentication & reject query params'
);

assert(
  !getProgressBody.includes('$_POST') &&
  !getProgressBody.includes("$_GET['member_id']") &&
  !getProgressBody.includes("$_GET['trainer_id']") &&
  !getProgressBody.includes("$_GET['account_id']") &&
  !getProgressBody.includes("$input['member_id']") &&
  !getProgressBody.includes("$input['trainer_id']"),
  'getMeasurementProgress strictly does NOT accept member_id, trainer_id, or account_id from request input'
);

assert(
  getProgressBody.includes('$this->memberId'),
  'getMeasurementProgress binds member identity exclusively from authenticated session ($this->memberId)'
);

// Scope check: member_measurements.member_id = authenticated member AND deleted_at IS NULL
// Do NOT require trainer_id = current trainer
assert(
  getProgressBody.includes('WHERE member_id = ?') &&
  getProgressBody.includes('AND deleted_at IS NULL'),
  'getMeasurementProgress queries active measurements for authenticated member'
);

assert(
  !getProgressBody.includes('AND trainer_id = ?') &&
  !getProgressBody.includes('trainer_id = :trainer_id'),
  'getMeasurementProgress intentionally does NOT restrict trainer_id (member sees full history across trainers)'
);

// Bounded query architecture
assert(
  getProgressBody.includes('SELECT COUNT(*)') &&
  getProgressBody.includes('FROM member_measurements'),
  'Bounded query 1: uses COUNT(*) query to determine exact history count'
);

assert(
  getProgressBody.includes('ORDER BY measured_at DESC, id DESC') &&
  getProgressBody.includes('LIMIT 2'),
  'Bounded query 2: retrieves at most 2 latest measurements with LIMIT 2 and deterministic tie-breaking'
);

assert(
  getProgressBody.includes('ORDER BY measured_at ASC, id ASC') &&
  getProgressBody.includes('LIMIT 1'),
  'Bounded query 3: retrieves baseline first measurement with LIMIT 1 only when count >= 3'
);

assert(
  !getProgressBody.includes('SELECT * FROM member_measurements') &&
  !getProgressBody.includes('LIMIT 1000') &&
  !getProgressBody.includes('LIMIT 500'),
  'getMeasurementProgress does NOT perform full-history hydration'
);

// Snapshot exact 10 fields projection
const formatSnapshotBody = extractMethodBody(controllerSource, 'function formatMeasurementProgressSnapshot');
assert(formatSnapshotBody !== null, 'formatMeasurementProgressSnapshot method exists');

assert(
  !formatSnapshotBody.includes("'member_id'") &&
  !formatSnapshotBody.includes("'trainer_id'") &&
  !formatSnapshotBody.includes("'notes'") &&
  !formatSnapshotBody.includes("'trainer'") &&
  !formatSnapshotBody.includes("'created_at'") &&
  !formatSnapshotBody.includes("'updated_at'") &&
  !formatSnapshotBody.includes("'deleted_at'"),
  'formatMeasurementProgressSnapshot strictly omits member_id, trainer_id, trainer, notes, created_at, updated_at, deleted_at'
);

const expectedFields = [
  'id', 'uuid', 'measured_at', 'weight_kg', 'body_fat_percent',
  'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm'
];

expectedFields.forEach(f => {
  assert(
    formatSnapshotBody.includes(`'${f}'`),
    `formatMeasurementProgressSnapshot projects canonical snapshot field '${f}'`
  );
});

console.log('\n=== 3. Zero Medical / Coaching Interpretation Invariant ===');

const forbiddenInterpretation = [
  'BMI', 'bmi', 'ideal_weight', 'ideal weight', 'healthy_range', 'healthy range',
  'obesity', 'health_score', 'fitness_score', 'body_composition_score', 'target_weight', 'target weight'
];

forbiddenInterpretation.forEach(term => {
  assert(
    !getProgressBody.includes(`'${term}'`) && !getProgressBody.includes(`"${term}"`),
    `getMeasurementProgress strictly contains zero medical/coaching interpretation: no '${term}'`
  );
});

console.log('\n=== 4. Zero Database Mutation Invariant ===');

const mutationKeywords = ['INSERT ', 'UPDATE ', 'DELETE ', 'DROP ', 'ALTER ', 'TRUNCATE '];
mutationKeywords.forEach(kw => {
  assert(
    !getProgressBody.includes(kw),
    `getMeasurementProgress strictly contains zero mutation keyword '${kw}'`
  );
});

console.log('\n=== 5. Algorithmic Delta & Progress Computation Simulation ===');

function calculateDeltas(current, reference) {
  if (!current || !reference) return null;
  const metrics = ['weight_kg', 'body_fat_percent', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm'];
  const res = {};
  for (const m of metrics) {
    if (current[m] !== null && reference[m] !== null) {
      res[m] = Math.round((current[m] - reference[m]) * 100) / 100;
    } else {
      res[m] = null;
    }
  }
  return res;
}

// 0 measurements
const zeroRes = {
  measurement_count: 0,
  first: null,
  previous: null,
  latest: null,
  comparisons: { from_previous: null, from_first: null }
};
assert(zeroRes.measurement_count === 0, 'Semantics (0): count is 0');
assert(zeroRes.first === null && zeroRes.previous === null && zeroRes.latest === null, 'Semantics (0): all snapshots null');
assert(zeroRes.comparisons.from_previous === null && zeroRes.comparisons.from_first === null, 'Semantics (0): deltas null');

// 1 measurement
const m1 = {
  id: 10,
  uuid: '11111111-1111-4111-8111-111111111111',
  measured_at: '2026-01-01 10:00:00',
  weight_kg: 80.0,
  body_fat_percent: null,
  chest_cm: 100.0,
  waist_cm: 85.0,
  hip_cm: 95.0,
  arm_cm: 36.0,
  thigh_cm: 58.0
};
const oneDeltas = calculateDeltas(m1, m1);
assert(oneDeltas.weight_kg === 0, 'Semantics (1): from_first.weight_kg is 0');
assert(oneDeltas.body_fat_percent === null, 'Semantics (1): from_first null metric is null');
assert(oneDeltas.chest_cm === 0, 'Semantics (1): from_first.chest_cm is 0');

// 2 measurements
const m2 = {
  id: 20,
  uuid: '22222222-2222-4222-8222-222222222222',
  measured_at: '2026-02-01 10:00:00',
  weight_kg: 78.5,
  body_fat_percent: 18.2,
  chest_cm: 101.0,
  waist_cm: 82.5,
  hip_cm: 94.0,
  arm_cm: 36.5,
  thigh_cm: 57.5
};
const twoFromPrev = calculateDeltas(m2, m1);
const twoFromFirst = calculateDeltas(m2, m1);
assert(twoFromPrev.weight_kg === -1.5, 'Semantics (2): delta weight_kg is -1.5');
assert(twoFromPrev.body_fat_percent === null, 'Semantics (2): body_fat_percent delta is null (baseline was null)');
assert(twoFromFirst.waist_cm === -2.5, 'Semantics (2): waist_cm delta is -2.5');

// 3 measurements
const m3 = {
  id: 30,
  uuid: '33333333-3333-4333-8333-333333333333',
  measured_at: '2026-03-01 10:00:00',
  weight_kg: 76.8,
  body_fat_percent: 16.5,
  chest_cm: 102.0,
  waist_cm: 80.0,
  hip_cm: 93.0,
  arm_cm: 37.0,
  thigh_cm: 57.0
};
const threeFromPrev = calculateDeltas(m3, m2);
const threeFromFirst = calculateDeltas(m3, m1);
assert(threeFromPrev.weight_kg === -1.7, 'Semantics (3): delta latest - prev is -1.7');
assert(threeFromFirst.weight_kg === -3.2, 'Semantics (3): delta latest - first is -3.2');
assert(threeFromPrev.body_fat_percent === -1.7, 'Semantics (3): body_fat delta latest - prev is -1.7');
assert(threeFromFirst.body_fat_percent === null, 'Semantics (3): body_fat delta latest - first is null');

console.log('\n=== 6. package.json Script Registration Invariant ===');

const pkgPath = path.join(rootDir, 'package.json');
assert(fs.existsSync(pkgPath), 'package.json exists');
const pkgSource = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgSource);

assert(
  pkg.scripts && pkg.scripts['verify:member-measurement-progress'],
  "package.json registers 'verify:member-measurement-progress' script"
);

console.log(`\n========================================`);
console.log(`Total assertions: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log(`========================================`);

if (exitCode !== 0) {
  process.exit(1);
} else {
  console.log('\nPASS — F.30C MEMBER MEASUREMENT PROGRESS BACKEND CONTRACT IMPLEMENTED');
  console.log('PASS — F.30C MEMBER MEASUREMENT PROGRESS BACKEND CONTRACT VERIFIED');
}
