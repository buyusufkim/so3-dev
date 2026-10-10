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

console.log("\n=== 5. Server-Authoritative Ordering (Zero Client Sort) ===");
assert(
  !pageContent.includes('.sort(') &&
  !pageContent.includes('.toSorted(') &&
  !pageContent.includes('localeCompare('),
  "Component strictly forbids client-side sorting (.sort, .toSorted, localeCompare)"
);

console.log("\n=== 6. Day-based Grouped Presentation ===");
// Page headers
assert(
  pageContent.includes('Programım') &&
  pageContent.includes('Antrenörünün senin için hazırladığı antrenman programları.'),
  "Component renders canonical title 'Programım' and subtitle"
);

// Days rendering
assert(
  pageContent.includes('prog.days.map') && pageContent.includes('day.title'),
  "Component maps over prog.days and renders day.title"
);

// Day exercises rendering
assert(
  pageContent.includes('day.exercises.map'),
  "Component maps over day.exercises directly"
);

// Empty day state
assert(
  pageContent.includes('Bu güne henüz egzersiz eklenmemiş.') || pageContent.includes('Bu güne henüz egzersiz eklenmemiş'),
  "Component provides dedicated empty state message for empty days"
);

// Unassigned exercises section
assert(
  pageContent.includes('prog.unassigned_exercises') &&
  (pageContent.includes('Gün Atanmamış Egzersizler') || pageContent.includes('Atanmamış Egzersizler')),
  "Component renders dedicated section for unassigned / legacy exercises"
);

// Empty program state
assert(
  pageContent.includes('Bu programa henüz egzersiz eklenmemiş.') || pageContent.includes('Bu programa henüz egzersiz eklenmemiş'),
  "Component renders empty state when program has no exercises"
);

// Empty programs state
assert(
  pageContent.includes('Aktif antrenman programın bulunmuyor.') || pageContent.includes('Aktif antrenman programın bulunmuyor'),
  "Component renders empty state when member has no active programs"
);

console.log("\n=== 7. Exercise Detail Invariants ===");
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

console.log("\n=== 8. Error Handling & Race Safety ===");
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

console.log("\n=== 9. Strict Read-Only Anti-Scope ===");
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
  console.log("✅ SUCCESS: All Member Training Program UI (F.33B) invariants verified.");
  process.exit(0);
}
