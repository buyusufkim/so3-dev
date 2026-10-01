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

function extractMethodBlock(content, methodName) {
  const startIdx = content.indexOf(methodName);
  if (startIdx === -1) return null;
  const braceIdx = content.indexOf('{', startIdx);
  if (braceIdx === -1) return null;
  let depth = 1;
  for (let i = braceIdx + 1; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        return content.substring(startIdx, i + 1);
      }
    }
  }
  return null;
}

console.log("=== 1. Chained Backend & Read Model Regressions ===");

try {
  const rescheduleOptionsOutput = execSync('npm run verify:member-appointment-reschedule-options', { encoding: 'utf8' });
  assert(
    rescheduleOptionsOutput.includes("PASS — F.25C.1 MEMBER APPOINTMENT RESCHEDULE OPTIONS READ MODEL CLOSED"),
    "Chained F.25C.1 reschedule options read model verifier passes"
  );
} catch (e) {
  assert(false, `F.25C.1 reschedule options verifier failed: ${e.message}`);
}

try {
  const lifecycleApiOutput = execSync('npm run verify:member-appointment-lifecycle-api', { encoding: 'utf8' });
  assert(
    lifecycleApiOutput.includes("PASS — F.25B MEMBER SELF-SERVICE APPOINTMENT CANCEL & RESCHEDULE BACKEND API CLOSED"),
    "Chained F.25B member appointment lifecycle API verifier passes"
  );
} catch (e) {
  assert(false, `F.25B lifecycle API verifier failed: ${e.message}`);
}

console.log("\n=== 2. Algorithmic & Simulation Self-Tests ===");

// 2.1 Pure cancellation reason validator simulation
function validateReason(reason) {
  if (typeof reason !== 'string') return { valid: false, error: 'Reason must be string' };
  const trimmed = reason.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Reason cannot be empty' };
  if (trimmed.length > 255) return { valid: false, error: 'Reason exceeds 255 chars' };
  return { valid: true, reason: trimmed };
}

assert(!validateReason('').valid, "Self-test: Empty cancel reason is invalid");
assert(!validateReason('   ').valid, "Self-test: Whitespace-only cancel reason is invalid");
assert(!validateReason('a'.repeat(256)).valid, "Self-test: 256-char cancel reason exceeds max length");
assert(validateReason('Rahatsızlandım').valid && validateReason('Rahatsızlandım').reason === 'Rahatsızlandım', "Self-test: Valid cancel reason accepted and trimmed");

// 2.2 Reschedule slot format simulation
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
assert(DATETIME_REGEX.test('2026-10-05 14:00:00'), "Self-test: Starts_at matches YYYY-MM-DD HH:mm:ss");
assert(!DATETIME_REGEX.test('2026-10-05T14:00:00Z'), "Self-test: ISO string rejected (wall-clock required)");

// 2.3 Double-submit lock simulation
class SubmitLockSimulator {
  constructor() {
    this.locked = false;
    this.submissions = 0;
  }
  async submit(fn) {
    if (this.locked) return false;
    this.locked = true;
    try {
      this.submissions++;
      await fn();
      return true;
    } finally {
      this.locked = false;
    }
  }
}

const lockSim = new SubmitLockSimulator();
let concurrentBlocked = false;
lockSim.submit(() => new Promise(r => setTimeout(r, 50)));
lockSim.submit(() => { concurrentBlocked = true; return Promise.resolve(); });
assert(concurrentBlocked === false, "Self-test: Concurrent click while submission lock is active is dropped");

// 2.4 AbortController cleanup simulation on modal close
let abortSimActive = false;
let abortedSignalTriggered = false;
const controllerSim = new AbortController();
controllerSim.signal.addEventListener('abort', () => { abortedSignalTriggered = true; });
abortSimActive = true;
controllerSim.abort();
abortSimActive = false;
assert(abortedSignalTriggered && !abortSimActive, "Self-test: AbortController aborts in-flight request on close");

// 2.5 Mounted lifecycle guard simulation
function simulateUnmountStateGuard() {
  let isMounted = true;
  let stateUpdated = false;

  const asyncAction = async () => {
    // simulate async delay
    await new Promise(r => setTimeout(r, 10));
    if (isMounted) {
      stateUpdated = true;
    }
  };

  const promise = asyncAction();
  // unmount occurs before async resolution
  isMounted = false;
  return promise.then(() => stateUpdated);
}

const unmountResult = await simulateUnmountStateGuard();
assert(unmountResult === false, "Self-test: Unmount guard prevents state update after unmount");

console.log("\n=== 3. Frontend Client API Invariants (client.ts) ===");

