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
    if (!threw) throw new Error(errMsg);
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
function getHandlers(controllerSrc) {
    const cIdx = controllerSrc.indexOf("private function handleCreate(");
    const rIdx = controllerSrc.indexOf("private function handleReschedule(");
    const caIdx = controllerSrc.indexOf("private function handleCancel(");
    const tIdx = controllerSrc.indexOf("private function handleTerminalize(");
    
    if (cIdx === -1 || rIdx === -1 || caIdx === -1 || tIdx === -1) {
        throw new Error("Missing shared handler implementations");
    }
    
    return {
        create: extractBalanced(controllerSrc, cIdx),
        reschedule: extractBalanced(controllerSrc, rIdx),
        cancel: extractBalanced(controllerSrc, caIdx),
        terminalize: extractBalanced(controllerSrc, tIdx)
    };
}

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

function verifyLockDisciplineAndDiscovery(handlers) {
    const flows = ['reschedule', 'cancel', 'terminalize'];
    for (const f of flows) {
        const handler = handlers[f];
        if (!handler.includes("beginTransaction()")) throw new Error(`Missing beginTransaction in ${f}`);
        
        const mLock = handler.indexOf("FROM members WHERE id = ? FOR UPDATE");
        const tLock = handler.indexOf("FROM trainers WHERE id = ? FOR UPDATE");
        const aLock = handler.indexOf("FROM appointments WHERE id = ? FOR UPDATE");
        
        if (mLock === -1 || tLock === -1 || aLock === -1) throw new Error(`Missing lock in ${f}`);
        if (mLock > tLock || mLock > aLock || tLock > aLock) {
            throw new Error(`Participant lock order mismatch in ${f}`);
        }
        if (!handler.includes("APPOINTMENT_CHANGED")) throw new Error(`Missing APPOINTMENT_CHANGED in ${f}`);
        if (!handler.includes("409")) throw new Error(`Missing 409 in ${f}`);
    }
    
    // Create flow
    const cHandler = handlers['create'];
    const cmLock = cHandler.indexOf("FROM members WHERE id = ? FOR UPDATE");
    const ctLock = cHandler.indexOf("FROM trainers WHERE id = ? FOR UPDATE");
    if (cmLock === -1 || ctLock === -1) throw new Error("Missing lock in create");
    if (cmLock > ctLock) throw new Error("Participant lock order mismatch in create");
}

function verifyTimePartition(handlers) {
    const cHandler = handlers.cancel;
    if (!cHandler.includes("Europe/Istanbul")) throw new Error("Cancel time partition missing explicit Europe/Istanbul");
    if (!cHandler.includes("$now >= $endsAtDt") || !cHandler.includes("APPOINTMENT_NOT_CANCELLABLE")) {
        throw new Error("Cancel time partition guard missing or invalid");
    }
    
    const tHandler = handlers.terminalize;
    if (!tHandler.includes("Europe/Istanbul")) throw new Error("Terminalize time partition missing explicit Europe/Istanbul");
    if (!tHandler.includes("$now < $endsAtDt") || !tHandler.includes("APPOINTMENT_NOT_TERMINALIZABLE")) {
        throw new Error("Terminalize time partition guard missing or invalid");
    }
}

function verifyConflictPool(handlers) {
    const cHandler = handlers.create;
    const rHandler = handlers.reschedule;
    
    if (!cHandler.includes("starts_at < ? AND ends_at > ?") || !rHandler.includes("starts_at < ? AND ends_at > ?")) {
        throw new Error("Conflict predicate changed from half-open");
    }
    
    if (!cHandler.includes("status = 'scheduled'") || !rHandler.includes("status = 'scheduled'")) {
        throw new Error("Conflict pool must only check scheduled");
    }
    if (cHandler.includes("status != 'cancelled'") || rHandler.includes("status = 'completed'")) {
        throw new Error("Conflict pool semantic violation");
    }
    
    if (handlers.cancel.includes("starts_at < ? AND ends_at > ?") || handlers.terminalize.includes("starts_at < ? AND ends_at > ?")) {
        throw new Error("Conflict pool injected into terminal handlers");
    }
}

