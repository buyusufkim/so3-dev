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

console.log('=== 1. Member Client API Invariants (src/member/api/client.ts) ===');

const clientPath = path.join(rootDir, 'src', 'member', 'api', 'client.ts');
assert(fs.existsSync(clientPath), 'src/member/api/client.ts exists');
const clientSource = fs.readFileSync(clientPath, 'utf8');

assert(
  clientSource.includes('getMeasurementProgress(signal?: AbortSignal)'),
  'client.ts exports getMeasurementProgress with optional AbortSignal'
);

assert(
  clientSource.includes("'/api/member/measurement-progress'"),
  "getMeasurementProgress targets canonical endpoint '/api/member/measurement-progress'"
);

assert(
  clientSource.includes('validateMeasurementProgress(data)'),
  'getMeasurementProgress validates response through validateMeasurementProgress'
);

console.log('\n=== 2. Member Validator & Contract Invariants (src/member/api/validators.ts) ===');

const validatorsPath = path.join(rootDir, 'src', 'member', 'api', 'validators.ts');
assert(fs.existsSync(validatorsPath), 'src/member/api/validators.ts exists');
const validatorsSource = fs.readFileSync(validatorsPath, 'utf8');

assert(
  validatorsSource.includes('export type MemberMeasurementProgressSnapshot'),
  'validators.ts exports MemberMeasurementProgressSnapshot type'
);

assert(
  validatorsSource.includes('export type MemberMeasurementProgressDelta'),
  'validators.ts exports MemberMeasurementProgressDelta type'
);

assert(
  validatorsSource.includes('export type MemberMeasurementProgressResponse'),
  'validators.ts exports MemberMeasurementProgressResponse type'
);

assert(
  validatorsSource.includes('export function validateMeasurementProgress'),
  'validators.ts exports validateMeasurementProgress runtime validator'
);

// Dynamic import and runtime self-tests for validator
const { validateMeasurementProgress } = await import('../src/member/api/validators.ts');

// 0 measurements validation
const validZero = {
  measurement_count: 0,
  first: null,
  previous: null,
  latest: null,
  comparisons: {
    from_previous: null,
    from_first: null
  }
};
assert(
  validateMeasurementProgress(validZero).measurement_count === 0,
  'validateMeasurementProgress accepts valid 0-measurement payload'
);

// 1 measurement validation
const validOne = {
  measurement_count: 1,
  first: {
    id: 1,
    uuid: '11111111-1111-4111-8111-111111111111',
    measured_at: '2026-01-01 10:00:00',
    weight_kg: 80,
    body_fat_percent: null,
    chest_cm: 100,
    waist_cm: 85,
    hip_cm: 95,
    arm_cm: 36,
    thigh_cm: 58
  },
  previous: null,
  latest: {
    id: 1,
    uuid: '11111111-1111-4111-8111-111111111111',
    measured_at: '2026-01-01 10:00:00',
    weight_kg: 80,
    body_fat_percent: null,
    chest_cm: 100,
    waist_cm: 85,
    hip_cm: 95,
    arm_cm: 36,
    thigh_cm: 58
  },
  comparisons: {
    from_previous: null,
    from_first: {
      weight_kg: 0,
      body_fat_percent: null,
      chest_cm: 0,
      waist_cm: 0,
      hip_cm: 0,
      arm_cm: 0,
      thigh_cm: 0
    }
  }
};
assert(
  validateMeasurementProgress(validOne).measurement_count === 1,
  'validateMeasurementProgress accepts valid 1-measurement payload with factual zero deltas'
);

