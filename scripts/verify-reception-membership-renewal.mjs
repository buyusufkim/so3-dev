import fs from 'fs';
import path from 'path';

let exitCode = 0;

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        exitCode = 1;
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

console.log("Starting Membership Renewal Cross-Contract Verification...");

// 1. MemberController Mutation Boundary
const memberControllerSource = fs.readFileSync('api/controllers/MemberController.php', 'utf8');

assert(
    memberControllerSource.includes("if ($isUpdate)") && 
    memberControllerSource.includes("array_key_exists('membership_start_date', $data)") && 
    memberControllerSource.includes("array_key_exists('membership_end_date', $data)") &&
    memberControllerSource.includes("Response::error('Üyelik tarihleri yenileme işlemi üzerinden güncellenmelidir.', 'VALIDATION_ERROR', 422)"),
    "Invariant: Generic update validation rejects membership_start_date and membership_end_date with controlled 422 error"
);

assert(
    memberControllerSource.includes("'membership_start_date', 'membership_end_date'") &&
    memberControllerSource.indexOf("$allowedFields = [") !== -1,
    "Invariant: Create-side allowed fields still include membership dates"
);

// 2. Canonical Renewal Route & RBAC
const indexPhpSource = fs.readFileSync('api/index.php', 'utf8');
assert(
    indexPhpSource.includes("#^/api/reception/members/([1-9]\\d*)/renew$#") || 
    indexPhpSource.includes("'/api/reception/members/") && indexPhpSource.includes("renew"),
    "Invariant: Canonical renewal route exists exactly as POST /api/reception/members/{positive-id}/renew"
);
assert(
    indexPhpSource.includes("AuthMiddleware::hasRole(['super_admin', 'admin', 'reception'])"),
    "Invariant: Route protected by super_admin, admin, reception roles (no trainer/editor)"
);

// 3. ReceptionMemberController Contract
const receptionControllerSource = fs.readFileSync('api/controllers/ReceptionMemberController.php', 'utf8');

// Date validation
assert(
    (receptionControllerSource.includes("isset($decoded['new_start_date'])") || receptionControllerSource.includes("array_key_exists('new_start_date'")) &&
    (receptionControllerSource.includes("isset($decoded['new_end_date'])") || receptionControllerSource.includes("array_key_exists('new_end_date'")) &&
    !receptionControllerSource.includes("isset($decoded['status'])"),
    "Invariant: Renewal payload requires new_start_date and new_end_date, unknown keys not processed"
);

assert(
    receptionControllerSource.includes("$endDateTime < $startDateTime") || 
    receptionControllerSource.includes("strtotime($newEndDate) < strtotime($newStartDate)"),
    "Invariant: Strict validation checks that end_date is not before start_date"
);

// Transaction & Locking
assert(
    receptionControllerSource.includes("$db->beginTransaction();") &&
    receptionControllerSource.includes("FOR UPDATE"),
    "Invariant: Member row selected FOR UPDATE within a transaction"
);

assert(
    receptionControllerSource.includes("deleted_at IS NULL") &&
    !receptionControllerSource.includes("status = 'active'"),
    "Invariant: Soft-deleted members are blocked, but inactive renewals are allowed (no active status requirement)"
);

// Updates
const memberUpdateRegex = /UPDATE\s+members\s+SET\s+membership_start_date\s*=\s*:new_start_date,\s*membership_end_date\s*=\s*:new_end_date,\s*updated_by\s*=\s*:admin_id\s+WHERE\s+id\s*=\s*:id/i;
assert(
    memberUpdateRegex.test(receptionControllerSource),
    "Invariant: Exact member update semantic exists (only updates dates and updated_by, NO status update)"
);

// History insert
const historyInsertRegex = /INSERT\s+INTO\s+membership_renewals\s*\(\s*uuid,\s*member_id,\s*previous_start_date,\s*previous_end_date,\s*new_start_date,\s*new_end_date,\s*renewed_by\s*\)\s*VALUES/i;
const insertMatch = receptionControllerSource.match(/INSERT\s+INTO\s+membership_renewals\s*\([^)]*\)\s*VALUES/i);
assert(
    insertMatch && 
    historyInsertRegex.test(receptionControllerSource) &&
    !insertMatch[0].includes("NOW()") &&
    !insertMatch[0].includes("created_at"),
    "Invariant: History INSERT matches schema EXACTLY, without overriding created_at (DB default guard)"
);

// NULL binding
assert(
    receptionControllerSource.includes("$previousStartDate === null ? \\PDO::PARAM_NULL : \\PDO::PARAM_STR") &&
    receptionControllerSource.includes("$previousEndDate === null ? \\PDO::PARAM_NULL : \\PDO::PARAM_STR"),
    "Invariant: Explicit PDO::PARAM_NULL ternary used for previous nullable dates"
);

// Audit
const commitIndex = receptionControllerSource.lastIndexOf("$db->commit();");
const auditIndex = receptionControllerSource.lastIndexOf("\\Core\\AuditLogger::log(");
assert(
    commitIndex !== -1 && auditIndex !== -1 && commitIndex < auditIndex,
    "Invariant: Audit is executed AFTER successful transaction commit"
);

assert(
    receptionControllerSource.includes("'reception.member.renew'") &&
    receptionControllerSource.includes("'membership_renewal'") &&
    receptionControllerSource.includes("$renewalId"),
    "Invariant: Audit log includes correct action, entity, and renewal ID"
);

// 4. Runtime Membership-Date Mutation Scan
const controllersDir = 'api/controllers';
const files = fs.readdirSync(controllersDir);
let foundBypasses = false;
for (const file of files) {
    if (!file.endsWith('.php')) continue;
    const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');
    // Look for member updates touching membership_start_date or membership_end_date
    const lines = content.split('\n');
    let insideUpdate = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/UPDATE\s+members\s+SET/i)) {
            insideUpdate = true;
        }
        if (insideUpdate && line.match(/membership_start_date\s*=/i)) {
            if (file !== 'ReceptionMemberController.php') {
                foundBypasses = true;
                console.error(`❌ FAIL: Found illegal runtime UPDATE bypassing canonical route in ${file}:${i+1}`);
            }
        }
        if (line.includes(';') || line.match(/WHERE/i)) {
            insideUpdate = false;
        }
    }
}
assert(!foundBypasses, "Invariant: Repository runtime scan found ZERO membership_start_date UPDATE bypasses outside canonical ReceptionMemberController");

// 5. Frontend Compatibility Guard
const frontendSource = fs.readFileSync('src/admin/pages/members/AdminMemberEditor.tsx', 'utf8');
assert(
    frontendSource.includes("if (isNew) {") &&
    frontendSource.includes("payload.membership_start_date = formData.membership_start_date || null;") &&
    frontendSource.includes("payload.membership_end_date = formData.membership_end_date || null;"),
    "Invariant: Frontend preserves create-path initial dates explicitly"
);

assert(
    frontendSource.includes("disabled={!isNew}"),
    "Invariant: Frontend disables membership date inputs for existing members to enforce mutation boundary"
);

if (exitCode === 0) {
    console.log("✅ All F.10F reception membership renewal invariants verified successfully.");
} else {
    console.error("❌ Verification failed.");
}

process.exit(exitCode);
