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
  // WE MUST NOT mutate the repository (no fs.unlinkSync)

  step('Verifying F.19B Trainer Dashboard Mobile Density');

  const file = path.join(ROOT_DIR, 'src/admin/pages/trainer-dashboard/TrainerDashboard.tsx');
  const code = fs.readFileSync(file, 'utf8');

  step('Semantic Headings');
  check(code.includes('<h1 '), 'Semantic heading h1 is required for the page title');

  step('Exact Single API Call');
  const apiCalls = (code.match(/apiClient\.get/g) || []).length;
  check(apiCalls === 1, 'Dashboard must make exactly ONE API call');
  check(code.includes("/api/trainer/dashboard"), 'Dashboard must use the correct canonical API endpoint');
  check(!code.includes("/api/trainer/appointments"), 'Appointment invention endpoint not allowed');

  step('Types & Contract Untouched');
  check(code.includes("TrainerDashboardData"), 'Must use original TrainerDashboardData type');
  
  step('Attention First Architecture');
  check(code.includes("order-1"), 'Explicit mobile order-1 must be present for Header');
  check(code.includes("order-2"), 'Explicit mobile order-2 must be present for Attention section');
  check(code.includes("order-3"), 'Explicit mobile order-3 must be present for Member metrics');
  check(code.includes("order-4"), 'Explicit mobile order-4 must be present for Program metrics');
  check(code.includes("order-5"), 'Explicit mobile order-5 must be present for Recent members');
  check(code.match(/order-\d+\s+lg:order-none/g)?.length >= 4, 'Explicit mobile order resets for desktop (lg:order-none) must be present');
  check(code.includes("data.attention.members_without_active_program.length"), 'Derived count must include members without program');

  step('Mobile Grids & Summaries');
  // Check for exact mobile base classes, reject sm: prefixes as false positives for base views
  const hasBaseGrid3 = /(?<!(sm:|md:))grid-cols-3/.test(code);
  check(hasBaseGrid3, 'Real mobile 3-column grid (grid-cols-3 without sm: prefix) must be present for member metrics');
  
  const hasBaseGrid2 = /(?<!(sm:|md:))grid-cols-2/.test(code);
  check(hasBaseGrid2, 'Real mobile 2x2 grid (grid-cols-2 without sm: prefix) must be present for mobile training programs');

  step('Metric Retention');
  check(code.includes("data.members.total"), 'Member total metric missing');
  check(code.includes("data.members.active"), 'Member active metric missing');
  check(code.includes("data.members.inactive"), 'Member inactive metric missing');
  check(code.includes("data.training_programs.total"), 'Program total metric missing');
  check(code.includes("data.training_programs.active"), 'Program active metric missing');
  check(code.includes("data.training_programs.draft"), 'Program draft metric missing');
  check(code.includes("data.training_programs.archived"), 'Program archived metric missing');

  step('Recent Members');
  check(code.includes("data.recent_members.map"), 'Must map over recent members');
  check(!code.includes("recent_members.slice("), 'Must not truncate recent members array via slice');
  check(code.includes("/admin/my-members/${member.id}"), 'Must use canonical member detail route');

  step('No Duplicate Quick Navigation');
  check(!code.includes('to="/admin/my-appointments"'), 'Do not reinvent bottom nav shortcuts in dashboard');

  step('No Notification Inventions');
  check(!code.includes("notification"), 'No notifications concept allowed');
  check(!code.includes("unread"), 'No unread concept allowed');

  step('Accessibility & Touch');
  check(code.includes('type="button"') || code.includes("type='button'"), 'Buttons must have type attribute');
  check(code.includes("min-h-[40px]"), 'Attention actions must be touch-safe (min-h-[40px] or equivalent semantics expected)');

  console.log('✅ PASS — F.19B TRAINER DASHBOARD MOBILE DENSITY CLOSED');
} catch (err) {
  console.error(err);
  process.exit(1);
}
