import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());

function check(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
}

function step(name) {
  console.log(`\n👉 ${name}`);
}

try {
  step('Repository Hygiene');
  const files = fs.readdirSync(ROOT_DIR);
  const badFiles = files.filter(f => 
    /^patch.*\\.(m?js|php)$/.test(f) || 
    /^tmp.*\\.(m?js|php)$/.test(f) || 
    f.endsWith('.tmp') || 
    f.endsWith('.fixed') ||
    f.startsWith('add-') && f.endsWith('.php')
  );
  check(badFiles.length === 0, 'No temporary patch or artifact files allowed in repository root');

  step('Verifying F.18F Member Progress UI');

  const routePath = path.join(ROOT_DIR, 'src/routes/index.tsx');
  const clientPath = path.join(ROOT_DIR, 'src/member/api/client.ts');
  const validatorPath = path.join(ROOT_DIR, 'src/member/api/validators.ts');
  const layoutPath = path.join(ROOT_DIR, 'src/member/layouts/MemberLayout.tsx');
  const dashboardPath = path.join(ROOT_DIR, 'src/member/pages/MemberDashboardPage.tsx');
  const progressPath = path.join(ROOT_DIR, 'src/member/pages/MemberProgressPage.tsx');
  const chartPath = path.join(ROOT_DIR, 'src/member/components/MeasurementTrendChart.tsx');
  const pkgPath = path.join(ROOT_DIR, 'package.json');

  const routeCode = fs.readFileSync(routePath, 'utf8');
  const clientCode = fs.readFileSync(clientPath, 'utf8');
  const validatorCode = fs.readFileSync(validatorPath, 'utf8');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');
  const dashboardCode = fs.readFileSync(dashboardPath, 'utf8');
  const progressCode = fs.readFileSync(progressPath, 'utf8');
  const chartCode = fs.readFileSync(chartPath, 'utf8');
  const pkgCode = fs.readFileSync(pkgPath, 'utf8');

  // Verify missing verifiers
  check(fs.existsSync(path.join(ROOT_DIR, 'scripts/verify-member-portal-measurements-read-model.mjs')), 'F.18E verifier missing');

  step('Route Invariant');
  check(routeCode.includes('path: "gelisim"'), 'Missing /uye/gelisim route');
  check(routeCode.includes('element: <MemberSuspense><MemberProgressPage /></MemberSuspense>'), 'Progress page not correctly protected by suspense');
  check(routeCode.indexOf('path: "gelisim"') > routeCode.indexOf('path: "/uye"'), 'Route must be under /uye tree');

  step('API Invariant');
  check(clientCode.includes("request('/api/member/measurements', { signal })"), 'Exact API GET endpoint must be called');
  check(!clientCode.includes('POST /api/member/measurements'), 'Mutation POST not allowed');
  check(!clientCode.includes('PUT /api/member/measurements'), 'Mutation PUT not allowed');
  check(!clientCode.includes('PATCH /api/member/measurements'), 'Mutation PATCH not allowed');
  check(!clientCode.includes('DELETE /api/member/measurements'), 'Mutation DELETE not allowed');

  step('Strict Validator');
  check(validatorCode.includes('validateMeasurements(data: unknown): MemberMeasurement[]'), 'Must export validateMeasurements');
  check(validatorCode.includes("!Number.isFinite(val)"), 'Must validate finite metrics');
  check(validatorCode.includes("val < 0 || val > 100"), 'Must validate body fat bounds');
  check(validatorCode.includes("val <= 0 || val > 9999.99"), 'Must validate body metric bounds');

  step('Forbidden Fields & Privacy Isolation');
  check(!validatorCode.includes('notes:'), 'notes property is forbidden');
  check(!validatorCode.includes('note:'), 'note property is forbidden');
  check(!validatorCode.includes('member_id:'), 'member_id property is forbidden');
  check(!validatorCode.includes('trainer_id:'), 'trainer_id property is forbidden');
  check(!validatorCode.includes('created_by:'), 'created_by property is forbidden');
  check(!validatorCode.includes('updated_by:'), 'updated_by property is forbidden');
  check(!validatorCode.includes('deleted_at:'), 'deleted_at property is forbidden');

  step('Progress Notes Isolation');
  check(!clientCode.includes('/api/member/progress-notes'), 'progress notes endpoint forbidden');
  check(!clientCode.includes('getProgressNotes'), 'getProgressNotes method forbidden');
  check(!progressCode.includes('member_progress_notes'), 'member_progress_notes forbidden');

  step('No Health Calculations');
  const forbiddenHealth = ['calculateBMI', 'idealWeight', 'healthScore', 'metabolicAge', 'calorieNeed'];
  forbiddenHealth.forEach(f => {
    check(!progressCode.includes(f), `${f} calculation is forbidden`);
  });

  step('No External Chart Dependency');
  check(!pkgCode.includes('recharts'), 'recharts dependency forbidden');
  check(!pkgCode.includes('chart.js'), 'chart.js dependency forbidden');
  check(!pkgCode.includes('d3"'), 'd3 dependency forbidden');
  check(!pkgCode.includes('victory'), 'victory dependency forbidden');

  step('SVG Chart Implementation');
  check(chartCode.includes('<svg'), 'Must use SVG');
  check(chartCode.includes('viewBox='), 'Must use SVG viewBox');
  check(chartCode.includes('role="img"'), 'Must have role=img');
  check(chartCode.includes('aria-label='), 'Must have aria-label for accessibility');

  step('Null Metric Filter & Chronological Chart');
  check(progressCode.includes('m[selectedMetric] !== null'), 'Must filter null metrics from chart dataset');
  check(progressCode.includes('.reverse()') || progressCode.includes('.sort'), 'Must reverse/sort chart dataset chronologically');
  check(!progressCode.includes('measurements.reverse()'), 'Original measurements array must not be mutated');

  step('Neutral Delta');
  const forbiddenJudgment = ['iyi', 'kötü', 'sağlıklı', 'sağlıksız', 'risk'];
  forbiddenJudgment.forEach(f => {
    check(!progressCode.includes(f), `Delta judgement string "${f}" is forbidden`);
  });

  step('Dashboard Isolation');
  check(dashboardCode.includes('/uye/gelisim'), 'Dashboard must link to progress page');
  check(!dashboardCode.includes('getMeasurements('), 'Dashboard must not fetch measurements');

  step('Member Layout Navigation');
  check(layoutCode.includes('Gelişimim'), 'Layout must link to Gelişimim');
  check(layoutCode.includes('!identity.account.must_change_password'), 'Must hide nav on forced password change');

  step('Request Lifecycle & Auth Protection');
  check(progressCode.includes('new AbortController()'), 'Must instantiate AbortController');
  check(progressCode.includes('abortControllerRef.current.abort()'), 'Must cleanup AbortController');
  check(progressCode.includes("err.code === 'PASSWORD_CHANGE_REQUIRED'"), 'Must handle PASSWORD_CHANGE_REQUIRED error');

  console.log('✅ PASS — F.18F MEMBER PROGRESS UI CLOSED');
} catch (err) {
  console.error(err);
  process.exit(1);
}
