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
  const f26aOutput = execSync('npm run verify:trainer-daily-agenda', { encoding: 'utf8' });
  assert(
    f26aOutput.includes("PASS — F.26A TRAINER DAILY AGENDA READ MODEL FOUNDATION CLOSED"),
    "Chained F.26A daily agenda backend foundation verifier passes"
  );
} catch (e) {
  assert(false, `F.26A backend foundation verifier failed: ${e.message}`);
}

try {
  const f26bOutput = execSync('npm run verify:trainer-daily-agenda-ui', { encoding: 'utf8' });
  assert(
    f26bOutput.includes("PASS — F.26B TRAINER DAILY AGENDA UI CLOSED"),
    "Chained F.26B daily agenda UI verifier passes"
  );
} catch (e) {
  assert(false, `F.26B daily agenda UI verifier failed: ${e.message}`);
}

try {
  const f26cOutput = execSync('npm run verify:trainer-daily-terminalization-ui', { encoding: 'utf8' });
  assert(
    f26cOutput.includes("PASS — F.26C DAILY APPOINTMENT TERMINALIZATION ACTIONS IMPLEMENTED"),
    "Chained F.26C terminalization UI verifier passes"
  );
} catch (e) {
  assert(false, `F.26C terminalization UI verifier failed: ${e.message}`);
}

console.log("\n=== 2. Backend Privacy & Contact Phone Projection Invariants ===");

const controllerPath = path.resolve('api/controllers/TrainerDailyAgendaController.php');
assert(fs.existsSync(controllerPath), "TrainerDailyAgendaController.php exists");
const controllerSource = fs.readFileSync(controllerPath, 'utf8');

assert(
  controllerSource.includes("m.phone AS m_phone"),
  "Appointments query projects m.phone AS m_phone from joined member"
);

// Single joined query assertion - no N+1 query loop
const queryExecMatches = controllerSource.match(/\$apptStmt->execute\(\)/g) || [];
assert(
  queryExecMatches.length === 1,
  "Exactly one appointments query execution in index handler (zero N+1 member lookups)"
);

assert(
  controllerSource.includes("$status === 'scheduled' && $row['m_phone'] !== null"),
  "Phone projection strictly conditioned on status === 'scheduled' and non-null DB value"
);

assert(
  controllerSource.includes("$contactPhone = null;"),
  "Contact phone defaults to null (guaranteeing null for terminal historical appointments)"
);

assert(
  controllerSource.includes("'phone' => $contactPhone"),
  "Member projection maps 'phone' => $contactPhone"
);

// Scheduled member ownership integrity preserved
assert(
  controllerSource.includes("(int)$row['m_trainer_id'] !== $trainerId || $row['m_deleted_at'] !== null"),
  "Scheduled member ownership fail-closed integrity preserved"
);

// Anti-PII leakage checks on daily agenda projection
assert(!controllerSource.includes("m_email") && !controllerSource.includes("m.email"), "Zero member email in daily agenda query");
assert(!controllerSource.includes("m_notes") && !controllerSource.includes("m.notes"), "Zero member notes in daily agenda query");
assert(!controllerSource.includes("emergency_contact"), "Zero emergency contact in daily agenda query");
assert(!controllerSource.includes("health_data"), "Zero health data in daily agenda query");

console.log("\n=== 3. TypeScript Foundation & Strict Phone Validator ===");

const typesPath = path.resolve('src/admin/pages/trainer-dashboard/types.ts');
assert(fs.existsSync(typesPath), "types.ts exists");
const typesSource = fs.readFileSync(typesPath, 'utf8');

assert(
  typesSource.includes("phone: string | null;"),
  "TrainerDailyAgendaMember contract specifies 'phone: string | null'"
);

const transpiledTypes = ts.transpileModule(typesSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext }
});
const typesB64 = Buffer.from(transpiledTypes.outputText).toString('base64');
const { validateTrainerDailyAgenda, isTrainerDailyAgenda } = await import(`data:text/javascript;base64,${typesB64}`);

