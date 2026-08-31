import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

let hasErrors = false;
let passedCount = 0;
let totalInvariants = 0;

function reportInvariant(condition, invariantName, failureDetails) {
  totalInvariants++;
  if (!condition) {
    console.error(`❌ FAIL: ${invariantName}`);
    if (failureDetails) {
      console.error(`   Details: ${failureDetails}`);
    }
    hasErrors = true;
  } else {
    console.log(`✅ PASS: ${invariantName}`);
    passedCount++;
  }
}

function readSource(relPath) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  return fs.readFileSync(fullPath, 'utf8');
}

console.log("Starting Trainer Member Progress Frontend Contract Verification...");

// ==========================================
// Invariant 1: Required Source Files Exist
// ==========================================
const requiredFiles = [
  'src/routes/index.tsx',
  'src/admin/components/TrainerMemberWorkspaceNav.tsx',
  'src/admin/pages/trainer-members/TrainerMemberDetail.tsx',
  'src/admin/pages/trainer-member-progress/TrainerMemberProgressPage.tsx',
  'src/admin/pages/trainer-member-progress/TrainerMeasurementFormModal.tsx',
  'src/admin/pages/trainer-member-progress/TrainerProgressNotesPanel.tsx',
  'src/admin/pages/trainer-member-progress/TrainerProgressNoteFormModal.tsx',
  'src/admin/pages/trainer-training-programs/TrainerTrainingProgramsList.tsx',
  'src/admin/pages/member-progress/types.ts'
];

const missingFiles = requiredFiles.filter(f => !fs.existsSync(path.join(rootDir, f)));
reportInvariant(
  missingFiles.length === 0,
  "Invariant 1: Required frontend workspace source files exist and are accessible",
  missingFiles.length > 0 ? `Missing files: ${missingFiles.join(', ')}` : null
);

// Load source contents
const routesContent = readSource('src/routes/index.tsx') || '';
const navContent = readSource('src/admin/components/TrainerMemberWorkspaceNav.tsx') || '';
const detailContent = readSource('src/admin/pages/trainer-members/TrainerMemberDetail.tsx') || '';
const progressPageContent = readSource('src/admin/pages/trainer-member-progress/TrainerMemberProgressPage.tsx') || '';
const measurementModalContent = readSource('src/admin/pages/trainer-member-progress/TrainerMeasurementFormModal.tsx') || '';
const notesPanelContent = readSource('src/admin/pages/trainer-member-progress/TrainerProgressNotesPanel.tsx') || '';
const noteModalContent = readSource('src/admin/pages/trainer-member-progress/TrainerProgressNoteFormModal.tsx') || '';
const programsListContent = readSource('src/admin/pages/trainer-training-programs/TrainerTrainingProgramsList.tsx') || '';
const typesContent = readSource('src/admin/pages/member-progress/types.ts') || '';

// ==========================================
// Invariant 2: Route Configuration
// ==========================================
const hasTrainerMemberDetailImport = routesContent.includes('TrainerMemberDetail');
const hasTrainerProgressImport = routesContent.includes('TrainerMemberProgressPage');
const hasTrainerProgramsImport = routesContent.includes('TrainerTrainingProgramsList');

const hasMyMembersDetailRoute = routesContent.includes('path: "my-members/:id"') &&
  routesContent.includes('<TrainerMemberDetail');
const hasMyMembersProgressRoute = routesContent.includes('path: "my-members/:memberId/progress"') &&
  routesContent.includes('<TrainerMemberProgressPage');
const hasMyMembersProgramsRoute = routesContent.includes('path: "my-members/:memberId/training-programs"') &&
  routesContent.includes('<TrainerTrainingProgramsList');

// Ensure trainer progress route is NOT connected to admin progress page
const isTrainerProgressIsolatedFromAdmin = !routesContent.includes('path: "my-members/:memberId/progress",\n        element: <AdminSuspense><AdminMemberProgressPage');

const routeWiringPass = hasTrainerMemberDetailImport &&
  hasTrainerProgressImport &&
  hasTrainerProgramsImport &&
  hasMyMembersDetailRoute &&
  hasMyMembersProgressRoute &&
  hasMyMembersProgramsRoute &&
  isTrainerProgressIsolatedFromAdmin;

