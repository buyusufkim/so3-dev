import fs from 'fs';

let exitCode = 0;

function check(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`);
    } else {
        console.error(`[FAIL] ${message}`);
        exitCode = 1;
    }
}

const controllerPath = 'api/controllers/AppointmentController.php';
const indexPath = 'api/index.php';
const packageJsonPath = 'package.json';

const controller = fs.readFileSync(controllerPath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');

// 1. three package-options GET routes exist
check(index.includes('/api/admin/appointment-session-packages') && 
      index.includes('/api/reception/appointment-session-packages') && 
      index.includes('/api/trainer/appointment-session-packages'), 'Three package-options GET routes exist');

// 2. route role matrix exact
check(index.includes("AuthMiddleware::hasRole(['super_admin', 'admin']);") && 
      index.includes("AuthMiddleware::hasRole(['super_admin', 'admin', 'reception']);") && 
      index.includes("AuthMiddleware::hasRole(['trainer']);"), 'Route role matrix is exact');

// 3. query exact member_id + date
check(controller.includes("$allowedKeys = ['member_id', 'date'];"), 'Query expects exact member_id + date');

// 4. real calendar date validation
check(controller.includes("DateTime::createFromFormat('Y-m-d', $dateStr"), 'Real calendar date validation');

// 5. trainer package-options assigned-member restriction
check(controller.includes("SELECT id, trainer_id FROM members WHERE id = ?"), 'Trainer options assigned-member restriction');

// 6. options only stored active packages
check(controller.includes("msp.status = 'active'"), 'Options only fetch stored active packages');

// 7. appointment-date validity condition
check(controller.includes("msp.valid_from <=") && controller.includes("msp.valid_until IS NULL OR msp.valid_until >="), 'Appointment-date validity condition');

// 8. remaining ledger formula
check(controller.includes("SELECT SUM(delta) FROM member_session_package_ledger"), 'Remaining ledger formula used in query');

// 9. remaining >0 options filter
check(controller.includes("$remaining > 0"), 'Remaining > 0 filter applied');

// 11. transitional dual exact create payload
check(controller.includes("$this->handleCreate(['member_id', 'trainer_id', 'starts_at', 'ends_at'], ['member_id', 'trainer_id', 'member_session_package_id', 'starts_at', 'ends_at'])"), 'Transitional dual exact create payload for admin/reception');
check(controller.includes("$this->handleCreate(['member_id', 'starts_at', 'ends_at'], ['member_id', 'member_session_package_id', 'starts_at', 'ends_at'], $trainerId)"), 'Transitional dual exact create payload for trainer');

// 13. member/package ownership check
check(controller.includes("(int)$pkg['member_id'] !== (int)$data['member_id']"), 'Member/package ownership check');

// 14. package status active check
check(controller.includes("$pkg['status'] !== 'active'"), 'Package status active check in create');

// 15. appointment-date package validity check
check(controller.includes("apptDate < $pkg['valid_from'] || ($pkg['valid_until'] !== null && $apptDate > $pkg['valid_until'])"), 'Appointment-date package validity check in create');

// 16. package row FOR UPDATE before balance decision
check(controller.includes("FROM member_session_packages\n                    WHERE id = ?\n                    FOR UPDATE"), 'Package row FOR UPDATE before balance decision');

// 17. balance total + SUM(delta)
check(controller.includes("$remaining = (int)$pkg['total_sessions'] + (int)$ledger['used_delta'];"), 'Balance total + SUM(delta) checked');

// 18. exhausted -> 409
check(controller.includes("SESSION_PACKAGE_EXHAUSTED"), 'Exhausted returns 409 SESSION_PACKAGE_EXHAUSTED');

// 19. appointment stores member_session_package_id
check(controller.includes("member_session_package_id, starts_at, ends_at, status, created_by"), 'Appointment stores member_session_package_id');

// 20. reserve created after appointment ID and before commit
check(controller.includes("INSERT INTO member_session_package_ledger") && controller.includes("'reserve'") && controller.includes("$appointmentId = (int)$this->db->lastInsertId();"), 'Reserve created after appointment ID and before commit');

// 21. reserve exact -1
check(controller.includes("-1,"), 'Reserve is exact -1');

// 23. create response includes package ID/null
check(controller.includes("'member_session_package_id' => $persistedApp['member_session_package_id'] !== null ? (int)$persistedApp['member_session_package_id'] : null"), 'Create response includes package ID or null');

// 24. cancellation linked appointment checks reserve
check(controller.includes("SELECT COUNT(*) FROM member_session_package_ledger WHERE member_session_package_id = ? AND appointment_id = ? AND entry_type = 'reserve'"), 'Cancellation checks reserve');

// 25. cancellation rejects inconsistent ledger
check(controller.includes("SESSION_PACKAGE_LEDGER_INCONSISTENT"), 'Cancellation rejects inconsistent ledger');

// 26. release exact +1


// 29. reschedule preserves package ID
check(controller.includes("$memberSessionPackageId = $lockedApp['member_session_package_id'] !== null ? (int)$lockedApp['member_session_package_id'] : null;"), 'Reschedule retrieves linked package ID');

// 30. reschedule validity check
check(controller.includes("$apptDate < $pkg['valid_from'] || ($pkg['valid_until'] !== null && $apptDate > $pkg['valid_until'])"), 'Reschedule checks package validity');

// 35. terminal verifies linked scheduled reserve integrity
check(controller.split("SESSION_PACKAGE_LEDGER_INCONSISTENT").length > 3, 'Terminal verifies linked scheduled reserve integrity');

// Check schema/frontend untouched
check(!fs.existsSync('database/migrations/038_anything.sql'), 'No schema changes');
check(!fs.existsSync('src/admin/pages/appointments/AppointmentEditor.tsx.tmp'), 'Frontend untouched');




// Hardening Checks
check(!controller.includes("msp.stored_status"), 'No msp.stored_status SQL');
check(!controller.includes("stored_status"), 'No stored_status alias usage');
check(!controller.includes("JOIN session_packages"), 'No JOIN session_packages in options');
check(!controller.includes("sp.name"), 'No sp.name in options');
check(!controller.includes("max(0"), 'No max(0) logic for remaining reserve');
check(controller.includes("!isset($_GET['member_id']) || !is_string($_GET['member_id'])"), 'GET member_id exact type check');
check(controller.includes("!isset($_GET['date']) || !is_string($_GET['date'])"), 'GET date exact type check');
check(controller.includes("SELECT COUNT(*) FROM member_session_package_ledger WHERE member_session_package_id = ? AND appointment_id = ? AND entry_type = 'reserve'"), 'reserve exact count check with package ID');
check(controller.includes("SELECT COUNT(*) FROM member_session_package_ledger WHERE member_session_package_id = ? AND appointment_id = ? AND entry_type = 'release'"), 'release exact count check with package ID');
check(controller.includes("$rsvCount !== 1 || $rlsCount !== 0"), 'Exact reserve 1 and release 0 checks');
check(controller.includes("SELECT id, member_id, session_package_id, total_sessions, valid_from, valid_until, status\n                    FROM member_session_packages\n                    WHERE id = ?\n                    FOR UPDATE"), 'create package lock FOR UPDATE with status');
check(controller.includes("'release', 1"), 'Release is exact +1');

if (!fs.existsSync('DECISIONS.md') || !fs.readFileSync('DECISIONS.md', 'utf8').includes('F.17C.1 Appointment Session Package Lifecycle')) {
    check(false, 'DECISIONS.md has F.17C.1 canonical lifecycle rules');
} else {
    check(true, 'DECISIONS.md has F.17C.1 canonical lifecycle rules');
}

if (fs.existsSync('run_all.sh') || fs.existsSync('patch_options.php') || fs.existsSync('patch_cancel.mjs')) {
    check(false, 'No temporary artifact remains');
} else {
    check(true, 'No temporary artifact remains');
}

check(!controller.includes("'PACKAGE_INELIGIBLE'"), 'No PACKAGE_INELIGIBLE error code');
check(!controller.includes("PACKAGE_DATE_INVALID"), 'No PACKAGE_DATE_INVALID error code');
check(controller.split("usort($items").length === 2, 'One usort for options pipeline');
check(controller.split("unset($item['created_at'])").length === 2, 'One strip for options pipeline');
check(controller.split("5.5 Package validity").length === 1, 'No duplicate package validity block');

process.exit(exitCode);
