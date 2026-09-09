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

check(fs.existsSync(sessionPackageCtrl), 'SessionPackageController exists');

if (fs.existsSync(sessionPackageCtrl)) {
    const spContent = fs.readFileSync(sessionPackageCtrl, 'utf8');
    
    check(spContent.includes('AuthMiddleware::hasRole([\'super_admin\', \'admin\'])'), 'SessionPackageController has explicit super_admin/admin guards');
    check(spContent.includes('public function index()'), 'GET catalog method exists');
    check(spContent.includes('public function create()'), 'POST create method exists');
    check(spContent.includes('Unknown field:'), 'POST create has strict payload validation');
    check(spContent.includes('public function update('), 'PATCH update method exists');
    check(spContent.includes('Unknown field:'), 'PATCH update has strict payload validation');
    check(!spContent.includes('public function delete('), 'No DELETE method in SessionPackageController');
    check(spContent.includes('An unexpected error occurred'), 'Generic 500 error messages used in SessionPackageController');
    
    // NEW HARDENED CHECKS
    check(spContent.includes('Database::getInstance()->getConnection()'), 'SessionPackageController uses Database::getInstance()->getConnection()');
    check(spContent.includes('AuditLogger::log(\'session_package.create\', $adminId, \'session_package\', $id,'), 'AuditLogger::log in create has correct canonical 5-parameter signature with $adminId');
    check(spContent.includes('AuditLogger::log(\'session_package.update\', $adminId, \'session_package\', $id,'), 'AuditLogger::log in update has correct canonical 5-parameter signature with $adminId');
    check(spContent.includes('$allowedParams = [\'status\', \'q\', \'page\', \'per_page\'];'), 'Catalog GET has strict allowlist for query parameters');
    check(spContent.includes('in_array($_GET[\'status\'], [\'active\', \'inactive\'])'), 'Catalog GET strictly validates active/inactive status');
    check(spContent.includes('ctype_digit((string)$_GET[\'page\'])'), 'Catalog GET strictly validates page as positive integer');
    check(spContent.includes('ctype_digit((string)$_GET[\'per_page\'])'), 'Catalog GET strictly validates per_page as positive integer');
    check(spContent.includes('catch (\\Throwable $e)'), 'SessionPackageController mutations catch \\Throwable');
    check(spContent.includes('if ($this->db->inTransaction()) {'), 'SessionPackageController rollback guarded by inTransaction()');
    check(spContent.includes('random_bytes(16)'), 'SessionPackageController UUID generation uses random_bytes(16)');
}

check(fs.existsSync(memberSessionPackageCtrl), 'MemberSessionPackageController exists');

if (fs.existsSync(memberSessionPackageCtrl)) {
    const mspContent = fs.readFileSync(memberSessionPackageCtrl, 'utf8');
    
    check(mspContent.includes('AuthMiddleware::hasRole([\'super_admin\', \'admin\'])'), 'MemberSessionPackageController has explicit super_admin/admin guards');
    check(mspContent.includes('public function index('), 'GET member package list method exists');
    check(mspContent.includes('COALESCE(SUM(mspl.delta), 0)'), 'remaining sessions calculation uses SUM(delta)');
    check(mspContent.includes('$effectiveStatus = \'active\''), 'effective_status is computed');
    check(!mspContent.includes('UPDATE member_session_packages SET status = \'expired\''), 'effective_status does not update DB directly during read');
    check(mspContent.includes('package_name_snapshot'), 'Assignment takes package_name_snapshot');
    check(mspContent.includes('total_sessions'), 'Assignment takes total_sessions snapshot');
    check(mspContent.includes('Session package is inactive'), 'Inactive catalog package cannot be assigned');
    check(mspContent.includes('- 1) . \' days\''), 'validity_days calculation is inclusive (- 1 days)');
    check(!mspContent.includes('INSERT INTO member_session_package_ledger'), 'Assignment does not create initial ledger row');
    check(!mspContent.includes('Member already has an active package'), 'Multiple active packages are not artificially blocked');
    check(mspContent.includes('FOR UPDATE'), 'Cancel method uses FOR UPDATE lock');
    check(mspContent.includes('beginTransaction()'), 'Cancel method uses transaction');
    check(mspContent.includes('PACKAGE_HAS_ACTIVE_RESERVATIONS'), 'Cancel rejects active reservations');
    check(mspContent.includes('public function ledger('), 'Ledger read endpoint exists');
    check(!mspContent.includes('public function adjust(') && !mspContent.includes('INSERT INTO member_session_package_ledger'), 'No ledger mutation endpoint exists');

    // NEW HARDENED CHECKS
    check(mspContent.includes('Database::getInstance()->getConnection()'), 'MemberSessionPackageController uses Database::getInstance()->getConnection()');
    check(mspContent.includes('AuditLogger::log(\'member_session_package.assign\', $adminId, \'member_session_package\', $newId,'), 'AuditLogger::log in assign has correct canonical 5-parameter signature with $adminId');
    check(mspContent.includes('AuditLogger::log(\'member_session_package.cancel\', $adminId, \'member_session_package\', $id,'), 'AuditLogger::log in cancel has correct canonical 5-parameter signature with $adminId');
    check(mspContent.includes('a.display_name as created_by_name'), 'Ledger uses display_name projection');
    check(!mspContent.includes('a.name as created_by'), 'Ledger does not use a.name projection');
    check(mspContent.includes('\\DateTime::createFromFormat(\'Y-m-d\''), 'Assignment uses DateTime::createFromFormat for calendar validation');
    check(mspContent.includes('catch (\\Throwable $e)'), 'MemberSessionPackageController mutations catch \\Throwable');
    check(mspContent.includes('if ($this->db->inTransaction()) {'), 'MemberSessionPackageController rollback guarded by inTransaction()');
    check(mspContent.includes('SELECT id FROM member_session_packages WHERE id = :id'), 'Ledger endpoint checks package existence (404 behavior)');
    check(mspContent.includes('random_bytes(16)'), 'MemberSessionPackageController UUID generation uses random_bytes(16)');
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
