import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalInvariants = 0;
let passedInvariants = 0;
let failedInvariants = 0;

function checkInvariant(name, fn) {
    totalInvariants++;
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passedInvariants++;
    } catch (e) {
        console.error(`❌ FAIL: ${name} -> ${e.message}`);
        failedInvariants++;
    }
}

function assertThrows(fn, errMsg = "Expected error") {
    let threw = false;
    try {
        fn();
    } catch (e) {
        threw = true;
    }
    if (!threw) { console.error("FAILED ASSERTION: " + fn.toString()); throw new Error(errMsg); }
}

function extractBalanced(source, startIndex, openChar = '{', closeChar = '}') {
    if (startIndex < 0) return null;
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let inLineComment = false;
    let inBlockComment = false;
    
    let blockStart = source.indexOf(openChar, startIndex);
    if (blockStart === -1) return null;
    
    for (let i = blockStart; i < source.length; i++) {
        let c = source[i];
        let nextC = source[i+1];
        
        if (inLineComment) {
            if (c === '\n') inLineComment = false;
            continue;
        }
        if (inBlockComment) {
            if (c === '*' && nextC === '/') {
                inBlockComment = false;
                i++;
            }
            continue;
        }
        if (inString) {
            if (c === '\\') i++;
            else if (c === stringChar) inString = false;
            continue;
        }
        
        if (c === '/' && nextC === '/') {
            inLineComment = true;
            i++;
            continue;
        }
        if (c === '/' && nextC === '*') {
            inBlockComment = true;
            i++;
            continue;
        }
        if (c === '"' || c === "'") {
            inString = true;
            stringChar = c;
            continue;
        }
        
        if (c === openChar) braceCount++;
        if (c === closeChar) {
            braceCount--;
            if (braceCount === 0) {
                return source.substring(blockStart, i + 1);
            }
        }
    }
    return null;
}

// ---------------------------------------------------------
// Check Logic
// ---------------------------------------------------------
function verifyNamespaceCapabilityMatrix(indexSrc) {
    const allMatches = [...indexSrc.matchAll(new RegExp("/api/([a-z_]+)/appointments", "g"))];
    const routeNamespaces = new Set(allMatches.map(m => m[1]));
    
    if (!routeNamespaces.has('admin') || !routeNamespaces.has('reception') || !routeNamespaces.has('trainer')) {
        throw new Error("Missing namespaces in routes");
    }
    
    if (indexSrc.includes('/api/public/appointments') || indexSrc.match(/\/api\/[a-z_]*member[a-z_]*\/appointments/)) {
        throw new Error("Public/member appointment read/write lifecycle route forbidden");
    }
    
    if (!indexSrc.includes("/api/admin/appointments")) throw new Error("Missing admin GET/POST");
    if (!indexSrc.match(new RegExp("/api/admin/appointments/\\(\\[1-9\\]\\\\d\\*\\)/reschedule"))) throw new Error("Missing admin reschedule");
    if (!indexSrc.match(new RegExp("/api/admin/appointments/\\(\\[1-9\\]\\\\d\\*\\)/cancel"))) throw new Error("Missing admin cancel");
    if (!indexSrc.match(new RegExp("/api/admin/appointments/\\(\\[1-9\\]\\\\d\\*\\)/complete"))) throw new Error("Missing admin complete");
    if (!indexSrc.match(new RegExp("/api/admin/appointments/\\(\\[1-9\\]\\\\d\\*\\)/no-show"))) throw new Error("Missing admin no-show");
    
    if (!indexSrc.includes("/api/reception/appointments")) throw new Error("Missing reception GET/POST");
    if (!indexSrc.match(new RegExp("/api/reception/appointments/\\(\\[1-9\\]\\\\d\\*\\)/reschedule"))) throw new Error("Missing reception reschedule");
    if (!indexSrc.match(new RegExp("/api/reception/appointments/\\(\\[1-9\\]\\\\d\\*\\)/cancel"))) throw new Error("Missing reception cancel");
    if (indexSrc.match(new RegExp("/api/reception/appointments/\\(\\[1-9\\]\\\\d\\*\\)/(complete|no-show)"))) throw new Error("Reception complete/no-show forbidden");
    
    if (!indexSrc.includes("/api/trainer/appointments")) throw new Error("Missing trainer GET/POST");
    if (!indexSrc.match(new RegExp("/api/trainer/appointments/\\(\\[1-9\\]\\\\d\\*\\)/reschedule"))) throw new Error("Missing trainer reschedule");
    if (indexSrc.match(new RegExp("/api/trainer/appointments/\\(\\[1-9\\]\\\\d\\*\\)/cancel"))) throw new Error("Trainer cancel forbidden");
    if (!indexSrc.match(new RegExp("/api/trainer/appointments/\\(\\[1-9\\]\\\\d\\*\\)/complete"))) throw new Error("Missing trainer complete");
    if (!indexSrc.match(new RegExp("/api/trainer/appointments/\\(\\[1-9\\]\\\\d\\*\\)/no-show"))) throw new Error("Missing trainer no-show");
}

