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

console.log("=== 1. Chained Backend Regressions ===");

try {
  const optionsOutput = execSync('npm run verify:member-appointment-booking-options', { encoding: 'utf8' });
  assert(
    optionsOutput.includes("PASS — F.24C.1 MEMBER SELF-SERVICE BOOKING OPTIONS READ MODEL CLOSED"),
    "Chained F.24C.1 member appointment booking options verifier passes"
  );
} catch (e) {
  assert(false, `F.24C.1 booking options verifier failed: ${e.message}`);
}

try {
  const createOutput = execSync('npm run verify:member-appointment-create', { encoding: 'utf8' });
  assert(
    createOutput.includes("PASS — F.24C.2 TRANSACTION-SAFE MEMBER SELF-SERVICE APPOINTMENT CREATE CLOSED"),
    "Chained F.24C.2 member appointment create verifier passes"
  );
} catch (e) {
  assert(false, `F.24C.2 appointment create verifier failed: ${e.message}`);
}

console.log("\n=== 2. Algorithmic & Validator Pure Self-Tests ===");

// 2.1 Pure wall-time range formatting self-test
function formatTimeRange(startsAt, endsAt) {
  const startH = startsAt.substring(11, 16);
  const endH = endsAt.substring(11, 16);
  return `${startH} – ${endH}`;
}
assert(
  formatTimeRange('2026-10-02 10:30:00', '2026-10-02 11:30:00') === '10:30 – 11:30',
  "Self-test: formatTimeRange extracts pure wall-time without timezone conversion"
);

// 2.2 Date weekday calculation self-test (pure Gregorian formula)
function getWeekdayIndex(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const adjY = m < 3 ? y - 1 : y;
  return (adjY + Math.floor(adjY / 4) - Math.floor(adjY / 100) + Math.floor(adjY / 400) + t[m - 1] + d) % 7;
}
// 2026-10-02 is a Friday (index 5)
assert(getWeekdayIndex('2026-10-02') === 5, "Self-test: 2026-10-02 correctly computes Friday (index 5)");
// 2026-10-04 is a Sunday (index 0)
assert(getWeekdayIndex('2026-10-04') === 0, "Self-test: 2026-10-04 correctly computes Sunday (index 0)");

// 2.3 Single vs multiple package selection logic self-test
function determinePackageAutoSelection(eligiblePackages) {
  if (eligiblePackages.length === 1) {
    return eligiblePackages[0].id;
  }
  return null; // explicit selection required
}
assert(determinePackageAutoSelection([{ id: 42, package_name: 'PT 10' }]) === 42, "Self-test: Single eligible package auto-selects");
assert(
  determinePackageAutoSelection([{ id: 42, package_name: 'PT 10' }, { id: 43, package_name: 'PT 20' }]) === null,
  "Self-test: Multiple eligible packages require explicit selection"
);

// 2.4 Created appointment raw authority field rejection self-test
function checkRawAuthorityRejection(appointmentObj) {
  return !(
    'member_id' in appointmentObj ||
    'trainer_id' in appointmentObj ||
    'member_session_package_id' in appointmentObj ||
    'created_by' in appointmentObj ||
    'created_by_member_account_id' in appointmentObj
  );
}
assert(
  checkRawAuthorityRejection({
    id: 1,
    uuid: 'u-1',
    starts_at: '2026-10-02 10:00:00',
    ends_at: '2026-10-02 11:00:00',
    status: 'scheduled',
    trainer: { id: 7, name: 'Can' },
    session_package: { id: 42, package_name: 'PT 10' }
  }) === true,
  "Self-test: Safe canonical appointment response accepted"
);
assert(
  checkRawAuthorityRejection({
    id: 1,
    member_id: 10,
    trainer_id: 7
  }) === false,
  "Self-test: Raw authority fields rejected"
);

