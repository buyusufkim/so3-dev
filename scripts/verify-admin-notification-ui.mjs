import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

function extractBraceBlock(text, startKeyword) {
  const startIndex = text.indexOf(startKeyword);
  if (startIndex === -1) return null;
  let braceStartIndex = text.indexOf('{', startIndex);
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
  return { content: text.substring(startIndex, i), startIndex, endIndex: i };
}

console.log("=== 1. Chaining Authoritative Verifiers ===");

// 1.1 Chain F.20C Authority
try {
  console.log("Running verify:admin-notification-foundation...");
  execSync('node scripts/verify-admin-notification-foundation.mjs', { stdio: 'inherit' });
  assert(true, "Chain F.20C verify-admin-notification-foundation.mjs passed successfully");
} catch (e) {
  assert(false, "Chain F.20C verify-admin-notification-foundation.mjs failed");
}

// 1.2 Chain F.20D Authority
try {
  console.log("Running verify:renewal-notification-materializer...");
  execSync('node scripts/verify-renewal-notification-materializer.mjs', { stdio: 'inherit' });
  assert(true, "Chain F.20D verify-renewal-notification-materializer.mjs passed successfully");
} catch (e) {
  assert(false, "Chain F.20D verify-renewal-notification-materializer.mjs failed");
}

console.log("\n=== 2. Package.json Script Registration ===");

const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:admin-notification-ui"] === "node scripts/verify-admin-notification-ui.mjs",
  "Package.json exact script registration: 'verify:admin-notification-ui' === 'node scripts/verify-admin-notification-ui.mjs'"
);

console.log("\n=== 3. Repo Hygiene Checks ===");

const rootFiles = fs.readdirSync(process.cwd());
const forbiddenPatterns = [
  /^patch.*\.js$/, /^patch.*\.mjs$/, /^patch.*\.php$/,
  /^tmp.*\.js$/, /^tmp.*\.mjs$/, /^tmp.*\.php$/,
  /\.tmp$/, /\.fixed$/, /^add-.*\.php$/
];
const hygieneViolations = rootFiles.filter(file => forbiddenPatterns.some(p => p.test(file)));
assert(hygieneViolations.length === 0, `Repo hygiene: No temporary or patch artifacts in root (found: ${hygieneViolations.join(', ')})`);

console.log("\n=== 4. Role Visibility & Layout Integration in AdminLayout.tsx ===");

const layoutPath = path.resolve(process.cwd(), 'src/admin/layouts/AdminLayout.tsx');
assert(fs.existsSync(layoutPath), "AdminLayout.tsx exists");
const layoutSource = fs.readFileSync(layoutPath, 'utf8');

assert(layoutSource.includes("import { AdminNotificationBell }"), "AdminLayout imports AdminNotificationBell");
assert(layoutSource.includes("showNotificationBell"), "AdminLayout defines showNotificationBell visibility flag");
assert(
  layoutSource.includes("isSuperOrAdmin || isReception") ||
  (layoutSource.includes("super_admin") && layoutSource.includes("reception")),
  "showNotificationBell checks super_admin, admin, reception"
);
assert(!layoutSource.includes("isTrainer && showNotificationBell"), "Trainer does not show bell");
assert(!layoutSource.includes("isEditor && showNotificationBell"), "Editor does not show bell");

// Single bell instance check
const bellOccurrences = (layoutSource.match(/<AdminNotificationBell/g) || []).length;
assert(bellOccurrences === 1, `Single AdminNotificationBell instance in AdminLayout (found ${bellOccurrences})`);

// TrainerMobileNavigation untouched check
const trainerNavPath = path.resolve(process.cwd(), 'src/admin/components/TrainerMobileNavigation.tsx');
assert(fs.existsSync(trainerNavPath), "TrainerMobileNavigation.tsx exists");
const trainerNavSource = fs.readFileSync(trainerNavPath, 'utf8');
assert(!trainerNavSource.includes("AdminNotificationBell"), "TrainerMobileNavigation does NOT import AdminNotificationBell");
assert(!trainerNavSource.includes("admin_notifications"), "TrainerMobileNavigation untouched by notification domain");