function verifyRescheduleHistory(handlers) {
    if (!handlers.reschedule.includes("INSERT INTO appointment_reschedules")) {
        throw new Error("Reschedule history insert missing");
    }
    const otherFlows = ['create', 'cancel', 'terminalize'];
    for (const f of otherFlows) {
        if (handlers[f].includes("INSERT INTO appointment_reschedules")) {
            throw new Error(`Reschedule history written outside reschedule in ${f}`);
        }
    }
    
    if (Object.values(handlers).some(h => h.includes("UPDATE appointment_reschedules") || h.includes("DELETE FROM appointment_reschedules"))) {
        throw new Error("Reschedule history must be append-only");
    }
}

function verifyMutationColumnIsolation(handlers) {
    const rUpdateMatch = handlers.reschedule.match(/UPDATE\s+appointments\s+SET\s+(.*?)\s+WHERE/is);
    if (!rUpdateMatch) throw new Error("Missing reschedule UPDATE");
    const rCols = rUpdateMatch[1].split(',').map(s => s.trim().split('=')[0].trim());
    if (rCols.length !== 3 || !rCols.includes("starts_at") || !rCols.includes("ends_at") || !rCols.includes("updated_by")) {
        throw new Error("Reschedule column isolation failure");
    }
    
    const cUpdateMatch = handlers.cancel.match(/UPDATE\s+appointments\s+SET\s+(.*?)\s+WHERE/is);
    if (!cUpdateMatch) throw new Error("Missing cancel UPDATE");
    const cCols = cUpdateMatch[1].split(',').map(s => s.trim().split('=')[0].trim());
    if (cCols.length !== 5 || !cCols.includes("status") || !cCols.includes("cancellation_reason") || !cCols.includes("cancelled_by") || !cCols.includes("cancelled_at") || !cCols.includes("updated_by")) {
        throw new Error("Cancel column isolation failure");
    }
    
    // terminalize has two branches
    if (!handlers.terminalize.includes("status = 'completed'") || !handlers.terminalize.includes("status = 'no_show'")) {
        throw new Error("Terminalize missing branches");
    }
    
    // check participant IDs
    for (const h of Object.values(handlers)) {
        if (h.match(/UPDATE\s+appointments\s+SET.*?member_id\s*=/is) || h.match(/UPDATE\s+appointments\s+SET.*?trainer_id\s*=/is)) {
            throw new Error("Participant IDs immutable after create");
        }
    }
}

function verifyEligibilityAsymmetry(handlers) {
    if (!handlers.create.includes("membership_end_date") || !handlers.reschedule.includes("membership_end_date")) {
        throw new Error("Missing eligibility in create/reschedule");
    }
    if (handlers.cancel.includes("membership_end_date") || handlers.terminalize.includes("membership_end_date")) {
        throw new Error("Eligibility injected into historical cancel/terminalize");
    }
    
    if (handlers.terminalize.includes("getTrainerProfileId") || handlers.terminalize.includes("is_active")) {
        throw new Error("Active-profile dependency in terminalize");
    }
    if (!handlers.terminalize.includes("admin_id")) {
        throw new Error("Trainer ownership via admin_id missing in terminalize");
    }
}

function verifyTrainerScope(controllerSrc, indexSrc) {
    // verified by namespace matrix + eligibility asymmetry, but check cancelTrainerAppointment absence
    if (controllerSrc.includes("function cancelTrainerAppointment")) throw new Error("cancelTrainerAppointment must be absent");
}

