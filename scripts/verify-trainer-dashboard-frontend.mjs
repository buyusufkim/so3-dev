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

function extractObjectBlock(source, searchPattern, startIndex = 0) {
  const index = typeof searchPattern === 'string' 
    ? source.indexOf(searchPattern, startIndex)
    : source.slice(startIndex).search(searchPattern);
  if (index === -1) return null;
  const actualIndex = typeof searchPattern === 'string' ? index : startIndex + index;

  let openIndex = -1;
  let depth = 0;
  for (let i = actualIndex; i >= 0; i--) {
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
  // Supports JS/TS functions, arrow functions, and return type annotations
  const regex = new RegExp(
    `(?:const\\s+${functionName}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)(?:\\s*:\\s*[^=]+)?\\s*=>|function\\s+${functionName}\\s*(?:<[^>]*>)?\\s*\\([^)]*\\)(?:\\s*:\\s*[^{]+)?)\\s*\\{`
  );
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

function extractIfBlock(source, searchPattern) {
  const matchIndex = typeof searchPattern === 'string'
    ? source.indexOf(searchPattern)
    : source.search(searchPattern);
  if (matchIndex === -1) return null;

  const openBraceIndex = source.indexOf('{', matchIndex);
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

console.log("Starting Trainer Dashboard Frontend Contract Verification (Deterministic Guard)...");

// ==========================================
// Invariant 1: Required Source Files Exist
// ==========================================
const requiredFiles = [
  'src/routes/index.tsx',
  'src/admin/pages/trainer-dashboard/TrainerDashboard.tsx',
  'src/admin/pages/trainer-dashboard/types.ts',
  'src/admin/auth/roles.ts',
  'src/admin/layouts/AdminLayout.tsx'
];

const missingFiles = requiredFiles.filter(f => !fs.existsSync(path.join(rootDir, f)));
reportInvariant(
  missingFiles.length === 0,
  "Invariant 1: Required frontend source files exist and are accessible",
  missingFiles.length > 0 ? `Missing files: ${missingFiles.join(', ')}` : null
);

const routesContent = readSource('src/routes/index.tsx') || '';
const dashboardContent = readSource('src/admin/pages/trainer-dashboard/TrainerDashboard.tsx') || '';
const typesContent = readSource('src/admin/pages/trainer-dashboard/types.ts') || '';
const rolesContent = readSource('src/admin/auth/roles.ts') || '';
const layoutContent = readSource('src/admin/layouts/AdminLayout.tsx') || '';

// ==========================================
// Invariant 2: Route Wiring & Admin Dashboard Isolation
// ==========================================
const hasTrainerDashboardLazyImport = routesContent.includes('lazy(() => import("../admin/pages/trainer-dashboard/TrainerDashboard")') ||
  routesContent.includes("lazy(() => import('../admin/pages/trainer-dashboard/TrainerDashboard')");

const trainerRouteBlock = extractObjectBlock(routesContent, /path:\s*["']trainer["']/);
const hasTrainerRouteObject = Boolean(
  trainerRouteBlock &&
  trainerRouteBlock.includes('TrainerDashboard') &&
  !trainerRouteBlock.includes('<Dashboard />')
);

// Verify admin index route still binds Dashboard (not TrainerDashboard)
const adminRootPos = routesContent.indexOf('path: "/admin"');
const adminIndexRouteBlock = adminRootPos !== -1 
  ? extractObjectBlock(routesContent, /index:\s*true/, adminRootPos)
  : null;

const adminIndexIsolated = Boolean(
  adminIndexRouteBlock &&
  adminIndexRouteBlock.includes('Dashboard') &&
  !adminIndexRouteBlock.includes('TrainerDashboard')
);

const routeWiringPass = hasTrainerDashboardLazyImport && hasTrainerRouteObject && adminIndexIsolated;
reportInvariant(
  routeWiringPass,
  "Invariant 2: Route configuration binds /admin/trainer to TrainerDashboard with strict Admin Dashboard isolation",
  "routes/index.tsx must lazy-load TrainerDashboard, bind it to path 'trainer', and keep admin index route bound to Dashboard"
);

// ==========================================
// Invariant 3: Trainer Start Route Mapping
// ==========================================
const getRoleStartRouteBlock = extractFunctionBlock(rolesContent, 'getRoleStartRoute');
let startRoutePass = false;

if (getRoleStartRouteBlock) {
  const trainerCaseMatch = getRoleStartRouteBlock.match(/case\s*['"]trainer['"]\s*:\s*return\s*['"]([^'"]+)['"]/);
  if (trainerCaseMatch) {
    const startRoute = trainerCaseMatch[1];
    startRoutePass = (startRoute === '/admin/trainer');
  }
}

reportInvariant(
  startRoutePass,
  "Invariant 3: getRoleStartRoute strictly maps trainer role to '/admin/trainer'",
  "getRoleStartRoute must return '/admin/trainer' for trainer role"
);

// ==========================================
// Invariant 4: Trainer RBAC Boundary Enforcement
// ==========================================
const hasRoleAccessBlock = extractFunctionBlock(rolesContent, 'hasRoleAccess');
let rbacBoundaryPass = false;

if (hasRoleAccessBlock) {
  const trainerIfBlock = extractIfBlock(hasRoleAccessBlock, /role\s*===?\s*['"]trainer['"]/);
  if (trainerIfBlock) {
    const allowsTrainerDashboard = trainerIfBlock.includes("pathname === '/admin/trainer'") ||
      trainerIfBlock.includes('pathname === "/admin/trainer"');
    const allowsMyMembers = trainerIfBlock.includes("pathname === basePath") ||
      trainerIfBlock.includes("pathname === '/admin/my-members'") ||
      trainerIfBlock.includes('pathname === "/admin/my-members"');
    const allowsMyMembersSubpaths = trainerIfBlock.includes("pathname.startsWith(basePath + '/')") ||
      trainerIfBlock.includes("pathname.startsWith('/admin/my-members/')");
    
    // Negative check: trainer block must not contain broad /admin startsWith
    const noBroadAdminAccess = !trainerIfBlock.match(/pathname\.startsWith\(\s*['"]\/admin['"]\s*\)/);

    rbacBoundaryPass = Boolean(allowsTrainerDashboard && allowsMyMembers && allowsMyMembersSubpaths && noBroadAdminAccess);
  }
}

reportInvariant(
  rbacBoundaryPass,
  "Invariant 4: hasRoleAccess enforces strict RBAC boundary for trainer (/admin/trainer and /admin/my-members namespace only)",
  "Trainer RBAC must allow exact /admin/trainer and /admin/my-members namespace without broad /admin startsWith wildcard"
);

// ==========================================
// Invariant 5: Trainer Sidebar Navigation Targets
// ==========================================
let sidebarPass = false;

// Check trainer navigation block in AdminLayout
const isTrainerDecl = layoutContent.includes("isTrainer = admin?.role === 'trainer'") ||
  layoutContent.includes('isTrainer = admin?.role === "trainer"') ||
  layoutContent.includes("role === 'trainer'");

if (isTrainerDecl) {
  const trainerNavBlockMatch = layoutContent.match(/isTrainer\s*&&\s*\([\s\S]*?\)/);
  const trainerNavBlock = trainerNavBlockMatch ? trainerNavBlockMatch[0] : layoutContent;

  const hasDashboardLink = trainerNavBlock.includes('to="/admin/trainer"') || trainerNavBlock.includes("to='/admin/trainer'");
  const hasMyMembersLink = trainerNavBlock.includes('to="/admin/my-members"') || trainerNavBlock.includes("to='/admin/my-members'");
  
  // Negative check: trainer nav does not contain admin members/settings/homepage links
  const noAdminLinksInTrainerNav = !trainerNavBlock.includes('to="/admin/members"') &&
    !trainerNavBlock.includes('to="/admin/settings"') &&
    !trainerNavBlock.includes('to="/admin/homepage"');

  sidebarPass = Boolean(hasDashboardLink && hasMyMembersLink && noAdminLinksInTrainerNav);
}

reportInvariant(
  sidebarPass,
  "Invariant 5: Trainer sidebar navigation contains exact links for Dashboard (/admin/trainer) and My Members (/admin/my-members)",
  "AdminLayout.tsx must render /admin/trainer and /admin/my-members NavLinks within the trainer navigation section"
);

// ==========================================
// Invariant 6: Dashboard API Isolation & Method Count
// ==========================================
const apiCalls = dashboardContent.match(/apiClient\.[a-zA-Z]+/g) || [];
const hasSingleGetCall = (apiCalls.length === 1 && apiCalls[0] === 'apiClient.get');
const callsTrainerDashboardEndpoint = dashboardContent.includes("apiClient.get('/api/trainer/dashboard')") ||
  dashboardContent.includes('apiClient.get("/api/trainer/dashboard")');

const noAdminEndpoints = !dashboardContent.includes('/api/admin/');
const noExtraTrainerEndpoints = !dashboardContent.includes('/api/trainer/members') &&
  !dashboardContent.includes('/api/trainer/training-programs') &&
  !dashboardContent.includes('/api/trainer/member-measurements') &&
  !dashboardContent.includes('/api/trainer/member-progress-notes');

const noMutations = !dashboardContent.includes('apiClient.post') &&
  !dashboardContent.includes('apiClient.patch') &&
  !dashboardContent.includes('apiClient.delete') &&
  !dashboardContent.includes('apiClient.put');

const apiIsolationPass = hasSingleGetCall && callsTrainerDashboardEndpoint && noAdminEndpoints && noExtraTrainerEndpoints && noMutations;

reportInvariant(
  apiIsolationPass,
  "Invariant 6: Strict API isolation (Component issues exactly 1 request to GET /api/trainer/dashboard, zero admin/extra calls or mutations)",
  "TrainerDashboard must only call apiClient.get('/api/trainer/dashboard') without additional endpoints or mutations"
);

// ==========================================
// Invariant 7: Runtime Response Validator Contract (types.ts)
// ==========================================
const isTrainerDashboardDataBlock = extractFunctionBlock(typesContent, 'isTrainerDashboardData');
let runtimeValidatorPass = false;

if (isTrainerDashboardDataBlock) {
  // Trainer checks
  const trainerIdCheck = isTrainerDashboardDataBlock.includes('trainer.id') &&
    isTrainerDashboardDataBlock.includes('Number.isInteger') &&
    isTrainerDashboardDataBlock.includes('trainer.id <= 0');
  const trainerNameCheck = isTrainerDashboardDataBlock.includes("typeof trainer.display_name !== 'string'") ||
    isTrainerDashboardDataBlock.includes('typeof trainer.display_name !== "string"');

  // Members checks
  const membersTotalCheck = isTrainerDashboardDataBlock.includes('members.total') && isTrainerDashboardDataBlock.includes('members.total < 0');
  const membersActiveCheck = isTrainerDashboardDataBlock.includes('members.active') && isTrainerDashboardDataBlock.includes('members.active < 0');
  const membersInactiveCheck = isTrainerDashboardDataBlock.includes('members.inactive') && isTrainerDashboardDataBlock.includes('members.inactive < 0');

  // Training programs checks
  const tpTotalCheck = isTrainerDashboardDataBlock.includes('tp.total') && isTrainerDashboardDataBlock.includes('tp.total < 0');
  const tpDraftCheck = isTrainerDashboardDataBlock.includes('tp.draft') && isTrainerDashboardDataBlock.includes('tp.draft < 0');
  const tpActiveCheck = isTrainerDashboardDataBlock.includes('tp.active') && isTrainerDashboardDataBlock.includes('tp.active < 0');
  const tpArchivedCheck = isTrainerDashboardDataBlock.includes('tp.archived') && isTrainerDashboardDataBlock.includes('tp.archived < 0');

  // Recent members checks
  const recentArrayCheck = isTrainerDashboardDataBlock.includes('Array.isArray(d.recent_members)');
  const recentItemChecks = isTrainerDashboardDataBlock.includes('m.id') &&
    isTrainerDashboardDataBlock.includes('m.uuid') &&
    isTrainerDashboardDataBlock.includes('m.first_name') &&
    isTrainerDashboardDataBlock.includes('m.last_name') &&
    isTrainerDashboardDataBlock.includes('m.status') &&
    isTrainerDashboardDataBlock.includes('m.updated_at');

  runtimeValidatorPass = Boolean(
    trainerIdCheck && trainerNameCheck &&
    membersTotalCheck && membersActiveCheck && membersInactiveCheck &&
    tpTotalCheck && tpDraftCheck && tpActiveCheck && tpArchivedCheck &&
    recentArrayCheck && recentItemChecks
  );
}

reportInvariant(
  runtimeValidatorPass,
  "Invariant 7: Runtime validator isTrainerDashboardData strictly verifies schema for trainer, members, training_programs, and recent_members",
  "types.ts must implement comprehensive runtime validation with integer, boundary, string, and status checks"
);

// ==========================================
// Invariant 8: Validation-Before-State Gate
// ==========================================
const fetchFunctionBlock = extractFunctionBlock(dashboardContent, 'fetchDashboard');
let validationGatePass = false;

if (fetchFunctionBlock) {
  const validatorIfBlock = extractIfBlock(fetchFunctionBlock, /if\s*\(\s*isTrainerDashboardData\s*\(\s*response\s*\)\s*\)/);
  if (validatorIfBlock) {
    const setsDataInsideValidator = validatorIfBlock.includes('setData(response)');
    
    // Check that setData is NOT called outside the valid block
    const allSetDataCalls = fetchFunctionBlock.match(/setData\s*\(/g) || [];
    const setDataInValidBlock = validatorIfBlock.match(/setData\s*\(/g) || [];
    
    validationGatePass = Boolean(setsDataInsideValidator && allSetDataCalls.length === 1 && setDataInValidBlock.length === 1);
  }
}

reportInvariant(
  validationGatePass,
  "Invariant 8: Validation-before-state gate enforces that setData is only executed inside the successful validator branch",
  "setData(response) must be guarded strictly by isTrainerDashboardData(response) inside fetchDashboard"
);

// ==========================================
// Invariant 9: Invalid-Response Error Path
// ==========================================
let invalidResponsePass = false;

if (fetchFunctionBlock) {
  const validatorIfBlock = extractIfBlock(fetchFunctionBlock, /if\s*\(\s*isTrainerDashboardData\s*\(\s*response\s*\)\s*\)/);
  if (validatorIfBlock) {
    // Check else branch after validator if block
    const ifEndIndex = fetchFunctionBlock.indexOf(validatorIfBlock) + validatorIfBlock.length;
    const elseSubstring = fetchFunctionBlock.substring(ifEndIndex, ifEndIndex + 200);
    const elseIfBlock = extractIfBlock(elseSubstring, /else/);
    if (elseIfBlock) {
      const setsErrorInElse = elseIfBlock.includes('setError(');
      const noSetDataInElse = !elseIfBlock.includes('setData(');
      invalidResponsePass = Boolean(setsErrorInElse && noSetDataInElse);
    }
  }
}

reportInvariant(
  invalidResponsePass,
  "Invariant 9: Invalid response triggers controlled error state without writing to data state",
  "When isTrainerDashboardData returns false, the component must set an error state and must not set data"
);

// ==========================================
// Invariant 10: Stale / Unmount Safety Guard in Fetch Lifecycle
// ==========================================
const useEffectBlocks = extractUseEffectBlocks(dashboardContent);
const dashboardEffect = useEffectBlocks[0] || null;
let staleGuardPass = false;

if (dashboardEffect) {
  const hasSubscribedDecl = dashboardEffect.includes('let isSubscribed = true');
  const hasCleanup = dashboardEffect.includes('return () =>') && dashboardEffect.includes('isSubscribed = false');
  const hasResponseCheck = dashboardEffect.includes('if (!isSubscribed) return');
  const hasFinallyCheck = dashboardEffect.includes('if (isSubscribed)') && dashboardEffect.includes('setLoading(false)');

  staleGuardPass = Boolean(hasSubscribedDecl && hasCleanup && hasResponseCheck && hasFinallyCheck);
}

reportInvariant(
  staleGuardPass,
  "Invariant 10: Asynchronous fetch lifecycle implements comprehensive stale-response and unmount cancellation guards",
  "useEffect must declare isSubscribed flag, guard post-await state updates and finally block, and provide cleanup reset"
);

// ==========================================
// Invariant 11: Deterministic Retry Mechanism
// ==========================================
let retryPass = false;

const hasRefreshKeyState = dashboardContent.includes('const [refreshKey, setRefreshKey] = useState(0)') ||
  dashboardContent.includes('useState(0)') && dashboardContent.includes('refreshKey');

const effectHasDependency = dashboardContent.includes('[refreshKey]');
const hasRetryIncrement = dashboardContent.includes('setRefreshKey((k) => k + 1)') ||
  dashboardContent.includes('setRefreshKey(k => k + 1)');
const noFakeRetry = !dashboardContent.includes('setRefreshKey(refreshKey)');

retryPass = Boolean(hasRefreshKeyState && effectHasDependency && hasRetryIncrement && noFakeRetry);

reportInvariant(
  retryPass,
  "Invariant 11: Deterministic retry mechanism triggers real re-fetch via refreshKey state increment",
  "Retry handler must increment refreshKey state which is bound to the useEffect dependency array"
);

// ==========================================
// Invariant 12: Strict Error Cohesion & Raw Message Prohibition
// ==========================================
let errorCohesionPass = false;

// Check that NO raw error.message is passed to setError
const rawMessageLeaks = dashboardContent.match(/setError\s*\(\s*(?:err|error)\.message/g) || [];
const templateMessageLeaks = dashboardContent.match(/setError\s*\(\s*`[^`]*\$\{(?:err|error)\.message\}/g) || [];

const noRawMessageLeaks = (rawMessageLeaks.length === 0 && templateMessageLeaks.length === 0);

const hasProfileNotLinkedCheck = dashboardContent.includes("err.code === 'TRAINER_PROFILE_NOT_LINKED'") ||
  dashboardContent.includes('err.code === "TRAINER_PROFILE_NOT_LINKED"');
const hasForbiddenCheck = dashboardContent.includes('err.status === 403') || dashboardContent.includes("err.code === 'FORBIDDEN'");
const hasValidationCheck = dashboardContent.includes('err.status === 422') || dashboardContent.includes("err.code === 'VALIDATION_ERROR'");
const hasNotFoundCheck = dashboardContent.includes('err.status === 404') || dashboardContent.includes("err.code === 'NOT_FOUND'");

errorCohesionPass = Boolean(noRawMessageLeaks && hasProfileNotLinkedCheck && hasForbiddenCheck && hasValidationCheck && hasNotFoundCheck);

reportInvariant(
  errorCohesionPass,
  "Invariant 12: Error cohesion prohibits raw err.message leaks and enforces explicit ApiError code/status mapping",
  "setError must not receive raw err.message; TRAINER_PROFILE_NOT_LINKED, 403/FORBIDDEN, 422, 404, and generic errors must use controlled messages"
);

// ==========================================
// Invariant 13: Privacy & Negative Field Leak Invariant
// ==========================================
const forbiddenPropertyAccessRegex = /\.(phone|email|emergency_contact(_name|_phone)?|password(_hash)?)\b/i;
const leaksForbiddenProperty = forbiddenPropertyAccessRegex.test(dashboardContent);

reportInvariant(
  !leaksForbiddenProperty,
  "Invariant 13: Privacy invariant confirms zero access or rendering of phone, email, emergency contacts, or credentials in TrainerDashboard",
  "TrainerDashboard component must not reference or render personal contact data or credentials"
);

// ==========================================
// Invariant 14: Member Navigation & Quick Action Routing
// ==========================================
const hasRecentMemberLink = dashboardContent.includes('/admin/my-members/${member.id}') ||
  dashboardContent.includes('/admin/my-members/${m.id}');
const noAdminMemberLink = !dashboardContent.includes('/admin/members/${');

const hasAllMembersQuickLink = dashboardContent.includes('to="/admin/my-members"') ||
  dashboardContent.includes("to='/admin/my-members'");

const navigationPass = hasRecentMemberLink && noAdminMemberLink && hasAllMembersQuickLink;

reportInvariant(
  navigationPass,
  "Invariant 14: Workspace member navigation links target /admin/my-members/${member.id} and /admin/my-members without leaking admin member paths",
  "Member navigation in TrainerDashboard must exclusively route to /admin/my-members namespace"
);

// ==========================================
// Summary
// ==========================================
console.log('----------------------------------------');
if (hasErrors) {
  console.error(`❌ Trainer Dashboard Frontend Verification FAILED (${passedCount}/${totalInvariants} invariants passed).`);
  process.exit(1);
} else {
  console.log(`✅ Trainer Dashboard Frontend Verification PASSED (All ${passedCount}/${totalInvariants} invariants verified).`);
  process.exit(0);
}
