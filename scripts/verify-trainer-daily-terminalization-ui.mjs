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

console.log("=== 1. Chained F.26B UI & F.26A Read Model Regressions ===");

try {
  const f26bOutput = execSync('node scripts/verify-trainer-daily-agenda-ui.mjs', { encoding: 'utf8' });
  assert(
    f26bOutput.includes("PASS — F.26B TRAINER DAILY AGENDA UI CLOSED"),
    "Chained F.26B daily agenda UI verifier passes with exact closed token"
  );
} catch (e) {
  assert(false, `F.26B daily agenda UI verifier failed: ${e.message}`);
}

try {
  const f26aOutput = execSync('node scripts/verify-trainer-daily-agenda.mjs', { encoding: 'utf8' });
  assert(
    f26aOutput.includes("PASS — F.26A TRAINER DAILY AGENDA READ MODEL FOUNDATION CLOSED"),
    "Chained F.26A backend foundation verifier passes with exact closed token"
  );
} catch (e) {
  assert(false, `F.26A daily agenda read model verifier failed: ${e.message}`);
}

console.log("\n=== 2. Shared Terminal Target Contract (types.ts) ===");

const typesPath = path.resolve(process.cwd(), 'src/admin/pages/appointments/types.ts');
assert(fs.existsSync(typesPath), "appointments/types.ts exists");
const typesContent = fs.readFileSync(typesPath, 'utf8');

assert(
  typesContent.includes("export interface AppointmentTerminalTarget"),
  "types.ts exports AppointmentTerminalTarget interface"
);

// Check required structural fields inside AppointmentTerminalTarget definition
const targetBlockMatch = typesContent.match(/export\s+interface\s+AppointmentTerminalTarget\s*\{([\s\S]*?)\n\}/);
assert(Boolean(targetBlockMatch), "AppointmentTerminalTarget block extractable");

if (targetBlockMatch) {
  const targetBody = targetBlockMatch[1];
  assert(targetBody.includes("id: number;"), "AppointmentTerminalTarget requires appointment.id");
  assert(targetBody.includes("uuid: string;"), "AppointmentTerminalTarget requires appointment.uuid");
  assert(targetBody.includes("starts_at: string;"), "AppointmentTerminalTarget requires appointment.starts_at");
  assert(targetBody.includes("ends_at: string;"), "AppointmentTerminalTarget requires appointment.ends_at");
  assert(targetBody.includes("status: AppointmentStatus;"), "AppointmentTerminalTarget requires appointment.status");
  assert(targetBody.includes("first_name: string;"), "AppointmentTerminalTarget requires member.first_name");
  assert(targetBody.includes("last_name: string;"), "AppointmentTerminalTarget requires member.last_name");
  assert(!targetBody.includes("trainer: {\n    id: number;\n    uuid:"), "AppointmentTerminalTarget does NOT fabricate trainer.uuid");
  assert(!targetBody.includes("trainer: {\n    id: number;\n    name:") && !/trainer:\s*\{[^}]*\bname:\s*string/s.test(targetBody), "AppointmentTerminalTarget does NOT fabricate trainer.name");
}

console.log("\n=== 3. Canonical AppointmentTerminalModal Contract Preservation ===");

const modalPath = path.resolve(process.cwd(), 'src/admin/pages/appointments/AppointmentTerminalModal.tsx');
assert(fs.existsSync(modalPath), "AppointmentTerminalModal.tsx exists");
const modalContent = fs.readFileSync(modalPath, 'utf8');

assert(
  modalContent.includes("AppointmentTerminalTarget"),
  "AppointmentTerminalModal imports or uses AppointmentTerminalTarget"
);
assert(
  modalContent.includes("item: AppointmentTerminalTarget;"),
  "AppointmentTerminalModalProps.item narrowed to AppointmentTerminalTarget"
);

// Preservation of strict response verification
assert(
  modalContent.includes("appt.id !== item.appointment.id"),
  "Modal enforces response appt.id matching"
);
assert(
  modalContent.includes("appt.uuid !== item.appointment.uuid"),
  "Modal enforces response appt.uuid matching"
);
assert(
  modalContent.includes("appt.member_id !== item.member.id"),
  "Modal enforces response appt.member_id matching"
);
assert(
  modalContent.includes("appt.trainer_id !== item.trainer.id"),
  "Modal enforces response appt.trainer_id matching"
);
assert(
  modalContent.includes("appt.starts_at !== item.appointment.starts_at"),
  "Modal enforces response appt.starts_at matching"
);
assert(
  modalContent.includes("appt.ends_at !== item.appointment.ends_at"),
  "Modal enforces response appt.ends_at matching"
);
assert(
  modalContent.includes("appt.status !== action"),
  "Modal enforces response appt.status matching"
);

// Preservation of canonical routes and submit lock
assert(
  modalContent.includes("`/api/trainer/appointments/${item.appointment.id}/${routeAction}`"),
  "Modal targets canonical trainer appointment terminalization endpoint"
);
assert(
  modalContent.includes("submitLockRef.current"),
  "Modal enforces double-submit prevention lock"
);

console.log("\n=== 4. DailyAgendaWorkspace Canonical Modal Reuse ===");

const workspacePath = path.resolve(process.cwd(), 'src/admin/pages/trainer-dashboard/DailyAgendaWorkspace.tsx');
assert(fs.existsSync(workspacePath), "DailyAgendaWorkspace.tsx exists");
const workspaceContent = fs.readFileSync(workspacePath, 'utf8');

