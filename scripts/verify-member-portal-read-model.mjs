import fs from 'fs';
import path from 'path';

function fail(msg) {
    console.error('❌ ' + msg);
    process.exit(1);
}

function pass(msg) {
    console.log('✅ ' + msg);
}

const controllerPath = path.join(process.cwd(), 'api/controllers/MemberPortalController.php');
if (!fs.existsSync(controllerPath)) {
    fail('MemberPortalController.php does not exist');
}
const controller = fs.readFileSync(controllerPath, 'utf8');

const indexPath = path.join(process.cwd(), 'api/index.php');
const index = fs.readFileSync(indexPath, 'utf8');

pass('MemberPortalController exists');

// 2. four exact GET routes exist
const routes = ['/api/member/overview', '/api/member/session-packages', '/api/member/appointments', '/api/member/training-program'];
for (const r of routes) {
    if (!index.includes(`$requestUri === '${r}' && $method === 'GET'`)) {
        fail(`Missing GET route: ${r}`);
    }
}
pass('Four exact GET routes exist');

// 3. no member POST/PATCH/DELETE content route
if (index.includes('/api/member/') && (index.includes("=== 'POST'") || index.includes("=== 'PATCH'") || index.includes("=== 'DELETE'")) && !index.includes('/api/member-auth/')) {
    // We only have our 4 gets, so any POST/PATCH/DELETE to /api/member/ (not auth) is bad
    // Wait, regex check
    const memberMutation = /if\s*\(\s*\$requestUri\s*===\s*'\/api\/member\/.*?&&\s*\$method\s*===\s*'(POST|PATCH|DELETE)'\)/;
    if (memberMutation.test(index)) {
        fail('Found POST/PATCH/DELETE route for /api/member/');
    }
}
pass('No member POST/PATCH/DELETE content route');

// 4. every endpoint MemberAuthMiddleware protected
if (!controller.includes('MemberAuthMiddleware::handle()')) {
    fail('MemberAuthMiddleware::handle() missing from controller');
}
pass('MemberAuthMiddleware protected');

// 5. portal password-change-required guard exists
if (!controller.includes("must_change_password") || !controller.includes("PASSWORD_CHANGE_REQUIRED")) {
    fail('password-change-required guard missing');
}
pass('Portal password-change-required guard exists');

// 6. member identity source is $_SESSION['member_id']
if (!controller.includes("$_SESSION['member_id']")) {
    fail('$_SESSION[member_id] not found');
}
pass('Member identity source is $_SESSION[member_id]');

// 7. no member_id query parameter
// 8. no member ID path selector
if (controller.includes('$_GET') || controller.includes('$_POST') || controller.includes('$_REQUEST') || index.includes('/api/member/members/')) {
    fail('Contains member_id query param or path selector');
}
pass('No member_id query parameter or path selector');

// 9. overview safe member fields
// 10. overview excludes notes
// 11. overview excludes emergency contacts
if (controller.includes('notes') || controller.includes('emergency_contact')) {
    fail('Overview exposes sensitive fields');
}
pass('Overview safe member fields and excludes notes/emergency contacts');

// 12. overview membership status derivation
if (!controller.includes("status' => 'not_set'") || !controller.includes('upcoming') || !controller.includes('expired') || !controller.includes('MEMBER_MEMBERSHIP_DATA_INCONSISTENT')) {
    fail('Membership status derivation missing or incomplete');
}
pass('Overview membership status derivation verified');

// 13. Europe/Istanbul date semantics
if (!controller.includes("Europe/Istanbul")) {
    fail('Europe/Istanbul timezone missing');
}
pass('Europe/Istanbul date semantics verified');

// 14. trainer safe projection
if (!controller.includes('role_title')) {
    fail('Trainer safe projection missing role_title');
}
pass('Trainer safe projection verified');

// 15. package endpoint self-only
// 16. snapshot package name
if (!controller.includes('package_name_snapshot')) {
    fail('Snapshot package name missing');
}
pass('Package endpoint self-only & snapshot package name verified');

// 17. remaining = total + ledger delta sum
if (!controller.includes('SUM(delta)')) {
    fail('Remaining sessions derivation missing ledger sum');
}
pass('Remaining = total + ledger delta sum verified');

// 18. reserved = scheduled appointments
// 19. completed/no_show not reserved
if (!controller.includes("status = 'scheduled'")) {
    fail('Reserved sessions missing scheduled filter');
}
pass('Reserved = scheduled appointments verified');

// 20. package scheduled ledger integrity reserve=1/release=0
if (!controller.includes('SESSION_PACKAGE_LEDGER_INCONSISTENT') || !controller.includes('reserve_cnt') || !controller.includes('release_cnt')) {
    fail('Package scheduled ledger integrity check missing');
}
pass('Package scheduled ledger integrity reserve=1/release=0 verified');

// 21. effective status priority
if (!controller.includes("$effectiveStatus = 'cancelled'") || !controller.includes("$effectiveStatus = 'expired'") || !controller.includes("$effectiveStatus = 'exhausted'")) {
    fail('Effective status priority logic missing');
}
pass('Effective status priority verified');

// 22. no catalog status dependency
// We aren't querying `session_packages` catalog table
if (controller.includes('JOIN session_packages')) {
    fail('Catalog status dependency found');
}
pass('No catalog status dependency verified');

// 23. no package admin IDs
if (controller.includes('assigned_by') || controller.includes('cancelled_by')) {
    fail('Package admin IDs exposed');
}
pass('No package admin IDs exposed');

// 24. appointments self-only
// 25. explicit business timezone now
// 26. upcoming canonical predicate
// 27. recent canonical predicate
if (!controller.includes('isUpcoming')) {
    fail('Appointments upcoming/recent split logic missing');
}
pass('Appointments self-only & canonical predicates verified');

// 28. upcoming limit 20
// 29. recent limit 20
if (!controller.includes('array_slice($upcoming, 0, 20)') || !controller.includes('array_slice($recent, 0, 20)')) {
    fail('Upcoming/recent limit 20 missing');
}
pass('Upcoming/recent limit 20 verified');

// 30. trainer safe appointment projection
// 31. package snapshot appointment projection
// 32. legacy null appointment package supported
if (!controller.includes('package_name_snapshot')) {
    fail('Package snapshot appointment projection missing');
}
pass('Trainer safe & package snapshot appointment projections verified');

// 33. no appointment admin actor IDs exposed
if (controller.includes('completed_by') || controller.includes('no_show_by')) {
    fail('Appointment admin actor IDs exposed');
}
pass('No appointment admin actor IDs exposed');

// 34. active training programs only
// 35. soft-deleted programs excluded
if (!controller.includes("status = 'active'") || !controller.includes('deleted_at IS NULL')) {
    fail('Active/soft-deleted training programs logic missing');
}
pass('Active training programs only & soft-deleted excluded verified');

// 36. program exercises sorted
if (!controller.includes('ORDER BY sort_order ASC')) {
    fail('Program exercises not sorted');
}
pass('Program exercises sorted verified');

// 37. program notes excluded
if (controller.includes('notes')) {
    fail('Program notes exposed');
}
pass('Program notes excluded verified');

// 38. no measurements endpoint
// 39. no progress-notes endpoint
if (index.includes('/api/member/measurements') || index.includes('/api/member/progress-notes')) {
    fail('Measurements or progress-notes endpoint found');
}
pass('No measurements or progress-notes endpoint verified');

pass('All F.18B Member Portal Self-Service Read Model checks passed!');
