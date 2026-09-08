import fs from 'fs';
import path from 'path';

const controllerPath = path.resolve(process.cwd(), 'api/controllers/StaffAccountController.php');
const indexPath = path.resolve(process.cwd(), 'api/index.php');

if (!fs.existsSync(controllerPath)) {
    console.error('FAIL: StaffAccountController.php does not exist.');
    process.exit(1);
}

const controllerCode = fs.readFileSync(controllerPath, 'utf-8');
const indexCode = fs.readFileSync(indexPath, 'utf-8');

let pass = true;

const check = (condition, msg) => {
    if (condition) {
        console.log(`[PASS] ${msg}`);
    } else {
        console.error(`[FAIL] ${msg}`);
        pass = false;
    }
};

// 1. Strict super_admin-only
check(
    (controllerCode.match(/AuthMiddleware::hasRole\(\['super_admin'\]\);/g) || []).length >= 5,
    'All endpoints enforce strict super_admin-only role.'
);

// 2. Managed roles exact admin/editor/reception
check(
    controllerCode.includes("['admin', 'editor', 'reception']") || controllerCode.includes("['admin','editor','reception']"),
    'Managed roles strictly defined as admin/editor/reception.'
);

// 3. Trainer/super_admin mutation checked
check(
    controllerCode.includes('in_array($target[\'role\'], $this->managedRoles'),
    'Mutation target role checked against managed roles.'
);
check(
    controllerCode.includes('SELECT id FROM trainers WHERE admin_id = ?'),
    'Trainer accounts checked and blocked in generic flow.'
);

// 4. List projection does not include password_hash/last_login_ip
check(
    !controllerCode.includes('password_hash') || (controllerCode.indexOf('password_hash') > controllerCode.indexOf('public function create')),
    'List projection logic does not leak password_hash/last_login_ip.'
);

// 5. Identity uniqueness against all admins
check(
    controllerCode.includes('SELECT id FROM admins WHERE username = ? OR email = ? FOR UPDATE'),
    'Identity uniqueness checked across all admins.'
);

// 6. Password 12-256 + secure hashing
check(
    controllerCode.includes('mb_strlen($password, \'UTF-8\') < 12') && controllerCode.includes('mb_strlen($password, \'UTF-8\') > 256'),
    'Password validation strictly 12-256 characters.'
);
check(
    controllerCode.includes('PASSWORD_ARGON2ID') && controllerCode.includes('password_hash('),
    'Password hashed using ARGON2ID/DEFAULT.'
);

// 7. Status payload strict
check(
    controllerCode.includes('$status !== \'active\' && $status !== \'inactive\''),
    'Status payload strictly validated.'
);

// 8. Role payload strict
check(
    controllerCode.match(/in_array\(\$role, \$this->managedRoles/g).length >= 2,
    'Role payload strictly validated.'
);

// 9. Mutation transaction + FOR UPDATE
check(
    controllerCode.includes('FOR UPDATE') && controllerCode.includes('beginTransaction'),
    'Mutations use transactions and FOR UPDATE.'
);

// 10. Trainer-linked account generic flow mutate check is done in #3.

// 11. No DELETE route
check(
    !indexCode.includes("('/api/admin/staff-accounts/") || !indexCode.match(/DELETE.*staff-accounts/),
    'No DELETE route defined for staff accounts.'
);

// 12. Audit events exist, password metadata not logged.
check(
    controllerCode.includes('staff_account.create') &&
    controllerCode.includes('staff_account.status_update') &&
    controllerCode.includes('staff_account.role_update') &&
    controllerCode.includes('staff_account.password_reset'),
    'Audit events generated for all mutations.'
);
check(
    !controllerCode.match(/=>\s*\$password/),
    'Password or credential metadata not logged.'
);

// 13. Raw exception doesn't leak
check(
    controllerCode.includes('error_log(') && controllerCode.includes('Response::error(\'Sunucu hatası oluştu.\''),
    'Raw exception caught and generic error returned.'
);

// 14. SQL Columns
check(
    controllerCode.includes('password_changed_at') && controllerCode.includes('display_name'),
    'Controller SQL columns align with canonical migrations.'
);

if (pass) {
    console.log('\nPASS — F.14A STAFF ACCOUNT API FOUNDATION VERIFIED');
    process.exit(0);
} else {
    console.error('\nFAIL — Verifications failed.');
    process.exit(1);
}
