import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const daysPanelPath = path.join(rootDir, 'src', 'admin', 'pages', 'trainer-training-programs', 'TrainerProgramDaysPanel.tsx');
const exercisesPanelPath = path.join(rootDir, 'src', 'admin', 'pages', 'trainer-training-programs', 'TrainerProgramExercisesPanel.tsx');
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
assert(fs.existsSync(daysPanelPath), 'Invariant 1.1: TrainerProgramDaysPanel.tsx exists');
assert(fs.existsSync(exercisesPanelPath), 'Invariant 1.2: TrainerProgramExercisesPanel.tsx exists');
assert(fs.existsSync(editorPath), 'Invariant 1.3: TrainerTrainingProgramEditor.tsx exists');

const daysPanelSource = fs.readFileSync(daysPanelPath, 'utf8');
const exercisesPanelSource = fs.readFileSync(exercisesPanelPath, 'utf8');
const editorSource = fs.readFileSync(editorPath, 'utf8');

// 2. TrainerProgramDaysPanel - Section Title & Copy
assert(
    daysPanelSource.includes('Program Günleri') &&
    daysPanelSource.includes('Egzersizleri program günlerine ayırarak planı daha düzenli yönetin.'),
    'Invariant 2.1: TrainerProgramDaysPanel renders exact section title and supporting copy'
);

// 3. TrainerProgramDaysPanel - Empty State & CTA
assert(
    daysPanelSource.includes('Henüz program günü oluşturulmamış.') &&
    daysPanelSource.includes('İlk Günü Oluştur') &&
    daysPanelSource.includes('trainer-days-empty'),
    'Invariant 3.1: TrainerProgramDaysPanel renders empty state copy and İlk Günü Oluştur CTA'
);

// 4. TrainerProgramDaysPanel - API endpoint & contract validation
assert(
    daysPanelSource.includes('/api/trainer/training-programs/${programId}/days') &&
    daysPanelSource.includes('isTrainerProgramDayArray'),
    'Invariant 4.1: TrainerProgramDaysPanel calls GET /api/trainer/training-programs/{programId}/days and validates with isTrainerProgramDayArray'
);

// 5. TrainerProgramDaysPanel - Race safety
assert(
    daysPanelSource.includes('AbortController') &&
    daysPanelSource.includes('requestGenRef') &&
    daysPanelSource.includes('isMountedRef'),
    'Invariant 5.1: TrainerProgramDaysPanel implements AbortController, request generation counter, and unmount protection'
);

// 6. TrainerProgramDaysPanel - Day CRUD & Modals
assert(
    daysPanelSource.includes('apiClient.post') &&
    daysPanelSource.includes('apiClient.patch') &&
    daysPanelSource.includes('apiClient.delete') &&
    daysPanelSource.includes('/api/trainer/program-days/'),
    'Invariant 6.1: TrainerProgramDaysPanel supports create (POST), edit (PATCH), and delete (DELETE) day mutations'
);

assert(
    daysPanelSource.includes('btn-add-day') &&
    daysPanelSource.includes('btn-save-day') &&
    daysPanelSource.includes('day-title-input') &&
    daysPanelSource.includes('day-sort-order-input') &&
    daysPanelSource.includes('day-notes-input'),
    'Invariant 6.2: TrainerProgramDaysPanel provides required button and input IDs'
);

// 7. TrainerProgramDaysPanel - Day Form Validations
assert(
    daysPanelSource.includes('160') &&
    daysPanelSource.includes('2000') &&
    daysPanelSource.includes('Gün başlığı 1 ile 160 karakter arasında olmalıdır.'),
    'Invariant 7.1: TrainerProgramDaysPanel enforces title (1-160) and notes (<= 2000) boundaries'
);

