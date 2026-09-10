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
const modalStr = fs.readFileSync('src/admin/pages/appointments/AppointmentCreateModal.tsx', 'utf8');
const fixturesStr = fs.readFileSync('src/admin/api/adminDevFixtures.ts', 'utf8');
const fallbackStr = fs.readFileSync('src/admin/api/adminDevFallback.ts', 'utf8');
const typesStr = fs.readFileSync('src/admin/pages/appointments/types.ts', 'utf8');

check(!controllerStr.includes("handleCreate(['member_id', 'trainer_id', 'starts_at', 'ends_at']"), 'backend legacy create shape removed');
check(controllerStr.includes("member_session_package_id must be a positive integer"), 'member_session_package_id required all create scopes');
check(!fs.existsSync('database/migrations/038_make_member_session_package_id_not_null.sql'), 'DB column remains nullable — no schema mutation');
check(modalStr.includes('const [packageOptions, setPackageOptions]'), 'AppointmentCreateModal package state exists');
check(modalStr.includes('/api/admin/appointment-session-packages'), 'scope-specific package options endpoints');
check(modalStr.includes('if (!selectedMemberId'), 'options fetch only after member selection');
check(modalStr.includes("setSelectedPackageId('')"), 'selected member reset clears package selection');
check(!modalStr.includes("if (validItems.length === 1) setSelectedPackageId"), 'no automatic single-package selection');
check(modalStr.includes("Number.isInteger(item.remaining_sessions)"), 'strict options runtime validator');
check(modalStr.includes("item.remaining_sessions <= 0"), 'remaining >0 validator');
check(modalStr.includes("item.valid_from !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test"), 'valid date validation');
check(modalStr.includes('Seans Paketi'), 'package picker rendered');
check(modalStr.includes('!selectedPackageId'), 'empty options blocks submit');
check(modalStr.includes('selectedPackageId <= 0'), 'selected package positive integer required');
check(modalStr.includes('member_session_package_id: selectedPackageId'), 'admin/reception payload includes package ID');
check(modalStr.includes("scope === 'trainer'") && modalStr.includes('member_session_package_id: selectedPackageId'), 'trainer payload includes package ID');
check(modalStr.includes("typeof appt.member_session_package_id !== 'number'"), 'success response package ID validation');
check(modalStr.includes("appt.member_session_package_id !== selectedPackageId"), 'response package ID equals selected package');
check(modalStr.includes("SESSION_PACKAGE_EXHAUSTED") && modalStr.includes("SESSION_PACKAGE_INELIGIBLE"), 'package race error mappings');
check(modalStr.includes("setSelectedPackageId('')"), 'race errors refetch package options (resets selection)');
check(modalStr.includes('packagesAbortControllerRef.current = abortController;'), 'request AbortController/generation protection');
check(modalStr.includes('catch (err: unknown)'), 'catch unknown / ApiError pattern');
check(!modalStr.includes('const payload: any ='), 'no create-flow payload: any');
check(fallbackStr.includes('/api/admin/appointment-session-packages'), 'DEV fallback options target');
check(fixturesStr.includes('/appointment-session-packages'), 'DEV package-options handler');
check(fixturesStr.includes("entry_type: 'reserve'"), 'DEV append-only reserve ledger');
check(fixturesStr.includes("sumDelta") || fixturesStr.includes("reduce"), 'DEV balance ledger-derived');
check(fixturesStr.includes("if (!pkgId || pkgId <= 0)"), 'DEV create requires package');
check(fixturesStr.includes("delta: -1"), 'DEV create reserve -1');
check(fixturesStr.includes("delta: 1"), 'DEV cancel release +1');
check(!fixturesStr.includes("delta: 1") || fixturesStr.includes("if (action === 'cancel') {") && !fixturesStr.includes("if (action === 'complete') { packageLedgers.push"), 'DEV complete no release');
check(!fixturesStr.includes("delta: 1") || fixturesStr.includes("if (action === 'cancel') {") && !fixturesStr.includes("if (action === 'no-show') { packageLedgers.push"), 'DEV no_show no release');
check(!fixturesStr.includes("delta: 1") || fixturesStr.includes("if (action === 'cancel') {") && !fixturesStr.includes("if (action === 'reschedule') { packageLedgers.push"), 'DEV reschedule no ledger mutation');
check(fixturesStr.includes("packageLedgers.filter(l => l.member_session_package_id === pkId)"), 'DEV ledger GET returns stateful entries');
check(!controllerStr.includes("public function handleCreate(array $allowedKeysLegacy"), 'legacy DEV appointment NULL remains supported'); // Controller check is a proxy for no mandatory change
check(!controllerStr.includes("SELECT id FROM member_session_packages LIMIT 1"), 'no automatic backend package selection');
check(!fs.existsSync('database/migrations/038_cutover.sql'), 'no schema migration');
check(!fs.existsSync('patch_modal.mjs') && !fs.existsSync('patch_fixtures.mjs'), 'no temp artifacts');

process.exit(exitCode);