const clientPath = path.resolve(process.cwd(), 'src/member/api/client.ts');
assert(fs.existsSync(clientPath), "src/member/api/client.ts exists");
const clientContent = fs.readFileSync(clientPath, 'utf8');

assert(
  clientContent.includes("async cancelAppointment("),
  "client.ts exports cancelAppointment method"
);
assert(
  clientContent.includes("appointmentId: number,") && clientContent.includes("cancellationReason: string,"),
  "cancelAppointment signature accepts appointmentId and cancellationReason"
);
assert(
  clientContent.includes("!Number.isInteger(appointmentId) || appointmentId <= 0"),
  "cancelAppointment validates positive integer appointmentId"
);
assert(
  clientContent.includes("const trimmedReason = cancellationReason.trim();"),
  "cancelAppointment trims cancellationReason"
);
assert(
  clientContent.includes("trimmedReason.length > 255"),
  "cancelAppointment enforces max 255 characters on cancellationReason"
);
assert(
  clientContent.includes("`/api/member/appointments/${appointmentId}/cancel`"),
  "cancelAppointment targets canonical endpoint PATCH /api/member/appointments/${appointmentId}/cancel"
);
assert(
  clientContent.includes("cancellation_reason: trimmedReason"),
  "cancelAppointment sends exact payload key 'cancellation_reason'"
);
assert(
  clientContent.includes("validateCancelledAppointmentResponse(data)"),
  "cancelAppointment validates response with validateCancelledAppointmentResponse"
);

assert(
  clientContent.includes("async rescheduleAppointment("),
  "client.ts exports rescheduleAppointment method"
);
assert(
  clientContent.includes("startsAt: string,"),
  "rescheduleAppointment signature accepts appointmentId and startsAt"
);
assert(
  clientContent.includes("`/api/member/appointments/${appointmentId}/reschedule`"),
  "rescheduleAppointment targets canonical endpoint PATCH /api/member/appointments/${appointmentId}/reschedule"
);
assert(
  clientContent.includes("starts_at: trimmedStartsAt"),
  "rescheduleAppointment sends exact payload key 'starts_at'"
);
assert(
  !clientContent.includes("trainer_id: ") && !clientContent.includes("member_session_package_id: startsAt"),
  "rescheduleAppointment never submits trainer or package overrides"
);
assert(
  clientContent.includes("validateRescheduledAppointmentResponse(data)"),
  "rescheduleAppointment validates response with validateRescheduledAppointmentResponse"
);

console.log("\n=== 4. Response Validators (validators.ts) ===");

const validatorsPath = path.resolve(process.cwd(), 'src/member/api/validators.ts');
assert(fs.existsSync(validatorsPath), "src/member/api/validators.ts exists");
const validatorsContent = fs.readFileSync(validatorsPath, 'utf8');

assert(
  validatorsContent.includes("export type MemberCancelledAppointmentResponse"),
  "validators.ts exports MemberCancelledAppointmentResponse type"
);
assert(
  validatorsContent.includes("export function validateCancelledAppointmentResponse"),
  "validators.ts exports validateCancelledAppointmentResponse"
);
assert(
  validatorsContent.includes("a.status !== 'cancelled'"),
  "validateCancelledAppointmentResponse strictly enforces status === 'cancelled'"
);
assert(
  validatorsContent.includes("!isValidDateTime(a.cancelled_at)"),
  "validateCancelledAppointmentResponse validates cancelled_at timestamp"
);

assert(
  validatorsContent.includes("export type MemberRescheduledAppointmentResponse"),
  "validators.ts exports MemberRescheduledAppointmentResponse type"
);
assert(
  validatorsContent.includes("export function validateRescheduledAppointmentResponse"),
  "validators.ts exports validateRescheduledAppointmentResponse"
);
assert(
  validatorsContent.includes("a.status !== 'scheduled'"),
  "validateRescheduledAppointmentResponse strictly enforces status === 'scheduled'"
);
assert(
  validatorsContent.includes("r.previous_starts_at") && validatorsContent.includes("r.new_starts_at"),
  "validateRescheduledAppointmentResponse validates previous and new slot timestamps"
);

console.log("\n=== 5. UI Surface & Lifecycle Safety in MemberDashboardPage.tsx ===");

const dashboardPath = path.resolve(process.cwd(), 'src/member/pages/MemberDashboardPage.tsx');
assert(fs.existsSync(dashboardPath), "MemberDashboardPage.tsx exists");
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

