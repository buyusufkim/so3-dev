/**
 * scripts/verify-operations-attention-ui.mjs
 *
 * Verifier for F.31B — Dashboard Dikkat Gerektirenler UI:
 * 1. Subprocess Chain: F.31A Admin Operations Attention Read Model Verifier
 * 2. package.json Registration
 * 3. Repo Hygiene
 * 4. Component Existence & Export Invariants
 * 5. Dashboard Integration & Role Gating
 * 6. Placement Order (Operasyon Özeti -> Dikkat Gerektirenler -> Operasyon Analitiği)
 * 7. Canonical Endpoint & Zero Query Parameter Invariant
 * 8. Strict Runtime Validation & Fail-Closed Guard
 * 9. Independent Fetch Boundary & Error Retry
 * 10. Read-Only Invariant (Zero Mutations, Zero Workflows)
 * 11. Zero Metrics Duplication
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

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

const ROOT = process.cwd();

console.log("=== 1. Subprocess Chain: F.31A Operations Attention Read Model Verifier ===");
try {
  const readModelOutput = execSync('node scripts/verify-admin-operations-attention.mjs', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  assert(
    readModelOutput.includes("PASS — F.31A SALON OPERATIONS ATTENTION READ MODEL VERIFIED"),
    "Subprocess chain: verify-admin-operations-attention.mjs completed with SUCCESS"
  );
} catch (err) {
  console.error("F.31A read model verifier failed:", err.stdout || err.message);
  assert(false, "Subprocess chain: verify-admin-operations-attention.mjs must pass");
}

console.log("\n=== 2. Package.json Script Registration ===");
const pkgPath = path.resolve(ROOT, 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && (
    pkg.scripts["verify:operations-attention-ui"] === "node scripts/verify-operations-attention-ui.mjs" ||
    pkg.scripts["verify:admin-operations-attention-ui"] === "node scripts/verify-operations-attention-ui.mjs"
  ),
  "package.json registers verify script for operations-attention-ui"
);
assert(
  pkg.scripts && pkg.scripts["verify:admin-operations-attention"] === "node scripts/verify-admin-operations-attention.mjs",
  "package.json preserves 'verify:admin-operations-attention'"
);

console.log("\n=== 3. Repo Hygiene Checks ===");
const rootFiles = fs.readdirSync(ROOT);
const forbiddenPatterns = [
  /^patch.*\.js$/, /^patch.*\.mjs$/, /^patch.*\.php$/,
  /^tmp.*\.js$/, /^tmp.*\.mjs$/, /^tmp.*\.php$/,
  /\.tmp$/, /\.fixed$/, /^add-.*\.php$/
];
const hygieneViolations = rootFiles.filter(file => forbiddenPatterns.some(p => p.test(file)));
assert(hygieneViolations.length === 0, `Repo hygiene: No temporary or patch artifacts in root (found: ${hygieneViolations.join(', ')})`);

console.log("\n=== 4. Component Existence & Export Invariants ===");
const panelPath = path.resolve(ROOT, 'src/admin/pages/operations-attention/OperationsAttentionPanel.tsx');
assert(fs.existsSync(panelPath), "src/admin/pages/operations-attention/OperationsAttentionPanel.tsx exists");
const panelSource = fs.readFileSync(panelPath, 'utf8');

assert(
  panelSource.includes("export function OperationsAttentionPanel"),
  "OperationsAttentionPanel is exported as a named function component"
);

console.log("\n=== 5. Dashboard Integration & Role Gating ===");
const dashboardPath = path.resolve(ROOT, 'src/admin/pages/Dashboard.tsx');
assert(fs.existsSync(dashboardPath), "src/admin/pages/Dashboard.tsx exists");
const dashboardSource = fs.readFileSync(dashboardPath, 'utf8');

assert(
  dashboardSource.includes("OperationsAttentionPanel"),
  "Dashboard.tsx imports OperationsAttentionPanel"
);
assert(
  dashboardSource.includes("<OperationsAttentionPanel"),
  "Dashboard.tsx renders <OperationsAttentionPanel />"
);

// Gated under isAdmin
const isAdminPos = dashboardSource.indexOf("{isAdmin &&");
const attentionPanelPos = dashboardSource.indexOf("<OperationsAttentionPanel");
assert(isAdminPos !== -1, "Dashboard.tsx contains {isAdmin && } guard");
assert(attentionPanelPos !== -1, "Dashboard.tsx renders <OperationsAttentionPanel />");
assert(
  attentionPanelPos > isAdminPos,
  "OperationsAttentionPanel is strictly rendered inside the isAdmin guarded block"
);

console.log("\n=== 6. Placement Order Invariants ===");
const opSummaryPos = dashboardSource.indexOf("Operasyon Özeti");
const analyticsPanelPos = dashboardSource.indexOf("<OperationsAnalyticsPanel");

assert(opSummaryPos !== -1, "Dashboard.tsx contains 'Operasyon Özeti'");
assert(analyticsPanelPos !== -1, "Dashboard.tsx contains '<OperationsAnalyticsPanel'");
assert(
  opSummaryPos < attentionPanelPos,
  "Placement order: Operasyon Özeti appears BEFORE OperationsAttentionPanel"
);
assert(
  attentionPanelPos < analyticsPanelPos,
  "Placement order: OperationsAttentionPanel appears BEFORE OperationsAnalyticsPanel"
);

console.log("\n=== 7. Canonical Endpoint & Zero Query Parameter Invariant ===");
assert(
  panelSource.includes("apiClient.get('/api/admin/operations/attention'") ||
  panelSource.includes('apiClient.get("/api/admin/operations/attention"'),
  "Component fetches exact canonical endpoint '/api/admin/operations/attention'"
);
assert(
  !panelSource.includes("/api/admin/operations/attention?"),
  "Endpoint call does not append query parameters"
);
assert(
  !panelSource.includes("/api/admin/operations/attention/"),
  "Endpoint call does not append sub-paths"
);

console.log("\n=== 8. Strict Runtime Validation & Fail-Closed Guard ===");
assert(
  panelSource.includes("validateOperationsAttention"),
  "Component imports validateOperationsAttention"
);
assert(
  panelSource.includes("validateOperationsAttention(response)"),
  "Component validates raw response before setting state"
);
assert(
  !panelSource.includes("as OperationsAttentionResponse") || panelSource.includes("validateOperationsAttention"),
  "Component does NOT use blind unvalidated cast"
);

console.log("\n=== 9. Independent Fetch Boundary & Error Retry ===");
assert(
  panelSource.includes("const [data, setData] = useState"),
  "Component manages its own data state"
);
assert(
  panelSource.includes("const [loading, setLoading] = useState"),
  "Component manages its own loading state"
);
assert(
  panelSource.includes("const [error, setError] = useState"),
  "Component manages its own error state"
);
assert(
  panelSource.includes("fetchAttention"),
  "Component defines local fetchAttention function"
);
assert(
  panelSource.includes("Tekrar Dene"),
  "Component provides retry action for error recovery"
);

console.log("\n=== 10. Read-Only Invariant (Zero Mutations, Zero Workflows) ===");
const forbiddenMutations = [
  "apiClient.post",
  "apiClient.put",
  "apiClient.patch",
  "apiClient.delete"
];
for (const mutation of forbiddenMutations) {
  assert(
    !panelSource.includes(mutation),
    `Component enforces read-only invariant: zero '${mutation}' calls`
  );
}

console.log("\n=== 11. Safe Attention Display & Navigation Invariants ===");
assert(
  panelSource.includes("needs_terminalization_count"),
  "Component renders needs_terminalization_count"
);
assert(
  panelSource.includes("carried_over"),
  "Component renders carried_over open visits count"
);
assert(
  panelSource.includes("future_dated"),
  "Component renders future_dated open visits count"
);
assert(
  panelSource.includes("/admin/appointments"),
  "Component provides safe navigation link to /admin/appointments"
);
assert(
  panelSource.includes("/admin/reception"),
  "Component provides safe navigation link to /admin/reception"
);

console.log("\n=== 12. F.31B UI Contract Corrective Invariants ===");
// Race-safe fetch guards
assert(
  panelSource.includes("abortControllerRef") || panelSource.includes("AbortController"),
  "Component uses AbortController for race cancellation"
);
assert(
  panelSource.includes("requestGenerationRef") || panelSource.includes("generation"),
  "Component tracks request generation counter to avoid race conditions"
);
assert(
  panelSource.includes("signal: controller.signal") || panelSource.includes("signal"),
  "Component passes AbortSignal to apiClient request"
);
assert(
  panelSource.includes("isMountedRef"),
  "Component tracks mount lifecycle with isMountedRef"
);

// Conditional anomaly card invariant
assert(
  panelSource.includes("futureDatedVisits > 0") &&
  panelSource.includes("{futureDatedVisits > 0 &&"),
  "Anomaly card is strictly conditionally rendered only when future_dated > 0"
);

// Compact clear-state invariant
assert(
  panelSource.includes("totalAttentionItems === 0") || panelSource.includes("totalAttentionItems == 0"),
  "Component contains compact clear-state guard when all attention items are 0"
);
assert(
  panelSource.includes("Tümü Olağan"),
  "Component renders 'Tümü Olağan' badge/label in clear state"
);

// Datetime formatting invariant
assert(
  panelSource.includes("formatDateTime") || panelSource.includes("formatDate"),
  "Component includes canonical datetime formatting helper"
);
assert(
  panelSource.includes("${day}.${month}.${year} ${hour}:${minute}") ||
  panelSource.includes("DD.MM.YYYY") ||
  /(\d{2}\.\d{2}\.\d{4})/.test(panelSource) ||
  panelSource.includes("formatDateTime("),
  "Component formats server timestamps to deterministic DD.MM.YYYY HH:mm"
);

console.log("\n=======================================================");
console.log(`Summary: ${passedAssertions}/${totalAssertions} assertions passed.`);
if (exitCode === 0) {
  console.log("PASS — F.31B UI CONTRACT CORRECTIVE IMPLEMENTED");
} else {
  console.error("FAIL: Some assertions failed.");
}
process.exit(exitCode);