function verifyCancellationReason(handlers) {
    if (!handlers.cancel.includes("cancellation_reason")) throw new Error("Missing cancellation_reason in cancel");
    if (!handlers.cancel.includes("trim(") || !handlers.cancel.includes("mb_strlen(") || !handlers.cancel.includes("> 255") || !handlers.cancel.includes("empty(")) throw new Error("Missing trim/length check on cancellation_reason");
    
    for (const f of ['create', 'reschedule', 'terminalize']) {
        if (handlers[f].includes("cancellation_reason")) throw new Error(`cancellation_reason accepted in ${f}`);
    }
}

function verifyResponsePrivacy(handlers) {
    const forbidden = ['email', 'phone', 'emergency', 'blood', 'password', 'credential'];
    for (const f in handlers) {
        for (const word of forbidden) {
            if (handlers[f].includes(`'${word}'`)) throw new Error(`Privacy leak of ${word} in ${f}`);
        }
    }
    if (handlers.cancel.includes("'cancellation_reason' =>") || handlers.cancel.includes("'cancelled_by' =>")) throw new Error("Cancellation metadata leaked in response");
    if (handlers.terminalize.includes("'completed_by' =>") || handlers.terminalize.includes("'no_show_by' =>")) throw new Error("Terminal metadata leaked in response");
}

function verifyAuditDisjoint(handlers) {
    if (!handlers.create.includes("'appointment.created'")) throw new Error("Missing appointment.created audit in create");
    if (!handlers.reschedule.includes("'appointment.rescheduled'")) throw new Error("Missing appointment.rescheduled audit in reschedule");
    if (!handlers.cancel.includes("'appointment.cancelled'")) throw new Error("Missing appointment.cancelled audit in cancel");
    if (!handlers.terminalize.includes("'appointment.completed'") || !handlers.terminalize.includes("'appointment.no_show'")) {
        throw new Error("Missing terminal audit actions in terminalize");
    }
    
    if (handlers.cancel.includes("'appointment.completed'") || handlers.terminalize.includes("'appointment.cancelled'")) {
        throw new Error("Audit actions cross-wired");
    }
}

function verifyActorSemantics(handlers) {
    for (const f of ['reschedule', 'cancel', 'terminalize']) {
        const handler = handlers[f];
        if (!handler.includes("$_SESSION['admin_id']") || !handler.includes("preg_match('/^[1-9]\\d*$/'")) {
            throw new Error(`Missing positive canonical numeric actor semantics in ${f}`);
        }
        if (!handler.match(/AuditLogger::log\(\s*'appointment\.[a-z_]+',\s*\$adminId,\s*'appointment'/)) {
            throw new Error(`Audit arg2/arg4 actor mapping invalid in ${f}`);
        }
    }
}

function verifyAppointmentNotVisit(controllerSrc) {
    if (controllerSrc.includes("INSERT INTO member_visits") || controllerSrc.includes("visit_id") || controllerSrc.includes("check-in")) {
        throw new Error("Completing appointment does NOT create visit");
    }
}

function verifyNoDeleteDomain(controllerSrc) {
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

checkInvariant("Negative: Editor added to admin appointment route", () => {
    assertThrows(() => verifyAdminFirewall(origIndexSrc.replace(/hasRole\(\['super_admin', 'admin'\]\)/g, "hasRole(['super_admin', 'admin', 'editor'])")));
});

checkInvariant("Negative: Reception complete route injected", () => {
    assertThrows(() => verifyNamespaceCapabilityMatrix(origIndexSrc + `\nif (preg_match('#^/api/reception/appointments/([1-9]\\d*)/complete$#')) {}`));
});

checkInvariant("Negative: Trainer cancel route injected", () => {
    assertThrows(() => verifyNamespaceCapabilityMatrix(origIndexSrc + `\nif (preg_match('#^/api/trainer/appointments/([1-9]\\d*)/cancel$#')) {}`));
});

checkInvariant("Negative: Create trainer-before-member lock", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.create = handlers.create.replace("FROM members WHERE id = ? FOR UPDATE", "XXXX").replace("FROM trainers WHERE id = ? FOR UPDATE", "FROM members WHERE id = ? FOR UPDATE").replace("XXXX", "FROM trainers WHERE id = ? FOR UPDATE");
    assertThrows(() => verifyLockDisciplineAndDiscovery(handlers));
});

checkInvariant("Negative: Reschedule appointment-before-member lock", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.reschedule = handlers.reschedule.replace("FROM appointments WHERE id = ? FOR UPDATE", "XXXX").replace("FROM members WHERE id = ? FOR UPDATE", "FROM appointments WHERE id = ? FOR UPDATE").replace("XXXX", "FROM members WHERE id = ? FOR UPDATE");
    assertThrows(() => verifyLockDisciplineAndDiscovery(handlers));
});

