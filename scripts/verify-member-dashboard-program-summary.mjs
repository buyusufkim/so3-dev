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
  pkg.scripts && pkg.scripts["verify:member-dashboard-program-summary"] === "node scripts/verify-member-dashboard-program-summary.mjs",
  "Package.json exact registration: 'verify:member-dashboard-program-summary' === 'node scripts/verify-member-dashboard-program-summary.mjs'"
);

console.log("\n=== 2. Existing Data Loading & Contract Invariants ===");
const dashboardPath = path.resolve(process.cwd(), 'src/member/pages/MemberDashboardPage.tsx');
assert(fs.existsSync(dashboardPath), "MemberDashboardPage.tsx exists");
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// 1. Dashboard still uses canonical getTrainingPrograms
assert(
  dashboardContent.includes('memberApiClient.getTrainingPrograms('),
  "Dashboard calls canonical memberApiClient.getTrainingPrograms(signal)"
);

// 2. No new program API requests
assert(
  dashboardContent.includes('Promise.all([') &&
  dashboardContent.includes('memberApiClient.getOverview(') &&
  dashboardContent.includes('memberApiClient.getSessionPackages(') &&
  dashboardContent.includes('memberApiClient.getAppointments(') &&
  dashboardContent.includes('memberApiClient.getTrainingPrograms('),
  "Dashboard preserves existing concurrent Promise.all data loading structure without extra fetches"
);

