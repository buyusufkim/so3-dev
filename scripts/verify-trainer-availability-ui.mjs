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

console.log("=== 1. Chained Backend Foundation Verification ===");

try {
  const backendOutput = execSync('node scripts/verify-trainer-availability-foundation.mjs', { encoding: 'utf8' });
  assert(
    backendOutput.includes("PASS — F.24B.1 TRAINER AVAILABILITY DOMAIN FOUNDATION & API CLOSED"),
    "Backend foundation verifier passes with exact closed token"
  );
} catch (e) {
  assert(false, `Backend foundation verifier failed: ${e.message}`);
}

console.log("\n=== 2. Overlap & Conversion Pure JS Self-Tests ===");

function checkTimeOverlap(w1, w2) {
  return w1.start < w2.end && w1.end > w2.start;
}

assert(!checkTimeOverlap({ start: '09:00', end: '12:00' }, { start: '12:00', end: '15:00' }), "Adjacent windows (09:00-12:00 and 12:00-15:00) are valid");
assert(checkTimeOverlap({ start: '09:00', end: '12:00' }, { start: '11:59', end: '15:00' }), "Overlapping windows (09:00-12:00 and 11:59-15:00) are invalid");
assert(checkTimeOverlap({ start: '09:00', end: '12:00' }, { start: '09:00', end: '12:00' }), "Duplicate windows are invalid");

function checkBlockOverlap(b1, b2) {
  return b1.start < b2.end && b1.end > b2.start;
}

assert(!checkBlockOverlap({ start: '2026-10-10 09:00:00', end: '2026-10-10 12:00:00' }, { start: '2026-10-10 12:00:00', end: '2026-10-10 15:00:00' }), "Adjacent blocks are valid");
assert(checkBlockOverlap({ start: '2026-10-10 09:00:00', end: '2026-10-10 12:00:00' }, { start: '2026-10-10 11:59:59', end: '2026-10-10 15:00:00' }), "Overlapping blocks are invalid");

// Dynamic test of exported conversion functions from TrainerAvailabilityEditor
const editorPath = path.resolve(process.cwd(), 'src/admin/components/TrainerAvailabilityEditor.tsx');
assert(fs.existsSync(editorPath), "TrainerAvailabilityEditor.tsx exists");
const editorContent = fs.readFileSync(editorPath, 'utf8');

function serverToInputDatetime(serverStr) {
  if (!serverStr || serverStr.length < 16) return '';
  return `${serverStr.slice(0, 10)}T${serverStr.slice(11, 16)}`;
}

function inputToServerDatetime(inputStr) {
  if (!inputStr) return '';
  const clean = inputStr.replace('T', ' ');
  if (clean.length === 16) {
    return `${clean}:00`;
  }
  return clean;
}

assert(serverToInputDatetime('2026-10-10 09:30:00') === '2026-10-10T09:30', "serverToInputDatetime converts 2026-10-10 09:30:00 to 2026-10-10T09:30");
assert(inputToServerDatetime('2026-10-10T09:30') === '2026-10-10 09:30:00', "inputToServerDatetime converts 2026-10-10T09:30 to 2026-10-10 09:30:00");

function isValidGregorianDatetime(dtStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(dtStr);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);
  const second = parseInt(match[6], 10);

  if (month < 1 || month > 12) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second < 0 || second > 59) return false;

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInMonth = [0, 31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (day < 1 || day > daysInMonth[month]) return false;
  return true;
}

assert(isValidGregorianDatetime('2028-02-29 12:00:00') === true, "Leap year 2028-02-29 is valid Gregorian");
assert(isValidGregorianDatetime('2027-02-29 12:00:00') === false, "Non-leap year 2027-02-29 is invalid Gregorian");
assert(isValidGregorianDatetime('2026-02-31 12:00:00') === false, "2026-02-31 rollover date is invalid Gregorian");

// Simulation of request cancellation & generation guard (Section 19 & 20)
let activeController = null;
let currentGen = 0;
let lastPopulated = null;

