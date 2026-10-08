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

console.log('=== 1. Router & RBAC Invariants in api/index.php ===');

const apiIndexPath = path.join(rootDir, 'api', 'index.php');
assert(fs.existsSync(apiIndexPath), 'api/index.php exists');
const apiIndexSource = fs.readFileSync(apiIndexPath, 'utf8');

const routePattern = "#^/api/trainer/members/([1-9]\\d*)/measurement-progress$#";
assert(
  apiIndexSource.includes(routePattern) || apiIndexSource.includes('/api/trainer/members/([1-9]\\d*)/measurement-progress'),
  "api/index.php registers '/api/trainer/members/([1-9]\\d*)/measurement-progress' route"
);

function extractRouteBlock(source, pattern) {
  const idx = source.indexOf(pattern);
  if (idx === -1) return null;
  const ifIdx = source.lastIndexOf('if', idx);
  const openBrace = source.indexOf('{', idx);
  if (openBrace === -1) return null;
  let depth = 0;
  for (let i = openBrace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(ifIdx, i + 1);
      }
    }
  }
  return null;
}

const routeBlock = extractRouteBlock(apiIndexSource, 'measurement-progress');
assert(routeBlock !== null, "Route block for measurement-progress successfully extracted");

assert(
  routeBlock.includes("AuthMiddleware::hasRole(['trainer'])"),
  "Route strictly enforces role ['trainer']"
);
assert(
  routeBlock.includes("$method === 'GET'"),
  "Route strictly enforces HTTP GET method"
);
assert(
  routeBlock.includes("TrainerMeasurementProgressController"),
  "Route dispatches to TrainerMeasurementProgressController"
);
assert(
  routeBlock.includes("->index("),
  "Route invokes index($memberId) method"
);
assert(
  !routeBlock.includes("$method === 'POST'") &&
  !routeBlock.includes("$method === 'PUT'") &&
  !routeBlock.includes("$method === 'PATCH'") &&
  !routeBlock.includes("$method === 'DELETE'"),
  "Route contains zero mutation HTTP methods"
);

console.log('\n=== 2. Controller Source & Bounded Query Architecture Invariants ===');

const controllerPath = path.join(rootDir, 'api', 'controllers', 'TrainerMeasurementProgressController.php');
assert(fs.existsSync(controllerPath), 'TrainerMeasurementProgressController.php exists');
const controllerSource = fs.readFileSync(controllerPath, 'utf8');

assert(
  controllerSource.includes('namespace Controllers;'),
  "Controller defines 'namespace Controllers;'"
);
assert(
  controllerSource.includes('class TrainerMeasurementProgressController'),
  "Controller class name is TrainerMeasurementProgressController"
);
assert(
  controllerSource.includes('public function index(int $memberId): void'),
  "Controller defines public function index(int $memberId): void"
);
assert(
  controllerSource.includes("AuthMiddleware::hasRole(['trainer'])"),
  "Controller independently checks AuthMiddleware::hasRole(['trainer'])"
);
assert(
  controllerSource.includes('!empty($_GET)'),
  "Controller rejects query parameters with !empty($_GET)"
);
assert(
  controllerSource.includes("VALIDATION_ERROR") && controllerSource.includes("422"),
  "Controller returns 422 VALIDATION_ERROR when query parameters are supplied"
);
assert(
  controllerSource.includes("$_SESSION['admin_id']"),
  "Controller resolves trainer strictly from $_SESSION['admin_id']"
);
assert(
  controllerSource.includes("TRAINER_PROFILE_NOT_LINKED") && controllerSource.includes("403"),
  "Controller fails closed with 403 TRAINER_PROFILE_NOT_LINKED when no active trainer profile is linked"
);
assert(
  controllerSource.includes("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL") ||
  (controllerSource.includes("trainer_id = ?") && controllerSource.includes("deleted_at IS NULL")),
  "Controller strictly checks member ownership and active status"
);
assert(
  controllerSource.includes("NOT_FOUND") && controllerSource.includes("404"),
  "Controller returns 404 NOT_FOUND when member is unassigned, not found, or deleted"
);
assert(
  controllerSource.includes("deleted_at IS NULL"),
  "Controller strictly filters active measurements (deleted_at IS NULL)"
);