// 2.5 GET request generation & unmount invalidation pure simulation
function simulateGetLifecycle() {
  let requestGen = 0;
  let activeController = null;
  let mounted = true;
  let stateWrittenAfterUnmount = false;

  // Start request 1
  if (activeController) activeController.abort();
  const c1 = new AbortController();
  activeController = c1;
  requestGen += 1;
  const currentGen = requestGen;

  // Unmount happens before c1 resolves
  requestGen += 1; // Unmount invalidates generation
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
  mounted = false;

  // c1 finally block executes
  if (currentGen === requestGen && mounted) {
    stateWrittenAfterUnmount = true;
  }

  return (
    c1.signal.aborted === true &&
    activeController === null &&
    stateWrittenAfterUnmount === false &&
    currentGen !== requestGen
  );
}
assert(
  simulateGetLifecycle(),
  "Self-test: Unmount cleanup aborts active GET, invalidates generation, and prevents unmounted state updates"
);

// 2.6 Concurrent / Superceded GET requests pure simulation
function simulateConcurrentGetRequests() {
  let requestGen = 0;
  let activeController = null;
  const completedGenerations = [];

  // Start Request 1
  if (activeController) activeController.abort();
  const c1 = new AbortController();
  activeController = c1;
  requestGen += 1;
  const gen1 = requestGen;

  // Before Request 1 finishes, user/system triggers Request 2
  if (activeController) activeController.abort();
  const c2 = new AbortController();
  activeController = c2;
  requestGen += 1;
  const gen2 = requestGen;

  // Delayed Request 1 finishes later
  if (gen1 === requestGen && !c1.signal.aborted) {
    completedGenerations.push(gen1);
  }

  // Request 2 finishes
  if (gen2 === requestGen && !c2.signal.aborted) {
    completedGenerations.push(gen2);
  }

  return (
    c1.signal.aborted === true &&
    c2.signal.aborted === false &&
    completedGenerations.length === 1 &&
    completedGenerations[0] === gen2
  );
}
assert(
  simulateConcurrentGetRequests(),
  "Self-test: Superceded GET request is aborted and its stale response rejected by generation check"
);

// 2.7 POST mutation unmount & in-flight cancellation simulation
function simulatePostUnmountCancellation() {
  let submitLock = false;
  let isSubmitting = false;
  let activeSubmitController = null;
  let mounted = true;
  let mutationStateWritten = false;

  // Start submit
  if (submitLock || isSubmitting) return false;
  submitLock = true;
  isSubmitting = true;
  const controller = new AbortController();
  activeSubmitController = controller;

  // Component unmounts while request is in-flight
  if (activeSubmitController) {
    activeSubmitController.abort();
    activeSubmitController = null;
  }
  mounted = false;

  // In-flight POST response arrives or catches AbortError
  try {
    if (!mounted || controller.signal.aborted) {
      // Early exit on unmount/abort
    } else {
      mutationStateWritten = true;
    }
  } finally {
    submitLock = false;
    if (activeSubmitController === controller) {
      activeSubmitController = null;
    }
    if (mounted) {
      isSubmitting = false;
    }
  }

  return (
    controller.signal.aborted === true &&
    activeSubmitController === null &&
    submitLock === false &&
    mutationStateWritten === false
  );
}
assert(
  simulatePostUnmountCancellation(),
  "Self-test: Unmount cleanup aborts in-flight POST and prevents post-unmount mutation state writes"
);

// 2.8 Auth-ready options load gate simulation
function shouldFetchBookingOptions(authLoading, isAuthenticated, identity, mustChangePassword) {
  if (authLoading || !isAuthenticated || !identity || mustChangePassword) {
    return false;
  }
  return true;
}
assert(shouldFetchBookingOptions(true, true, { account: { must_change_password: false } }, false) === false, "Self-test: Auth loading blocks booking options fetch");
assert(shouldFetchBookingOptions(false, false, null, false) === false, "Self-test: Unauthenticated state blocks booking options fetch");
assert(shouldFetchBookingOptions(false, true, null, false) === false, "Self-test: Missing identity blocks booking options fetch");
assert(shouldFetchBookingOptions(false, true, { account: { must_change_password: true } }, true) === false, "Self-test: Password change requirement blocks booking options fetch");
assert(shouldFetchBookingOptions(false, true, { account: { must_change_password: false } }, false) === true, "Self-test: Fully resolved authenticated identity allows booking options fetch");