reportInvariant(
  routeWiringPass,
  "Invariant 2: Application route configuration maps trainer member routes to dedicated trainer components",
  "Routes index must correctly map /admin/my-members/:id, :memberId/progress and :memberId/training-programs without leaking AdminMemberProgressPage"
);

// ==========================================
// Invariant 3: Shared Workspace Navigation Mapping & Semantics
// ==========================================
const hasMemberTab = navContent.includes('`/admin/my-members/${memberId}`');
const hasProgressTab = navContent.includes('`/admin/my-members/${memberId}/progress`');
const hasProgramsTab = navContent.includes('`/admin/my-members/${memberId}/training-programs`');
const hasActivePropCheck = navContent.includes('active ===') || navContent.includes('active: WorkspaceTab');
const hasAriaCurrent = navContent.includes('aria-current={isActive ? "page" : undefined}');
const hasWorkspaceTabType = navContent.includes('export type WorkspaceTab = "member" | "progress" | "programs"');

const workspaceNavPass = hasMemberTab && hasProgressTab && hasProgramsTab && hasActivePropCheck && hasAriaCurrent && hasWorkspaceTabType;
reportInvariant(
  workspaceNavPass,
  "Invariant 3: Shared workspace navigation contract preserves exact route mappings and active tab semantics",
  "TrainerMemberWorkspaceNav must define member, progress, and programs tab targets and aria-current active semantics"
);

// ==========================================
// Invariant 4: Canonical Member ID Gates (/^[1-9]\d*$/)
// ==========================================
const detailHasCanonicalGate = detailContent.includes('/^[1-9]\\d*$/') || detailContent.includes('/^[1-9]\\d*$/.test');
const progressHasCanonicalGate = progressPageContent.includes('/^[1-9]\\d*$/') || progressPageContent.includes('/^[1-9]\\d*$/.test');
const programsHasCanonicalGate = programsListContent.includes('/^[1-9]\\d*$/') || programsListContent.includes('/^[1-9]\\d*$/.test');

const detailGuardsApi = detailContent.includes('if (!isValidMemberId)') || detailContent.includes('!isValidMemberId');
const progressGuardsApi = progressPageContent.includes('if (!isValidMemberId)') || progressPageContent.includes('!isValidMemberId');
const programsGuardsApi = programsListContent.includes('if (!isValidMemberId)') || programsListContent.includes('!isValidMemberId');

const canonicalGatesPass = detailHasCanonicalGate && progressHasCanonicalGate && programsHasCanonicalGate &&
  detailGuardsApi && progressGuardsApi && programsGuardsApi;

reportInvariant(
  canonicalGatesPass,
  "Invariant 4: Canonical positive integer member ID validation gate (/^[1-9]\\d*$/) across workspace pages",
  "TrainerMemberDetail, TrainerMemberProgressPage, and TrainerTrainingProgramsList must enforce canonical member ID check before calling APIs"
);

// ==========================================
// Invariant 5: Negative Invariant - No /api/admin/ in Trainer Workspace
// ==========================================
const trainerWorkspaceFiles = [
  { name: 'TrainerMemberDetail.tsx', content: detailContent },
  { name: 'TrainerMemberProgressPage.tsx', content: progressPageContent },
  { name: 'TrainerMeasurementFormModal.tsx', content: measurementModalContent },
  { name: 'TrainerProgressNotesPanel.tsx', content: notesPanelContent },
  { name: 'TrainerProgressNoteFormModal.tsx', content: noteModalContent },
  { name: 'TrainerTrainingProgramsList.tsx', content: programsListContent },
  { name: 'TrainerMemberWorkspaceNav.tsx', content: navContent }
];

const leakedAdminEndpoints = trainerWorkspaceFiles
  .filter(f => f.content.includes('/api/admin/'))
  .map(f => f.name);

reportInvariant(
  leakedAdminEndpoints.length === 0,
  "Invariant 5: Strict endpoint isolation (Negative Invariant: No /api/admin/ in trainer workspace files)",
  leakedAdminEndpoints.length > 0 ? `Leaked in: ${leakedAdminEndpoints.join(', ')}` : null
);