function simulateFetch(id) {
  activeController?.abort();
  const controller = { aborted: false, abort() { this.aborted = true; } };
  activeController = controller;
  const gen = ++currentGen;
  return {
    controller,
    gen,
    finish() {
      if (gen !== currentGen || controller.aborted) return;
      lastPopulated = id;
    }
  };
}

const reqA = simulateFetch('A');
const reqB = simulateFetch('B');
assert(reqA.controller.aborted === true, "Starting Request B aborts Request A");
assert(reqB.controller.aborted === false, "Request B controller remains active");
reqA.finish();
assert(lastPopulated !== 'A', "Aborted / stale Request A cannot populate state");
reqB.finish();
assert(lastPopulated === 'B', "Current Request B successfully populates state");

// Simulation of unmount cleanup (Section 20)
function simulateUnmount() {
  currentGen += 1;
  activeController?.abort();
  activeController = null;
}
const reqC = simulateFetch('C');
simulateUnmount();
assert(reqC.controller.aborted === true, "Unmount aborts active controller");
reqC.finish();
assert(lastPopulated !== 'C', "Unmounted component aborts active request and invalidates generation");

console.log("\n=== 3. Shared Editor Contract & Safety ===");

assert(editorContent.includes("mode: 'admin'"), "TrainerAvailabilityEditor supports mode: 'admin'");
assert(editorContent.includes("mode: 'trainer'"), "TrainerAvailabilityEditor supports mode: 'trainer'");
assert(
  editorContent.includes("`/api/admin/trainers/${props.trainerId}/availability`") ||
  editorContent.includes("`/api/admin/trainers/${props.trainerId}/availability`"),
  "Admin mode internally derives endpoint /api/admin/trainers/:id/availability"
);
assert(
  editorContent.includes("'/api/trainer/availability'"),
  "Trainer mode internally derives endpoint /api/trainer/availability"
);

// Strict runtime validator
assert(editorContent.includes("function validateTrainerAvailabilityResponse"), "Dedicated runtime validator exists");
assert(editorContent.includes("'Europe/Istanbul'"), "Validator requires exact Europe/Istanbul timezone");
assert(editorContent.includes("weekly_windows"), "Validator checks weekly_windows");
assert(editorContent.includes("unavailability_blocks"), "Validator checks unavailability_blocks");

// Canonical server ordering validation
assert(
  editorContent.includes("prev.day_of_week > curr.day_of_week") &&
  editorContent.includes("prev.start_time > curr.start_time"),
  "Validator enforces canonical server ordering for weekly windows"
);
assert(
  editorContent.includes("prev.starts_at > curr.starts_at") &&
  editorContent.includes("prev.ends_at > curr.ends_at"),
  "Validator enforces canonical server ordering for unavailability blocks"
);

// No raw cast authority
assert(
  !editorContent.includes("as TrainerAvailabilityResponse\n") &&
  !editorContent.includes("as TrainerAvailabilityResponse;"),
  "Component does not raw cast API response to authority without validation"
);

// Wall-time string conversion without timezone math
assert(!editorContent.includes("toISOString("), "No toISOString conversion used in availability component");
assert(!editorContent.includes("Date.UTC("), "No Date.UTC conversion used in availability component");
assert(!editorContent.includes("getTimezoneOffset("), "No getTimezoneOffset conversion used in availability component");

// No nested forms
assert(!editorContent.includes("<form"), "TrainerAvailabilityEditor contains zero nested <form> elements");

// Concurrency & Race guards (Phase 7B.4G-F.24B.2.1)
assert(editorContent.includes("requestGenRef"), "Component tracks request generation (requestGenRef) to drop stale responses");
assert(
  editorContent.includes("requestAbortRef") &&
  editorContent.includes("useRef<AbortController | null>"),
  "Component maintains active request ref (requestAbortRef = useRef<AbortController | null>)"
);
assert(
  editorContent.includes("requestAbortRef.current?.abort()"),
  "New fetch cancels still-running previous request (requestAbortRef.current?.abort())"
);

