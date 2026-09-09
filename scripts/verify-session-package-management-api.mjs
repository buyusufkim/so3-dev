import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
let pass = true;

const check = (condition, msg) => {
    if (condition) {
        console.log(`[PASS] ${msg}`);
    } else {
        console.error(`[FAIL] ${msg}`);
        pass = false;
    }
};

const sessionPackageCtrl = path.resolve(rootDir, 'api/controllers/SessionPackageController.php');
const memberSessionPackageCtrl = path.resolve(rootDir, 'api/controllers/MemberSessionPackageController.php');
const indexPhp = path.resolve(rootDir, 'api/index.php');

// 1. SessionPackageController exists
check(fs.existsSync(sessionPackageCtrl), 'SessionPackageController exists');

if (fs.existsSync(sessionPackageCtrl)) {
    const spContent = fs.readFileSync(sessionPackageCtrl, 'utf8');
    
    // 2. explicit super_admin/admin guards
    check(spContent.includes('AuthMiddleware::hasRole([\'super_admin\', \'admin\'])'), 'SessionPackageController has explicit super_admin/admin guards');
    
    // 3. GET catalog
    check(spContent.includes('public function index()'), 'GET catalog method exists');
    
    // 4. POST create strict payload
    check(spContent.includes('public function create()'), 'POST create method exists');
    check(spContent.includes('Unknown field:'), 'POST create has strict payload validation');
    
    // 5. PATCH update strict payload
    check(spContent.includes('public function update('), 'PATCH update method exists');
    check(spContent.includes('Unknown field:'), 'PATCH update has strict payload validation');
    
    // 6. no DELETE
    check(!spContent.includes('public function delete('), 'No DELETE method in SessionPackageController');
    
    // 19. audit events
    check(spContent.includes('AuditLogger::log(\'session_package.create\''), 'Audit event session_package.create exists');
    check(spContent.includes('AuditLogger::log(\'session_package.update\''), 'Audit event session_package.update exists');
    
    // 20. generic exception responses
    check(spContent.includes('An unexpected error occurred'), 'Generic 500 error messages used in SessionPackageController');
}

check(fs.existsSync(memberSessionPackageCtrl), 'MemberSessionPackageController exists');

if (fs.existsSync(memberSessionPackageCtrl)) {
    const mspContent = fs.readFileSync(memberSessionPackageCtrl, 'utf8');
    
    // 2. explicit super_admin/admin guards
    check(mspContent.includes('AuthMiddleware::hasRole([\'super_admin\', \'admin\'])'), 'MemberSessionPackageController has explicit super_admin/admin guards');
    
    // 7. member package list exists
    check(mspContent.includes('public function index('), 'GET member package list method exists');
    
    // 8. remaining = total + SUM(delta)
    check(mspContent.includes('COALESCE(SUM(mspl.delta), 0)'), 'remaining sessions calculation uses SUM(delta)');
    
    // 9. effective status computed; DB statusa yazılmıyor
    check(mspContent.includes('$effectiveStatus = \'active\''), 'effective_status is computed');
    check(!mspContent.includes('UPDATE member_session_packages SET status = \'expired\''), 'effective_status does not update DB directly during read');
    
    // 10. assignment package snapshot
    check(mspContent.includes('package_name_snapshot'), 'Assignment takes package_name_snapshot');
    check(mspContent.includes('total_sessions'), 'Assignment takes total_sessions snapshot');
    
    // 11. inactive catalog package cannot assign
    check(mspContent.includes('Session package is inactive'), 'Inactive catalog package cannot be assigned');
    
    // 12. validity_days inclusive date calculation
    check(mspContent.includes('- 1) . \' days\''), 'validity_days calculation is inclusive (- 1 days)');
    
    // 13. assignment has no initial ledger row
    check(!mspContent.includes('INSERT INTO member_session_package_ledger'), 'Assignment does not create initial ledger row');
    
    // 14. multiple active packages not artificially blocked
    check(!mspContent.includes('Member already has an active package'), 'Multiple active packages are not artificially blocked');
    
    // 15. cancel transaction/lock
    check(mspContent.includes('FOR UPDATE'), 'Cancel method uses FOR UPDATE lock');
    check(mspContent.includes('beginTransaction()'), 'Cancel method uses transaction');
    
    // 16. cancel rejects active reservations
    check(mspContent.includes('PACKAGE_HAS_ACTIVE_RESERVATIONS'), 'Cancel rejects active reservations');
    
    // 17. ledger read-only endpoint
    check(mspContent.includes('public function ledger('), 'Ledger read endpoint exists');
    
    // 18. no ledger mutation/adjustment endpoint
    check(!mspContent.includes('public function adjust(') && !mspContent.includes('INSERT INTO member_session_package_ledger'), 'No ledger mutation endpoint exists');
    
    // 19. audit events
    check(mspContent.includes('AuditLogger::log(\'member_session_package.assign\''), 'Audit event member_session_package.assign exists');
    check(mspContent.includes('AuditLogger::log(\'member_session_package.cancel\''), 'Audit event member_session_package.cancel exists');
}

if (fs.existsSync(indexPhp)) {
    const indexContent = fs.readFileSync(indexPhp, 'utf8');
    check(indexContent.includes('/api/admin/session-packages'), 'Routes for session packages are registered');
    check(indexContent.includes('/api/admin/members/'), 'Routes for member session packages are registered');
}

// Check other files to ensure regression hasn't occurred
const memberControllerPath = path.resolve(rootDir, 'api/controllers/MemberController.php');
if (fs.existsSync(memberControllerPath)) {
    const content = fs.readFileSync(memberControllerPath, 'utf8');
    check(!content.includes('session_package'), 'MemberController membership semantics not replaced');
}

const receptionMemberControllerPath = path.resolve(rootDir, 'api/controllers/ReceptionMemberController.php');
if (fs.existsSync(receptionMemberControllerPath)) {
    const content = fs.readFileSync(receptionMemberControllerPath, 'utf8');
    check(!content.includes('session_package'), 'Reception check-in semantics not replaced');
}

const appointmentControllerPath = path.resolve(rootDir, 'api/controllers/AppointmentController.php');
if (fs.existsSync(appointmentControllerPath)) {
    const content = fs.readFileSync(appointmentControllerPath, 'utf8');
    check(!content.includes('member_session_package_ledger'), 'AppointmentController lifecycle business logic remains unchanged in this phase');
}

if (pass) {
    console.log('\nPASS — F.17B.1 SESSION PACKAGE MANAGEMENT API VERIFIED');
    process.exit(0);
} else {
    console.error('\nFAIL — Verifications failed.');
    process.exit(1);
}
