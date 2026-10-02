import fs from 'fs';
import path from 'path';

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

console.log("=== 1. Algorithmic & Temporal State Self-Tests ===");

// 1.1 Temporal state derivation logic
function deriveTemporalState(status, startsAt, endsAt, nowStr) {
  if (status !== 'scheduled') {
    return 'terminal';
  }
  if (nowStr < startsAt) {
    return 'upcoming';
  }
  if (nowStr < endsAt) {
    return 'in_progress';
  }
  return 'past_due';
}

const apptStart = '2026-10-01 09:00:00';
const apptEnd = '2026-10-01 10:00:00';

assert(deriveTemporalState('scheduled', apptStart, apptEnd, '2026-10-01 08:00:00') === 'upcoming',
  "Self-test: scheduled before starts_at is 'upcoming'");
assert(deriveTemporalState('scheduled', apptStart, apptEnd, '2026-10-01 09:00:00') === 'in_progress',
  "Self-test: scheduled at starts_at boundary is 'in_progress'");
assert(deriveTemporalState('scheduled', apptStart, apptEnd, '2026-10-01 09:30:00') === 'in_progress',
  "Self-test: scheduled during slot is 'in_progress'");
assert(deriveTemporalState('scheduled', apptStart, apptEnd, '2026-10-01 10:00:00') === 'past_due',
  "Self-test: scheduled at ends_at boundary is 'past_due'");
assert(deriveTemporalState('scheduled', apptStart, apptEnd, '2026-10-01 10:30:00') === 'past_due',
  "Self-test: scheduled after ends_at is 'past_due'");
assert(deriveTemporalState('completed', apptStart, apptEnd, '2026-10-01 09:30:00') === 'terminal',
  "Self-test: completed is 'terminal' regardless of time");
assert(deriveTemporalState('cancelled', apptStart, apptEnd, '2026-10-01 08:00:00') === 'terminal',
  "Self-test: cancelled is 'terminal' regardless of time");
assert(deriveTemporalState('no_show', apptStart, apptEnd, '2026-10-01 11:00:00') === 'terminal',
  "Self-test: no_show is 'terminal' regardless of time");

// 1.2 Summary computation and focus selection simulation
function computeAgenda(appointments, nowStr) {
  const summary = {
    total: 0,
    scheduled: 0,
    completed: 0,
    no_show: 0,
    cancelled: 0,
    remaining_scheduled: 0,
    past_due_scheduled: 0
  };

  const needsTerminalization = [];
  let currentAppt = null;
  let nextAppt = null;
  let hasOverlapConflict = false;

  for (const app of appointments) {
    summary.total++;
    const state = deriveTemporalState(app.status, app.starts_at, app.ends_at, nowStr);
    const item = { ...app, temporal_state: state };

    if (app.status === 'scheduled') {
      summary.scheduled++;
      if (app.ends_at > nowStr) {
        summary.remaining_scheduled++;
      } else {
        summary.past_due_scheduled++;
      }

      if (app.ends_at <= nowStr) {
        needsTerminalization.push(item);
      }

      if (app.starts_at <= nowStr && app.ends_at > nowStr) {
        if (currentAppt !== null) {
          hasOverlapConflict = true;
        }
        currentAppt = item;
      }

      if (app.starts_at > nowStr) {
        if (nextAppt === null) {
          nextAppt = item;
        }
      }
    } else if (app.status === 'completed') {
      summary.completed++;
    } else if (app.status === 'no_show') {
      summary.no_show++;
    } else if (app.status === 'cancelled') {
      summary.cancelled++;
    }
  }

  return { summary, focus: { current: currentAppt, next: nextAppt }, needsTerminalization, hasOverlapConflict };
}

