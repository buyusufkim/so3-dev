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

function extractBraceBlock(text, startKeyword) {
  const startIndex = text.indexOf(startKeyword);
  if (startIndex === -1) return null;
  const braceStartIndex = text.indexOf('{', startIndex);
  if (braceStartIndex === -1) return null;
  let depth = 1;
  let i = braceStartIndex + 1;
  let insideString = false;
  let quoteChar = null;

  while (i < text.length && depth > 0) {
    const char = text[i];
    if (!insideString) {
      if (char === "'" || char === '"' || char === '`') {
        insideString = true;
        quoteChar = char;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
      } else if (char === '/' && i + 1 < text.length) {
        if (text[i + 1] === '/') {
          while (i < text.length && text[i] !== '\n') i++;
          continue;
        } else if (text[i + 1] === '*') {
          while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
          i++;
          continue;
        }
      }
    } else {
      if (char === '\\') {
        i++;
      } else if (char === quoteChar) {
        insideString = false;
      }
    }
    i++;
  }
  if (depth !== 0) return null;
  return {
    content: text.substring(startIndex, i),
    body: text.substring(braceStartIndex, i),
    startIndex,
    endIndex: i
  };
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

console.log("=== Reception Frontend Cross-Contract Guard ===");
console.log("Starting deterministic verification...\n");

// =============================================================================
// Section 30: Critical Negative Self-Tests
// =============================================================================
console.log("--- Running Verifier Negative Self-Tests ---");

// Helper predicates for self-tests and verifier assertions
function checkRenewalPayloadPredicate(payloadCode) {
  const forbidden = ["status", "membership_start_date", "membership_end_date", "payment", "price", "amount", "notes"];
  for (const f of forbidden) {
    const regex = new RegExp(`\\b${f}\\s*:`);
    if (regex.test(payloadCode)) return false;
  }
  const hasStart = /\bnew_start_date\s*:/.test(payloadCode);
  const hasEnd = /\bnew_end_date\s*:/.test(payloadCode);
  return hasStart && hasEnd;
}

function checkUnlockOrderingPredicate(code) {
  const fetchIdx = code.indexOf("await fetchOccupancy()");
  const unlockIdx = code.indexOf("mutationLockRef.current = false");
  if (fetchIdx === -1 || unlockIdx === -1) return false;
  return fetchIdx < unlockIdx;
}

function checkRenewalReconciliationPredicate(code) {
  const hasReconcile = code.includes("reconcileSearch");
  const hasOccupancy = code.includes("fetchOccupancy");
  return hasReconcile && !hasOccupancy;
}

function checkSameDayAllowedPredicate(code) {
  if (code.includes("trimmedEnd <= trimmedStart") || code.includes("end <= start")) return false;
  return code.includes("trimmedEnd < trimmedStart") || code.includes("end < start");
}

function checkApiSurfacePredicate(apiList) {
  const forbidden = ["/api/admin/members", "/api/trainer/", "/api/admin/member-measurements", "/api/admin/member-progress-notes"];
  for (const api of apiList) {
    if (!api.startsWith("/api/reception/")) return false;
    if (forbidden.some(f => api.startsWith(f))) return false;
  }
  return true;
}

// Self-Test A: Renewal payload self-test
reportInvariant(
  checkRenewalPayloadPredicate("{ new_start_date: trimmedStart, new_end_date: trimmedEnd }") === true,
  "Self-Test A1: Renewal payload predicate passes canonical payload"
);
reportInvariant(
  checkRenewalPayloadPredicate("{ new_start_date: trimmedStart, new_end_date: trimmedEnd, status: 'active' }") === false,
  "Self-Test A2: Renewal payload predicate rejects extra status field"
);
reportInvariant(
  checkRenewalPayloadPredicate("{ new_start_date: trimmedStart, new_end_date: trimmedEnd, price: 1000 }") === false,
  "Self-Test A3: Renewal payload predicate rejects extra payment field"
);

// Self-Test B: Unlock ordering self-test
reportInvariant(
  checkUnlockOrderingPredicate("await fetchOccupancy(); setActiveMutation(null); mutationLockRef.current = false;") === true,
  "Self-Test B1: Unlock ordering predicate passes fetchOccupancy before unlock"
);
reportInvariant(
  checkUnlockOrderingPredicate("mutationLockRef.current = false; await fetchOccupancy();") === false,
  "Self-Test B2: Unlock ordering predicate rejects premature unlock before refresh"
);

// Self-Test C: Renewal reconciliation self-test
reportInvariant(
  checkRenewalReconciliationPredicate("await reconcileSearch(); setRenewalModalMember(null);") === true,
  "Self-Test C1: Renewal reconciliation predicate passes reconcileSearch without fetchOccupancy"
);
reportInvariant(
  checkRenewalReconciliationPredicate("await reconcileSearch(); await fetchOccupancy();") === false,
  "Self-Test C2: Renewal reconciliation predicate rejects fetchOccupancy in renewal handler"
);

// Self-Test D: Same-day date self-test
reportInvariant(
  checkSameDayAllowedPredicate("if (trimmedEnd < trimmedStart) { setRenewalFormError('error'); }") === true,
  "Self-Test D1: Same-day date predicate passes strictly end < start"
);
reportInvariant(
  checkSameDayAllowedPredicate("if (trimmedEnd <= trimmedStart) { setRenewalFormError('error'); }") === false,
  "Self-Test D2: Same-day date predicate rejects end <= start (allows same-day)"
);

// Self-Test E: Forbidden API self-test
reportInvariant(
  checkApiSurfacePredicate(["/api/reception/occupancy", "/api/reception/members?q=abc", "/api/reception/members/1/renew"]) === true,
  "Self-Test E1: API surface predicate passes reception-only endpoints"
);
reportInvariant(
  checkApiSurfacePredicate(["/api/reception/occupancy", "/api/admin/members"]) === false,
  "Self-Test E2: API surface predicate rejects /api/admin/members"
);

console.log("--- Negative Self-Tests Completed ---\n");

// =============================================================================
// Section 2: Required Source Files
// =============================================================================
const requiredFiles = [
  'src/routes/index.tsx',
  'src/admin/auth/roles.ts',
  'src/admin/pages/reception/ReceptionDashboard.tsx',
  'src/admin/pages/reception/types.ts',
  'api/controllers/ReceptionMemberController.php',
  'api/index.php',
  'package.json'
];

for (const f of requiredFiles) {
  const full = path.join(rootDir, f);
  reportInvariant(fs.existsSync(full), `Required source file exists: ${f}`, `File not found: ${full}`);
}

const routesSource = readSource('src/routes/index.tsx') || '';
const rolesSource = readSource('src/admin/auth/roles.ts') || '';
const dashSource = readSource('src/admin/pages/reception/ReceptionDashboard.tsx') || '';
const typesSource = readSource('src/admin/pages/reception/types.ts') || '';
const controllerSource = readSource('api/controllers/ReceptionMemberController.php') || '';
const apiIndexSource = readSource('api/index.php') || '';
const pkgSource = readSource('package.json') || '';

// =============================================================================
// Section 31: Fail-Closed Block Extractions
// =============================================================================
const receptionRouteBlock = extractObjectBlock(routesSource, 'path: "reception"');
reportInvariant(receptionRouteBlock !== null, "Fail-Closed: Extracted receptionRoute block from routes/index.tsx");

const getRoleStartRouteBlock = extractBraceBlock(rolesSource, "const getRoleStartRoute =");
reportInvariant(getRoleStartRouteBlock !== null, "Fail-Closed: Extracted getRoleStartRoute block from roles.ts");

const hasRoleAccessBlock = extractBraceBlock(rolesSource, "const hasRoleAccess =");
reportInvariant(hasRoleAccessBlock !== null, "Fail-Closed: Extracted hasRoleAccess block from roles.ts");

const validateOccupancyResponseBlock = extractBraceBlock(dashSource, "function validateOccupancyResponse");
reportInvariant(validateOccupancyResponseBlock !== null, "Fail-Closed: Extracted validateOccupancyResponse block from ReceptionDashboard.tsx");

const fetchOccupancyBlock = extractBraceBlock(dashSource, "const fetchOccupancy = useCallback");
reportInvariant(fetchOccupancyBlock !== null, "Fail-Closed: Extracted fetchOccupancy block from ReceptionDashboard.tsx");

const validateSearchResponseBlock = extractBraceBlock(dashSource, "function validateSearchResponse");
reportInvariant(validateSearchResponseBlock !== null, "Fail-Closed: Extracted validateSearchResponse block from ReceptionDashboard.tsx");

const performSearchBlock = extractBraceBlock(dashSource, "const performSearch = useCallback");
reportInvariant(performSearchBlock !== null, "Fail-Closed: Extracted performSearch block from ReceptionDashboard.tsx");

const searchEffectIdx = dashSource.indexOf("searchGenerationRef.current;");
const searchEffectKeywordIdx = searchEffectIdx !== -1 ? dashSource.lastIndexOf("useEffect", searchEffectIdx) : -1;
const searchEffectBlock = searchEffectKeywordIdx !== -1 ? extractBraceBlock(dashSource.substring(searchEffectKeywordIdx), "useEffect") : null;
reportInvariant(searchEffectBlock !== null, "Fail-Closed: Extracted search useEffect block from ReceptionDashboard.tsx");

const handleCheckInBlock = extractBraceBlock(dashSource, "const handleCheckIn = useCallback");
reportInvariant(handleCheckInBlock !== null, "Fail-Closed: Extracted handleCheckIn block from ReceptionDashboard.tsx");

const validateCheckInResponseBlock = extractBraceBlock(dashSource, "function validateCheckInResponse");
reportInvariant(validateCheckInResponseBlock !== null, "Fail-Closed: Extracted validateCheckInResponse block from ReceptionDashboard.tsx");

const handleCheckOutBlock = extractBraceBlock(dashSource, "const handleCheckOut = useCallback");
reportInvariant(handleCheckOutBlock !== null, "Fail-Closed: Extracted handleCheckOut block from ReceptionDashboard.tsx");

const validateCheckOutResponseBlock = extractBraceBlock(dashSource, "function validateCheckOutResponse");
reportInvariant(validateCheckOutResponseBlock !== null, "Fail-Closed: Extracted validateCheckOutResponse block from ReceptionDashboard.tsx");

const handleRenewSubmitBlock = extractBraceBlock(dashSource, "const handleRenewSubmit = useCallback");
reportInvariant(handleRenewSubmitBlock !== null, "Fail-Closed: Extracted handleRenewSubmit block from ReceptionDashboard.tsx");

const validateRenewalResponseBlock = extractBraceBlock(dashSource, "function validateRenewalResponse");
reportInvariant(validateRenewalResponseBlock !== null, "Fail-Closed: Extracted validateRenewalResponse block from ReceptionDashboard.tsx");

const reconcileSearchBlock = extractBraceBlock(dashSource, "const reconcileSearch = useCallback");
reportInvariant(reconcileSearchBlock !== null, "Fail-Closed: Extracted reconcileSearch block from ReceptionDashboard.tsx");

const isValidDateStringBlock = extractBraceBlock(dashSource, "function isValidDateString");
reportInvariant(isValidDateStringBlock !== null, "Fail-Closed: Extracted isValidDateString block from ReceptionDashboard.tsx");

// If any critical block failed to extract, stop and fail-closed
if (
  !receptionRouteBlock ||
  !getRoleStartRouteBlock ||
  !hasRoleAccessBlock ||
  !validateOccupancyResponseBlock ||
  !fetchOccupancyBlock ||
  !validateSearchResponseBlock ||
  !performSearchBlock ||
  !searchEffectBlock ||
  !handleCheckInBlock ||
  !validateCheckInResponseBlock ||
  !handleCheckOutBlock ||
  !validateCheckOutResponseBlock ||
  !handleRenewSubmitBlock ||
  !validateRenewalResponseBlock ||
  !reconcileSearchBlock ||
  !isValidDateStringBlock
) {
  console.error("\n❌ FATAL: One or more critical code blocks could not be extracted. Verifier exiting with failure.");
  process.exit(1);
}

// =============================================================================
// Section 3: Reception Route Wiring
// =============================================================================
const lazyImportRegex = /const\s+ReceptionDashboard\s*=\s*lazy\s*\(\s*\(\)\s*=>\s*import\s*\(\s*["']\.\.\/admin\/pages\/reception\/ReceptionDashboard["']\s*\)\.then\s*\(\s*m\s*=>\s*\(\s*\{\s*default:\s*m\.ReceptionDashboard\s*\}\s*\)\s*\)\s*\);/;
reportInvariant(lazyImportRegex.test(routesSource), "Reception route wiring: ReceptionDashboard lazy imported with exact path");

reportInvariant(
  receptionRouteBlock.includes('path: "reception"') &&
  receptionRouteBlock.includes('<ReceptionDashboard />'),
  "Reception route wiring: Child route 'reception' mounts <ReceptionDashboard />"
);

reportInvariant(
  !routesSource.includes("ReceptionPlaceholder"),
  "Reception route wiring: ReceptionPlaceholder is not used anywhere in routes"
);

// Ensure the route is placed inside admin children hierarchy
const adminRouteIndex = routesSource.indexOf('path: "/admin"');
const receptionRouteIndex = routesSource.indexOf('path: "reception"');
reportInvariant(
  adminRouteIndex !== -1 && receptionRouteIndex > adminRouteIndex,
  "Reception route wiring: Route is a child under /admin"
);

// =============================================================================
// Section 4: Reception Role Boundary
// =============================================================================
const startRouteBody = getRoleStartRouteBlock.body;
reportInvariant(
  /case\s+['"]reception['"]\s*:\s*return\s+['"]\/admin\/reception['"]\s*;/.test(startRouteBody),
  "Role boundary: Reception start route is exactly '/admin/reception'"
);

const hasRoleAccessBody = hasRoleAccessBlock.body;
const receptionBranch = extractBraceBlock(hasRoleAccessBody, "if (role === 'reception')") || extractBraceBlock(hasRoleAccessBody, 'if (role === "reception")');
reportInvariant(receptionBranch !== null, "Role boundary: Extracted reception access check in hasRoleAccess");

if (receptionBranch) {
  const repContent = receptionBranch.content;
  reportInvariant(
    repContent.includes("'/admin/reception'") || repContent.includes('"/admin/reception"'),
    "Role boundary: Reception access restricted to /admin/reception namespace"
  );
  reportInvariant(
    !repContent.includes("'/admin/members'") && !repContent.includes("'/admin/trainer'"),
    "Role boundary: Reception does not get broad admin/trainer route access"
  );
}

// Trainer & editor do not have reception access
const trainerBranch = extractBraceBlock(hasRoleAccessBody, "if (role === 'trainer')") || extractBraceBlock(hasRoleAccessBody, 'if (role === "trainer")');
if (trainerBranch) {
  reportInvariant(
    !trainerBranch.content.includes("/admin/reception"),
    "Role boundary: Trainer cannot access /admin/reception"
  );
}
const editorBranch = extractBraceBlock(hasRoleAccessBody, "if (role === 'editor')") || extractBraceBlock(hasRoleAccessBody, 'if (role === "editor")');
if (editorBranch) {
  reportInvariant(
    !editorBranch.content.includes("/admin/reception"),
    "Role boundary: Editor cannot access /admin/reception"
  );
}

// Admin and super_admin retain broad access
reportInvariant(
  /if\s*\(\s*role\s*===\s*['"]super_admin['"]\s*\|\|\s*role\s*===\s*['"]admin['"]\s*\)\s*return\s+true\s*;/.test(hasRoleAccessBody),
  "Role boundary: super_admin and admin retain broad access"
);

// =============================================================================
// Section 5: Reception-Only API Surface
// =============================================================================
const endpointMatches = [...dashSource.matchAll(/['"`](\/api\/[^`"']+)['"`]/g)].map(m => m[1]);
const expectedEndpoints = new Set([
  '/api/reception/occupancy',
  '/api/reception/members?q=${encodedQ}',
  '/api/reception/members/${memberId}/check-in',
  '/api/reception/members/${memberId}/check-out',
  '/api/reception/members/${memberId}/renew'
]);

for (const ep of endpointMatches) {
  reportInvariant(
    expectedEndpoints.has(ep),
    `API Surface: Endpoint is in allowed reception set: ${ep}`,
    `Unexpected endpoint called in ReceptionDashboard.tsx: ${ep}`
  );
}

const forbiddenEndpoints = [
  '/api/admin/members',
  '/api/trainer/',
  '/api/admin/member-measurements',
  '/api/admin/member-progress-notes'
];
for (const fb of forbiddenEndpoints) {
  reportInvariant(
    !dashSource.includes(fb),
    `API Surface: Forbidden sensitive endpoint not present: ${fb}`
  );
}

// =============================================================================
// Section 6: Read/Search Contract
// =============================================================================
const performSearchContent = performSearchBlock.content;
reportInvariant(
  performSearchContent.includes("encodeURIComponent(q)"),
  "Search contract: Query encoded with encodeURIComponent"
);
reportInvariant(
  performSearchContent.includes("`/api/reception/members?q=${encodedQ}`"),
  "Search contract: Calls exact /api/reception/members?q=${encodedQ}"
);
reportInvariant(
  performSearchContent.includes("validateSearchResponse(response)"),
  "Search contract: Response validated before writing to state"
);
reportInvariant(
  performSearchContent.includes("searchGenerationRef.current !== generation"),
  "Search contract: Stale generation responses cannot write to state"
);

const searchEffectContent = searchEffectBlock.content;
reportInvariant(
  searchEffectContent.includes("searchQuery.trim()"),
  "Search contract: Search input trimmed"
);
reportInvariant(
  searchEffectContent.includes("trimmed.length === 0 || trimmed.length === 1") || searchEffectContent.includes("trimmed.length < 2"),
  "Search contract: Queries < 2 chars do not trigger network request"
);
reportInvariant(
  searchEffectContent.includes("trimmed.length > 80"),
  "Search contract: Queries > 80 chars do not trigger network request"
);
reportInvariant(
  searchEffectContent.includes("350"),
  "Search contract: 350ms debounce implemented"
);
reportInvariant(
  searchEffectContent.includes("searchAbortRef.current.abort()"),
  "Search contract: Query changes abort in-flight search request"
);
reportInvariant(
  searchEffectContent.includes("clearTimeout(searchTimeoutRef.current)"),
  "Search contract: Debounce timeout cleared on cleanup/re-run"
);

// =============================================================================
// Section 7: Search Runtime Response Validator
// =============================================================================
const valSearchContent = validateSearchResponseBlock.content;
reportInvariant(valSearchContent.includes("Array.isArray(data.items)"), "Search validator: Validates items array");
reportInvariant(
  valSearchContent.includes("typeof item.id !== 'number' || item.id <= 0 || !Number.isInteger(item.id)"),
  "Search validator: Validates positive integer member id"
);
reportInvariant(
  valSearchContent.includes("typeof item.uuid !== 'string' || item.uuid === ''"),
  "Search validator: Validates non-empty uuid"
);
reportInvariant(
  valSearchContent.includes("typeof item.first_name !== 'string'") &&
  valSearchContent.includes("typeof item.last_name !== 'string'"),
  "Search validator: Validates string first_name and last_name"
);
reportInvariant(
  valSearchContent.includes("typeof item.phone !== 'string'"),
  "Search validator: Validates string phone"
);
reportInvariant(
  valSearchContent.includes("item.status !== 'active' && item.status !== 'inactive'"),
  "Search validator: Validates status is strictly active|inactive"
);
reportInvariant(
  valSearchContent.includes("item.membership_start_date !== null && typeof item.membership_start_date !== 'string'") &&
  valSearchContent.includes("item.membership_end_date !== null && typeof item.membership_end_date !== 'string'"),
  "Search validator: Validates membership dates as string or null"
);

// =============================================================================
// Section 8: Occupancy Read Contract
// =============================================================================
const fetchOccContent = fetchOccupancyBlock.content;
reportInvariant(
  fetchOccContent.includes("apiClient.get('/api/reception/occupancy'") ||
  fetchOccContent.includes('apiClient.get("/api/reception/occupancy"'),
  "Occupancy read: GET /api/reception/occupancy"
);
reportInvariant(
  fetchOccContent.includes("validateOccupancyResponse(response)"),
  "Occupancy read: Response validated via validateOccupancyResponse before state write"
);
reportInvariant(
  fetchOccContent.includes("setOccupancy(validated)"),
  "Occupancy read: State set only with validated data"
);

const valOccContent = validateOccupancyResponseBlock.content;
reportInvariant(
  valOccContent.includes("typeof data.current_count !== 'number' || data.current_count < 0 || !Number.isInteger(data.current_count)"),
  "Occupancy validator: Validates current_count is non-negative integer"
);
reportInvariant(
  valOccContent.includes("typeof data.stale_count !== 'number' || data.stale_count < 0 || !Number.isInteger(data.stale_count)"),
  "Occupancy validator: Validates stale_count is non-negative integer"
);
reportInvariant(
  valOccContent.includes("data.stale_count > data.current_count"),
  "Occupancy validator: Enforces stale_count cannot exceed current_count"
);
reportInvariant(
  valOccContent.includes("Array.isArray(data.items)"),
  "Occupancy validator: Validates items array"
);
reportInvariant(
  valOccContent.includes("typeof visit.id !== 'number' || visit.id <= 0 || !Number.isInteger(visit.id)"),
  "Occupancy validator: Validates visit positive integer id"
);
reportInvariant(
  valOccContent.includes("typeof visit.uuid !== 'string' || visit.uuid === ''"),
  "Occupancy validator: Validates non-empty visit uuid"
);
reportInvariant(
  valOccContent.includes("typeof visit.checked_in_at !== 'string' || visit.checked_in_at === ''"),
  "Occupancy validator: Validates non-empty checked_in_at"
);
reportInvariant(
  valOccContent.includes("typeof member.id !== 'number' || member.id <= 0 || !Number.isInteger(member.id)"),
  "Occupancy validator: Validates member positive integer id"
);
reportInvariant(
  valOccContent.includes("typeof member.uuid !== 'string' || member.uuid === ''"),
  "Occupancy validator: Validates non-empty member uuid"
);
reportInvariant(
  valOccContent.includes("typeof member.first_name !== 'string'") &&
  valOccContent.includes("typeof member.last_name !== 'string'"),
  "Occupancy validator: Validates member string names"
);
reportInvariant(
  valOccContent.includes("typeof item.is_stale !== 'boolean'"),
  "Occupancy validator: Validates is_stale boolean"
);

// =============================================================================
// Section 9: Occupancy Business Semantics
// =============================================================================
reportInvariant(
  !dashSource.includes("occupancy.items.filter(item => item.member.status") &&
  !dashSource.includes("occupancy.items.filter(item => item.member.membership_end_date") &&
  !dashSource.includes("occupancy.items.filter(item => item.visit.checked_in_at.startsWith"),
  "Occupancy semantics: Occupancy items not filtered by status, expiry date, or current day"
);

reportInvariant(
  dashSource.includes("Önceki günden açık giriş"),
  "Occupancy semantics: Exact stale warning label present: 'Önceki günden açık giriş'"
);

reportInvariant(
  !dashSource.includes("autoCheckout") && !dashSource.includes("setTimeout(handleCheckOut"),
  "Occupancy semantics: No auto checkout logic present"
);

// =============================================================================
// Section 10: Check-In Exact Frontend Contract
// =============================================================================
const checkInContent = handleCheckInBlock.content;
reportInvariant(
  checkInContent.includes("`/api/reception/members/${memberId}/check-in`"),
  "Check-in contract: POST to `/api/reception/members/${memberId}/check-in`"
);
reportInvariant(
  /apiClient\.post\s*\(\s*`\/api\/reception\/members\/\$\{memberId\}\/check-in`\s*,\s*\{\s*\}\s*,/.test(checkInContent),
  "Check-in contract: Request body is exact empty object {}"
);
reportInvariant(
  checkInContent.includes("validateCheckInResponse(rawResponse)"),
  "Check-in contract: Response validated using validateCheckInResponse"
);
reportInvariant(
  checkInContent.includes("validated.visit.member_id !== memberId"),
  "Check-in contract: Validates visit.member_id strictly matches requested memberId"
);

const valCheckInContent = validateCheckInResponseBlock.content;
reportInvariant(
  valCheckInContent.includes("typeof visit.id !== 'number' || visit.id <= 0 || !Number.isInteger(visit.id)"),
  "Check-in validator: Validates visit.id positive integer"
);
reportInvariant(
  valCheckInContent.includes("typeof visit.uuid !== 'string' || visit.uuid === ''"),
  "Check-in validator: Validates visit.uuid non-empty string"
);
reportInvariant(
  valCheckInContent.includes("typeof visit.member_id !== 'number' || visit.member_id <= 0 || !Number.isInteger(visit.member_id)"),
  "Check-in validator: Validates visit.member_id positive integer"
);
reportInvariant(
  valCheckInContent.includes("typeof visit.checked_in_at !== 'string' || visit.checked_in_at === ''"),
  "Check-in validator: Validates visit.checked_in_at non-empty string"
);

// =============================================================================
// Section 11: Check-In Controlled Errors
// =============================================================================
reportInvariant(checkInContent.includes("MEMBER_INACTIVE"), "Check-in errors: Handles MEMBER_INACTIVE");
reportInvariant(checkInContent.includes("MEMBERSHIP_EXPIRED"), "Check-in errors: Handles MEMBERSHIP_EXPIRED");
reportInvariant(checkInContent.includes("MEMBER_ALREADY_CHECKED_IN"), "Check-in errors: Handles MEMBER_ALREADY_CHECKED_IN");
reportInvariant(checkInContent.includes("err.status === 404"), "Check-in errors: Handles 404 Not Found");
reportInvariant(checkInContent.includes("err.status === 403"), "Check-in errors: Handles 403 Forbidden");
reportInvariant(checkInContent.includes("err.status === 422"), "Check-in errors: Handles 422 Unprocessable");
reportInvariant(!checkInContent.includes("message: err.message"), "Check-in errors: Raw err.message is never rendered");

// In check-in conflict, fetchOccupancy is triggered
const alreadyCheckedInIndex = checkInContent.indexOf("MEMBER_ALREADY_CHECKED_IN");
const refreshAfterConflict = checkInContent.indexOf("await fetchOccupancy()", alreadyCheckedInIndex);
reportInvariant(
  alreadyCheckedInIndex !== -1 && refreshAfterConflict !== -1,
  "Check-in errors: MEMBER_ALREADY_CHECKED_IN conflict triggers occupancy reconciliation"
);

// =============================================================================
// Section 12: Check-Out Exact Frontend Contract
// =============================================================================
const checkOutContent = handleCheckOutBlock.content;
reportInvariant(
  checkOutContent.includes("`/api/reception/members/${memberId}/check-out`"),
  "Check-out contract: POST to `/api/reception/members/${memberId}/check-out`"
);
reportInvariant(
  /apiClient\.post\s*\(\s*`\/api\/reception\/members\/\$\{memberId\}\/check-out`\s*,\s*\{\s*\}\s*,/.test(checkOutContent),
  "Check-out contract: Request body is exact empty object {}"
);
reportInvariant(
  checkOutContent.includes("validateCheckOutResponse(rawResponse)"),
  "Check-out contract: Response validated using validateCheckOutResponse"
);
reportInvariant(
  checkOutContent.includes("validated.visit.member_id !== memberId"),
  "Check-out contract: Validates visit.member_id matches requested memberId"
);

const valCheckOutContent = validateCheckOutResponseBlock.content;
reportInvariant(
  valCheckOutContent.includes("typeof visit.id !== 'number' || visit.id <= 0 || !Number.isInteger(visit.id)"),
  "Check-out validator: Validates visit.id positive integer"
);
reportInvariant(
  valCheckOutContent.includes("typeof visit.uuid !== 'string' || visit.uuid === ''"),
  "Check-out validator: Validates visit.uuid non-empty string"
);
reportInvariant(
  valCheckOutContent.includes("typeof visit.member_id !== 'number' || visit.member_id <= 0 || !Number.isInteger(visit.member_id)"),
  "Check-out validator: Validates visit.member_id positive integer"
);
reportInvariant(
  valCheckOutContent.includes("typeof visit.checked_in_at !== 'string' || visit.checked_in_at === ''"),
  "Check-out validator: Validates visit.checked_in_at non-empty string"
);
reportInvariant(
  valCheckOutContent.includes("typeof visit.checked_out_at !== 'string' || visit.checked_out_at === ''"),
  "Check-out validator: Validates visit.checked_out_at non-empty string"
);

// =============================================================================
// Section 13: Checkout Eligibility Semantics
// =============================================================================
reportInvariant(
  !checkOutContent.includes("status === 'active'") && !checkOutContent.includes("membership_end_date"),
  "Checkout eligibility: Checkout logic independent of member active status and membership expiry"
);

// In search results, hasOpenVisit renders checkout button regardless of inactive status
reportInvariant(
  dashSource.includes("hasOpenVisit ? (") &&
  dashSource.includes("onClick={() => handleCheckOut(member.id)}"),
  "Checkout eligibility: Open visit members in search results show checkout button"
);

// Occupancy items list checkout button is not disabled by is_stale
reportInvariant(
  !dashSource.includes("disabled={item.is_stale") && !dashSource.includes("disabled={activeMutation !== null || item.is_stale"),
  "Checkout eligibility: is_stale open visits can be checked out"
);

// =============================================================================
// Section 14: Checkout Controlled Errors
// =============================================================================
reportInvariant(checkOutContent.includes("MEMBER_NOT_CHECKED_IN"), "Checkout errors: Handles MEMBER_NOT_CHECKED_IN");
reportInvariant(checkOutContent.includes("err.status === 404"), "Checkout errors: Handles 404 Not Found");
reportInvariant(checkOutContent.includes("err.status === 403"), "Checkout errors: Handles 403 Forbidden");
reportInvariant(checkOutContent.includes("err.status === 422"), "Checkout errors: Handles 422 Unprocessable");
reportInvariant(!checkOutContent.includes("message: err.message"), "Checkout errors: Raw err.message is never rendered");

const notCheckedInIndex = checkOutContent.indexOf("MEMBER_NOT_CHECKED_IN");
const refreshAfterCheckoutConflict = checkOutContent.indexOf("await fetchOccupancy()", notCheckedInIndex);
reportInvariant(
  notCheckedInIndex !== -1 && refreshAfterCheckoutConflict !== -1,
  "Checkout errors: MEMBER_NOT_CHECKED_IN conflict triggers occupancy reconciliation"
);

// =============================================================================
// Section 15: Shared Synchronous Mutation Lock
// =============================================================================
reportInvariant(
  dashSource.includes("const mutationLockRef = useRef(false);"),
  "Mutation lock: mutationLockRef defined with initial false"
);
reportInvariant(
  dashSource.includes("const [activeMutation, setActiveMutation] = useState<"),
  "Mutation lock: activeMutation state defined"
);
reportInvariant(
  /kind:\s*['"]check-in['"]\s*\|\s*['"]check-out['"]\s*\|\s*['"]renew['"]/.test(dashSource),
  "Mutation lock: activeMutation.kind is union of check-in | check-out | renew"
);
reportInvariant(
  dashSource.includes("const mutationAbortRef = useRef<AbortController | null>(null);"),
  "Mutation lock: mutationAbortRef defined"
);
reportInvariant(
  dashSource.includes("const isMountedRef = useRef(true);"),
  "Mutation lock: isMountedRef defined"
);

// Check all 3 handlers start with synchronous lock check
function verifySynchronousLockAcquisition(content, handlerName) {
  const normalized = content.replace(/\s+/g, ' ');
  return normalized.includes("if (mutationLockRef.current) return; mutationLockRef.current = true;");
}

reportInvariant(
  verifySynchronousLockAcquisition(checkInContent, "handleCheckIn"),
  "Mutation lock: handleCheckIn acquires synchronous mutationLockRef before any async operation"
);
reportInvariant(
  verifySynchronousLockAcquisition(checkOutContent, "handleCheckOut"),
  "Mutation lock: handleCheckOut acquires synchronous mutationLockRef before any async operation"
);
reportInvariant(
  verifySynchronousLockAcquisition(handleRenewSubmitBlock.content, "handleRenewSubmit"),
  "Mutation lock: handleRenewSubmit acquires synchronous mutationLockRef before any async operation"
);

// =============================================================================
// Section 16: Check-In/Out Reconciliation-Before-Unlock
// =============================================================================
function verifyReconciliationBeforeUnlock(handlerContent, handlerName) {
  // Find success block
  const successIdx = handlerContent.lastIndexOf("await fetchOccupancy()");
  const unlockIdx = handlerContent.lastIndexOf("mutationLockRef.current = false");
  return successIdx !== -1 && unlockIdx !== -1 && successIdx < unlockIdx;
}

reportInvariant(
  verifyReconciliationBeforeUnlock(checkInContent, "handleCheckIn"),
  "Reconciliation order: handleCheckIn awaits fetchOccupancy before releasing mutationLockRef"
);
reportInvariant(
  verifyReconciliationBeforeUnlock(checkOutContent, "handleCheckOut"),
  "Reconciliation order: handleCheckOut awaits fetchOccupancy before releasing mutationLockRef"
);

// =============================================================================
// Section 17: Renewal Exact POST Contract
// =============================================================================
const renewContent = handleRenewSubmitBlock.content;
reportInvariant(
  renewContent.includes("`/api/reception/members/${memberId}/renew`"),
  "Renewal contract: Endpoint is `/api/reception/members/${memberId}/renew`"
);

const renewalPostMatch = dashSource.match(/apiClient\.post\s*\(\s*`\/api\/reception\/members\/\$\{memberId\}\/renew`\s*,\s*(\{[\s\S]*?\})\s*,/);
reportInvariant(
  renewalPostMatch !== null,
  "Renewal contract: Extracted renewal request body payload"
);

if (renewalPostMatch) {
  const payloadCode = renewalPostMatch[1];
  reportInvariant(
    checkRenewalPayloadPredicate(payloadCode),
    "Renewal contract: Payload contains strictly new_start_date and new_end_date with no extra fields",
    `Payload: ${payloadCode}`
  );
}

// =============================================================================
// Section 18: Renewal Runtime Response Contract
// =============================================================================
const valRenewContent = validateRenewalResponseBlock.content;
reportInvariant(
  valRenewContent.includes("typeof renewal.id !== 'number' || renewal.id <= 0 || !Number.isInteger(renewal.id)"),
  "Renewal validator: Validates renewal.id positive integer"
);
reportInvariant(
  valRenewContent.includes("typeof renewal.uuid !== 'string' || renewal.uuid === ''"),
  "Renewal validator: Validates renewal.uuid non-empty string"
);
reportInvariant(
  valRenewContent.includes("typeof renewal.member_id !== 'number' || renewal.member_id <= 0 || !Number.isInteger(renewal.member_id)"),
  "Renewal validator: Validates renewal.member_id positive integer"
);
reportInvariant(
  valRenewContent.includes("renewal.previous_start_date !== null && typeof renewal.previous_start_date !== 'string'") &&
  valRenewContent.includes("renewal.previous_end_date !== null && typeof renewal.previous_end_date !== 'string'"),
  "Renewal validator: Validates previous dates string or null"
);
reportInvariant(
  valRenewContent.includes("typeof renewal.new_start_date !== 'string' || renewal.new_start_date === ''") &&
  valRenewContent.includes("typeof renewal.new_end_date !== 'string' || renewal.new_end_date === ''"),
  "Renewal validator: Validates new dates non-empty strings"
);
reportInvariant(
  valRenewContent.includes("typeof renewal.created_at !== 'string' || renewal.created_at === ''"),
  "Renewal validator: Validates created_at non-empty string"
);

reportInvariant(
  renewContent.includes("validated.renewal.member_id !== memberId"),
  "Renewal contract: Response member_id matches requested memberId"
);
reportInvariant(
  renewContent.includes("validated.renewal.new_start_date !== trimmedStart"),
  "Renewal contract: Response new_start_date matches submitted start date"
);
reportInvariant(
  renewContent.includes("validated.renewal.new_end_date !== trimmedEnd"),
  "Renewal contract: Response new_end_date matches submitted end date"
);

// =============================================================================
// Section 19: Renewal Local Date Semantics
// =============================================================================
const dateValidatorContent = isValidDateStringBlock.content;
reportInvariant(
  dateValidatorContent.includes("/^\\d{4}-\\d{2}-\\d{2}$/"),
  "Date semantics: Strict YYYY-MM-DD format enforced"
);
reportInvariant(
  dateValidatorContent.includes("d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day"),
  "Date semantics: Calendar date validity verified via Date instance"
);

reportInvariant(
  renewContent.includes("!trimmedStart || !trimmedEnd"),
  "Date semantics: Both start and end dates required"
);
reportInvariant(
  renewContent.includes("trimmedEnd < trimmedStart"),
  "Date semantics: End date strictly before start is rejected"
);
reportInvariant(
  !renewContent.includes("trimmedEnd <= trimmedStart"),
  "Date semantics: Same-day renewals allowed (not end <= start)"
);

const forbiddenDateMath = ["+1 month", "+30 days", "P1M", "DateInterval", "setMonth(", "setDate(", "30 * 24"];
for (const fdm of forbiddenDateMath) {
  reportInvariant(
    !renewContent.includes(fdm),
    `Date semantics: No synthetic duration arithmetic: ${fdm}`
  );
}

// =============================================================================
// Section 20: Renewal Eligibility Semantics
// =============================================================================
reportInvariant(
  dashSource.includes("onClick={() => handleOpenRenewalModal(member)}"),
  "Renewal eligibility: 'Üyeliği Yenile' action button is rendered for search results"
);
reportInvariant(
  !dashSource.includes("member.status === 'active' && <button") &&
  !dashSource.includes("member.status === 'active' && \n") &&
  !dashSource.includes("!hasOpenVisit && <button"),
  "Renewal eligibility: Renewal button is not conditionally rendered on active status or open visit"
);
reportInvariant(
  dashSource.includes("Bu işlem yalnız üyelik tarihlerini günceller; üye durumunu otomatik olarak aktif hale getirmez."),
  "Renewal eligibility: Required neutral disclaimer text is present"
);

// =============================================================================
// Section 21: Renewal Reconciliation Boundary
// =============================================================================
reportInvariant(
  renewContent.includes("await reconcileSearch()"),
  "Renewal reconciliation: Calls await reconcileSearch() on success and malformed-success"
);
reportInvariant(
  !renewContent.includes("fetchOccupancy"),
  "Renewal reconciliation: fetchOccupancy() is strictly FORBIDDEN in handleRenewSubmit"
);

// Order in renewal: await reconcileSearch -> modal close -> activeMutation null -> lock release
const reconcileIdx = renewContent.indexOf("await reconcileSearch()");
const modalCloseIdx = renewContent.indexOf("setRenewalModalMember(null)", reconcileIdx);
const activeMutationNullIdx = renewContent.indexOf("setActiveMutation(null)", modalCloseIdx);
const unlockRenewIdx = renewContent.indexOf("mutationLockRef.current = false", activeMutationNullIdx);

reportInvariant(
  reconcileIdx !== -1 && modalCloseIdx !== -1 && activeMutationNullIdx !== -1 && unlockRenewIdx !== -1 &&
  reconcileIdx < modalCloseIdx && modalCloseIdx < activeMutationNullIdx && activeMutationNullIdx < unlockRenewIdx,
  "Renewal reconciliation: Strict ordering: reconcileSearch -> modal close/reset -> activeMutation null -> lock release"
);

// =============================================================================
// Section 22: Renewal API Error Behavior
// =============================================================================
reportInvariant(renewContent.includes("err.status === 404"), "Renewal error: Handles 404 safe mapping");
reportInvariant(renewContent.includes("err.status === 403"), "Renewal error: Handles 403 safe mapping");
reportInvariant(renewContent.includes("err.status === 422"), "Renewal error: Handles 422 safe mapping");

// Form values not cleared on error
const catchBlockMatch = renewContent.match(/catch\s*\([^)]*\)\s*\{([\s\S]*?)(?:return|\})/);
if (catchBlockMatch) {
  const catchContent = catchBlockMatch[1];
  reportInvariant(
    !catchContent.includes("setRenewalStartDate(\"\")") &&
    !catchContent.includes("setRenewalEndDate(\"\")"),
    "Renewal error: Form dates preserved on error"
  );
  reportInvariant(
    !catchContent.includes("setRenewalModalMember(null)"),
    "Renewal error: Modal not closed on non-2xx error"
  );
  reportInvariant(
    !catchContent.includes("apiClient.post"),
    "Renewal error: No automatic retry loop"
  );
}

// =============================================================================
// Section 23: NULL-Date Wording
// =============================================================================
reportInvariant(
  dashSource.includes("Bitiş tarihi tanımlı değil"),
  "NULL-date wording: Exact neutral wording 'Bitiş tarihi tanımlı değil' is used"
);
const forbiddenNullDateWording = ["Sınırsız", "Limitsiz", "Ömür boyu", "Unlimited", "Lifetime"];
for (const word of forbiddenNullDateWording) {
  reportInvariant(
    !dashSource.includes(word),
    `NULL-date wording: Forbidden misleading concept not used: ${word}`
  );
}

// =============================================================================
// Section 24: No Status Activation
// =============================================================================
reportInvariant(
  !renewContent.includes("status: 'active'") &&
  !renewContent.includes("status = 'active'") &&
  !renewContent.includes("status: \"active\"") &&
  !renewContent.includes("status = \"active\""),
  "No status activation: Renewal does not mutate member status"
);
reportInvariant(
  !dashSource.includes("Üye aktif edildi") && !dashSource.includes("Üyelik aktifleştirildi"),
  "No status activation: No auto-activation wording in dashboard UI"
);

// =============================================================================
// Section 25: Privacy Boundary
// =============================================================================
const sensitiveFields = [
  "emergency_contact", "blood_group", "measurement",
  "progress_note", "trainer_notes", "password",
  "credentials", "audit_metadata"
];

for (const sf of sensitiveFields) {
  reportInvariant(
    !dashSource.includes(sf) && !typesSource.includes(sf),
    `Privacy boundary: Sensitive concept excluded from reception frontend: ${sf}`
  );
}

reportInvariant(
  !typesSource.includes("email") && !dashSource.includes("member.email"),
  "Privacy boundary: Member email is excluded from reception search & occupancy projection"
);

// =============================================================================
// Section 26: No Payment / Tahsilat
// =============================================================================
const financialTerms = ["payment", "tahsilat", "ödeme", "price", "fiyat", "invoice", "fatura", "debt", "borç", "cash", "kasa"];
for (const ft of financialTerms) {
  const regex = new RegExp(`\\b${ft}\\b`, "i");
  reportInvariant(
    !regex.test(dashSource),
    `No payment: Forbidden financial term not present in reception UI: ${ft}`
  );
}

// =============================================================================
// Section 27: Type Contract Guard
// =============================================================================
const requiredInterfaces = [
  "ReceptionOccupancyResponse",
  "ReceptionMemberSearchItem",
  "ReceptionCheckInResponse",
  "ReceptionCheckOutResponse",
  "ReceptionRenewalResponse"
];

for (const ri of requiredInterfaces) {
  reportInvariant(
    typesSource.includes(`export interface ${ri}`),
    `Type contract: Interface ${ri} exported in types.ts`
  );
}

// Check renewal response exact fields
const renewalInterfaceBlock = extractBraceBlock(typesSource, "export interface ReceptionRenewalResponse");
reportInvariant(renewalInterfaceBlock !== null, "Type contract: Extracted ReceptionRenewalResponse interface");
if (renewalInterfaceBlock) {
  const rContent = renewalInterfaceBlock.content;
  reportInvariant(rContent.includes("id: number;"), "Type contract: Renewal type contains id");
  reportInvariant(rContent.includes("uuid: string;"), "Type contract: Renewal type contains uuid");
  reportInvariant(rContent.includes("member_id: number;"), "Type contract: Renewal type contains member_id");
  reportInvariant(rContent.includes("previous_start_date: string | null;"), "Type contract: Renewal type contains previous_start_date");
  reportInvariant(rContent.includes("previous_end_date: string | null;"), "Type contract: Renewal type contains previous_end_date");
  reportInvariant(rContent.includes("new_start_date: string;"), "Type contract: Renewal type contains new_start_date");
  reportInvariant(rContent.includes("new_end_date: string;"), "Type contract: Renewal type contains new_end_date");
  reportInvariant(rContent.includes("created_at: string;"), "Type contract: Renewal type contains created_at");
}

// =============================================================================
// Section 28: Backend/Frontend Endpoint Parity
// =============================================================================
reportInvariant(
  apiIndexSource.includes("preg_match('#^/api/reception/members$#'"),
  "Endpoint parity: Backend defines GET /api/reception/members"
);
reportInvariant(
  apiIndexSource.includes("preg_match('#^/api/reception/occupancy$#'"),
  "Endpoint parity: Backend defines GET /api/reception/occupancy"
);
reportInvariant(
  apiIndexSource.includes("preg_match('#^/api/reception/members/([1-9]\\d*)/check-in$#'"),
  "Endpoint parity: Backend defines POST /api/reception/members/{id}/check-in"
);
reportInvariant(
  apiIndexSource.includes("preg_match('#^/api/reception/members/([1-9]\\d*)/check-out$#'"),
  "Endpoint parity: Backend defines POST /api/reception/members/{id}/check-out"
);
reportInvariant(
  apiIndexSource.includes("preg_match('#^/api/reception/members/([1-9]\\d*)/renew$#'"),
  "Endpoint parity: Backend defines POST /api/reception/members/{id}/renew"
);

// Role check for reception routes
reportInvariant(
  apiIndexSource.includes("AuthMiddleware::hasRole(['super_admin', 'admin', 'reception'])"),
  "Endpoint parity: Backend reception routes guarded by ['super_admin', 'admin', 'reception']"
);

// =============================================================================
// Section 29: Existing Backend Renewal Guard Remains Present
// =============================================================================
reportInvariant(
  pkgSource.includes('"verify:reception-membership-renewal": "node scripts/verify-reception-membership-renewal.mjs"'),
  "Package.json: Existing verify:reception-membership-renewal script remains present"
);

// =============================================================================
// Final Verdict
// =============================================================================
console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalInvariants}`);
console.log(`Passed: ${passedCount}`);
console.log(`Failed: ${totalInvariants - passedCount}`);
console.log("=======================================================");

if (hasErrors) {
  console.error("\n❌ FAILED: Reception Frontend Cross-Contract Guard detected violations.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All Reception Frontend Cross-Contract invariants verified.");
  process.exit(0);
}
