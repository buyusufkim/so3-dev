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

const dbPath = path.join(process.cwd(), 'api/core/Database.php');
if (fs.existsSync(dbPath)) {
    const dbContent = fs.readFileSync(dbPath, 'utf8');
    if (!/PDO::ATTR_EMULATE_PREPARES\s*=>\s*false/.test(dbContent)) {
        fail('PDO::ATTR_EMULATE_PREPARES => false not found in api/core/Database.php');
    }
    pass('PDO native prepare invariant verified');
}

// Schema Checks
const schema030 = fs.readFileSync(path.join(process.cwd(), 'database/migrations/030_create_members.sql'), 'utf8');
const schema022 = fs.readFileSync(path.join(process.cwd(), 'database/migrations/022_create_trainers.sql'), 'utf8');
const schema031 = fs.readFileSync(path.join(process.cwd(), 'database/migrations/031_create_training_programs.sql'), 'utf8');

if (!schema030.includes('membership_start_date') || !schema030.includes('membership_end_date')) {
    fail('030 does not contain membership_start_date/end_date');
}
pass('030 contains membership_start_date/end_date');

if (!schema022.includes('name')) {
    fail('022 does not contain name');
}
if (schema022.includes('first_name') || schema022.includes('last_name')) {
    fail('022 contains first_name/last_name');
}
pass('022 contains name and does NOT contain first_name/last_name');

if (!schema031.includes('program_id')) {
    fail('031 does not contain program_exercises.program_id');
}
pass('031 contains program_exercises.program_id');

if (!schema031.includes('repetitions') || !schema031.includes('VARCHAR(40)')) {
    fail('031 does not contain repetitions VARCHAR(40)');
}
pass('031 contains repetitions VARCHAR(40)');

// Controller Namespace/Uses/DB check
if (!controller.includes('namespace Controllers;')) fail('namespace Controllers; missing');
if (!controller.includes('use Core\\Database;')) fail('use Core\\Database; missing');
if (!controller.includes('use Core\\Response;')) fail('use Core\\Response; missing');
if (!controller.includes('use Middleware\\MemberAuthMiddleware;')) fail('use Middleware\\MemberAuthMiddleware; missing');
if (!controller.includes('getConnection()')) fail('constructor getConnection() missing');
if (controller.match(/[^a-zA-Z\\]\\Database/)) fail('global \\Database usage found');
if (controller.match(/[^a-zA-Z\\]\\Response/)) fail('global \\Response usage found');
if (controller.match(/[^a-zA-Z\\]\\MemberAuthMiddleware/)) fail('global \\MemberAuthMiddleware usage found');
pass('Controller namespace and usage contracts verified');

// Membership
if (controller.includes('FROM memberships')) fail('FROM memberships found');
if (!controller.includes('membership_start_date') || !controller.includes('membership_end_date')) fail('membership_start_date/end_date not used in queries');
pass('Membership source logic verified');

// Trainer
if (controller.includes('t.first_name') || controller.includes('t.last_name') || controller.includes('trainer_first') || controller.includes('trainer_last')) {
    fail('Trainer query using first_name/last_name');
}
if (!controller.includes('t.name as trainer_name')) fail('Canonical t.name not found');
pass('Trainer schema logic verified');

// Program exercises
if (controller.includes('training_program_id = :pid')) fail('training_program_id used in exercises query');
if (!controller.includes('program_id = :pid')) fail('program_id not used in exercises query');
pass('Program exercises FK logic verified');

// Repetitions
if (controller.match(/\(int\)\$ex\['repetitions'\]/)) fail('repetitions is casted to (int)');
pass('Repetitions string contract verified');

// Ledger integrity
const getSessionPackagesStr = controller.substring(controller.indexOf('getSessionPackages'), controller.indexOf('getAppointments'));
if (!getSessionPackagesStr.includes('l.member_session_package_id = a.member_session_package_id')) {
    fail('Ledger integrity missing exact package pairing (l.member_session_package_id = a.member_session_package_id)');
}
const stmtIntegrityMatch = getSessionPackagesStr.match(/\$stmtCheckIntegrity\s*=\s*\$this->db->prepare\("([\s\S]*?)"\);/);
if (stmtIntegrityMatch) {
    const sql = stmtIntegrityMatch[1];
    const matchPkg = sql.match(/:pkgId/g);
    if (matchPkg && matchPkg.length > 1) {
        fail('Ledger integrity statement repeats :pkgId placeholder');
    }
}
if (!getSessionPackagesStr.includes('a.member_id')) fail('Ledger integrity query must select a.member_id');
if (!getSessionPackagesStr.includes("idata['member_id']")) fail('Ledger integrity loop missing exact member_id compare');
if (!getSessionPackagesStr.includes('SESSION_PACKAGE_LEDGER_INCONSISTENT')) fail('Ledger integrity loop missing SESSION_PACKAGE_LEDGER_INCONSISTENT');
pass('Package scheduled ledger integrity exact pairing verified');

// Guard
const guardStr = controller.substring(controller.indexOf('private function guard'), controller.indexOf('public function getOverview'));
const authIdx = guardStr.indexOf('MemberAuthMiddleware::handle()');
const rejectIdx = guardStr.indexOf('rejectQueryParams()');
if (authIdx === -1 || rejectIdx === -1) fail('Guard missing MemberAuthMiddleware or rejectQueryParams');
if (authIdx > rejectIdx) fail('MemberAuthMiddleware must be called before rejectQueryParams');
if (!controller.includes("if (!$account)")) fail('Guard account missing check not found');
pass('Guard missing account fail-closed verified');

// Query params
if (!controller.includes('!empty($_GET)')) fail('No query param check missing');
pass('Query param validation verified');

// Route firewall check
const routes = ['/api/member/overview', '/api/member/session-packages', '/api/member/appointments', '/api/member/training-program'];
for (const r of routes) {
    if (!index.includes(`$requestUri === '${r}' && $method === 'GET'`)) fail(`Missing GET route: ${r}`);
}
const memberMutation = /if\s*\(\s*\$requestUri\s*===\s*'\/api\/member\/.*?&&\s*\$method\s*===\s*'(POST|PATCH|DELETE)'\)/;
if (memberMutation.test(index)) fail('Found POST/PATCH/DELETE route for /api/member/');
if (index.includes('/api/member/members/')) fail('Contains member ID path selector');
if (!index.includes('\\Controllers\\MemberPortalController')) fail('\\Controllers\\MemberPortalController not found in index.php');

pass('All F.18B Member Portal Self-Service Read Model checks passed!');
