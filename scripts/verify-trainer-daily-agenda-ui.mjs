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

console.log("=== 1. Chained F.26A Backend Foundation Verification ===");

try {
  const backendOutput = execSync('node scripts/verify-trainer-daily-agenda.mjs', { encoding: 'utf8' });
  assert(
    backendOutput.includes("PASS — F.26A TRAINER DAILY AGENDA READ MODEL FOUNDATION CLOSED"),
    "Chained F.26A backend foundation verifier passes with exact closed token"
  );
} catch (e) {
  assert(false, `F.26A daily agenda foundation verifier failed: ${e.message}`);
}

console.log("\n=== 2. Algorithmic & Simulation Self-Tests ===");

// 2.1 Wall-time extractor
function formatWallTime(dateStr) {
  if (typeof dateStr === 'string' && dateStr.length >= 16) {
    return dateStr.substring(11, 16);
  }
  return dateStr;
}

assert(formatWallTime('2026-10-01 09:30:00') === '09:30', "Self-test: formatWallTime extracts HH:mm correctly");
assert(formatWallTime('2026-10-01 14:00:00') === '14:00', "Self-test: formatWallTime extracts 14:00 correctly");
assert(formatWallTime('invalid') === 'invalid', "Self-test: formatWallTime returns fallback on invalid format");

// 2.2 Date-only formatter simulation
function formatSafeBusinessDate(dateStr) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    }
  }
  return dateStr;
}

assert(formatSafeBusinessDate('2026-10-01').includes('2026'), "Self-test: Turkish business date formatting includes year");

// 2.3 Generation & abort guard simulator
let activeAbort = null;
let currentGen = 0;
let committedResult = null;

async function simulateFetch(genId, abortSignal, delayMs, data) {
  await new Promise(resolve => setTimeout(resolve, delayMs));
  if (abortSignal.aborted || genId !== currentGen) return;
  committedResult = data;
}

// Request 1 started
currentGen++;
const c1 = { aborted: false };
activeAbort = c1;
const p1 = simulateFetch(1, c1, 50, 'FIRST');

// Request 2 started (supersedes Request 1)
c1.aborted = true;
currentGen++;
const c2 = { aborted: false };
activeAbort = c2;
const p2 = simulateFetch(2, c2, 10, 'SECOND');

await Promise.all([p1, p2]);
assert(committedResult === 'SECOND', "Self-test: Race guard strictly drops superseded request");

console.log("\n=== 3. Source File Existence & UI Integration ===");

const workspacePath = path.resolve(process.cwd(), 'src/admin/pages/trainer-dashboard/DailyAgendaWorkspace.tsx');
assert(fs.existsSync(workspacePath), "DailyAgendaWorkspace.tsx exists");
const workspaceContent = fs.readFileSync(workspacePath, 'utf8');

const dashboardPath = path.resolve(process.cwd(), 'src/admin/pages/trainer-dashboard/TrainerDashboard.tsx');
assert(fs.existsSync(dashboardPath), "TrainerDashboard.tsx exists");
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

assert(
  dashboardContent.includes("import { DailyAgendaWorkspace } from \"./DailyAgendaWorkspace\";") ||
  dashboardContent.includes("import { DailyAgendaWorkspace } from './DailyAgendaWorkspace';"),
  "TrainerDashboard imports DailyAgendaWorkspace"
);
assert(
  dashboardContent.includes("<DailyAgendaWorkspace />") ||
  dashboardContent.includes("<DailyAgendaWorkspace/>"),
  "TrainerDashboard renders DailyAgendaWorkspace"
);

console.log("\n=== 4. DailyAgendaWorkspace Contract & API Safety ===");

// Exact canonical GET endpoint
assert(
  workspaceContent.includes("apiClient.get('/api/trainer/daily-agenda'") ||
  workspaceContent.includes('apiClient.get("/api/trainer/daily-agenda"'),
  "DailyAgendaWorkspace consumes canonical GET /api/trainer/daily-agenda"
);

// Zero mutations
assert(!workspaceContent.includes("apiClient.post"), "Zero apiClient.post in DailyAgendaWorkspace");
assert(!workspaceContent.includes("apiClient.patch"), "Zero apiClient.patch in DailyAgendaWorkspace");
assert(!workspaceContent.includes("apiClient.delete"), "Zero apiClient.delete in DailyAgendaWorkspace");
assert(!workspaceContent.includes("apiClient.put"), "Zero apiClient.put in DailyAgendaWorkspace");

// Validator usage
assert(
  workspaceContent.includes("validateTrainerDailyAgenda"),
  "DailyAgendaWorkspace consumes validateTrainerDailyAgenda runtime validator"
);