checkInvariant("Negative: Cancel trainer-before-member lock", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.cancel = handlers.cancel.replace("FROM members WHERE id = ? FOR UPDATE", "XXXX").replace("FROM trainers WHERE id = ? FOR UPDATE", "FROM members WHERE id = ? FOR UPDATE").replace("XXXX", "FROM trainers WHERE id = ? FOR UPDATE");
    assertThrows(() => verifyLockDisciplineAndDiscovery(handlers));
});

checkInvariant("Negative: Terminalize appointment-before-trainer lock", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.terminalize = handlers.terminalize.replace("FROM appointments WHERE id = ? FOR UPDATE", "XXXX").replace("FROM trainers WHERE id = ? FOR UPDATE", "FROM appointments WHERE id = ? FOR UPDATE").replace("XXXX", "FROM trainers WHERE id = ? FOR UPDATE");
    assertThrows(() => verifyLockDisciplineAndDiscovery(handlers));
});

checkInvariant("Negative: Cancel boundary >= changed to >", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.cancel = handlers.cancel.replace("$now >= $endsAtDt", "$now > $endsAtDt");
    assertThrows(() => verifyTimePartition(handlers));
});

checkInvariant("Negative: Terminalize boundary < changed to <=", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.terminalize = handlers.terminalize.replace("$now < $endsAtDt", "$now <= $endsAtDt");
    assertThrows(() => verifyTimePartition(handlers));
});

checkInvariant("Negative: Cancel time guard removed", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.cancel = handlers.cancel.replace("$now >= $endsAtDt", "false");
    assertThrows(() => verifyTimePartition(handlers));
});

checkInvariant("Negative: Terminalize time guard removed", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.terminalize = handlers.terminalize.replace("$now < $endsAtDt", "false");
    assertThrows(() => verifyTimePartition(handlers));
});

checkInvariant("Negative: Remove APPOINTMENT_CHANGED from cancel only", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.cancel = handlers.cancel.replace("APPOINTMENT_CHANGED", "ERROR");
    assertThrows(() => verifyLockDisciplineAndDiscovery(handlers));
});

checkInvariant("Negative: Remove member active eligibility from reschedule", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.reschedule = handlers.reschedule.replace(/membership_end_date/g, "deleted_at");
    assertThrows(() => verifyEligibilityAsymmetry(handlers));
});

checkInvariant("Negative: Inject membership_end gate into cancel", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.cancel += " membership_end_date ";
    assertThrows(() => verifyEligibilityAsymmetry(handlers));
});

checkInvariant("Negative: Inject trainer is_active gate into terminalize", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.terminalize += " is_active ";
    assertThrows(() => verifyEligibilityAsymmetry(handlers));
});

checkInvariant("Negative: Create overlap <= injected", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.create = handlers.create.replace(/starts_at < \? AND ends_at > \?/g, "starts_at <= ? AND ends_at >= ?");
    assertThrows(() => verifyConflictPool(handlers));
});

checkInvariant("Negative: Reschedule scheduled filter removed", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.reschedule = handlers.reschedule.replace(/status = 'scheduled'/g, "status != 'cancelled'");
    assertThrows(() => verifyConflictPool(handlers));
});

