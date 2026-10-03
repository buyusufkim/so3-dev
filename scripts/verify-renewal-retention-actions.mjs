import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import ts from 'typescript';

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

console.log("=== 1. Chained Regression Verifiers ===");

try {
  const rWatchUi = execSync('npm run verify:reception-renewal-watch-ui', { encoding: 'utf8' });
  assert(
    rWatchUi.includes("All Reception Renewal Watch UI invariants verified") ||
    rWatchUi.includes("SUCCESS"),
    "Chained verify:reception-renewal-watch-ui passes"
  );
} catch (e) {
  assert(false, `verify:reception-renewal-watch-ui failed: ${e.message}`);
}

try {
  const rWatchModel = execSync('npm run verify:renewal-watch-read-model', { encoding: 'utf8' });
  assert(
    rWatchModel.includes("ALL F.20A RENEWAL WATCH READ MODEL INVARIANTS PASS") ||
    rWatchModel.includes("SUCCESS"),
    "Chained verify:renewal-watch-read-model passes"
  );
} catch (e) {
  assert(false, `verify:renewal-watch-read-model failed: ${e.message}`);
}

try {
  const f27aOutput = execSync('npm run verify:whatsapp-communication-foundation', { encoding: 'utf8' });
  assert(
    f27aOutput.includes("PASS — F.27A WHATSAPP COMMUNICATION FOUNDATION IMPLEMENTED"),
    "Chained verify:whatsapp-communication-foundation passes"
  );
} catch (e) {
  assert(false, `verify:whatsapp-communication-foundation failed: ${e.message}`);
}

try {
  const f27bOutput = execSync('npm run verify:trainer-daily-whatsapp-ui', { encoding: 'utf8' });
  assert(
    f27bOutput.includes("PASS — F.27B DAILY AGENDA WHATSAPP QUICK CONTACT IMPLEMENTED"),
    "Chained verify:trainer-daily-whatsapp-ui passes"
  );
} catch (e) {
  assert(false, `verify:trainer-daily-whatsapp-ui failed: ${e.message}`);
}

try {
  const f27cOutput = execSync('npm run verify:trainer-whatsapp-quick-messages', { encoding: 'utf8' });
  assert(
    f27cOutput.includes("PASS — F.27C TRAINER MEMBER WHATSAPP QUICK MESSAGES IMPLEMENTED"),
    "Chained verify:trainer-whatsapp-quick-messages passes"
  );
} catch (e) {
  assert(false, `verify:trainer-whatsapp-quick-messages failed: ${e.message}`);
}

console.log("\n=== 2. Shared Types & Deterministic Retention Message Builder ===");

const utilPath = path.resolve('src/admin/utils/whatsapp.ts');
assert(fs.existsSync(utilPath), "src/admin/utils/whatsapp.ts exists");
const utilSource = fs.readFileSync(utilPath, 'utf8');

assert(
  utilSource.includes("export type RenewalRetentionState"),
  "whatsapp.ts exports RenewalRetentionState type"
);
assert(
  utilSource.includes("export interface RenewalRetentionWhatsAppMessageInput"),
  "whatsapp.ts exports RenewalRetentionWhatsAppMessageInput interface"
);
assert(
  utilSource.includes("export function buildRenewalRetentionWhatsAppMessage"),
  "whatsapp.ts exports buildRenewalRetentionWhatsAppMessage function"
);

// Transpile and import helper dynamically
const transpiledUtil = ts.transpileModule(utilSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext }
});
const utilB64 = Buffer.from(transpiledUtil.outputText).toString('base64');
const {
  buildRenewalRetentionWhatsAppMessage,
  buildWhatsAppUrl,
  buildTrainerAppointmentWhatsAppMessage,
  buildTrainerWhatsAppQuickMessage
} = await import(`data:text/javascript;base64,${utilB64}`);

// Preserves existing F27B and F27C helpers
assert(
  typeof buildTrainerAppointmentWhatsAppMessage === 'function',
  "Existing buildTrainerAppointmentWhatsAppMessage helper is preserved"
);
assert(
  typeof buildTrainerWhatsAppQuickMessage === 'function',
  "Existing buildTrainerWhatsAppQuickMessage helper is preserved"
);