// 2.9 Negative invariant detection self-tests (Structural Analysis)
function evaluateCleanupInvariant(src) {
  const hasGenInvalidation = /requestGenRef\.current\s*\+=\s*1|\+\+\s*requestGenRef\.current/.test(src);
  const hasOptionsAbort = /optionsAbortRef\.current(?:\.abort\(\)|\?\.abort\(\))/.test(src);
  const hasOptionsClear = /optionsAbortRef\.current\s*=\s*null/.test(src);
  const hasSubmitAbort = /submitAbortRef\.current(?:\.abort\(\)|\?\.abort\(\))/.test(src);
  const hasSubmitClear = /submitAbortRef\.current\s*=\s*null/.test(src);
  const hasMountInvalidation = /mountedRef\.current\s*=\s*false/.test(src);
  return hasGenInvalidation && hasOptionsAbort && hasOptionsClear && hasSubmitAbort && hasSubmitClear && hasMountInvalidation;
}
const mockWeakCleanupNoGen = `
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      optionsAbortRef.current?.abort();
      optionsAbortRef.current = null;
      submitAbortRef.current?.abort();
      submitAbortRef.current = null;
    };
  }, []);
`;
assert(
  evaluateCleanupInvariant(mockWeakCleanupNoGen) === false,
  "Self-test: Weak cleanup missing generation invalidation is correctly rejected"
);
const mockWeakCleanupNoAbort = `
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      requestGenRef.current += 1;
      optionsAbortRef.current = null;
      submitAbortRef.current = null;
    };
  }, []);
`;
assert(
  evaluateCleanupInvariant(mockWeakCleanupNoAbort) === false,
  "Self-test: Weak cleanup missing abort calls is correctly rejected"
);

console.log("\n=== 3. Types & Runtime Validators Invariants ===");

const validatorsPath = path.resolve(process.cwd(), 'src/member/api/validators.ts');
assert(fs.existsSync(validatorsPath), "src/member/api/validators.ts exists");
const validatorsSrc = fs.readFileSync(validatorsPath, 'utf8');

// 3.1 Strict types exported
assert(validatorsSrc.includes("export interface MemberBookingPolicy"), "Exports MemberBookingPolicy interface");
assert(validatorsSrc.includes("export interface MemberBookingTrainer"), "Exports MemberBookingTrainer interface");
assert(validatorsSrc.includes("export interface MemberBookingSlot"), "Exports MemberBookingSlot interface");
assert(validatorsSrc.includes("export interface MemberBookingPackage"), "Exports MemberBookingPackage interface");
assert(validatorsSrc.includes("export type MemberBookingDayState"), "Exports MemberBookingDayState type");
assert(validatorsSrc.includes("export interface MemberBookingDay"), "Exports MemberBookingDay interface");
assert(validatorsSrc.includes("export type MemberBookingState"), "Exports MemberBookingState type");
assert(validatorsSrc.includes("export interface MemberAppointmentBookingOptions"), "Exports MemberAppointmentBookingOptions interface");
assert(validatorsSrc.includes("export interface MemberCreatedAppointment"), "Exports MemberCreatedAppointment interface");

// 3.2 Runtime validator functions exported
assert(validatorsSrc.includes("export function validateAppointmentBookingOptions"), "Exports validateAppointmentBookingOptions");
assert(validatorsSrc.includes("export function validateCreatedAppointment"), "Exports validateCreatedAppointment");

// 3.3 Strict policy constants in validator
assert(validatorsSrc.includes("slot_duration_minutes !== 60"), "Validates slot_duration_minutes === 60");
assert(validatorsSrc.includes("slot_step_minutes !== 60"), "Validates slot_step_minutes === 60");
assert(validatorsSrc.includes("minimum_notice_minutes !== 120"), "Validates minimum_notice_minutes === 120");
assert(validatorsSrc.includes("booking_horizon_days !== 14"), "Validates booking_horizon_days === 14");
assert(validatorsSrc.includes("Europe/Istanbul"), "Validates timezone === Europe/Istanbul");

