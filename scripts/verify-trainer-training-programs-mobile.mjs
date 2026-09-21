import fs from 'fs';
import path from 'path';

function checkInvariant(name, test) {
    try {
        test();
        console.log(`✅ PASS: ${name}`);
    } catch (e) {
        console.error(`❌ FAIL: ${name}`);
        console.error(e);
        process.exit(1);
    }
}

console.log("👉 Repository Hygiene");
checkInvariant("No temporary artifacts in root", () => {
    const files = fs.readdirSync('.');
    const forbidden = [
        /^patch.*\.js$/,
        /^patch.*\.mjs$/,
        /^patch.*\.php$/,
        /^tmp.*\.js$/,
        /^tmp.*\.mjs$/,
        /^tmp.*\.php$/,
        /\.tmp$/,
        /\.fixed$/,
        /^add-.*\.php$/
    ];
    const found = files.filter(f => forbidden.some(regex => regex.test(f)));
    if (found.length > 0) {
        throw new Error(`Temporary artifacts found: ${found.join(', ')}`);
    }
});

console.log("👉 Verifying F.19D.3 Trainer Training Programs Mobile Workflow");

const listSrc = fs.readFileSync('src/admin/pages/trainer-training-programs/TrainerTrainingProgramsList.tsx', 'utf8');
const editorSrc = fs.readFileSync('src/admin/pages/trainer-training-programs/TrainerTrainingProgramEditor.tsx', 'utf8');
const exercisesSrc = fs.readFileSync('src/admin/pages/trainer-training-programs/TrainerProgramExercisesPanel.tsx', 'utf8');
const routesSrc = fs.readFileSync('src/routes/index.tsx', 'utf8');
const packageJsonSrc = fs.readFileSync('package.json', 'utf8');

checkInvariant("Package Script Invariant", () => {
    const pkg = JSON.parse(packageJsonSrc);
    if (!pkg.scripts["verify:trainer-training-programs-mobile"]) {
        throw new Error("Missing verify:trainer-training-programs-mobile script in package.json");
    }
});

checkInvariant("Canonical Route Invariants", () => {
    if (!routesSrc.includes('path: "my-members/:memberId/training-programs"')) {
        throw new Error("Missing /admin/my-members/:memberId/training-programs route");
    }
    if (!routesSrc.includes('path: "my-members/:memberId/training-programs/:programId"')) {
        throw new Error("Missing /admin/my-members/:memberId/training-programs/:programId route");
    }
});

checkInvariant("API Invariants - Exact Namespace and CRUD Contracts", () => {
    // List & Editor Program API
    if (!listSrc.includes("apiClient.get(`/api/trainer/members/${memberId}/training-programs?${query.toString()}`)")) {
        throw new Error("Missing program list GET /api/trainer/members/:memberId/training-programs call");
    }
    if (!editorSrc.includes("apiClient.post(`/api/trainer/members/${canonicalMemberId}/training-programs`")) {
        throw new Error("Missing program create POST call");
    }
    if (!editorSrc.includes("apiClient.get(`/api/trainer/training-programs/${canonicalProgramId}`)")) {
        throw new Error("Missing program detail GET call");
    }
    if (!editorSrc.includes("apiClient.patch(`/api/trainer/training-programs/${canonicalProgramId}`")) {
        throw new Error("Missing program update PATCH call");
    }
    if (!editorSrc.includes("apiClient.delete(`/api/trainer/training-programs/${canonicalProgramId}`)")) {
        throw new Error("Missing program archive DELETE call");
    }

    // Exercises API
    if (!exercisesSrc.includes("apiClient.get(`/api/trainer/training-programs/${programId}/exercises`)")) {
        throw new Error("Missing exercises list GET call");
    }
    if (!exercisesSrc.includes("apiClient.post(`/api/trainer/training-programs/${programId}/exercises`")) {
        throw new Error("Missing exercise create POST call");
    }
    if (!exercisesSrc.includes("apiClient.patch(`/api/trainer/program-exercises/${editingId}`")) {
        throw new Error("Missing exercise update PATCH call");
    }
    if (!exercisesSrc.includes("apiClient.delete(`/api/trainer/program-exercises/${id}`)")) {
        throw new Error("Missing exercise delete DELETE call");
    }

    // Namespace isolation check
    const combined = listSrc + editorSrc + exercisesSrc;
    if (combined.includes('/api/admin/training-programs') || combined.includes('/api/member/training-programs')) {
        throw new Error("Forbidden non-trainer API endpoint call detected");
    }
});