const mockDay = [
  { id: 1, starts_at: '2026-10-01 08:00:00', ends_at: '2026-10-01 09:00:00', status: 'completed' },
  { id: 2, starts_at: '2026-10-01 09:00:00', ends_at: '2026-10-01 10:00:00', status: 'scheduled' }, // past_due at 10:15
  { id: 3, starts_at: '2026-10-01 10:00:00', ends_at: '2026-10-01 11:00:00', status: 'scheduled' }, // in_progress at 10:15
  { id: 4, starts_at: '2026-10-01 11:00:00', ends_at: '2026-10-01 12:00:00', status: 'cancelled' }, // terminal
  { id: 5, starts_at: '2026-10-01 14:00:00', ends_at: '2026-10-01 15:00:00', status: 'scheduled' }, // next at 10:15
  { id: 6, starts_at: '2026-10-01 16:00:00', ends_at: '2026-10-01 17:00:00', status: 'no_show' },
];

const mockRes = computeAgenda(mockDay, '2026-10-01 10:15:00');
assert(mockRes.summary.total === 6, "Self-test: summary total matches 6");
assert(mockRes.summary.scheduled === 3, "Self-test: summary scheduled matches 3");
assert(mockRes.summary.completed === 1, "Self-test: summary completed matches 1");
assert(mockRes.summary.no_show === 1, "Self-test: summary no_show matches 1");
assert(mockRes.summary.cancelled === 1, "Self-test: summary cancelled matches 1");
assert(mockRes.summary.remaining_scheduled === 2, "Self-test: summary remaining_scheduled matches 2 (in_progress + upcoming)");
assert(mockRes.summary.past_due_scheduled === 1, "Self-test: summary past_due_scheduled matches 1 (09:00-10:00)");
assert(mockRes.focus.current?.id === 3, "Self-test: focus.current is appointment #3 (10:00-11:00)");
assert(mockRes.focus.next?.id === 5, "Self-test: focus.next is appointment #5 (14:00-15:00, skipping cancelled #4)");
assert(mockRes.needsTerminalization.length === 1 && mockRes.needsTerminalization[0].id === 2,
  "Self-test: needsTerminalization contains appointment #2");

// Overlap conflict test
const overlappingDay = [
  { id: 10, starts_at: '2026-10-01 10:00:00', ends_at: '2026-10-01 11:00:00', status: 'scheduled' },
  { id: 11, starts_at: '2026-10-01 10:30:00', ends_at: '2026-10-01 11:30:00', status: 'scheduled' },
];
const overlapRes = computeAgenda(overlappingDay, '2026-10-01 10:45:00');
assert(overlapRes.hasOverlapConflict === true, "Self-test: Multiple current scheduled appointments detected as overlap conflict");

// 1.3 Trainer isolation simulation
function filterTrainerAppointments(allAppointments, queryTrainerId) {
  return allAppointments.filter(a => a.trainer_id === queryTrainerId);
}
const multiTrainerAppts = [
  { id: 101, trainer_id: 1, starts_at: '2026-10-01 09:00:00' },
  { id: 102, trainer_id: 2, starts_at: '2026-10-01 09:00:00' },
  { id: 103, trainer_id: 1, starts_at: '2026-10-01 10:00:00' },
];
const trainer1Only = filterTrainerAppointments(multiTrainerAppts, 1);
assert(trainer1Only.length === 2 && !trainer1Only.some(a => a.trainer_id !== 1),
  "Self-test: Trainer query isolation filters strictly by authenticated trainer id");

console.log("\n=== 2. Route Registration & Canonical Endpoint in api/index.php ===");

const indexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(indexPath), "api/index.php exists");
const indexContent = fs.readFileSync(indexPath, 'utf8');

assert(
  indexContent.includes("preg_match('#^/api/trainer/daily-agenda$#', $requestUri)"),
  "api/index.php registers exact regex for /api/trainer/daily-agenda"
);
assert(
  indexContent.includes("TrainerDailyAgendaController"),
  "api/index.php invokes TrainerDailyAgendaController"
);
assert(
  indexContent.includes("AuthMiddleware::hasRole(['trainer'])"),
  "api/index.php protects /api/trainer/daily-agenda with trainer role"
);
assert(
  !indexContent.includes("/api/trainer/daily-agenda?"),
  "No parameterized date query route in api/index.php"
);
assert(
  !indexContent.includes("/api/trainer/daily-agenda/"),
  "No sub-resource date route for daily-agenda in api/index.php"
);
assert(
  indexContent.includes("/api/trainer/dashboard"),
  "Existing /api/trainer/dashboard route remains intact"
);

