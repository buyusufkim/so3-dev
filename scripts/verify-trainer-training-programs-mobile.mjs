import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

// 1. Package Registration Exact Check
checkInvariant("Package Script Registration Exact", () => {
    const pkg = JSON.parse(packageJsonSrc);
    if (pkg.scripts["verify:trainer-training-programs-mobile"] !== "node scripts/verify-trainer-training-programs-mobile.mjs") {
        throw new Error("Missing or exact script mismatch for verify:trainer-training-programs-mobile in package.json");
    }
});

// 2 & 3. Canonical Frontend Routes & Component Mappings
checkInvariant("Canonical Frontend Routes & Component Mappings", () => {
    const requiredRoutes = [
        {
            path: "my-members/:memberId/training-programs",
            component: "TrainerTrainingProgramsList"
        },
        {
            path: "my-members/:memberId/training-programs/new",
            component: "TrainerTrainingProgramEditor"
        },
        {
            path: "my-members/:memberId/training-programs/:programId",
            component: "TrainerTrainingProgramEditor"
        }
    ];

    for (const route of requiredRoutes) {
        if (!routesSrc.includes(`path: "${route.path}"`)) {
            throw new Error(`Missing canonical route in routes/index.tsx: ${route.path}`);
        }
        const routeRegex = new RegExp(`path:\\s*"${route.path.replace(/\//g, '\\/')}"[\\s\\S]*?element:\\s*<AdminSuspense><${route.component}\\s*\\/>`);
        if (!routeRegex.test(routesSrc)) {
            throw new Error(`Route ${route.path} is not correctly mapped to component ${route.component}`);
        }
    }
});