checkInvariant("Program List Mobile Cards & Desktop Table", () => {
    if (!listSrc.includes('lg:hidden')) throw new Error("Missing lg:hidden for mobile list");
    if (!listSrc.includes('hidden lg:block')) throw new Error("Missing hidden lg:block wrapper for desktop table");
    if (!listSrc.includes('<table')) throw new Error("Desktop table removed from program list");
    if (!listSrc.includes('TrainerMemberWorkspaceNav')) throw new Error("TrainerMemberWorkspaceNav removed");

    const mobileCardsSection = listSrc.split('lg:hidden')[1].split('hidden lg:block')[0];
    if (!mobileCardsSection.includes('items.map(')) throw new Error("Mobile cards section does not map items");
    if (!mobileCardsSection.includes('item.title')) throw new Error("Mobile card missing program title");
    if (!mobileCardsSection.includes('getStatusBadge(item.status)')) throw new Error("Mobile card missing status badge");
    if (!mobileCardsSection.includes('item.start_date')) throw new Error("Mobile card missing start_date");
    if (!mobileCardsSection.includes('item.end_date')) throw new Error("Mobile card missing end_date");

    // Touch targets
    if (!listSrc.includes('min-h-[44px]')) throw new Error("Missing min-h-[44px] touch targets in list view");
});

checkInvariant("Program Editor Mobile Responsiveness & Form Safety", () => {
    if (!editorSrc.includes('<h1')) throw new Error("Missing semantic h1 tag in program editor");
    if (!editorSrc.includes('useBlocker')) throw new Error("useBlocker dirty-check removed from program editor");
    if (!editorSrc.includes('isValidCalendarDate')) throw new Error("isValidCalendarDate validation removed");
    if (!editorSrc.includes('aria-label="Program listesine dön"')) throw new Error("Missing accessible back button aria-label");
    if (!editorSrc.includes('min-h-[44px]')) throw new Error("Missing min-h-[44px] touch targets in program editor");

    // IDOR protection check
    if (!editorSrc.includes('data.member.id !== parseInt(canonicalMemberId, 10)')) {
        throw new Error("IDOR prevention check removed");
    }
});

checkInvariant("Exercises Panel Mobile Cards & Viewport-Safe Modal", () => {
    if (!exercisesSrc.includes('lg:hidden')) throw new Error("Missing lg:hidden for exercises mobile list");
    if (!exercisesSrc.includes('hidden lg:block')) throw new Error("Missing hidden lg:block wrapper for exercises desktop table");
    if (!exercisesSrc.includes('id="trainer-exercises-table-container"')) throw new Error("Missing id trainer-exercises-table-container");
    if (!exercisesSrc.includes('id={`trainer-exercise-row-${ex.id}`}')) throw new Error("Missing id trainer-exercise-row-${ex.id}");
    if (!exercisesSrc.includes('id={`btn-edit-exercise-${ex.id}`}')) throw new Error("Missing id btn-edit-exercise-${ex.id}");
    if (!exercisesSrc.includes('id={`btn-delete-exercise-${ex.id}`}')) throw new Error("Missing id btn-delete-exercise-${ex.id}");

    // Modal dialog accessibility & bottom sheet invariants
    if (!exercisesSrc.includes('role="dialog"')) throw new Error("Missing role='dialog' on exercise modal");
    if (!exercisesSrc.includes('aria-modal="true"')) throw new Error("Missing aria-modal='true' on exercise modal");
    if (!exercisesSrc.includes('aria-labelledby="trainer-exercise-form-title"')) throw new Error("Missing aria-labelledby on exercise modal");
    if (!exercisesSrc.includes('items-end sm:items-center')) throw new Error("Missing items-end sm:items-center for bottom sheet modal positioning");
    if (!exercisesSrc.includes('rounded-t-2xl sm:rounded-2xl')) throw new Error("Missing rounded-t-2xl sm:rounded-2xl for bottom sheet styling");
    if (!exercisesSrc.includes('overflow-y-auto')) throw new Error("Missing overflow-y-auto for modal scrollability");
    if (!exercisesSrc.includes('aria-label="Kapat"')) throw new Error("Missing aria-label on close button");
    if (!exercisesSrc.includes('min-h-[44px]')) throw new Error("Missing min-h-[44px] touch targets in exercises panel");
});

console.log("✨ All F.19D.3 Trainer Training Programs Mobile Workflow Invariants Passed!");
