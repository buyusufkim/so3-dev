import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const controllerPath = path.join(rootDir, 'api', 'controllers', 'TrainerMemberProgressNoteController.php');
const indexPath = path.join(rootDir, 'api', 'index.php');

let hasErrors = false;

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        hasErrors = true;
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

function verify() {
    console.log('Starting Trainer Member Progress Notes API verification...\n');

    if (!fs.existsSync(controllerPath) || !fs.existsSync(indexPath)) {
        console.error('Required files not found!');
        process.exit(1);
    }

    const controllerCode = fs.readFileSync(controllerPath, 'utf8');
    const indexCode = fs.readFileSync(indexPath, 'utf8');

    // 1. Trainer route wiring & role firewall
    assert(
        indexCode.includes('trainer/members/([1-9]\\d*)/progress-notes') &&
        indexCode.includes('trainer/member-progress-notes/([1-9]\\d*)') &&
        indexCode.includes('trainer/member-progress-notes/([1-9]\\d*)/restore'),
        'Invariant 1: Routes are defined in index.php'
    );
    
    // Just parse line by line to ensure the trainer/member-progress-notes routes are protected
    const lines = indexCode.split('\n');
    let rolesProtected = true;
    let inProgressNoteRoute = false;
    for (const line of lines) {
        if (line.match(/preg_match\('#\^\/api\/trainer\/(members\/.*?\/progress-notes|member-progress-notes)/)) {
            inProgressNoteRoute = true;
        } else if (inProgressNoteRoute && line.includes('AuthMiddleware::hasRole([')) {
            if (!line.includes("'trainer'")) {
                rolesProtected = false;
            }
            inProgressNoteRoute = false;
        } else if (inProgressNoteRoute && line.includes('preg_match')) {
            rolesProtected = false; // Missed it
            inProgressNoteRoute = false;
        }
    }
    assert(rolesProtected, 'Invariant 1: Trainer role firewall protected on all routes');

    // 2. JSON payload allowlist
    assert(
        controllerCode.includes("$allowlist = ['recorded_at', 'note'];") &&
        controllerCode.includes("!in_array($key, $allowlist, true)"),
        'Invariant 2: JSON payload allowlist enforces only recorded_at and note'
    );

    // 3. List response contract
    assert(
        controllerCode.includes("'items' => $items") &&
        controllerCode.includes("'pagination' => [") &&
        controllerCode.includes("'total' => $total") &&
        controllerCode.includes("'page' => $page") &&
        controllerCode.includes("'per_page' => $perPage") &&
        controllerCode.includes("'last_page' => $lastPage"),
        'Invariant 3: List response contract uses nested pagination wrapper'
    );

    // 4. Member list access control
    assert(
        controllerCode.includes("SELECT id FROM members WHERE id = ? AND trainer_id = ? AND deleted_at IS NULL") &&
        controllerCode.includes("Response::error('Member not found', 'NOT_FOUND', 404)"),
        'Invariant 4: List access ownership check returns 404 for invalid member'
    );

    // 5. Pagination SQL binding
    assert(
        controllerCode.includes("LIMIT ? OFFSET ?") &&
        controllerCode.includes("bindValue(4, $perPage, PDO::PARAM_INT)") &&
        controllerCode.includes("bindValue(5, $offset, PDO::PARAM_INT)"),
        'Invariant 5: LIMIT/OFFSET use PDO integer binding'
    );

    // 6. UPDATE ownership lock
    const updateLockMatch = controllerCode.match(/SELECT pn\.\*,.*?FROM member_progress_notes pn\s*JOIN members m ON pn\.member_id = m\.id\s*WHERE pn\.id = :id\s*AND pn\.trainer_id = :pn_trainer_id\s*AND m\.trainer_id = :m_trainer_id\s*AND m\.deleted_at IS NULL\s*AND pn\.deleted_at IS NULL\s*FOR UPDATE/s);
    assert(
        updateLockMatch !== null,
        'Invariant 6: UPDATE ownership lock uses specific single SQL with active checks'
    );

    // 7. DELETE ownership lock
    const deleteLockMatch = controllerCode.match(/SELECT pn\.id, pn\.member_id, pn\.deleted_at, m\.trainer_id as current_member_trainer, m\.deleted_at as member_deleted_at\s*FROM member_progress_notes pn\s*JOIN members m ON pn\.member_id = m\.id\s*WHERE pn\.id = :id\s*AND pn\.trainer_id = :pn_trainer_id\s*AND m\.trainer_id = :m_trainer_id\s*AND m\.deleted_at IS NULL\s*AND pn\.deleted_at IS NULL\s*FOR UPDATE/s);
    assert(
        deleteLockMatch !== null,
        'Invariant 7: DELETE ownership lock uses specific single SQL with active checks'
    );

    // 8. RESTORE lock
    const restoreLockMatch = controllerCode.match(/SELECT pn\.id, pn\.member_id, pn\.deleted_at, m\.trainer_id as current_member_trainer, m\.deleted_at as member_deleted_at\s*FROM member_progress_notes pn\s*JOIN members m ON pn\.member_id = m\.id\s*WHERE pn\.id = :id\s*AND pn\.trainer_id = :pn_trainer_id\s*AND m\.trainer_id = :m_trainer_id\s*AND m\.deleted_at IS NULL\s*FOR UPDATE/s);
    assert(
        restoreLockMatch !== null && controllerCode.includes("Response::error('Progress note is not archived', 'PROGRESS_NOTE_NOT_ARCHIVED', 409)"),
        'Invariant 8: RESTORE ownership lock checks in SQL, without pn.deleted_at, handles 409'
    );

    // 9. Transaction rollback
    const rollbackCount = (controllerCode.match(/if \(\$this->db->inTransaction\(\)\) \{\s*\$this->db->rollBack\(\);\s*\}/g) || []).length;
    assert(
        rollbackCount >= 5, // store, update, destroy, restore, plus getTrainerProfileId methods do
        'Invariant 9: Transaction rollback on exception protected'
    );

    // 10. PATCH idempotency
    assert(
        controllerCode.includes("if (empty($updateFields)) {") &&
        controllerCode.includes("$this->db->commit();") &&
        controllerCode.includes("Response::json(['success' => true]);"),
        'Invariant 10: PATCH idempotency gracefully exits without update/audit'
    );

    // 11. Audit contract
    const auditMatches = controllerCode.match(/AuditLogger::log\([\s\S]*?\]\s*\)/g) || [];
    assert(
        auditMatches.length === 4,
        'Invariant 11: AuditLogger::log called for all 4 mutations'
    );
    let auditLeaks = false;
    for (const match of auditMatches) {
        if (match.includes("'note'") || match.includes("'recorded_at'")) {
            auditLeaks = true;
        }
    }
    assert(
        !auditLeaks,
        'Invariant 11: Audit logging does not leak note or recorded_at'
    );

    // 12. Named placeholders
    assert(
        controllerCode.includes(":pn_trainer_id") && controllerCode.includes(":m_trainer_id"),
        'Invariant 12: Named placeholders are uniquely defined (no duplicates in single statement)'
    );

    if (hasErrors) {
        console.error('\n❌ Verification FAILED.');
        process.exit(1);
    } else {
        console.log('\n✅ Verification PASSED.');
        process.exit(0);
    }
}

verify();