// ==========================================
// Invariant 6: Measurements API Endpoints Contract
// ==========================================
const hasMeasurementListEndpoint = progressPageContent.includes('/api/trainer/members/${memberId}/measurements');
const hasMeasurementDetailEndpoint = progressPageContent.includes('/api/trainer/member-measurements/${selectedMeasurementId}') ||
  progressPageContent.includes('/api/trainer/member-measurements/${');
const hasMeasurementArchiveEndpoint = progressPageContent.includes('/api/trainer/member-measurements/${id}');
const hasMeasurementRestoreEndpoint = progressPageContent.includes('/api/trainer/member-measurements/${id}/restore');
const hasMeasurementCreateEndpoint = measurementModalContent.includes('/api/trainer/members/${memberId}/measurements');
const hasMeasurementPatchEndpoint = measurementModalContent.includes('/api/trainer/member-measurements/${initialData.id}') ||
  measurementModalContent.includes('/api/trainer/member-measurements/${');

const measurementEndpointsPass = hasMeasurementListEndpoint &&
  hasMeasurementDetailEndpoint &&
  hasMeasurementArchiveEndpoint &&
  hasMeasurementRestoreEndpoint &&
  hasMeasurementCreateEndpoint &&
  hasMeasurementPatchEndpoint;

reportInvariant(
  measurementEndpointsPass,
  "Invariant 6: Measurements API contract uses dedicated trainer read, mutation, and restore endpoints",
  "Measurements endpoints must strictly target /api/trainer/members/:memberId/measurements and /api/trainer/member-measurements/:id"
);

// ==========================================
// Invariant 7: Measurements Runtime Response Validation
// ==========================================
const hasMeasurementListValidator = progressPageContent.includes('isMemberMeasurementListResponse(');
const hasMeasurementDetailValidator = progressPageContent.includes('isMemberMeasurementDetail(');
const hasMeasurementSuccessValidator = progressPageContent.includes('isMemberProgressSuccessResponse(') &&
  measurementModalContent.includes('isMemberProgressSuccessResponse(');
const hasMeasurementCreateValidator = measurementModalContent.includes('isMemberMeasurementCreateResponse(') ||
  measurementModalContent.includes('isMemberProgressSuccessResponse(');

const measurementValidationPass = hasMeasurementListValidator &&
  hasMeasurementDetailValidator &&
  hasMeasurementSuccessValidator &&
  hasMeasurementCreateValidator;

reportInvariant(
  measurementValidationPass,
  "Invariant 7: Measurements runtime response validation enforces strict payload type guards",
  "Runtime type guards (isMemberMeasurementListResponse, isMemberMeasurementDetail, isMemberProgressSuccessResponse) must be invoked"
);

// ==========================================
// Invariant 8: Measurements Archived Detail Safety, Click Isolation & Stale State Reset
// ==========================================
const hasMeasurementArchivedCheck = progressPageContent.includes('deleted_at !== null') &&
  progressPageContent.includes('Arşivlenmiş kayıtların detay notu görüntülenemez');
const hasMeasurementRestoreClickIsolation = progressPageContent.includes('e.stopPropagation()') &&
  progressPageContent.includes('handleRestore');
const hasMeasurementPaginationReset = progressPageContent.includes('handlePageChange') &&
  progressPageContent.includes('setSelectedMeasurementId(null)') &&
  progressPageContent.includes('setDetail(null)');
const hasMeasurementFilterReset = progressPageContent.includes('handleFilterChange') &&
  progressPageContent.includes('setSelectedMeasurementId(null)') &&
  progressPageContent.includes('setDetail(null)');

const measurementSafetyPass = hasMeasurementArchivedCheck &&
  hasMeasurementRestoreClickIsolation &&
  hasMeasurementPaginationReset &&
  hasMeasurementFilterReset;

reportInvariant(
  measurementSafetyPass,
  "Invariant 8: Measurements archived record detail safety, click isolation, and stale state reset",
  "Archived records must be guarded against detail fetch, restore button must stop click propagation, and page/filter changes must clear selected detail"
);