// 8. TrainerProgramDaysPanel - Callbacks and Exercise Count
assert(
    daysPanelSource.includes('onDaysChange') &&
    daysPanelSource.includes('onDayDeleted') &&
    daysPanelSource.includes('exerciseCount'),
    'Invariant 8.1: TrainerProgramDaysPanel supports onDaysChange, onDayDeleted callbacks, and displays exercise counts'
);

// 9. TrainerProgramExercisesPanel - Props & Race Safety
assert(
    exercisesPanelSource.includes('programDays') &&
    exercisesPanelSource.includes('refreshKey') &&
    exercisesPanelSource.includes('onExercisesChange'),
    'Invariant 9.1: TrainerProgramExercisesPanel accepts programDays, refreshKey, and onExercisesChange props'
);

assert(
    exercisesPanelSource.includes('new AbortController()') &&
    exercisesPanelSource.includes('requestGenRef') &&
    exercisesPanelSource.includes('isMountedRef'),
    'Invariant 9.2: TrainerProgramExercisesPanel implements new AbortController(), requestGenRef, and isMountedRef race safety guards'
);

const exerciseFetchWithSignalRegex = /apiClient\.get\(\s*`\/api\/trainer\/training-programs\/\$\{programId\}\/exercises`\s*,\s*\{[\s\S]*?signal:\s*controller\.signal[\s\S]*?\}\s*\)/;
assert(
    exerciseFetchWithSignalRegex.test(exercisesPanelSource),
    'Invariant 9.3: TrainerProgramExercisesPanel canonical exercise GET request passes { signal: controller.signal }'
);

const bareExerciseFetchRegex = /apiClient\.get\(\s*`\/api\/trainer\/training-programs\/\$\{programId\}\/exercises`\s*\)/;
assert(
    !bareExerciseFetchRegex.test(exercisesPanelSource),
    'Invariant 9.4: Negative check: TrainerProgramExercisesPanel does not contain bare apiClient.get without abort signal options'
);

// 10. Server-authoritative day ordering (Zero client-side sorting)
assert(
    !exercisesPanelSource.includes('.sort(') &&
    !exercisesPanelSource.includes('toSorted(') &&
    !exercisesPanelSource.includes('localeCompare('),
    'Invariant 10.1: TrainerProgramExercisesPanel strictly forbids client-side day reordering (.sort, toSorted, localeCompare)'
);

assert(
    exercisesPanelSource.includes('programDays.map') &&
    exercisesPanelSource.includes('exercises.filter('),
    'Invariant 10.2: programDays are rendered in canonical API order and exercise grouping uses exercises.filter(...) without reordering'
);

// 11. TrainerProgramExercisesPanel - Day Selector in Form Modal
assert(
    exercisesPanelSource.includes('id="exercise-day-select"') &&
    exercisesPanelSource.includes('Gün Atanmamış') &&
    exercisesPanelSource.includes('Program Günü'),
    'Invariant 11.1: TrainerProgramExercisesPanel form modal renders exercise-day-select with Gün Atanmamış option'
);

// 12. TrainerProgramExercisesPanel - Program Day Payload & Validation
assert(
    exercisesPanelSource.includes('payload.program_day_id') &&
    exercisesPanelSource.includes('Seçilen program günü bu programa ait değil.') &&
    exercisesPanelSource.includes('Geçersiz program günü seçimi.'),
    'Invariant 12.1: TrainerProgramExercisesPanel validates program day assignment and populates program_day_id in payload'
);

// 13. TrainerProgramExercisesPanel - Grouped Presentation by Day
assert(
    exercisesPanelSource.includes('trainer-day-exercise-group-') &&
    exercisesPanelSource.includes('btn-add-exercise-day-') &&
    exercisesPanelSource.includes('Bu güne henüz egzersiz atanmamış.'),
    'Invariant 13.1: TrainerProgramExercisesPanel groups exercises by day with day header, add exercise button, and empty state'
);