console.log("\n=== 3. Controller Architecture & Static Invariants ===");

const controllerPath = path.resolve(process.cwd(), 'api/controllers/TrainerDailyAgendaController.php');
assert(fs.existsSync(controllerPath), "TrainerDailyAgendaController.php exists");
const controllerContent = fs.readFileSync(controllerPath, 'utf8');

assert(
  controllerContent.includes("class TrainerDailyAgendaController"),
  "TrainerDailyAgendaController class defined"
);
assert(
  controllerContent.includes("AuthMiddleware::hasRole(['trainer']);"),
  "TrainerDailyAgendaController enforces trainer role in handler"
);
assert(
  controllerContent.includes("rejectQueryParams") && controllerContent.includes("!empty($_GET)"),
  "TrainerDailyAgendaController rejects query parameters"
);
assert(
  controllerContent.includes("getTrainerProfile"),
  "TrainerDailyAgendaController resolves trainer profile"
);
assert(
  controllerContent.includes("$_SESSION['admin_id']"),
  "Trainer profile resolved from $_SESSION['admin_id']"
);
assert(
  controllerContent.includes("TRAINER_PROFILE_NOT_LINKED"),
  "TrainerDailyAgendaController returns TRAINER_PROFILE_NOT_LINKED when not found"
);
assert(
  controllerContent.includes("Europe/Istanbul"),
  "TrainerDailyAgendaController uses Europe/Istanbul timezone explicitly"
);
assert(
  controllerContent.includes("starts_at >=") && controllerContent.includes("starts_at <"),
  "TrainerDailyAgendaController queries index-friendly date interval [today 00:00:00, tomorrow 00:00:00)"
);
assert(
  controllerContent.includes("a.trainer_id = ?"),
  "Appointments query strictly scoped by authenticated trainer_id"
);
assert(
  controllerContent.includes("ORDER BY a.starts_at ASC, a.id ASC"),
  "Appointments query ordered chronologically by starts_at ASC, id ASC"
);
assert(
  controllerContent.includes("TRAINER_DAILY_AGENDA_INCONSISTENT"),
  "TrainerDailyAgendaController defines canonical 409 error TRAINER_DAILY_AGENDA_INCONSISTENT"
);
assert(
  controllerContent.includes("m.phone AS m_phone"),
  "Appointments query projects m.phone AS m_phone from joined member"
);
assert(
  controllerContent.includes("$status === 'scheduled' && $row['m_phone'] !== null"),
  "Controller strictly limits contact phone projection to scheduled appointments"
);

// Read-only invariants
assert(!controllerContent.includes("INSERT INTO"), "Zero INSERT queries in TrainerDailyAgendaController");
assert(!controllerContent.includes("UPDATE "), "Zero UPDATE queries in TrainerDailyAgendaController");
assert(!controllerContent.includes("DELETE FROM"), "Zero DELETE queries in TrainerDailyAgendaController");
assert(!controllerContent.includes("FOR UPDATE"), "Zero FOR UPDATE locks in TrainerDailyAgendaController (read model)");
assert(!controllerContent.includes("beginTransaction"), "Zero beginTransaction calls in TrainerDailyAgendaController");
assert(!controllerContent.includes("commit()"), "Zero commit calls in TrainerDailyAgendaController");
assert(!controllerContent.includes("rollBack()"), "Zero rollBack calls in TrainerDailyAgendaController");

// Anti-scoring invariants
assert(!controllerContent.includes("score"), "Zero occurrences of 'score' in TrainerDailyAgendaController");
assert(!controllerContent.includes("performance_score"), "Zero occurrences of 'performance_score'");
assert(!controllerContent.includes("completion_rate"), "Zero occurrences of 'completion_rate'");
assert(!controllerContent.includes("attendance_rate"), "Zero occurrences of 'attendance_rate'");
assert(!controllerContent.includes("ranking"), "Zero occurrences of 'ranking'");
assert(!controllerContent.includes("rank"), "Zero occurrences of 'rank'");

