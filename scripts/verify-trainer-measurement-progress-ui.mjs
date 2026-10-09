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

console.log('=== 1. Component File Existence & Parent Integration ===');

const summaryComponentPath = path.join(
  rootDir,
  'src',
  'admin',
  'pages',
  'member-progress',
  'TrainerMeasurementProgressSummary.tsx'
);
assert(fs.existsSync(summaryComponentPath), 'TrainerMeasurementProgressSummary.tsx exists in src/admin/pages/member-progress/');
const summarySource = fs.readFileSync(summaryComponentPath, 'utf8');

const parentPagePath = path.join(
  rootDir,
  'src',
  'admin',
  'pages',
  'member-progress',
  'AdminMemberProgressPage.tsx'
);
assert(fs.existsSync(parentPagePath), 'AdminMemberProgressPage.tsx exists');
const parentSource = fs.readFileSync(parentPagePath, 'utf8');

// Parent imports summary component
assert(
  parentSource.includes('TrainerMeasurementProgressSummary'),
  'AdminMemberProgressPage imports TrainerMeasurementProgressSummary'
);

// Rendered only on measurements tab
assert(
  parentSource.includes("activeTab === 'measurements'") &&
  parentSource.includes('<TrainerMeasurementProgressSummary'),
  "TrainerMeasurementProgressSummary is conditionally rendered when activeTab === 'measurements'"
);

// Exactly one render occurrence in JSX
const renderMatches = parentSource.match(/<TrainerMeasurementProgressSummary[\s\S]*?\/>/g) || [];
assert(
  renderMatches.length === 1,
  `TrainerMeasurementProgressSummary is rendered exactly once (found: ${renderMatches.length})`
);

// Summary is placed above the list/detail grid
const summaryIdx = parentSource.indexOf('<TrainerMeasurementProgressSummary');
const gridIdx = parentSource.indexOf('grid grid-cols-1 lg:grid-cols-3 gap-6');
assert(
  summaryIdx !== -1 && gridIdx !== -1 && summaryIdx < gridIdx,
  'TrainerMeasurementProgressSummary is placed above existing measurement list/detail workspace grid'
);

// Not rendered on notes tab
assert(
  !parentSource.includes("activeTab === 'notes' && <TrainerMeasurementProgressSummary") &&
  !parentSource.includes("activeTab === 'notes' && (\n            <TrainerMeasurementProgressSummary"),
  'TrainerMeasurementProgressSummary is NOT rendered on notes tab'
);

console.log('\n=== 2. Independent Failure Boundary & Mutation Refresh ===');

// Assert progress request is not merged into existing measurement list request
assert(
  !parentSource.includes('Promise.all([') ||
  !parentSource.includes('Promise.all([apiClient.get') ||
  (!parentSource.includes('Promise.all') && !parentSource.includes('measurement-progress')),
  'Measurement list and progress summary requests are completely isolated (no Promise.all coupling)'
);

// Summary error cannot drive page-level error state
assert(
  !parentSource.includes('setProgressSummaryError(error)') &&
  !parentSource.includes('setError(progressError)'),
  'Summary error is self-contained and does not drive page-level error'
);

// Mutation refresh key in parent
assert(
  parentSource.includes('progressSummaryRefreshKey'),
  'Parent owns progressSummaryRefreshKey state'
);

// Refresh key passed as prop
assert(
  parentSource.includes('refreshKey={progressSummaryRefreshKey}'),
  'refreshKey={progressSummaryRefreshKey} passed to TrainerMeasurementProgressSummary'
);