assert(
  workspaceContent.includes("import { AppointmentTerminalModal }"),
  "DailyAgendaWorkspace imports canonical AppointmentTerminalModal"
);
assert(
  workspaceContent.includes("import { AppointmentTerminalTarget }"),
  "DailyAgendaWorkspace imports AppointmentTerminalTarget"
);
assert(
  workspaceContent.includes("<AppointmentTerminalModal"),
  "DailyAgendaWorkspace renders AppointmentTerminalModal"
);
assert(
  workspaceContent.includes('scope="trainer"'),
  "DailyAgendaWorkspace renders modal with scope='trainer'"
);

// Zero direct mutations in DailyAgendaWorkspace
assert(
  !workspaceContent.includes("apiClient.patch"),
  "DailyAgendaWorkspace contains zero apiClient.patch (delegated to canonical modal)"
);
assert(
  !workspaceContent.includes("/api/trainer/appointments/"),
  "DailyAgendaWorkspace contains zero duplicate appointment endpoint constructions"
);
assert(
  !workspaceContent.includes("apiClient.post"),
  "DailyAgendaWorkspace contains zero apiClient.post"
);

console.log("\n=== 5. Eligibility & Section Scoping ===");

// Terminal buttons MUST originate from needs_terminalization block
const needsTermIndex = workspaceContent.indexOf("agenda.needs_terminalization.map");
assert(needsTermIndex !== -1, "agenda.needs_terminalization.map block exists");

const needsTermSnippet = workspaceContent.substring(needsTermIndex, needsTermIndex + 4000);
assert(
  needsTermSnippet.includes("action: 'completed'") || needsTermSnippet.includes('action: "completed"'),
  "needs_terminalization row provides 'completed' terminal action"
);
assert(
  needsTermSnippet.includes("action: 'no_show'") || needsTermSnippet.includes('action: "no_show"'),
  "needs_terminalization row provides 'no_show' terminal action"
);
assert(
  needsTermSnippet.includes("Tamamla"),
  "needs_terminalization row renders 'Tamamla' button"
);
assert(
  needsTermSnippet.includes("Gelmedi"),
  "needs_terminalization row renders 'Gelmedi' button"
);

// Negative check: timeline appointments block must NOT have terminal actions
const timelineIndex = workspaceContent.indexOf("agenda.appointments.map");
if (timelineIndex !== -1) {
  const timelineSnippet = workspaceContent.substring(timelineIndex, timelineIndex + 2500);
  assert(
    !timelineSnippet.includes("setTerminalSelection"),
    "Timeline appointments block does NOT contain terminal actions"
  );
  assert(
    !timelineSnippet.includes("AppointmentTerminalModal"),
    "Timeline appointments block does NOT contain terminal modals"
  );
}

// Negative check: focus blocks must NOT have terminal actions
const focusSnippet = workspaceContent.includes("agenda.focus")
  ? workspaceContent.substring(workspaceContent.indexOf("agenda.focus"), workspaceContent.indexOf("agenda.focus") + 3000)
  : "";
assert(
  !focusSnippet.includes("setTerminalSelection"),
  "Focus cards do NOT contain inline terminal selection triggers"
);

console.log("\n=== 6. Authoritative Re-fetch on Terminalization Success ===");

assert(
  workspaceContent.includes("onSuccess={() => {") || workspaceContent.includes("onSuccess={"),
  "AppointmentTerminalModal provides onSuccess handler"
);
assert(
  /setRefreshKey\s*\(\s*(?:\(?\s*k\s*\)?\s*=>\s*k\s*\+\s*1|\w+\s*\+\s*1)\s*\)/.test(workspaceContent),
  "onSuccess triggers authoritative agenda re-fetch via refreshKey increment"
);
assert(
  workspaceContent.includes("setTerminalSelection(null)"),
  "Modal selection closed on success/close"
);

// Zero optimistic updates on agenda state
assert(
  !workspaceContent.includes(".filter(") || !workspaceContent.includes("setAgenda("),
  "Zero optimistic filtering of agenda state"
);
const setAgendaMatches = workspaceContent.match(/setAgenda\s*\(/g) || [];
assert(
  setAgendaMatches.length === 1,
  "setAgenda called exactly once in DailyAgendaWorkspace (from validated GET response only)"
);

console.log("\n=== 7. Anti-Feature & Backend Isolation ===");

assert(!workspaceContent.includes("AppointmentCancelModal"), "Cancel modal not imported in DailyAgendaWorkspace");
assert(!workspaceContent.includes("AppointmentRescheduleModal"), "Reschedule modal not imported in DailyAgendaWorkspace");
assert(!workspaceContent.includes("AppointmentCreateModal"), "Create modal not imported in DailyAgendaWorkspace");

// Backend controllers intact
const apptController = fs.readFileSync(path.resolve(process.cwd(), 'api/controllers/AppointmentController.php'), 'utf8');
assert(!apptController.includes("daily-agenda"), "AppointmentController intact");

const agendaController = fs.readFileSync(path.resolve(process.cwd(), 'api/controllers/TrainerDailyAgendaController.php'), 'utf8');
assert(!agendaController.includes("PATCH"), "TrainerDailyAgendaController remains strictly read-only");

console.log("\n=== 8. Documentation & Registration ===");

const decPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decContent = fs.readFileSync(decPath, 'utf8');
assert(
  decContent.includes("## F.26C Daily Appointment Terminalization Actions"),
  "DECISIONS.md documents '## F.26C Daily Appointment Terminalization Actions'"
);

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert(
  pkg.scripts && pkg.scripts['verify:trainer-daily-terminalization-ui'] === 'node scripts/verify-trainer-daily-terminalization-ui.mjs',
  "package.json registers 'verify:trainer-daily-terminalization-ui'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ Trainer Daily Terminalization UI verification FAILED");
  process.exit(1);
} else {
  console.log("PASS — F.26C DAILY APPOINTMENT TERMINALIZATION ACTIONS IMPLEMENTED");
}