const baseValidPayload = {
  timezone: 'Europe/Istanbul',
  business_date: '2026-10-01',
  generated_at: '2026-10-01 10:30:00',
  trainer: { id: 1, name: 'Eğitmen Test' },
  summary: {
    total: 2,
    scheduled: 1,
    completed: 1,
    no_show: 0,
    cancelled: 0,
    remaining_scheduled: 1,
    past_due_scheduled: 0
  },
  focus: {
    current: null,
    next: {
      id: 101,
      uuid: 'uuid-101',
      starts_at: '2026-10-01 14:00:00',
      ends_at: '2026-10-01 15:00:00',
      status: 'scheduled',
      member: { id: 50, uuid: 'm-50', first_name: 'Ahmet', last_name: 'Yılmaz', phone: '05551234567' },
      session_package: null,
      temporal_state: 'upcoming'
    }
  },
  needs_terminalization: [],
  appointments: [
    {
      id: 100,
      uuid: 'uuid-100',
      starts_at: '2026-10-01 09:00:00',
      ends_at: '2026-10-01 10:00:00',
      status: 'completed',
      member: { id: 51, uuid: 'm-51', first_name: 'Zeynep', last_name: 'Kaya', phone: null },
      session_package: null,
      temporal_state: 'terminal'
    },
    {
      id: 101,
      uuid: 'uuid-101',
      starts_at: '2026-10-01 14:00:00',
      ends_at: '2026-10-01 15:00:00',
      status: 'scheduled',
      member: { id: 50, uuid: 'm-50', first_name: 'Ahmet', last_name: 'Yılmaz', phone: '05551234567' },
      session_package: null,
      temporal_state: 'upcoming'
    }
  ]
};

assert(isTrainerDailyAgenda(baseValidPayload) === true, "Validator accepts canonical valid agenda with scheduled phone string and terminal phone null");

// Scheduled phone null accepted
const scheduledPhoneNullPayload = {
  ...baseValidPayload,
  focus: {
    ...baseValidPayload.focus,
    next: {
      ...baseValidPayload.focus.next,
      member: { ...baseValidPayload.focus.next.member, phone: null }
    }
  },
  appointments: [
    baseValidPayload.appointments[0],
    {
      ...baseValidPayload.appointments[1],
      member: { ...baseValidPayload.appointments[1].member, phone: null }
    }
  ]
};
assert(isTrainerDailyAgenda(scheduledPhoneNullPayload) === true, "Validator accepts scheduled appointment with null phone");

// Terminal appointment with phone string MUST be rejected (critical privacy invariant)
const terminalPhoneLeakedPayload = {
  ...baseValidPayload,
  appointments: [
    {
      ...baseValidPayload.appointments[0],
      member: { ...baseValidPayload.appointments[0].member, phone: '05559876543' }
    },
    baseValidPayload.appointments[1]
  ]
};
assert(isTrainerDailyAgenda(terminalPhoneLeakedPayload) === false, "Validator strictly rejects terminal appointment with non-null phone");

// Whitespace-only phone rejected
const whitespacePhonePayload = {
  ...baseValidPayload,
  appointments: [
    baseValidPayload.appointments[0],
    {
      ...baseValidPayload.appointments[1],
      member: { ...baseValidPayload.appointments[1].member, phone: '   ' }
    }
  ]
};
assert(isTrainerDailyAgenda(whitespacePhonePayload) === false, "Validator strictly rejects whitespace-only phone string");

console.log("\n=== 4. Deterministic Message Template Helper ===");

const utilPath = path.resolve('src/admin/utils/whatsapp.ts');
assert(fs.existsSync(utilPath), "src/admin/utils/whatsapp.ts exists");
const utilSource = fs.readFileSync(utilPath, 'utf8');

assert(
  utilSource.includes("export function buildTrainerAppointmentWhatsAppMessage"),
  "whatsapp.ts exports buildTrainerAppointmentWhatsAppMessage helper"
);

const transpiledUtil = ts.transpileModule(utilSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext }
});
const utilB64 = Buffer.from(transpiledUtil.outputText).toString('base64');
const { buildTrainerAppointmentWhatsAppMessage, buildWhatsAppUrl } = await import(`data:text/javascript;base64,${utilB64}`);

const sampleMsg = buildTrainerAppointmentWhatsAppMessage({
  firstName: "Ayşe",
  startTime: "14:30"
});
const expectedMsg = "Merhaba Ayşe, bugün saat 14:30 için planlanan SO3 PT seansınla ilgili yazıyorum.";
assert(
  sampleMsg === expectedMsg,
  `Message helper matches exact required text: '${expectedMsg}'`
);

const sampleUrl = buildWhatsAppUrl('05551234567', sampleMsg);
assert(
  sampleUrl.startsWith("https://wa.me/905551234567?text=") &&
  sampleUrl.includes(encodeURIComponent(expectedMsg)),
  "Message is properly URI-encoded in canonical wa.me URL"
);

// Anti-content invariant
assert(!sampleMsg.includes("paket"), "Zero package mentions in message template");
assert(!sampleMsg.includes("sağlık"), "Zero health data in message template");
assert(!sampleMsg.includes("ödeme"), "Zero payment data in message template");
assert(!sampleMsg.includes("gelmediniz"), "Zero no-show accusation in message template");