// ==========================================
// Invariant 9: Progress Notes API Endpoints Contract
// ==========================================
const hasNotesListEndpoint = notesPanelContent.includes('/api/trainer/members/${memberId}/progress-notes');
const hasNotesDetailEndpoint = notesPanelContent.includes('/api/trainer/member-progress-notes/${selectedNoteId}') ||
  notesPanelContent.includes('/api/trainer/member-progress-notes/${');
const hasNotesArchiveEndpoint = notesPanelContent.includes('/api/trainer/member-progress-notes/${id}');
const hasNotesRestoreEndpoint = notesPanelContent.includes('/api/trainer/member-progress-notes/${id}/restore');
const hasNotesCreateEndpoint = noteModalContent.includes('/api/trainer/members/${memberId}/progress-notes');
const hasNotesPatchEndpoint = noteModalContent.includes('/api/trainer/member-progress-notes/${initialData.id}') ||
  noteModalContent.includes('/api/trainer/member-progress-notes/${');

const notesEndpointsPass = hasNotesListEndpoint &&
  hasNotesDetailEndpoint &&
  hasNotesArchiveEndpoint &&
  hasNotesRestoreEndpoint &&
  hasNotesCreateEndpoint &&
  hasNotesPatchEndpoint;

reportInvariant(
  notesEndpointsPass,
  "Invariant 9: Progress Notes API contract uses dedicated trainer read, mutation, and restore endpoints",
  "Progress notes endpoints must strictly target /api/trainer/members/:memberId/progress-notes and /api/trainer/member-progress-notes/:id"
);

// ==========================================
// Invariant 10: Progress Notes Runtime Response Validation
// ==========================================
const hasNotesListValidator = notesPanelContent.includes('isMemberProgressNoteListResponse(');
const hasNotesDetailValidator = notesPanelContent.includes('isMemberProgressNoteDetail(');
const hasNotesSuccessValidator = notesPanelContent.includes('isMemberProgressSuccessResponse(') &&
  noteModalContent.includes('isMemberProgressSuccessResponse(');
const hasNotesCreateValidator = noteModalContent.includes('isMemberProgressNoteCreateResponse(') ||
  noteModalContent.includes('isMemberProgressSuccessResponse(');

const notesValidationPass = hasNotesListValidator &&
  hasNotesDetailValidator &&
  hasNotesSuccessValidator &&
  hasNotesCreateValidator;

reportInvariant(
  notesValidationPass,
  "Invariant 10: Progress Notes runtime response validation enforces strict payload type guards",
  "Runtime type guards (isMemberProgressNoteListResponse, isMemberProgressNoteDetail, isMemberProgressSuccessResponse) must be invoked"
);

// ==========================================
// Invariant 11: Progress Notes Archived Detail Safety, Restore Click Isolation & Stale State Reset
// ==========================================
const hasNotesArchivedCheck = notesPanelContent.includes('n.deleted_at !== null') ||
  notesPanelContent.includes('deleted_at !== null');
const hasNotesRestoreClickIsolation = notesPanelContent.includes('e.stopPropagation()') &&
  notesPanelContent.includes('handleRestore');
const hasNotesPaginationReset = notesPanelContent.includes('handlePageChange') &&
  notesPanelContent.includes('setSelectedNoteId(null)') &&
  notesPanelContent.includes('setDetail(null)');
const hasNotesFilterReset = notesPanelContent.includes('handleFilterChange') &&
  notesPanelContent.includes('setSelectedNoteId(null)') &&
  notesPanelContent.includes('setDetail(null)');

const notesSafetyPass = hasNotesArchivedCheck &&
  hasNotesRestoreClickIsolation &&
  hasNotesPaginationReset &&
  hasNotesFilterReset;

reportInvariant(
  notesSafetyPass,
  "Invariant 11: Progress Notes archived record detail safety, restore click isolation, and stale state reset",
  "Archived notes must be guarded against detail fetch, restore button must stop click propagation, and page/filter changes must clear selected detail"
);

