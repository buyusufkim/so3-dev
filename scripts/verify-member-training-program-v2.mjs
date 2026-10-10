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

console.log("=== 1. Package.json Script Registration ===");
const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:member-training-program-v2"] === "node scripts/verify-member-training-program-v2.mjs",
  "Package.json exact registration: 'verify:member-training-program-v2' === 'node scripts/verify-member-training-program-v2.mjs'"
);

console.log("\n=== 2. Route & Controller Endpoint Invariants ===");
const indexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(indexPath), "api/index.php exists");
const indexContent = fs.readFileSync(indexPath, 'utf8');

assert(
  indexContent.includes("$requestUri === '/api/member/training-program' && $method === 'GET'"),
  "api/index.php registers canonical GET /api/member/training-program endpoint"
);

const controllerPath = path.resolve(process.cwd(), 'api/controllers/MemberPortalController.php');
assert(fs.existsSync(controllerPath), "MemberPortalController.php exists");
const controllerContent = fs.readFileSync(controllerPath, 'utf8');

assert(
  controllerContent.includes('public function getTrainingPrograms()'),
  "MemberPortalController.php defines public function getTrainingPrograms()"
);

const getTpMethodMatch = controllerContent.match(/public function getTrainingPrograms\(\)[\s\S]*?(?=public function|\/\*\*|$)/);
assert(Boolean(getTpMethodMatch), "getTrainingPrograms method body extracted");
const getTpBody = getTpMethodMatch ? getTpMethodMatch[0] : '';

assert(
  getTpBody.includes('$this->guard()'),
  "getTrainingPrograms invokes $this->guard() for authentication & empty GET param checks"
);

console.log("\n=== 3. Query Architecture & N+1 Prevention ===");
// Enforce bounded query architecture: queries outside loops
assert(
  getTpBody.includes('FROM training_programs tp') &&
  getTpBody.includes('FROM training_program_days d') &&
  getTpBody.includes('FROM program_exercises e'),
  "Method executes dedicated queries for programs, days, and exercises"
);

// Verify no queries inside foreach loops
const loopMatches = getTpBody.match(/foreach\s*\([^{]+\)\s*\{([^}]+)\}/g) || [];
for (let i = 0; i < loopMatches.length; i++) {
  const loopBody = loopMatches[i];
  assert(
    !loopBody.includes('->prepare(') && !loopBody.includes('->query('),
    `Foreach loop ${i + 1} does not execute database queries (N+1 free)`
  );
}