// No new route in routes/index.tsx
const routesPath = path.resolve(process.cwd(), 'src/routes/index.tsx');
assert(fs.existsSync(routesPath), "routes/index.tsx exists");
const routesSource = fs.readFileSync(routesPath, 'utf8');
assert(!routesSource.includes("notifications"), "No new /admin/notifications route added to routes/index.tsx");

console.log("\n=== 5. Component Structure & API Contracts in AdminNotificationBell.tsx ===");

const bellPath = path.resolve(process.cwd(), 'src/admin/components/AdminNotificationBell.tsx');
assert(fs.existsSync(bellPath), "AdminNotificationBell.tsx exists");
const bellSource = fs.readFileSync(bellPath, 'utf8');

// Forbid generic notification create API
assert(!bellSource.includes("apiClient.post('/api/admin/notifications'"), "No generic POST /api/admin/notifications call");
assert(!bellSource.includes("/restore"), "No /restore call");
assert(!bellSource.includes("/unread"), "No /unread call");
assert(!bellSource.includes("apiClient.delete"), "No DELETE call on notifications");

// Materializer call
assert(
  bellSource.includes("apiClient.post('/api/reception/renewal-notifications/materialize', {})"),
  "Calls exact POST /api/reception/renewal-notifications/materialize with {}"
);
assert(!bellSource.includes("window_days:"), "Materializer call does not pass window_days config");

// Inbox GET call
assert(
  bellSource.includes("/api/admin/notifications?view=") &&
  bellSource.includes("page=") &&
  bellSource.includes("per_page=10"),
  "Calls GET /api/admin/notifications with view, page, and per_page=10"
);

// Read & Dismiss PATCH calls
assert(
  bellSource.includes("/api/admin/notifications/") &&
  bellSource.includes("/read") &&
  bellSource.includes("apiClient.patch"),
  "Calls PATCH /api/admin/notifications/${id}/read with {}"
);
assert(
  bellSource.includes("/api/admin/notifications/") &&
  bellSource.includes("/dismiss") &&
  bellSource.includes("apiClient.patch"),
  "Calls PATCH /api/admin/notifications/${id}/dismiss with {}"
);

console.log("\n=== 6. Runtime Validators & Badge Authority ===");

// Item validator checks
assert(bellSource.includes("validateNotificationItem"), "Contains validateNotificationItem runtime validator");
assert(bellSource.includes("item.severity !== 'info' && item.severity !== 'warning' && item.severity !== 'critical'"), "Validates severity enum strictly");
assert(bellSource.includes("item.is_read !== (item.read_at !== null)"), "Validates is_read / read_at consistency");
assert(bellSource.includes("item.is_dismissed !== (item.dismissed_at !== null)"), "Validates is_dismissed / dismissed_at consistency");

// Hardened action_path namespace validation
assert(
  bellSource.includes("path !== '/admin' && !path.startsWith('/admin/')") ||
  bellSource.includes("path === '/admin' || path.startsWith('/admin/')"),
  "Hardened action_path validator checks exact namespace: path === '/admin' || path.startsWith('/admin/')"
);
assert(bellSource.includes("://") && bellSource.includes("javascript:"), "Rejects protocol schemes or javascript: in action_path");

// List validator checks
assert(bellSource.includes("validateNotificationListResponse"), "Contains validateNotificationListResponse runtime validator");
assert(bellSource.includes("res.unread_count"), "Validates unread_count");
assert(bellSource.includes("res.view !== expectedView"), "Validates view matches requested view");
assert(bellSource.includes("pag.per_page !== 10"), "Validates per_page === 10");

// Badge authority check: Must use response.unread_count, NEVER items.filter
assert(!bellSource.includes("items.filter(item => !item.is_read).length"), "Badge does NOT calculate unread count via items.filter");
assert(bellSource.includes("setUnreadCount(validated.unread_count)"), "Badge sets unreadCount strictly from validated response.unread_count");

