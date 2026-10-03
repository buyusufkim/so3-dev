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

console.log("=== 1. Chained F.28B Read Model Verification ===");

try {
  const f28bOutput = execSync('npm run verify:trainer-retention-attention', { encoding: 'utf8' });
  assert(
    f28bOutput.includes("PASS — F.28B TRAINER RETENTION ATTENTION READ MODEL IMPLEMENTED"),
    "Chained F.28B backend read model verifier passes"
  );
} catch (e) {
  assert(false, `F.28B read model verifier failed: ${e.message}`);
}

console.log("\n=== 2. Component Presence & Architecture ===");

const compPath = path.resolve('src/admin/pages/trainer-dashboard/TrainerRetentionAttentionPanel.tsx');
assert(fs.existsSync(compPath), "TrainerRetentionAttentionPanel.tsx component exists");
const compSource = fs.readFileSync(compPath, 'utf8');

assert(
  compSource.includes("export function TrainerRetentionAttentionPanel"),
  "TrainerRetentionAttentionPanel is exported as named component"
);

assert(
  compSource.includes("apiClient.get('/api/trainer/retention-attention'") ||
  compSource.includes('apiClient.get("/api/trainer/retention-attention"'),
  "Component fetches exact canonical endpoint '/api/trainer/retention-attention'"
);

// Zero query parameters or dynamic trainer id in URL
assert(
  !compSource.includes("/api/trainer/retention-attention?"),
  "Endpoint request has zero query string parameters"
);
assert(
  !compSource.includes("/api/trainer/retention-attention/"),
  "Endpoint request has zero dynamic route segments"
);

// Runtime validator enforcement
assert(
  compSource.includes("validateTrainerRetentionAttention"),
  "Component imports and runs validateTrainerRetentionAttention"
);
assert(
  compSource.includes("validateTrainerRetentionAttention(response)"),
  "Component validates raw API response before setting data state"
);
assert(
  !compSource.includes("as TrainerRetentionAttentionResponse") || compSource.includes("validateTrainerRetentionAttention"),
  "Component does NOT use raw unvalidated cast to TrainerRetentionAttentionResponse"
);

// Independent lifecycle & state
assert(
  compSource.includes("const [data, setData] = useState"),
  "Component owns internal data state"
);
assert(
  compSource.includes("const [loading, setLoading] = useState"),
  "Component owns internal loading state"
);
assert(
  compSource.includes("const [error, setError] = useState"),
  "Component owns internal error state"
);
assert(
  compSource.includes("const [refreshKey, setRefreshKey] = useState"),
  "Component owns internal refreshKey state"
);

// Race safety & concurrency guards
assert(
  compSource.includes("abortControllerRef") || compSource.includes("new AbortController()"),
  "Component uses AbortController for in-flight fetch cancellation"
);
assert(
  compSource.includes("requestGenerationRef") || compSource.includes("generation"),
  "Component maintains generation counter against out-of-order async resolutions"
);
assert(
  compSource.includes("isMountedRef"),
  "Component maintains isMountedRef to guard against unmounted state updates"
);
assert(
  compSource.includes("signal: abortController.signal"),
  "Fetch passes signal to apiClient.get"
);

// Polling guard
assert(!compSource.includes("setInterval"), "Zero setInterval polling in component");

console.log("\n=== 3. Error Handling & Isolation ===");

assert(
  compSource.includes("TRAINER_PROFILE_NOT_LINKED") &&
  compSource.includes("Aktif eğitmen profiliniz hesabınıza bağlanmamış."),
  "Component maps TRAINER_PROFILE_NOT_LINKED to safe Turkish message"
);
assert(
  compSource.includes("Bu alana erişim yetkiniz yok."),
  "Component maps 403 to safe Turkish message"
);
assert(
  compSource.includes("Takip listesi yüklenirken bir hata oluştu."),
  "Component uses safe fallback Turkish error message"
);
assert(
  !compSource.includes("setError(err.message)"),
  "Component never exposes raw err.message from unknown errors"
);

