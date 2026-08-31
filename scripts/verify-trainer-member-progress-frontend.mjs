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

function extractObjectBlock(source, searchPattern) {
  const index = typeof searchPattern === 'string' 
    ? source.indexOf(searchPattern)
    : source.search(searchPattern);
  if (index === -1) return null;

  let openIndex = -1;
  let depth = 0;
  for (let i = index; i >= 0; i--) {
    if (source[i] === '}') depth++;
    else if (source[i] === '{') {
      if (depth === 0) {
        openIndex = i;
        break;
      }
      depth--;
    }
  }
  if (openIndex === -1) return null;

  depth = 0;
  let closeIndex = -1;
  for (let i = openIndex; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        closeIndex = i;
        break;
      }
    }
  }
  if (closeIndex === -1) return null;
  return source.substring(openIndex, closeIndex + 1);
}

function extractFunctionBlock(source, functionName) {
  const regex = new RegExp(`(?:const\\s+${functionName}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>|function\\s+${functionName}\\s*\\([^)]*\\))\\s*\\{`);
  const match = source.match(regex);
  if (!match || match.index === undefined) return null;

  const openBraceIndex = source.indexOf('{', match.index);
  if (openBraceIndex === -1) return null;

  let depth = 0;
  let closeIndex = -1;
  for (let i = openBraceIndex; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        closeIndex = i;
        break;
      }
    }
  }
  if (closeIndex === -1) return null;
  return source.substring(openBraceIndex, closeIndex + 1);
}