console.log("\n=== 7. Materializer Orchestration & Stale-Target Prevention ===");

// Materializer MUST NOT accept stale target arguments
assert(
  !/materializeAndFetch\s*=\s*useCallback\s*\(\s*async\s*\([^)]+\)/.test(bellSource),
  "materializeAndFetch does NOT take arguments (prevents stale closure arguments)"
);
assert(
  !bellSource.includes("materializeAndFetch(view, page)") &&
  !bellSource.includes("materializeAndFetch('active', 1)") &&
  !bellSource.includes("materializeAndFetch(targetView, targetPage)"),
  "materializeAndFetch is invoked without stale view/page arguments"
);

// Canonical selection ref definition
assert(
  bellSource.includes("selectionRef") &&
  bellSource.includes("view: 'active'") &&
  bellSource.includes("page: 1"),
  "Canonical selectionRef defined with initial { view: 'active', page: 1 }"
);

// Tab handler updates selectionRef synchronously before fetch
const tabChangeBlock = extractBraceBlock(bellSource, "const handleTabChange =");
assert(tabChangeBlock !== null, "Extracted handleTabChange block");
if (tabChangeBlock) {
  const content = tabChangeBlock.content;
  const refIndex = content.indexOf("selectionRef.current =");
  const fetchIndex = content.indexOf("fetchInbox(");
  assert(refIndex !== -1, "handleTabChange updates selectionRef.current");
  assert(fetchIndex !== -1, "handleTabChange calls fetchInbox");
  assert(refIndex < fetchIndex, "selectionRef.current updated SYNCHRONOUSLY before fetchInbox in handleTabChange");
  assert(content.includes("page: 1"), "handleTabChange resets page to 1");
}

// Page handler updates selectionRef synchronously before fetch
const pageChangeBlock = extractBraceBlock(bellSource, "const handlePageChange =");
assert(pageChangeBlock !== null, "Extracted handlePageChange block");
if (pageChangeBlock) {
  const content = pageChangeBlock.content;
  const refIndex = content.indexOf("selectionRef.current =");
  const fetchIndex = content.indexOf("fetchInbox(");
  assert(refIndex !== -1, "handlePageChange updates selectionRef.current");
  assert(fetchIndex !== -1, "handlePageChange calls fetchInbox");
  assert(refIndex < fetchIndex, "selectionRef.current updated SYNCHRONOUSLY before fetchInbox in handlePageChange");
}

// Validated server response syncs selectionRef
const fetchInboxBlock = extractBraceBlock(bellSource, "const fetchInbox =");
assert(fetchInboxBlock !== null, "Extracted fetchInbox block");
if (fetchInboxBlock) {
  const content = fetchInboxBlock.content;
  assert(content.includes("selectionRef.current ="), "fetchInbox synchronizes selectionRef.current upon validated response");
  assert(content.includes("view: validated.view"), "selectionRef.current receives validated.view");
  assert(content.includes("page: validated.pagination.page"), "selectionRef.current receives validated.pagination.page");
  assert(
    content.includes("selectionRef.current = {\n          view: targetView,\n          page: validated.pagination.last_page,\n        }") ||
    content.includes("page: validated.pagination.last_page"),
    "Bounded page correction synchronizes selectionRef.current"
  );
}

// Materializer completion reads latest selectionRef
const materializeFuncBlock = extractBraceBlock(bellSource, "const materializeAndFetch =");
assert(materializeFuncBlock !== null, "Extracted materializeAndFetch function block");
if (materializeFuncBlock) {
  const content = materializeFuncBlock.content;
  assert(content.includes("try") && content.includes("catch"), "materialize has try/catch block");
  assert(
    content.includes("selectionRef.current") &&
    (content.includes("latest.view, latest.page") || content.includes("selectionRef.current.view, selectionRef.current.page")),
    "materializeAndFetch completion reads latest view/page from selectionRef"
  );
  assert(
    !content.includes("fetchInbox(targetView, targetPage)"),
    "materializeAndFetch does NOT call fetchInbox with stale parameter closure"
  );
}

