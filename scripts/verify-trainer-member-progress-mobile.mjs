import fs from 'fs';
import { execSync } from 'child_process';

function checkInvariant(name, test) {
    try {
        test();
        console.log(`✅ PASS: ${name}`);
    } catch (e) {
        console.error(`❌ FAIL: ${name}`);
        console.error(e.message || e);
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

console.log("👉 Package Registration");
checkInvariant("package.json registration for verify:trainer-member-progress-mobile", () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!pkg.scripts || pkg.scripts['verify:trainer-member-progress-mobile'] !== 'node scripts/verify-trainer-member-progress-mobile.mjs') {
        throw new Error("Missing or invalid 'verify:trainer-member-progress-mobile' script in package.json");
    }
});

console.log("👉 Running Baseline Frontend Contract Verifier");
checkInvariant("Existing Frontend Invariants Pass (15/15)", () => {
    const output = execSync('node scripts/verify-trainer-member-progress-frontend.mjs', { encoding: 'utf8' });
    if (!output.includes('Trainer Member Progress Frontend Verification PASSED')) {
        throw new Error("Baseline frontend contract verification failed:\n" + output);
    }
});

console.log("👉 Verifying Faz 7B.4G-F.19D.2 Trainer Progress Mobile Actions & Layout");

const pageSrc = fs.readFileSync('src/admin/pages/trainer-member-progress/TrainerMemberProgressPage.tsx', 'utf8');
const measureModalSrc = fs.readFileSync('src/admin/pages/trainer-member-progress/TrainerMeasurementFormModal.tsx', 'utf8');
const notesPanelSrc = fs.readFileSync('src/admin/pages/trainer-member-progress/TrainerProgressNotesPanel.tsx', 'utf8');
const noteModalSrc = fs.readFileSync('src/admin/pages/trainer-member-progress/TrainerProgressNoteFormModal.tsx', 'utf8');

