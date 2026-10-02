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
  const f27aOutput = execSync('npm run verify:whatsapp-communication-foundation', { encoding: 'utf8' });
  assert(
    f27aOutput.includes("PASS — F.27A WHATSAPP COMMUNICATION FOUNDATION IMPLEMENTED") ||
    f27aOutput.includes("PASS — F.27A WHATSAPP COMMUNICATION FOUNDATION CLOSED"),
    "Chained F.27A WhatsApp foundation verifier passes"
  );
} catch (e) {
  assert(false, `F.27A foundation verifier failed: ${e.message}`);
}

try {
  const f27bOutput = execSync('npm run verify:trainer-daily-whatsapp-ui', { encoding: 'utf8' });
  assert(
    f27bOutput.includes("PASS — F.27B DAILY AGENDA WHATSAPP QUICK CONTACT IMPLEMENTED"),
    "Chained F.27B Daily Agenda WhatsApp verifier passes"
  );
} catch (e) {
  assert(false, `F.27B Daily Agenda WhatsApp verifier failed: ${e.message}`);
}

console.log("\n=== 2. Shared Types & Deterministic Message Builder ===");

const utilPath = path.resolve('src/admin/utils/whatsapp.ts');
assert(fs.existsSync(utilPath), "src/admin/utils/whatsapp.ts exists");
const utilSource = fs.readFileSync(utilPath, 'utf8');

assert(
  utilSource.includes("export type TrainerWhatsAppQuickMessageKind"),
  "whatsapp.ts exports TrainerWhatsAppQuickMessageKind type"
);
assert(
  utilSource.includes("export interface TrainerWhatsAppQuickMessageInput"),
  "whatsapp.ts exports TrainerWhatsAppQuickMessageInput interface"
);
assert(
  utilSource.includes("export function buildTrainerWhatsAppQuickMessage"),
  "whatsapp.ts exports buildTrainerWhatsAppQuickMessage function"
);

// Transpile and import helper dynamically
const transpiledUtil = ts.transpileModule(utilSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext }
});
const utilB64 = Buffer.from(transpiledUtil.outputText).toString('base64');
const {
  buildTrainerWhatsAppQuickMessage,
  buildWhatsAppUrl,
  buildTrainerAppointmentWhatsAppMessage
} = await import(`data:text/javascript;base64,${utilB64}`);

// Preserves F27B helper
assert(
  typeof buildTrainerAppointmentWhatsAppMessage === 'function',
  "Existing buildTrainerAppointmentWhatsAppMessage helper is preserved"
);

// Exact messages with firstName
const generalMsg = buildTrainerWhatsAppQuickMessage({ kind: 'general', firstName: 'Ayşe' });
const apptMsg = buildTrainerWhatsAppQuickMessage({ kind: 'appointment_reminder', firstName: 'Ayşe' });
const followUpMsg = buildTrainerWhatsAppQuickMessage({ kind: 'follow_up', firstName: 'Ayşe' });

assert(
  generalMsg === "Merhaba Ayşe, SO3 PT'den seninle iletişime geçiyorum.",
  "general message matches: 'Merhaba Ayşe, SO3 PT'den seninle iletişime geçiyorum.'"
);
assert(
  apptMsg === "Merhaba Ayşe, yaklaşan SO3 PT seansını hatırlatmak için yazıyorum.",
  "appointment_reminder message matches: 'Merhaba Ayşe, yaklaşan SO3 PT seansını hatırlatmak için yazıyorum.'"
);
assert(
  followUpMsg === "Merhaba Ayşe, antrenman sürecinin nasıl gittiğini öğrenmek için yazıyorum.",
  "follow_up message matches: 'Merhaba Ayşe, antrenman sürecinin nasıl gittiğini öğrenmek için yazıyorum.'"
);

// Empty name handling
const emptyGeneral = buildTrainerWhatsAppQuickMessage({ kind: 'general', firstName: '   ' });
const emptyAppt = buildTrainerWhatsAppQuickMessage({ kind: 'appointment_reminder', firstName: '' });
const emptyFollowUp = buildTrainerWhatsAppQuickMessage({ kind: 'follow_up', firstName: '  \t  ' });

assert(!emptyGeneral.includes("Merhaba ,"), "Empty name does NOT produce 'Merhaba ,'");
assert(!emptyAppt.includes("Merhaba ,"), "Empty appointment name does NOT produce 'Merhaba ,'");
assert(!emptyFollowUp.includes("Merhaba ,"), "Empty follow-up name does NOT produce 'Merhaba ,'");