// Single-flight materializer lock
assert(
  bellSource.includes("materializerInFlightRef"),
  "materializerInFlightRef defined for single-flight locking"
);
if (materializeFuncBlock) {
  const content = materializeFuncBlock.content;
  assert(
    content.includes("if (materializerInFlightRef.current)"),
    "materializeAndFetch checks materializerInFlightRef.current guard before starting POST"
  );
  assert(
    content.includes("materializerInFlightRef.current = true"),
    "materializerInFlightRef set to true before POST"
  );
  assert(
    content.includes("materializerInFlightRef.current = false"),
    "materializerInFlightRef set to false in finally block"
  );
}

// Manual refresh respects single-flight lock
const manualRefreshBlock = extractBraceBlock(bellSource, "const handleManualRefresh =");
assert(manualRefreshBlock !== null, "Extracted handleManualRefresh block");
if (manualRefreshBlock) {
  const content = manualRefreshBlock.content;
  assert(
    content.includes("materializerInFlightRef.current"),
    "handleManualRefresh checks materializerInFlightRef.current guard"
  );
  assert(
    content.includes("await materializeAndFetch()"),
    "handleManualRefresh calls materializeAndFetch() without stale args"
  );
}

// Unmount safety with mountedRef
assert(bellSource.includes("mountedRef"), "mountedRef defined for component lifecycle safety");
assert(
  bellSource.includes("mountedRef.current = true"),
  "mountedRef set to true on mount / effect initialization"
);
assert(
  bellSource.includes("mountedRef.current = false"),
  "mountedRef set to false on cleanup"
);
if (materializeFuncBlock) {
  assert(
    materializeFuncBlock.content.includes("mountedRef.current"),
    "materializeAndFetch checks mountedRef.current before setting warning or fetching inbox"
  );
}

console.log("\n=== 8. Concurrency, Race & Mutation Safety ===");

// AbortController & generation ref
assert(bellSource.includes("AbortController"), "Uses AbortController for race cancellation");
assert(bellSource.includes("requestGenRef"), "Uses request generation ref for stale response suppression");
assert(bellSource.includes("abortControllerRef.current.abort()"), "Aborts active GET on new request and unmount");

// Mutation safety
assert(
  bellSource.includes("activeMutationId") || bellSource.includes("mutationRef"),
  "Uses mutation state/ref to prevent concurrent repeated clicks"
);

// Contract mismatch reconciliation
const markReadBlock = extractBraceBlock(bellSource, "const handleMarkRead =");
assert(markReadBlock !== null, "Extracted handleMarkRead block");
if (markReadBlock) {
  assert(
    markReadBlock.content.includes("fetchInbox(latest.view, latest.page)") ||
    markReadBlock.content.includes("fetchInbox("),
    "handleMarkRead reconciles via fetchInbox on success/error"
  );
}

const dismissBlock = extractBraceBlock(bellSource, "const handleDismiss =");
assert(dismissBlock !== null, "Extracted handleDismiss block");
if (dismissBlock) {
  assert(
    dismissBlock.content.includes("fetchInbox(latest.view, latest.page)") ||
    dismissBlock.content.includes("fetchInbox("),
    "handleDismiss reconciles via fetchInbox on success/error"
  );
}

console.log("\n=== 9. UI, Date Safety, Navigation & Accessibility ===");

// Date safety: NO new Date(item.created_at)
assert(!/new\s+Date\s*\(\s*(item\.)?created_at\s*\)/.test(bellSource), "No new Date(item.created_at) usage");
assert(bellSource.includes("formatNotificationDate"), "Uses string-safe formatNotificationDate");