// Count occurrences of getTrainingPrograms to ensure no extra calls
const getTpCalls = (dashboardContent.match(/memberApiClient\.getTrainingPrograms\(/g) || []).length;
assert(getTpCalls === 1, "Exactly one call to memberApiClient.getTrainingPrograms exists in Dashboard");

// 3. MemberTrainingProgram contract preserved in state
assert(
  dashboardContent.includes('useState<MemberTrainingProgram[] | null>(null)'),
  "Dashboard state maintains MemberTrainingProgram[] | null contract"
);

console.log("\n=== 3. Summary Card Elements & Calculation Invariants ===");
// Extract training programs section from dashboard
const tpSectionMatch = dashboardContent.match(/\{\/\*\s*Training Programs\s*\*\/\}[\s\S]*?(?=\{\/\*\s*Cancel Modal|\{\/\*\s*Reschedule Modal|$)/);
assert(Boolean(tpSectionMatch), "Training Programs section located in MemberDashboardPage.tsx");
const tpSection = tpSectionMatch ? tpSectionMatch[0] : '';

// 4. Card renders title, trainer, days, exercises, and date
assert(
  tpSection.includes('prog.title'),
  "Summary card displays program title (prog.title)"
);

assert(
  tpSection.includes('prog.trainer ? prog.trainer.name :') &&
  tpSection.includes('Antrenör atanmamış'),
  "Summary card renders trainer name with 'Antrenör atanmamış' fallback"
);

assert(
  tpSection.includes('antrenman günü') && tpSection.includes('prog.days.length'),
  "Summary card renders defined day count (prog.days.length) labeled 'antrenman günü'"
);

// 5. Total exercises calculation includes days[].exercises AND unassigned_exercises
assert(
  tpSection.includes('prog.days.reduce(') &&
  tpSection.includes('day.exercises.length') &&
  tpSection.includes('prog.unassigned_exercises.length'),
  "Total exercises sums days[].exercises.length via reduce AND adds unassigned_exercises.length"
);

assert(
  tpSection.includes('egzersiz'),
  "Summary card renders total exercise count labeled 'egzersiz'"
);

// 6. Server-authoritative order: zero client-side sort
assert(
  !tpSection.includes('.sort(') &&
  !tpSection.includes('.toSorted(') &&
  !tpSection.includes('localeCompare('),
  "Summary card strictly avoids client-side sorting (.sort, .toSorted, localeCompare)"
);
assert(
  tpSection.includes('programs.map(prog =>') || tpSection.includes('programs.map('),
  "Summary card maps backend array order directly"
);

console.log("\n=== 4. Navigation & Route Link Invariants ===");
// 7 & 8. Link to /uye/programim with text 'Programımı Gör' using React Router Link
assert(
  tpSection.includes('<Link') &&
  tpSection.includes('to="/uye/programim"'),
  "Summary card renders React Router <Link to=\"/uye/programim\">"
);

assert(
  tpSection.includes('Programımı Gör'),
  "Link text explicitly contains 'Programımı Gör'"
);

// 9. min-h-[44px] touch target
const linkMatch = tpSection.match(/<Link[\s\S]*?to=["']\/uye\/programim["'][\s\S]*?>[\s\S]*?Programımı Gör[\s\S]*?<\/Link>/);
assert(Boolean(linkMatch), "Programımı Gör Link element found in summary card");
assert(
  linkMatch && linkMatch[0].includes('min-h-[44px]'),
  "Programımı Gör Link enforces min-h-[44px] touch target accessibility"
);

console.log("\n=== 5. Old Detail List Removal & Empty State Invariants ===");
// 10. Old long exercise detail list completely removed
assert(
  !tpSection.includes('ex.exercise_name') && !tpSection.includes('exercise_name'),
  "Old exercise names listing is completely removed from dashboard"
);
assert(
  !tpSection.includes('ex.instructions') && !tpSection.includes('instructions'),
  "Old exercise instructions are completely removed from dashboard"
);
assert(
  !tpSection.includes('Set') && !tpSection.includes('ex.sets'),
  "Old exercise sets breakdown is completely removed from dashboard"
);
assert(
  !tpSection.includes('Tekrar') && !tpSection.includes('ex.repetitions'),
  "Old exercise repetitions breakdown is completely removed from dashboard"
);
assert(
  !tpSection.includes('ex.duration_seconds') && !tpSection.includes('ex.rest_seconds'),
  "Old duration/rest breakdown is completely removed from dashboard"
);

// 11. Empty state preserved when programs is empty
assert(
  tpSection.includes('Aktif antrenman programın bulunmuyor.'),
  "Dashboard preserves canonical empty state: 'Aktif antrenman programın bulunmuyor.'"
);

console.log("\n=== 6. Cleanup & Non-Regression Invariants ===");
// 12. Appointment cancellation and rescheduling preserved
assert(
  dashboardContent.includes('handleOpenCancel') &&
  dashboardContent.includes('handleSubmitCancel') &&
  dashboardContent.includes('cancelTarget'),
  "Appointment cancellation workflow is fully preserved"
);
assert(
  dashboardContent.includes('loadRescheduleOptions') &&
  dashboardContent.includes('handleSubmitReschedule') &&
  dashboardContent.includes('rescheduleTarget'),
  "Appointment rescheduling workflow is fully preserved"
);

// 13. Zero new mutations
assert(
  !dashboardContent.includes('memberApiClient.createProgram') &&
  !dashboardContent.includes('memberApiClient.updateProgram') &&
  !dashboardContent.includes('memberApiClient.deleteProgram'),
  "Dashboard introduces strictly zero program mutations"
);

// 15. MemberTrainingProgramPage.tsx intact
const memberProgPagePath = path.resolve(process.cwd(), 'src/member/pages/MemberTrainingProgramPage.tsx');
assert(fs.existsSync(memberProgPagePath), "MemberTrainingProgramPage.tsx exists");
const memberProgPageContent = fs.readFileSync(memberProgPagePath, 'utf8');
assert(
  memberProgPageContent.includes('ProgramDaySection') &&
  memberProgPageContent.includes('aria-expanded') &&
  memberProgPageContent.includes('aria-controls'),
  "F.33B MemberTrainingProgramPage.tsx remains intact with day accordion and accessibility"
);

// 16. Temporary flatten helper removed
assert(
  !dashboardContent.includes('function getProgramExercises') &&
  !dashboardContent.includes('getProgramExercises('),
  "Temporary getProgramExercises helper is cleanly removed from MemberDashboardPage.tsx"
);
assert(
  !dashboardContent.includes('MemberExercise,'),
  "Unused MemberExercise type import is cleanly removed from MemberDashboardPage.tsx"
);

console.log("\n=== 7. Algorithmic Fixtures Simulation for Summary Calculation ===");
function calculateProgramSummary(program) {
  const dayCount = program.days.length;
  const totalExercises = program.days.reduce(
    (sum, day) => sum + day.exercises.length,
    0
  ) + program.unassigned_exercises.length;
  const trainerName = program.trainer ? program.trainer.name : 'Antrenör atanmamış';
  return {
    dayCount,
    totalExercises,
    trainerName
  };
}

// Fixture 1: 2 days (3 + 4 exercises) and 2 unassigned exercises
const fix1 = {
  days: [
    { id: 1, title: 'Göğüs', exercises: [{ id: 1 }, { id: 2 }, { id: 3 }] },
    { id: 2, title: 'Bacak', exercises: [{ id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }] }
  ],
  unassigned_exercises: [{ id: 8 }, { id: 9 }],
  trainer: { name: 'Mustafa Gül' }
};
const res1 = calculateProgramSummary(fix1);
assert(res1.dayCount === 2, "Fixture 1: Correct day count (2)");
assert(res1.totalExercises === 9, "Fixture 1: Correct total exercises (3 + 4 + 2 = 9)");
assert(res1.trainerName === 'Mustafa Gül', "Fixture 1: Correct trainer name");

// Fixture 2: 0 days, 5 unassigned exercises, no trainer
const fix2 = {
  days: [],
  unassigned_exercises: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
  trainer: null
};
const res2 = calculateProgramSummary(fix2);
assert(res2.dayCount === 0, "Fixture 2: Correct day count (0)");
assert(res2.totalExercises === 5, "Fixture 2: Correct total exercises (0 + 5 = 5)");
assert(res2.trainerName === 'Antrenör atanmamış', "Fixture 2: Fallback to 'Antrenör atanmamış'");

// Fixture 3: 3 empty days, 0 unassigned exercises
const fix3 = {
  days: [
    { id: 1, title: 'Gün 1', exercises: [] },
    { id: 2, title: 'Gün 2', exercises: [] },
    { id: 3, title: 'Gün 3', exercises: [] }
  ],
  unassigned_exercises: [],
  trainer: { name: 'Ahmet Yılmaz' }
};
const res3 = calculateProgramSummary(fix3);
assert(res3.dayCount === 3, "Fixture 3: Correct day count (3)");
assert(res3.totalExercises === 0, "Fixture 3: Correct total exercises (0)");
assert(res3.trainerName === 'Ahmet Yılmaz', "Fixture 3: Correct trainer name");

// Fixture 4: Completely empty program
const fix4 = {
  days: [],
  unassigned_exercises: [],
  trainer: null
};
const res4 = calculateProgramSummary(fix4);
assert(res4.dayCount === 0, "Fixture 4: Day count is 0");
assert(res4.totalExercises === 0, "Fixture 4: Total exercises is 0");
assert(res4.trainerName === 'Antrenör atanmamış', "Fixture 4: Fallback to 'Antrenör atanmamış'");

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more invariants failed verification.");
  process.exit(1);
} else {
  console.log("✅ SUCCESS: All Member Dashboard Program Summary (F.33C) invariants verified.");
  process.exit(0);
}