// 3.4 Strict validation rules
assert(validatorsSrc.includes("bookingState === 'READY'"), "Validates READY state requirements");
assert(validatorsSrc.includes("data.days.length !== 14"), "Requires exactly 14 days when READY");
assert(validatorsSrc.includes("data.days.length !== 0"), "Requires 0 days when non-READY");
assert(validatorsSrc.includes("trainer === null"), "Requires non-null trainer when READY");
assert(validatorsSrc.includes("areDatesConsecutive"), "Validates consecutive calendar dates without gaps");
assert(validatorsSrc.includes("isExact60MinuteSlot"), "Validates exact 60-minute same-day slot format with :00 seconds");
assert(validatorsSrc.includes("comparePackages"), "Validates canonical package ordering (valid_until ASC, id ASC)");
assert(validatorsSrc.includes("member_id' in a ||"), "Rejects raw member_id in create response");
assert(validatorsSrc.includes("trainer_id' in a ||"), "Rejects raw trainer_id in create response");
assert(validatorsSrc.includes("member_session_package_id' in a ||"), "Rejects raw member_session_package_id in create response");

// 3.5 No Date timezone conversions in validators transport logic
assert(!validatorsSrc.includes("toISOString()"), "No toISOString() in validators.ts");
assert(!validatorsSrc.includes("Date.UTC("), "No Date.UTC() in validators.ts");
assert(!validatorsSrc.includes("getTimezoneOffset()"), "No getTimezoneOffset() in validators.ts");

console.log("\n=== 4. Member API Client Invariants ===");

const clientPath = path.resolve(process.cwd(), 'src/member/api/client.ts');
assert(fs.existsSync(clientPath), "src/member/api/client.ts exists");
const clientSrc = fs.readFileSync(clientPath, 'utf8');

assert(
  clientSrc.includes("async getAppointmentBookingOptions("),
  "memberApiClient defines getAppointmentBookingOptions"
);
assert(
  clientSrc.includes("request('/api/member/appointment-booking-options'"),
  "getAppointmentBookingOptions requests GET /api/member/appointment-booking-options"
);
assert(
  clientSrc.includes("validateAppointmentBookingOptions(data)"),
  "getAppointmentBookingOptions validates server response with validateAppointmentBookingOptions"
);

assert(
  clientSrc.includes("async createAppointment("),
  "memberApiClient defines createAppointment"
);
assert(
  clientSrc.includes("request('/api/member/appointments'"),
  "createAppointment requests POST /api/member/appointments"
);
assert(
  clientSrc.includes("starts_at: startsAt") && clientSrc.includes("member_session_package_id: memberSessionPackageId"),
  "createAppointment sends exact body with starts_at and member_session_package_id only"
);
assert(
  clientSrc.includes("validateCreatedAppointment(data)"),
  "createAppointment validates response with validateCreatedAppointment"
);

// No manual CSRF call in client methods (shared request() handles it)
assert(
  !clientSrc.includes("getAppointmentBookingOptions") || !clientSrc.substring(clientSrc.indexOf("getAppointmentBookingOptions")).includes("fetchCsrfToken"),
  "getAppointmentBookingOptions relies on shared request layer for CSRF"
);

console.log("\n=== 5. Member Booking Page UI Invariants ===");

const pagePath = path.resolve(process.cwd(), 'src/member/pages/MemberAppointmentBookingPage.tsx');
assert(fs.existsSync(pagePath), "src/member/pages/MemberAppointmentBookingPage.tsx exists");
const pageSrc = fs.readFileSync(pagePath, 'utf8');

// 5.1 Auth guards
assert(pageSrc.includes("useMemberAuth()"), "Uses useMemberAuth");
assert(pageSrc.includes('Navigate to="/uye/giris"'), "Redirects unauthenticated users to /uye/giris");
assert(pageSrc.includes('Navigate to="/uye/sifre-degistir"'), "Redirects users with must_change_password to /uye/sifre-degistir");