console.log("\n=== 4. TypeScript Foundation & Runtime Validators (types.ts) ===");

const typesPath = path.resolve(process.cwd(), 'src/admin/pages/trainer-dashboard/types.ts');
assert(fs.existsSync(typesPath), "src/admin/pages/trainer-dashboard/types.ts exists");
const typesContent = fs.readFileSync(typesPath, 'utf8');

assert(
  typesContent.includes("export type TrainerDailyAgendaTemporalState"),
  "types.ts exports TrainerDailyAgendaTemporalState"
);
assert(
  typesContent.includes("export interface TrainerDailyAgendaAppointment"),
  "types.ts exports TrainerDailyAgendaAppointment"
);
assert(
  typesContent.includes("export interface TrainerDailyAgendaSummary"),
  "types.ts exports TrainerDailyAgendaSummary"
);
assert(
  typesContent.includes("export interface TrainerDailyAgenda"),
  "types.ts exports TrainerDailyAgenda"
);
assert(
  typesContent.includes("export function validateTrainerDailyAgenda"),
  "types.ts exports validateTrainerDailyAgenda validator"
);
assert(
  typesContent.includes("export function isTrainerDailyAgenda"),
  "types.ts exports isTrainerDailyAgenda type guard"
);

// Dynamic import of validator to test actual execution via TypeScript transpile
import ts from 'typescript';
const transpiledTypes = ts.transpileModule(typesContent, {
  compilerOptions: { module: ts.ModuleKind.ESNext }
});
const typesB64 = Buffer.from(transpiledTypes.outputText).toString('base64');
const { validateTrainerDailyAgenda, isTrainerDailyAgenda } = await import(`data:text/javascript;base64,${typesB64}`);

const sampleValidAgenda = {
  timezone: 'Europe/Istanbul',
  business_date: '2026-10-01',
  generated_at: '2026-10-01 10:30:00',
  trainer: {
    id: 5,
    name: 'Ahmet Yılmaz'
  },
  summary: {
    total: 3,
    scheduled: 2,
    completed: 1,
    no_show: 0,
    cancelled: 0,
    remaining_scheduled: 1,
    past_due_scheduled: 1
  },
  focus: {
    current: {
      id: 20,
      uuid: 'u-20',
      starts_at: '2026-10-01 10:00:00',
      ends_at: '2026-10-01 11:00:00',
      status: 'scheduled',
      member: { id: 10, uuid: 'm-10', first_name: 'Ali', last_name: 'Veli', phone: '05551234567' },
      session_package: { id: 1, package_name: 'PT 10' },
      temporal_state: 'in_progress'
    },
    next: null
  },
  needs_terminalization: [
    {
      id: 19,
      uuid: 'u-19',
      starts_at: '2026-10-01 09:00:00',
      ends_at: '2026-10-01 10:00:00',
      status: 'scheduled',
      member: { id: 11, uuid: 'm-11', first_name: 'Mehmet', last_name: 'Kaya', phone: '05557654321' },
      session_package: null,
      temporal_state: 'past_due'
    }
  ],
  appointments: [
    {
      id: 18,
      uuid: 'u-18',
      starts_at: '2026-10-01 08:00:00',
      ends_at: '2026-10-01 09:00:00',
      status: 'completed',
      member: { id: 12, uuid: 'm-12', first_name: 'Ayşe', last_name: 'Demir', phone: null },
      session_package: null,
      temporal_state: 'terminal'
    },
    {
      id: 19,
      uuid: 'u-19',
      starts_at: '2026-10-01 09:00:00',
      ends_at: '2026-10-01 10:00:00',
      status: 'scheduled',
      member: { id: 11, uuid: 'm-11', first_name: 'Mehmet', last_name: 'Kaya', phone: '05557654321' },
      session_package: null,
      temporal_state: 'past_due'
    },
    {
      id: 20,
      uuid: 'u-20',
      starts_at: '2026-10-01 10:00:00',
      ends_at: '2026-10-01 11:00:00',
      status: 'scheduled',
      member: { id: 10, uuid: 'm-10', first_name: 'Ali', last_name: 'Veli', phone: '05551234567' },
      session_package: { id: 1, package_name: 'PT 10' },
      temporal_state: 'in_progress'
    }
  ]
};

