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

console.log("=== 1. Self-Tests & Negative Invariant Tests ===");

// Negative test 1: Mutating methods check
function testMutatingMethodsDetection(source) {
  return /apiClient\.(post|patch|delete|put)\s*\(/.test(source);
}
assert(
  testMutatingMethodsDetection("apiClient.post('/api/reception/members/1/renew')") === true,
  "Self-test: Detects POST mutation in code"
);
assert(
  testMutatingMethodsDetection("apiClient.get('/api/reception/renewal-watch')") === false,
  "Self-test: Correctly allows GET query in code"
);

// Negative test 2: Sensitive fields detection
function testSensitiveFieldsDetection(source) {
  const sensitiveFields = [
    "emergency_contact", "blood_group", "measurement",
    "progress_note", "trainer_notes", "password",
    "credentials", "audit_metadata", "email"
  ];
  return sensitiveFields.some(field => new RegExp(`\\b${field}\\b`, 'i').test(source));
}
assert(
  testSensitiveFieldsDetection("const userEmail = member.email;") === true,
  "Self-test: Detects sensitive field 'email'"
);
assert(
  testSensitiveFieldsDetection("const name = member.first_name;") === false,
  "Self-test: Correctly ignores non-sensitive fields"
);

// Negative test 3: Client-side summary re-calculation detection
function testSummaryRecomputation(source) {
  return /items\.(filter|reduce)\s*\(/.test(source);
}
assert(
  testSummaryRecomputation("const count = items.filter(i => i.renewal_state === 'expired').length") === true,
  "Self-test: Detects client-side summary calculation via filter"
);
assert(
  testSummaryRecomputation("<span>{data.summary.expired}</span>") === false,
  "Self-test: Allows backend summary usage"
);

// Negative test 4: Notification domain detection
function testNotificationDomainDetection(source) {
  const notificationTerms = ["unread", "markRead", "dismiss", "snooze", "notificationId", "push", "SMS", "WhatsApp"];
  return notificationTerms.some(term => new RegExp(`\\b${term}\\b`, 'i').test(source));
}
assert(
  testNotificationDomainDetection("function markRead(id) {}") === true,
  "Self-test: Detects notification domain term 'markRead'"
);
assert(
  testNotificationDomainDetection("function handleRetry() {}") === false,
  "Self-test: Allows non-notification functions"
);

console.log("\n=== 2. Package.json Script Registration ===");

const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:reception-renewal-watch-ui"] === "node scripts/verify-reception-renewal-watch-ui.mjs",
  "Package.json exact script registration: 'verify:reception-renewal-watch-ui' === 'node scripts/verify-reception-renewal-watch-ui.mjs'"
);
assert(
  pkg.scripts && pkg.scripts["verify:renewal-watch-read-model"] === "node scripts/verify-renewal-watch-read-model.mjs",
  "Package.json retains verify:renewal-watch-read-model script"
);
assert(
  pkg.scripts && pkg.scripts["verify:reception-frontend"] === "node scripts/verify-reception-frontend.mjs",
  "Package.json retains verify:reception-frontend script"
);

console.log("\n=== 3. Component Presence & Architecture ===");

const panelPath = path.resolve(process.cwd(), 'src/admin/pages/reception/ReceptionRenewalWatchPanel.tsx');
assert(fs.existsSync(panelPath), "ReceptionRenewalWatchPanel.tsx component exists");
const panelSource = fs.readFileSync(panelPath, 'utf8');

assert(
  panelSource.includes("export function ReceptionRenewalWatchPanel"),
  "ReceptionRenewalWatchPanel component is exported"
);
assert(
  panelSource.includes("export interface ReceptionRenewalWatchPanelProps"),
  "ReceptionRenewalWatchPanelProps interface is exported"
);

const propsBlock = extractBraceBlock(panelSource, "export interface ReceptionRenewalWatchPanelProps");
assert(propsBlock !== null, "Extracted ReceptionRenewalWatchPanelProps block");
if (propsBlock) {
  assert(propsBlock.content.includes("refreshKey: number;"), "Props includes refreshKey: number;");
  assert(propsBlock.content.includes("mutationBusy: boolean;"), "Props includes mutationBusy: boolean;");
  assert(propsBlock.content.includes("renewingMemberId: number | null;"), "Props includes renewingMemberId: number | null;");
  assert(propsBlock.content.includes("onRenew: (member: ReceptionRenewalTarget) => void;"), "Props includes onRenew: (member: ReceptionRenewalTarget) => void;");
}

console.log("\n=== 4. Types Contract in types.ts ===");

const typesPath = path.resolve(process.cwd(), 'src/admin/pages/reception/types.ts');
assert(fs.existsSync(typesPath), "types.ts exists");
const typesSource = fs.readFileSync(typesPath, 'utf8');

// Shared Renewal Target
assert(typesSource.includes("export interface ReceptionRenewalTarget"), "ReceptionRenewalTarget interface exported");
const targetBlock = extractBraceBlock(typesSource, "export interface ReceptionRenewalTarget");
assert(targetBlock !== null, "Extracted ReceptionRenewalTarget block");
if (targetBlock) {
  assert(targetBlock.content.includes("id: number;"), "ReceptionRenewalTarget has id: number;");
  assert(targetBlock.content.includes("uuid: string;"), "ReceptionRenewalTarget has uuid: string;");
  assert(targetBlock.content.includes("first_name: string;"), "ReceptionRenewalTarget has first_name: string;");
  assert(targetBlock.content.includes("last_name: string;"), "ReceptionRenewalTarget has last_name: string;");
  assert(targetBlock.content.includes("phone: string;"), "ReceptionRenewalTarget has phone: string;");
  assert(targetBlock.content.includes("membership_start_date: string | null;"), "ReceptionRenewalTarget has membership_start_date: string | null;");
  assert(targetBlock.content.includes("membership_end_date: string | null;"), "ReceptionRenewalTarget has membership_end_date: string | null;");
}

// Watch response types
assert(typesSource.includes("export type ReceptionRenewalState"), "ReceptionRenewalState exported");
assert(typesSource.includes("'expired'"), "ReceptionRenewalState includes 'expired'");
assert(typesSource.includes("'today'"), "ReceptionRenewalState includes 'today'");
assert(typesSource.includes("'upcoming'"), "ReceptionRenewalState includes 'upcoming'");

assert(typesSource.includes("export interface ReceptionRenewalWatchItem"), "ReceptionRenewalWatchItem exported");
assert(typesSource.includes("export interface ReceptionRenewalWatchSummary"), "ReceptionRenewalWatchSummary exported");
assert(typesSource.includes("export interface ReceptionRenewalWatchPagination"), "ReceptionRenewalWatchPagination exported");
assert(typesSource.includes("export interface ReceptionRenewalWatchResponse"), "ReceptionRenewalWatchResponse exported");

console.log("\n=== 5. Dashboard Integration & Refresh Key Wire ===");

const dashPath = path.resolve(process.cwd(), 'src/admin/pages/reception/ReceptionDashboard.tsx');
assert(fs.existsSync(dashPath), "ReceptionDashboard.tsx exists");
const dashSource = fs.readFileSync(dashPath, 'utf8');

assert(
  dashSource.includes('import { ReceptionRenewalWatchPanel } from "./ReceptionRenewalWatchPanel";'),
  "ReceptionDashboard imports ReceptionRenewalWatchPanel"
);
assert(
  dashSource.includes("ReceptionRenewalTarget"),
  "ReceptionDashboard imports ReceptionRenewalTarget"
);
assert(
  dashSource.includes("<ReceptionRenewalWatchPanel"),
  "ReceptionDashboard renders ReceptionRenewalWatchPanel component"
);
assert(
  dashSource.includes("refreshKey={renewalWatchRefreshKey}"),
  "ReceptionRenewalWatchPanel receives renewalWatchRefreshKey"
);
assert(
  dashSource.includes("mutationBusy={activeMutation !== null}"),
  "ReceptionRenewalWatchPanel receives mutationBusy bound to activeMutation"
);
assert(
  dashSource.includes("onRenew={handleOpenRenewalModal}"),
  "ReceptionRenewalWatchPanel receives handleOpenRenewalModal via onRenew prop"
);

// Refresh key state & triggers
assert(
  dashSource.includes("const [renewalWatchRefreshKey, setRenewalWatchRefreshKey] = useState<number>(0);"),
  "Dashboard declares renewalWatchRefreshKey state with initial 0"
);

// Verify refresh triggered in success and contractValidationFailed paths
const handleRenewBlock = extractBraceBlock(dashSource, "const handleRenewSubmit = useCallback(async () =>");
assert(handleRenewBlock !== null, "Extracted handleRenewSubmit block");
if (handleRenewBlock) {
  const content = handleRenewBlock.content;
  const malformedBlock = extractBraceBlock(content, "if (contractValidationFailed)");
  assert(malformedBlock !== null, "handleRenewSubmit has contractValidationFailed block");
  if (malformedBlock) {
    assert(
      malformedBlock.content.includes("setRenewalWatchRefreshKey(k => k + 1)"),
      "contractValidationFailed path increments renewalWatchRefreshKey"
    );
  }

  const normalSuccessIdx = content.indexOf('setMutationFeedback({ type: \'success\'');
  assert(normalSuccessIdx !== -1, "handleRenewSubmit has normal success path");
  if (normalSuccessIdx !== -1) {
    const afterSuccess = content.slice(normalSuccessIdx);
    assert(
      afterSuccess.includes("setRenewalWatchRefreshKey(k => k + 1)"),
      "Normal success path increments renewalWatchRefreshKey"
    );
  }
}

console.log("\n=== 6. Read-Only Side-Effect-Free Panel Boundary ===");

assert(
  !testMutatingMethodsDetection(panelSource),
  "ReceptionRenewalWatchPanel is strictly GET-only: Zero apiClient.post, patch, delete, put"
);
assert(
  panelSource.includes("apiClient.get("),
  "ReceptionRenewalWatchPanel fetches data using apiClient.get"
);
assert(
  panelSource.includes("`/api/reception/renewal-watch?"),
  "ReceptionRenewalWatchPanel targets /api/reception/renewal-watch"
);

console.log("\n=== 7. Canonical Renewal Flow Reuse ===");

assert(
  panelSource.includes("onRenew(item)"),
  "ReceptionRenewalWatchPanel delegates renewal action via onRenew(item)"
);
assert(
  !panelSource.includes("/api/reception/members/") || !panelSource.includes("/renew"),
  "ReceptionRenewalWatchPanel has no internal renewal mutation route"
);
assert(
  !panelSource.includes("<form") && !panelSource.includes("new_start_date"),
  "ReceptionRenewalWatchPanel has no duplicate renewal form/modal"
);

console.log("\n=== 8. Concurrency & Mutation Lock Integration ===");

assert(
  panelSource.includes("disabled={mutationBusy}"),
  "Renewal action button in watch panel is disabled when mutationBusy is true"
);
assert(
  panelSource.includes("isThisRenewing"),
  "Renewal button distinguishes member being actively renewed"
);
assert(
  panelSource.includes("Yenileniyor..."),
  "Renewal button displays 'Yenileniyor...' spinner when actively renewing"
);

console.log("\n=== 9. Summary Cards & Bucket Filtering ===");

assert(
  panelSource.includes("handleBucketChange('all')") &&
  panelSource.includes("handleBucketChange('expired')") &&
  panelSource.includes("handleBucketChange('today')") &&
  panelSource.includes("handleBucketChange('upcoming')"),
  "All 4 filter buckets supported in summary cards (all, expired, today, upcoming)"
);
assert(
  panelSource.includes("setPage(1)"),
  "Bucket change resets page to 1"
);
assert(
  !testSummaryRecomputation(panelSource),
  "Summary cards use backend summary directly; no client-side items.filter or items.reduce"
);
assert(
  panelSource.includes("data.summary.total") &&
  panelSource.includes("data.summary.expired") &&
  panelSource.includes("data.summary.today") &&
  panelSource.includes("data.summary.upcoming"),
  "Renders data.summary directly from backend read model response"
);

console.log("\n=== 10. Runtime Contract Validation ===");

assert(
  panelSource.includes("function validateRenewalWatchResponse"),
  "ReceptionRenewalWatchPanel has validateRenewalWatchResponse runtime validator"
);
const valBlock = extractBraceBlock(panelSource, "function validateRenewalWatchResponse");
assert(valBlock !== null, "Extracted validateRenewalWatchResponse block");
if (valBlock) {
  const content = valBlock.content;
  assert(content.includes("data.as_of_date"), "Validates as_of_date");
  assert(content.includes("data.window_days"), "Validates window_days");
  assert(content.includes("data.bucket"), "Validates bucket");
  assert(content.includes("summary.expired") && content.includes("summary.today") && content.includes("summary.upcoming") && content.includes("summary.total"), "Validates summary object numbers");
  assert(content.includes("pagination.total") && content.includes("pagination.page") && content.includes("pagination.per_page") && content.includes("pagination.last_page"), "Validates pagination");
  assert(content.includes("item.renewal_state === 'expired' && item.days_until_expiry >= 0"), "Validates expired days_until_expiry < 0 consistency");
  assert(content.includes("item.renewal_state === 'today' && item.days_until_expiry !== 0"), "Validates today days_until_expiry === 0 consistency");
  assert(content.includes("item.renewal_state === 'upcoming' && item.days_until_expiry <= 0"), "Validates upcoming days_until_expiry > 0 consistency");
}

console.log("\n=== 11. Date Safety & Timezone Guard ===");

assert(
  !panelSource.includes("new Date(item.membership_end_date)") &&
  !panelSource.includes("new Date(item.membership_start_date)"),
  "Safe date parsing: No unsafe client new Date() constructor on membership dates"
);
assert(
  panelSource.includes("formatDateOnly"),
  "Panel uses safe string-based formatDateOnly helper"
);

console.log("\n=== 12. Privacy & Financial Boundary ===");

assert(
  !testSensitiveFieldsDetection(panelSource),
  "Privacy boundary: No sensitive fields in ReceptionRenewalWatchPanel.tsx"
);
assert(
  !testSensitiveFieldsDetection(typesSource.slice(typesSource.indexOf("ReceptionRenewalTarget"))),
  "Privacy boundary: No sensitive fields in new reception types in types.ts"
);

const financialTerms = ["payment", "tahsilat", "ödeme", "price", "fiyat", "invoice", "fatura", "debt", "borç", "cash", "kasa"];
for (const ft of financialTerms) {
  const regex = new RegExp(`\\b${ft}\\b`, "i");
  assert(
    !regex.test(panelSource),
    `Financial boundary: Forbidden term '${ft}' absent from ReceptionRenewalWatchPanel.tsx`
  );
}

console.log("\n=== 13. Notification Boundary ===");

assert(
  !testNotificationDomainDetection(panelSource),
  "Notification boundary: No notification domain terms present in watch panel"
);

console.log("\n=== 14. Touch & Accessibility Safety ===");

const touchTargets = panelSource.match(/min-h-\[44px\]/g);
assert(
  touchTargets !== null && touchTargets.length >= 6,
  `Touch safety: All interactive controls enforce min-h-[44px] (found ${touchTargets ? touchTargets.length : 0} instances)`
);

console.log("\n=== 15. Architectural Documentation in DECISIONS.md ===");

const decisionsPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decisionsPath), "DECISIONS.md exists");
const decisionsSource = fs.readFileSync(decisionsPath, 'utf8');

