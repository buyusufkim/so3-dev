import fs from 'fs';
import path from 'path';

function fail(msg) {
    console.error('❌ ' + msg);
    process.exit(1);
}

function pass(msg) {
    console.log('✅ ' + msg);
}

const checkFile = (filePath, contentChecks = []) => {
    if (!fs.existsSync(filePath)) {
        fail(`Missing file: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    contentChecks.forEach(check => {
        if (!content.includes(check)) {
            fail(`File ${filePath} is missing required content: ${check}`);
        }
    });
    pass(`Verified ${filePath}`);
    return content;
}

pass('Starting Member Portal Auth Foundation verification...');

checkFile('database/migrations/038_create_member_portal_auth.sql', [
    'CREATE TABLE IF NOT EXISTS `member_accounts`',
    '`auth_version` INT UNSIGNED NOT NULL DEFAULT 1',
    'CREATE TABLE IF NOT EXISTS `member_login_attempts`',
    '`member_id` INT NOT NULL UNIQUE'
]);

const freshInstall = checkFile('database/fresh-install.sql', [
    'Generated from migrations 001-038',
    '-- Migration: 038_create_member_portal_auth.sql',
    '(\'038_create_member_portal_auth.sql\', CURRENT_TIMESTAMP)'
]);

if (freshInstall.indexOf('-- Migration: 038_create_member_portal_auth.sql') < freshInstall.indexOf('schema_migrations (migration, executed_at) VALUES')) {
    pass('038 block is correctly placed before schema_migrations');
} else {
    fail('038 block is not placed before schema_migrations');
}

const finalFkChecks = freshInstall.lastIndexOf('SET FOREIGN_KEY_CHECKS = @SO3_OLD_FOREIGN_KEY_CHECKS;');
const final038 = freshInstall.lastIndexOf('-- Migration: 038_create_member_portal_auth.sql');
if (finalFkChecks > final038) {
    pass('SET FOREIGN_KEY_CHECKS is at the end');
} else {
    fail('SET FOREIGN_KEY_CHECKS is not at the end');
}

if (freshInstall.split('CREATE TABLE IF NOT EXISTS `member_accounts`').length - 1 > 1) {
    fail('Duplicate member_accounts table in fresh-install.sql');
}

const adminMigration = fs.readFileSync('database/migrations/002_create_admins.sql', 'utf8');
if (adminMigration.includes("'member'")) {
    fail('Admin role enum contains "member"');
}

checkFile('api/core/Session.php', [
    'public static function start($realm = \'admin\')',
    '$cookieName = $realm === \'member\' ? \'so3_member_session\' : self::SESSION_NAME;'
]);

checkFile('api/bootstrap.php', [
    'Session::start(\'member\');',
    'Session::start(\'admin\');'
]);

checkFile('api/middleware/MemberAuthMiddleware.php', [
    'class MemberAuthMiddleware',
    '$_SESSION[\'auth_realm\'] !== \'member\'',
    '$identity[\'auth_version\'] !== ($_SESSION[\'member_auth_version\'] ?? 0)'
]);

const authController = checkFile('api/controllers/MemberAuthController.php', [
    'class MemberAuthController',
    '$_SESSION[\'auth_realm\'] = \'member\';',
    '$_SESSION[\'member_auth_version\'] = (int)$identity[\'auth_version\'];',
    '$newVersion = (int)$account[\'auth_version\'] + 1;',
    'getJsonPayload()',
    '$dummyHash = \'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi\';'
]);

const loginIndex = authController.indexOf('public function login()');
const trimIndex = authController.indexOf('trim($input[\'username\'])', loginIndex);
const isStringIndex = authController.indexOf('!is_string($input[\'username\'])', loginIndex);

if (isStringIndex === -1 || trimIndex === -1) {
    fail('Missing is_string or trim in login');
}

if (isStringIndex > trimIndex) {
    fail('trim is called before is_string in login');
}

if (authController.includes('password_hash') && !authController.includes('$newHash === false') && !authController.includes('$newHash !== false')) {
    fail('password_hash is not fail-closed guarded in auth controller');
}

if (authController.includes('password_hash') && authController.includes('json') && authController.match(/[\'"]password_hash[\'"]\s*=>\s*[\'"][^\'"]*[\'"]/)) {
   fail('password_hash is being exposed in json response');
}

if (authController.match(/[\'"]password[\'"]\s*=>/)) {
   fail('password is being exposed in json response');
}

const accountController = checkFile('api/controllers/MemberAccountController.php', [
    'class MemberAccountController',
    'AuthMiddleware::hasRole([\'super_admin\', \'admin\']);',
    '$newVersion = (int)$account[\'auth_version\'] + 1;',
    'getJsonPayload()',
    'random_bytes(16)'
]);

const accCreateIndex = accountController.indexOf('public function createAccount');
const accTrimIndex = accountController.indexOf('trim($input[\'username\'])', accCreateIndex);
const accIsStringIndex = accountController.indexOf('!is_string($input[\'username\'])', accCreateIndex);

if (accIsStringIndex === -1 || accTrimIndex === -1) {
    fail('Missing is_string or trim in createAccount');
}

if (accIsStringIndex > accTrimIndex) {
    fail('trim is called before is_string in createAccount');
}

if (accountController.includes('password_hash') && !accountController.includes('$hash === false')) {
    fail('password_hash is not fail-closed guarded in account controller');
}

checkFile('api/index.php', [
    '/api/member-auth/login',
    '/api/member-auth/me',
    '/api/member-auth/change-password',
    '/api/admin/members/([1-9]\\d*)/account',
    '/api/admin/member-accounts/([1-9]\\d*)/reset-password'
]);

pass('All F.18A Member Portal Auth & Account Foundation requirements verified successfully!');