function extractUseEffectBlocks(source) {
  const blocks = [];
  const regex = /useEffect\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    const openBraceIndex = source.indexOf('{', match.index);
    if (openBraceIndex === -1) continue;

    let depth = 0;
    let closeIndex = -1;
    for (let i = openBraceIndex; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) {
          closeIndex = i;
          break;
        }
      }
    }
    if (closeIndex !== -1) {
      blocks.push(source.substring(openBraceIndex, closeIndex + 1));
    }
  }
  return blocks;
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
// Invariant 2: Route-Local Configuration & Isolation
// ==========================================
const memberDetailRouteBlock = extractObjectBlock(routesContent, /path:\s*["']my-members\/:id["']/);
const progressRouteBlock = extractObjectBlock(routesContent, /path:\s*["']my-members\/:memberId\/progress["']/);
const programsRouteBlock = extractObjectBlock(routesContent, /path:\s*["']my-members\/:memberId\/training-programs["']/);

const hasValidMemberRoute = Boolean(memberDetailRouteBlock && memberDetailRouteBlock.includes('TrainerMemberDetail'));
const hasValidProgressRoute = Boolean(
  progressRouteBlock &&
  progressRouteBlock.includes('TrainerMemberProgressPage') &&
  !progressRouteBlock.includes('AdminMemberProgressPage')
);
const hasValidProgramsRoute = Boolean(programsRouteBlock && programsRouteBlock.includes('TrainerTrainingProgramsList'));

const routeWiringPass = hasValidMemberRoute && hasValidProgressRoute && hasValidProgramsRoute;

reportInvariant(
  routeWiringPass,
  "Invariant 2: Route-local configuration strictly binds trainer workspace paths without leaking admin components",
  "Route object blocks for /admin/my-members/:id, :memberId/progress, and :memberId/training-programs must bind dedicated trainer components"
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
// Invariant 7: Measurements Strict Runtime Response Validation (No Fallbacks)
// ==========================================
const hasMeasurementListValidator = progressPageContent.includes('isMemberMeasurementListResponse(');
const hasMeasurementDetailValidator = progressPageContent.includes('isMemberMeasurementDetail(');
const hasMeasurementSuccessValidator = progressPageContent.includes('isMemberProgressSuccessResponse(') &&
  measurementModalContent.includes('isMemberProgressSuccessResponse(');
const hasMeasurementStrictCreateValidator = measurementModalContent.includes('isMemberMeasurementCreateResponse(');

const measurementValidationPass = hasMeasurementListValidator &&
  hasMeasurementDetailValidator &&
  hasMeasurementSuccessValidator &&
  hasMeasurementStrictCreateValidator;

reportInvariant(
  measurementValidationPass,
  "Invariant 7: Measurements runtime response validation enforces strict separate create and mutation type guards",
  "TrainerMeasurementFormModal must strictly invoke isMemberMeasurementCreateResponse on create and isMemberProgressSuccessResponse on patch"
);

// ==========================================
// Invariant 8: Measurements Archived Detail Safety & Stale State Reset
// ==========================================
const progressUseEffects = extractUseEffectBlocks(progressPageContent);
const measurementDetailEffect = progressUseEffects.find(
  b => b.includes('selectedMeasurementId') && b.includes('/api/trainer/member-measurements/')
);

let archivedSafetyPass = false;
if (measurementDetailEffect) {
  const hasItemFind = measurementDetailEffect.includes('measurements.find');
  const hasDeletedCheck = measurementDetailEffect.includes('deleted_at !== null') || measurementDetailEffect.includes('deleted_at != null');
  const hasDetailReset = measurementDetailEffect.includes('setDetail(null)');
  
  const deletedCheckPos = measurementDetailEffect.indexOf('deleted_at');
  const apiFetchPos = measurementDetailEffect.indexOf('apiClient.get');
  const earlyReturnBeforeApi = deletedCheckPos !== -1 && apiFetchPos !== -1 && deletedCheckPos < apiFetchPos;

  archivedSafetyPass = hasItemFind && hasDeletedCheck && hasDetailReset && earlyReturnBeforeApi;
}

const hasMeasurementRestoreClickIsolation = progressPageContent.includes('e.stopPropagation()') &&
  progressPageContent.includes('handleRestore');
const hasMeasurementPaginationReset = progressPageContent.includes('handlePageChange') &&
  progressPageContent.includes('setSelectedMeasurementId(null)') &&
  progressPageContent.includes('setDetail(null)');
const hasMeasurementFilterReset = progressPageContent.includes('handleFilterChange') &&
  progressPageContent.includes('setSelectedMeasurementId(null)') &&
  progressPageContent.includes('setDetail(null)');

const measurementSafetyPass = archivedSafetyPass &&
  hasMeasurementRestoreClickIsolation &&
  hasMeasurementPaginationReset &&
  hasMeasurementFilterReset;

reportInvariant(
  measurementSafetyPass,
  "Invariant 8: Measurements archived record detail safety, click isolation, and stale state reset",
  "Archived records must be guarded against detail fetch via early return, restore button must stop propagation, and page/filter changes must clear selected detail"
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
// Invariant 10: Progress Notes Strict Runtime Response Validation (No Fallbacks)
// ==========================================
const hasNotesListValidator = notesPanelContent.includes('isMemberProgressNoteListResponse(');
const hasNotesDetailValidator = notesPanelContent.includes('isMemberProgressNoteDetail(');
const hasNotesSuccessValidator = notesPanelContent.includes('isMemberProgressSuccessResponse(') &&
  noteModalContent.includes('isMemberProgressSuccessResponse(');
const hasNotesStrictCreateValidator = noteModalContent.includes('isMemberProgressNoteCreateResponse(');

const notesValidationPass = hasNotesListValidator &&
  hasNotesDetailValidator &&
  hasNotesSuccessValidator &&
  hasNotesStrictCreateValidator;

reportInvariant(
  notesValidationPass,
  "Invariant 10: Progress Notes runtime response validation enforces strict separate create and mutation type guards",
  "TrainerProgressNoteFormModal must strictly invoke isMemberProgressNoteCreateResponse on create and isMemberProgressSuccessResponse on patch"
);

// ==========================================
// Invariant 11: Progress Notes Archived Detail Safety, Restore Click Isolation & Stale State Reset
// ==========================================
const itemClickBlock = extractFunctionBlock(notesPanelContent, 'handleItemClick');
let archivedNotesSafetyPass = false;
if (itemClickBlock) {
  const hasDeletedCheck = itemClickBlock.includes('deleted_at !== null') || itemClickBlock.includes('deleted_at != null');
  const deletedCheckPos = itemClickBlock.indexOf('deleted_at');
  const setSelectedPos = itemClickBlock.indexOf('setSelectedNoteId');
  const earlyReturnBeforeSelect = deletedCheckPos !== -1 && setSelectedPos !== -1 && deletedCheckPos < setSelectedPos;

  archivedNotesSafetyPass = hasDeletedCheck && earlyReturnBeforeSelect;
}

const hasNotesRestoreClickIsolation = notesPanelContent.includes('e.stopPropagation()') &&
  notesPanelContent.includes('handleRestore');
const hasNotesPaginationReset = notesPanelContent.includes('handlePageChange') &&
  notesPanelContent.includes('setSelectedNoteId(null)') &&
  notesPanelContent.includes('setDetail(null)');
const hasNotesFilterReset = notesPanelContent.includes('handleFilterChange') &&
  notesPanelContent.includes('setSelectedNoteId(null)') &&
  notesPanelContent.includes('setDetail(null)');

const notesSafetyPass = archivedNotesSafetyPass &&
  hasNotesRestoreClickIsolation &&
  hasNotesPaginationReset &&
  hasNotesFilterReset;

reportInvariant(
  notesSafetyPass,
  "Invariant 11: Progress Notes archived record detail safety, restore click isolation, and stale state reset",
  "Archived notes must be guarded against detail selection via early return in handleItemClick, restore button must stop propagation, and page/filter changes must clear selected detail"
);

// ==========================================
// Invariant 12: Measurement Form Modal Duplicate Submit Lock & Changed-Only PATCH
// ==========================================
const measurementSaveBlock = extractFunctionBlock(measurementModalContent, 'handleSave');
let measurementModalSemanticsPass = false;

if (measurementSaveBlock) {
  const hasSubmittingRefDecl = measurementModalContent.includes('useRef(false)') && measurementModalContent.includes('isSubmitting');
  const hasSubmittingGuard = measurementSaveBlock.includes('if (isSubmitting.current) return') ||
    measurementSaveBlock.includes('if(isSubmitting.current)return') ||
    measurementSaveBlock.includes('isSubmitting.current) return');
  const hasLockTrue = measurementSaveBlock.includes('isSubmitting.current = true');
  const hasLockFalseInFinally = measurementSaveBlock.includes('finally') && measurementSaveBlock.includes('isSubmitting.current = false');

  const hasPatchPayload = measurementSaveBlock.includes('patchPayload');
  const hasChangesFlag = measurementSaveBlock.includes('hasChanges');
  const hasNoChangesCheck = measurementSaveBlock.includes('!hasChanges');
  
  const noChangesPos = measurementSaveBlock.indexOf('!hasChanges');
  const patchPos = measurementSaveBlock.indexOf('apiClient.patch');
  const noChangesReturnsBeforePatch = noChangesPos !== -1 && patchPos !== -1 && noChangesPos < patchPos;

  const patchUsesPayload = measurementSaveBlock.includes('patchPayload') &&
    measurementSaveBlock.includes('apiClient.patch');

  measurementModalSemanticsPass = hasSubmittingRefDecl &&
    hasSubmittingGuard &&
    hasLockTrue &&
    hasLockFalseInFinally &&
    hasPatchPayload &&
    hasChangesFlag &&
    hasNoChangesCheck &&
    noChangesReturnsBeforePatch &&
    patchUsesPayload;
}

reportInvariant(
  measurementModalSemanticsPass,
  "Invariant 12: Measurement Form Modal enforces duplicate-submit ref lock and changed-only PATCH with no-op early return",
  "TrainerMeasurementFormModal must enforce isSubmitting ref lock lifecycle and bypass API calls on unchanged data"
);

// ==========================================
// Invariant 13: Progress Note Form Modal Duplicate Submit Lock, Text Bounds & Changed-Only PATCH
// ==========================================
const noteSaveBlock = extractFunctionBlock(noteModalContent, 'handleSave');
let noteModalSemanticsPass = false;

if (noteSaveBlock) {
  const hasSubmittingRefDecl = noteModalContent.includes('useRef(false)') && noteModalContent.includes('isSubmitting');
  const hasSubmittingGuard = noteSaveBlock.includes('if (isSubmitting.current) return') ||
    noteSaveBlock.includes('if(isSubmitting.current)return') ||
    noteSaveBlock.includes('isSubmitting.current) return');
  const hasLockTrue = noteSaveBlock.includes('isSubmitting.current = true');
  const hasLockFalseInFinally = noteSaveBlock.includes('finally') && noteSaveBlock.includes('isSubmitting.current = false');

  const hasPatchPayload = noteSaveBlock.includes('patchPayload');
  const hasChangesFlag = noteSaveBlock.includes('hasChanges');
  const hasNoChangesCheck = noteSaveBlock.includes('!hasChanges');
  
  const noChangesPos = noteSaveBlock.indexOf('!hasChanges');
  const patchPos = noteSaveBlock.indexOf('apiClient.patch');
  const noChangesReturnsBeforePatch = noChangesPos !== -1 && patchPos !== -1 && noChangesPos < patchPos;

  const patchUsesPayload = noteSaveBlock.includes('patchPayload') &&
    noteSaveBlock.includes('apiClient.patch');

  const hasLengthCheck = noteModalContent.includes('5000') && noteModalContent.includes('length > 5000');
  const hasEmptyCheck = noteModalContent.includes('trim() === ""') || noteModalContent.includes('trim()');

  noteModalSemanticsPass = hasSubmittingRefDecl &&
    hasSubmittingGuard &&
    hasLockTrue &&
    hasLockFalseInFinally &&
    hasPatchPayload &&
    hasChangesFlag &&
    hasNoChangesCheck &&
    noChangesReturnsBeforePatch &&
    patchUsesPayload &&
    hasLengthCheck &&
    hasEmptyCheck;
}

reportInvariant(
  noteModalSemanticsPass,
  "Invariant 13: Progress Note Form Modal enforces duplicate-submit ref lock, text validation, and changed-only PATCH",
  "TrainerProgressNoteFormModal must validate non-empty 5000-char text, enforce ref lock, and bypass API on unchanged data"
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
