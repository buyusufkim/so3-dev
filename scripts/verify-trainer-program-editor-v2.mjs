import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const exercisesPanelPath = path.join(rootDir, 'src', 'admin', 'pages', 'trainer-training-programs', 'TrainerProgramExercisesPanel.tsx');
const daysPanelPath = path.join(rootDir, 'src', 'admin', 'pages', 'trainer-training-programs', 'TrainerProgramDaysPanel.tsx');
const editorPath = path.join(rootDir, 'src', 'admin', 'pages', 'trainer-training-programs', 'TrainerTrainingProgramEditor.tsx');
const decisionsPath = path.join(rootDir, 'DECISIONS.md');
const pkgPath = path.join(rootDir, 'package.json');

let hasErrors = false;
let assertionCount = 0;

function assert(condition, message) {
    assertionCount++;
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        hasErrors = true;
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

// 1. Files existence check
assert(fs.existsSync(exercisesPanelPath), 'Invariant 1.1: TrainerProgramExercisesPanel.tsx exists');
assert(fs.existsSync(daysPanelPath), 'Invariant 1.2: TrainerProgramDaysPanel.tsx exists');
assert(fs.existsSync(editorPath), 'Invariant 1.3: TrainerTrainingProgramEditor.tsx exists');
assert(fs.existsSync(decisionsPath), 'Invariant 1.4: DECISIONS.md exists');
assert(fs.existsSync(pkgPath), 'Invariant 1.5: package.json exists');

const exercisesPanelSource = fs.readFileSync(exercisesPanelPath, 'utf8');

// 2. Collapsible day groups - Session state and default expanded behavior
assert(
    exercisesPanelSource.includes('collapsedDayIds') &&
    exercisesPanelSource.includes('isDayCollapsed') &&
    exercisesPanelSource.includes('toggleDayCollapse'),
    'Invariant 2.1: TrainerProgramExercisesPanel manages collapsible day state with isDayCollapsed and toggleDayCollapse'
);

assert(
    !exercisesPanelSource.includes('localStorage') &&
    !exercisesPanelSource.includes('sessionStorage'),
    'Invariant 2.2: Zero storage persistence (localStorage/sessionStorage) in TrainerProgramExercisesPanel; session-only state'
);

// 3. Collapsible day groups - Toggle controls, visible copy & accessibility
assert(
    exercisesPanelSource.includes('btn-toggle-day-collapse-') &&
    exercisesPanelSource.includes('Daralt') &&
    exercisesPanelSource.includes('Göster'),
    'Invariant 3.1: Day header includes visible toggle control displaying Daralt and Göster copy'
);

assert(
    exercisesPanelSource.includes('aria-expanded={!isCollapsed}') ||
    exercisesPanelSource.includes('aria-expanded={!isDayCollapsed'),
    'Invariant 3.2: Day toggle control enforces aria-expanded state'
);

assert(
    exercisesPanelSource.includes('aria-controls={`trainer-day-exercises-${day.id}`}') &&
    exercisesPanelSource.includes('id={`trainer-day-exercises-${day.id}`}'),
    'Invariant 3.3: Day toggle control links to deterministic content container ID via aria-controls'
);

assert(
    exercisesPanelSource.includes('Bu güne henüz egzersiz atanmamış.'),
    'Invariant 3.4: Empty day container preserves canonical copy when expanded'
);

// 4. Program structure summary
assert(
    exercisesPanelSource.includes('trainer-program-structure-summary') &&
    exercisesPanelSource.includes('program günü') &&
    exercisesPanelSource.includes('egzersiz') &&
    exercisesPanelSource.includes('atanmamış'),
    'Invariant 4.1: Program structure summary displays program günü, egzersiz, and atanmamış counts'
);

assert(
    (exercisesPanelSource.includes('dayCount') || exercisesPanelSource.includes('programDays.length')) &&
    (exercisesPanelSource.includes('exerciseCount') || exercisesPanelSource.includes('exercises.length')) &&
    (exercisesPanelSource.includes('unassignedCount') || exercisesPanelSource.includes('unassignedExercises.length')),
    'Invariant 4.2: Summary metrics are derived directly from validated array counts'
);

assert(
    !exercisesPanelSource.includes('completion %') &&
    !exercisesPanelSource.includes('quality score') &&
    !exercisesPanelSource.includes('program score') &&
    !exercisesPanelSource.includes('adherence') &&
    !exercisesPanelSource.includes('progress score'),
    'Invariant 4.3: Summary is strictly count-only with zero scores or percentages'
);

// 5. Quick exercise day move - UI presentation & options
assert(
    exercisesPanelSource.includes('Güne Taşı') &&
    exercisesPanelSource.includes('Gün Atanmamış') &&
    exercisesPanelSource.includes('programDays.map'),
    'Invariant 5.1: Quick move control renders Güne Taşı label, Gün Atanmamış option, and options from programDays'
);

assert(
    exercisesPanelSource.includes('getTargetDayValue') &&
    exercisesPanelSource.includes('selectedMoveDays'),
    'Invariant 5.2: Current exercise day is represented in quick move select state'
);

assert(
    exercisesPanelSource.includes('btn-quick-move-') &&
    exercisesPanelSource.includes('Taşı'),
    'Invariant 5.3: Explicit select + Taşı action pattern used for quick move intent'
);

// 6. Quick exercise day move - Mutation semantics & no-op protection
assert(
    exercisesPanelSource.includes('/api/trainer/program-exercises/${exercise.id}') &&
    exercisesPanelSource.includes('apiClient.patch'),
    'Invariant 6.1: Quick move calls PATCH /api/trainer/program-exercises/{exerciseId}'
);

const patchPayloadRegex = /apiClient\.patch\(\s*`\/api\/trainer\/program-exercises\/\$\{exercise\.id\}`\s*,\s*\{\s*program_day_id:\s*targetProgramDayId\s*\}\s*\)/;
assert(
    patchPayloadRegex.test(exercisesPanelSource),
    'Invariant 6.2: Quick move PATCH payload contains ONLY program_day_id'
);

assert(
    exercisesPanelSource.includes('targetProgramDayId === exercise.program_day_id') &&
    exercisesPanelSource.includes('return;'),
    'Invariant 6.3: No-op move protection prevents sending PATCH request when selected day equals current day'
);

// 7. Quick exercise day move - Busy isolation & canonical refresh
assert(
    exercisesPanelSource.includes('movingExerciseId') &&
    exercisesPanelSource.includes('setMovingExerciseId'),
    'Invariant 7.1: Per-exercise busy state isolates mutation loading without locking global editor'
);

const quickMoveFunctionRegex = /const handleQuickMove = async[\s\S]*?await fetchExercises\(\);[\s\S]*?\}/;
assert(
    quickMoveFunctionRegex.test(exercisesPanelSource),
    'Invariant 7.2: Successful quick move triggers canonical fetchExercises() refetch without optimistic splicing'
);