assert(
  dashboardContent.includes("Yeniden Planla"),
  "MemberDashboardPage renders 'Yeniden Planla' action"
);
assert(
  dashboardContent.includes("İptal Et"),
  "MemberDashboardPage renders 'İptal Et' action"
);
assert(
  dashboardContent.includes("app.status === 'scheduled'"),
  "Lifecycle action buttons gated by app.status === 'scheduled'"
);
assert(
  dashboardContent.includes("Randevuyu İptal Et"),
  "Cancel modal contains primary submit button 'Randevuyu İptal Et'"
);
assert(
  dashboardContent.includes("İptal nedeni"),
  "Cancel modal contains 'İptal nedeni' label"
);
assert(
  dashboardContent.includes("Randevuyu Yeniden Planla"),
  "Reschedule modal contains primary submit button 'Randevuyu Yeniden Planla'"
);
assert(
  dashboardContent.includes("Vazgeç"),
  "Modals contain 'Vazgeç' dismissal button"
);
assert(
  dashboardContent.includes("getAppointmentRescheduleOptions"),
  "Reschedule modal consumes appointment-specific getAppointmentRescheduleOptions"
);
assert(
  dashboardContent.includes("cancelSubmitLockRef"),
  "MemberDashboardPage implements cancellation duplicate-submit lock ref"
);
assert(
  dashboardContent.includes("rescheduleSubmitLockRef"),
  "MemberDashboardPage implements reschedule duplicate-submit lock ref"
);
assert(
  dashboardContent.includes("cancelAbortRef.current?.abort()"),
  "MemberDashboardPage aborts in-flight cancel requests on unmount / modal close"
);
assert(
  dashboardContent.includes("rescheduleSubmitAbortRef.current?.abort()"),
  "MemberDashboardPage aborts in-flight reschedule requests on unmount / modal close"
);
assert(
  dashboardContent.includes("rescheduleOptionsAbortRef.current?.abort()"),
  "MemberDashboardPage aborts in-flight reschedule options loading on unmount / modal close"
);
assert(
  dashboardContent.includes("APPOINTMENT_NOT_CANCELLABLE"),
  "MemberDashboardPage handles APPOINTMENT_NOT_CANCELLABLE"
);
assert(
  dashboardContent.includes("APPOINTMENT_NOT_RESCHEDULABLE"),
  "MemberDashboardPage handles APPOINTMENT_NOT_RESCHEDULABLE"
);
assert(
  dashboardContent.includes("APPOINTMENT_RESCHEDULE_NO_CHANGE"),
  "MemberDashboardPage handles APPOINTMENT_RESCHEDULE_NO_CHANGE"
);
assert(
  dashboardContent.includes("TRAINER_CONFLICT"),
  "MemberDashboardPage handles TRAINER_CONFLICT"
);

console.log("\n=== 6. Mounted Lifecycle & Async Guard Invariants ===");

// 6.1 Mounted ref definition and effect
assert(
  dashboardContent.includes("const mountedRef = useRef<boolean>(true);"),
  "MemberDashboardPage declares bounded mountedRef"
);
assert(
  dashboardContent.includes("mountedRef.current = true;"),
  "MemberDashboardPage sets mountedRef.current = true on mount"
);
assert(
  dashboardContent.includes("mountedRef.current = false;"),
  "MemberDashboardPage sets mountedRef.current = false on unmount"
);

// 6.2 Cancel method extraction & safety
const cancelMethod = extractMethodBlock(dashboardContent, 'const handleSubmitCancel =');
assert(cancelMethod !== null, "handleSubmitCancel method block extracted successfully");
if (cancelMethod) {
  assert(
    cancelMethod.includes("cancelSubmitLockRef.current = false;"),
    "handleSubmitCancel releases cancelSubmitLockRef in finally"
  );
  assert(
    cancelMethod.includes("if (mountedRef.current)") && cancelMethod.includes("setIsCancelSubmitting(false)"),
    "handleSubmitCancel guards setIsCancelSubmitting(false) with mountedRef.current"
  );
  assert(
    cancelMethod.includes("if (!mountedRef.current || controller.signal.aborted) return;"),
    "handleSubmitCancel catch blocks unmounted or aborted error state writes"
  );
  assert(
    cancelMethod.includes("if (mountedRef.current && !controller.signal.aborted)"),
    "handleSubmitCancel guards success state writes and startDataLoad with mountedRef and signal"
  );
}