assert(
  decisionsSource.includes("## F.20B Reception Renewal Watch UI"),
  "DECISIONS.md contains '## F.20B Reception Renewal Watch UI' section"
);
assert(
  decisionsSource.includes("ReceptionRenewalTarget"),
  "DECISIONS.md documents shared ReceptionRenewalTarget decoupling"
);
assert(
  decisionsSource.includes("GET-only"),
  "DECISIONS.md documents GET-only side-effect free contract"
);
assert(
  decisionsSource.includes("refreshKey"),
  "DECISIONS.md documents bounded refreshKey pattern"
);

console.log("\n=== 16. Backend Parity ===");

const apiIndexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(apiIndexPath), "api/index.php exists");
const apiIndexSource = fs.readFileSync(apiIndexPath, 'utf8');

const renewalWatchRouteBlock = extractBraceBlock(apiIndexSource, "preg_match('#^/api/reception/renewal-watch$#'");
assert(renewalWatchRouteBlock !== null, "Route block for /api/reception/renewal-watch found in api/index.php");
if (renewalWatchRouteBlock) {
  const content = renewalWatchRouteBlock.content;
  assert(content.includes("'super_admin'"), "Route authorizes super_admin");
  assert(content.includes("'admin'"), "Route authorizes admin");
  assert(content.includes("'reception'"), "Route authorizes reception");
  assert(content.includes("$method === 'GET'") || content.includes("$_SERVER['REQUEST_METHOD'] === 'GET'"), "Route enforces GET method");
  assert(content.includes("RenewalTrackingController"), "Route invokes RenewalTrackingController");
}

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Reception Renewal Watch UI verification detected violations.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All Reception Renewal Watch UI invariants verified.");
  process.exit(0);
}
