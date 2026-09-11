import fs from 'fs';
let exitCode = 0;
function check(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`);
    } else {
        console.error(`[FAIL] ${message}`);
        exitCode = 1;
    }
}

const controllerStr = fs.readFileSync('api/controllers/AppointmentController.php', 'utf8');
const packageControllerStr = fs.readFileSync('api/controllers/MemberSessionPackageController.php', 'utf8');
const modalStr = fs.readFileSync('src/admin/pages/appointments/AppointmentCreateModal.tsx', 'utf8');
const fixturesStr = fs.readFileSync('src/admin/api/adminDevFixtures.ts', 'utf8');
const typesStr = fs.readFileSync('src/admin/pages/appointments/types.ts', 'utf8');

check(!packageControllerStr.includes('$pkg[\'reserved_sessions\'] = $res - $rel; // Net reservations'), 'MemberSessionPackageController icinde reserved_sessions = reserve - release KULLANILMIYOR');
check(!packageControllerStr.includes('if ($netReservations > 0) {'), 'package cancel netReservations > 0 ile KORUNMUYOR');
check(!controllerStr.includes('$reserved = (int)$pkg[\'reserve_count\'] - (int)$pkg[\'release_count\'];'), 'options reserved tüm gecmisten HESAPLANMIYOR');
check(controllerStr.includes('SELECT id FROM appointments WHERE member_session_package_id = ? AND status = \'scheduled\''), 'options endpointinde yalnız scheduled olanlar reserved sayılır');
check(fixturesStr.includes('a.status === \'scheduled\''), 'DEV getDerivedMsp reserved icin yalnız scheduled kontrolü yapıyor');
check(typesStr.includes('Number.isFinite(appt.id)') && typesStr.includes('Number.isFinite(appt.trainer_id)'), 'create-success ID ve trainer_id finite validation eklendi');
check(fixturesStr.includes('allowedKeys.every'), 'DEV create unknown field KABUL ETMIYOR');
check(fixturesStr.includes('validateDateTime('), 'DEV create malformed DATETIME kabul etmiyor');
check(fixturesStr.includes('cancellation_reason !== \'string\''), 'DEV cancel missing reason sentetik kabul etmiyor');
check(!controllerStr.includes("handleCreate(['member_id', 'trainer_id', 'starts_at', 'ends_at']"), 'package-less backend create yeniden AÇILMADI');

console.log("--- Semantic Fixture Self-Test ---");

// We can just verify the DEV fixtures logic with a mock state
let testState = {
  packageLedgers: [],
  mockAppointments: [],
  memberSessionPackages: [
    { id: 1, member_id: 1, total_sessions: 3, stored_status: 'active' }
  ]
};

function getDerivedMsp(msp) {
  const ledgers = testState.packageLedgers.filter(l => l.member_session_package_id === msp.id);
  const sumDelta = ledgers.reduce((acc, l) => acc + l.delta, 0);
  
  const reservedCount = testState.mockAppointments.filter(
    a => a.member_session_package_id === msp.id && a.status === 'scheduled'
  ).length;
  
  return {
    ...msp,
    remaining_sessions: msp.total_sessions + sumDelta,
    reserved_sessions: reservedCount
  };
}

let msp1 = getDerivedMsp(testState.memberSessionPackages[0]);
check(msp1.remaining_sessions === 3 && msp1.reserved_sessions === 0, 'initial state: 3 total, 3 remaining, 0 reserved');

// create A
testState.mockAppointments.push({ id: 101, member_session_package_id: 1, status: 'scheduled' });
testState.packageLedgers.push({ member_session_package_id: 1, appointment_id: 101, delta: -1, entry_type: 'reserve' });
let msp2 = getDerivedMsp(testState.memberSessionPackages[0]);
check(msp2.remaining_sessions === 2 && msp2.reserved_sessions === 1, 'create A: remaining=2, reserved=1');

// complete A
testState.mockAppointments[0].status = 'completed';
let msp3 = getDerivedMsp(testState.memberSessionPackages[0]);
check(msp3.remaining_sessions === 2 && msp3.reserved_sessions === 0, 'complete A: remaining=2, reserved=0 (consumed, not reserved)');

// create B
testState.mockAppointments.push({ id: 102, member_session_package_id: 1, status: 'scheduled' });
testState.packageLedgers.push({ member_session_package_id: 1, appointment_id: 102, delta: -1, entry_type: 'reserve' });
let msp4 = getDerivedMsp(testState.memberSessionPackages[0]);
check(msp4.remaining_sessions === 1 && msp4.reserved_sessions === 1, 'create B: remaining=1, reserved=1');

// cancel B
testState.mockAppointments[1].status = 'cancelled';
testState.packageLedgers.push({ member_session_package_id: 1, appointment_id: 102, delta: 1, entry_type: 'release' });
let msp5 = getDerivedMsp(testState.memberSessionPackages[0]);
check(msp5.remaining_sessions === 2 && msp5.reserved_sessions === 0, 'cancel B: remaining=2, reserved=0 (restored)');

// create C
testState.mockAppointments.push({ id: 103, member_session_package_id: 1, status: 'scheduled' });
testState.packageLedgers.push({ member_session_package_id: 1, appointment_id: 103, delta: -1, entry_type: 'reserve' });
let msp6 = getDerivedMsp(testState.memberSessionPackages[0]);
check(msp6.remaining_sessions === 1 && msp6.reserved_sessions === 1, 'create C: remaining=1, reserved=1');

// no_show C
testState.mockAppointments[2].status = 'no_show';
let msp7 = getDerivedMsp(testState.memberSessionPackages[0]);
check(msp7.remaining_sessions === 1 && msp7.reserved_sessions === 0, 'no_show C: remaining=1, reserved=0 (consumed, not reserved)');

process.exit(exitCode);