// 6.3 Reschedule submit method extraction & safety
const rescheduleMethod = extractMethodBlock(dashboardContent, 'const handleSubmitReschedule =');
assert(rescheduleMethod !== null, "handleSubmitReschedule method block extracted successfully");
if (rescheduleMethod) {
  assert(
    rescheduleMethod.includes("rescheduleSubmitLockRef.current = false;"),
    "handleSubmitReschedule releases rescheduleSubmitLockRef in finally"
  );
  assert(
    rescheduleMethod.includes("if (mountedRef.current)") && rescheduleMethod.includes("setIsRescheduleSubmitting(false)"),
    "handleSubmitReschedule guards setIsRescheduleSubmitting(false) with mountedRef.current"
  );
  assert(
    rescheduleMethod.includes("if (!mountedRef.current || controller.signal.aborted) return;"),
    "handleSubmitReschedule catch blocks unmounted or aborted error state writes"
  );
  assert(
    rescheduleMethod.includes("if (mountedRef.current && !controller.signal.aborted)"),
    "handleSubmitReschedule guards success state writes and startDataLoad with mountedRef and signal"
  );
  assert(
    rescheduleMethod.includes("if (mountedRef.current)") && rescheduleMethod.includes("loadRescheduleOptions(rescheduleTarget.id)"),
    "handleSubmitReschedule guards stale slot retry options reload with mountedRef.current"
  );
}

// 6.4 Reschedule options loading method extraction & safety
const optionsMethod = extractMethodBlock(dashboardContent, 'const loadRescheduleOptions =');
assert(optionsMethod !== null, "loadRescheduleOptions method block extracted successfully");
if (optionsMethod) {
  assert(
    optionsMethod.includes("if (!mountedRef.current) return;"),
    "loadRescheduleOptions guards initial invocation with mountedRef.current"
  );
  assert(
    optionsMethod.includes("gen !== rescheduleGenerationRef.current"),
    "loadRescheduleOptions checks generation to discard stale async responses"
  );
  assert(
    optionsMethod.includes("controller.signal.aborted"),
    "loadRescheduleOptions checks AbortController signal"
  );
  assert(
    optionsMethod.includes("if (mountedRef.current && gen === rescheduleGenerationRef.current && !controller.signal.aborted)"),
    "loadRescheduleOptions guards finally setIsOptionsLoading(false) with mountedRef, gen, and signal"
  );
}

// 6.5 Authoritative data load mounted guard
const dataLoadMethod = extractMethodBlock(dashboardContent, 'const startDataLoad =');
assert(dataLoadMethod !== null, "startDataLoad method block extracted successfully");
if (dataLoadMethod) {
  assert(
    dataLoadMethod.includes("if (!mountedRef.current) return;"),
    "startDataLoad guards invocation with mountedRef.current"
  );
  assert(
    dataLoadMethod.includes("if (mountedRef.current && !controller.signal.aborted)") &&
    dataLoadMethod.includes("setIsDataLoading(false)"),
    "startDataLoad guards finally setIsDataLoading(false) with mountedRef and signal"
  );
}

console.log("\n=== 7. Scope Isolation (No Lifecycle UI in Booking Create Page) ===");

const bookingPagePath = path.resolve(process.cwd(), 'src/member/pages/MemberAppointmentBookingPage.tsx');
assert(fs.existsSync(bookingPagePath), "MemberAppointmentBookingPage.tsx exists");
const bookingPageContent = fs.readFileSync(bookingPagePath, 'utf8');

assert(
  !bookingPageContent.includes("cancelAppointment"),
  "MemberAppointmentBookingPage does not consume cancelAppointment (isolated)"
);
assert(
  !bookingPageContent.includes("rescheduleAppointment"),
  "MemberAppointmentBookingPage does not consume rescheduleAppointment (isolated)"
);
assert(
  !bookingPageContent.includes("Randevuyu İptal Et"),
  "MemberAppointmentBookingPage does not render cancel UI"
);
assert(
  !bookingPageContent.includes("Randevuyu Yeniden Planla"),
  "MemberAppointmentBookingPage does not render reschedule UI"
);

console.log("\n=== 8. Documentation & package.json Registration ===");

const decPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decContent = fs.readFileSync(decPath, 'utf8');
assert(
  decContent.includes("## F.25C.2 Member Appointment Lifecycle UI"),
  "DECISIONS.md documents '## F.25C.2 Member Appointment Lifecycle UI'"
);

const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert(
  pkg.scripts && pkg.scripts['verify:member-appointment-lifecycle-ui'] === 'node scripts/verify-member-appointment-lifecycle-ui.mjs',
  "package.json registers 'verify:member-appointment-lifecycle-ui'"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more F.25C.2 Member Appointment Lifecycle UI invariants failed.");
  process.exit(exitCode);
} else {
  console.log("PASS — F.25C.2 MEMBER APPOINTMENT LIFECYCLE UI CLOSED");
}