checkInvariant("Negative: Conflict query injected into terminalize", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.terminalize += " starts_at < ? AND ends_at > ? ";
    assertThrows(() => verifyConflictPool(handlers));
});

checkInvariant("Negative: History write outside reschedule", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.cancel += " INSERT INTO appointment_reschedules ";
    assertThrows(() => verifyRescheduleHistory(handlers));
});

checkInvariant("Negative: Arbitrary mutation column", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.cancel = handlers.cancel.replace("status = 'cancelled'", "status = 'cancelled', member_id = 999");
    assertThrows(() => verifyMutationColumnIsolation(handlers));
});

checkInvariant("Negative: Audit action cross-wired", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.cancel = handlers.cancel.replace("'appointment.cancelled'", "'appointment.rescheduled'");
    assertThrows(() => verifyAuditDisjoint(handlers));
});

checkInvariant("Negative: Cancellation reason outside cancel", () => {
    const handlers = getHandlers(origControllerSrc);
    handlers.terminalize += " cancellation_reason ";
    assertThrows(() => verifyCancellationReason(handlers));
});

checkInvariant("Negative: Arbitrary fifth status in migration", () => {
    assertThrows(() => verifyStateMachine(origMigration35.replace(/'no_show'/g, "'no_show','pending'"), origControllerSrc, origIndexSrc));
});

checkInvariant("Negative: Terminalization member_visits insert", () => {
    assertThrows(() => verifyAppointmentNotVisit(origControllerSrc + " INSERT INTO member_visits "));
});

checkInvariant("Negative: Appointment DELETE route", () => {
    assertThrows(() => verifyNoDeleteDomain(origControllerSrc + " DELETE FROM appointments "));
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

const handlers = getHandlers(controllerSrc);

checkInvariant("Namespace Capability Matrix", () => verifyNamespaceCapabilityMatrix(indexSrc));
checkInvariant("State Machine", () => verifyStateMachine(migration35, controllerSrc, indexSrc));
checkInvariant("Cross-lifecycle time partition", () => verifyTimePartition(handlers));
checkInvariant("Canonical participant lock discipline", () => verifyLockDisciplineAndDiscovery(handlers));
checkInvariant("Conflict pool consistency", () => verifyConflictPool(handlers));
checkInvariant("Reschedule history exclusivity", () => verifyRescheduleHistory(handlers));
checkInvariant("Lifecycle mutation-column isolation", () => verifyMutationColumnIsolation(handlers));
checkInvariant("Eligibility asymmetry", () => verifyEligibilityAsymmetry(handlers));
checkInvariant("Trainer scope integration", () => verifyTrainerScope(controllerSrc, indexSrc));
checkInvariant("Cancellation reason uniqueness", () => verifyCancellationReason(handlers));
checkInvariant("Response privacy compatibility", () => verifyResponsePrivacy(handlers));
checkInvariant("Audit action-to-handler mapping", () => verifyAuditDisjoint(handlers));
checkInvariant("Actor semantics", () => verifyActorSemantics(handlers));
checkInvariant("Appointment != visit", () => verifyAppointmentNotVisit(controllerSrc));
checkInvariant("No-delete domain", () => verifyNoDeleteDomain(controllerSrc));
checkInvariant("Global CSRF integration", () => verifyGlobalCsrfIntegration(indexSrc));
checkInvariant("Global admin firewall + route-specific narrowing", () => verifyAdminFirewall(indexSrc));
checkInvariant("Schema/controller consistency", () => verifySchemaConsistency(migration35));
checkInvariant("Exact public controller lifecycle surface", () => verifyExactPublicSurface(controllerSrc));

checkInvariant("Artifact guard", () => {
    const forbiddenArtifacts = [
        'make_verifier.js', 'patch2.cjs', 'patch_lifecycle.cjs', 'patch_tests.js',
        'test_asserts.cjs', 'test_regex.cjs', 'test_regex.js', 'test_regex2.cjs', 'test_regex_update.cjs',
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