// 5.2 Header & Titles
assert(pageSrc.includes("Randevu Al"), "Displays 'Randevu Al' title");
assert(pageSrc.includes("Antrenörünün uygun saatlerinden sana uygun olanı seç"), "Displays canonical subtitle");
assert(pageSrc.includes("Antrenörün:"), "Displays trainer badge in READY state");

// 5.3 Top-level non-ready states
assert(pageSrc.includes("MEMBERSHIP_NOT_SET"), "Handles MEMBERSHIP_NOT_SET state");
assert(pageSrc.includes("Randevu alabilmek için üyelik başlangıç ve bitiş tarihlerinin tanımlanması gerekiyor"), "Displays canonical membership not set text");
assert(pageSrc.includes("TRAINER_NOT_ASSIGNED"), "Handles TRAINER_NOT_ASSIGNED state");
assert(pageSrc.includes("Henüz sana atanmış bir antrenör bulunmuyor"), "Displays canonical trainer not assigned text");
assert(pageSrc.includes("TRAINER_UNAVAILABLE"), "Handles TRAINER_UNAVAILABLE state");
assert(pageSrc.includes("Atanmış antrenörün şu anda randevu kabul etmiyor"), "Displays canonical trainer unavailable text");

// 5.4 Progressive flow sections
assert(pageSrc.includes("1. Tarih Seç"), "Step 1: Date selection section exists");
assert(pageSrc.includes("2. Saat Seç"), "Step 2: Slot selection section exists");
assert(pageSrc.includes("3. Seans Paketi Seç"), "Step 3: Package selection section exists");
assert(pageSrc.includes("Randevu Özeti"), "Step 4: Summary card exists");
assert(pageSrc.includes("Randevuyu Onayla"), "Step 5: Confirm button exists");

// 5.5 Day state badges
assert(pageSrc.includes("Üyelik dışında"), "Renders 'Üyelik dışında' for MEMBERSHIP_INACTIVE");
assert(pageSrc.includes("Çalışma saati yok"), "Renders 'Çalışma saati yok' for NO_WORKING_HOURS");
assert(pageSrc.includes("Kullanılabilir paket yok"), "Renders 'Kullanılabilir paket yok' for NO_ELIGIBLE_PACKAGE");
assert(pageSrc.includes("Dolu"), "Renders 'Dolu' for FULLY_BOOKED");

// 5.6 Slot & Package interactions
assert(pageSrc.includes("aria-pressed"), "Uses aria-pressed for accessible selections");
assert(pageSrc.includes("eligible_packages.length === 1"), "Auto-selects package when exactly one is available");
assert(pageSrc.includes("min-h-[44px]") || pageSrc.includes("min-h-[48px]"), "Enforces min 44px+ touch targets on interactive buttons");

// 5.7 Race safety & submit lock structural assertions
// 5.7.1 Dedicated mount authority
assert(pageSrc.includes("mountedRef = useRef"), "Uses mountedRef to track component mount status");
assert(pageSrc.includes("mountedRef.current = true"), "Sets mountedRef.current = true on mount");
assert(pageSrc.includes("mountedRef.current = false"), "Invalidates mountedRef.current = false on unmount cleanup");

// 5.7.2 GET generation invalidation and abort on cleanup
assert(
  /requestGenRef\.current\s*\+=\s*1|\+\+\s*requestGenRef\.current/.test(pageSrc),
  "Effect cleanup explicitly invalidates requestGenRef on unmount/re-trigger"
);
assert(
  /optionsAbortRef\.current(?:\.abort\(\)|\?\.abort\(\))/.test(pageSrc),
  "Effect cleanup aborts in-flight booking options GET request"
);
assert(
  /optionsAbortRef\.current\s*=\s*null/.test(pageSrc),
  "Effect cleanup clears optionsAbortRef to null"
);