assert(isTrainerDailyAgenda(sampleValidAgenda) === true, "Validator accepts canonical valid TrainerDailyAgenda");
const validated = validateTrainerDailyAgenda(sampleValidAgenda);
assert(validated.timezone === 'Europe/Istanbul' && validated.summary.total === 3, "Validated object returned correctly");

// Negative validator tests
assert(isTrainerDailyAgenda({ ...sampleValidAgenda, timezone: 'UTC' }) === false,
  "Validator rejects non-Europe/Istanbul timezone");
assert(isTrainerDailyAgenda({ ...sampleValidAgenda, summary: { ...sampleValidAgenda.summary, total: 99 } }) === false,
  "Validator rejects summary count mismatch");
assert(isTrainerDailyAgenda({
  ...sampleValidAgenda,
  appointments: [...sampleValidAgenda.appointments].reverse()
}) === false, "Validator rejects non-chronologically sorted appointments");
assert(isTrainerDailyAgenda({
  ...sampleValidAgenda,
  appointments: [
    { ...sampleValidAgenda.appointments[0], temporal_state: 'upcoming' } // completed with upcoming temporal_state
  ]
}) === false, "Validator rejects terminal status with non-terminal temporal_state");
assert(isTrainerDailyAgenda({
  ...sampleValidAgenda,
  appointments: [
    { ...sampleValidAgenda.appointments[0], member: { ...sampleValidAgenda.appointments[0].member, phone: '05559999999' } }
  ]
}) === false, "Validator rejects terminal status with non-null member.phone");
assert(isTrainerDailyAgenda({
  ...sampleValidAgenda,
  appointments: [
    sampleValidAgenda.appointments[0],
    { ...sampleValidAgenda.appointments[1], member: { ...sampleValidAgenda.appointments[1].member, phone: null } },
    sampleValidAgenda.appointments[2]
  ]
}) === true, "Validator accepts scheduled status with null member.phone");

console.log("\n=== 5. Scope Isolation (Zero Changes to UI or Existing Controllers) ===");

const trainerDashboardController = fs.readFileSync(path.resolve(process.cwd(), 'api/controllers/TrainerDashboardController.php'), 'utf8');
assert(!trainerDashboardController.includes("daily-agenda"), "TrainerDashboardController unchanged (no daily-agenda logic)");

const appointmentController = fs.readFileSync(path.resolve(process.cwd(), 'api/controllers/AppointmentController.php'), 'utf8');
assert(!appointmentController.includes("daily-agenda"), "AppointmentController unchanged");

const dashboardComponent = fs.readFileSync(path.resolve(process.cwd(), 'src/admin/pages/trainer-dashboard/TrainerDashboard.tsx'), 'utf8');
assert(!dashboardComponent.includes("TrainerDailyAgenda"), "TrainerDashboard.tsx component unchanged (no premature UI in F26A)");

console.log("\n=== 6. Documentation & package.json Registration ===");

const decPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decContent = fs.readFileSync(decPath, 'utf8');
assert(
  decContent.includes("## F.26A Trainer Daily Agenda Read Model Foundation"),
  "DECISIONS.md documents '## F.26A Trainer Daily Agenda Read Model Foundation'"
);
assert(
  decContent.includes("daily agenda is trainer-self-only"),
  "DECISIONS.md records trainer-self-only invariant"
);
assert(
  decContent.includes("temporal states (upcoming, in_progress, past_due, terminal) are derived, not persisted"),
  "DECISIONS.md records derived temporal states invariant"
);

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert(
  pkg.scripts && pkg.scripts['verify:trainer-daily-agenda'] === 'node scripts/verify-trainer-daily-agenda.mjs',
  "package.json registers 'verify:trainer-daily-agenda'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more F.26A Trainer Daily Agenda invariants failed.");
  process.exit(exitCode);
} else {
  console.log("PASS — F.26A TRAINER DAILY AGENDA READ MODEL FOUNDATION CLOSED");
}