// 2 measurements validation
const validTwo = {
  measurement_count: 2,
  first: {
    id: 1,
    uuid: '11111111-1111-4111-8111-111111111111',
    measured_at: '2026-01-01 10:00:00',
    weight_kg: 80,
    body_fat_percent: null,
    chest_cm: 100,
    waist_cm: 85,
    hip_cm: 95,
    arm_cm: 36,
    thigh_cm: 58
  },
  previous: {
    id: 1,
    uuid: '11111111-1111-4111-8111-111111111111',
    measured_at: '2026-01-01 10:00:00',
    weight_kg: 80,
    body_fat_percent: null,
    chest_cm: 100,
    waist_cm: 85,
    hip_cm: 95,
    arm_cm: 36,
    thigh_cm: 58
  },
  latest: {
    id: 2,
    uuid: '22222222-2222-4222-8222-222222222222',
    measured_at: '2026-02-01 10:00:00',
    weight_kg: 78.5,
    body_fat_percent: 18.2,
    chest_cm: 101,
    waist_cm: 82.5,
    hip_cm: 94,
    arm_cm: 36.5,
    thigh_cm: 57.5
  },
  comparisons: {
    from_previous: {
      weight_kg: -1.5,
      body_fat_percent: null,
      chest_cm: 1,
      waist_cm: -2.5,
      hip_cm: -1,
      arm_cm: 0.5,
      thigh_cm: -0.5
    },
    from_first: {
      weight_kg: -1.5,
      body_fat_percent: null,
      chest_cm: 1,
      waist_cm: -2.5,
      hip_cm: -1,
      arm_cm: 0.5,
      thigh_cm: -0.5
    }
  }
};
assert(
  validateMeasurementProgress(validTwo).measurement_count === 2,
  'validateMeasurementProgress accepts valid 2-measurement payload'
);

// Fail-closed rejection tests
try {
  const tampered = JSON.parse(JSON.stringify(validTwo));
  tampered.comparisons.from_previous.weight_kg = 999;
  validateMeasurementProgress(tampered);
  assert(false, 'Validator must reject tampered mathematical delta');
} catch (e) {
  assert(true, 'Validator fail-closed rejects tampered mathematical delta');
}

try {
  const missingKey = JSON.parse(JSON.stringify(validOne));
  delete missingKey.latest.waist_cm;
  validateMeasurementProgress(missingKey);
  assert(false, 'Validator must reject missing snapshot key');
} catch (e) {
  assert(true, 'Validator fail-closed rejects missing snapshot key');
}

try {
  const extraKey = JSON.parse(JSON.stringify(validZero));
  extraKey.notes = 'leaked note';
  validateMeasurementProgress(extraKey);
  assert(false, 'Validator must reject extra top-level key');
} catch (e) {
  assert(true, 'Validator fail-closed rejects extra top-level key');
}

console.log('\n=== 3. Member Page Surface & Data Architecture (src/member/pages/MemberProgressPage.tsx) ===');

const pagePath = path.join(rootDir, 'src', 'member', 'pages', 'MemberProgressPage.tsx');
assert(fs.existsSync(pagePath), 'MemberProgressPage.tsx exists');
const pageSource = fs.readFileSync(pagePath, 'utf8');

// Independent request handling (no Promise.all)
assert(
  pageSource.includes('memberApiClient.getMeasurements') &&
  pageSource.includes('memberApiClient.getMeasurementProgress'),
  'MemberProgressPage calls both getMeasurements and getMeasurementProgress'
);

assert(
  !pageSource.includes('Promise.all([memberApiClient.getMeasurements') &&
  !pageSource.includes('Promise.all([memberApiClient.getMeasurementProgress') &&
  !pageSource.includes('Promise.all(['),
  'History and progress summary fetches are isolated (no Promise.all coupling)'
);

// Independent abort controllers
assert(
  pageSource.includes('abortControllerRef') &&
  pageSource.includes('progressAbortControllerRef'),
  'MemberProgressPage implements separate AbortControllers for history and progress'
);

// Independent state
assert(
  pageSource.includes('progressData') &&
  pageSource.includes('progressLoading') &&
  pageSource.includes('progressError'),
  'MemberProgressPage maintains separate progressData, progressLoading, progressError states'
);

// Local progress retry
assert(
  pageSource.includes('Tekrar Dene'),
  "MemberProgressPage provides local retry button ('Tekrar Dene')"
);

assert(
  pageSource.includes('min-h-[44px]'),
  'Touch targets >= 44px (min-h-[44px]) enforced on action controls'
);

// Client-side delta calculation removed
assert(
  !pageSource.includes('current - previous') &&
  !pageSource.includes('deltaValue = current - previous') &&
  !pageSource.includes('deltaValue =') &&
  !pageSource.includes('deltaText ='),
  'Client-side delta subtraction arithmetic strictly removed from MemberProgressPage'
);

// Trend chart preserved
assert(
  pageSource.includes('<MeasurementTrendChart') &&
  pageSource.includes('chartData'),
  'MeasurementTrendChart and chartData preserved'
);