function verifyStateMachine(migration35, controllerSrc, indexSrc) {
    const statusMatch = migration35.match(/ENUM\(([^)]+)\)/i);
    if (!statusMatch) throw new Error("Missing status ENUM");
    const statuses = statusMatch[1].split(',').map(s => s.replace(/['\s]/g, ''));
    const expected = ['scheduled', 'completed', 'cancelled', 'no_show'];
    if (statuses.length !== expected.length || !statuses.every(s => expected.includes(s))) {
        throw new Error("Exact statuses must be scheduled, completed, cancelled, no_show");
    }
    
    if (controllerSrc.includes("updateStatus") || controllerSrc.includes("setAppointmentStatus")) {
        throw new Error("Generic status updater found");
    }
    if (indexSrc.match(new RegExp("/api/[a-z_]+/appointments/\\(\\[1-9\\]\\\\d\\*\\)\\'"))) {
        throw new Error("Generic PATCH /appointments/{id} bypass forbidden");
    }
}

function verifyTimePartition(controllerSrc) {
    if (!controllerSrc.includes("new \\DateTime('now', new \\DateTimeZone('Europe/Istanbul'))")) {
        throw new Error("Time partition missing explicit Europe/Istanbul timezone");
    }
    if (controllerSrc.includes("date_default_timezone_set")) {
        throw new Error("Time partition forbidden timezone mutation");
    }
    if (controllerSrc.includes("$now > $endsAtDt") || controllerSrc.includes("$now <= $endsAtDt")) {
        throw new Error("Time boundary gap/overlap introduced");
    }
}

function verifyLockDiscipline(controllerSrc) {
    const memLockIdx = controllerSrc.indexOf("FROM members WHERE id = ? FOR UPDATE");
    const trnLockIdx = controllerSrc.indexOf("FROM trainers WHERE id = ? FOR UPDATE");
    const appLockIdx = controllerSrc.indexOf("FROM appointments WHERE id = ? FOR UPDATE");
    
    if (memLockIdx === -1 || trnLockIdx === -1) throw new Error("Missing participant locks");
    
    if (memLockIdx > trnLockIdx || memLockIdx > appLockIdx || trnLockIdx > appLockIdx) {
        throw new Error("Participant lock order mismatch across lifecycle");
    }
}

function verifyConflictPool(controllerSrc) {
    if (!controllerSrc.includes("starts_at < ? AND ends_at > ?")) {
        throw new Error("Conflict predicate changed from half-open");
    }
    
    const conflictLines = controllerSrc.split('\n');
    let hasScheduledConflict = false;
    for (let i=0; i<conflictLines.length; i++) {
        if (conflictLines[i].includes("starts_at < ? AND ends_at > ?")) {
            const combined = (conflictLines[i-1] || "") + conflictLines[i];
            if (combined.includes("status = 'scheduled'")) {
                hasScheduledConflict = true;
            }
            if (combined.includes("status != 'cancelled'") || combined.includes("status = 'completed'")) {
                throw new Error("Conflict pool must only check scheduled");
            }
        }
    }
    if (!hasScheduledConflict) {
        throw new Error("Conflict pool must only check scheduled");
    }
}

function verifyRescheduleHistory(controllerSrc) {
    if (controllerSrc.includes("UPDATE appointment_reschedules") || controllerSrc.includes("DELETE FROM appointment_reschedules")) {
        throw new Error("Reschedule history must be append-only");
    }
    if (controllerSrc.match(/INSERT\s+INTO\s+appointment_reschedules/g)?.length > 1) {
        throw new Error("Reschedule history must not be written outside reschedule flow");
    }
}

function verifyLifecycleIsolation(controllerSrc) {
    const updates = [...controllerSrc.matchAll(/UPDATE\s+appointments\s+SET\s+(.*?)\s+WHERE/igs)];
    for (const m of updates) {
        const body = m[1];
        if (body.includes("member_id =") || body.includes("trainer_id =") || body.includes("created_by =")) {
            throw new Error("Participant IDs immutable after create");
        }
        if (body.includes("status = 'completed'") && body.includes("cancellation_reason")) {
            throw new Error("Metadata contamination in completed");
        }
        if (body.includes("status = 'no_show'") && body.includes("completed_at")) {
            throw new Error("Metadata contamination in no_show");
        }
    }
}

function verifyAppointmentNotVisit(controllerSrc) {
    if (controllerSrc.includes("INSERT INTO member_visits") || controllerSrc.includes("visit_id") || controllerSrc.includes("check-in")) {
        throw new Error("Completing appointment does NOT create visit");
    }
}

function verifyNoDeleteDomain(controllerSrc, indexSrc) {
    if (controllerSrc.includes("deleteAppointment") || controllerSrc.includes("destroyAppointment") || controllerSrc.includes("DELETE FROM appointments") || controllerSrc.includes("appointments.deleted_at")) {
        throw new Error("No appointment DELETE route");
    }
}

function verifyGlobalCsrfIntegration(indexSrc) {
    const globalCsrfMatch = indexSrc.match(/if\s*\(\s*in_array\s*\(\s*\$method,\s*\[(.*?)\]\s*\)\s*\)/s);
    if (!globalCsrfMatch) throw new Error("Missing global mutation method guard");
    
    const methodsStr = globalCsrfMatch[1];
    const extractedMethods = [...methodsStr.matchAll(/'([A-Z]+)'/g)].map(m => m[1]);
    const expectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (extractedMethods.length !== expectedMethods.length || !extractedMethods.every(m => expectedMethods.includes(m))) {
        throw new Error("Global mutation guard exact method set mismatch");
    }
    
    const guardBlock = extractBalanced(indexSrc, globalCsrfMatch.index);
    if (!guardBlock || !guardBlock.includes("CsrfMiddleware::handle()")) {
        throw new Error("Missing CsrfMiddleware::handle() in global guard");
    }
}

function verifyAdminFirewall(indexSrc) {
    const adminRoutes = [
        ...indexSrc.matchAll(/preg_match\('#\^\/api\/admin\/appointments/g),
        ...indexSrc.matchAll(/'\/api\/admin\/appointments'/g)
    ];
    for (const match of adminRoutes) {
        const block = extractBalanced(indexSrc, indexSrc.indexOf('{', match.index));
        if (block && !block.includes("AuthMiddleware::hasRole(['super_admin', 'admin'])")) {
            if (!block.includes("GET") && !block.includes("POST")) {
                throw new Error("Missing exact admin narrowing for mutation");
            }
        }
    }
}

function verifyAuditDisjoint(controllerSrc) {
    const expected = ['appointment.created', 'appointment.rescheduled', 'appointment.cancelled', 'appointment.completed', 'appointment.no_show'];
    for (const action of expected) {
        if (!controllerSrc.includes(action)) throw new Error(`Missing audit action ${action}`);
    }
    if (controllerSrc.includes("appointment.deleted")) throw new Error("Invalid audit action appointment.deleted");
}

function verifySchemaConsistency(migration35) {
    if (migration35.includes("visit_id") || migration35.includes("deleted_at") || migration35.includes("session_credits")) {
        throw new Error("Invalid fields introduced into appointment V1 lifecycle schema");
    }
}

function verifyExactPublicSurface(controllerSrc) {
    const methods = [
        'getAdminAppointments', 'getReceptionAppointments', 'getTrainerAppointments',
        'createAdminAppointment', 'createReceptionAppointment', 'createTrainerAppointment',
        'rescheduleAdminAppointment', 'rescheduleReceptionAppointment', 'rescheduleTrainerAppointment',
        'cancelAdminAppointment', 'cancelReceptionAppointment',
        'completeAdminAppointment', 'noShowAdminAppointment', 'completeTrainerAppointment', 'noShowTrainerAppointment'
    ];
    for (const m of methods) {
        if (!controllerSrc.includes(`function ${m}`)) throw new Error(`Missing public lifecycle method ${m}`);
    }
    
    const forbidden = [
        'cancelTrainerAppointment', 'completeReceptionAppointment', 'noShowReceptionAppointment',
        'deleteAppointment', 'destroyAppointment'
    ];
    for (const f of forbidden) {
        if (controllerSrc.includes(`function ${f}`)) throw new Error(`Forbidden public lifecycle method ${f}`);
    }
}

// ---------------------------------------------------------
// Negative Self-Tests
// ---------------------------------------------------------
console.log("--- Starting Negative Self-Tests ---");

const origIndexSrc = fs.readFileSync(path.join(rootDir, 'api/index.php'), 'utf8');
const origControllerSrc = fs.readFileSync(path.join(rootDir, 'api/controllers/AppointmentController.php'), 'utf8');
const origMigration35 = fs.readFileSync(path.join(rootDir, 'database/migrations/035_create_appointments.sql'), 'utf8');

checkInvariant("Negative Self-Tests Batch 1", () => {
    // 1. editor added to admin appointment route
    assertThrows(() => verifyAdminFirewall(origIndexSrc.replace(/hasRole\(\['super_admin', 'admin'\]\)/g, "hasRole(['super_admin', 'admin', 'editor'])")));
    
    // 2. reception complete route injected
    assertThrows(() => verifyNamespaceCapabilityMatrix(origIndexSrc + `\nif (preg_match('#^/api/reception/appointments/([1-9]\\d*)/complete$#')) {}`));
    
    // 3. trainer cancel route injected
    assertThrows(() => verifyNamespaceCapabilityMatrix(origIndexSrc + `\nif (preg_match('#^/api/trainer/appointments/([1-9]\\d*)/cancel$#')) {}`));
    
    // 5. cancel boundary changed to now > ends_at -> FAIL because == becomes overlap/gap
    assertThrows(() => verifyTimePartition(origControllerSrc + " $now > $endsAtDt "));
    
    // 6. terminalization boundary changed to now <= ends_at -> FAIL
    assertThrows(() => verifyTimePartition(origControllerSrc + " $now <= $endsAtDt "));
    
    // 7. create trainer-first lock -> FAIL
    assertThrows(() => verifyLockDiscipline(origControllerSrc.replace("FROM members WHERE id = ? FOR UPDATE", "XXXX").replace("FROM trainers WHERE id = ? FOR UPDATE", "FROM members WHERE id = ? FOR UPDATE").replace("XXXX", "FROM trainers WHERE id = ? FOR UPDATE")));
    
    // 12. conflict predicate changed from half-open -> FAIL
    assertThrows(() => verifyConflictPool(origControllerSrc.replace(/starts_at < \? AND ends_at > \?/g, "starts_at <= ? AND ends_at >= ?")));
    
    // 13. conflict status changed from scheduled-only -> FAIL
    assertThrows(() => verifyConflictPool(origControllerSrc.replace(/status = 'scheduled'/g, "status != 'cancelled'")));
    
    // 15. appointment_reschedules delete/update -> FAIL
    assertThrows(() => verifyRescheduleHistory(origControllerSrc + " UPDATE appointment_reschedules "));
    
    // 17. completed UPDATE cancellation field injected -> FAIL
    assertThrows(() => verifyLifecycleIsolation(origControllerSrc + " UPDATE appointments SET status = 'completed', cancellation_reason = 'x' WHERE id = ? "));
    
    // 18. no_show UPDATE completed field injected -> FAIL
    assertThrows(() => verifyLifecycleIsolation(origControllerSrc + " UPDATE appointments SET status = 'no_show', completed_at = 'x' WHERE id = ? "));
    
    // 19. terminalization member_visits insert -> FAIL
    assertThrows(() => verifyAppointmentNotVisit(origControllerSrc + " INSERT INTO member_visits "));
    
    // 20. appointment DELETE route -> FAIL
    assertThrows(() => verifyNoDeleteDomain(origControllerSrc + " DELETE FROM appointments ", origIndexSrc));
    
    // 22. audit action cross-wired -> FAIL
    assertThrows(() => verifyAuditDisjoint(origControllerSrc.replace(/'appointment.no_show'/g, "")));
    
    // 25. arbitrary fifth status in migration -> FAIL
    assertThrows(() => verifyStateMachine(origMigration35.replace(/'no_show'/g, "'no_show','pending'"), origControllerSrc, origIndexSrc));
});

// ---------------------------------------------------------
// Production Source Loading
// ---------------------------------------------------------
console.log("--- Loading Production Sources (Fail-Closed) ---");
const indexSrc = origIndexSrc;
const controllerSrc = origControllerSrc;
const migration35 = origMigration35;
const migration36 = fs.readFileSync(path.join(rootDir, 'database/migrations/036_create_appointment_reschedules.sql'), 'utf8');
const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

// ---------------------------------------------------------
// Run Child Verifiers
// ---------------------------------------------------------
console.log("--- Running Child Verifiers ---");
const childVerifiers = [
    'verify:appointment-read-create',
    'verify:appointment-reschedule',
    'verify:appointment-cancel',
    'verify:appointment-terminalization'
];

for (const script of childVerifiers) {
    checkInvariant(`Child Verifier Execution: ${script}`, () => {
        if (!pkgJson.scripts[script]) throw new Error(`Missing script ${script} in package.json`);
        const result = spawnSync('npm', ['run', script], { cwd: rootDir, encoding: 'utf8' });
        if (result.status !== 0) {
            console.error(result.stdout);
            console.error(result.stderr);
            throw new Error(`Child verifier ${script} failed with code ${result.status}`);
        }
    });
}

// ---------------------------------------------------------
// Production Invariant Checks
// ---------------------------------------------------------
console.log("--- Running Production Invariant Checks ---");

checkInvariant("Namespace Capability Matrix", () => verifyNamespaceCapabilityMatrix(indexSrc));
checkInvariant("State Machine", () => verifyStateMachine(migration35, controllerSrc, indexSrc));
checkInvariant("Cross-lifecycle time partition", () => verifyTimePartition(controllerSrc));
checkInvariant("Canonical participant lock discipline", () => verifyLockDiscipline(controllerSrc));
checkInvariant("Conflict pool consistency", () => verifyConflictPool(controllerSrc));
checkInvariant("Reschedule history exclusivity", () => verifyRescheduleHistory(controllerSrc));
checkInvariant("Lifecycle mutation-column isolation", () => verifyLifecycleIsolation(controllerSrc));
checkInvariant("Appointment != visit", () => verifyAppointmentNotVisit(controllerSrc));
checkInvariant("No-delete domain", () => verifyNoDeleteDomain(controllerSrc, indexSrc));
checkInvariant("Global CSRF integration", () => verifyGlobalCsrfIntegration(indexSrc));
checkInvariant("Global admin firewall + route-specific narrowing", () => verifyAdminFirewall(indexSrc));
checkInvariant("Audit lifecycle actions are disjoint", () => verifyAuditDisjoint(controllerSrc));
checkInvariant("Schema/controller consistency", () => verifySchemaConsistency(migration35));
checkInvariant("Exact public controller lifecycle surface", () => verifyExactPublicSurface(controllerSrc));

// Discovery/locking consistency, Eligibility asymmetry, Trainer scope matrix, Reception scope matrix,
// Lifecycle metadata isolation, Cancellation reason contract remains unique, Response/privacy compatibility,
// Actor semantics are all structurally enforced by the combination of the 4 child verifiers and the checks above.

checkInvariant("Artifact guard", () => {
    const forbiddenArtifacts = [
        'test.mjs', 'test2.mjs', 'test3.mjs', 'test-audit-keys.mjs', 'test-csrf.mjs',
        'patch.cjs', 'patch.js', 'patch_index.php'
    ];
    for (const art of forbiddenArtifacts) {
        if (fs.existsSync(path.resolve(rootDir, art))) throw new Error(`Forbidden artifact ${art}`);
    }
    const files = fs.readdirSync(rootDir);
    for (const file of files) {
        if (file.endsWith('.tmp') || file.endsWith('.fixed')) {
            throw new Error(`Forbidden temporary artifact found: ${file}`);
        }
    }
});

console.log("---------------------------------------------------------");
console.log(`Total Invariants: ${totalInvariants}`);
console.log(`Passed: ${passedInvariants}`);
console.log(`Failed: ${failedInvariants}`);
console.log("---------------------------------------------------------");

if (failedInvariants !== 0 || passedInvariants !== totalInvariants) {
    console.error(`❌ Appointment Lifecycle Final Verifier FAILED.`);
    process.exit(1);
} else {
    console.log(`✅ Appointment Lifecycle Final Verifier PASSED.`);
    process.exit(0);
}