checkInvariant("API contracts and namespaces strictly adhere to /api/trainer/*", () => {
    const combinedProgress = pageSrc + measureModalSrc + notesPanelSrc + noteModalSrc;
    const forbiddenMatches = combinedProgress.match(/['"`]\/api\/(admin|member)(?!\/appointments)[^'"`]*['"`]/g);
    if (forbiddenMatches && forbiddenMatches.length > 0) {
        throw new Error(`Forbidden API routes found in trainer progress components: ${forbiddenMatches.join(', ')}`);
    }

    const measurementEndpoints = [
        /\/api\/trainer\/members\/\$\{[^}]+\}\/measurements/,
        /\/api\/trainer\/member-measurements\/\$\{[^}]+\}/,
        /\/api\/trainer\/member-measurements\/\$\{[^}]+\}\/restore/
    ];
    for (const ep of measurementEndpoints) {
        if (!ep.test(pageSrc) && !ep.test(measureModalSrc)) {
            throw new Error(`Missing expected trainer measurement endpoint: ${ep}`);
        }
    }

    const noteEndpoints = [
        /\/api\/trainer\/members\/\$\{[^}]+\}\/progress-notes/,
        /\/api\/trainer\/member-progress-notes\/\$\{[^}]+\}/,
        /\/api\/trainer\/member-progress-notes\/\$\{[^}]+\}\/restore/
    ];
    for (const ep of noteEndpoints) {
        if (!ep.test(notesPanelSrc) && !ep.test(noteModalSrc)) {
            throw new Error(`Missing expected trainer progress note endpoint: ${ep}`);
        }
    }
});

checkInvariant("Progress Page Mobile Header and Workspace Nav", () => {
    if (!pageSrc.includes('to={`/admin/my-members/${member.id}`}')) {
        throw new Error("Missing back link to /admin/my-members/${member.id}");
    }
    if (!pageSrc.includes('aria-label="Üye Detayına Dön"')) {
        throw new Error("Missing aria-label on back link");
    }
    if (!pageSrc.includes('min-h-[44px] min-w-[44px]')) {
        throw new Error("Back button is not touch safe (min-h-[44px] min-w-[44px])");
    }
    if (!pageSrc.includes('<TrainerMemberWorkspaceNav memberId={member.id} active="progress" />')) {
        throw new Error("TrainerMemberWorkspaceNav with active='progress' missing");
    }
    if (!pageSrc.includes('flex flex-col sm:flex-row')) {
        throw new Error("Header lacks mobile-first responsive flex wrapping");
    }
});

checkInvariant("Successful render semantic h1 for member name", () => {
    const afterErrorGuard = pageSrc.split(/if\s*\(\s*error\s*\|\|\s*!member\s*\)/)[1] || '';
    const h1Match = afterErrorGuard.match(/<h1[^>]*>[\s\S]*?\{member\.first_name\}\s*\{member\.last_name\}[\s\S]*?<\/h1>/);
    if (!h1Match) {
        throw new Error("Successful render does not contain semantic <h1> with member.first_name member.last_name");
    }
});

checkInvariant("Progress Page 2-Tab Navigation Mobile Ergonomics", () => {
    if (!pageSrc.includes('grid grid-cols-2')) {
        throw new Error("Tab navigation should use balanced mobile 2-column grid");
    }
    if (!pageSrc.includes('role="tablist"')) {
        throw new Error("Tablist role missing from tabs");
    }
    if (!pageSrc.includes('min-h-[44px]')) {
        throw new Error("Tab navigation buttons must meet min-h-[44px] touch target");
    }
    if (!pageSrc.includes('aria-selected={activeTab === "measurements"}') ||
        !pageSrc.includes('aria-selected={activeTab === "notes"}')) {
        throw new Error("Missing aria-selected on tabs");
    }
});

checkInvariant("Empty-detail placeholder hidden on mobile in both sections", () => {
    const measureDetailMatch = pageSrc.match(/selectedMeasurementId\s*\?\s*["'][^"']*order-1[^"']*["']\s*:\s*["'](?=[^"']*hidden)(?=[^"']*lg:block)[^"']*["']/);
    if (!measureDetailMatch) {
        throw new Error("Measurement detail column wrapper does not hide empty detail on mobile (missing hidden lg:block when !selectedMeasurementId)");
    }

    const noteDetailMatch = notesPanelSrc.match(/selectedNoteId\s*\?\s*["'][^"']*order-1[^"']*["']\s*:\s*["'](?=[^"']*hidden)(?=[^"']*lg:block)[^"']*["']/);
    if (!noteDetailMatch) {
        throw new Error("Progress notes detail column wrapper does not hide empty detail on mobile (missing hidden lg:block when !selectedNoteId)");
    }
});

checkInvariant("Section-scoped action and filter touch targets (min-h-[44px])", () => {
    const getButtonBlocks = (src) => {
        const matches = [];
        const regex = /<button[\s\S]*?<\/button>/g;
        let m;
        while ((m = regex.exec(src)) !== null) {
            matches.push(m[0]);
        }
        return matches;
    };

    const pageButtons = getButtonBlocks(pageSrc);
    const notesButtons = getButtonBlocks(notesPanelSrc);

    // Measurement filters
    for (const f of ['"active"', '"deleted"', '"all"']) {
        const btn = pageButtons.find(b => b.includes(`handleFilterChange(${f})`));
        if (!btn || !btn.includes('min-h-[44px]')) {
            throw new Error(`Measurement filter button for ${f} is missing min-h-[44px] touch target`);
        }
    }

    // Measurement restore
    const measureRestore = pageButtons.find(b => b.includes('handleRestore'));
    if (!measureRestore || !measureRestore.includes('min-h-[44px]')) {
        throw new Error("Measurement restore button is missing min-h-[44px] touch target");
    }

    // Measurement edit & archive
    const measureEdit = pageButtons.find(b => b.includes('handleOpenEdit'));
    if (!measureEdit || !measureEdit.includes('min-h-[44px]')) {
        throw new Error("Measurement edit button is missing min-h-[44px] touch target");
    }
    const measureArchive = pageButtons.find(b => b.includes('handleArchive'));
    if (!measureArchive || !measureArchive.includes('min-h-[44px]')) {
        throw new Error("Measurement archive button is missing min-h-[44px] touch target");
    }

    // Measurement dismiss actionError
    const measureDismiss = pageButtons.find(b => b.includes('setActionError(null)'));
    if (!measureDismiss || !measureDismiss.includes('aria-label="Hata mesajını kapat"')) {
        throw new Error("Measurement action error dismiss button missing aria-label='Hata mesajını kapat'");
    }

    // Notes filters
    for (const f of ['"active"', '"deleted"', '"all"']) {
        const btn = notesButtons.find(b => b.includes(`handleFilterChange(${f})`));
        if (!btn || !btn.includes('min-h-[44px]')) {
            throw new Error(`Notes filter button for ${f} is missing min-h-[44px] touch target`);
        }
    }

    // Note restore
    const noteRestore = notesButtons.find(b => b.includes('handleRestore'));
    if (!noteRestore || !noteRestore.includes('min-h-[44px]')) {
        throw new Error("Progress note restore button is missing min-h-[44px] touch target");
    }

    // Note edit & archive
    const noteEdit = notesButtons.find(b => b.includes('handleOpenEdit'));
    if (!noteEdit || !noteEdit.includes('min-h-[44px]')) {
        throw new Error("Progress note edit button is missing min-h-[44px] touch target");
    }
    const noteArchive = notesButtons.find(b => b.includes('handleArchive'));
    if (!noteArchive || !noteArchive.includes('min-h-[44px]')) {
        throw new Error("Progress note archive button is missing min-h-[44px] touch target");
    }

    // Note dismiss actionError
    const noteDismiss = notesButtons.find(b => b.includes('setActionError(null)'));
    if (!noteDismiss || !noteDismiss.includes('aria-label="Hata mesajını kapat"')) {
        throw new Error("Progress note action error dismiss button missing aria-label='Hata mesajını kapat'");
    }
});

checkInvariant("Exact dialog accessibility with aria-labelledby and heading IDs", () => {
    if (!measureModalSrc.includes('role="dialog"') || !measureModalSrc.includes('aria-modal="true"')) {
        throw new Error("Measurement modal missing role='dialog' or aria-modal='true'");
    }
    if (!measureModalSrc.includes('aria-labelledby="trainer-measurement-form-title"')) {
        throw new Error("Measurement modal missing aria-labelledby='trainer-measurement-form-title'");
    }
    if (!measureModalSrc.includes('id="trainer-measurement-form-title"')) {
        throw new Error("Measurement modal heading missing id='trainer-measurement-form-title'");
    }
    if (!measureModalSrc.includes('aria-label="Kapat"')) {
        throw new Error("Measurement modal close button missing aria-label='Kapat'");
    }

    if (!noteModalSrc.includes('role="dialog"') || !noteModalSrc.includes('aria-modal="true"')) {
        throw new Error("Progress note modal missing role='dialog' or aria-modal='true'");
    }
    if (!noteModalSrc.includes('aria-labelledby="trainer-progress-note-form-title"')) {
        throw new Error("Progress note modal missing aria-labelledby='trainer-progress-note-form-title'");
    }
    if (!noteModalSrc.includes('id="trainer-progress-note-form-title"')) {
        throw new Error("Progress note modal heading missing id='trainer-progress-note-form-title'");
    }
    if (!noteModalSrc.includes('aria-label="Kapat"')) {
        throw new Error("Progress note modal close button missing aria-label='Kapat'");
    }
});

checkInvariant("Form modals dynamic viewport safety (dvh)", () => {
    if (!measureModalSrc.includes('100dvh')) {
        throw new Error("Measurement form modal lacks dynamic viewport safety (100dvh)");
    }
    if (!noteModalSrc.includes('100dvh')) {
        throw new Error("Progress note form modal lacks dynamic viewport safety (100dvh)");
    }
    if (!measureModalSrc.includes('items-end sm:items-center') || !noteModalSrc.includes('items-end sm:items-center')) {
        throw new Error("Modals must preserve bottom-sheet layout on mobile (items-end sm:items-center)");
    }
    if (!measureModalSrc.includes('rounded-t-2xl sm:rounded-2xl') || !noteModalSrc.includes('rounded-t-2xl sm:rounded-2xl')) {
        throw new Error("Modals must preserve rounded-t-2xl bottom sheet styling");
    }
});

console.log("✅ All F.19D.2 Trainer Progress Mobile Actions checks passed!");
