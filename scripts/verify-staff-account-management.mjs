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

function extractMethod(code, methodName) {
    const regex = new RegExp(`public function ${methodName}\\s*\\([^)]*\\)\\s*{`, 'g');
    const match = regex.exec(code);
    if (!match) return null;
    
    let braceCount = 1;
    let i = match.index + match[0].length;
    while (i < code.length && braceCount > 0) {
        if (code[i] === '{') braceCount++;
        else if (code[i] === '}') braceCount--;
        i++;
    }
    return code.substring(match.index, i);
}

const methods = ['index', 'create', 'updateStatus', 'updateRole', 'resetPassword'];
const methodBodies = {};
for (const m of methods) {
    methodBodies[m] = extractMethod(controllerCode, m);
    if (!methodBodies[m]) {
        console.error(`[FAIL] Method ${m} not found`);
        pass = false;
    }
}

// 1. All methods have strict super_admin guard
for (const m of methods) {
    check(
        methodBodies[m] && methodBodies[m].includes("AuthMiddleware::hasRole(['super_admin']);"),
        `${m} method has strict super_admin guard.`
    );
}

// 2. create() exact allowed-key validation
check(
    methodBodies['create'] && methodBodies['create'].includes("$allowedKeys = ['username', 'email', 'display_name', 'password', 'role'];") && methodBodies['create'].includes("array_diff(array_keys($data), $allowedKeys);"),
    'create() performs exact allowed-key validation.'
);

// 3. create() managed role allowlist
check(
    methodBodies['create'] && methodBodies['create'].includes("in_array($role, $this->managedRoles, true)"),
    'create() checks against managed role allowlist.'
);

// 4. create() transaction
check(
    methodBodies['create'] && methodBodies['create'].includes("$this->db->beginTransaction();") && methodBodies['create'].includes("$this->db->commit();") && methodBodies['create'].includes("$this->db->rollBack();"),
    'create() uses transactions.'
);

// 5. create() global admins identity pre-check
check(
    methodBodies['create'] && methodBodies['create'].includes("SELECT id FROM admins WHERE username = ? OR email = ? FOR UPDATE"),
    'create() performs global admins identity pre-check.'
);

// 6. DB duplicate unique violation -> 409
check(
    methodBodies['create'] && methodBodies['create'].includes("catch (\\PDOException $e)") && methodBodies['create'].includes("$e->getCode() == 23000") && methodBodies['create'].includes("1062") && methodBodies['create'].includes("ACCOUNT_IDENTITY_CONFLICT"),
    'create() catches PDOException for duplicate key and returns 409 ACCOUNT_IDENTITY_CONFLICT.'
);

// 7. Other DB exception -> generic 500
check(
    methodBodies['create'] && methodBodies['create'].includes("Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);"),
    'create() handles generic DB exceptions by returning 500.'
);

// 8. updateStatus, updateRole, resetPassword transaction and target FOR UPDATE
['updateStatus', 'updateRole', 'resetPassword'].forEach(m => {
    check(
        methodBodies[m] && methodBodies[m].includes("beginTransaction") && methodBodies[m].includes("getTargetAccountForUpdate"),
        `${m} uses transaction and target FOR UPDATE path.`
    );
});

// Helper checking getTargetAccountForUpdate
const getTarget = extractMethod(controllerCode, 'getTargetAccountForUpdate') || extractMethod(controllerCode.replace(/private function getTargetAccountForUpdate/, 'public function getTargetAccountForUpdate'), 'getTargetAccountForUpdate');

check(
    getTarget && getTarget.includes("SELECT id, role, status FROM admins WHERE id = ? FOR UPDATE"),
    'getTargetAccountForUpdate locks target row FOR UPDATE.'
);

// 9. trainer-linked account isolation
check(
    getTarget && getTarget.includes("SELECT id FROM trainers WHERE admin_id = ?"),
    'Trainer-linked account isolation is enforced (fails closed).'
);

// 10. DELETE route does not exist
check(
    !indexCode.includes("('/api/admin/staff-accounts/") || !indexCode.match(/DELETE.*staff-accounts/),
    'DELETE route is not defined for staff accounts.'
);

// 11. password audit metadata
check(
    !controllerCode.match(/=>\s*\$password/),
    'Password or credential metadata is not logged in audit events.'
);

// 12. raw exception doesn't leak
check(
    controllerCode.includes('error_log(') && !controllerCode.includes('Response::error($e->getMessage()'),
    'Raw exceptions are not returned to the client.'
);

// 13. Real Schema Cross Check
const m002 = fs.readFileSync(path.resolve(process.cwd(), 'database/migrations/002_create_admins.sql'), 'utf-8');
const m028 = fs.readFileSync(path.resolve(process.cwd(), 'database/migrations/028_expand_admin_roles.sql'), 'utf-8');
const m029 = fs.readFileSync(path.resolve(process.cwd(), 'database/migrations/029_link_trainers_to_admins.sql'), 'utf-8');

check(
    m002.includes("`username` VARCHAR(50) NOT NULL UNIQUE") || m002.includes("`username` varchar(50) NOT NULL UNIQUE") || m002.includes("username VARCHAR(50) NOT NULL UNIQUE"),
    'Schema: username canonical column is UNIQUE.'
);
check(
    m002.includes("`email` VARCHAR(100) NOT NULL UNIQUE") || m002.includes("`email` varchar(100) NOT NULL UNIQUE") || m002.includes("email VARCHAR(100) NOT NULL UNIQUE"),
    'Schema: email canonical column is UNIQUE.'
);
check(
    m002.includes("display_name"),
    'Schema: display_name canonical column exists.'
);
check(
    m002.includes("password_hash"),
    'Schema: password_hash canonical column exists.'
);
check(
    m002.includes("password_changed_at"),
    'Schema: password_changed_at canonical column exists.'
);
check(
    m028.includes("'admin'") && m028.includes("'editor'") && m028.includes("'reception'"),
    'Schema: role expansion includes admin/editor/reception.'
);
check(
    m029.includes("`admin_id`") && m029.includes("FOREIGN KEY") && m029.includes("`trainers`"),
    'Schema: trainers.admin_id canonical connection is present.'
);


if (pass) {
    console.log('\nPASS — F.14A STAFF ACCOUNT API FOUNDATION CLOSED');
    process.exit(0);
} else {
    console.error('\nFAIL — Verifications failed.');
    process.exit(1);
}