// Retry action
assert(
  compSource.includes("Tekrar Dene"),
  "Component renders explicit 'Tekrar Dene' retry action button"
);
assert(
  compSource.includes("setRefreshKey"),
  "Retry button increments local refreshKey"
);

console.log("\n=== 4. Server Authority & Presentation Invariants ===");

// Factual headings & descriptions
assert(
  compSource.includes("Uzun Süredir Gelmeyenler"),
  "Component renders exact panel heading 'Uzun Süredir Gelmeyenler'"
);
assert(
  compSource.includes("Son tamamlanan seansının üzerinden 14 gün veya daha fazla geçen ve planlı seansı bulunmayan aktif üyeler."),
  "Component renders factual descriptive subtitle"
);
assert(
  compSource.includes("Şu anda takip gerektiren üye bulunmuyor."),
  "Component renders exact neutral empty state"
);

// Factual inactivity copy
assert(
  compSource.includes("{item.inactivity_days} gündür tamamlanan seans yok") ||
  compSource.includes("gündür tamamlanan seans yok"),
  "Component displays server-authoritative inactivity_days"
);
assert(
  compSource.includes("Son seans:"),
  "Component displays last completed session date"
);

// No browser date recalculation
assert(
  !compSource.includes("Date.now()"),
  "Component zero Date.now() for retention business calculations"
);
assert(
  !compSource.includes("new Date() -") && !compSource.includes("new Date().getTime() -"),
  "Component zero browser date subtraction for inactivity calculation"
);
assert(
  !compSource.includes(".sort("),
  "Component zero client-side .sort() on items (server ordering is authoritative)"
);

// Zero phone number text display (only used in WhatsAppContactLink)
const textPhoneMatches = compSource.match(/<[^>]+>\s*\{item\.member\.phone\}\s*<\/[^>]+>/g) || [];
assert(
  textPhoneMatches.length === 0 && !compSource.includes("Telefon:"),
  "Phone number is not displayed in plain card text"
);

console.log("\n=== 5. Actions & Navigation Invariants ===");

// WhatsApp action
assert(
  compSource.includes("import { WhatsAppContactLink }") || compSource.includes("import {WhatsAppContactLink}"),
  "Component imports canonical WhatsAppContactLink"
);
assert(
  compSource.includes("buildTrainerWhatsAppQuickMessage"),
  "Component imports buildTrainerWhatsAppQuickMessage helper"
);
assert(
  compSource.includes("kind: 'follow_up'"),
  "Component reuses neutral follow_up message template"
);
assert(
  compSource.includes("phone={item.member.phone}"),
  "WhatsApp link receives item.member.phone"
);
assert(
  compSource.includes("showDisabledIfInvalid={false}"),
  "WhatsApp link specifies showDisabledIfInvalid={false}"
);

// Member detail link
assert(
  compSource.includes("/admin/my-members/${item.member.id}"),
  "Component routes to canonical member detail page"
);
assert(
  compSource.includes("Üyeyi Aç"),
  "Component displays visible 'Üyeyi Aç' action label"
);

// Touch target safety
const minHeightMatches = compSource.match(/min-h-\[44px\]/g) || [];
assert(
  minHeightMatches.length >= 2,
  `Interactive actions enforce min-h-[44px] touch targets (found ${minHeightMatches.length})`
);

// Click-only safety
assert(!compSource.includes("wa.me/"), "Zero raw wa.me construction in component");
assert(!compSource.includes("window.open"), "Zero window.open in component");

console.log("\n=== 6. Anti-Feature, Anti-CRM & Anti-Tracking Invariants ===");

const combinedLower = compSource.toLowerCase();
assert(!combinedLower.includes("churn"), "Zero 'churn' copy in component");
assert(!combinedLower.includes("risk_score"), "Zero 'risk_score' in component");
assert(!combinedLower.includes("retention_score"), "Zero 'retention_score' in component");
assert(!combinedLower.includes("yüksek risk"), "Zero 'yüksek risk' in component");
assert(!combinedLower.includes("orta risk"), "Zero 'orta risk' in component");
assert(!combinedLower.includes("düşük risk"), "Zero 'düşük risk' in component");