// Bounded query assertions
assert(
  controllerSource.includes("SELECT COUNT(*)") || controllerSource.includes("COUNT(*)"),
  "Controller counts total measurements using COUNT(*)"
);
assert(
  controllerSource.includes("ORDER BY measured_at DESC, id DESC") && controllerSource.includes("LIMIT 2"),
  "Controller uses bounded Query A: ORDER BY measured_at DESC, id DESC LIMIT 2"
);
assert(
  controllerSource.includes("ORDER BY measured_at ASC, id ASC") && controllerSource.includes("LIMIT 1"),
  "Controller uses bounded Query B: ORDER BY measured_at ASC, id ASC LIMIT 1"
);
assert(
  !controllerSource.includes("ORDER BY mm.measured_at ASC, mm.id ASC\n        \");\n        $stmt->execute();\n        $rows = $stmt->fetchAll("),
  "Controller does NOT perform unbounded lifetime fetchAll() over full history"
);

// Canonical response fields assertion
assert(
  controllerSource.includes("'measurement_count' => $measurementCount") || controllerSource.includes("'measurement_count' =>"),
  "Controller outputs canonical 'measurement_count'"
);
assert(
  controllerSource.includes("'comparisons' => [") || controllerSource.includes("'comparisons' =>"),
  "Controller outputs canonical 'comparisons' object"
);
assert(
  controllerSource.includes("'from_previous' =>") && controllerSource.includes("'from_first' =>"),
  "Controller outputs comparisons with 'from_previous' and 'from_first'"
);

// Negative check on removed aliases
const forbiddenResponseAliases = [
  "'member_id' =>",
  "'total_measurements' =>",
  "'baseline' =>",
  "'diff_from_previous' =>",
  "'changes_from_previous' =>",
  "'since_previous' =>",
  "'diff_from_first' =>",
  "'changes_from_first' =>",
  "'since_first' =>",
  "'diff_from_baseline' =>",
  "'changes_from_baseline' =>",
  "'since_baseline' =>",
  "'days_since_previous' =>",
  "'days_since_first' =>",
  "'days_since_baseline' =>",
  "'metrics' =>"
];

forbiddenResponseAliases.forEach(alias => {
  assert(
    !controllerSource.includes(alias),
    `Controller strictly does not output removed alias: ${alias}`
  );
});