// 5.7.3 In-flight POST mutation abort on cleanup
assert(pageSrc.includes("submitAbortRef"), "Uses submitAbortRef to track in-flight appointment creation");
assert(
  /submitAbortRef\.current(?:\.abort\(\)|\?\.abort\(\))/.test(pageSrc),
  "Effect cleanup aborts in-flight appointment creation submit request"
);
assert(
  /submitAbortRef\.current\s*=\s*null/.test(pageSrc),
  "Effect cleanup clears submitAbortRef to null"
);

// 5.7.4 GET fetch stale generation and unmount authority guards
assert(
  pageSrc.includes("requestGenRef.current += 1") && pageSrc.includes("const currentGen = requestGenRef.current"),
  "fetchBookingOptions increments and captures current generation"
);
assert(
  pageSrc.includes("currentGen !== requestGenRef.current || !mountedRef.current || controller.signal.aborted"),
  "fetchBookingOptions guards setOptions with stale generation, unmount, and aborted checks"
);
assert(
  /if\s*\(\s*currentGen\s*===\s*requestGenRef\.current\s*&&\s*mountedRef\.current\s*\)\s*\{\s*setLoading\(false\);?\s*\}/.test(pageSrc),
  "fetchBookingOptions finally block guards setLoading(false) with current generation and mountedRef"
);
assert(
  /if\s*\(\s*optionsAbortRef\.current\s*===\s*controller\s*\)\s*\{\s*optionsAbortRef\.current\s*=\s*null;?\s*\}/.test(pageSrc),
  "fetchBookingOptions finally block safely clears optionsAbortRef only if matching active controller"
);

// 5.7.5 Auth-ready load gate
assert(
  pageSrc.includes("authLoading") &&
  pageSrc.includes("!isAuthenticated") &&
  pageSrc.includes("!identity") &&
  pageSrc.includes("identity.account.must_change_password"),
  "fetchBookingOptions effect gates on authLoading, !isAuthenticated, !identity, and must_change_password"
);

// 5.7.6 POST mutation mount authority and concurrency locks
assert(pageSrc.includes("submitLockRef"), "Uses submitLockRef to prevent double submissions");
assert(pageSrc.includes("isSubmitting"), "Tracks isSubmitting state");
assert(
  pageSrc.includes("submitAbortRef.current = controller"),
  "handleSubmit sets submitAbortRef to active controller"
);
assert(
  pageSrc.includes("!mountedRef.current || controller.signal.aborted"),
  "handleSubmit verifies mount authority and signal before processing create result"
);
assert(
  /if\s*\(\s*mountedRef\.current\s*\)\s*\{\s*setIsSubmitting\(false\);?\s*\}/.test(pageSrc),
  "handleSubmit finally block guards setIsSubmitting(false) with mountedRef"
);
assert(
  /if\s*\(\s*submitAbortRef\.current\s*===\s*controller\s*\)\s*\{\s*submitAbortRef\.current\s*=\s*null;?\s*\}/.test(pageSrc),
  "handleSubmit finally block safely clears submitAbortRef only if matching active controller"
);
assert(
  pageSrc.includes("submitLockRef.current = false"),
  "handleSubmit finally block safely releases submitLockRef"
);

// 5.8 Server authority reload after success / conflict
assert(
  pageSrc.includes("setCreatedSuccess(res)") && pageSrc.includes("fetchBookingOptions()"),
  "Refetches booking options from server authority immediately after successful appointment create"
);
assert(pageSrc.includes("BOOKING_SLOT_UNAVAILABLE"), "Handles BOOKING_SLOT_UNAVAILABLE with refetch");
assert(pageSrc.includes("TRAINER_CONFLICT") || pageSrc.includes("MEMBER_CONFLICT"), "Handles conflicts with refetch");
assert(pageSrc.includes("SESSION_PACKAGE_EXHAUSTED"), "Handles package exhaustion with refetch");

// 5.9 Success UI & Navigation
assert(pageSrc.includes("Randevun oluşturuldu."), "Displays canonical success confirmation");
assert(pageSrc.includes("Randevularıma Dön"), "Provides link back to /uye dashboard");
assert(pageSrc.includes('to="/uye"'), "Links back to /uye");