assert(
  emptyGeneral === "Merhaba, SO3 PT'den seninle iletişime geçiyorum.",
  "Empty firstName produces neutral fallback: 'Merhaba, SO3 PT'den seninle iletişime geçiyorum.'"
);
assert(
  emptyAppt === "Merhaba, yaklaşan SO3 PT seansını hatırlatmak için yazıyorum.",
  "Empty firstName produces neutral fallback: 'Merhaba, yaklaşan SO3 PT seansını hatırlatmak için yazıyorum.'"
);
assert(
  emptyFollowUp === "Merhaba, antrenman sürecinin nasıl gittiğini öğrenmek için yazıyorum.",
  "Empty firstName produces neutral fallback: 'Merhaba, antrenman sürecinin nasıl gittiğini öğrenmek için yazıyorum.'"
);

// URI Encoding tests
const testPhone = '05551234567';
const generalUrl = buildWhatsAppUrl(testPhone, generalMsg);
assert(
  generalUrl && generalUrl.startsWith("https://wa.me/905551234567?text=") &&
  generalUrl.includes(encodeURIComponent(generalMsg)),
  "general quick message is properly URI-encoded in wa.me URL"
);
const apptUrl = buildWhatsAppUrl(testPhone, apptMsg);
assert(
  apptUrl && apptUrl.startsWith("https://wa.me/905551234567?text=") &&
  apptUrl.includes(encodeURIComponent(apptMsg)),
  "appointment quick message is properly URI-encoded in wa.me URL"
);
const followUpUrl = buildWhatsAppUrl(testPhone, followUpMsg);
assert(
  followUpUrl && followUpUrl.startsWith("https://wa.me/905551234567?text=") &&
  followUpUrl.includes(encodeURIComponent(followUpMsg)),
  "follow_up quick message is properly URI-encoded in wa.me URL"
);

