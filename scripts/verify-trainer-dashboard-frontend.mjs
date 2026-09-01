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

function extractBalancedBlock(source, startIndex) {
  const openBraceIndex = source.indexOf('{', startIndex);
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

function extractObjectBlock(source, searchPattern, startIndex = 0) {
  const matchIndex = typeof searchPattern === 'string' 
    ? source.indexOf(searchPattern, startIndex)
    : source.slice(startIndex).search(searchPattern);
  if (matchIndex === -1) return null;
  const actualIndex = typeof searchPattern === 'string' ? matchIndex : startIndex + matchIndex;

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
  const regex = new RegExp(
    `(?:const\\s+${functionName}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)(?:\\s*:\\s*[^=]+)?\\s*=>|function\\s+${functionName}\\s*(?:<[^>]*>)?\\s*\\([^)]*\\)(?:\\s*:\\s*[^{]+)?)\\s*\\{`
  );
  const match = source.match(regex);
  if (!match || match.index === undefined) return null;
  return extractBalancedBlock(source, match.index);
}

function extractIfBlock(source, searchPattern) {
  const matchIndex = typeof searchPattern === 'string'
    ? source.indexOf(searchPattern)
    : source.search(searchPattern);
  if (matchIndex === -1) return null;
  return extractBalancedBlock(source, matchIndex);
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

function extractTryCatchFinally(source) {
  const tryMatch = source.match(/try\s*\{/);
  if (!tryMatch || tryMatch.index === undefined) return { tryBlock: null, catchBlock: null, finallyBlock: null };

  const tryBlock = extractBalancedBlock(source, tryMatch.index);
  if (!tryBlock) return { tryBlock: null, catchBlock: null, finallyBlock: null };

  const afterTryIndex = tryMatch.index + tryBlock.length;
  const catchMatch = source.slice(afterTryIndex).match(/catch\s*\([^)]*\)\s*\{/);
  
  let catchBlock = null;
  let afterCatchIndex = afterTryIndex;
  if (catchMatch && catchMatch.index !== undefined) {
    const actualCatchIndex = afterTryIndex + catchMatch.index;
    catchBlock = extractBalancedBlock(source, actualCatchIndex);
    if (catchBlock) {
      afterCatchIndex = actualCatchIndex + catchBlock.length;
    }
  }

  const finallyMatch = source.slice(afterCatchIndex).match(/finally\s*\{/);
  let finallyBlock = null;
  if (finallyMatch && finallyMatch.index !== undefined) {
    const actualFinallyIndex = afterCatchIndex + finallyMatch.index;
    finallyBlock = extractBalancedBlock(source, actualFinallyIndex);
  }

  return { tryBlock, catchBlock, finallyBlock };
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
// Invariant 4: Trainer RBAC Boundary & Explicit Deny Surface
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
    
    // Negative check: trainer block must not contain broad /admin startsWith wildcard
    const noBroadAdminAccess = !trainerIfBlock.match(/pathname\.startsWith\(\s*['"]\/admin['"]\s*\)/);

    // Negative check: forbidden admin routes must not be allowed in trainer block
    const forbiddenAdminRoutes = [
      '/admin',
      '/admin/settings',
      '/admin/members',
      '/admin/trainers',
      '/admin/trainer-accounts',
      '/admin/homepage',
      '/admin/media',
      '/admin/events',
      '/admin/branches',
      '/admin/reception'
    ];

    let noForbiddenRouteAllowed = true;
    for (const fr of forbiddenAdminRoutes) {
      const exactPattern = new RegExp(`pathname\\s*===?\\s*['"]${fr}['"]`);
      if (exactPattern.test(trainerIfBlock)) {
        noForbiddenRouteAllowed = false;
        break;
      }
      if (fr !== '/admin') {
        const startsWithPattern = new RegExp(`pathname\\.startsWith\\(\\s*['"]${fr}`);
        if (startsWithPattern.test(trainerIfBlock)) {
          noForbiddenRouteAllowed = false;
          break;
        }
      }
    }

    rbacBoundaryPass = Boolean(
      allowsTrainerDashboard &&
      allowsMyMembers &&
      allowsMyMembersSubpaths &&
      noBroadAdminAccess &&
      noForbiddenRouteAllowed
    );
  }
}

reportInvariant(
  rbacBoundaryPass,
  "Invariant 4: hasRoleAccess enforces strict RBAC boundary for trainer with explicit forbidden route deny checks",
  "Trainer RBAC must allow exact /admin/trainer and /admin/my-members namespace and reject all other admin routes"
);

// ==========================================
// Invariant 5: Trainer Sidebar Isolation & Forbidden Routes
// ==========================================
let sidebarPass = false;

const isTrainerDecl = layoutContent.includes("isTrainer = admin?.role === 'trainer'") ||
  layoutContent.includes('isTrainer = admin?.role === "trainer"') ||
  layoutContent.includes("role === 'trainer'");

if (isTrainerDecl) {
  const trainerNavBlockMatch = layoutContent.match(/isTrainer\s*&&\s*\([\s\S]*?\)/);
  const trainerNavBlock = trainerNavBlockMatch ? trainerNavBlockMatch[0] : layoutContent;

  const hasDashboardLink = trainerNavBlock.includes('to="/admin/trainer"') || trainerNavBlock.includes("to='/admin/trainer'");
  const hasMyMembersLink = trainerNavBlock.includes('to="/admin/my-members"') || trainerNavBlock.includes("to='/admin/my-members'");
  
  // Negative check against forbidden admin links inside trainer nav block
  const forbiddenNavLinks = [
    '/admin/settings',
    '/admin/members',
    '/admin/trainers',
    '/admin/trainer-accounts',
    '/admin/homepage',
    '/admin/media',
    '/admin/events',
    '/admin/branches',
    '/admin/reception'
  ];

  let noForbiddenLinksInTrainerNav = !trainerNavBlock.match(/to=['"]\/admin['"]\s/); // exact /admin
  if (noForbiddenLinksInTrainerNav) {
    for (const fnl of forbiddenNavLinks) {
      if (trainerNavBlock.includes(`to="${fnl}"`) || trainerNavBlock.includes(`to='${fnl}'`)) {
        noForbiddenLinksInTrainerNav = false;
        break;
      }
    }
  }

  sidebarPass = Boolean(hasDashboardLink && hasMyMembersLink && noForbiddenLinksInTrainerNav);
}

reportInvariant(
  sidebarPass,
  "Invariant 5: Trainer sidebar navigation contains exact links for Dashboard (/admin/trainer) and My Members with zero forbidden links",
  "AdminLayout.tsx must render /admin/trainer and /admin/my-members NavLinks and exclude all forbidden admin navigation links"
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
// Invariant 7: Field-Level Runtime Validator Semantics (types.ts)
// ==========================================
function extractForLoopBlock(source, arrayName) {
  const regex = new RegExp(`for\\s*\\([^)]*\\bof\\s+(?:att\\.|d\\.)?${arrayName}\\s*\\)\\s*\\{`);
  const match = source.match(regex);
  if (!match || match.index === undefined) return null;
  return extractBalancedBlock(source, match.index);
}

const isTrainerDashboardDataBlock = extractFunctionBlock(typesContent, 'isTrainerDashboardData');
let runtimeValidatorPass = false;

if (isTrainerDashboardDataBlock) {
  // Field-level trainer checks:
  const trainerIdNumberCheck = /typeof\s+trainer\.id\s*!==\s*['"]number['"]/.test(isTrainerDashboardDataBlock);
  const trainerIdIntegerCheck = /!Number\.isInteger\(\s*trainer\.id\s*\)/.test(isTrainerDashboardDataBlock);
  const trainerIdPositiveCheck = /trainer\.id\s*<=\s*0/.test(isTrainerDashboardDataBlock);
  const trainerNameCheck = /typeof\s+trainer\.display_name\s*!==\s*['"]string['"]/.test(isTrainerDashboardDataBlock);
  const trainerValid = trainerIdNumberCheck && trainerIdIntegerCheck && trainerIdPositiveCheck && trainerNameCheck;

  // Field-level members checks:
  const checkMemberField = (fieldName) => {
    const typeofCheck = new RegExp(`typeof\\s+members\\.${fieldName}\\s*!==\\s*['"]number['"]`).test(isTrainerDashboardDataBlock);
    const integerCheck = new RegExp(`!Number\\.isInteger\\(\\s*members\\.${fieldName}\\s*\\)`).test(isTrainerDashboardDataBlock);
    const boundsCheck = new RegExp(`members\\.${fieldName}\\s*<\\s*0`).test(isTrainerDashboardDataBlock);
    return typeofCheck && integerCheck && boundsCheck;
  };
  const membersTotalValid = checkMemberField('total');
  const membersActiveValid = checkMemberField('active');
  const membersInactiveValid = checkMemberField('inactive');
  const membersValid = membersTotalValid && membersActiveValid && membersInactiveValid;

  // Field-level training_programs checks:
  const checkTpField = (fieldName) => {
    const typeofCheck = new RegExp(`typeof\\s+tp\\.${fieldName}\\s*!==\\s*['"]number['"]`).test(isTrainerDashboardDataBlock);
    const integerCheck = new RegExp(`!Number\\.isInteger\\(\\s*tp\\.${fieldName}\\s*\\)`).test(isTrainerDashboardDataBlock);
    const boundsCheck = new RegExp(`tp\\.${fieldName}\\s*<\\s*0`).test(isTrainerDashboardDataBlock);
    return typeofCheck && integerCheck && boundsCheck;
  };
  const tpTotalValid = checkTpField('total');
  const tpDraftValid = checkTpField('draft');
  const tpActiveValid = checkTpField('active');
  const tpArchivedValid = checkTpField('archived');
  const tpValid = tpTotalValid && tpDraftValid && tpActiveValid && tpArchivedValid;

  // Field-level recent_members checks in its isolated loop block:
  const recentLoop = extractForLoopBlock(isTrainerDashboardDataBlock, 'recent_members');
  const recentArrayCheck = /Array\.isArray\(\s*(?:d\.)?recent_members\s*\)/.test(isTrainerDashboardDataBlock);
  const recentObjCheck = /typeof\s+\w+\s*!==\s*['"]object['"]|!\w+/.test(recentLoop || '');
  const recentIdNumberCheck = /typeof\s+\w+\.id\s*!==\s*['"]number['"]/.test(recentLoop || '');
  const recentIdIntegerCheck = /!Number\.isInteger\(\s*\w+\.id\s*\)/.test(recentLoop || '');
  const recentIdPositiveCheck = /\w+\.id\s*<=\s*0/.test(recentLoop || '');
  const recentUuidCheck = /typeof\s+\w+\.uuid\s*!==\s*['"]string['"]/.test(recentLoop || '');
  const recentFirstNameCheck = /typeof\s+\w+\.first_name\s*!==\s*['"]string['"]/.test(recentLoop || '');
  const recentLastNameCheck = /typeof\s+\w+\.last_name\s*!==\s*['"]string['"]/.test(recentLoop || '');
  const recentUpdatedAtCheck = /typeof\s+\w+\.updated_at\s*!==\s*['"]string['"]/.test(recentLoop || '');
  const recentStatusActiveCheck = /\w+\.status\s*!==\s*['"]active['"]/.test(recentLoop || '');
  const recentStatusInactiveCheck = /\w+\.status\s*!==\s*['"]inactive['"]/.test(recentLoop || '');
  const recentStatusValid = recentStatusActiveCheck && recentStatusInactiveCheck;

  const recentValid = Boolean(
    recentLoop && recentArrayCheck && recentObjCheck &&
    recentIdNumberCheck && recentIdIntegerCheck && recentIdPositiveCheck &&
    recentUuidCheck && recentFirstNameCheck && recentLastNameCheck && recentUpdatedAtCheck &&
    recentStatusValid
  );

  // Field-level attention checks:
  const attentionObjCheck = /!(?:d\.)?attention\s*\|\|\s*typeof\s+(?:d\.)?attention\s*!==\s*['"]object['"]/.test(isTrainerDashboardDataBlock);
  
  // 1. members_without_active_program isolated loop
  const noProgLoop = extractForLoopBlock(isTrainerDashboardDataBlock, 'members_without_active_program');
  const attNoProgArrayCheck = /Array\.isArray\(\s*(?:att\.)?members_without_active_program\s*\)/.test(isTrainerDashboardDataBlock);
  const noProgObjCheck = /typeof\s+\w+\s*!==\s*['"]object['"]|!\w+/.test(noProgLoop || '');
  const noProgIdNum = /typeof\s+\w+\.id\s*!==\s*['"]number['"]/.test(noProgLoop || '');
  const noProgIdInt = /!Number\.isInteger\(\s*\w+\.id\s*\)/.test(noProgLoop || '');
  const noProgIdPos = /\w+\.id\s*<=\s*0/.test(noProgLoop || '');
  const noProgUuid = /typeof\s+\w+\.uuid\s*!==\s*['"]string['"]/.test(noProgLoop || '');
  const noProgFirst = /typeof\s+\w+\.first_name\s*!==\s*['"]string['"]/.test(noProgLoop || '');
  const noProgLast = /typeof\s+\w+\.last_name\s*!==\s*['"]string['"]/.test(noProgLoop || '');
  const noProgUpdated = /typeof\s+\w+\.updated_at\s*!==\s*['"]string['"]/.test(noProgLoop || '');
  const attNoProgValid = Boolean(
    noProgLoop && attNoProgArrayCheck && noProgObjCheck &&
    noProgIdNum && noProgIdInt && noProgIdPos &&
    noProgUuid && noProgFirst && noProgLast && noProgUpdated
  );

  // 2. draft_programs isolated loop
  const draftProgLoop = extractForLoopBlock(isTrainerDashboardDataBlock, 'draft_programs');
  const attDraftProgArrayCheck = /Array\.isArray\(\s*(?:att\.)?draft_programs\s*\)/.test(isTrainerDashboardDataBlock);
  const draftProgObjCheck = /typeof\s+\w+\s*!==\s*['"]object['"]|!\w+/.test(draftProgLoop || '');
  const draftProgIdNum = /typeof\s+\w+\.id\s*!==\s*['"]number['"]/.test(draftProgLoop || '');
  const draftProgIdInt = /!Number\.isInteger\(\s*\w+\.id\s*\)/.test(draftProgLoop || '');
  const draftProgIdPos = /\w+\.id\s*<=\s*0/.test(draftProgLoop || '');
  const draftProgUuid = /typeof\s+\w+\.uuid\s*!==\s*['"]string['"]/.test(draftProgLoop || '');
  const draftProgMemberIdNum = /typeof\s+\w+\.member_id\s*!==\s*['"]number['"]/.test(draftProgLoop || '');
  const draftProgMemberIdInt = /!Number\.isInteger\(\s*\w+\.member_id\s*\)/.test(draftProgLoop || '');
  const draftProgMemberIdPos = /\w+\.member_id\s*<=\s*0/.test(draftProgLoop || '');
  const draftProgMemberFirst = /typeof\s+\w+\.member_first_name\s*!==\s*['"]string['"]/.test(draftProgLoop || '');
  const draftProgMemberLast = /typeof\s+\w+\.member_last_name\s*!==\s*['"]string['"]/.test(draftProgLoop || '');
  const draftProgTitle = /typeof\s+\w+\.title\s*!==\s*['"]string['"]/.test(draftProgLoop || '');
  const draftProgUpdated = /typeof\s+\w+\.updated_at\s*!==\s*['"]string['"]/.test(draftProgLoop || '');
  const attDraftProgValid = Boolean(
    draftProgLoop && attDraftProgArrayCheck && draftProgObjCheck &&
    draftProgIdNum && draftProgIdInt && draftProgIdPos && draftProgUuid &&
    draftProgMemberIdNum && draftProgMemberIdInt && draftProgMemberIdPos &&
    draftProgMemberFirst && draftProgMemberLast && draftProgTitle && draftProgUpdated
  );

  // 3. expired_active_memberships isolated loop
  const expMemLoop = extractForLoopBlock(isTrainerDashboardDataBlock, 'expired_active_memberships');
  const attExpMemArrayCheck = /Array\.isArray\(\s*(?:att\.)?expired_active_memberships\s*\)/.test(isTrainerDashboardDataBlock);
  const expMemObjCheck = /typeof\s+\w+\s*!==\s*['"]object['"]|!\w+/.test(expMemLoop || '');
  const expMemIdNum = /typeof\s+\w+\.id\s*!==\s*['"]number['"]/.test(expMemLoop || '');
  const expMemIdInt = /!Number\.isInteger\(\s*\w+\.id\s*\)/.test(expMemLoop || '');
  const expMemIdPos = /\w+\.id\s*<=\s*0/.test(expMemLoop || '');
  const expMemUuid = /typeof\s+\w+\.uuid\s*!==\s*['"]string['"]/.test(expMemLoop || '');
  const expMemFirst = /typeof\s+\w+\.first_name\s*!==\s*['"]string['"]/.test(expMemLoop || '');
  const expMemLast = /typeof\s+\w+\.last_name\s*!==\s*['"]string['"]/.test(expMemLoop || '');
  const expMemEndDate = /typeof\s+\w+\.membership_end_date\s*!==\s*['"]string['"]/.test(expMemLoop || '');
  const attExpMemValid = Boolean(
    expMemLoop && attExpMemArrayCheck && expMemObjCheck &&
    expMemIdNum && expMemIdInt && expMemIdPos &&
    expMemUuid && expMemFirst && expMemLast && expMemEndDate
  );

  // 4. expired_active_programs isolated loop
  const expProgLoop = extractForLoopBlock(isTrainerDashboardDataBlock, 'expired_active_programs');
  const attExpProgArrayCheck = /Array\.isArray\(\s*(?:att\.)?expired_active_programs\s*\)/.test(isTrainerDashboardDataBlock);
  const expProgObjCheck = /typeof\s+\w+\s*!==\s*['"]object['"]|!\w+/.test(expProgLoop || '');
  const expProgIdNum = /typeof\s+\w+\.id\s*!==\s*['"]number['"]/.test(expProgLoop || '');
  const expProgIdInt = /!Number\.isInteger\(\s*\w+\.id\s*\)/.test(expProgLoop || '');
  const expProgIdPos = /\w+\.id\s*<=\s*0/.test(expProgLoop || '');
  const expProgUuid = /typeof\s+\w+\.uuid\s*!==\s*['"]string['"]/.test(expProgLoop || '');
  const expProgMemberIdNum = /typeof\s+\w+\.member_id\s*!==\s*['"]number['"]/.test(expProgLoop || '');
  const expProgMemberIdInt = /!Number\.isInteger\(\s*\w+\.member_id\s*\)/.test(expProgLoop || '');
  const expProgMemberIdPos = /\w+\.member_id\s*<=\s*0/.test(expProgLoop || '');
  const expProgMemberFirst = /typeof\s+\w+\.member_first_name\s*!==\s*['"]string['"]/.test(expProgLoop || '');
  const expProgMemberLast = /typeof\s+\w+\.member_last_name\s*!==\s*['"]string['"]/.test(expProgLoop || '');
  const expProgTitle = /typeof\s+\w+\.title\s*!==\s*['"]string['"]/.test(expProgLoop || '');
  const expProgEndDate = /typeof\s+\w+\.end_date\s*!==\s*['"]string['"]/.test(expProgLoop || '');
  const attExpProgValid = Boolean(
    expProgLoop && attExpProgArrayCheck && expProgObjCheck &&
    expProgIdNum && expProgIdInt && expProgIdPos && expProgUuid &&
    expProgMemberIdNum && expProgMemberIdInt && expProgMemberIdPos &&
    expProgMemberFirst && expProgMemberLast && expProgTitle && expProgEndDate
  );

  const attentionValid = attentionObjCheck && attNoProgValid && attDraftProgValid && attExpMemValid && attExpProgValid;

  runtimeValidatorPass = Boolean(trainerValid && membersValid && tpValid && recentValid && attentionValid);
}

reportInvariant(
  runtimeValidatorPass,
  "Invariant 7: Field-level runtime validator semantics strictly verified for trainer, members, training_programs, recent_members, and attention categories",
  "types.ts must implement individual field-level type, integer, non-negative, string, and enum checks including all 4 attention sub-collections"
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
// Invariant 10: Lifecycle-Isolated Stale / Unmount Safety Guards (Success, Catch, Finally, Cleanup)
// ==========================================
const useEffectBlocks = extractUseEffectBlocks(dashboardContent);
const dashboardEffect = useEffectBlocks[0] || null;
let staleGuardPass = false;

if (dashboardEffect && fetchFunctionBlock) {
  const hasSubscribedDecl = dashboardEffect.includes('let isSubscribed = true');
  
  // Cleanup guard
  const hasCleanup = /return\s*\(\s*\)\s*=>\s*\{\s*isSubscribed\s*=\s*false;\s*\}/.test(dashboardEffect) ||
    /return\s*\(\s*\)\s*=>\s*\(\s*isSubscribed\s*=\s*false\s*\)/.test(dashboardEffect) ||
    /isSubscribed\s*=\s*false/.test(dashboardEffect);

  const { tryBlock, catchBlock, finallyBlock } = extractTryCatchFinally(fetchFunctionBlock);

  // Success path stale guard: must be located inside tryBlock right after await apiClient.get
  const successStaleGuard = Boolean(
    tryBlock &&
    /await\s+apiClient\.get[\s\S]*?if\s*\(\s*!isSubscribed\s*\)\s*return\s*;/.test(tryBlock)
  );

  // Catch path stale guard: must be located inside catchBlock before error handling
  const catchStaleGuard = Boolean(
    catchBlock &&
    /if\s*\(\s*!isSubscribed\s*\)\s*return\s*;/.test(catchBlock)
  );

  // Finally block stale guard: must wrap setLoading(false) in if (isSubscribed)
  const finallyStaleGuard = Boolean(
    finallyBlock &&
    /if\s*\(\s*isSubscribed\s*\)\s*\{\s*setLoading\s*\(\s*false\s*\)\s*;\s*\}/.test(finallyBlock)
  );

  staleGuardPass = Boolean(hasSubscribedDecl && hasCleanup && successStaleGuard && catchStaleGuard && finallyStaleGuard);
}

reportInvariant(
  staleGuardPass,
  "Invariant 10: Lifecycle-isolated stale-response guards enforced separately across Success, Catch, Finally, and Cleanup",
  "useEffect and fetchDashboard must isolate stale guards for success await, catch entry, finally state update, and cleanup reset"
);

// ==========================================
// Invariant 11: Effect-Local Deterministic Retry Mechanism
// ==========================================
let retryPass = false;

const hasRefreshKeyState = /const\s*\[\s*refreshKey\s*,\s*setRefreshKey\s*\]\s*=\s*useState\s*\(\s*0\s*\)/.test(dashboardContent);
const effectLocallyBound = /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\s*refreshKey\s*\]\s*\)/.test(dashboardContent);
const hasRetryIncrement = /setRefreshKey\s*\(\s*\(?\s*k\s*\)?\s*=>\s*k\s*\+\s*1\s*\)/.test(dashboardContent);
const noFakeRetry = !dashboardContent.includes('setRefreshKey(refreshKey)');

retryPass = Boolean(hasRefreshKeyState && effectLocallyBound && hasRetryIncrement && noFakeRetry);

reportInvariant(
  retryPass,
  "Invariant 11: Effect-local deterministic retry mechanism triggers re-fetch via refreshKey state increment",
  "Retry handler must functionally increment refreshKey which is locally bound as the sole dependency of the fetch useEffect"
);

// ==========================================
// Invariant 12: Strict Error Cohesion & Generic Controlled Fallbacks
// ==========================================
let errorCohesionPass = false;

// Check that NO raw or template error message is passed to setError
const rawMessageLeaks = dashboardContent.match(/setError\s*\(\s*(?:err|error)\.message/g) || [];
const templateMessageLeaks = dashboardContent.match(/setError\s*\(\s*`[^`]*\$\{(?:err|error)(?:\.message)?\}/g) || [];
const stringCastLeaks = dashboardContent.match(/setError\s*\(\s*String\s*\(\s*(?:err|error)/g) || [];

const noRawMessageLeaks = (rawMessageLeaks.length === 0 && templateMessageLeaks.length === 0 && stringCastLeaks.length === 0);

const { catchBlock: dashboardCatchBlock } = extractTryCatchFinally(dashboardContent);

if (dashboardCatchBlock) {
  const hasProfileNotLinkedCheck = /err\.code\s*===?\s*['"]TRAINER_PROFILE_NOT_LINKED['"]/.test(dashboardCatchBlock);
  const hasForbiddenCheck = /err\.status\s*===?\s*403\s*\|\|\s*err\.code\s*===?\s*['"]FORBIDDEN['"]/.test(dashboardCatchBlock) ||
    (dashboardCatchBlock.includes('err.status === 403') || dashboardCatchBlock.includes("err.code === 'FORBIDDEN'"));
  const hasValidationCheck = /err\.status\s*===?\s*422\s*\|\|\s*err\.code\s*===?\s*['"]VALIDATION_ERROR['"]/.test(dashboardCatchBlock) ||
    (dashboardCatchBlock.includes('err.status === 422') || dashboardCatchBlock.includes("err.code === 'VALIDATION_ERROR'"));
  const hasNotFoundCheck = /err\.status\s*===?\s*404\s*\|\|\s*err\.code\s*===?\s*['"]NOT_FOUND['"]/.test(dashboardCatchBlock) ||
    (dashboardCatchBlock.includes('err.status === 404') || dashboardCatchBlock.includes("err.code === 'NOT_FOUND'"));

  // Controlled generic fallbacks
  const hasApiErrorFallback = /else\s*\{\s*setError\s*\(\s*['"][^'"]+['"]\s*\)\s*;\s*\}/.test(dashboardCatchBlock);
  const hasGenericErrorFallback = /else\s+if\s*\(\s*(?:err|error)\s+instanceof\s+Error\s*\)\s*\{\s*setError\s*\(\s*['"][^'"]+['"]\s*\)\s*;\s*\}/.test(dashboardCatchBlock);
  const hasUnknownErrorFallback = /else\s*\{\s*setError\s*\(\s*['"][^'"]+['"]\s*\)\s*;\s*\}\s*$/.test(dashboardCatchBlock.trim()) ||
    /setError\s*\(\s*['"][^'"]+['"]\s*\)\s*;/.test(dashboardCatchBlock);

  errorCohesionPass = Boolean(
    noRawMessageLeaks &&
    hasProfileNotLinkedCheck &&
    hasForbiddenCheck &&
    hasValidationCheck &&
    hasNotFoundCheck &&
    hasApiErrorFallback &&
    hasGenericErrorFallback &&
    hasUnknownErrorFallback
  );
}

reportInvariant(
  errorCohesionPass,
  "Invariant 12: Error cohesion prohibits raw err.message/casts and enforces explicit ApiError code/status mappings and safe fallbacks",
  "setError must not receive raw err.message or string casts; ApiError, generic Error, and unknown errors must use controlled messages"
);

// ==========================================
// Invariant 13: Privacy & Negative Field Leak Invariant (Broadened)
// ==========================================
const forbiddenPropertyAccessRegex = /\.(phone|email|emergency_contact(_name|_phone)?|notes?|password(_hash)?)\b/i;
const leaksForbiddenProperty = forbiddenPropertyAccessRegex.test(dashboardContent);

reportInvariant(
  !leaksForbiddenProperty,
  "Invariant 13: Privacy invariant confirms zero access or rendering of phone, email, emergency contacts, notes, or credentials in TrainerDashboard",
  "TrainerDashboard component must not reference or render personal contact data, notes, or credentials"
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
// Invariant 15: Operational Attention Presentation & Category Rendering (Category-Local)
// ==========================================
function extractJsxConditionBlock(source, flagName) {
  const regex = new RegExp(`{\\s*${flagName}\\s*&&\\s*\\(`);
  const match = source.match(regex);
  if (!match || match.index === undefined) return null;
  const openParenIndex = source.indexOf('(', match.index);
  if (openParenIndex === -1) return null;

  let depth = 0;
  let closeIndex = -1;
  for (let i = openParenIndex; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      depth--;
      if (depth === 0) {
        closeIndex = i;
        break;
      }
    }
  }
  if (closeIndex === -1) return null;
  return source.substring(match.index, closeIndex + 1);
}

const rendersAttentionSection = dashboardContent.includes('Dikkat Gerektirenler');

// 1. members_without_active_program container
const noProgContainer = extractJsxConditionBlock(dashboardContent, 'hasNoProgramMembers');
const rendersNoProgramCategory = Boolean(
  noProgContainer &&
  noProgContainer.includes('Aktif Programı Olmayan Üyeler') &&
  noProgContainer.includes('data.attention.members_without_active_program.map')
);

// 2. draft_programs container
const draftContainer = extractJsxConditionBlock(dashboardContent, 'hasDraftPrograms');
const rendersDraftCategory = Boolean(
  draftContainer &&
  draftContainer.includes('Taslak Programlar') &&
  draftContainer.includes('data.attention.draft_programs.map')
);

// 3. expired_active_memberships container
const expMemContainer = extractJsxConditionBlock(dashboardContent, 'hasExpiredMemberships');
const rendersExpMemCategory = Boolean(
  expMemContainer &&
  expMemContainer.includes('Süresi Bitmiş Aktif Üyelikler') &&
  expMemContainer.includes('data.attention.expired_active_memberships.map')
);

// 4. expired_active_programs container
const expProgContainer = extractJsxConditionBlock(dashboardContent, 'hasExpiredPrograms');
const rendersExpProgCategory = Boolean(
  expProgContainer &&
  expProgContainer.includes('Süresi Bitmiş Aktif Programlar') &&
  expProgContainer.includes('data.attention.expired_active_programs.map')
);

const attentionPresentationPass = Boolean(
  rendersAttentionSection &&
  rendersNoProgramCategory &&
  rendersDraftCategory &&
  rendersExpMemCategory &&
  rendersExpProgCategory
);

reportInvariant(
  attentionPresentationPass,
  "Invariant 15: Operational Attention presentation renders all 4 distinct operational categories under Dikkat Gerektirenler with category-local containers and headings",
  "TrainerDashboard must present Aktif Programı Olmayan Üyeler, Taslak Programlar, Süresi Bitmiş Aktif Üyelikler, and Süresi Bitmiş Aktif Programlar in dedicated category containers"
);

// ==========================================
// Invariant 16: Operational Attention Empty State, Exact Boolean Semantics & Count Truthfulness
// ==========================================
// 1. Exact boolean condition flags
const hasNoProgramDef = /const\s+hasNoProgramMembers\s*=\s*data\.attention\.members_without_active_program\.length\s*>\s*0\s*;/.test(dashboardContent);
const hasDraftDef = /const\s+hasDraftPrograms\s*=\s*data\.attention\.draft_programs\.length\s*>\s*0\s*;/.test(dashboardContent);
const hasExpMemDef = /const\s+hasExpiredMemberships\s*=\s*data\.attention\.expired_active_memberships\.length\s*>\s*0\s*;/.test(dashboardContent);
const hasExpProgDef = /const\s+hasExpiredPrograms\s*=\s*data\.attention\.expired_active_programs\.length\s*>\s*0\s*;/.test(dashboardContent);
const booleanFlagsValid = hasNoProgramDef && hasDraftDef && hasExpMemDef && hasExpProgDef;

// 2. Exact hasAnyAttention definition with all 4 boolean tokens in OR expression
const hasAnyAttentionMatch = dashboardContent.match(/const\s+hasAnyAttention\s*=\s*([^;]+);/);
let hasAnyAttentionExact = false;
if (hasAnyAttentionMatch) {
  const expr = hasAnyAttentionMatch[1].trim();
  const tokens = expr.split(/\s*\|\|\s*/).map(t => t.trim());
  const requiredTokens = ['hasNoProgramMembers', 'hasDraftPrograms', 'hasExpiredMemberships', 'hasExpiredPrograms'];
  hasAnyAttentionExact = (tokens.length === 4 && requiredTokens.every(t => tokens.includes(t)));
}

// 3. Global empty state: !hasAnyAttention condition directly guards the empty message
const hasGlobalEmptyMessage = dashboardContent.includes('Mevcut operasyon kurallarına göre dikkat gerektiren kayıt bulunmuyor.');
const hasEmptyStateCondition = (
  /!\s*hasAnyAttention\s*\?[\s\S]*?Mevcut operasyon kurallarına göre dikkat gerektiren kayıt bulunmuyor/i.test(dashboardContent) ||
  /!\s*hasAnyAttention\s*&&[\s\S]*?Mevcut operasyon kurallarına göre dikkat gerektiren kayıt bulunmuyor/i.test(dashboardContent)
);
const emptyStateValid = hasGlobalEmptyMessage && hasEmptyStateCondition;

// 4. Strict count truthfulness: .length on attention arrays must only be used in the 4 boolean flag declarations (no aggregate/UI count)
const allAttentionLengthMatches = [...dashboardContent.matchAll(/(?:data\.attention\.|attention\.)?(members_without_active_program|draft_programs|expired_active_memberships|expired_active_programs)\.length\b/g)];
const exactFourLengthUsages = (allAttentionLengthMatches.length === 4) && booleanFlagsValid;

const attentionEmptyStatePass = Boolean(
  booleanFlagsValid &&
  hasAnyAttentionExact &&
  emptyStateValid &&
  exactFourLengthUsages
);

reportInvariant(
  attentionEmptyStatePass,
  "Invariant 16: Controlled empty state governed by exact 4-term hasAnyAttention semantics and strict suppression of aggregate counts from fixed LIMIT lists",
  "TrainerDashboard must evaluate hasAnyAttention across all 4 boolean flags, render the global empty message on !hasAnyAttention, and prohibit aggregate .length representations"
);

// ==========================================
// Invariant 17: Attention Navigation Isolation to Trainer Workspace (Category-Local)
// ==========================================
function extractMapBlock(source, arrayName) {
  const regex = new RegExp(`(?:data\\.attention\\.|attention\\.)?${arrayName}\\.map\\s*\\(`);
  const match = source.match(regex);
  if (!match || match.index === undefined) return null;
  const openParenIndex = source.indexOf('(', match.index);
  if (openParenIndex === -1) return null;

  let depth = 0;
  let closeIndex = -1;
  for (let i = openParenIndex; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      depth--;
      if (depth === 0) {
        closeIndex = i;
        break;
      }
    }
  }
  if (closeIndex === -1) return null;
  return source.substring(match.index, closeIndex + 1);
}

// 1. members_without_active_program map block
const noProgMapBlock = extractMapBlock(dashboardContent, 'members_without_active_program');
const hasNoProgTarget = Boolean(
  noProgMapBlock &&
  /to=\{`\/admin\/my-members\/\$\{\w+\.id\}\/training-programs`\}/.test(noProgMapBlock) &&
  !/to=\{`\/admin\/my-members\/\$\{\w+\.id\}`\}/.test(noProgMapBlock) &&
  !noProgMapBlock.includes('/admin/members/')
);

// 2. draft_programs map block
const draftMapBlock = extractMapBlock(dashboardContent, 'draft_programs');
const hasDraftProgTarget = Boolean(
  draftMapBlock &&
  /to=\{`\/admin\/my-members\/\$\{\w+\.member_id\}\/training-programs\/\$\{\w+\.id\}`\}/.test(draftMapBlock) &&
  !draftMapBlock.includes('/admin/members/')
);

// 3. expired_active_memberships map block (must NOT have /training-programs suffix)
const expMemMapBlock = extractMapBlock(dashboardContent, 'expired_active_memberships');
const hasExpMemTarget = Boolean(
  expMemMapBlock &&
  /to=\{`\/admin\/my-members\/\$\{\w+\.id\}`\}/.test(expMemMapBlock) &&
  !expMemMapBlock.includes('/training-programs') &&
  !expMemMapBlock.includes('/admin/members/')
);

// 4. expired_active_programs map block
const expProgMapBlock = extractMapBlock(dashboardContent, 'expired_active_programs');
const hasExpProgTarget = Boolean(
  expProgMapBlock &&
  /to=\{`\/admin\/my-members\/\$\{\w+\.member_id\}\/training-programs\/\$\{\w+\.id\}`\}/.test(expProgMapBlock) &&
  !expProgMapBlock.includes('/admin/members/')
);

// Negative isolation in attention section: no admin links or API calls
const attentionHeaderIndex = dashboardContent.indexOf('Dikkat Gerektirenler');
const attentionSectionSnippet = attentionHeaderIndex !== -1 ? dashboardContent.slice(attentionHeaderIndex, attentionHeaderIndex + 8000) : '';
const forbiddenAttentionTargets = ['/admin/settings', '/admin/trainers', '/admin/reception', '/admin/media', '/api/'];
let noForbiddenAttentionLinks = !/(?:to=['"`]|href=['"`])\/admin\/members(?!\/my-members)/.test(attentionSectionSnippet);

if (noForbiddenAttentionLinks) {
  for (const fl of forbiddenAttentionTargets) {
    if (attentionSectionSnippet.includes(`"${fl}"`) || attentionSectionSnippet.includes(`'${fl}'`) || attentionSectionSnippet.includes(`\`${fl}`)) {
      noForbiddenAttentionLinks = false;
      break;
    }
  }
}

const attentionNavPass = Boolean(
  hasNoProgTarget &&
  hasDraftProgTarget &&
  hasExpMemTarget &&
  hasExpProgTarget &&
  noForbiddenAttentionLinks
);

reportInvariant(
  attentionNavPass,
  "Invariant 17: Attention actionable items link exclusively into verified category-local /admin/my-members workspace subpaths with zero forbidden leaks",
  "Attention actions must strictly route to /admin/my-members/:id/training-programs, /admin/my-members/:memberId/training-programs/:id, and exact /admin/my-members/:id"
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