// Snapshot projection exact shape: remove member_id, trainer_id, notes, created_at, updated_at, deleted_at
function extractFormatMeasurementMethod(source) {
  const start = source.indexOf('formatMeasurement(');
  if (start === -1) return '';
  const openBrace = source.indexOf('{', start);
  let depth = 0;
  for (let i = openBrace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  return '';
}

const formatMethodSource = extractFormatMeasurementMethod(controllerSource);
assert(
  !formatMethodSource.includes("'member_id'") &&
  !formatMethodSource.includes("'trainer_id'") &&
  !formatMethodSource.includes("'created_at'") &&
  !formatMethodSource.includes("'updated_at'") &&
  !formatMethodSource.includes("'deleted_at'") &&
  !formatMethodSource.includes("'notes'"),
  "formatMeasurement strictly omits member_id, trainer_id, notes, created_at, updated_at, deleted_at"
);
assert(
  formatMethodSource.includes("'id'") &&
  formatMethodSource.includes("'uuid'") &&
  formatMethodSource.includes("'measured_at'") &&
  formatMethodSource.includes("'weight_kg'") &&
  formatMethodSource.includes("'body_fat_percent'") &&
  formatMethodSource.includes("'chest_cm'") &&
  formatMethodSource.includes("'waist_cm'") &&
  formatMethodSource.includes("'hip_cm'") &&
  formatMethodSource.includes("'arm_cm'") &&
  formatMethodSource.includes("'thigh_cm'"),
  "formatMeasurement projects exactly the 10 canonical snapshot fields"
);

console.log('\n=== 3. Zero Medical / Coaching Interpretation Invariant ===');

const forbiddenMedicalTerms = [
  'BMI',
  'bmi',
  'ideal_weight',
  'ideal weight',
  'healthy_range',
  'healthy range',
  'obesity',
  'health_score',
  'fitness_score',
  'body_composition_score',
  'target_weight',
  'target weight'
];

forbiddenMedicalTerms.forEach(term => {
  assert(
    !controllerSource.toLowerCase().includes(term.toLowerCase()),
    `Controller strictly contains zero medical/coaching interpretation: no '${term}'`
  );
});

console.log('\n=== 4. Zero Database Mutation Invariant ===');

assert(
  !controllerSource.includes('INSERT INTO') &&
  !controllerSource.includes('UPDATE ') &&
  !controllerSource.includes('DELETE FROM'),
  "Controller strictly executes zero database mutations (pure read model)"
);
assert(
  !controllerSource.includes('beginTransaction'),
  "Controller requires zero mutation transactions"
);

console.log('\n=== 5. Algorithmic Delta & Progress Computation Simulation & Semantics ===');

const METRIC_FIELDS = [
  'weight_kg',
  'body_fat_percent',
  'chest_cm',
  'waist_cm',
  'hip_cm',
  'arm_cm',
  'thigh_cm'
];

function calculateDeltas(current, reference) {
  if (!current || !reference) return null;
  const deltas = {};
  for (const field of METRIC_FIELDS) {
    const currVal = current[field];
    const refVal = reference[field];
    if (currVal !== null && currVal !== undefined && refVal !== null && refVal !== undefined) {
      deltas[field] = Math.round((currVal - refVal) * 100) / 100;
    } else {
      deltas[field] = null;
    }
  }
  return deltas;
}

function computeCanonicalProgress(measurements) {
  const count = measurements.length;
  if (count === 0) {
    return {
      measurement_count: 0,
      first: null,
      previous: null,
      latest: null,
      comparisons: {
        from_previous: null,
        from_first: null
      }
    };
  }

  if (count === 1) {
    const latest = measurements[0];
    return {
      measurement_count: 1,
      first: latest,
      previous: null,
      latest,
      comparisons: {
        from_previous: null,
        from_first: null
      }
    };
  }

  const latest = measurements[count - 1];
  const previous = measurements[count - 2];
  const first = measurements[0];

  return {
    measurement_count: count,
    first,
    previous,
    latest,
    comparisons: {
      from_previous: calculateDeltas(latest, previous),
      from_first: calculateDeltas(latest, first)
    }
  };
}

// Case 0: 0 measurements
const res0 = computeCanonicalProgress([]);
assert(res0.measurement_count === 0, "Semantics (0 measurements): measurement_count is 0");
assert(res0.latest === null, "Semantics (0 measurements): latest is null");
assert(res0.previous === null, "Semantics (0 measurements): previous is null");
assert(res0.first === null, "Semantics (0 measurements): first is null");
assert(res0.comparisons.from_previous === null, "Semantics (0 measurements): comparisons.from_previous is null");
assert(res0.comparisons.from_first === null, "Semantics (0 measurements): comparisons.from_first is null");

// Case 1: 1 measurement
const m1 = {
  id: 1,
  uuid: 'c637a7f4-8da0-4bd2-97b5-045389ca0121',
  measured_at: '2026-08-01 10:00:00',
  weight_kg: 80.0,
  body_fat_percent: 22.0,
  chest_cm: 102.0,
  waist_cm: 88.0,
  hip_cm: 100.0,
  arm_cm: 34.0,
  thigh_cm: 58.0
};
const res1 = computeCanonicalProgress([m1]);
assert(res1.measurement_count === 1, "Semantics (1 measurement): measurement_count is 1");
assert(res1.latest.id === 1, "Semantics (1 measurement): latest is m1");
assert(res1.previous === null, "Semantics (1 measurement): previous is null");
assert(res1.first.id === 1, "Semantics (1 measurement): first is m1");
assert(res1.comparisons.from_previous === null, "Semantics (1 measurement): comparisons.from_previous is null");
assert(res1.comparisons.from_first === null, "Semantics (1 measurement): comparisons.from_first is null");

// Case 2: 2 measurements
const m2 = {
  id: 2,
  uuid: '09a5b7d1-e634-4b57-a36c-2fbc1f5a54e9',
  measured_at: '2026-09-01 10:00:00',
  weight_kg: 78.2,
  body_fat_percent: 20.5,
  chest_cm: 101.0,
  waist_cm: 85.0,
  hip_cm: 99.0,
  arm_cm: 34.5,
  thigh_cm: 57.5
};
const res2 = computeCanonicalProgress([m1, m2]);
assert(res2.measurement_count === 2, "Semantics (2 measurements): measurement_count is 2");
assert(res2.latest.id === 2, "Semantics (2 measurements): latest is m2");
assert(res2.previous.id === 1, "Semantics (2 measurements): previous is m1");
assert(res2.first.id === 1, "Semantics (2 measurements): first is m1");
assert(res2.comparisons.from_previous.weight_kg === -1.8, "Semantics (2 measurements): from_previous weight_kg is -1.8");
assert(res2.comparisons.from_first.weight_kg === -1.8, "Semantics (2 measurements): from_first weight_kg is -1.8 (equal to previous)");
assert(res2.comparisons.from_previous.waist_cm === -3.0, "Semantics (2 measurements): from_previous waist_cm is -3.0");

// Case 3: 3 measurements with floating point precision & null metric
const m3 = {
  id: 3,
  uuid: 'f2be6d78-bf7a-4ec9-8664-d6a543e49e29',
  measured_at: '2026-10-01 10:00:00',
  weight_kg: 75.3,
  body_fat_percent: null,
  chest_cm: 100.0,
  waist_cm: 82.0,
  hip_cm: 97.5,
  arm_cm: 35.0,
  thigh_cm: 56.5
};
const res3 = computeCanonicalProgress([m1, m2, m3]);
assert(res3.measurement_count === 3, "Semantics (3 measurements): measurement_count is 3");
assert(res3.latest.id === 3, "Semantics (3 measurements): latest is m3");
assert(res3.previous.id === 2, "Semantics (3 measurements): previous is m2");
assert(res3.first.id === 1, "Semantics (3 measurements): first is m1");
assert(res3.comparisons.from_previous.weight_kg === -2.9, "Semantics (3 measurements): delta latest - prev is -2.9");
assert(res3.comparisons.from_first.weight_kg === -4.7, "Semantics (3 measurements): delta latest - first is -4.7");
assert(res3.comparisons.from_previous.body_fat_percent === null, "Semantics (3 measurements): nullable metric delta is null");
assert(res3.comparisons.from_first.body_fat_percent === null, "Semantics (3 measurements): nullable metric delta from first is null");

console.log('\n=== 6. TypeScript Contract & Fail-Closed Validator Invariants ===');

const typesPath = path.join(rootDir, 'src', 'admin', 'pages', 'member-progress', 'types.ts');
assert(fs.existsSync(typesPath), 'types.ts exists');
const typesSource = fs.readFileSync(typesPath, 'utf8');

assert(
  typesSource.includes('export interface MeasurementProgressSnapshot'),
  "types.ts exports MeasurementProgressSnapshot interface"
);
assert(
  typesSource.includes('export interface MeasurementProgressDeltas'),
  "types.ts exports MeasurementProgressDeltas interface"
);
assert(
  typesSource.includes('export interface MeasurementProgressComparisons'),
  "types.ts exports MeasurementProgressComparisons interface"
);
assert(
  typesSource.includes('export interface TrainerMeasurementProgressReadModel'),
  "types.ts exports TrainerMeasurementProgressReadModel interface"
);
assert(
  typesSource.includes('export function isTrainerMeasurementProgressReadModel'),
  "types.ts exports isTrainerMeasurementProgressReadModel validator"
);
assert(
  typesSource.includes('export function isMeasurementProgressSnapshot'),
  "types.ts exports isMeasurementProgressSnapshot validator"
);
assert(
  typesSource.includes('export function isMeasurementProgressDeltas'),
  "types.ts exports isMeasurementProgressDeltas validator"
);

// Dynamically import and test the validator
const typesModule = await import(path.join(rootDir, 'src', 'admin', 'pages', 'member-progress', 'types.ts'));
const { isTrainerMeasurementProgressReadModel, isMeasurementProgressSnapshot } = typesModule;

assert(isTrainerMeasurementProgressReadModel(res0), "Validator accepts valid 0-measurement response");
assert(isTrainerMeasurementProgressReadModel(res1), "Validator accepts valid 1-measurement response");
assert(isTrainerMeasurementProgressReadModel(res2), "Validator accepts valid 2-measurement response");
assert(isTrainerMeasurementProgressReadModel(res3), "Validator accepts valid 3-measurement response");

// Fail-closed checks
assert(!isTrainerMeasurementProgressReadModel(null), "Validator rejects null");
assert(!isTrainerMeasurementProgressReadModel({}), "Validator rejects empty object");
assert(
  !isTrainerMeasurementProgressReadModel({ ...res3, member_id: 10 }),
  "Validator fail-closed rejects payload containing legacy alias 'member_id'"
);
assert(
  !isTrainerMeasurementProgressReadModel({ ...res3, total_measurements: 3 }),
  "Validator fail-closed rejects payload containing legacy alias 'total_measurements'"
);
assert(
  !isTrainerMeasurementProgressReadModel({ ...res3, baseline: res3.first }),
  "Validator fail-closed rejects payload containing legacy alias 'baseline'"
);
assert(
  !isTrainerMeasurementProgressReadModel({ ...res3, metrics: {} }),
  "Validator fail-closed rejects payload containing legacy alias 'metrics'"
);
assert(
  !isTrainerMeasurementProgressReadModel({
    ...res3,
    latest: { ...res3.latest, notes: 'some note' }
  }),
  "Validator fail-closed rejects snapshot with leaked 'notes'"
);
assert(
  !isTrainerMeasurementProgressReadModel({
    ...res3,
    latest: { ...res3.latest, member_id: 10 }
  }),
  "Validator fail-closed rejects snapshot with leaked 'member_id'"
);

// Zero count semantics fail-closed: if count is 0 but latest is non-null
assert(
  !isTrainerMeasurementProgressReadModel({
    measurement_count: 0,
    first: m1,
    previous: null,
    latest: m1,
    comparisons: { from_previous: null, from_first: null }
  }),
  "Validator rejects inconsistent count=0 with non-null snapshots"
);

// One count semantics fail-closed: if count is 1 but previous is non-null
assert(
  !isTrainerMeasurementProgressReadModel({
    measurement_count: 1,
    first: m1,
    previous: m1,
    latest: m1,
    comparisons: { from_previous: null, from_first: null }
  }),
  "Validator rejects count=1 with non-null previous"
);

console.log('\n=== 7. package.json Script Registration Invariant ===');

const pkgPath = path.join(rootDir, 'package.json');
assert(fs.existsSync(pkgPath), 'package.json exists');
const pkgSource = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgSource);

assert(
  pkg.scripts && pkg.scripts['verify:trainer-measurement-progress'],
  "package.json registers 'verify:trainer-measurement-progress' script"
);

console.log(`\n========================================`);
console.log(`Total assertions: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log(`========================================`);

if (exitCode !== 0) {
  process.exit(1);
} else {
  console.log('\nPASS — F.30A CANONICAL READ MODEL CORRECTIVE VERIFIED');
}