// Kind constraints (exactly 3 intents)
const kindMatches = utilSource.match(/export type TrainerWhatsAppQuickMessageKind\s*=\s*([^;]+);/);
assert(kindMatches !== null, "TrainerWhatsAppQuickMessageKind type definition extractable");
const kinds = (kindMatches ? kindMatches[1] : '').replace(/['|\s]/g, ' ').trim().split(/\s+/);
assert(
  kinds.length === 3 && kinds.includes('general') && kinds.includes('appointment_reminder') && kinds.includes('follow_up'),
  "TrainerWhatsAppQuickMessageKind contains exactly 3 intents: general, appointment_reminder, follow_up"
);

// Negative message template contents (anti-leakage)
const allMessages = [generalMsg, apptMsg, followUpMsg].join(' ');
assert(!allMessages.includes("soyad"), "Zero surname mentions in quick messages");
assert(!allMessages.includes("sağlık"), "Zero health data in quick messages");
assert(!allMessages.includes("ölçüm"), "Zero measurement data in quick messages");
assert(!allMessages.includes("paket"), "Zero package data in quick messages");
assert(!allMessages.includes("kalan"), "Zero remaining session data in quick messages");
assert(!allMessages.includes("ödeme"), "Zero payment data in quick messages");
assert(!allMessages.includes("gelmedi"), "Zero attendance/no-show accusations in quick messages");

console.log("\n=== 3. UI Component (TrainerWhatsAppQuickActions) ===");

const compPath = path.resolve('src/admin/components/TrainerWhatsAppQuickActions.tsx');
assert(fs.existsSync(compPath), "TrainerWhatsAppQuickActions.tsx exists");
const compSource = fs.readFileSync(compPath, 'utf8');

assert(
  compSource.includes("import { WhatsAppContactLink }") || compSource.includes("import {WhatsAppContactLink}"),
  "TrainerWhatsAppQuickActions imports WhatsAppContactLink"
);
assert(
  compSource.includes("buildTrainerWhatsAppQuickMessage"),
  "TrainerWhatsAppQuickActions uses buildTrainerWhatsAppQuickMessage helper"
);
assert(
  compSource.includes("normalizeWhatsAppPhone"),
  "TrainerWhatsAppQuickActions uses normalizeWhatsAppPhone to check availability"
);

// Exactly 3 action labels
assert(compSource.includes('label="Genel İletişim"'), "Contains 'Genel İletişim' action");
assert(compSource.includes('label="Randevu Hatırlatma"'), "Contains 'Randevu Hatırlatma' action");
assert(compSource.includes('label="Takip Mesajı"'), "Contains 'Takip Mesajı' action");

// Single bounded invalid state
assert(
  compSource.includes("WhatsApp hızlı mesajları için geçerli bir cep telefonu numarası gerekli."),
  "Renders single bounded invalid phone fallback message"
);

// Header / Section title
assert(
  compSource.includes("WhatsApp Hızlı Mesaj"),
  "Renders 'WhatsApp Hızlı Mesaj' section header"
);

// Responsive mobile grid
assert(
  compSource.includes("grid grid-cols-1 sm:grid-cols-3") || compSource.includes("grid-cols-1"),
  "Uses responsive mobile-first grid layout"
);

// Negative checks in component
assert(!compSource.includes("wa.me/"), "Zero raw wa.me link construction in TrainerWhatsAppQuickActions");
assert(!compSource.includes("apiClient."), "Zero API client mutations in TrainerWhatsAppQuickActions");
assert(!compSource.includes("window.open"), "Zero window.open in TrainerWhatsAppQuickActions");
assert(!compSource.includes("<textarea") && !compSource.includes("<input type=\"text\""), "Zero free-text composer / textarea");

console.log("\n=== 4. TrainerMemberDetail Integration ===");

const detailPath = path.resolve('src/admin/pages/trainer-members/TrainerMemberDetail.tsx');
assert(fs.existsSync(detailPath), "TrainerMemberDetail.tsx exists");
const detailSource = fs.readFileSync(detailPath, 'utf8');

assert(
  detailSource.includes("import { TrainerWhatsAppQuickActions }") || detailSource.includes("import {TrainerWhatsAppQuickActions}"),
  "TrainerMemberDetail imports TrainerWhatsAppQuickActions"
);

// Render count is exactly once
const renderMatches = detailSource.match(/<TrainerWhatsAppQuickActions/g) || [];
assert(renderMatches.length === 1, "TrainerWhatsAppQuickActions is rendered exactly once");

// Existing direct WhatsAppContactLink links preserved
const directMatches = detailSource.match(/<WhatsAppContactLink/g) || [];
assert(
  directMatches.length === 2,
  "Existing direct WhatsAppContactLink actions preserved (header + contact card)"
);

// Placed after workspace nav
const navIdx = detailSource.indexOf("<TrainerMemberWorkspaceNav");
const quickActionsIdx = detailSource.indexOf("<TrainerWhatsAppQuickActions");
assert(
  navIdx !== -1 && quickActionsIdx !== -1 && quickActionsIdx > navIdx,
  "TrainerWhatsAppQuickActions is placed after TrainerMemberWorkspaceNav"
);

console.log("\n=== 5. Anti-Feature & Zero-Automation Invariants ===");

const combinedSource = utilSource + compSource + detailSource;

assert(!combinedSource.includes("graph.facebook.com"), "Zero Facebook/Meta API endpoints");
assert(!combinedSource.includes("phone_number_id"), "Zero phone_number_id parameter");
assert(!combinedSource.includes("WHATSAPP_TOKEN"), "Zero WhatsApp Business API tokens");
assert(!combinedSource.includes("webhook"), "Zero webhooks");
assert(!combinedSource.includes("sendMessage("), "Zero automated message sending calls");
assert(!combinedSource.includes("contacted_at"), "Zero contacted_at timestamp persistence");
assert(!combinedSource.includes("message_history"), "Zero message_history database persistence");
assert(!combinedSource.includes("Gönderildi") && !combinedSource.includes("Mesaj gönderildi"), "Zero false delivery claims");

console.log("\n=== 6. Documentation & Registration ===");

const decPath = path.resolve('DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decSource = fs.readFileSync(decPath, 'utf8');

assert(
  decSource.includes("## F.27C Trainer Member WhatsApp Quick Messages"),
  "DECISIONS.md documents '## F.27C Trainer Member WhatsApp Quick Messages'"
);

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts['verify:trainer-whatsapp-quick-messages'] === 'node scripts/verify-trainer-whatsapp-quick-messages.mjs',
  "package.json registers 'verify:trainer-whatsapp-quick-messages'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ F.27C Trainer Member WhatsApp Quick Messages verification FAILED");
  process.exit(1);
} else {
  console.log("PASS — F.27C TRAINER MEMBER WHATSAPP QUICK MESSAGES IMPLEMENTED");
}