assert(
  pageSource.includes('Seçili ölçümün zaman içindeki kayıtları.'),
  'Chart subtitle displays factual neutral description'
);

// Comparison panel
assert(
  pageSource.includes('Ölçüm Değişimi'),
  "Comparison panel displays title 'Ölçüm Değişimi'"
);

assert(
  pageSource.includes('Son ölçümünün önceki ve ilk ölçümüne göre sayısal farkları.'),
  "Comparison panel displays supporting copy 'Son ölçümünün önceki ve ilk ölçümüne göre sayısal farkları.'"
);

// Mode buttons
assert(
  pageSource.includes('Önceki Ölçüme Göre') &&
  pageSource.includes('İlk Ölçüme Göre'),
  "Includes mode toggle buttons 'Önceki Ölçüme Göre' and 'İlk Ölçüme Göre'"
);

assert(
  pageSource.includes("useState<'previous' | 'first'>('previous')"),
  "Default comparison mode is 'previous'"
);

// No storage persistence
assert(
  !pageSource.includes('localStorage') &&
  !pageSource.includes('sessionStorage'),
  'Comparison mode does not use localStorage or sessionStorage (component memory only)'
);

// One-measurement copy
assert(
  pageSource.includes('İlk ölçümün kaydedildi. Karşılaştırma için yeni bir ölçüm daha gerekli.'),
  "Single measurement state displays exact copy: 'İlk ölçümün kaydedildi. Karşılaştırma için yeni bir ölçüm daha gerekli.'"
);

// 7 metrics mapped
const expectedMetrics = [
  { key: 'weight_kg', label: 'Kilo', unit: 'kg' },
  { key: 'body_fat_percent', label: 'Yağ Oranı', unit: '%' },
  { key: 'chest_cm', label: 'Göğüs', unit: 'cm' },
  { key: 'waist_cm', label: 'Bel', unit: 'cm' },
  { key: 'hip_cm', label: 'Kalça', unit: 'cm' },
  { key: 'arm_cm', label: 'Kol', unit: 'cm' },
  { key: 'thigh_cm', label: 'Bacak', unit: 'cm' }
];

expectedMetrics.forEach(m => {
  assert(
    pageSource.includes(m.key) && pageSource.includes(m.label),
    `Metric ${m.key} (${m.label}) mapped in comparison panel`
  );
});

// Neutral styling only (no semantic coloring on deltas)
assert(
  !pageSource.includes('deltaVal > 0 ? "text-green') &&
  !pageSource.includes('deltaVal < 0 ? "text-red') &&
  !pageSource.includes('text-green') &&
  !pageSource.includes('text-emerald'),
  'Does not use green/red semantic coloring based on delta sign'
);

console.log('\n=== 4. Anti-Scope Negative Invariants (No Score, BMI, Chart Libs) ===');

const forbiddenTerms = [
  'BMI', 'ideal_kilo', 'ideal kilo', 'hedef_kilo', 'hedef kilo',
  'sağlıklı_aralık', 'sağlıklı aralık', 'body_composition_score', 'health_score', 'fitness_score'
];

forbiddenTerms.forEach(term => {
  assert(
    !pageSource.includes(term),
    `MemberProgressPage does NOT contain forbidden term: ${term}`
  );
});

// No chart libraries
assert(
  !pageSource.includes('recharts') &&
  !pageSource.includes('chart.js'),
  'Does NOT add external chart libraries'
);

console.log('\n=== 5. package.json Script Registration Invariant ===');

const pkgPath = path.join(rootDir, 'package.json');
assert(fs.existsSync(pkgPath), 'package.json exists');
const pkgSource = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgSource);

assert(
  pkg.scripts && pkg.scripts['verify:member-progress-v2'],
  "package.json registers 'verify:member-progress-v2' script"
);

console.log(`\n========================================`);
console.log(`Total assertions: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log(`========================================`);

if (exitCode !== 0) {
  process.exit(1);
} else {
  console.log('\nPASS — F.30C MEMBER MEASUREMENT PROGRESS V2 IMPLEMENTED');
  console.log('PASS — F.30C MEMBER MEASUREMENT PROGRESS V2 VERIFIED');
}