// Lifecycle guards
assert(
  workspaceContent.includes("new AbortController()"),
  "DailyAgendaWorkspace initializes AbortController for in-flight requests"
);
assert(
  workspaceContent.includes("controller.abort()"),
  "DailyAgendaWorkspace cleans up in-flight requests on unmount/re-fetch"
);
assert(
  workspaceContent.includes("requestGenRef") || workspaceContent.includes("generation"),
  "DailyAgendaWorkspace enforces generation guard against stale async resolutions"
);
assert(
  workspaceContent.includes("mountedRef"),
  "DailyAgendaWorkspace guards component state against unmounted updates"
);

// Error safety & leakage prevention
assert(
  !workspaceContent.includes("setError(err.message") &&
  !workspaceContent.includes("setError(error.message") &&
  !workspaceContent.includes("err.message ||"),
  "err.message is not used as agenda UI error text (no runtime error leakage)"
);
assert(
  workspaceContent.includes("if (err.name === 'AbortError') return;"),
  "AbortError triggers silent return without writing to error state"
);
assert(
  /}\s*else\s+if\s*\(\s*err\s+instanceof\s+Error\s*\)\s*\{\s*if\s*\(\s*err\.name\s*===\s*['"]AbortError['"]\s*\)\s*return\s*;\s*setError\s*\(\s*['"]Bugünün programı yüklenirken bir hata oluştu\.['"]\s*\)\s*;\s*\}/.test(workspaceContent),
  "generic Error branch uses fixed safe message 'Bugünün programı yüklenirken bir hata oluştu.'"
);

console.log("\n=== 5. Mobile-First Presentation & Workspace Navigation ===");

// Header and refresh controls
assert(workspaceContent.includes("Bugünün Programı"), "DailyAgendaWorkspace displays 'Bugünün Programı' heading");
assert(workspaceContent.includes("Yenile"), "DailyAgendaWorkspace provides explicit refresh action");
assert(workspaceContent.includes("min-h-[44px]"), "Interactive elements adhere to 44px touch targets");

// Summary cards
assert(workspaceContent.includes("agenda.summary.total"), "Displays total appointment count");
assert(workspaceContent.includes("agenda.summary.remaining_scheduled"), "Displays remaining scheduled count");
assert(workspaceContent.includes("agenda.summary.completed"), "Displays completed count");
assert(workspaceContent.includes("agenda.summary.past_due_scheduled"), "Displays past-due scheduled count");

// Focus cards
assert(workspaceContent.includes("agenda.focus.current"), "Displays current focus appointment card");
assert(workspaceContent.includes("agenda.focus.next"), "Displays next focus appointment card");
assert(workspaceContent.includes("Şu An"), "Current card has 'Şu An' badge");
assert(workspaceContent.includes("Sıradaki"), "Next card has 'Sıradaki' badge");

// Needs terminalization banner
assert(workspaceContent.includes("agenda.needs_terminalization"), "Renders needs_terminalization warning banner");
assert(workspaceContent.includes("Aksiyon Bekleyen Randevular"), "Warning banner title displayed");

// Canonical appointment workspace navigation
assert(
  workspaceContent.includes('to="/admin/my-appointments"'),
  "Actions route into canonical /admin/my-appointments workspace"
);
assert(
  workspaceContent.includes('/admin/my-members/${app.member.id}') ||
  workspaceContent.includes('/admin/my-members/'),
  "Timeline items route into member details /admin/my-members/:id"
);

// Anti-features isolation
assert(!workspaceContent.includes("score"), "Zero trainer score in workspace");
assert(!workspaceContent.includes("ranking"), "Zero ranking in workspace");
assert(!workspaceContent.includes("attendance_rate"), "Zero attendance rate in workspace");
assert(!workspaceContent.includes("notification"), "Zero notifications invention");

console.log("\n=== 6. Documentation & package.json Registration ===");

const decPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decContent = fs.readFileSync(decPath, 'utf8');
assert(
  decContent.includes("## F.26B Trainer Daily Agenda UI"),
  "DECISIONS.md documents '## F.26B Trainer Daily Agenda UI'"
);

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert(
  pkg.scripts && pkg.scripts['verify:trainer-daily-agenda-ui'] === 'node scripts/verify-trainer-daily-agenda-ui.mjs',
  "package.json registers 'verify:trainer-daily-agenda-ui'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ Trainer Daily Agenda UI verification FAILED");
  process.exit(1);
} else {
  console.log("PASS — F.26B TRAINER DAILY AGENDA UI CLOSED");
}