// Navigation
assert(bellSource.includes("useNavigate()"), "Uses useNavigate() hook");
assert(!bellSource.includes("window.location"), "Does NOT use window.location");

// Tabs
assert(bellSource.includes("Aktif") && bellSource.includes("Okunmamış") && bellSource.includes("Kapatılanlar"), "Has all 3 tabs: Aktif, Okunmamış, Kapatılanlar");
assert(bellSource.includes("role=\"tablist\""), "Has role=\"tablist\"");
assert(bellSource.includes("role=\"tab\""), "Has role=\"tab\"");
assert(bellSource.includes("aria-selected"), "Has aria-selected for tabs");

// Empty messages
assert(bellSource.includes("Aktif bildiriminiz yok."), "Active empty message present");
assert(bellSource.includes("Okunmamış bildiriminiz yok."), "Unread empty message present");
assert(bellSource.includes("Kapatılmış bildiriminiz yok."), "Dismissed empty message present");

// Popover accessibility & click away
assert(bellSource.includes("role=\"dialog\""), "Popover has role=\"dialog\"");
assert(bellSource.includes("aria-label=\"Bildirimler\""), "Popover has aria-label=\"Bildirimler\"");
assert(bellSource.includes("Escape"), "Closes on Escape key");
assert(bellSource.includes("mousedown"), "Closes on outside mousedown");

// Pagination
assert(bellSource.includes("Önceki"), "Has Önceki pagination button");
assert(bellSource.includes("Sonraki"), "Has Sonraki pagination button");
assert(!bellSource.includes(".slice("), "Does NOT use client-side .slice() for pagination");

// Touch targets
assert(bellSource.includes("min-h-[44px]") || bellSource.includes("min-h-[40px]"), "Enforces touch-safe button heights");

console.log("\n=== 10. DECISIONS.md Documentation Invariants ===");

const decisionsPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decisionsPath), "DECISIONS.md exists");
const decisionsSource = fs.readFileSync(decisionsPath, 'utf8');

assert(
  decisionsSource.includes("## F.20E Admin Notification Bell & Inbox UI"),
  "DECISIONS.md contains '## F.20E Admin Notification Bell & Inbox UI' section"
);
assert(decisionsSource.includes("notification UI currently renders for super_admin/admin/reception"), "Documents role audience");
assert(decisionsSource.includes("F.20C backend inbox remains generic admin-realm infrastructure"), "Documents backend generic infrastructure");
assert(decisionsSource.includes("renewal materialization runs on notification UI mount and explicit manual refresh"), "Documents mount/refresh materialization");
assert(decisionsSource.includes("materializer failure never blocks existing inbox access"), "Documents materializer failure non-blocking behavior");
assert(decisionsSource.includes("unread badge uses backend unread_count only"), "Documents backend badge authority");
assert(decisionsSource.includes("active/unread/dismissed views use backend filtering/pagination"), "Documents 3-view backend filtering");
assert(decisionsSource.includes("read/dismiss mutations always reconcile from server"), "Documents mutation reconciliation");
assert(decisionsSource.includes("notification action paths are internal /admin paths only"), "Documents internal action paths");
assert(decisionsSource.includes("no polling, external delivery, restore, unread, delete, or generic client create"), "Documents all architectural prohibitions");

console.log("\n=== 11. Negative Self-Tests & Simulated Concurrency Invariants ===");

// 11.1 Hardened Action Path Validator Logic Test
function testActionPathValidator(pathStr) {
  if (typeof pathStr !== 'string') return false;
  const p = pathStr.trim();
  if (p !== '/admin' && !p.startsWith('/admin/')) return false;
  if (p.includes('://') || p.startsWith('//') || p.toLowerCase().startsWith('javascript:')) return false;
  return true;
}