// 4. API Namespace Isolation (Strict Fail-Closed)
checkInvariant("API Namespace Isolation (Strict Fail-Closed)", () => {
    const forbiddenPrefixes = [
        "/api/admin",
        "/api/member",
        "/api/members",
        "/api/public",
        "/api/reception",
        "/api/auth"
    ];

    const sources = [
        { name: "TrainerTrainingProgramsList", content: listSrc },
        { name: "TrainerTrainingProgramEditor", content: editorSrc },
        { name: "TrainerProgramExercisesPanel", content: exercisesSrc }
    ];

    for (const { name, content } of sources) {
        const apiMatches = content.match(/[`'"]\/api\/[^`'"]+/g) || [];
        for (const match of apiMatches) {
            const url = match.slice(1);
            if (!url.startsWith("/api/trainer/")) {
                throw new Error(`${name} contains forbidden non-trainer API endpoint: ${url}`);
            }
            for (const forbidden of forbiddenPrefixes) {
                if (url.startsWith(forbidden)) {
                    throw new Error(`${name} contains forbidden namespace: ${forbidden}`);
                }
            }
        }
    }
});

// 5. Program Endpoint Contract Exact
checkInvariant("Program Endpoint Contract Exact", () => {
    if (!listSrc.includes("apiClient.get(`/api/trainer/members/${memberId}/training-programs?${query.toString()}`)")) {
        throw new Error("Missing program list GET endpoint contract");
    }
    // Verify query parameters: page, per_page, status
    if (!listSrc.includes('query.set("page", page.toString())') ||
        !listSrc.includes('query.set("per_page", perPage.toString())') ||
        !listSrc.includes('query.set("status", statusFilter)')) {
        throw new Error("Program list query parameters (page, per_page, status) not properly constructed");
    }

    if (!editorSrc.includes("apiClient.post(`/api/trainer/members/${canonicalMemberId}/training-programs`, payload)")) {
        throw new Error("Missing program create POST endpoint contract");
    }
    if (!editorSrc.includes("apiClient.get(`/api/trainer/training-programs/${canonicalProgramId}`)")) {
        throw new Error("Missing program detail GET endpoint contract");
    }
    if (!editorSrc.includes("apiClient.patch(`/api/trainer/training-programs/${canonicalProgramId}`, payload)")) {
        throw new Error("Missing program update PATCH endpoint contract");
    }
    if (!editorSrc.includes("apiClient.delete(`/api/trainer/training-programs/${canonicalProgramId}`)")) {
        throw new Error("Missing program archive DELETE endpoint contract");
    }
});

// 6. Exercise Endpoint Contract Exact
checkInvariant("Exercise Endpoint Contract Exact", () => {
    if (!exercisesSrc.includes("apiClient.get(`/api/trainer/training-programs/${programId}/exercises`)")) {
        throw new Error("Missing exercises list GET endpoint contract");
    }
    if (!exercisesSrc.includes("apiClient.post(`/api/trainer/training-programs/${programId}/exercises`, payload)")) {
        throw new Error("Missing exercise create POST endpoint contract");
    }
    if (!exercisesSrc.includes("apiClient.patch(`/api/trainer/program-exercises/${editingId}`, payload)")) {
        throw new Error("Missing exercise update PATCH endpoint contract");
    }
    if (!exercisesSrc.includes("apiClient.delete(`/api/trainer/program-exercises/${id}`)")) {
        throw new Error("Missing exercise delete DELETE endpoint contract");
    }
});

// 7. Exercise Restore Absence
checkInvariant("Exercise Restore Endpoint & UI Action Absence", () => {
    const combined = listSrc + editorSrc + exercisesSrc;
    if (combined.includes("/restore") || /program-exercises[^\s]*restore/i.test(combined)) {
        throw new Error("Forbidden exercise restore endpoint detected");
    }
    if (exercisesSrc.includes("Geri Yükle") || exercisesSrc.includes("Restore")) {
        throw new Error("Forbidden restore action wording found in exercise UI");
    }
});

// 8. Authoritative Backend Program Verifier Subprocess
console.log("👉 Authoritative Verifier Subprocesses");
checkInvariant("Authoritative Backend Program Verifier", () => {
    try {
        const out = execSync("node scripts/verify-trainer-training-programs.mjs", { encoding: "utf8" });
        if (!out.includes("Trainer Training Programs Verification PASSED")) {
            throw new Error("Authoritative program verifier did not pass");
        }
    } catch (e) {
        throw new Error(`Authoritative program verifier failed: ${e.message}`);
    }
});

// 9. Authoritative Backend Exercise Verifier Subprocess
checkInvariant("Authoritative Backend Exercise Verifier", () => {
    try {
        const out = execSync("node scripts/verify-trainer-program-exercises.mjs", { encoding: "utf8" });
        if (!out.includes("Trainer Program Exercises Verification PASSED")) {
            throw new Error("Authoritative exercise verifier did not pass");
        }
    } catch (e) {
        throw new Error(`Authoritative exercise verifier failed: ${e.message}`);
    }
});

// 10, 11, 12. Lifecycle Semantics Distinction & Destructive Wording
checkInvariant("Lifecycle Semantics: Training program DELETE remains soft archive", () => {
    if (!editorSrc.includes("Programı Arşivle")) {
        throw new Error("Missing 'Programı Arşivle' action in program editor UI");
    }
    if (editorSrc.includes("Programı Sil") || editorSrc.includes("Kalıcı Olarak Sil")) {
        throw new Error("Forbidden hard-delete UI wording found in program editor");
    }
    if (!editorSrc.includes("apiClient.delete(`/api/trainer/training-programs/${canonicalProgramId}`)")) {
        throw new Error("Missing program soft-archive DELETE call");
    }
});

checkInvariant("Lifecycle Semantics: Program exercise DELETE remains hard delete", () => {
    if (!exercisesSrc.includes("apiClient.delete(`/api/trainer/program-exercises/${id}`)")) {
        throw new Error("Missing exercise hard-delete DELETE call");
    }
    if (!exercisesSrc.includes("Sil") && !exercisesSrc.includes("Egzersizi Sil")) {
        throw new Error("Missing legitimate delete wording for exercise");
    }
});

checkInvariant("Lifecycle Semantics: Program exercise restore route remains absent", () => {
    const combined = listSrc + editorSrc + exercisesSrc;
    if (combined.includes("/restore") || /program-exercises[^\s]*restore/i.test(combined)) {
        throw new Error("Forbidden exercise restore endpoint detected");
    }
});

// 13 & 14. Mobile Program Card & Desktop Table Section Scoping
checkInvariant("Program List Mobile Cards & Desktop Table Section Scoping", () => {
    if (!listSrc.includes("lg:hidden")) throw new Error("Missing lg:hidden for mobile list");
    if (!listSrc.includes("hidden lg:block")) throw new Error("Missing hidden lg:block wrapper for desktop table");
    if (!listSrc.includes("TrainerMemberWorkspaceNav")) throw new Error("TrainerMemberWorkspaceNav removed");

    const mobileParts = listSrc.split("lg:hidden");
    if (mobileParts.length < 2) throw new Error("Could not isolate mobile list section");
    const mobileSection = mobileParts[1].split("hidden lg:block")[0];

    if (!mobileSection.includes("items.map(")) throw new Error("Mobile cards section does not map items");
    if (!mobileSection.includes("item.title")) throw new Error("Mobile card missing program title");
    if (!mobileSection.includes("getStatusBadge(item.status)")) throw new Error("Mobile card missing status badge");
    if (!mobileSection.includes("item.start_date")) throw new Error("Mobile card missing start_date");
    if (!mobileSection.includes("item.end_date")) throw new Error("Mobile card missing end_date");
    if (!mobileSection.includes("item.created_at")) throw new Error("Mobile card missing created_at");
    if (!mobileSection.includes("/admin/my-members/${memberId}/training-programs/${item.id}")) {
        throw new Error("Mobile card missing canonical program editor Link navigation");
    }

    const desktopParts = listSrc.split("hidden lg:block");
    if (desktopParts.length < 2) throw new Error("Could not isolate desktop table section");
    const desktopSection = desktopParts[1];
    if (!desktopSection.includes("<table")) throw new Error("Desktop section does not contain <table");
    if (!desktopSection.includes("item.title")) throw new Error("Desktop table missing item.title");
});

// 15. List Touch Targets Section-Scoped
checkInvariant("List Touch Targets Section-Scoped", () => {
    if (!listSrc.includes('/admin/my-members/${memberId}') || !listSrc.includes('aria-label="Üye detayına dön"')) {
        throw new Error("Missing back link to member detail with accessible aria-label");
    }
    const backLinkRegex = /<Link[\s\S]*?to=\{`\/admin\/my-members\/\$\{memberId\}`\}[\s\S]*?min-h-\[44px\]/;
    if (!backLinkRegex.test(listSrc)) {
        throw new Error("Back link in list does not meet min-h-[44px]");
    }

    const newProgramRegex = /<Link[\s\S]*?to=\{`\/admin\/my-members\/\$\{memberId\}\/training-programs\/new`\}[\s\S]*?min-h-\[44px\]/;
    if (!newProgramRegex.test(listSrc)) {
        throw new Error("Yeni Program CTA does not meet min-h-[44px]");
    }

    const statusSelectRegex = /<select[\s\S]*?value=\{statusFilter\}[\s\S]*?min-h-\[44px\]/;
    if (!statusSelectRegex.test(listSrc)) {
        throw new Error("Status filter select does not meet min-h-[44px]");
    }

    const prevBtnRegex = /<button[\s\S]*?onClick=\{\(\)\s*=>\s*setPage\(\(p\)\s*=>\s*p\s*-\s*1\)[\s\S]*?min-h-\[44px\]/;
    const nextBtnRegex = /<button[\s\S]*?onClick=\{\(\)\s*=>\s*setPage\(\(p\)\s*=>\s*p\s*\+\s*1\)[\s\S]*?min-h-\[44px\]/;
    if (!prevBtnRegex.test(listSrc) || !nextBtnRegex.test(listSrc)) {
        throw new Error("Pagination buttons do not meet min-h-[44px]");
    }
});

// 16. Editor Successful Header Verifier
checkInvariant("Program Editor Header & Actions Ergonomics", () => {
    if (!editorSrc.includes("<h1")) throw new Error("Missing semantic h1 tag in program editor");
    if (!editorSrc.includes("isNew ? \"Yeni Program Oluştur\" : \"Program Düzenle\"")) {
        throw new Error("Missing dynamic title for new vs edit mode in program editor");
    }
    if (!editorSrc.includes("onClick={handleBack}") || !editorSrc.includes('aria-label="Program listesine dön"')) {
        throw new Error("Missing handleBack or accessible aria-label on back button");
    }

    // 44px back target
    const backBtnRegex = /<button[\s\S]*?onClick=\{handleBack\}[\s\S]*?min-h-\[44px\][\s\S]*?min-w-\[44px\]/;
    if (!backBtnRegex.test(editorSrc)) {
        throw new Error("Back button in editor does not meet min-h-[44px] min-w-[44px]");
    }

    // Kaydet 44px
    const saveBtnRegex = /<button[\s\S]*?type="submit"[\s\S]*?form="trainer-program-form"[\s\S]*?min-h-\[44px\]/;
    if (!saveBtnRegex.test(editorSrc)) {
        throw new Error("Save button in editor does not meet min-h-[44px]");
    }

    // Programı Arşivle 44px
    const archiveBtnRegex = /<button[\s\S]*?onClick=\{handleArchive\}[\s\S]*?min-h-\[44px\]/;
    if (!archiveBtnRegex.test(editorSrc)) {
        throw new Error("Archive button in editor does not meet min-h-[44px]");
    }
});

// 17 & 18. Dirty-State Safety & Mutation Locks
checkInvariant("Program Editor Dirty-State Safety & Submit Locks", () => {
    if (!editorSrc.includes("useBlocker")) throw new Error("Missing useBlocker dirty guard");
    if (!editorSrc.includes("bypassBlocker")) throw new Error("Missing bypassBlocker ref");
    if (!editorSrc.includes("isDirty")) throw new Error("Missing isDirty calculation");
    if (!editorSrc.includes("beforeunload")) throw new Error("Missing beforeunload window event listener");
    if (!editorSrc.includes("window.confirm")) throw new Error("Missing window.confirm for unsaved changes navigation");

    if (!editorSrc.includes("isSubmitting")) throw new Error("Missing isSubmitting ref lock");
    if (!editorSrc.includes("saving")) throw new Error("Missing saving state flag");
    if (!editorSrc.includes("isArchiving")) throw new Error("Missing isArchiving ref lock");
});

// 19. Create Navigation Contract
checkInvariant("Program Create Branch Contract & Safe Navigation", () => {
    if (!editorSrc.includes("apiClient.post(`/api/trainer/members/${canonicalMemberId}/training-programs`, payload)")) {
        throw new Error("Missing create POST call");
    }
    if (!editorSrc.includes("isTrainerTrainingProgramCreateResponse(res)")) {
        throw new Error("Missing isTrainerTrainingProgramCreateResponse validation on create response");
    }
    if (!editorSrc.includes("bypassBlocker.current = true")) {
        throw new Error("Missing bypassBlocker bypass on successful create");
    }
    if (!editorSrc.includes("navigate(`/admin/my-members/${canonicalMemberId}/training-programs/${res.id}`, { replace: true })")) {
        throw new Error("Missing safe replace navigate on create");
    }
});

// 20. Update Fresh-Refetch Contract
checkInvariant("Program Update Branch Contract & Fresh State Sync", () => {
    if (!editorSrc.includes("apiClient.patch(`/api/trainer/training-programs/${canonicalProgramId}`, payload)")) {
        throw new Error("Missing update PATCH call");
    }
    if (!editorSrc.includes("isSuccessResponse(res)")) {
        throw new Error("Missing isSuccessResponse check on patch response");
    }
    if (!editorSrc.includes("const freshData = await apiClient.get(`/api/trainer/training-programs/${canonicalProgramId}`)") ||
        !editorSrc.includes("isTrainerTrainingProgramDetail(freshData)")) {
        throw new Error("Missing fresh detail GET refetch and contract validation on update");
    }
    if (!editorSrc.includes("freshData.member.id !== parseInt(canonicalMemberId, 10)")) {
        throw new Error("Missing IDOR member check on fresh data");
    }
    if (!editorSrc.includes("setInitialSnapshot(normalized)")) {
        throw new Error("Missing setInitialSnapshot synchronization on update");
    }
});

// 21 & 22. Exercises Mobile Cards & Desktop Table Section Scoping
checkInvariant("Exercises Panel Mobile Cards & Desktop Table Section Scoping", () => {
    if (!exercisesSrc.includes("lg:hidden")) throw new Error("Missing lg:hidden for exercises mobile list");
    if (!exercisesSrc.includes("hidden lg:block")) throw new Error("Missing hidden lg:block wrapper for exercises desktop table");

    const mobileParts = exercisesSrc.split("lg:hidden");
    if (mobileParts.length < 2) throw new Error("Could not isolate mobile exercises section");
    const mobileSection = mobileParts[1].split("hidden lg:block")[0];

    if (!mobileSection.includes("exercises.map(")) throw new Error("Mobile exercises section does not map exercises");
    if (!mobileSection.includes("ex.sort_order")) throw new Error("Mobile exercise card missing sort_order");
    if (!mobileSection.includes("ex.exercise_name")) throw new Error("Mobile exercise card missing exercise_name");
    if (!mobileSection.includes("ex.sets")) throw new Error("Mobile exercise card missing sets");
    if (!mobileSection.includes("ex.repetitions")) throw new Error("Mobile exercise card missing repetitions");
    if (!mobileSection.includes("ex.duration_seconds")) throw new Error("Mobile exercise card missing duration_seconds");
    if (!mobileSection.includes("ex.rest_seconds")) throw new Error("Mobile exercise card missing rest_seconds");
    if (!mobileSection.includes("ex.instructions")) throw new Error("Mobile exercise card missing instructions");
    if (!mobileSection.includes("openEditModal(ex)")) throw new Error("Mobile exercise card missing openEditModal action");
    if (!mobileSection.includes("handleDelete(ex.id)")) throw new Error("Mobile exercise card missing handleDelete action");

    const desktopParts = exercisesSrc.split("hidden lg:block");
    if (desktopParts.length < 2) throw new Error("Could not isolate desktop exercises table section");
    const desktopSection = desktopParts[1];

    if (!desktopSection.includes("<table")) throw new Error("Desktop exercises section does not contain <table");
    if (!desktopSection.includes("trainer-exercise-row-")) throw new Error("Missing trainer-exercise-row- in desktop table");
    if (!desktopSection.includes("btn-edit-exercise-")) throw new Error("Missing btn-edit-exercise- in desktop table");
    if (!desktopSection.includes("btn-delete-exercise-")) throw new Error("Missing btn-delete-exercise- in desktop table");
});

// 23 & 24. Exercise Modal Accessibility & Dynamic Viewport
checkInvariant("Exercise Modal Accessibility & Dynamic Viewport", () => {
    if (!exercisesSrc.includes('role="dialog"')) throw new Error("Missing role='dialog' on exercise modal");
    if (!exercisesSrc.includes('aria-modal="true"')) throw new Error("Missing aria-modal='true' on exercise modal");
    if (!exercisesSrc.includes('aria-labelledby="trainer-exercise-form-title"')) throw new Error("Missing aria-labelledby on exercise modal");
    if (!exercisesSrc.includes('id="trainer-exercise-form-title"')) throw new Error("Missing id trainer-exercise-form-title on modal heading");
    if (!exercisesSrc.includes('aria-label="Kapat"')) throw new Error("Missing aria-label on close button");

    if (!exercisesSrc.includes("items-end sm:items-center")) throw new Error("Missing items-end sm:items-center for responsive modal positioning");
    if (!exercisesSrc.includes("p-0 sm:p-4")) throw new Error("Missing p-0 sm:p-4 responsive modal padding");
    if (!exercisesSrc.includes("100dvh")) throw new Error("Missing 100dvh dynamic viewport safety in modal container");
    if (!exercisesSrc.includes("rounded-t-2xl sm:rounded-2xl")) throw new Error("Missing rounded-t-2xl sm:rounded-2xl bottom sheet styling");
    if (!exercisesSrc.includes("overflow-y-auto")) throw new Error("Missing overflow-y-auto on modal scrollable body");
});

// 25. Exercise Validation Safety
checkInvariant("Exercise Form Validation Safety Limits", () => {
    if (!exercisesSrc.includes("160")) throw new Error("Missing exercise name 160 character limit validation");
    if (!exercisesSrc.includes("65535")) throw new Error("Missing sets/rest 65535 upper bound validation");
    if (!exercisesSrc.includes("40")) throw new Error("Missing repetitions 40 character limit validation");
    if (!exercisesSrc.includes("4294967295")) throw new Error("Missing duration 4294967295 limit validation");
    if (!exercisesSrc.includes("1000")) throw new Error("Missing instructions 1000 character limit validation");
});

// 26 & 27. Exercise Mutation Locks & Dirty Close
checkInvariant("Exercise Mutation Locks & Dirty Close Confirmation", () => {
    if (!exercisesSrc.includes("isSubmitting")) throw new Error("Missing isSubmitting ref lock in exercises panel");
    if (!exercisesSrc.includes("formSaving")) throw new Error("Missing formSaving state in exercises panel");
    if (!exercisesSrc.includes("isDeleting")) throw new Error("Missing isDeleting ref lock in exercises panel");
    if (!exercisesSrc.includes("deletingId")) throw new Error("Missing deletingId state in exercises panel");

    if (!exercisesSrc.includes("isDirty")) throw new Error("Missing isDirty tracking in exercise modal");
    if (!exercisesSrc.includes("handleCloseModal")) throw new Error("Missing handleCloseModal function");
    if (!exercisesSrc.includes("window.confirm")) throw new Error("Missing window.confirm dirty modal close confirmation");
});

console.log("✨ All F.19D.3 Trainer Training Programs Mobile Workflow Invariants Passed!");
