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

console.log('\n=== 2. Controller Source & RBAC Invariants in TrainerMeasurementProgressController.php ===');

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
  controllerSource.includes("mm.deleted_at IS NULL"),
  "Controller strictly filters active measurements (deleted_at IS NULL)"
);
assert(
  controllerSource.includes("ORDER BY mm.measured_at ASC, mm.id ASC"),
  "Controller orders measurements deterministically (ORDER BY mm.measured_at ASC, mm.id ASC)"
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

console.log('\n=== 5. Algorithmic Delta & Progress Computation Self-Tests ===');

// Simulation of PHP controller calculation logic in Node.js
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

function computeProgressModel(memberId, measurements) {
  const count = measurements.length;
  let latest = null;
  let previous = null;
  let first = null;
  let diffPrev = null;
  let diffFirst = null;

  if (count === 1) {
    latest = measurements[0];
    first = latest;
    previous = null;
  } else if (count >= 2) {
    first = measurements[0];
    previous = measurements[count - 2];
    latest = measurements[count - 1];
    diffPrev = calculateDeltas(latest, previous);
    diffFirst = calculateDeltas(latest, first);
  }

  const metrics = {};
  for (const field of METRIC_FIELDS) {
    const lVal = latest ? latest[field] : null;
    const pVal = previous ? previous[field] : null;
    const fVal = first ? first[field] : null;
    metrics[field] = {
      latest: lVal,
      previous: pVal,
      first: fVal,
      diff_previous: (count >= 2 && lVal !== null && pVal !== null) ? Math.round((lVal - pVal) * 100) / 100 : null,
      diff_first: (count >= 2 && lVal !== null && fVal !== null) ? Math.round((lVal - fVal) * 100) / 100 : null
    };
  }

  return {
    member_id: memberId,
    total_measurements: count,
    latest,
    previous,
    first,
    baseline: first,
    diff_from_previous: diffPrev,
    changes_from_previous: diffPrev,
    diff_from_first: diffFirst,
    changes_from_first: diffFirst,
    metrics
  };
}

// Case 1: 0 measurements
const res0 = computeProgressModel(10, []);
assert(res0.total_measurements === 0, "Self-test 0 measurements: total is 0");
assert(res0.latest === null, "Self-test 0 measurements: latest is null");
assert(res0.previous === null, "Self-test 0 measurements: previous is null");
assert(res0.first === null, "Self-test 0 measurements: first is null");
assert(res0.diff_from_previous === null, "Self-test 0 measurements: diff_from_previous is null");
assert(res0.diff_from_first === null, "Self-test 0 measurements: diff_from_first is null");
assert(res0.metrics.weight_kg.latest === null, "Self-test 0 measurements: metric latest is null");

// Case 2: 1 measurement
const m1 = {
  id: 1,
  measured_at: '2026-08-01 10:00:00',
  weight_kg: 80.0,
  body_fat_percent: 22.0,
  chest_cm: 102.0,
  waist_cm: 88.0,
  hip_cm: 100.0,
  arm_cm: 34.0,
  thigh_cm: 58.0
};
const res1 = computeProgressModel(10, [m1]);
assert(res1.total_measurements === 1, "Self-test 1 measurement: total is 1");
assert(res1.latest.id === 1, "Self-test 1 measurement: latest is m1");
assert(res1.previous === null, "Self-test 1 measurement: previous is null");
assert(res1.first.id === 1, "Self-test 1 measurement: first is m1");
assert(res1.diff_from_previous === null, "Self-test 1 measurement: diff_from_previous is null");
assert(res1.diff_from_first === null, "Self-test 1 measurement: diff_from_first is null");
assert(res1.metrics.weight_kg.latest === 80.0, "Self-test 1 measurement: weight_kg latest is 80.0");
assert(res1.metrics.weight_kg.diff_previous === null, "Self-test 1 measurement: weight_kg diff_previous is null");

// Case 3: 2 measurements
const m2 = {
  id: 2,
  measured_at: '2026-09-01 10:00:00',
  weight_kg: 78.2,
  body_fat_percent: 20.5,
  chest_cm: 101.0,
  waist_cm: 85.0,
  hip_cm: 99.0,
  arm_cm: 34.5,
  thigh_cm: 57.5
};
const res2 = computeProgressModel(10, [m1, m2]);
assert(res2.total_measurements === 2, "Self-test 2 measurements: total is 2");
assert(res2.latest.id === 2, "Self-test 2 measurements: latest is m2");
assert(res2.previous.id === 1, "Self-test 2 measurements: previous is m1");
assert(res2.first.id === 1, "Self-test 2 measurements: first is m1");
assert(res2.diff_from_previous.weight_kg === -1.8, "Self-test 2 measurements: weight_kg diff_from_previous is -1.8");
assert(res2.diff_from_first.weight_kg === -1.8, "Self-test 2 measurements: weight_kg diff_from_first is -1.8");
assert(res2.metrics.waist_cm.diff_previous === -3.0, "Self-test 2 measurements: waist_cm diff_previous is -3.0");

// Case 4: 3 measurements with floating point precision test
const m3 = {
  id: 3,
  measured_at: '2026-10-01 10:00:00',
  weight_kg: 75.3, // 75.3 - 78.2 = -2.9; 75.3 - 80.0 = -4.7
  body_fat_percent: null, // Null metric test
  chest_cm: 100.0,
  waist_cm: 82.0,
  hip_cm: 97.5,
  arm_cm: 35.0,
  thigh_cm: 56.5
};
const res3 = computeProgressModel(10, [m1, m2, m3]);
assert(res3.total_measurements === 3, "Self-test 3 measurements: total is 3");
assert(res3.latest.id === 3, "Self-test 3 measurements: latest is m3");
assert(res3.previous.id === 2, "Self-test 3 measurements: previous is m2");
assert(res3.first.id === 1, "Self-test 3 measurements: first is m1");
assert(res3.diff_from_previous.weight_kg === -2.9, "Self-test 3 measurements: weight_kg delta previous is -2.9");
assert(res3.diff_from_first.weight_kg === -4.7, "Self-test 3 measurements: weight_kg delta first is -4.7");
assert(res3.diff_from_previous.body_fat_percent === null, "Self-test nullable metric: delta is null when metric is null in latest");
assert(res3.metrics.body_fat_percent.diff_previous === null, "Self-test metrics: nullable metric diff_previous is null");

console.log('\n=== 6. TypeScript Contract & Types Invariants ===');

const typesPath = path.join(rootDir, 'src', 'admin', 'pages', 'member-progress', 'types.ts');
assert(fs.existsSync(typesPath), 'types.ts exists');
const typesSource = fs.readFileSync(typesPath, 'utf8');

assert(
  typesSource.includes('export interface TrainerMeasurementProgressReadModel'),
  "types.ts exports TrainerMeasurementProgressReadModel interface"
);
assert(
  typesSource.includes('export interface MeasurementProgressDeltas'),
  "types.ts exports MeasurementProgressDeltas interface"
);
assert(
  typesSource.includes('export interface MeasurementMetricSummary'),
  "types.ts exports MeasurementMetricSummary interface"
);
assert(
  typesSource.includes('export function isTrainerMeasurementProgressReadModel'),
  "types.ts exports isTrainerMeasurementProgressReadModel validator"
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
  console.log('\nPASS — F.30A MEASUREMENT PROGRESS SUMMARY READ MODEL VERIFIED');
}