// State constraints (exactly 3 states)
const stateMatches = utilSource.match(/export type RenewalRetentionState\s*=\s*([^;]+);/);
assert(stateMatches !== null, "RenewalRetentionState type definition extractable");
const states = (stateMatches ? stateMatches[1] : '').replace(/['|\s]/g, ' ').trim().split(/\s+/);
assert(
  states.length === 3 && states.includes('expired') && states.includes('today') && states.includes('upcoming'),
  "RenewalRetentionState contains exactly 3 states: expired, today, upcoming"
);

// Exact messages with firstName = 'Ayşe'
const upcomingMsg = buildRenewalRetentionWhatsAppMessage({ state: 'upcoming', firstName: 'Ayşe' });
const todayMsg = buildRenewalRetentionWhatsAppMessage({ state: 'today', firstName: 'Ayşe' });
const expiredMsg = buildRenewalRetentionWhatsAppMessage({ state: 'expired', firstName: 'Ayşe' });

assert(
  upcomingMsg === "Merhaba Ayşe, SO3 PT üyeliğinin bitiş tarihi yaklaşıyor. Yenileme konusunda yardımcı olmak için yazıyorum.",
  "upcoming message matches: 'Merhaba Ayşe, SO3 PT üyeliğinin bitiş tarihi yaklaşıyor. Yenileme konusunda yardımcı olmak için yazıyorum.'"
);
assert(
  todayMsg === "Merhaba Ayşe, SO3 PT üyeliğin bugün sona eriyor. Yenileme konusunda yardımcı olmak için yazıyorum.",
  "today message matches: 'Merhaba Ayşe, SO3 PT üyeliğin bugün sona eriyor. Yenileme konusunda yardımcı olmak için yazıyorum.'"
);
assert(
  expiredMsg === "Merhaba Ayşe, SO3 PT üyeliğinin süresi doldu. Devam etmek istersen yenileme konusunda yardımcı olmak için yazıyorum.",
  "expired message matches: 'Merhaba Ayşe, SO3 PT üyeliğinin süresi doldu. Devam etmek istersen yenileme konusunda yardımcı olmak için yazıyorum.'"
);

// Empty name handling
const emptyUpcoming = buildRenewalRetentionWhatsAppMessage({ state: 'upcoming', firstName: '   ' });
const emptyToday = buildRenewalRetentionWhatsAppMessage({ state: 'today', firstName: '' });
const emptyExpired = buildRenewalRetentionWhatsAppMessage({ state: 'expired', firstName: '  \t  ' });

assert(!emptyUpcoming.includes("Merhaba ,"), "Empty upcoming name does NOT produce 'Merhaba ,'");
assert(!emptyToday.includes("Merhaba ,"), "Empty today name does NOT produce 'Merhaba ,'");
assert(!emptyExpired.includes("Merhaba ,"), "Empty expired name does NOT produce 'Merhaba ,'");

assert(
  emptyUpcoming === "Merhaba, SO3 PT üyeliğinin bitiş tarihi yaklaşıyor. Yenileme konusunda yardımcı olmak için yazıyorum.",
  "Empty firstName produces neutral fallback: 'Merhaba, SO3 PT üyeliğinin bitiş tarihi yaklaşıyor. Yenileme konusunda yardımcı olmak için yazıyorum.'"
);
assert(
  emptyToday === "Merhaba, SO3 PT üyeliğin bugün sona eriyor. Yenileme konusunda yardımcı olmak için yazıyorum.",
  "Empty firstName produces neutral fallback: 'Merhaba, SO3 PT üyeliğin bugün sona eriyor. Yenileme konusunda yardımcı olmak için yazıyorum.'"
);
assert(
  emptyExpired === "Merhaba, SO3 PT üyeliğinin süresi doldu. Devam etmek istersen yenileme konusunda yardımcı olmak için yazıyorum.",
  "Empty firstName produces neutral fallback: 'Merhaba, SO3 PT üyeliğinin süresi doldu. Devam etmek istersen yenileme konusunda yardımcı olmak için yazıyorum.'"
);

// Non-aggressive tone checks
const allRetention = [upcomingMsg, todayMsg, expiredMsg].join(' ');
assert(!allRetention.includes("Fırsatı kaçırma"), "Zero aggressive 'Fırsatı kaçırma' copy");
assert(!allRetention.includes("Son şans"), "Zero aggressive 'Son şans' copy");
assert(!allRetention.includes("Hemen yenile"), "Zero aggressive 'Hemen yenile' copy");
assert(!allRetention.includes("Kampanya"), "Zero marketing 'Kampanya' copy");
assert(!allRetention.includes("İndirim"), "Zero marketing 'İndirim' copy");

// Sensitive data exclusion
assert(!allRetention.includes("soyad"), "Zero surname in messages");
assert(!allRetention.includes("gün kaldı"), "Zero days_until_expiry recomputation in messages");
assert(!allRetention.includes("paket"), "Zero package mentions in messages");
assert(!allRetention.includes("ödeme") && !allRetention.includes("tahsilat"), "Zero financial data in messages");
assert(!allRetention.includes("ölçüm") && !allRetention.includes("sağlık"), "Zero health data in messages");
assert(!allRetention.includes("not"), "Zero internal notes in messages");

// URI encoding verification
const testPhone = '05551234567';
const upcomingUrl = buildWhatsAppUrl(testPhone, upcomingMsg);
assert(
  upcomingUrl && upcomingUrl.startsWith("https://wa.me/905551234567?text=") &&
  upcomingUrl.includes(encodeURIComponent(upcomingMsg)),
  "upcoming retention message is properly URI-encoded in wa.me URL"
);
const todayUrl = buildWhatsAppUrl(testPhone, todayMsg);
assert(
  todayUrl && todayUrl.startsWith("https://wa.me/905551234567?text=") &&
  todayUrl.includes(encodeURIComponent(todayMsg)),
  "today retention message is properly URI-encoded in wa.me URL"
);
const expiredUrl = buildWhatsAppUrl(testPhone, expiredMsg);
assert(
  expiredUrl && expiredUrl.startsWith("https://wa.me/905551234567?text=") &&
  expiredUrl.includes(encodeURIComponent(expiredMsg)),
  "expired retention message is properly URI-encoded in wa.me URL"
);

console.log("\n=== 3. Panel Integration (ReceptionRenewalWatchPanel.tsx) ===");

const panelPath = path.resolve('src/admin/pages/reception/ReceptionRenewalWatchPanel.tsx');
assert(fs.existsSync(panelPath), "ReceptionRenewalWatchPanel.tsx exists");
const panelSource = fs.readFileSync(panelPath, 'utf8');

assert(
  panelSource.includes("import { WhatsAppContactLink }") || panelSource.includes("import {WhatsAppContactLink}"),
  "ReceptionRenewalWatchPanel imports WhatsAppContactLink"
);
assert(
  panelSource.includes("buildRenewalRetentionWhatsAppMessage"),
  "ReceptionRenewalWatchPanel uses buildRenewalRetentionWhatsAppMessage helper"
);

// Passes item.renewal_state and item.first_name to message builder
assert(
  panelSource.includes("state: item.renewal_state") && panelSource.includes("firstName: item.first_name"),
  "Panel passes authoritative item.renewal_state and item.first_name to message builder"
);

// Renders WhatsAppContactLink with item.phone and label='WhatsApp'
assert(
  panelSource.includes("phone={item.phone}"),
  "Panel binds item.phone to WhatsAppContactLink"
);
assert(
  panelSource.includes('label="WhatsApp"'),
  "Panel renders label='WhatsApp' on outreach button"
);
assert(
  panelSource.includes("showDisabledIfInvalid={false}"),
  "Panel specifies showDisabledIfInvalid={false} for clean absence on invalid phone"
);

// Existing Yenile action preserved and delegated
assert(
  panelSource.includes("onRenew(item)"),
  "Panel retains canonical onRenew(item) delegation"
);
assert(
  panelSource.includes("disabled={mutationBusy}"),
  "Panel retains mutationBusy lock on renewal button"
);
assert(
  panelSource.includes("Üyeliği Yenile") || panelSource.includes("Yenileniyor..."),
  "Panel retains existing 'Üyeliği Yenile' action"
);

// Exactly one WhatsAppContactLink per row
const linkMatches = panelSource.match(/<WhatsAppContactLink/g) || [];
assert(
  linkMatches.length === 1,
  "Exactly one WhatsAppContactLink instance rendered per item row in items.map"
);

// No browser date derivation for state logic
assert(
  !panelSource.includes("new Date(item.membership_end_date)") &&
  !panelSource.includes("Date.now()") &&
  !panelSource.includes("getTime()"),
  "Panel does NOT compute retention state from browser dates (server renewal_state is authoritative)"
);

// Negative checks: no raw wa.me or window.open in panel
assert(
  !panelSource.includes("wa.me/"),
  "Zero raw wa.me construction in ReceptionRenewalWatchPanel"
);
assert(
  !panelSource.includes("window.open"),
  "Zero window.open in ReceptionRenewalWatchPanel"
);

console.log("\n=== 4. Anti-Feature, Anti-CRM & Anti-Tracking Invariants ===");

assert(!panelSource.includes("contacted_at"), "Zero contacted_at tracking in panel");
assert(!panelSource.includes("last_contacted"), "Zero last_contacted tracking in panel");
assert(!panelSource.includes("message_sent"), "Zero message_sent tracking in panel");
assert(!panelSource.includes("whatsapp_sent"), "Zero whatsapp_sent tracking in panel");
assert(!panelSource.includes("outreach_status"), "Zero outreach_status tracking in panel");
assert(!panelSource.includes("retention_score"), "Zero retention_score in panel");
assert(!panelSource.includes("churn_score"), "Zero churn_score in panel");
assert(!panelSource.includes("Mesaj Gönderildi") && !panelSource.includes("İletişime Geçildi"), "Zero false delivery claims");

// No backend mutations
assert(
  !panelSource.includes("apiClient.post") &&
  !panelSource.includes("apiClient.patch") &&
  !panelSource.includes("apiClient.put") &&
  !panelSource.includes("apiClient.delete"),
  "ReceptionRenewalWatchPanel remains strictly GET-only (zero contact or renewal mutations in panel)"
);

console.log("\n=== 5. Documentation & Registration ===");

const decPath = path.resolve('DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decSource = fs.readFileSync(decPath, 'utf8');

assert(
  decSource.includes("## F.28A Renewal Retention Quick Actions"),
  "DECISIONS.md documents '## F.28A Renewal Retention Quick Actions'"
);

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts['verify:renewal-retention-actions'] === 'node scripts/verify-renewal-retention-actions.mjs',
  "package.json registers 'verify:renewal-retention-actions'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ F.28A Renewal Retention Quick Actions verification FAILED");
  process.exit(1);
} else {
  console.log("PASS — F.28A RENEWAL RETENTION QUICK ACTIONS IMPLEMENTED");
}