// ==========================================
// Invariant 12: Measurement Form Modal Contract
// ==========================================
const measurementHasSubmittingRef = measurementModalContent.includes('isSubmitting') || measurementModalContent.includes('saving');
const measurementHasChangedOnlyLogic = measurementModalContent.includes('!hasChanges') || measurementModalContent.includes('hasChanges');
const measurementHasNumericValidation = measurementModalContent.includes('parseAndValidateNumeric') ||
  measurementModalContent.includes('max 2');

const measurementModalPass = measurementHasSubmittingRef &&
  measurementHasChangedOnlyLogic &&
  measurementHasNumericValidation;

reportInvariant(
  measurementModalPass,
  "Invariant 12: Measurement Form Modal enforces changed-only PATCH, duplicate submit guard, and numeric bounds",
  "TrainerMeasurementFormModal must avoid sending unchanged PATCH requests and guard against duplicate submissions"
);

// ==========================================
// Invariant 13: Progress Note Form Modal Contract
// ==========================================
const noteHasSubmittingRef = noteModalContent.includes('isSubmitting') || noteModalContent.includes('saving');
const noteHasChangedOnlyLogic = noteModalContent.includes('!hasChanges') || noteModalContent.includes('hasChanges');
const noteHasLengthCheck = noteModalContent.includes('5000') &&
  (noteModalContent.includes('length > 5000') || noteModalContent.includes('5000 karakter'));
const noteHasEmptyCheck = noteModalContent.includes('note.trim() === ""') || noteModalContent.includes('trim()');

const noteModalPass = noteHasSubmittingRef &&
  noteHasChangedOnlyLogic &&
  noteHasLengthCheck &&
  noteHasEmptyCheck;

reportInvariant(
  noteModalPass,
  "Invariant 13: Progress Note Form Modal enforces changed-only PATCH, duplicate submit guard, and text validation",
  "TrainerProgressNoteFormModal must validate note non-emptiness, enforce 5000 char maximum, and prevent duplicate submission"
);

// ==========================================
// Invariant 14: Async Stale-Response Subscription & Cancellation Guards
// ==========================================
const detailHasAsyncGuard = detailContent.includes('isSubscribed') && detailContent.includes('return () =>');
const programsHasAsyncGuard = programsListContent.includes('isSubscribed') && programsListContent.includes('return () =>');
const progressHasAsyncGuard = progressPageContent.includes('isSubscribed') && progressPageContent.includes('return () =>');
const notesPanelHasAsyncGuard = notesPanelContent.includes('isSubscribed') && notesPanelContent.includes('return () =>');

const asyncGuardsPass = detailHasAsyncGuard && programsHasAsyncGuard && progressHasAsyncGuard && notesPanelHasAsyncGuard;

reportInvariant(
  asyncGuardsPass,
  "Invariant 14: Async stale-response subscription & cancellation guards in workspace pages",
  "TrainerMemberDetail, TrainerTrainingProgramsList, TrainerMemberProgressPage, and TrainerProgressNotesPanel must employ subscription guards"
);

// ==========================================
// Invariant 15: Tab Isolation and Conditional Mounting
// ==========================================
const hasTabState = progressPageContent.includes('activeTab') &&
  progressPageContent.includes('ProgressTab');
const hasMeasurementsTabGate = progressPageContent.includes('activeTab !== "measurements"') ||
  progressPageContent.includes('activeTab === "measurements"');
const hasNotesPanelConditionalMount = progressPageContent.includes('activeTab === "notes"') &&
  progressPageContent.includes('<TrainerProgressNotesPanel');

const tabIsolationPass = hasTabState && hasMeasurementsTabGate && hasNotesPanelConditionalMount;

reportInvariant(
  tabIsolationPass,
  "Invariant 15: Tab isolation and conditional mounting in Trainer Member Progress workspace",
  "TrainerMemberProgressPage must isolate measurements and progress notes tab lifecycles and conditional mounting"
);

// ==========================================
// Summary
// ==========================================
console.log('----------------------------------------');
if (hasErrors) {
  console.error(`❌ Trainer Member Progress Frontend Verification FAILED (${passedCount}/${totalInvariants} invariants passed).`);
  process.exit(1);
} else {
  console.log(`✅ Trainer Member Progress Frontend Verification PASSED (All ${passedCount}/${totalInvariants} invariants verified).`);
  process.exit(0);
}
