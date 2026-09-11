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
}

pass('Starting Member Portal Auth Foundation verification...');

checkFile('database/migrations/038_create_member_portal_auth.sql', [
    'CREATE TABLE IF NOT EXISTS `member_accounts`',
    '`auth_version` INT UNSIGNED NOT NULL DEFAULT 1',
    'CREATE TABLE IF NOT EXISTS `member_login_attempts`'
]);

checkFile('database/fresh-install.sql', [
    'CREATE TABLE IF NOT EXISTS `member_accounts`'
]);

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

checkFile('api/controllers/MemberAuthController.php', [
    'class MemberAuthController',
    '$_SESSION[\'auth_realm\'] = \'member\';',
    '$_SESSION[\'member_auth_version\'] = (int)$identity[\'auth_version\'];',
    '$newVersion = (int)$account[\'auth_version\'] + 1;'
]);

checkFile('api/controllers/MemberAccountController.php', [
    'class MemberAccountController',
    'AuthMiddleware::hasRole([\'super_admin\', \'admin\']);',
    '$newVersion = (int)$account[\'auth_version\'] + 1;'
]);

checkFile('api/index.php', [
    '/api/member-auth/login',
    '/api/member-auth/me',
    '/api/member-auth/change-password',
    '/api/admin/members/([1-9]\\d*)/account',
    '/api/admin/member-accounts/([1-9]\\d*)/reset-password'
]);

pass('All F.18A Member Portal Auth & Account Foundation requirements verified successfully!');