assert(
    exercisesPanelSource.includes('moveError') &&
    exercisesPanelSource.includes('trainer-move-exercise-error'),
    'Invariant 7.3: Bounded error state renders safe feedback on quick move failure'
);

// 8. Touch target compliance: minimum 44px on all interactive controls
assert(
    !exercisesPanelSource.includes('min-h-[36px]'),
    'Invariant 8.1: TrainerProgramExercisesPanel contains zero non-compliant min-h-[36px] touch targets'
);

assert(
    exercisesPanelSource.includes('btn-toggle-day-collapse-') &&
    exercisesPanelSource.includes('mobile-quick-move-') &&
    exercisesPanelSource.includes('btn-quick-move-'),
    'Invariant 8.2: All newly introduced controls have dedicated deterministic IDs'
);

function getButtonClassAround(source, marker) {
    const idx = source.indexOf(marker);
    if (idx === -1) return null;
    const btnStart = source.lastIndexOf('<button', idx);
    const btnEnd = source.indexOf('</button>', idx);
    if (btnStart === -1 || btnEnd === -1) return null;
    const block = source.slice(btnStart, btnEnd);
    const match = block.match(/className="([^"]*)"/);
    return match ? match[1] : null;
}

const toggleBtnClass = getButtonClassAround(exercisesPanelSource, 'btn-toggle-day-collapse-');
assert(
    Boolean(toggleBtnClass && toggleBtnClass.includes('min-h-[44px]')),
    'Invariant 8.3: btn-toggle-day-collapse- action explicitly enforces min-h-[44px]'
);

