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
    const adminBlocks = [...indexSrc.matchAll(/'\/api\/admin\/appointments'|preg_match\('#\^\/api\/admin\/appointments/g)];
    for (const match of adminBlocks) {
        const block = extractBalanced(indexSrc, indexSrc.indexOf('{', match.index));
        if (!block.includes("AuthMiddleware::handle()")) throw new Error("Missing AuthMiddleware::handle()");
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
    
    if (!indexSrc.includes("getAdminAppointments") || !indexSrc.includes("createAdminAppointment") || !indexSrc.includes("rescheduleAdminAppointment") || !indexSrc.includes("cancelAdminAppointment") || !indexSrc.includes("completeAdminAppointment") || !indexSrc.includes("noShowAdminAppointment")) throw new Error("Admin missing exact methods");

    const recBlocks = [...indexSrc.matchAll(/'\/api\/reception\/appointments'|preg_match\('#\^\/api\/reception\/appointments/g)];
    for (const match of recBlocks) {
        const block = extractBalanced(indexSrc, indexSrc.indexOf('{', match.index));
        if (!block.includes("AuthMiddleware::handle()")) throw new Error("Missing AuthMiddleware::handle()");
        if (!block.includes("AuthMiddleware::hasRole(['super_admin', 'admin', 'reception'])")) {
            throw new Error("Reception route missing exact AuthMiddleware::hasRole(['super_admin', 'admin', 'reception'])");
        }
        if (block.includes("completeReceptionAppointment") || block.includes("noShowReceptionAppointment") || block.includes("delete")) {
            throw new Error("Reception forbidden methods");
        }
    }
    if (!indexSrc.includes("getReceptionAppointments") || !indexSrc.includes("createReceptionAppointment") || !indexSrc.includes("rescheduleReceptionAppointment") || !indexSrc.includes("cancelReceptionAppointment")) throw new Error("Reception missing exact methods");
    
    const trnBlocks = [...indexSrc.matchAll(/'\/api\/trainer\/appointments'|preg_match\('#\^\/api\/trainer\/appointments/g)];
    for (const match of trnBlocks) {
        const block = extractBalanced(indexSrc, indexSrc.indexOf('{', match.index));
        if (!block.includes("AuthMiddleware::handle()")) throw new Error("Missing AuthMiddleware::handle()");
        if (!block.includes("AuthMiddleware::hasRole(['trainer'])")) {
            throw new Error("Trainer route missing exact AuthMiddleware::hasRole(['trainer'])");
        }
        if (block.includes("cancelTrainerAppointment") || block.includes("delete")) {
            throw new Error("Trainer forbidden methods");
        }
    }
    if (!indexSrc.includes("getTrainerAppointments") || !indexSrc.includes("createTrainerAppointment") || !indexSrc.includes("rescheduleTrainerAppointment") || !indexSrc.includes("completeTrainerAppointment") || !indexSrc.includes("noShowTrainerAppointment")) throw new Error("Trainer missing exact methods");
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
    
    if (!handlers.reschedule.includes("['status'] !== 'scheduled'")) throw new Error("Reschedule missing locked status scheduled only semantic");
    if (!handlers.cancel.includes("['status'] !== 'scheduled'")) throw new Error("Cancel missing locked status scheduled only semantic");
    if (!handlers.terminalize.includes("['status'] !== 'scheduled'")) throw new Error("Terminalize missing locked status scheduled only semantic");
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
    const cancelF = handlers.cancel;
    if (cancelF.includes("membership_end_date")) throw new Error("membership_end_date forbidden in cancel");
    if (cancelF.includes("membership_start_date")) throw new Error("membership_start_date forbidden in cancel");
    if (cancelF.match(/\['status'\] !== 'active'/)) throw new Error("member active eligibility forbidden in cancel");
    if (cancelF.match(/\['deleted_at'\] !== null/)) throw new Error("member deleted_at eligibility forbidden in cancel");
    if (cancelF.match(/\['is_active'\] != 1/)) throw new Error("trainer is_active eligibility forbidden in cancel");
    if (cancelF.match(/trainer\['deleted_at'\] !== null/)) throw new Error("trainer deleted_at eligibility forbidden in cancel");

    const termF = handlers.terminalize;
    if (termF.includes("membership_end_date")) throw new Error("membership_end_date forbidden in terminalize");
    if (termF.includes("membership_start_date")) throw new Error("membership_start_date forbidden in terminalize");
    if (termF.match(/\['status'\] !== 'active'/)) throw new Error("member active eligibility forbidden in terminalize");
    if (termF.match(/\['deleted_at'\] !== null/)) throw new Error("member deleted_at eligibility forbidden in terminalize");
    if (termF.match(/\['is_active'\] != 1/)) throw new Error("trainer is_active eligibility forbidden in terminalize");
    if (termF.match(/trainer\['deleted_at'\] !== null/)) throw new Error("trainer deleted_at eligibility forbidden in terminalize");
    if (termF.includes("getTrainerProfileId")) throw new Error("getTrainerProfileId forbidden in terminalize");
    if (!termF.includes("(int)$trainer['admin_id'] !== $adminId")) throw new Error("Trainer ownership exact semantic required in terminalize");

    const createF = handlers.create;
    if (!createF.match(/\['deleted_at'\] !== null/)) throw new Error("member deleted_at eligibility required in create");
    if (!createF.match(/\['status'\] !== 'active'/)) throw new Error("member active eligibility required in create");
    if (!createF.includes("membership_end_date")) throw new Error("membership_end_date required in create");
    if (!createF.match(/trainer\['deleted_at'\] !== null/)) throw new Error("trainer deleted_at eligibility required in create");
    if (!createF.match(/\['is_active'\] != 1/)) throw new Error("trainer is_active eligibility required in create");
    if (createF.includes("membership_start_date")) throw new Error("membership_start_date forbidden in create");

    const reschedF = handlers.reschedule;
    if (!reschedF.match(/\['deleted_at'\] !== null/)) throw new Error("member deleted_at eligibility required in reschedule");
    if (!reschedF.match(/\['status'\] !== 'active'/)) throw new Error("member active eligibility required in reschedule");
    if (!reschedF.includes("membership_end_date")) throw new Error("membership_end_date required in reschedule");
    if (!reschedF.match(/trainer\['deleted_at'\] !== null/)) throw new Error("trainer deleted_at eligibility required in reschedule");
    if (!reschedF.match(/\['is_active'\] != 1/)) throw new Error("trainer is_active eligibility required in reschedule");
    if (reschedF.includes("membership_start_date")) throw new Error("membership_start_date forbidden in reschedule");
}
function verifyTrainerScope(controllerSrc) {
    if (!controllerSrc.includes("public function getTrainerAppointments")) throw new Error("Missing getTrainerAppointments");
    if (!controllerSrc.includes("public function createTrainerAppointment")) throw new Error("Missing createTrainerAppointment");
    if (!controllerSrc.includes("public function rescheduleTrainerAppointment")) throw new Error("Missing rescheduleTrainerAppointment");
    
    const getTrn = extractBalanced(controllerSrc, controllerSrc.indexOf('{', controllerSrc.indexOf("public function getTrainerAppointments")));
    if (!getTrn.includes("getTrainerProfileId") || !getTrn.match(/handleRead\(\[.+?\],\s*\$trainerId\)/)) throw new Error("getTrainerAppointments missing getTrainerProfileId or handleRead");
    
    const createTrn = extractBalanced(controllerSrc, controllerSrc.indexOf('{', controllerSrc.indexOf("public function createTrainerAppointment")));
    if (!createTrn.includes("getTrainerProfileId") || !createTrn.match(/handleCreate\(.+?,\s*\$trainerId\)/)) throw new Error("createTrainerAppointment missing getTrainerProfileId or handleCreate");
    
    const handleCreate = extractBalanced(controllerSrc, controllerSrc.indexOf('{', controllerSrc.indexOf("private function handleCreate")));
    if (!handleCreate.includes("(int)$member['trainer_id'] !== $forcedTrainerId")) throw new Error("handleCreate missing exact assigned-member guard");
    
    const completeTrn = extractBalanced(controllerSrc, controllerSrc.indexOf('{', controllerSrc.indexOf("public function completeTrainerAppointment")));
    if (!completeTrn.includes("handleTerminalize($id, 'trainer', 'completed')")) throw new Error("completeTrainerAppointment missing exact handleTerminalize call");
    
    const noShowTrn = extractBalanced(controllerSrc, controllerSrc.indexOf('{', controllerSrc.indexOf("public function noShowTrainerAppointment")));
    if (!noShowTrn.includes("handleTerminalize($id, 'trainer', 'no_show')")) throw new Error("noShowTrainerAppointment missing exact handleTerminalize call");
    
    if (controllerSrc.includes("public function cancelTrainerAppointment")) throw new Error("cancelTrainerAppointment forbidden");
}
function verifyReceptionScope(controllerSrc) {
    if (!controllerSrc.includes("public function getReceptionAppointments")) throw new Error("Missing getReceptionAppointments");
    if (!controllerSrc.includes("public function createReceptionAppointment")) throw new Error("Missing createReceptionAppointment");
    if (!controllerSrc.includes("public function rescheduleReceptionAppointment")) throw new Error("Missing rescheduleReceptionAppointment");
    if (!controllerSrc.includes("public function cancelReceptionAppointment")) throw new Error("Missing cancelReceptionAppointment");
    
    if (controllerSrc.includes("public function completeReceptionAppointment")) throw new Error("completeReceptionAppointment forbidden");
    if (controllerSrc.includes("public function noShowReceptionAppointment")) throw new Error("noShowReceptionAppointment forbidden");
    if (controllerSrc.includes("public function deleteReceptionAppointment")) throw new Error("deleteReceptionAppointment forbidden");
}
function verifyConflictPool(handlers) {
    const cHandler = handlers.create;
    const rHandler = handlers.reschedule;
    
    for (const h of [cHandler, rHandler]) {
        const trainerMatch = h.match(/trainer_id\s*=\s*\?[^;]+status\s*=\s*'scheduled'[^;]+starts_at\s*<\s*\?[^;]+ends_at\s*>\s*\?[^;]+FOR UPDATE/i);
        const memberMatch = h.match(/member_id\s*=\s*\?[^;]+status\s*=\s*'scheduled'[^;]+starts_at\s*<\s*\?[^;]+ends_at\s*>\s*\?[^;]+FOR UPDATE/i);
        
        if (!trainerMatch) throw new Error("Missing exact trainer conflict query with FOR UPDATE");
        if (!memberMatch) throw new Error("Missing exact member conflict query with FOR UPDATE");
    }
    
    if (handlers.cancel.includes("ends_at > ?")) throw new Error("Cancel has overlap query");
    if (handlers.terminalize.includes("ends_at > ?")) throw new Error("Terminalize has overlap query");
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
        const h = handlers[f];
        if (!h.includes("/^[1-9]\\d*$/")) throw new Error(f + " missing numeric string check");
        if (!h.includes("(int)") || !h.includes("401")) throw new Error(f + " missing positive PHP int / 401 semantic");
        if (!h.match(/AuditLogger::log\([^,]+,\s*\$adminId,\s*['"]appointment['"],\s*\$(appointmentId|id)/)) {
            throw new Error(f + " audit actor orientation exact mapping failed");
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
    if (indexSrc.match(/preg_match\('#\^\/api\/[a-z_]+\/appointments[^']*'[^}]+method === 'DELETE'/)) {
        throw new Error("Realistic delete route block detected in index.php");
    }
    if (controllerSrc.match(/function deleteAppointment/i) || controllerSrc.match(/function destroyAppointment/i)) {
        throw new Error("Delete/destroy appointment controller method detected");
    }
    if (controllerSrc.match(/DELETE FROM appointments/i)) throw new Error("DELETE FROM appointments detected");
    if (controllerSrc.match(/appointments\.deleted_at/i)) throw new Error("appointments.deleted_at detected");
    if (controllerSrc.match(/INSERT INTO member_visits/i) || controllerSrc.match(/visit_id/i)) {
        throw new Error("Appointment to visit coupling detected");
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


checkInvariant("Negative: cancel + is_active only", () => {
    const h = getHandlers(origControllerSrc);
    h.cancel += " ['status'] !== 'active' ";
    assertThrows(() => verifyEligibilityAsymmetry(h));
});
checkInvariant("Negative: cancel + deleted_at only", () => {
    const h = getHandlers(origControllerSrc);
    h.cancel += " ['deleted_at'] !== null ";
    assertThrows(() => verifyEligibilityAsymmetry(h));
});
checkInvariant("Negative: terminalize + is_active only", () => {
    const h = getHandlers(origControllerSrc);
    h.terminalize += " ['status'] !== 'active' ";
    assertThrows(() => verifyEligibilityAsymmetry(h));
});
checkInvariant("Negative: terminalize + deleted_at only", () => {
    const h = getHandlers(origControllerSrc);
    h.terminalize += " ['deleted_at'] !== null ";
    assertThrows(() => verifyEligibilityAsymmetry(h));
});
checkInvariant("Negative: terminalize + getTrainerProfileId", () => {
    const h = getHandlers(origControllerSrc);
    h.terminalize += " getTrainerProfileId ";
    assertThrows(() => verifyEligibilityAsymmetry(h));
});
checkInvariant("Negative: reschedule member active gate removed", () => {
    const h = getHandlers(origControllerSrc);
    h.reschedule = h.reschedule.replace(/\['status'\] !== 'active'/g, "");
    assertThrows(() => verifyEligibilityAsymmetry(h));
});
checkInvariant("Negative: reschedule trainer active gate removed", () => {
    const h = getHandlers(origControllerSrc);
    h.reschedule = h.reschedule.replace(/\['is_active'\] != 1/g, "");
    assertThrows(() => verifyEligibilityAsymmetry(h));
});
checkInvariant("Negative: AuthMiddleware::handle removed", () => {
    assertThrows(() => verifyNamespaceCapabilityMatrix(origIndexSrc.replace(/AuthMiddleware::handle\(\);/g, "")));
});
checkInvariant("Negative: GET controller swapped with create", () => {
    assertThrows(() => verifyNamespaceCapabilityMatrix(origIndexSrc.replace(/getAdminAppointments/g, "createAdminAppointment")));
});
checkInvariant("Negative: trainer complete controller swapped", () => {
    assertThrows(() => verifyNamespaceCapabilityMatrix(origIndexSrc.replace(/completeTrainerAppointment/g, "noShowTrainerAppointment")));
});
checkInvariant("Negative: reception role set altered", () => {
    assertThrows(() => verifyNamespaceCapabilityMatrix(origIndexSrc.replace(/hasRole\(\['super_admin', 'admin', 'reception'\]\)/g, "hasRole(['admin', 'reception'])")));
});
checkInvariant("Negative: trainer read forcedTrainerId removed", () => {
    assertThrows(() => verifyTrainerScope(origControllerSrc.replace(/handleRead\(\[.+?\],\s*\$trainerId\)/g, "handleRead(['from'], null)")));
});
checkInvariant("Negative: trainer create forced trainer removed", () => {
    assertThrows(() => verifyTrainerScope(origControllerSrc.replace(/handleCreate\(.+?,\s*\$trainerId\)/g, "handleCreate($data, null)")));
});
checkInvariant("Negative: assigned-member guard removed", () => {
    assertThrows(() => verifyTrainerScope(origControllerSrc.replace(/\(int\)\$member\['trainer_id'\] !== \$forcedTrainerId/g, "1 === 2")));
});
checkInvariant("Negative: terminalization trainer scope changed to admin", () => {
    assertThrows(() => verifyTrainerScope(origControllerSrc.replace(/handleTerminalize\(\$id, 'trainer'/g, "handleTerminalize($id, 'admin'")));
});
checkInvariant("Negative: trainer conflict removed but unrelated trainer_id remains", () => {
    const h = getHandlers(origControllerSrc);
    h.reschedule = h.reschedule.replace(/trainer_id = \?/g, "1 = 1");
    h.reschedule += " trainer_id = ? "; // inject dummy unrelated
    assertThrows(() => verifyConflictPool(h));
});
checkInvariant("Negative: member conflict removed but unrelated member_id remains", () => {
    const h = getHandlers(origControllerSrc);
    h.reschedule = h.reschedule.replace(/member_id = \?/g, "1 = 1");
    h.reschedule += " member_id = ? "; // inject dummy unrelated
    assertThrows(() => verifyConflictPool(h));
});
checkInvariant("Negative: scheduled removed from one query", () => {
    const h = getHandlers(origControllerSrc);
    h.reschedule = h.reschedule.replace(/status = 'scheduled'/g, "status = 'something_else'");
    assertThrows(() => verifyConflictPool(h));
});
checkInvariant("Negative: <= or >= overlap mutation", () => {
    const h = getHandlers(origControllerSrc);
    h.reschedule = h.reschedule.replace(/starts_at </g, "starts_at <=");
    assertThrows(() => verifyConflictPool(h));
});
checkInvariant("Negative: REALISTIC DELETE ROUTE INJECTION", () => {
    assertThrows(() => verifyNoDeleteDomain(origControllerSrc, origIndexSrc + "\nif (preg_match('#^/api/admin/appointments/([1-9]\\d*)$#', $requestUri, $matches)) { AuthMiddleware::handle(); AuthMiddleware::hasRole(['super_admin', 'admin']); if ($method === 'DELETE') { /* mock */ } }"));
});
checkInvariant("Negative: CANCEL IS_ACTIVE-ONLY INJECTION", () => {
    const h = getHandlers(origControllerSrc);
    h.cancel += " ['status'] !== 'active' ";
    assertThrows(() => verifyEligibilityAsymmetry(h));
});
checkInvariant("Negative: TERMINALIZE DELETED_AT-ONLY INJECTION", () => {
    const h = getHandlers(origControllerSrc);
    h.terminalize += " ['deleted_at'] !== null ";
    assertThrows(() => verifyEligibilityAsymmetry(h));
});
checkInvariant("Negative: ROUTE CONTROLLER SWAP", () => {
    assertThrows(() => verifyNamespaceCapabilityMatrix(origIndexSrc.replace(/getAdminAppointments/g, "rescheduleAdminAppointment")));
});
checkInvariant("Negative: TRAINER OWN-READ SCOPE REMOVAL", () => {
    assertThrows(() => verifyTrainerScope(origControllerSrc.replace(/handleRead\(\[.+?\],\s*\$trainerId\)/g, "handleRead(['from'], null)")));
});

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