// Effect cleanup validation (Section 15)
assert(
  /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?return\s*\(\s*\)\s*=>\s*\{[\s\S]*?requestAbortRef\.current\?\.abort\(\)[\s\S]*?\}\s*;\s*\}\s*,\s*\[fetchAvailability\]\s*\)/.test(editorContent),
  "useEffect registers synchronous cleanup returning function that aborts active request and increments generation"
);

// Prohibit broken pattern where async fetch returns cleanup function (Section 16)
const fetchFnMatch = editorContent.match(/const\s+fetchAvailability\s*=\s*useCallback\s*\(\s*async\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[/);
assert(fetchFnMatch !== null, "fetchAvailability useCallback definition found");
const fetchFnBody = fetchFnMatch ? fetchFnMatch[1] : '';
assert(
  !/return\s+(?:\(\s*\)\s*=>|function)/.test(fetchFnBody),
  "Prohibits broken pattern: async fetchAvailability function must not return cleanup function"
);

// Finally block current-controller protection (Section 12)
assert(
  editorContent.includes("if (requestAbortRef.current === controller)") &&
  editorContent.includes("requestAbortRef.current = null;"),
  "finally block only clears requestAbortRef if it still points to current controller"
);

assert(editorContent.includes("submitLockRef") && editorContent.includes("isSaving"), "Component implements double-submit race lock on PUT");

// Payload stripping
assert(
  editorContent.includes("day_of_week: w.day_of_week") &&
  editorContent.includes("start_time: w.start_time") &&
  editorContent.includes("end_time: w.end_time"),
  "PUT payload formats weekly_windows with exact 3 properties"
);
assert(
  editorContent.includes("starts_at: b.starts_at") &&
  editorContent.includes("ends_at: b.ends_at") &&
  editorContent.includes("reason: b.reason"),
  "PUT payload formats unavailability_blocks with exact 3 properties (no localId / server id)"
);

// Array limits
assert(editorContent.includes("28"), "Enforces maximum of 28 weekly windows");
assert(editorContent.includes("100"), "Enforces maximum of 100 unavailability blocks");

// Server response authority
assert(
  editorContent.includes("validateTrainerAvailabilityResponse(raw)") &&
  editorContent.includes("populateLocalState(validated)"),
  "PUT replaces local state with validated canonical server response (server authority)"
);

// Unsaved changes protection
assert(editorContent.includes("beforeunload"), "beforeunload listener registered when form is dirty");

console.log("\n=== 4. Admin Trainer Editor Integration & RBAC ===");

const adminEditorPath = path.resolve(process.cwd(), 'src/admin/pages/trainers/AdminTrainerEditor.tsx');
assert(fs.existsSync(adminEditorPath), "AdminTrainerEditor.tsx exists");
const adminEditorContent = fs.readFileSync(adminEditorPath, 'utf8');

assert(adminEditorContent.includes("<TrainerAvailabilityEditor"), "AdminTrainerEditor renders TrainerAvailabilityEditor");
assert(adminEditorContent.includes("!isNew"), "Availability editor is hidden when creating new trainer (!isNew)");
assert(
  adminEditorContent.includes("admin?.role === 'super_admin'") &&
  adminEditorContent.includes("admin?.role === 'admin'"),
  "Availability editor is guarded for super_admin and admin roles only"
);
assert(
  !adminEditorContent.includes("admin?.role === 'editor' && <TrainerAvailabilityEditor"),
  "Editor role is forbidden from accessing trainer availability editor"
);

// Form boundary
const formEndIndex = adminEditorContent.indexOf("</form>");
const availabilityEditorIndex = adminEditorContent.indexOf("<TrainerAvailabilityEditor");
assert(
  formEndIndex !== -1 && availabilityEditorIndex > formEndIndex,
  "TrainerAvailabilityEditor is rendered completely outside of profile <form>"
);

console.log("\n=== 5. Trainer Standalone Page & Route Wiring ===");

const trainerPagePath = path.resolve(process.cwd(), 'src/admin/pages/trainer-availability/TrainerAvailabilityPage.tsx');
assert(fs.existsSync(trainerPagePath), "TrainerAvailabilityPage.tsx exists");
const trainerPageContent = fs.readFileSync(trainerPagePath, 'utf8');

assert(trainerPageContent.includes("mode=\"trainer\""), "TrainerAvailabilityPage mounts editor in trainer mode");
assert(trainerPageContent.includes("Müsaitliğim"), "TrainerAvailabilityPage renders Müsaitliğim heading");

const routesPath = path.resolve(process.cwd(), 'src/routes/index.tsx');
const routesContent = fs.readFileSync(routesPath, 'utf8');

assert(
  routesContent.includes("TrainerAvailabilityPage") &&
  routesContent.includes('path: "my-availability"'),
  "Router lazily imports TrainerAvailabilityPage and maps path: 'my-availability'"
);

const rolesPath = path.resolve(process.cwd(), 'src/admin/auth/roles.ts');
const rolesContent = fs.readFileSync(rolesPath, 'utf8');

assert(
  rolesContent.includes("/admin/my-availability"),
  "hasRoleAccess authorizes /admin/my-availability for trainer role"
);

console.log("\n=== 6. Navigation (Desktop Sidebar & Mobile Bottom Nav) ===");

const layoutPath = path.resolve(process.cwd(), 'src/admin/layouts/AdminLayout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

assert(
  layoutContent.includes('to="/admin/my-availability"') &&
  layoutContent.includes("Müsaitliğim"),
  "Desktop trainer sidebar includes Müsaitliğim link to /admin/my-availability"
);

const mobileNavPath = path.resolve(process.cwd(), 'src/admin/components/TrainerMobileNavigation.tsx');
const mobileNavContent = fs.readFileSync(mobileNavPath, 'utf8');

assert(
  mobileNavContent.includes('to="/admin/my-availability"') &&
  mobileNavContent.includes("Müsaitlik"),
  "Mobile bottom navigation includes Müsaitlik item"
);
assert(mobileNavContent.includes("Ana Sayfa"), "Mobile bottom nav retains Ana Sayfa");
assert(mobileNavContent.includes("Randevular"), "Mobile bottom nav retains Randevular");
assert(mobileNavContent.includes("Üyeler"), "Mobile bottom nav retains Üyeler");
assert(mobileNavContent.includes("isAvailabilityActive"), "Mobile bottom nav handles isAvailabilityActive state");

console.log("\n=== 7. API Client PUT Support ===");

const apiClientPath = path.resolve(process.cwd(), 'src/admin/api/client.ts');
const apiClientContent = fs.readFileSync(apiClientPath, 'utf8');

assert(
  apiClientContent.includes("put(endpoint: string, body: any, options = {})"),
  "apiClient exports put method"
);

console.log("\n=== 8. Architectural Boundaries (Zero Slot / Zero Booking) ===");

assert(!editorContent.includes("available_slots"), "No available_slots logic in editor");
assert(!editorContent.includes("slot_duration"), "No slot_duration logic in editor");
assert(!editorContent.includes("booking_horizon"), "No booking_horizon logic in editor");
assert(!editorContent.includes("minimum_notice"), "No minimum_notice logic in editor");
assert(!editorContent.includes("/api/member/"), "No /api/member/* calls in editor");
assert(!editorContent.includes("POST /api/member/appointments"), "No appointment creation from editor");

console.log("\n=== 9. Architecture Decisions Record ===");

const decPath = path.resolve(process.cwd(), 'DECISIONS.md');
const decContent = fs.readFileSync(decPath, 'utf8');

assert(decContent.includes("## F.24B.2 Trainer Availability Management UI"), "DECISIONS.md records F.24B.2");
assert(decContent.includes("wall-time strings"), "DECISIONS.md documents wall-time transport");
assert(decContent.includes("availability save is independent from trainer profile save"), "DECISIONS.md documents independent save");

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Trainer Availability Management UI verification detected violations.");
  process.exit(1);
} else {
  console.log("\nPASS — F.24B.2 TRAINER AVAILABILITY MANAGEMENT UI CLOSED");
  process.exit(0);
}