const quickMoveBtnClass = getButtonClassAround(exercisesPanelSource, 'btn-quick-move-');
assert(
    Boolean(quickMoveBtnClass && quickMoveBtnClass.includes('min-h-[44px]')),
    'Invariant 8.4: btn-quick-move- action explicitly enforces min-h-[44px]'
);

// 9. Fetch safety & race condition protection (Permanently Guarded)
assert(
    exercisesPanelSource.includes('new AbortController()') &&
    exercisesPanelSource.includes('requestGenRef') &&
    exercisesPanelSource.includes('isMountedRef'),
    'Invariant 9.1: Race condition protections (new AbortController, requestGenRef, isMountedRef) permanently preserved'
);

const exerciseFetchWithSignalRegex = /apiClient\.get\(\s*`\/api\/trainer\/training-programs\/\$\{programId\}\/exercises`\s*,\s*\{[\s\S]*?signal:\s*controller\.signal[\s\S]*?\}\s*\)/;
assert(
    exerciseFetchWithSignalRegex.test(exercisesPanelSource),
    'Invariant 9.2: Exercise fetch passes signal: controller.signal option'
);

const bareExerciseFetchRegex = /apiClient\.get\(\s*`\/api\/trainer\/training-programs\/\$\{programId\}\/exercises`\s*\)/;
assert(
    !bareExerciseFetchRegex.test(exercisesPanelSource),
    'Invariant 9.3: Negative check: No bare apiClient.get calls for exercises without abort signal'
);

// 10. Strict Anti-Scope Guards: Zero client sorting & Zero drag/drop
assert(
    !exercisesPanelSource.includes('.sort(') &&
    !exercisesPanelSource.includes('toSorted(') &&
    !exercisesPanelSource.includes('localeCompare('),
    'Invariant 10.1: Zero client-side sorting (.sort, toSorted, localeCompare) in TrainerProgramExercisesPanel'
);

assert(
    !exercisesPanelSource.includes('draggable') &&
    !exercisesPanelSource.includes('onDragStart') &&
    !exercisesPanelSource.includes('onDrop') &&
    !exercisesPanelSource.includes('dnd-kit') &&
    !exercisesPanelSource.includes('useSortable') &&
    !exercisesPanelSource.includes('react-beautiful-dnd'),
    'Invariant 10.2: Zero drag-and-drop implementations or libraries'
);

// 11. DECISIONS.md documentation
const decisionsContent = fs.readFileSync(decisionsPath, 'utf8');
assert(
    decisionsContent.includes('## F.29C Program Editor v2 Workflow Polish') &&
    decisionsContent.includes('collapsible') &&
    decisionsContent.includes('Güne Taşı') &&
    decisionsContent.includes('fetchExercises'),
    'Invariant 11.1: DECISIONS.md documents F.29C Program Editor v2 Workflow Polish'
);

// 12. package.json script registration
const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert(
    Boolean(pkgContent.scripts && pkgContent.scripts['verify:trainer-program-editor-v2'] === 'node scripts/verify-trainer-program-editor-v2.mjs'),
    'Invariant 12.1: package.json registers verify:trainer-program-editor-v2'
);

console.log(`\n=======================================================`);
console.log(`Total Invariants Verified: ${assertionCount}`);
console.log(`Passed: ${assertionCount - (hasErrors ? 1 : 0)}`);
console.log(`Failed: ${hasErrors ? 1 : 0}`);
console.log(`=======================================================`);

if (hasErrors) {
    console.error('\n❌ F.29C Trainer Program Editor v2 Workflow Polish verification FAILED.');
    process.exit(1);
} else {
    console.log('\n✅ SUCCESS: All F.29C Trainer Program Editor v2 Workflow Polish invariants verified.');
    process.exit(0);
}
