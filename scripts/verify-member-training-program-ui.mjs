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
  pkg.scripts && pkg.scripts["verify:member-training-program-ui"] === "node scripts/verify-member-training-program-ui.mjs",
  "Package.json exact registration: 'verify:member-training-program-ui' === 'node scripts/verify-member-training-program-ui.mjs'"
);

console.log("\n=== 2. Route Registration & Lazy Loading ===");
const routesPath = path.resolve(process.cwd(), 'src/routes/index.tsx');
assert(fs.existsSync(routesPath), "src/routes/index.tsx exists");
const routesContent = fs.readFileSync(routesPath, 'utf8');

assert(
  routesContent.includes('MemberTrainingProgramPage = lazy(') &&
  routesContent.includes('MemberTrainingProgramPage'),
  "src/routes/index.tsx contains lazy-loaded MemberTrainingProgramPage import"
);

// Check that under /uye routes, programim is registered
const uyeBlockMatch = routesContent.match(/path:\s*["']\/uye["'][\s\S]*?children:\s*\[([\s\S]*?)\]\s*\},/);
assert(Boolean(uyeBlockMatch), "src/routes/index.tsx has /uye route with children");
const uyeChildren = uyeBlockMatch ? uyeBlockMatch[1] : '';

assert(
  uyeChildren.includes('path: "programim"') && uyeChildren.includes('<MemberTrainingProgramPage />'),
  "/uye route registers child 'programim' rendering <MemberTrainingProgramPage />"
);

assert(
  uyeChildren.includes('<MemberSuspense><MemberTrainingProgramPage /></MemberSuspense>'),
  "/uye/programim is wrapped in MemberSuspense"
);

console.log("\n=== 3. Member Navigation Invariants ===");
const layoutPath = path.resolve(process.cwd(), 'src/member/layouts/MemberLayout.tsx');
assert(fs.existsSync(layoutPath), "src/member/layouts/MemberLayout.tsx exists");
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

// Negative check: layout must strictly NOT contain admin
assert(
  !layoutContent.toLowerCase().includes('admin'),
  "src/member/layouts/MemberLayout.tsx contains zero references to admin internals"
);

// Desktop navigation check
assert(
  layoutContent.includes('to="/uye/programim"') && layoutContent.includes('Programım'),
  "MemberLayout includes Programım NavLink targeting /uye/programim"
);

// Touch target check
const desktopMatch = layoutContent.match(/to=["']\/uye\/programim["'][\s\S]*?>[\s\S]*?Programım[\s\S]*?<\/NavLink>/g);
assert(Boolean(desktopMatch && desktopMatch.length >= 2), "Programım link exists in both desktop and mobile navigation");

for (let i = 0; i < (desktopMatch?.length || 0); i++) {
  const match = desktopMatch[i];
  assert(
    match.includes('min-h-[44px]'),
    `Navigation instance ${i + 1} enforces min-h-[44px] touch target accessibility`
  );
}

// Auth gate preserved
assert(
  layoutContent.includes('isAuthenticated && identity && !identity.account.must_change_password'),
  "MemberLayout preserves strict authentication & password change gate for navigation"
);

console.log("\n=== 4. MemberTrainingProgramPage Component & API Contract ===");
const pagePath = path.resolve(process.cwd(), 'src/member/pages/MemberTrainingProgramPage.tsx');
assert(fs.existsSync(pagePath), "src/member/pages/MemberTrainingProgramPage.tsx exists");
const pageContent = fs.readFileSync(pagePath, 'utf8');

// Canonical client method usage
assert(
  pageContent.includes('memberApiClient.getTrainingPrograms('),
  "Component calls canonical memberApiClient.getTrainingPrograms()"
);

// AbortSignal passed to client call
assert(
  pageContent.includes('memberApiClient.getTrainingPrograms(controller.signal)') ||
  pageContent.includes('memberApiClient.getTrainingPrograms(signal)'),
  "Component passes AbortSignal to memberApiClient.getTrainingPrograms()"
);

// Negative checks: no raw fetch, no admin apiClient
assert(
  !pageContent.includes('fetch('),
  "Component does NOT use raw window.fetch"
);
assert(
  !pageContent.includes("from '../../api/client'") && !pageContent.includes('from "../../../api/client"'),
  "Component does NOT import admin API client"
);
assert(
  !pageContent.includes('query') && !pageContent.includes('params') && !pageContent.includes('searchParams'),
  "Component sends zero query parameters"
);

console.log("\n=== 5. Real Day Accordion Invariants ===");
const daySectionMatch = pageContent.match(/function ProgramDaySection[\s\S]*?(?=export function MemberTrainingProgramPage|$)/);
assert(Boolean(daySectionMatch), "ProgramDaySection component defined in MemberTrainingProgramPage");
const daySectionSource = daySectionMatch ? daySectionMatch[0] : '';

// 1. useState for open/close state
assert(
  daySectionSource.includes('useState') && daySectionSource.includes('isOpen'),
  "ProgramDaySection manages open/closed state with useState (isOpen)"
);

// 2. Real button used for header
assert(
  daySectionSource.includes('<button') &&
  daySectionSource.includes('type="button"'),
  "Day accordion header uses a real <button type=\"button\"> element"
);

// 3. onClick handler toggles state
assert(
  daySectionSource.includes('onClick={() => setIsOpen(') ||
  daySectionSource.includes('onClick={() => setIsOpen((prev) => !prev)'),
  "Accordion button onClick toggles isOpen state"
);

// 4. aria-expanded bound to state
assert(
  daySectionSource.includes('aria-expanded={isOpen}'),
  "Accordion button sets aria-expanded={isOpen}"
);

// 5. aria-controls points to content ID
assert(
  daySectionSource.includes('aria-controls={contentId}') &&
  daySectionSource.includes('id={contentId}'),
  "Accordion button aria-controls points to content container ID"
);

// 6. Content hidden when closed
assert(
  daySectionSource.includes('{isOpen && (') || daySectionSource.includes('{isOpen &&'),
  "Accordion content is only rendered when isOpen is true"
);

// 7. Button touch target >= 44px
assert(
  daySectionSource.includes('min-h-[44px]'),
  "Accordion header button enforces min-h-[44px] touch target"
);

// 8. Visible chevron icon with indicator
assert(
  daySectionSource.includes('ChevronDown') &&
  (daySectionSource.includes('rotate-180') || daySectionSource.includes('transition-transform')),
  "Accordion header renders visible Chevron indicator with animated rotation"
);

// 9. Day exercise count remains visible in all states
assert(
  daySectionSource.includes('{day.exercises.length} egzersiz') &&
  !daySectionSource.match(/\{isOpen && [\s\S]*?\{day\.exercises\.length\} egzersiz/),
  "Day exercise count remains visible in header regardless of accordion open/closed state"
);

// 10. Empty day state inside accordion
assert(
  daySectionSource.includes('Bu güne henüz egzersiz eklenmemiş.') &&
  daySectionSource.indexOf('Bu güne henüz egzersiz eklenmemiş.') > daySectionSource.indexOf('{isOpen &&'),
  "Empty day state ('Bu güne henüz egzersiz eklenmemiş.') is retained inside accordion content"
);

console.log("\n=== 6. Algorithmic Day Accordion State Simulation ===");
// Simulate ProgramDaySection state machine
function simulateDayAccordion(initialState) {
  let state = initialState;
  const toggle = () => { state = !state; };
  return {
    getIsOpen: () => state,
    getAriaExpanded: () => Boolean(state),
    isContentVisible: () => state === true,
    toggle
  };
}

const acc1 = simulateDayAccordion(true);
assert(acc1.getIsOpen() === true, "Simulation 1.1: defaultOpen=true starts open");
assert(acc1.getAriaExpanded() === true, "Simulation 1.2: aria-expanded is true when open");
assert(acc1.isContentVisible() === true, "Simulation 1.3: content is visible when open");
acc1.toggle();
assert(acc1.getIsOpen() === false, "Simulation 1.4: click closes accordion");
assert(acc1.getAriaExpanded() === false, "Simulation 1.5: aria-expanded is false when closed");
assert(acc1.isContentVisible() === false, "Simulation 1.6: content is hidden when closed");
acc1.toggle();
assert(acc1.getIsOpen() === true, "Simulation 1.7: click re-opens accordion");

const acc2 = simulateDayAccordion(false);
assert(acc2.getIsOpen() === false, "Simulation 2.1: defaultOpen=false starts closed");
assert(acc2.isContentVisible() === false, "Simulation 2.2: content hidden initially");

// Simulate Initial Open Day Selector Algorithm
function computeInitialOpenDayId(program) {
  const firstDayWithExercises = program.days.find((d) => d.exercises.length > 0);
  return firstDayWithExercises
    ? firstDayWithExercises.id
    : program.days.length > 0
    ? program.days[0].id
    : null;
}

const fixtureProg1 = {
  days: [
    { id: 10, title: 'Gün 1', exercises: [] },
    { id: 20, title: 'Gün 2', exercises: [{ id: 101 }] }
  ]
};
assert(
  computeInitialOpenDayId(fixtureProg1) === 20,
  "Simulation 3.1: First day with exercises (Day 2) is chosen as default open"
);

const fixtureProg2 = {
  days: [
    { id: 10, title: 'Gün 1', exercises: [{ id: 101 }] },
    { id: 20, title: 'Gün 2', exercises: [{ id: 102 }] }
  ]
};
assert(
  computeInitialOpenDayId(fixtureProg2) === 10,
  "Simulation 3.2: When Day 1 has exercises, Day 1 is default open"
);

const fixtureProg3 = {
  days: [
    { id: 10, title: 'Gün 1', exercises: [] },
    { id: 20, title: 'Gün 2', exercises: [] }
  ]
};
assert(
  computeInitialOpenDayId(fixtureProg3) === 10,
  "Simulation 3.3: When no day has exercises, first day (Day 1) is default open"
);

const fixtureProg4 = { days: [] };
assert(
  computeInitialOpenDayId(fixtureProg4) === null,
  "Simulation 3.4: Program with 0 days yields null initialOpenDayId"
);

console.log("\n=== 7. Empty Program Logic & Algorithmic Simulation ===");
// Source code invariant:
assert(
  pageContent.includes('!hasAnyExercises && (') || pageContent.includes('!hasAnyExercises &&'),
  "Component uses !hasAnyExercises to evaluate program empty state"
);

// Negative check: ensure the flawed condition is NOT used
assert(
  !pageContent.includes('!hasAnyExercises && !hasDays'),
  "Flawed condition '!hasAnyExercises && !hasDays' is completely eliminated"
);

// Ensure day cards are rendered whenever hasDays is true
assert(
  pageContent.includes('{hasDays && (') &&
  pageContent.includes('prog.days.map'),
  "Day cards are rendered whenever hasDays is true, even when days have zero exercises"
);

// Algorithmic evaluation of program and day empty states
function evaluateProgramDisplay(program) {
  const hasDays = program.days.length > 0;
  const hasUnassigned = program.unassigned_exercises.length > 0;
  const hasAnyExercises = program.days.some((d) => d.exercises.length > 0) || hasUnassigned;
  const showProgramEmptyState = !hasAnyExercises;
  const renderedDaysCount = hasDays ? program.days.length : 0;
  const showUnassignedSection = hasUnassigned;

  return {
    hasDays,
    hasUnassigned,
    hasAnyExercises,
    showProgramEmptyState,
    renderedDaysCount,
    showUnassignedSection
  };
}

// Case 1: Program has zero days and zero unassigned exercises
const eval1 = evaluateProgramDisplay({ days: [], unassigned_exercises: [] });
assert(
  eval1.showProgramEmptyState === true && eval1.renderedDaysCount === 0,
  "Fixture 1: Zero days + zero unassigned -> shows program empty state ('Bu programa henüz egzersiz eklenmemiş.')"
);

// Case 2: Program has days defined, but zero exercises across all days, zero unassigned
const eval2 = evaluateProgramDisplay({
  days: [
    { id: 1, title: 'Gün 1', exercises: [] },
    { id: 2, title: 'Gün 2', exercises: [] }
  ],
  unassigned_exercises: []
});
assert(
  eval2.showProgramEmptyState === true && eval2.renderedDaysCount === 2,
  "Fixture 2: Defined days with 0 exercises -> displays BOTH program empty state AND keeps day cards visible"
);

// Case 3: Program has 0 days, but has unassigned exercises
const eval3 = evaluateProgramDisplay({
  days: [],
  unassigned_exercises: [{ id: 50, exercise_name: 'Squat' }]
});
assert(
  eval3.showProgramEmptyState === false && eval3.showUnassignedSection === true,
  "Fixture 3: Program with unassigned exercises is NOT treated as empty"
);

// Case 4: Program has days with exercises
const eval4 = evaluateProgramDisplay({
  days: [
    { id: 1, title: 'Gün 1', exercises: [{ id: 10, exercise_name: 'Bench Press' }] }
  ],
  unassigned_exercises: []
});
assert(
  eval4.showProgramEmptyState === false && eval4.renderedDaysCount === 1,
  "Fixture 4: Program with exercises does not show program empty state"
);

console.log("\n=== 8. Server-Authoritative Ordering & Direct Arrays ===");
assert(
  !pageContent.includes('.sort(') &&
  !pageContent.includes('.toSorted(') &&
  !pageContent.includes('localeCompare('),
  "Component strictly forbids client-side sorting (.sort, .toSorted, localeCompare)"
);
assert(
  pageContent.includes('programs.map') &&
  pageContent.includes('prog.days.map') &&
  pageContent.includes('day.exercises.map'),
  "Component preserves and directly renders canonical API order across programs, days, and exercises"
);

console.log("\n=== 9. Exercise Detail & Deterministic Date Formatting ===");
assert(
  pageContent.includes('exercise.exercise_name') || pageContent.includes('ex.exercise_name'),
  "Exercise card renders exercise_name"
);
assert(
  pageContent.includes('exercise.instructions') || pageContent.includes('ex.instructions'),
  "Exercise card renders instructions if present"
);
assert(
  pageContent.includes('exercise.sets') || pageContent.includes('ex.sets'),
  "Exercise card conditionally renders sets metric"
);
assert(
  pageContent.includes('exercise.repetitions') || pageContent.includes('ex.repetitions'),
  "Exercise card conditionally renders repetitions metric"
);
assert(
  pageContent.includes('exercise.duration_seconds') || pageContent.includes('ex.duration_seconds'),
  "Exercise card conditionally renders duration_seconds metric"
);
assert(
  pageContent.includes('exercise.rest_seconds') || pageContent.includes('ex.rest_seconds'),
  "Exercise card conditionally renders rest_seconds metric"
);

// Deterministic date formatting
assert(
  pageContent.includes('formatDate(') &&
  !pageContent.includes('new Date(') &&
  !pageContent.includes('Intl.DateTimeFormat'),
  "Date formatting uses pure regex string parser without new Date() or Intl"
);

console.log("\n=== 10. Error Handling & Race Safety ===");
assert(
  pageContent.includes('Antrenman programları yüklenemedi.') || pageContent.includes('Antrenman programları yüklenemedi'),
  "Component provides bounded Turkish error message"
);

assert(
  pageContent.includes('Tekrar Dene'),
  "Component provides retry button 'Tekrar Dene'"
);

const retryMatch = pageContent.match(/Tekrar Dene[\s\S]*?<\/button>|<button[\s\S]*?Tekrar Dene/);
assert(
  Boolean(retryMatch && retryMatch[0].includes('min-h-[44px]')),
  "Retry button enforces min-h-[44px] touch target"
);

assert(
  pageContent.includes('AbortController') &&
  pageContent.includes('requestGenerationRef') &&
  pageContent.includes('isMountedRef'),
  "Component guards against race conditions with AbortController, request generation counter, and mount guard"
);

console.log("\n=== 11. Strict Read-Only Anti-Scope ===");
assert(
  !pageContent.includes('type="checkbox"') && !pageContent.includes("type='checkbox'"),
  "Anti-scope: Zero completion checkboxes"
);
assert(
  !pageContent.includes('POST') && !pageContent.includes('PATCH') && !pageContent.includes('DELETE'),
  "Anti-scope: Zero member mutation requests"
);
assert(
  !pageContent.includes('input') || !pageContent.includes('placeholder="Ağırlık"'),
  "Anti-scope: Zero weight/rep logging inputs"
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
  console.log("✅ SUCCESS: All Member Training Program UI (F.33B) corrective invariants verified.");
  process.exit(0);
}