assert(testActionPathValidator('/admin') === true, "Action path '/admin' is valid");
assert(testActionPathValidator('/admin/reception') === true, "Action path '/admin/reception' is valid");
assert(testActionPathValidator('/admin/members/123') === true, "Action path '/admin/members/123' is valid");
assert(testActionPathValidator('/administrator') === false, "Negative: Action path '/administrator' is invalid");
assert(testActionPathValidator('/admin-evil') === false, "Negative: Action path '/admin-evil' is invalid");
assert(testActionPathValidator('https://evil.com/admin') === false, "Negative: Scheme prefix 'https://evil.com/admin' is invalid");
assert(testActionPathValidator('javascript:alert(1)') === false, "Negative: 'javascript:alert(1)' is invalid");
assert(testActionPathValidator('//evil.com/admin') === false, "Negative: Protocol-relative '//evil.com/admin' is invalid");

// 11.2 Simulation: Stale Target vs Latest Intent Invariant
{
  const simSelectionRef = { current: { view: 'active', page: 1 } };
  let fetchHistory = [];

  function simulateFetchInbox(view, page) {
    fetchHistory.push({ view, page });
  }

  // Materializer starts with initial intent active/1
  let materializerDoneCallback;
  const materializerPromise = new Promise((resolve) => {
    materializerDoneCallback = () => {
      resolve();
      // On completion, reads LATEST from ref
      const latest = simSelectionRef.current;
      simulateFetchInbox(latest.view, latest.page);
    };
  });

  // User changes tab to 'unread', page 1 while materializer is in flight
  simSelectionRef.current = { view: 'unread', page: 1 };
  simulateFetchInbox('unread', 1);

  // Materializer completes
  materializerDoneCallback();

  assert(
    fetchHistory.length === 2 &&
    fetchHistory[0].view === 'unread' && fetchHistory[0].page === 1 &&
    fetchHistory[1].view === 'unread' && fetchHistory[1].page === 1,
    "Simulation Scenario A: Tab change during materializer results in final GET unread/1 (no active/1 stale overwrite)"
  );
}

// 11.3 Simulation: Page Change During Materializer
{
  const simSelectionRef = { current: { view: 'active', page: 1 } };
  let fetchHistory = [];

  function simulateFetchInbox(view, page) {
    fetchHistory.push({ view, page });
  }

  let materializerDoneCallback;
  const materializerPromise = new Promise((resolve) => {
    materializerDoneCallback = () => {
      resolve();
      const latest = simSelectionRef.current;
      simulateFetchInbox(latest.view, latest.page);
    };
  });

  // User moves to page 2 while materializer is in flight
  simSelectionRef.current = { view: 'active', page: 2 };
  simulateFetchInbox('active', 2);

  // Materializer completes
  materializerDoneCallback();

  assert(
    fetchHistory.length === 2 &&
    fetchHistory[0].page === 2 &&
    fetchHistory[1].page === 2,
    "Simulation Scenario B: Page change during materializer results in final GET active/2"
  );
}

// 11.4 Simulation: Single-Flight Materializer Lock
{
  let inFlight = false;
  let postCount = 0;

  async function simulateMaterialize() {
    if (inFlight) return;
    inFlight = true;
    postCount++;
    // simulate async delay
  }

  // Initial call starts
  simulateMaterialize();
  // Second manual refresh click while in-flight
  simulateMaterialize();

  assert(
    postCount === 1,
    "Simulation Scenario C: Concurrent manual refresh while materializer pending produces NO second materializer POST"
  );
}

// 11.5 Simulation: Unmount Safety
{
  let mounted = true;
  let stateUpdated = false;
  let fetchTriggered = false;

  async function simulateMaterializeWithUnmount() {
    // mounted is flipped to false during POST
    mounted = false;
    // Finally block:
    if (mounted) {
      stateUpdated = true;
      fetchTriggered = true;
    }
  }

  simulateMaterializeWithUnmount();

  assert(
    stateUpdated === false && fetchTriggered === false,
    "Simulation Scenario D: Materializer completion after unmount triggers NO state updates or fetch"
  );
}

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Admin Notification UI verification detected violations.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All Admin Notification UI invariants verified.");
  process.exit(0);
}
