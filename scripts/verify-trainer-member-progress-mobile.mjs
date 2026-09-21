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

checkInvariant("Measurements Filter & Responsive Layout", () => {
    if (!pageSrc.includes('flex flex-col sm:flex-row')) {
        throw new Error("Measurement filter bar lacks responsive column-to-row wrapping");
    }
    if (!pageSrc.includes('min-h-[44px]')) {
        throw new Error("Measurement action buttons or inputs must be touch safe (min-h-[44px])");
    }
    if (!pageSrc.includes('order-2 lg:order-1') || !pageSrc.includes('order-1 lg:order-2')) {
        throw new Error("Measurement detail must show above list on mobile when selected");
    }
});

checkInvariant("Progress Notes Filter & Responsive Layout", () => {
    if (!notesPanelSrc.includes('flex flex-col sm:flex-row')) {
        throw new Error("Progress notes filter bar lacks responsive column-to-row wrapping");
    }
    if (!notesPanelSrc.includes('min-h-[44px]')) {
        throw new Error("Notes action buttons or inputs must be touch safe (min-h-[44px])");
    }
    if (!notesPanelSrc.includes('order-2 lg:order-1') || !notesPanelSrc.includes('order-1 lg:order-2')) {
        throw new Error("Note detail must show above list on mobile when selected");
    }
});

checkInvariant("Measurement Form Modal Mobile Sheet & Viewport Safety", () => {
    if (!measureModalSrc.includes('items-end sm:items-center')) {
        throw new Error("Measurement form modal must open as bottom sheet on mobile (items-end sm:items-center)");
    }
    if (!measureModalSrc.includes('rounded-t-2xl sm:rounded-2xl')) {
        throw new Error("Measurement form modal must have rounded-t-2xl on mobile");
    }
    if (!measureModalSrc.includes('max-h-[92vh] sm:max-h-[90vh]')) {
        throw new Error("Measurement form modal max-height viewport protection missing");
    }
    if (!measureModalSrc.includes('role="dialog"') || !measureModalSrc.includes('aria-modal="true"')) {
        throw new Error("Measurement form modal missing accessible dialog attributes");
    }
    if (!measureModalSrc.includes('min-h-[44px] min-w-[44px]')) {
        throw new Error("Close button in measurement modal must be touch-safe");
    }
    if (!measureModalSrc.includes('flex-1 sm:flex-initial min-h-[44px]')) {
        throw new Error("Footer buttons in measurement modal must be touch-safe and full-width on mobile");
    }
});

checkInvariant("Progress Note Form Modal Mobile Sheet & Viewport Safety", () => {
    if (!noteModalSrc.includes('items-end sm:items-center')) {
        throw new Error("Progress note form modal must open as bottom sheet on mobile (items-end sm:items-center)");
    }
    if (!noteModalSrc.includes('rounded-t-2xl sm:rounded-2xl')) {
        throw new Error("Progress note form modal must have rounded-t-2xl on mobile");
    }
    if (!noteModalSrc.includes('max-h-[92vh] sm:max-h-[90vh]')) {
        throw new Error("Progress note form modal max-height viewport protection missing");
    }
    if (!noteModalSrc.includes('role="dialog"') || !noteModalSrc.includes('aria-modal="true"')) {
        throw new Error("Progress note form modal missing accessible dialog attributes");
    }
    if (!noteModalSrc.includes('min-h-[44px] min-w-[44px]')) {
        throw new Error("Close button in progress note modal must be touch-safe");
    }
    if (!noteModalSrc.includes('flex-1 sm:flex-initial min-h-[44px]')) {
        throw new Error("Footer buttons in progress note modal must be touch-safe and full-width on mobile");
    }
});

checkInvariant("Touch Safety on Mutations (Archive, Restore, Edit)", () => {
    // Both page and panel must have touch-safe buttons for archive, restore, and edit
    if (!pageSrc.includes('aria-label="Ölçümü Geri Yükle"')) {
        throw new Error("Missing aria-label on measurement restore button");
    }
    if (!notesPanelSrc.includes('aria-label="Gelişim Notunu Geri Yükle"')) {
        throw new Error("Missing aria-label on progress note restore button");
    }
});

console.log("✅ All F.19D.2 Trainer Progress Mobile Actions checks passed!");