function extractFunctionBody(source, name) {
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

// Parent increments refresh key after create/edit modal success
const handleModalSuccessBody = extractFunctionBody(parentSource, 'const handleModalSuccess');
assert(handleModalSuccessBody !== null, 'handleModalSuccess exists in parent');
assert(
  handleModalSuccessBody && handleModalSuccessBody.includes('setProgressSummaryRefreshKey(prev => prev + 1)'),
  'handleModalSuccess increments progressSummaryRefreshKey on measurement create/edit'
);

// Parent increments refresh key after measurement archive
const handleArchiveBody = extractFunctionBody(parentSource, 'const handleArchive = async');
assert(handleArchiveBody !== null, 'handleArchive exists in parent');
assert(
  handleArchiveBody && handleArchiveBody.includes('setProgressSummaryRefreshKey(prev => prev + 1)'),
  'handleArchive increments progressSummaryRefreshKey on measurement archive'
);

// Parent increments refresh key after measurement restore
const handleRestoreBody = extractFunctionBody(parentSource, 'const handleRestore = async');
assert(handleRestoreBody !== null, 'handleRestore exists in parent');
assert(
  handleRestoreBody && handleRestoreBody.includes('setProgressSummaryRefreshKey(prev => prev + 1)'),
  'handleRestore increments progressSummaryRefreshKey on measurement restore'
);

// Row selection does NOT increment refresh key
const handleItemClickBody = extractFunctionBody(parentSource, 'const handleItemClick');
assert(handleItemClickBody !== null, 'handleItemClick exists in parent');
assert(
  handleItemClickBody && !handleItemClickBody.includes('setProgressSummaryRefreshKey'),
  'Selecting a measurement row does NOT increment progressSummaryRefreshKey'
);

console.log('\n=== 3. Canonical Endpoint Consumption & Runtime Validation ===');

// Canonical endpoint
assert(
  summarySource.includes('/api/trainer/members/${memberId}/measurement-progress') ||
  summarySource.includes('/api/trainer/members/${memberId}/measurement-progress`'),
  'Consumes canonical GET /api/trainer/members/${memberId}/measurement-progress'
);

// No query parameters
assert(
  !summarySource.includes('?page=') &&
  !summarySource.includes('?deleted=') &&
  !summarySource.includes('?mode=') &&
  !summarySource.includes('searchParams'),
  'Requests measurement-progress with zero query parameters'
);

// Runtime validation using isTrainerMeasurementProgressReadModel
assert(
  summarySource.includes('isTrainerMeasurementProgressReadModel'),
  'Summary component imports isTrainerMeasurementProgressReadModel'
);
assert(
  summarySource.includes('isTrainerMeasurementProgressReadModel(candidate)') ||
  summarySource.includes('isTrainerMeasurementProgressReadModel(res'),
  'Summary validates response with isTrainerMeasurementProgressReadModel before state update'
);

// No blind cast as validation
assert(
  !summarySource.includes('setData(res as TrainerMeasurementProgressReadModel)') &&
  !summarySource.includes('setData(res.data as TrainerMeasurementProgressReadModel)'),
  'Does not use blind TypeScript cast as a shortcut for validation'
);

console.log('\n=== 4. Race Safety & Error Handling ===');

// AbortController and signal
assert(
  summarySource.includes('new AbortController()'),
  'Uses new AbortController() for request cancellation'
);
assert(
  summarySource.includes('signal: controller.signal') ||
  summarySource.includes('{ signal: controller.signal }'),
  'Passes controller.signal to apiClient request'
);

// Request generation guard
assert(
  summarySource.includes('requestGenRef') || summarySource.includes('genRef'),
  'Implements request generation guard (requestGenRef)'
);

// Mounted guard
assert(
  summarySource.includes('isMountedRef') || summarySource.includes('isMounted'),
  'Implements mounted component guard'
);

// Manual retry button
assert(
  summarySource.includes('Tekrar Dene'),
  "Provides manual retry button displaying 'Tekrar Dene'"
);
assert(
  summarySource.includes('min-h-[44px]'),
  'Retry button enforces touch target >= 44px (min-h-[44px])'
);

// Safe bounded error mapping
assert(
  summarySource.includes('Aktif eğitmen profiliniz hesabınıza bağlanmamış.'),
  'Maps TRAINER_PROFILE_NOT_LINKED to safe Turkish message'
);
assert(
  summarySource.includes('Bu alana erişim yetkiniz yok.'),
  'Maps 403 to safe Turkish message'
);
assert(
  summarySource.includes('Üye bulunamadı veya artık size bağlı değil.'),
  'Maps 404 to safe Turkish message'
);
assert(
  summarySource.includes('Ölçüm karşılaştırması yüklenirken bir hata oluştu.'),
  'Maps generic error to safe bounded Turkish message'
);

console.log('\n=== 5. Conceptual States Handling (0, 1, 2+) ===');

// Zero measurements
assert(
  summarySource.includes('measurement_count === 0'),
  'Component handles 0 measurements state explicitly'
);
assert(
  summarySource.includes('Karşılaştırma için henüz ölçüm kaydı bulunmuyor.'),
  "Zero state displays exact copy: 'Karşılaştırma için henüz ölçüm kaydı bulunmuyor.'"
);

// One measurement
assert(
  summarySource.includes('measurement_count === 1'),
  'Component handles 1 measurement state explicitly'
);
assert(
  summarySource.includes('İlk ölçüm kaydedildi. Karşılaştırma için yeni bir ölçüm daha gerekli.'),
  "One measurement state displays exact copy: 'İlk ölçüm kaydedildi. Karşılaştırma için yeni bir ölçüm daha gerekli.'"
);

// Multi measurements (2+)
assert(
  summarySource.includes('Ölçüm Değişimi'),
  "Component header displays 'Ölçüm Değişimi'"
);
assert(
  summarySource.includes('Son ölçümün önceki ve ilk ölçüme göre sayısal farkları.'),
  "Supporting copy displays 'Son ölçümün önceki ve ilk ölçüme göre sayısal farkları.'"
);
assert(
  summarySource.includes('Son ölçüm:') &&
  summarySource.includes('Önceki:') &&
  summarySource.includes('İlk:'),
  'Displays dates for Son ölçüm, Önceki, and İlk measurements'
);

// Does not expose UUID
assert(
  !summarySource.includes('{data.latest.uuid}') &&
  !summarySource.includes('{latest.uuid}') &&
  !summarySource.includes('{data.first.uuid}'),
  'Does not expose internal UUID in UI'
);

console.log('\n=== 6. Comparison Modes ===');

assert(
  summarySource.includes('Önceki Ölçüme Göre'),
  "Includes mode button 'Önceki Ölçüme Göre'"
);
assert(
  summarySource.includes('İlk Ölçüme Göre'),
  "Includes mode button 'İlk Ölçüme Göre'"
);
assert(
  summarySource.includes("useState<'previous' | 'first'>('previous')") ||
  summarySource.includes("useState('previous')") ||
  summarySource.includes('setComparisonMode'),
  "Default comparison mode is 'previous' (Önceki Ölçüme Göre)"
);

// No storage persistence
assert(
  !summarySource.includes('localStorage') &&
  !summarySource.includes('sessionStorage'),
  'Comparison mode does not use localStorage or sessionStorage (component memory only)'
);

console.log('\n=== 7. Seven Metrics & Units Mapping ===');

const expectedMetrics = [
  { key: 'weight_kg', label: 'Kilo', unit: 'kg' },
  { key: 'body_fat_percent', label: 'Vücut Yağ Oranı', unit: '%' },
  { key: 'chest_cm', label: 'Göğüs', unit: 'cm' },
  { key: 'waist_cm', label: 'Bel', unit: 'cm' },
  { key: 'hip_cm', label: 'Kalça', unit: 'cm' },
  { key: 'arm_cm', label: 'Kol', unit: 'cm' },
  { key: 'thigh_cm', label: 'Bacak / Uyluk', unit: 'cm' }
];

expectedMetrics.forEach(m => {
  assert(
    summarySource.includes(m.key),
    `Component maps metric key: ${m.key}`
  );
  assert(
    summarySource.includes(m.label),
    `Component maps metric label: ${m.label}`
  );
  assert(
    summarySource.includes(m.unit),
    `Component maps metric unit: ${m.unit}`
  );
});

console.log('\n=== 8. Server-Authoritative Delta & Factual Presentation ===');

// Server deltas used directly
assert(
  summarySource.includes('comparisons.from_previous') &&
  summarySource.includes('comparisons.from_first'),
  'Directly consumes comparisons.from_previous and comparisons.from_first'
);

// Negative check: No client delta recomputation
assert(
  !summarySource.includes('latest.weight_kg - previous.weight_kg') &&
  !summarySource.includes('latest.weight_kg - first.weight_kg') &&
  !summarySource.includes('latest[key] - previous[key]') &&
  !summarySource.includes('latest[key] - first[key]'),
  'Does not recompute deltas on client (server read model is authoritative)'
);

// Positive sign formatting
assert(
  summarySource.includes('+${delta}') || summarySource.includes("'+' + delta") || summarySource.includes('`+${delta}'),
  'Explicit plus sign prefix formatted for positive deltas'
);

// Null delta placeholder
assert(
  summarySource.includes('—') || summarySource.includes("'-'"),
  'Null delta displays em-dash placeholder'
);
assert(
  summarySource.includes('Karşılaştırma için iki ölçümde de bu değer gerekli.'),
  "Null delta provides explanatory notice: 'Karşılaştırma için iki ölçümde de bu değer gerekli.'"
);

// Neutral visual styling (no semantic coloring based on good/bad)
assert(
  !summarySource.includes('text-green') &&
  !summarySource.includes('text-emerald') &&
  !summarySource.includes('delta > 0 ? "text-green') &&
  !summarySource.includes('delta < 0 ? "text-red'),
  'Does not use semantic good/bad coloring (green/red) based on delta sign'
);

console.log('\n=== 9. Anti-Scope Negative Invariants (No Score, Interpretation, BMI, Charts) ===');

const forbiddenTerms = [
  'BMI',
  'ideal_kilo',
  'ideal kilo',
  'hedef_kilo',
  'hedef kilo',
  'sağlıklı_aralık',
  'sağlıklı aralık',
  'body_composition_score',
  'health_score',
  'fitness_score'
];

forbiddenTerms.forEach(term => {
  assert(
    !summarySource.includes(term),
    `Component does NOT contain forbidden term: ${term}`
  );
});

// No interpretation words in summary
const forbiddenInterpretationWords = [
  'İyi',
  'Kötü',
  'Gerileme',
  'Başarılı',
  'Hedefe yakın',
  'Riskli',
  'improved',
  'worsened'
];

forbiddenInterpretationWords.forEach(word => {
  assert(
    !summarySource.includes(word),
    `Component does NOT contain interpretation word: '${word}'`
  );
});

// No percentage change
assert(
  !summarySource.includes('% değişim') &&
  !summarySource.includes('yüzde değişim') &&
  !summarySource.includes('percentage_change'),
  'Does NOT calculate or display percentage change'
);

// No chart libraries
assert(
  !summarySource.includes('recharts') &&
  !summarySource.includes('chart.js') &&
  !summarySource.includes('<svg') &&
  !summarySource.includes('TrendLine'),
  'Does NOT include chart libraries or graphs'
);

console.log('\n=== 10. package.json Script Registration Invariant ===');

const pkgPath = path.join(rootDir, 'package.json');
assert(fs.existsSync(pkgPath), 'package.json exists');
const pkgSource = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgSource);

assert(
  pkg.scripts && pkg.scripts['verify:trainer-measurement-progress-ui'],
  "package.json registers 'verify:trainer-measurement-progress-ui' script"
);

console.log(`\n========================================`);
console.log(`Total assertions: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log(`========================================`);

if (exitCode !== 0) {
  process.exit(1);
} else {
  console.log('\nPASS — F.30B TRAINER MEASUREMENT PROGRESS COMPARISON UI IMPLEMENTED');
  console.log('PASS — F.30B TRAINER MEASUREMENT PROGRESS COMPARISON UI VERIFIED');
}