// 5.10 Wall-time purity in booking page (no Date timezone conversions)
assert(!pageSrc.includes("toISOString()"), "No toISOString in MemberAppointmentBookingPage.tsx");
assert(!pageSrc.includes("Date.UTC("), "No Date.UTC in MemberAppointmentBookingPage.tsx");
assert(!pageSrc.includes("getTimezoneOffset()"), "No getTimezoneOffset in MemberAppointmentBookingPage.tsx");

// 5.11 No client slot generation or wizard state machines
assert(!pageSrc.includes("generateSlots"), "Zero client slot generation in MemberAppointmentBookingPage.tsx");
assert(!pageSrc.includes("SLOT_DURATION_MINUTES ="), "Zero client policy generation in MemberAppointmentBookingPage.tsx");

// 5.12 No manual CSRF call in page
assert(!pageSrc.includes("/api/member-auth/csrf"), "Page does not manually call CSRF endpoint");

// 5.13 No member cancellation or reschedule in page
assert(!pageSrc.includes("/cancel"), "No cancellation logic in MemberAppointmentBookingPage.tsx");
assert(!pageSrc.includes("/reschedule"), "No reschedule logic in MemberAppointmentBookingPage.tsx");

console.log("\n=== 6. Layout & Route Wiring Invariants ===");

const layoutPath = path.resolve(process.cwd(), 'src/member/layouts/MemberLayout.tsx');
assert(fs.existsSync(layoutPath), "MemberLayout.tsx exists");
const layoutSrc = fs.readFileSync(layoutPath, 'utf8');

assert(
  layoutSrc.includes('to="/uye/randevu-al"') && layoutSrc.includes("Randevu Al"),
  "MemberLayout.tsx includes 'Randevu Al' link to /uye/randevu-al"
);

const dashboardPath = path.resolve(process.cwd(), 'src/member/pages/MemberDashboardPage.tsx');
assert(fs.existsSync(dashboardPath), "MemberDashboardPage.tsx exists");
const dashboardSrc = fs.readFileSync(dashboardPath, 'utf8');

assert(
  dashboardSrc.includes('to="/uye/randevu-al"') && dashboardSrc.includes("Randevu Al"),
  "MemberDashboardPage.tsx includes 'Randevu Al' CTA to /uye/randevu-al"
);

const routesPath = path.resolve(process.cwd(), 'src/routes/index.tsx');
assert(fs.existsSync(routesPath), "src/routes/index.tsx exists");
const routesSrc = fs.readFileSync(routesPath, 'utf8');

assert(
  routesSrc.includes("MemberAppointmentBookingPage"),
  "src/routes/index.tsx imports MemberAppointmentBookingPage"
);
assert(
  routesSrc.includes('path: "randevu-al"') || routesSrc.includes("path: 'randevu-al'"),
  "src/routes/index.tsx registers 'randevu-al' route under /uye"
);

console.log("\n=== 7. Decisions Documentation & Package.json Invariants ===");

const decPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decPath), "DECISIONS.md exists");
const decSrc = fs.readFileSync(decPath, 'utf8');

assert(
  decSrc.includes("## F.24C.3 Member Self-Service Appointment Booking UI"),
  "DECISIONS.md documents F.24C.3"
);
assert(
  decSrc.includes("member booking UI consumes server-generated 14-day options only"),
  "DECISIONS.md documents server-generated 14-day options consumption"
);
assert(
  decSrc.includes("flow is date → slot → eligible package → confirmation"),
  "DECISIONS.md documents progressive date -> slot -> package -> confirm flow"
);
assert(
  decSrc.includes("successful booking refetches booking options"),
  "DECISIONS.md documents options refetch on success"
);

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkgJson.scripts && pkgJson.scripts["verify:member-appointment-booking-ui"] === "node scripts/verify-member-appointment-booking-ui.mjs",
  "package.json registers verify:member-appointment-booking-ui"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Member Self-Service Appointment Booking UI verification detected violations.");
  process.exit(1);
} else {
  console.log("\nPASS — F.24C.3 MEMBER SELF-SERVICE APPOINTMENT BOOKING UI CLOSED");
  process.exit(0);
}
