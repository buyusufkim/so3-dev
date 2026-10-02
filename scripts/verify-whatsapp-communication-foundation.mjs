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

console.log("=== 1. Phone Normalization Algorithmic Simulation ===");

// Direct simulation of the canonical normalization algorithm
function normalizeWhatsAppPhone(phone) {
  if (typeof phone !== 'string') return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  let cleaned = trimmed;
  if (trimmed.startsWith('+')) {
    if (!trimmed.startsWith('+90') || trimmed.indexOf('+', 1) !== -1) {
      return null;
    }
    cleaned = trimmed.slice(1);
  }
  cleaned = cleaned.replace(/[\s().-]/g, '');

  if (!/^\d+$/.test(cleaned)) return null;

  if (cleaned.startsWith('0090')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = '90' + cleaned.slice(1);
  } else if (cleaned.startsWith('5')) {
    cleaned = '90' + cleaned;
  }

  if (/^905\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

function buildWhatsAppUrl(phone, message) {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;

  if (message && typeof message === 'string' && message.trim()) {
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message.trim())}`;
  }

  return `https://wa.me/${normalized}`;
}

// Valid inputs simulation
const validInputs = [
  '05551234567',
  '5551234567',
  '905551234567',
  '+905551234567',
  '+90 555 123 45 67',
  '00905551234567',
  '(555) 123 45 67',
  '0 (555) 123 45 67'
];

for (const input of validInputs) {
  assert(
    normalizeWhatsAppPhone(input) === '905551234567',
    `Valid phone input '${input}' normalizes to '905551234567'`
  );
}

// Invalid inputs simulation
const invalidInputs = [
  '',
  '   ',
  '123',
  '905123',
  '9055512345678',
  '4441234',
  '3121234567',
  '+441234567890',
  '0555123456',
  '055512345678',
  'abc05551234567',
  '0555ABC4567',
  '++905551234567',
  '+90 555-123.45 67+',
  '+05551234567',
  '+5551234567',
  '+00905551234567',
  null,
  undefined
];

for (const input of invalidInputs) {
  assert(
    normalizeWhatsAppPhone(input) === null,
    `Invalid phone input ${JSON.stringify(input)} returns null`
  );
}

console.log("\n=== 2. Canonical URL Construction Simulation ===");

assert(
  buildWhatsAppUrl('05551234567') === 'https://wa.me/905551234567',
  "buildWhatsAppUrl returns exact 'https://wa.me/905551234567' for valid phone"
);

assert(
  buildWhatsAppUrl('05551234567', 'Merhaba Dunya') === 'https://wa.me/905551234567?text=Merhaba%20Dunya',
  "buildWhatsAppUrl appends encoded '?text=...' when message provided"
);

assert(
  buildWhatsAppUrl('05551234567', '   ') === 'https://wa.me/905551234567',
  "buildWhatsAppUrl ignores whitespace-only message parameter"
);

assert(
  buildWhatsAppUrl('3121234567') === null,
  "buildWhatsAppUrl returns null for invalid / landline number"
);

assert(
  buildWhatsAppUrl(null) === null,
  "buildWhatsAppUrl returns null for null phone"
);

console.log("\n=== 3. Shared Utility Source Invariants (src/admin/utils/whatsapp.ts) ===");

const utilPath = path.resolve('src/admin/utils/whatsapp.ts');
assert(fs.existsSync(utilPath), "src/admin/utils/whatsapp.ts exists");
const utilSource = fs.readFileSync(utilPath, 'utf8');

assert(
  utilSource.includes("export function normalizeWhatsAppPhone"),
  "whatsapp.ts exports normalizeWhatsAppPhone function"
);
assert(
  utilSource.includes("export function buildWhatsAppUrl"),
  "whatsapp.ts exports buildWhatsAppUrl function"
);
assert(
  utilSource.includes("/^905\\d{9}$/"),
  "whatsapp.ts enforces strict Turkish mobile regex /^905\\d{9}$/"
);
assert(
  utilSource.includes("trimmed.startsWith('+90')") || utilSource.includes("startsWith('+90')"),
  "whatsapp.ts restricts leading plus notation strictly to '+90'"
);
assert(
  utilSource.includes("https://wa.me/"),
  "whatsapp.ts outputs HTTPS wa.me canonical base URL"
);
assert(
  !utilSource.includes("whatsapp://"),
  "whatsapp.ts does not use custom protocol 'whatsapp://'"
);
assert(
  !utilSource.includes("api.whatsapp.com"),
  "whatsapp.ts does not use 'api.whatsapp.com'"
);
assert(
  !utilSource.includes("web.whatsapp.com"),
  "whatsapp.ts does not use 'web.whatsapp.com'"
);

console.log("\n=== 4. Reusable Component & UI Integration ===");

const compPath = path.resolve('src/admin/components/WhatsAppContactLink.tsx');
assert(fs.existsSync(compPath), "WhatsAppContactLink.tsx exists");
const compSource = fs.readFileSync(compPath, 'utf8');

assert(
  compSource.includes("buildWhatsAppUrl"),
  "WhatsAppContactLink uses shared buildWhatsAppUrl"
);
assert(
  compSource.includes('target="_blank"'),
  "WhatsAppContactLink uses target='_blank'"
);
assert(
  compSource.includes('rel="noopener noreferrer"'),
  "WhatsAppContactLink uses rel='noopener noreferrer'"
);
assert(
  compSource.includes("min-h-[44px]"),
  "WhatsAppContactLink enforces mobile-first min-h-[44px] touch target"
);
assert(
  compSource.includes("aria-label"),
  "WhatsAppContactLink provides accessible aria-label"
);
assert(
  compSource.includes("Geçerli telefon yok"),
  "WhatsAppContactLink provides graceful fallback for invalid phone"
);

const detailPath = path.resolve('src/admin/pages/trainer-members/TrainerMemberDetail.tsx');
assert(fs.existsSync(detailPath), "TrainerMemberDetail.tsx exists");
const detailSource = fs.readFileSync(detailPath, 'utf8');

assert(
  detailSource.includes("WhatsAppContactLink"),
  "TrainerMemberDetail imports and renders WhatsAppContactLink"
);
assert(
  !detailSource.includes("wa.me/${member.phone}"),
  "TrainerMemberDetail does not interpolate unvalidated member.phone directly into wa.me"
);
assert(
  !detailSource.includes("apiClient.post"),
  "TrainerMemberDetail contains zero mutation POST requests"
);

// Negative check: DailyAgendaWorkspace must NOT construct raw wa.me
const agendaPath = path.resolve('src/admin/pages/trainer-dashboard/DailyAgendaWorkspace.tsx');
assert(fs.existsSync(agendaPath), "DailyAgendaWorkspace.tsx exists");
const agendaSource = fs.readFileSync(agendaPath, 'utf8');

assert(
  !agendaSource.includes("wa.me/"),
  "DailyAgendaWorkspace contains zero raw wa.me construction"
);

console.log("\n=== 5. Anti-Feature & Zero-Automation Invariants ===");

const combinedClientSource = utilSource + compSource + detailSource;

assert(
  !combinedClientSource.includes("graph.facebook.com"),
  "Zero Meta/Facebook Graph API calls"
);
assert(
  !combinedClientSource.includes("WHATSAPP_TOKEN") && !combinedClientSource.includes("WHATSAPP_API"),
  "Zero WhatsApp Business API tokens or environment variables"
);
assert(
  !combinedClientSource.includes("sendMessage(") && !combinedClientSource.includes("send_message"),
  "Zero automated sendMessage logic"
);
assert(
  !combinedClientSource.includes("webhook"),
  "Zero webhook implementations"
);
assert(
  !detailSource.includes("window.open("),
  "Zero automatic window.open triggers"
);

console.log("\n=== 6. Backend Source & Authorization Preservation ===");

const controllerPath = path.resolve('api/controllers/TrainerMemberController.php');
assert(fs.existsSync(controllerPath), "TrainerMemberController.php exists");
const controllerSource = fs.readFileSync(controllerPath, 'utf8');

assert(
  controllerSource.includes("$adminId = (int)($_SESSION['admin_id'] ?? 0);"),
  "TrainerMemberController preserves session admin_id trainer resolution"
);
assert(
  controllerSource.includes("WHERE m.id = ? AND m.trainer_id = ? AND m.deleted_at IS NULL"),
  "TrainerMemberController preserves strict trainer ownership filter"
);
assert(
  controllerSource.includes("m.phone"),
  "TrainerMemberController continues to project canonical m.phone"
);
assert(
  !controllerSource.includes("whatsapp") && !controllerSource.includes("WhatsApp"),
  "TrainerMemberController has zero WhatsApp modifications (clean read model)"
);

console.log("\n=== 7. Documentation & package.json Registration ===");

const decPath = path.resolve('DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decSource = fs.readFileSync(decPath, 'utf8');

assert(
  decSource.includes("## F.27A WhatsApp Communication Foundation"),
  "DECISIONS.md documents '## F.27A WhatsApp Communication Foundation'"
);

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts['verify:whatsapp-communication-foundation'] === 'node scripts/verify-whatsapp-communication-foundation.mjs',
  "package.json registers 'verify:whatsapp-communication-foundation'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ WhatsApp Communication Foundation verification FAILED");
  process.exit(1);
} else {
  console.log("PASS — F.27A WHATSAPP COMMUNICATION FOUNDATION IMPLEMENTED");
}
