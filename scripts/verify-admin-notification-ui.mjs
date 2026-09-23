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
assert(bellSource.includes("startsWith('/admin')"), "Validates action_path starts with /admin");
assert(bellSource.includes("://") && bellSource.includes("javascript:"), "Rejects protocol schemes or javascript: in action_path");

// List validator checks
assert(bellSource.includes("validateNotificationListResponse"), "Contains validateNotificationListResponse runtime validator");
assert(bellSource.includes("res.unread_count"), "Validates unread_count");
assert(bellSource.includes("res.view !== expectedView"), "Validates view matches requested view");
assert(bellSource.includes("pag.per_page !== 10"), "Validates per_page === 10");

// Badge authority check: Must use response.unread_count, NEVER items.filter
assert(!bellSource.includes("items.filter(item => !item.is_read).length"), "Badge does NOT calculate unread count via items.filter");
assert(bellSource.includes("setUnreadCount(validated.unread_count)"), "Badge sets unreadCount strictly from validated response.unread_count");

console.log("\n=== 7. Mount & Refresh Invariants ===");

// Initial mount runs materialize then inbox
assert(bellSource.includes("materializeAndFetch('active', 1)"), "Initial mount invokes materializeAndFetch('active', 1)");

// Materializer failure does NOT block inbox fetch
const materializeFuncBlock = extractBraceBlock(bellSource, "const materializeAndFetch =");
assert(materializeFuncBlock !== null, "Extracted materializeAndFetch function block");
if (materializeFuncBlock) {
  const content = materializeFuncBlock.content;
  assert(content.includes("try") && content.includes("catch"), "materialize has try/catch block");
  assert(content.includes("fetchInbox(targetView, targetPage)"), "fetchInbox is called in finally / after catch");
}

// Manual refresh
assert(bellSource.includes("handleManualRefresh"), "Contains handleManualRefresh handler");
assert(bellSource.includes("aria-label=\"Bildirimleri yenile\""), "Refresh button has aria-label=\"Bildirimleri yenile\"");
assert(bellSource.includes("RefreshCw"), "Uses RefreshCw icon for refresh button");

// No polling
assert(!bellSource.includes("setInterval"), "Does NOT contain setInterval");
assert(!bellSource.includes("WebSocket"), "Does NOT contain WebSocket");
assert(!bellSource.includes("EventSource"), "Does NOT contain EventSource");

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
  assert(markReadBlock.content.includes("fetchInbox(view, page)"), "handleMarkRead reconciles via fetchInbox on success/error");
}

const dismissBlock = extractBraceBlock(bellSource, "const handleDismiss =");
assert(dismissBlock !== null, "Extracted handleDismiss block");
if (dismissBlock) {
  assert(dismissBlock.content.includes("fetchInbox(view, page)"), "handleDismiss reconciles via fetchInbox on success/error");
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