console.log("\n=== 5. DailyAgendaWorkspace UI Integration & Section Scoping ===");

const workspacePath = path.resolve('src/admin/pages/trainer-dashboard/DailyAgendaWorkspace.tsx');
assert(fs.existsSync(workspacePath), "DailyAgendaWorkspace.tsx exists");
const workspaceSource = fs.readFileSync(workspacePath, 'utf8');

assert(
  workspaceSource.includes("import { WhatsAppContactLink }") ||
  workspaceSource.includes("import {WhatsAppContactLink}"),
  "DailyAgendaWorkspace imports WhatsAppContactLink component"
);
assert(
  workspaceSource.includes("buildTrainerAppointmentWhatsAppMessage"),
  "DailyAgendaWorkspace uses buildTrainerAppointmentWhatsAppMessage helper"
);

// Current focus block
const currentFocusIndex = workspaceSource.indexOf("agenda.focus.current && (");
assert(currentFocusIndex !== -1, "agenda.focus.current block exists");
const currentSnippet = workspaceSource.substring(currentFocusIndex, currentFocusIndex + 2500);
assert(
  currentSnippet.includes("<WhatsAppContactLink") && currentSnippet.includes("agenda.focus.current.member.phone"),
  "Current focus card renders WhatsAppContactLink with current member phone"
);

// Next focus block
const nextFocusIndex = workspaceSource.indexOf("agenda.focus.next && (");
assert(nextFocusIndex !== -1, "agenda.focus.next block exists");
const nextSnippet = workspaceSource.substring(nextFocusIndex, nextFocusIndex + 2500);
assert(
  nextSnippet.includes("<WhatsAppContactLink") && nextSnippet.includes("agenda.focus.next.member.phone"),
  "Next focus card renders WhatsAppContactLink with next member phone"
);

// Needs terminalization block
const needsTermIndex = workspaceSource.indexOf("agenda.needs_terminalization.map");
assert(needsTermIndex !== -1, "agenda.needs_terminalization.map block exists");
const needsTermSnippet = workspaceSource.substring(needsTermIndex, needsTermIndex + 2500);
assert(
  needsTermSnippet.includes("<WhatsAppContactLink") && needsTermSnippet.includes("item.member.phone"),
  "needs_terminalization row renders WhatsAppContactLink with item member phone"
);

// Negative check: generic timeline MUST NOT have WhatsApp actions
const timelineIndex = workspaceSource.indexOf("agenda.appointments.map");
assert(timelineIndex !== -1, "agenda.appointments.map block exists");
const timelineSnippet = workspaceSource.substring(timelineIndex, timelineIndex + 2500);
assert(
  !timelineSnippet.includes("WhatsAppContactLink") && !timelineSnippet.includes("whatsapp") && !timelineSnippet.includes("WhatsApp"),
  "Generic appointments timeline contains NO WhatsApp actions"
);

// Negative check: no direct wa.me string interpolation in DailyAgendaWorkspace
assert(
  !workspaceSource.includes("wa.me/"),
  "DailyAgendaWorkspace contains zero raw wa.me link construction (delegated to component)"
);

// Negative check: no window.open in DailyAgendaWorkspace
assert(
  !workspaceSource.includes("window.open"),
  "DailyAgendaWorkspace contains zero window.open calls"
);

console.log("\n=== 6. Click-Only Safety & Anti-Automation Invariants ===");

assert(
  !workspaceSource.includes("graph.facebook.com"),
  "Zero Facebook/Meta API endpoints"
);
assert(
  !workspaceSource.includes("WHATSAPP_TOKEN"),
  "Zero WhatsApp Business API tokens"
);
assert(
  !workspaceSource.includes("sendMessage("),
  "Zero automated message sending calls"
);
assert(
  !workspaceSource.includes("contacted_at"),
  "Zero communication tracking / contacted_at fields"
);

console.log("\n=== 7. Documentation & Registration ===");

const decPath = path.resolve('DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decSource = fs.readFileSync(decPath, 'utf8');

assert(
  decSource.includes("## F.27B Daily Agenda WhatsApp Quick Contact"),
  "DECISIONS.md documents '## F.27B Daily Agenda WhatsApp Quick Contact'"
);

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts['verify:trainer-daily-whatsapp-ui'] === 'node scripts/verify-trainer-daily-whatsapp-ui.mjs',
  "package.json registers 'verify:trainer-daily-whatsapp-ui'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ F.27B Daily Agenda WhatsApp Quick Contact verification FAILED");
  process.exit(1);
} else {
  console.log("PASS — F.27B DAILY AGENDA WHATSAPP QUICK CONTACT IMPLEMENTED");
}