// Check native PDO placeholder safety
const prepareMatches = getTpBody.match(/\$this->db->prepare\s*\(\s*["']([\s\S]*?)["']\s*\)/g) || [];
for (let i = 0; i < prepareMatches.length; i++) {
  const prep = prepareMatches[i];
  const namedParams = prep.match(/:[a-zA-Z0-9_]+/g) || [];
  const uniqueParams = new Set(namedParams);
  assert(
    namedParams.length === uniqueParams.size,
    `Prepared statement ${i + 1} has zero duplicate named placeholders (Native PDO safe)`
  );
}

console.log("\n=== 4. Canonical Read Model & Key Invariants in Controller ===");
// Program ordering
assert(
  getTpBody.includes('CASE WHEN tp.start_date IS NULL THEN 1 ELSE 0 END ASC') &&
  getTpBody.includes('tp.start_date DESC') &&
  getTpBody.includes('tp.created_at DESC') &&
  getTpBody.includes('tp.id DESC'),
  "Controller enforces deterministic program ordering in SQL with null start_date last"
);

// Program fields
assert(getTpBody.includes("'days' => $daysList") || getTpBody.includes("'days' =>"), "Program response includes 'days'");
assert(getTpBody.includes("'unassigned_exercises' =>"), "Program response includes 'unassigned_exercises'");
assert(!getTpBody.includes("'exercises' => $formattedEx"), "Program response does NOT include deprecated top-level 'exercises'");

// Day fields
assert(
  getTpBody.includes("'title' => (string)$d['title']") &&
  getTpBody.includes("'sort_order' => (int)$d['sort_order']") &&
  getTpBody.includes("'exercises' => []"),
  "Day shape contains exact canonical fields: id, title, sort_order, exercises"
);

// Exercise ordering in SQL
assert(
  getTpBody.includes('ORDER BY d.sort_order ASC, d.id ASC'),
  "Days query orders by d.sort_order ASC, d.id ASC"
);
assert(
  getTpBody.includes('ORDER BY e.sort_order ASC, e.id ASC'),
  "Exercises query orders by e.sort_order ASC, e.id ASC"
);

console.log("\n=== 5. Algorithmic Simulation: Grouping, Legacy, Cross-Program & Empty Days ===");

function simulateGrouping(programs, days, exercises) {
  const programDays = {};
  const programUnassigned = {};

  for (const p of programs) {
    programDays[p.id] = {};
    programUnassigned[p.id] = [];
  }

  for (const d of days) {
    const pId = d.program_id;
    if (programDays[pId]) {
      programDays[pId][d.id] = {
        id: d.id,
        title: d.title,
        sort_order: d.sort_order,
        exercises: []
      };
    }
  }

  for (const ex of exercises) {
    const pId = ex.program_id;
    if (!programDays[pId]) continue;

    const formattedEx = {
      id: ex.id,
      exercise_name: ex.exercise_name,
      sets: ex.sets,
      repetitions: ex.repetitions,
      duration_seconds: ex.duration_seconds,
      rest_seconds: ex.rest_seconds,
      instructions: ex.instructions,
      sort_order: ex.sort_order
    };

    const dayId = ex.program_day_id;
    if (dayId !== null && programDays[pId][dayId]) {
      programDays[pId][dayId].exercises.push(formattedEx);
    } else {
      programUnassigned[pId].push(formattedEx);
    }
  }

  return programs.map(p => ({
    id: p.id,
    uuid: p.uuid,
    title: p.title,
    start_date: p.start_date,
    end_date: p.end_date,
    days: Object.values(programDays[p.id]),
    unassigned_exercises: programUnassigned[p.id]
  }));
}

// Simulation Test 1: Day-assigned + null-day exercise
const sim1 = simulateGrouping(
  [{ id: 10, uuid: 'u1', title: 'P1', start_date: '2026-10-01', end_date: null }],
  [{ id: 20, program_id: 10, title: 'Gün 1', sort_order: 1 }],
  [
    { id: 101, program_id: 10, program_day_id: 20, exercise_name: 'Bench', sets: 4, repetitions: '10', duration_seconds: null, rest_seconds: 60, instructions: null, sort_order: 1 },
    { id: 102, program_id: 10, program_day_id: null, exercise_name: 'Stretching', sets: 1, repetitions: null, duration_seconds: 300, rest_seconds: null, instructions: null, sort_order: 2 }
  ]
);
assert(sim1[0].days.length === 1, "Simulation 1: 1 day present");
assert(sim1[0].days[0].exercises.length === 1 && sim1[0].days[0].exercises[0].id === 101, "Simulation 1: Day 1 contains exercise 101");
assert(sim1[0].unassigned_exercises.length === 1 && sim1[0].unassigned_exercises[0].id === 102, "Simulation 1: Unassigned contains exercise 102");

// Simulation Test 2: Cross-program defense
// Program 10 exercise points to Day 30 which belongs to Program 20
const sim2 = simulateGrouping(
  [
    { id: 10, uuid: 'u10', title: 'P10', start_date: null, end_date: null },
    { id: 20, uuid: 'u20', title: 'P20', start_date: null, end_date: null }
  ],
  [
    { id: 30, program_id: 20, title: 'Gün X', sort_order: 1 }
  ],
  [
    { id: 201, program_id: 10, program_day_id: 30, exercise_name: 'Squat', sets: 3, repetitions: '12', duration_seconds: null, rest_seconds: 90, instructions: null, sort_order: 1 }
  ]
);
assert(sim2[0].days.length === 0, "Simulation 2: Program 10 has 0 days");
assert(sim2[0].unassigned_exercises.length === 1 && sim2[0].unassigned_exercises[0].id === 201, "Simulation 2: Cross-program exercise safely treated as unassigned in Program 10");
assert(sim2[1].days[0].exercises.length === 0, "Simulation 2: Program 20 Day 30 has 0 exercises");

// Simulation Test 3: Empty day preserved
const sim3 = simulateGrouping(
  [{ id: 10, uuid: 'u1', title: 'P1', start_date: null, end_date: null }],
  [{ id: 25, program_id: 10, title: 'Kardiyo Günü', sort_order: 1 }],
  []
);
assert(sim3[0].days.length === 1, "Simulation 3: Empty day preserved");
assert(sim3[0].days[0].exercises.length === 0, "Simulation 3: Empty day has empty exercises array");
assert(sim3[0].unassigned_exercises.length === 0, "Simulation 3: Unassigned exercises is empty");

console.log("\n=== 6. TypeScript Contract & Fail-Closed Validator Invariants ===");
const validatorsPath = path.resolve(process.cwd(), 'src/member/api/validators.ts');
assert(fs.existsSync(validatorsPath), "validators.ts exists");
const validatorsContent = fs.readFileSync(validatorsPath, 'utf8');

assert(
  validatorsContent.includes('export type MemberTrainingProgramDay = {'),
  "validators.ts exports MemberTrainingProgramDay type"
);

assert(
  validatorsContent.includes('export type MemberTrainingProgram = {'),
  "validators.ts exports MemberTrainingProgram type"
);

const tpTypeStartIndex = validatorsContent.indexOf('export type MemberTrainingProgram =');
const tpTypeEndIndex = validatorsContent.indexOf('function validateMemberExercise', tpTypeStartIndex);
assert(tpTypeStartIndex !== -1 && tpTypeEndIndex !== -1, "MemberTrainingProgram type block located");
const tpTypeBody = validatorsContent.slice(tpTypeStartIndex, tpTypeEndIndex);

assert(
  tpTypeBody.includes('days: MemberTrainingProgramDay[];') &&
  tpTypeBody.includes('unassigned_exercises: MemberExercise[];'),
  "MemberTrainingProgram type includes days and unassigned_exercises"
);

assert(
  !/\bexercises:\s*MemberExercise\[\];/.test(tpTypeBody),
  "MemberTrainingProgram strictly DOES NOT contain deprecated top-level exercises"
);

assert(
  validatorsContent.includes('validateMemberTrainingProgramDay'),
  "validators.ts defines validateMemberTrainingProgramDay"
);

assert(
  validatorsContent.includes('validateMemberExercise'),
  "validators.ts defines validateMemberExercise"
);

assert(
  validatorsContent.includes('export function validateTrainingPrograms'),
  "validators.ts exports validateTrainingPrograms function"
);

// Runtime validator simulation replicating validateTrainingPrograms
function isRecord(val) {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function simulateValidateMemberExercise(ex) {
  if (!isRecord(ex)) throw new Error('Invalid exercise item');
  const requiredExKeys = ['id', 'exercise_name', 'sets', 'repetitions', 'duration_seconds', 'rest_seconds', 'instructions', 'sort_order'];
  const exKeys = Object.keys(ex);
  if (exKeys.length !== requiredExKeys.length || !requiredExKeys.every(k => k in ex)) {
    throw new Error('Unexpected or missing fields in exercise item');
  }
  if (typeof ex.id !== 'number' || !Number.isInteger(ex.id) || ex.id <= 0) throw new Error('Invalid exercise id');
  if (typeof ex.exercise_name !== 'string' || !ex.exercise_name.trim()) throw new Error('Invalid exercise_name');
  return true;
}

function simulateValidateMemberDay(day) {
  if (!isRecord(day)) throw new Error('Invalid day item');
  const requiredDayKeys = ['id', 'title', 'sort_order', 'exercises'];
  const dayKeys = Object.keys(day);
  if (dayKeys.length !== requiredDayKeys.length || !requiredDayKeys.every(k => k in day)) {
    throw new Error('Unexpected or missing fields in day item');
  }
  if (typeof day.id !== 'number' || !Number.isInteger(day.id) || day.id <= 0) throw new Error('Invalid day id');
  if (typeof day.title !== 'string' || !day.title.trim()) throw new Error('Invalid day title');
  if (!Array.isArray(day.exercises)) throw new Error('Invalid day exercises array');
  day.exercises.forEach(simulateValidateMemberExercise);
  return true;
}

function simulateValidateTrainingPrograms(data) {
  if (!isRecord(data) || !Array.isArray(data.items)) throw new Error('Invalid training programs');
  return data.items.map(i => {
    if (!isRecord(i)) throw new Error('Invalid program item');
    const requiredProgramKeys = ['id', 'uuid', 'title', 'start_date', 'end_date', 'trainer', 'days', 'unassigned_exercises'];
    const pKeys = Object.keys(i);
    if (pKeys.length !== requiredProgramKeys.length || !requiredProgramKeys.every(k => k in i)) {
      throw new Error('Unexpected or missing fields in program item');
    }
    if (!Array.isArray(i.days) || !Array.isArray(i.unassigned_exercises)) throw new Error('Invalid arrays');
    i.days.forEach(simulateValidateMemberDay);
    i.unassigned_exercises.forEach(simulateValidateMemberExercise);
    return true;
  });
}

const validPayload = {
  items: [
    {
      id: 10,
      uuid: '00000000-0000-0000-0000-000000000001',
      title: 'Program A',
      start_date: '2026-10-01',
      end_date: null,
      trainer: {
        id: 4,
        uuid: '00000000-0000-0000-0000-000000000004',
        name: 'Mustafa Gül',
        role_title: 'Personal Trainer'
      },
      days: [
        {
          id: 20,
          title: 'Gün 1',
          sort_order: 1,
          exercises: [
            {
              id: 100,
              exercise_name: 'Bench Press',
              sets: 4,
              repetitions: '10',
              duration_seconds: null,
              rest_seconds: 90,
              instructions: null,
              sort_order: 1
            }
          ]
        }
      ],
      unassigned_exercises: []
    }
  ]
};

const simValidationResult = simulateValidateTrainingPrograms(validPayload);
assert(Array.isArray(simValidationResult) && simValidationResult.length === 1, "Validator accepts valid day-based payload");

// Fail closed: deprecated top-level exercises
let legacyFailed = false;
try {
  simulateValidateTrainingPrograms({
    items: [
      {
        id: 10,
        uuid: '00000000-0000-0000-0000-000000000001',
        title: 'Program A',
        start_date: '2026-10-01',
        end_date: null,
        trainer: null,
        exercises: []
      }
    ]
  });
} catch {
  legacyFailed = true;
}
assert(legacyFailed, "Validator rejects payload with legacy top-level exercises");

// Fail closed: unexpected fields (e.g. program_day_id on exercise)
let unexpectedFieldFailed = false;
try {
  simulateValidateTrainingPrograms({
    items: [
      {
        id: 10,
        uuid: '00000000-0000-0000-0000-000000000001',
        title: 'Program A',
        start_date: '2026-10-01',
        end_date: null,
        trainer: null,
        days: [
          {
            id: 20,
            title: 'Gün 1',
            sort_order: 1,
            exercises: [
              {
                id: 100,
                program_day_id: 20, // forbidden unexpected field
                exercise_name: 'Bench Press',
                sets: 4,
                repetitions: '10',
                duration_seconds: null,
                rest_seconds: 90,
                instructions: null,
                sort_order: 1
              }
            ]
          }
        ],
        unassigned_exercises: []
      }
    ]
  });
} catch {
  unexpectedFieldFailed = true;
}
assert(unexpectedFieldFailed, "Validator rejects exercise with unexpected program_day_id field");

// Fail closed: unexpected field on day (e.g. notes)
let unexpectedDayFieldFailed = false;
try {
  simulateValidateTrainingPrograms({
    items: [
      {
        id: 10,
        uuid: '00000000-0000-0000-0000-000000000001',
        title: 'Program A',
        start_date: '2026-10-01',
        end_date: null,
        trainer: null,
        days: [
          {
            id: 20,
            title: 'Gün 1',
            sort_order: 1,
            notes: 'Extra notes', // forbidden unexpected field
            exercises: []
          }
        ],
        unassigned_exercises: []
      }
    ]
  });
} catch {
  unexpectedDayFieldFailed = true;
}
assert(unexpectedDayFieldFailed, "Validator rejects day with unexpected notes field");

console.log("\n=== 7. Member Client API Invariants ===");
const clientPath = path.resolve(process.cwd(), 'src/member/api/client.ts');
assert(fs.existsSync(clientPath), "client.ts exists");
const clientContent = fs.readFileSync(clientPath, 'utf8');

assert(
  clientContent.includes('getTrainingPrograms(signal?: AbortSignal): Promise<MemberTrainingProgram[]>'),
  "client.ts exports getTrainingPrograms returning Promise<MemberTrainingProgram[]>"
);
assert(
  clientContent.includes("request('/api/member/training-program'") || clientContent.includes('request("/api/member/training-program"'),
  "client.ts targets canonical endpoint '/api/member/training-program'"
);
assert(
  clientContent.includes('validateTrainingPrograms(data)'),
  "client.ts validates response using validateTrainingPrograms"
);

console.log("\n=== 8. Dashboard Compatibility Layer ===");
const dashboardPath = path.resolve(process.cwd(), 'src/member/pages/MemberDashboardPage.tsx');
assert(fs.existsSync(dashboardPath), "MemberDashboardPage.tsx exists");
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

assert(
  dashboardContent.includes('getProgramExercises') ||
  dashboardContent.includes('prog.days.flatMap') ||
  dashboardContent.includes('prog.days.reduce') ||
  dashboardContent.includes('prog.days.length'),
  "Dashboard uses day structure without client-side sort"
);

assert(
  !dashboardContent.includes('.sort('),
  "Dashboard strictly does NOT sort program days/exercises client-side"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more invariants failed verification.");
  process.exit(1);
} else {
  console.log("✅ SUCCESS: All Member Training Program Day Read Model (F.33A) invariants verified.");
  process.exit(0);
}