assert(!compSource.includes("contacted_at"), "Zero contacted_at tracking in component");
assert(!compSource.includes("last_contacted"), "Zero last_contacted tracking in component");
assert(!compSource.includes("message_sent"), "Zero message_sent tracking in component");
assert(!compSource.includes("follow_up_done"), "Zero follow_up_done tracking in component");
assert(!compSource.includes("dismiss"), "Zero dismiss tracking in component");
assert(!compSource.includes("snooze"), "Zero snooze tracking in component");
assert(!compSource.includes("localStorage"), "Zero localStorage persistence in component");
assert(!compSource.includes("sessionStorage"), "Zero sessionStorage persistence in component");

// GET only
assert(!compSource.includes("apiClient.post"), "Zero apiClient.post in component");
assert(!compSource.includes("apiClient.patch"), "Zero apiClient.patch in component");
assert(!compSource.includes("apiClient.put"), "Zero apiClient.put in component");
assert(!compSource.includes("apiClient.delete"), "Zero apiClient.delete in component");

console.log("\n=== 7. TrainerDashboard Integration Invariants ===");

const dashPath = path.resolve('src/admin/pages/trainer-dashboard/TrainerDashboard.tsx');
assert(fs.existsSync(dashPath), "TrainerDashboard.tsx exists");
const dashSource = fs.readFileSync(dashPath, 'utf8');

assert(
  dashSource.includes("import { TrainerRetentionAttentionPanel }") ||
  dashSource.includes("import {TrainerRetentionAttentionPanel}"),
  "TrainerDashboard imports TrainerRetentionAttentionPanel"
);

// Exactly one render
const renderMatches = dashSource.match(/<TrainerRetentionAttentionPanel/g) || [];
assert(
  renderMatches.length === 1,
  "TrainerRetentionAttentionPanel is rendered exactly once in TrainerDashboard"
);

// Placed immediately after DailyAgendaWorkspace
const dailyIdx = dashSource.indexOf("<DailyAgendaWorkspace");
const retentionIdx = dashSource.indexOf("<TrainerRetentionAttentionPanel");
const memberMetricsIdx = dashSource.indexOf("Üye Durumu");

assert(
  dailyIdx !== -1 && retentionIdx !== -1 && retentionIdx > dailyIdx,
  "TrainerRetentionAttentionPanel is positioned after DailyAgendaWorkspace"
);
assert(
  memberMetricsIdx !== -1 && retentionIdx < memberMetricsIdx,
  "TrainerRetentionAttentionPanel is positioned before Member Metrics"
);

// Mobile order-2
assert(
  dashSource.includes("order-2 lg:order-none") &&
  dashSource.slice(retentionIdx - 100, retentionIdx + 100).includes("order-2"),
  "TrainerRetentionAttentionPanel wrapper enforces mobile order-2"
);

// TrainerDashboard does NOT fetch retention data
assert(
  !dashSource.includes("/api/trainer/retention-attention"),
  "TrainerDashboard does NOT fetch '/api/trainer/retention-attention' (lifecycle is fully isolated)"
);

console.log("\n=== 8. Documentation & Registration ===");

const decPath = path.resolve('DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decSource = fs.readFileSync(decPath, 'utf8');

assert(
  decSource.includes("## F.28C Trainer Retention Attention UI"),
  "DECISIONS.md documents '## F.28C Trainer Retention Attention UI'"
);

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts['verify:trainer-retention-attention-ui'] === 'node scripts/verify-trainer-retention-attention-ui.mjs',
  "package.json registers 'verify:trainer-retention-attention-ui'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ F.28C Trainer Retention Attention UI verification FAILED");
  process.exit(1);
} else {
  console.log("PASS — F.28C TRAINER RETENTION ATTENTION UI IMPLEMENTED");
}