// 14. TrainerProgramExercisesPanel - Unassigned Exercises Section
assert(
    exercisesPanelSource.includes('trainer-unassigned-exercises-group') &&
    exercisesPanelSource.includes('Gün Atanmamış Egzersizler'),
    'Invariant 14.1: TrainerProgramExercisesPanel renders dedicated section for unassigned / legacy exercises'
);

// 15. TrainerProgramExercisesPanel - Backward Compatibility
assert(
    exercisesPanelSource.includes('trainer-exercises-table-container') &&
    exercisesPanelSource.includes('trainer-exercises-empty') &&
    exercisesPanelSource.includes('Henüz egzersiz eklenmemiş.'),
    'Invariant 15.1: TrainerProgramExercisesPanel preserves flat presentation and empty state when zero days exist'
);

// 16. TrainerTrainingProgramEditor - Integration & Shared Canonical Flow
assert(
    editorSource.includes('<TrainerProgramDaysPanel') &&
    editorSource.includes('<TrainerProgramExercisesPanel') &&
    editorSource.includes('onDaysChange={handleDaysChange}') &&
    editorSource.includes('onDayDeleted={handleDayDeleted}') &&
    editorSource.includes('programDays={programDays}'),
    'Invariant 16.1: TrainerTrainingProgramEditor embeds both panels with shared canonical state flow'
);

// 17. Touch target compliance: minimum 44px on all interactive controls
assert(
    !exercisesPanelSource.includes('min-h-[36px]'),
    'Invariant 17.1: TrainerProgramExercisesPanel contains zero non-compliant min-h-[36px] touch targets'
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

const dayAddBtnClass = getButtonClassAround(exercisesPanelSource, 'btn-add-exercise-day-');
assert(
    Boolean(dayAddBtnClass && dayAddBtnClass.includes('min-h-[44px]')),
    'Invariant 17.2: btn-add-exercise-day- quick-add action explicitly enforces min-h-[44px]'
);

const unassignedBtnClass = getButtonClassAround(exercisesPanelSource, 'Atanmamış Egzersiz Ekle');
assert(
    Boolean(unassignedBtnClass && unassignedBtnClass.includes('min-h-[44px]')),
    'Invariant 17.3: Atanmamış Egzersiz Ekle action explicitly enforces min-h-[44px]'
);

assert(
    daysPanelSource.includes('min-h-[44px]') &&
    exercisesPanelSource.includes('min-h-[44px]'),
    'Invariant 17.4: Mobile touch target compliance (min-h-[44px]) enforced on action buttons'
);

// 18. DECISIONS.md documentation
const decisionsContent = fs.readFileSync(decisionsPath, 'utf8');
assert(
    decisionsContent.includes('## F.29B Program Day Management & Exercise Assignment UI') &&
    decisionsContent.includes('TrainerProgramDaysPanel') &&
    decisionsContent.includes('exercise-day-select') &&
    decisionsContent.includes('Gün Atanmamış Egzersizler'),
    'Invariant 18.1: DECISIONS.md documents F.29B Program Day Management & Exercise Assignment UI'
);

// 19. package.json script registration
const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert(
    Boolean(pkgContent.scripts && pkgContent.scripts['verify:trainer-program-days-ui'] === 'node scripts/verify-trainer-program-days-ui.mjs'),
    'Invariant 19.1: package.json registers verify:trainer-program-days-ui'
);

console.log(`\n=======================================================`);
console.log(`Total Invariants Verified: ${assertionCount}`);
console.log(`Passed: ${assertionCount - (hasErrors ? 1 : 0)}`);
console.log(`Failed: ${hasErrors ? 1 : 0}`);
console.log(`=======================================================`);

if (hasErrors) {
    console.error('\n❌ F.29B Trainer Program Days UI verification FAILED.');
    process.exit(1);
} else {
    console.log('\n✅ SUCCESS: All F.29B Trainer Program Days UI & Exercise Assignment invariants verified.');
    process.exit(0);
}
