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
        console.log("✅ PASS: " + name);
        passedInvariants++;
    } catch (e) {
        console.error("❌ FAIL: " + name + " -> " + e.message);
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
    if (indexSrc.includes('/api/public/appointments') || indexSrc.match(/\/api\/[a-z_]*member[a-z_]*\/appointments/)) {
        throw new Error("Public/member appointment read/write lifecycle route forbidden");
    }
    
    const adminBlocks = [...indexSrc.matchAll(/'\/api\/admin\/appointments'|preg_match\('#\^\/api\/admin\/appointments/g)];
    for (const match of adminBlocks) {
        const block = extractBalanced(indexSrc, indexSrc.indexOf('{', match.index));
        if (!block.includes("AuthMiddleware::hasRole(['super_admin', 'admin'])")) {
            throw new Error("Admin route missing exact AuthMiddleware::hasRole(['super_admin', 'admin'])");
        }
        if (block.includes("'editor'")) throw new Error("Editor extra role forbidden in admin appointments");
        if (block.includes("preg_match") && !block.includes("([1-9]\\d*)")) {
            throw new Error("Dynamic route ID missing exact ([1-9]\\d*)");
        }
        if (block.includes("preg_match") && !block.includes("(int)$matches[1]")) {
            throw new Error("Dynamic route ID missing exact (int)$matches[1]");
        }
    }
    
    if (!indexSrc.includes("preg_match('#^/api/admin/appointments/([1-9]\\d*)/reschedule$#', $requestUri, $matches)")) throw new Error("Admin missing reschedule");
    if (!indexSrc.includes("preg_match('#^/api/admin/appointments/([1-9]\\d*)/cancel$#', $requestUri, $matches)")) throw new Error("Admin missing cancel");
    if (!indexSrc.includes("preg_match('#^/api/admin/appointments/([1-9]\\d*)/complete$#', $requestUri, $matches)")) throw new Error("Admin missing complete");
    if (!indexSrc.includes("preg_match('#^/api/admin/appointments/([1-9]\\d*)/no-show$#', $requestUri, $matches)")) throw new Error("Admin missing no-show");

    const recBlocks = [...indexSrc.matchAll(/'\/api\/reception\/appointments'|preg_match\('#\^\/api\/reception\/appointments/g)];
    for (const match of recBlocks) {
        const block = extractBalanced(indexSrc, indexSrc.indexOf('{', match.index));
        if (!block.includes("AuthMiddleware::hasRole(['super_admin', 'admin', 'reception'])")) {
            throw new Error("Reception route missing exact AuthMiddleware::hasRole(['super_admin', 'admin', 'reception'])");
        }
        if (block.includes("completeReceptionAppointment") || block.includes("noShowReceptionAppointment") || block.includes("delete")) {
            throw new Error("Reception forbidden methods");
        }
    }
    if (!indexSrc.includes("preg_match('#^/api/reception/appointments/([1-9]\\d*)/reschedule$#', $requestUri, $matches)")) throw new Error("Reception missing reschedule");
    if (!indexSrc.includes("preg_match('#^/api/reception/appointments/([1-9]\\d*)/cancel$#', $requestUri, $matches)")) throw new Error("Reception missing cancel");
    if (indexSrc.match(/preg_match\('#\^\/api\/reception\/appointments\/\(\[1-9\]\\d\*\)\/(complete|no-show)\$#'/)) throw new Error("Reception complete/no-show forbidden");

    const trnBlocks = [...indexSrc.matchAll(/'\/api\/trainer\/appointments'|preg_match\('#\^\/api\/trainer\/appointments/g)];
    for (const match of trnBlocks) {
        const block = extractBalanced(indexSrc, indexSrc.indexOf('{', match.index));
        if (!block.includes("AuthMiddleware::hasRole(['trainer'])")) {
            throw new Error("Trainer route missing exact AuthMiddleware::hasRole(['trainer'])");
        }
        if (block.includes("cancelTrainerAppointment") || block.includes("delete")) {
            throw new Error("Trainer forbidden methods");
        }
    }
    if (!indexSrc.includes("preg_match('#^/api/trainer/appointments/([1-9]\\d*)/reschedule$#', $requestUri, $matches)")) throw new Error("Trainer missing reschedule");
    if (!indexSrc.includes("preg_match('#^/api/trainer/appointments/([1-9]\\d*)/complete$#', $requestUri, $matches)")) throw new Error("Trainer missing complete");
    if (!indexSrc.includes("preg_match('#^/api/trainer/appointments/([1-9]\\d*)/no-show$#', $requestUri, $matches)")) throw new Error("Trainer missing no-show");
    if (indexSrc.includes("preg_match('#^/api/trainer/appointments/([1-9]\\d*)/cancel$#', $requestUri, $matches)")) throw new Error("Trainer cancel forbidden");
}

function verifyStateMachine(migration35, handlers, indexSrc) {
    const statusMatch = migration35.match(/ENUM\(([^)]+)\)/i);
    if (!statusMatch) throw new Error("Missing status ENUM");
    const statuses = statusMatch[1].split(',').map(s => s.replace(/['\s]/g, ''));
    const expected = ['scheduled', 'completed', 'cancelled', 'no_show'];
    if (statuses.length !== expected.length || !statuses.every(s => expected.includes(s))) {
        throw new Error("Exact statuses must be scheduled, completed, cancelled, no_show");
    }
    
    if (indexSrc.match(/\/api\/[a-z_]+\/appointments\/\(\[1-9\]\\d\*\)'/)) {
        throw new Error("Generic PATCH /appointments/{id} bypass forbidden");
    }

    if (!handlers.reschedule.match(/status.*?['"]scheduled['"]/i)) {
        throw new Error("Reschedule missing locked status scheduled only");
    }
    if (!handlers.cancel.match(/status.*?['"]scheduled['"]/i)) {
        throw new Error("Cancel missing locked status scheduled only");
    }
    if (!handlers.terminalize.match(/status.*?['"]scheduled['"]/i)) {
        throw new Error("Terminalize missing locked status scheduled only");
    }
}

function verifyLockDisciplineAndDiscovery(handlers) {
    for (const f of ['reschedule', 'cancel', 'terminalize']) {
        const handler = handlers[f];
        if (!handler.includes("beginTransaction()")) throw new Error("Missing beginTransaction in " + f);
        
        const bIdx = handler.indexOf("beginTransaction()");
        
        const discoveryIdx = handler.indexOf("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
        if (discoveryIdx === -1) throw new Error("Missing non-locking discovery in " + f);
        if (bIdx > discoveryIdx) throw new Error("beginTransaction must occur before discovery in " + f);
        if (handler.substring(discoveryIdx, discoveryIdx + 150).includes("FOR UPDATE")) {
            throw new Error("Discovery must be non-locking in " + f);
        }
        
        const mLock = handler.indexOf("FROM members WHERE id = ? FOR UPDATE");
        const tLock = handler.indexOf("FROM trainers WHERE id = ? FOR UPDATE");
        const aLock = handler.indexOf("FROM appointments WHERE id = ? FOR UPDATE");
        
        if (mLock === -1 || tLock === -1 || aLock === -1) throw new Error("Missing lock in " + f);
        if (mLock > tLock || mLock > aLock || tLock > aLock) {
            throw new Error("Participant lock order mismatch in " + f);
        }
        
        if (!handler.includes("['member_id'] !==") || !handler.includes("['trainer_id'] !==")) {
            throw new Error("Missing discovery-vs-locked comparison in " + f);
        }
        if (!handler.includes("APPOINTMENT_CHANGED") || !handler.includes("409")) {
            throw new Error("Missing APPOINTMENT_CHANGED 409 in " + f);
        }
    }
    
    const cHandler = handlers.create;
    if (!cHandler.includes("beginTransaction()")) throw new Error("Missing beginTransaction in create");
    
    const cBIdx = cHandler.indexOf("beginTransaction()");
    const cmLock = cHandler.indexOf("FROM members WHERE id = ? FOR UPDATE");
    const ctLock = cHandler.indexOf("FROM trainers WHERE id = ? FOR UPDATE");
    
    if (cmLock === -1 || ctLock === -1) throw new Error("Missing lock in create");
    if (cmLock > ctLock) throw new Error("Participant lock order mismatch in create");
    if (cBIdx > cmLock) throw new Error("create beginTransaction moved after member lock");
    
    if (cHandler.includes("FROM appointments WHERE id = ? FOR UPDATE")) {
        throw new Error("Create flow should not lock appointment row");
    }
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

function verifyEligibilityAsymmetry(handlers) {
    if (!handlers.create.includes("membership_end_date") || !handlers.reschedule.includes("membership_end_date")) {
        throw new Error("Missing eligibility in create/reschedule");
    }
    if (handlers.create.includes("membership_start_date") || handlers.reschedule.includes("membership_start_date")) {
        throw new Error("Forbidden membership_start_date");
    }
    if (handlers.cancel.match(/membership_end_date|is_active|deleted_at IS NULL(?!\s+AND\s+is_active)/is) && handlers.cancel.includes("membership_end_date")) {
        throw new Error("Eligibility injected into historical cancel");
    }
    if (handlers.terminalize.match(/membership_end_date|is_active(?!\s*=\s*1)/is) && handlers.terminalize.includes("membership_end_date")) {
        throw new Error("Eligibility injected into historical terminalize");
    }
    
    if (!handlers.terminalize.includes("(int)$trainer['admin_id'] !== $adminId") && !handlers.terminalize.includes("(int)$lockedApp['trainer_admin_id'] !== $adminId")) {
        if (!handlers.terminalize.includes("int)$trainer['admin_id'] !== $adminId")) {
             throw new Error("Missing exact trainer ownership semantic in terminalize: (int)$trainer['admin_id'] !== $adminId");
        }
    }
    if (handlers.terminalize.includes("getTrainerProfileId")) {
        throw new Error("Active-profile dependency in terminalize");
    }
}

function verifyTrainerScope(controllerSrc) {
    if (controllerSrc.includes("function cancelTrainerAppointment")) throw new Error("cancelTrainerAppointment must be absent");
    if (!controllerSrc.includes("members.trainer_id === currentTrainerId") && !controllerSrc.includes("['trainer_id'] !== $forcedTrainerId")) {
        if (!controllerSrc.includes("(int)$member['trainer_id'] !== $forcedTrainerId")) {
             throw new Error("Member assignment scope check missing in create");
        }
    }
}

function verifyReceptionScope(controllerSrc) {
    if (controllerSrc.includes("function completeReceptionAppointment") || controllerSrc.includes("function noShowReceptionAppointment")) {
        throw new Error("completeReceptionAppointment / noShowReceptionAppointment absent");
    }
}

function verifyConflictPool(handlers) {
    for (const f of ['create', 'reschedule']) {
        const handler = handlers[f];
        if (!handler.includes("starts_at < ?") || !handler.includes("ends_at > ?")) {
            throw new Error("Conflict predicate changed from half-open in " + f);
        }
        if (!handler.includes("status = 'scheduled'")) {
            throw new Error("Conflict pool must only check scheduled in " + f);
        }
        
        if (!handler.includes("trainer_id = ?") || !handler.includes("member_id = ?")) {
            throw new Error("Missing member/trainer conflict domain in " + f);
        }
    }
    
    if (handlers.cancel.includes("starts_at < ? AND ends_at > ?") || handlers.terminalize.includes("starts_at < ? AND ends_at > ?")) {
        throw new Error("Conflict pool injected into terminal handlers");
    }
}

function verifyRescheduleHistory(handlers, controllerSrc, migration36) {
    const rIdx = handlers.reschedule.indexOf("INSERT INTO appointment_reschedules");
    if (rIdx === -1) throw new Error("Reschedule history insert missing in reschedule");
    const uIdx = handlers.reschedule.indexOf("UPDATE appointments");
    if (rIdx > uIdx) throw new Error("History INSERT must occur before appointment UPDATE");
    
    for (const f of ['create', 'cancel', 'terminalize']) {
        if (handlers[f].includes("INSERT INTO appointment_reschedules")) {
            throw new Error("Reschedule history written outside reschedule in " + f);
        }
    }
    
    if (controllerSrc.includes("UPDATE appointment_reschedules") || controllerSrc.includes("DELETE FROM appointment_reschedules")) {
        throw new Error("Global UPDATE/DELETE appointment_reschedules forbidden");
    }
    
    const reqCols = ['appointment_id', 'previous_starts_at', 'previous_ends_at', 'new_starts_at', 'new_ends_at', 'rescheduled_by', 'created_at'];
    for (const col of reqCols) {
        if (!migration36.includes(col)) throw new Error("Migration 36 missing " + col);
    }
}

function verifyMutationColumnIsolation(handlers) {
    const rMatch = handlers.reschedule.match(/UPDATE\s+appointments\s+SET\s+(.*?)\s+WHERE/is);
    if (!rMatch) throw new Error("Missing reschedule UPDATE");
    const rCols = rMatch[1].split(',').map(s => s.trim().split('=')[0].trim());
    if (rCols.length !== 3 || !rCols.includes("starts_at") || !rCols.includes("ends_at") || !rCols.includes("updated_by")) {
        throw new Error("Reschedule exact set mismatch");
    }
    
    const cMatch = handlers.cancel.match(/UPDATE\s+appointments\s+SET\s+(.*?)\s+WHERE/is);
    if (!cMatch) throw new Error("Missing cancel UPDATE");
    const cCols = cMatch[1].split(',').map(s => s.trim().split('=')[0].trim());
    if (cCols.length !== 5 || !cCols.includes("status") || !cCols.includes("cancellation_reason") || !cCols.includes("cancelled_by") || !cCols.includes("cancelled_at") || !cCols.includes("updated_by")) {
        throw new Error("Cancel exact set mismatch");
    }
    
    const tMatch = [...handlers.terminalize.matchAll(/UPDATE\s+appointments\s+SET\s+(.*?)\s+WHERE/igs)];
    if (tMatch.length < 2) throw new Error("Terminalize missing branches");
    
    const compCols = tMatch[0][1].split(',').map(s => s.trim().split('=')[0].trim());
    if (compCols.length !== 4 || !compCols.includes("status") || !compCols.includes("completed_by") || !compCols.includes("completed_at") || !compCols.includes("updated_by")) {
        throw new Error("Completed exact set mismatch");
    }
    
    const nsCols = tMatch[1][1].split(',').map(s => s.trim().split('=')[0].trim());
    if (nsCols.length !== 4 || !nsCols.includes("status") || !nsCols.includes("no_show_by") || !nsCols.includes("no_show_at") || !nsCols.includes("updated_by")) {
        throw new Error("No-show exact set mismatch");
    }
}

function verifyCancellationReason(handlers) {
    if (!handlers.cancel.includes("cancellation_reason")) throw new Error("Missing cancellation_reason in cancel");
    if (!handlers.cancel.includes("trim(") || !handlers.cancel.includes("mb_strlen(") || !handlers.cancel.includes("> 255") || !handlers.cancel.includes("empty(")) {
        throw new Error("Missing trim/empty/length check on cancellation_reason in cancel");
    }
    if (handlers.cancel.match(/mb_strlen.*?<\s*3/)) throw new Error("No min-3 rule allowed for cancellation reason");
    
    for (const f of ['create', 'reschedule', 'terminalize']) {
        if (handlers[f].includes("cancellation_reason")) throw new Error("cancellation_reason accepted in " + f);
    }
}

function verifyResponsePrivacy(handlers) {
    const forbidden = ['email', 'phone', 'emergency', 'blood', 'password', 'credential'];
    
    for (const f in handlers) {
        const respIdx = handlers[f].indexOf("Response::json(");
        if (respIdx !== -1) {
            const respBlock = extractBalanced(handlers[f], respIdx, '(', ')');
            if (respBlock) {
                for (const word of forbidden) {
                    if (respBlock.includes("'" + word + "'")) throw new Error("Privacy leak of " + word + " in success response of " + f);
                }
                if (f === 'cancel') {
                    if (respBlock.includes("'cancellation_reason'") || respBlock.includes("'cancelled_by'") || respBlock.includes("'cancelled_at'")) {
                        throw new Error("Cancellation metadata leaked in success response");
                    }
                }
                if (f === 'terminalize') {
                    if (respBlock.includes("'completed_by'") || respBlock.includes("'completed_at'") || respBlock.includes("'no_show_by'") || respBlock.includes("'no_show_at'")) {
                        throw new Error("Terminal metadata leaked in success response");
                    }
                }
            }
        }
    }
}

function verifyAuditDisjoint(handlers) {
    if (!handlers.create.match(/AuditLogger::log\(\s*'appointment\.created',\s*\$adminId,\s*'appointment'/)) throw new Error("Missing appointment.created audit in create");
    if (!handlers.reschedule.match(/AuditLogger::log\(\s*'appointment\.rescheduled',\s*\$adminId,\s*'appointment'/)) throw new Error("Missing appointment.rescheduled audit in reschedule");
    if (!handlers.cancel.match(/AuditLogger::log\(\s*'appointment\.cancelled',\s*\$adminId,\s*'appointment'/)) throw new Error("Missing appointment.cancelled audit in cancel");
    
    if (!handlers.terminalize.match(/AuditLogger::log\(\s*'appointment\.completed',\s*\$adminId,\s*'appointment'/)) throw new Error("Missing appointment.completed audit in terminalize");
    if (!handlers.terminalize.match(/AuditLogger::log\(\s*'appointment\.no_show',\s*\$adminId,\s*'appointment'/)) throw new Error("Missing appointment.no_show audit in terminalize");
    
    for (const f of ['create', 'reschedule', 'cancel', 'terminalize']) {
        const h = handlers[f];
        const commitIdx = h.indexOf("commit()");
        const auditIdx = h.indexOf("AuditLogger::log");
        if (commitIdx === -1) throw new Error("Missing commit in " + f);
        if (auditIdx === -1) throw new Error("Missing AuditLogger in " + f);
        if (commitIdx > auditIdx) throw new Error("commit -> audit ordering violation in " + f);
    }
    
    if (handlers.cancel.match(/AuditLogger::log.*?cancellation_reason/s)) {
        throw new Error("Cancel audit metadata cannot contain cancellation_reason");
    }
}

function verifyActorSemantics(handlers) {
    for (const f of ['reschedule', 'cancel', 'terminalize']) {
        const handler = handlers[f];
        if (!handler.includes("preg_match('/^[1-9]\\d*$/'")) {
            throw new Error("Missing positive canonical numeric actor semantics in " + f);
        }
    }
}

function verifySchemaConsistency(migration35, migration36) {
    if (migration35.includes("visit_id") || migration35.includes("deleted_at") || migration35.includes("session_credits") || migration35.includes("payment")) {
        throw new Error("Invalid fields introduced into appointment V1 lifecycle schema");
    }
    if (migration36.includes("visit_id") || migration36.includes("payment")) {
        throw new Error("Invalid fields in migration 36");
    }
}

function verifyNoDeleteDomain(controllerSrc, indexSrc) {
    if (indexSrc.includes("DELETE /api/") && indexSrc.includes("appointments")) {
        throw new Error("DELETE appointment route found");
    }
    if (controllerSrc.includes("deleteAppointment") || controllerSrc.includes("destroyAppointment") || controllerSrc.includes("DELETE FROM appointments") || controllerSrc.includes("appointments.deleted_at") || controllerSrc.includes("visit_id") || controllerSrc.includes("INSERT INTO member_visits")) {
        throw new Error("No appointment DELETE route and no visit creation allowed");
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
    
    const guardIdx = indexSrc.indexOf("in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])");
    const routeIdx = indexSrc.indexOf("preg_match('#^/api/");
    if (guardIdx > routeIdx) {
        throw new Error("Global CSRF guard must occur before routing");
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
        if (!controllerSrc.includes("public function " + m)) throw new Error("Missing public lifecycle method " + m);
    }
    
    const forbidden = [
        'cancelTrainerAppointment', 'completeReceptionAppointment', 'noShowReceptionAppointment',
        'deleteAppointment', 'destroyAppointment'
    ];
    for (const f of forbidden) {
        if (controllerSrc.includes("function " + f)) throw new Error("Forbidden public lifecycle method " + f);
    }
}

// ---------------------------------------------------------
// Negative Self-Tests
// ---------------------------------------------------------
console.log("--- Starting Negative Self-Tests ---");

const origIndexSrc = fs.readFileSync(path.join(rootDir, 'api/index.php'), 'utf8');
const origControllerSrc = fs.readFileSync(path.join(rootDir, 'api/controllers/AppointmentController.php'), 'utf8');
const origMigration35 = fs.readFileSync(path.join(rootDir, 'database/migrations/035_create_appointments.sql'), 'utf8');
const origMigration36 = fs.readFileSync(path.join(rootDir, 'database/migrations/036_create_appointment_reschedules.sql'), 'utf8');

checkInvariant("Negative: EXACT RECEPTION/TRAINER RBAC DRIFT", () => {
    assertThrows(() => verifyNamespaceCapabilityMatrix(origIndexSrc.replace(/hasRole\(\['super_admin', 'admin', 'reception'\]\)/g, "hasRole(['reception'])")));
});
checkInvariant("Negative: PER-FLOW DISCOVERY DRIFT", () => {
    const h = getHandlers(origControllerSrc);
    h.reschedule = h.reschedule.replace("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?", "SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ? FOR UPDATE");
    assertThrows(() => verifyLockDisciplineAndDiscovery(h));
});
checkInvariant("Negative: SCHEDULED-ONLY GATE REMOVAL", () => {
    const h = getHandlers(origControllerSrc);
    h.reschedule = h.reschedule.replace(/scheduled/g, "completed");
    assertThrows(() => verifyStateMachine(origMigration35, h, origIndexSrc));
});
checkInvariant("Negative: ELIGIBILITY ASYMMETRY DRIFT", () => {
    const h = getHandlers(origControllerSrc);
    h.terminalize += " membership_end_date ";
    assertThrows(() => verifyEligibilityAsymmetry(h));
});
checkInvariant("Negative: MISSING MEMBER/TRAINER CONFLICT DOMAIN", () => {
    const h = getHandlers(origControllerSrc);
    h.reschedule = h.reschedule.replace(/member_id = \?/g, "1=1");
    assertThrows(() => verifyConflictPool(h));
});
checkInvariant("Negative: HISTORY ORDER DRIFT", () => {
    const h = getHandlers(origControllerSrc);
    h.reschedule = h.reschedule.replace("INSERT INTO appointment_reschedules", "UPDATE appointments");
    assertThrows(() => verifyRescheduleHistory(h, origControllerSrc, origMigration36));
});
checkInvariant("Negative: MIGRATION 036 FIELD DRIFT", () => {
    assertThrows(() => verifyRescheduleHistory(getHandlers(origControllerSrc), origControllerSrc, origMigration36.replace("previous_starts_at", "missing_field")));
});
checkInvariant("Negative: TERMINALIZATION EXTRA UPDATE COLUMN", () => {
    const h = getHandlers(origControllerSrc);
    h.terminalize = h.terminalize.replace(/status = 'completed'/g, "status = 'completed', extra_col = 1");
    assertThrows(() => verifyMutationColumnIsolation(h));
});
checkInvariant("Negative: CANCEL MIN-3 RULE", () => {
    const h = getHandlers(origControllerSrc);
    h.cancel += " mb_strlen($reason) < 3 ";
    assertThrows(() => verifyCancellationReason(h));
});
checkInvariant("Negative: TERMINAL TIMESTAMP RESPONSE LEAK", () => {
    const h = getHandlers(origControllerSrc);
    h.terminalize = h.terminalize.replace(/Response::json\(\[/g, "Response::json(['completed_at' => '123', ");
    assertThrows(() => verifyResponsePrivacy(h));
});
checkInvariant("Negative: DELETE ROUTE INJECTION", () => {
    assertThrows(() => verifyNoDeleteDomain(origControllerSrc, origIndexSrc + "\nif (preg_match('#^/api/admin/appointments/([1-9]\\d*)$#', $requestUri, $matches) && $method === 'DELETE') {DELETE /api/}"));
});

// ---------------------------------------------------------
// Production Source Loading
// ---------------------------------------------------------
console.log("--- Loading Production Sources (Fail-Closed) ---");
const indexSrc = origIndexSrc;
const controllerSrc = origControllerSrc;
const migration35 = origMigration35;
const migration36 = origMigration36;
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
    checkInvariant("Child Verifier Execution: " + script, () => {
        if (!pkgJson.scripts[script]) throw new Error("Missing script " + script + " in package.json");
        const result = spawnSync('npm', ['run', script], { cwd: rootDir, encoding: 'utf8' });
        if (result.status !== 0) {
            console.error(result.stdout);
            console.error(result.stderr);
            throw new Error("Child verifier " + script + " failed with code " + result.status);
        }
    });
}

// ---------------------------------------------------------
// Production Invariant Checks
// ---------------------------------------------------------
console.log("--- Running Production Invariant Checks ---");

const handlers = getHandlers(controllerSrc);

checkInvariant("Namespace Capability Matrix", () => verifyNamespaceCapabilityMatrix(indexSrc));
checkInvariant("State Machine", () => verifyStateMachine(migration35, handlers, indexSrc));
checkInvariant("Cross-lifecycle time partition", () => verifyTimePartition(handlers));
checkInvariant("Canonical participant lock discipline", () => verifyLockDisciplineAndDiscovery(handlers));
checkInvariant("Conflict pool consistency", () => verifyConflictPool(handlers));
checkInvariant("Reschedule history exclusivity", () => verifyRescheduleHistory(handlers, controllerSrc, migration36));
checkInvariant("Lifecycle mutation-column isolation", () => verifyMutationColumnIsolation(handlers));
checkInvariant("Eligibility asymmetry", () => verifyEligibilityAsymmetry(handlers));
checkInvariant("Trainer scope integration", () => verifyTrainerScope(controllerSrc));
checkInvariant("Reception scope integration", () => verifyReceptionScope(controllerSrc));
checkInvariant("Cancellation reason uniqueness", () => verifyCancellationReason(handlers));
checkInvariant("Response privacy compatibility", () => verifyResponsePrivacy(handlers));
checkInvariant("Audit action-to-handler mapping", () => verifyAuditDisjoint(handlers));
checkInvariant("Actor semantics", () => verifyActorSemantics(handlers));
checkInvariant("Appointment != visit", () => verifyNoDeleteDomain(controllerSrc, indexSrc));
checkInvariant("Global CSRF integration", () => verifyGlobalCsrfIntegration(indexSrc));
checkInvariant("Schema/controller consistency", () => verifySchemaConsistency(migration35, migration36));
checkInvariant("Exact public controller lifecycle surface", () => verifyExactPublicSurface(controllerSrc));

checkInvariant("Artifact guard", () => {
    const forbiddenArtifacts = [
        'make_verifier.js', 'patch2.cjs', 'patch_lifecycle.cjs', 'patch_tests.js',
        'test_asserts.cjs', 'test_regex.cjs', 'test_regex.js', 'test_regex2.cjs', 'test_regex_update.cjs', 'test_extract.cjs',
        'test.mjs', 'test2.mjs', 'test3.mjs', 'test-audit-keys.mjs', 'test-csrf.mjs',
        'patch.cjs', 'patch.js', 'patch_index.php'
    ];
    for (const art of forbiddenArtifacts) {
        if (fs.existsSync(path.resolve(rootDir, art))) throw new Error("Forbidden artifact " + art);
    }
    const files = fs.readdirSync(rootDir);
    for (const file of files) {
        if (file.endsWith('.tmp') || file.endsWith('.fixed')) {
            throw new Error("Forbidden temporary artifact found: " + file);
        }
    }
});

console.log("---------------------------------------------------------");
console.log("Total Invariants: " + totalInvariants);
console.log("Passed: " + passedInvariants);
console.log("Failed: " + failedInvariants);
console.log("---------------------------------------------------------");

if (failedInvariants !== 0 || passedInvariants !== totalInvariants) {
    console.error("❌ Appointment Lifecycle Final Verifier FAILED.");
    process.exit(1);
} else {
    console.log("✅ Appointment Lifecycle Final Verifier PASSED.");
    process.exit(0);
}
