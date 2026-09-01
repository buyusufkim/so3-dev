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

function extractBraceBlock(text, startKeyword) {
    const startIndex = text.indexOf(startKeyword);
    if (startIndex === -1) return null;
    let braceStartIndex = text.indexOf('{', startIndex);
    if (braceStartIndex === -1) return null;
    let depth = 1;
    let i = braceStartIndex + 1;
    let insideString = false;
    let quoteChar = null;
    
    while (i < text.length && depth > 0) {
        const char = text[i];
        if (!insideString) {
            if (char === "'" || char === '"' || char === "`") {
                insideString = true;
                quoteChar = char;
            } else if (char === '{') {
                depth++;
            } else if (char === '}') {
                depth--;
            } else if (char === '/' && i + 1 < text.length) {
                if (text[i+1] === '/') {
                    // line comment, skip to newline
                    while(i < text.length && text[i] !== '\n') i++;
                    continue;
                } else if (text[i+1] === '*') {
                    // block comment, skip to */
                    while(i + 1 < text.length && !(text[i] === '*' && text[i+1] === '/')) i++;
                    i++; // skip /
                    continue;
                }
            }
        } else {
            if (char === '\\') {
                i++; // skip escaped
            } else if (char === quoteChar) {
                insideString = false;
            }
        }
        i++;
    }
    return { content: text.substring(startIndex, i), startIndex, endIndex: i };
}

console.log("Starting Membership Renewal Cross-Contract Verification...");

// Load sources
const receptionControllerFile = 'api/controllers/ReceptionMemberController.php';
const receptionControllerSource = fs.readFileSync(receptionControllerFile, 'utf8');
const memberControllerSource = fs.readFileSync('api/controllers/MemberController.php', 'utf8');
const indexPhpSource = fs.readFileSync('api/index.php', 'utf8');

// --- 1. Canonical Route & RBAC ---
const routeBlock = extractBraceBlock(indexPhpSource, "preg_match('#^/api/reception/members/([1-9]\\d*)/renew$#'");
assert(routeBlock !== null, "Invariant: Route POST /api/reception/members/{positive-id}/renew matches exactly");
if (routeBlock) {
    assert(routeBlock.content.includes("ReceptionMemberController())->renew"), "Invariant: Route targets ReceptionMemberController::renew exactly");
    assert(routeBlock.content.includes("AuthMiddleware::hasRole(['super_admin', 'admin', 'reception'])"), "Invariant: Route block explicitly protected by super_admin, admin, reception roles without trainer/editor");
    assert(routeBlock.content.includes("$method === 'POST'"), "Invariant: Exact POST method requirement in route block");
}

// --- 2. Extract renew method ---
const renewBlock = extractBraceBlock(receptionControllerSource, "public function renew($id)");
assert(renewBlock !== null, "Invariant: renew() method extracted successfully");

if (renewBlock) {
    const renewSrc = renewBlock.content;

    // --- 3. Exact Request Payload Guard ---
    assert(renewSrc.includes("count($decoded) !== 2") && renewSrc.includes("isset($decoded['new_start_date'])") && renewSrc.includes("isset($decoded['new_end_date'])"), "Invariant: Strict payload validation requires exact 2 fields: new_start_date, new_end_date");

    // --- 4. Date Validation Guard ---
    assert(renewSrc.includes("DateTime::createFromFormat('Y-m-d'") && renewSrc.includes("$endDateTime < $startDateTime"), "Invariant: Strict Y-m-d normalization and end < start rejection");

    // --- 5 & 6. Transaction + FOR UPDATE + Soft-delete & Status ---
    assert(renewSrc.includes("beginTransaction()"), "Invariant: renew method begins transaction");
    assert(renewSrc.includes("SELECT id, membership_start_date, membership_end_date, deleted_at FROM members WHERE id = :id FOR UPDATE"), "Invariant: Member row selected FOR UPDATE capturing correct fields");
    assert(renewSrc.includes("!empty($member['deleted_at'])") || renewSrc.includes("deleted_at IS NOT NULL"), "Invariant: Soft-deleted member rejected");
    assert(!renewSrc.includes("status = 'active'") && !renewSrc.includes("status === 'inactive'"), "Invariant: No active status eligibility requirement exists");

    // --- 7. Atomic Ordering Guard ---
    const idxTx = renewSrc.indexOf("beginTransaction");
    const idxSelect = renewSrc.indexOf("FOR UPDATE", idxTx);
    const idxPrevDates = Math.max(renewSrc.indexOf("$previousStartDate ="), renewSrc.indexOf("$previousEndDate ="));
    const idxUpdate = renewSrc.indexOf("UPDATE members", Math.max(idxSelect, idxPrevDates));
    const idxInsert = renewSrc.indexOf("INSERT INTO membership_renewals", idxUpdate);
    const idxPositiveId = renewSrc.indexOf("<= 0", idxInsert);
    const idxCommit = renewSrc.indexOf("commit()", idxPositiveId);
    const idxAudit = renewSrc.indexOf("AuditLogger::log", idxCommit);
    const idx201 = renewSrc.indexOf("201", idxAudit);
    assert(
        idxTx < idxSelect && idxSelect < idxPrevDates && idxPrevDates < idxUpdate && 
        idxUpdate < idxInsert && idxInsert < idxPositiveId && idxPositiveId < idxCommit && 
        idxCommit < idxAudit && idxAudit < idx201, 
        "Invariant: Atomic execution order is monotonously valid (Transaction -> Select -> Update -> Insert -> Commit -> Audit -> 201)"
    );

    // --- 8. Member UPDATE exact contract ---
    const updateRegex = /UPDATE\s+members\s+SET\s+(.*?)\s+WHERE/is;
    const updateMatch = renewSrc.match(updateRegex);
    assert(updateMatch !== null, "Invariant: UPDATE members statement found");
    if (updateMatch) {
        const setClause = updateMatch[1].toLowerCase();
        assert(setClause.includes("membership_start_date") && setClause.includes("membership_end_date") && setClause.includes("updated_by"), "Invariant: UPDATE sets exactly required fields");
        assert(!setClause.includes("status") && !setClause.includes("deleted_at") && !setClause.includes("trainer_id") && !setClause.includes("first_name"), "Invariant: UPDATE strictly prevents updating unauthorized fields like status or trainer");
    }

    // --- 9. History INSERT exact contract ---
    const insertRegex = /INSERT\s+INTO\s+membership_renewals\s*\(([^)]+)\)/is;
    const insertMatch = renewSrc.match(insertRegex);
    assert(insertMatch !== null, "Invariant: INSERT INTO membership_renewals statement found");
    if (insertMatch) {
        const insertCols = insertMatch[1].toLowerCase();
        assert(insertCols.includes("uuid") && insertCols.includes("previous_start_date") && insertCols.includes("new_end_date") && insertCols.includes("renewed_by"), "Invariant: INSERT includes required history columns");
        assert(!insertCols.includes("created_at") && !renewSrc.includes("NOW()"), "Invariant: History INSERT delegates created_at to DB default");
    }

    // --- 10. NULL previous-date binding ---
    assert(renewSrc.includes("$previousStartDate === null ? \\PDO::PARAM_NULL : \\PDO::PARAM_STR") && renewSrc.includes("$previousEndDate === null ? \\PDO::PARAM_NULL : \\PDO::PARAM_STR"), "Invariant: Explicit PDO::PARAM_NULL ternary bounds used for nullable previous dates");

    // --- 11. Positive renewal ID guard ---
    assert(renewSrc.includes("<= 0") && renewSrc.includes("lastInsertId()"), "Invariant: lastInsertId is checked for positive integer");

    // --- 12. Rollback safety guard ---
    assert(renewSrc.includes("rollBack()") && renewSrc.indexOf("rollBack()") < renewSrc.indexOf("INTERNAL_ERROR", Math.max(0, renewSrc.indexOf("<= 0"))), "Invariant: Rollback occurs securely before returning internal error on failure");

    // --- 13. Exact audit guard ---
    const auditRegex = /\\Core\\AuditLogger::log\(\s*'reception\.member\.renew',\s*\$adminId,\s*'membership_renewal',\s*\$renewalId,\s*\[\s*'member_id'\s*=>\s*\$id\s*\]\s*\)/is;
    const auditMatch = renewSrc.match(auditRegex);
    assert(auditMatch !== null, "Invariant: 5-arg exact AuditLogger call matches reception.member.renew semantics");

    // --- 14. No invented business logic ---
    assert(!renewSrc.includes("modify('+") && !renewSrc.includes("member_visits") && !renewSrc.includes("P1M"), "Invariant: No hidden date arithmetics (+1 month) or member_visits dependencies in renewal");

    // --- 15. Runtime UPDATE scan ---
    const controllersDir = 'api/controllers';
    let foundIllegalUpdates = false;
    fs.readdirSync(controllersDir).forEach(file => {
        if (!file.endsWith('.php')) return;
        const filePath = path.join(controllersDir, file);
        const code = fs.readFileSync(filePath, 'utf8');
        
        let match;
        const scanUpdateRegex = /UPDATE\s+members\s+SET\s+(.*?)\s+WHERE/isg;
        while ((match = scanUpdateRegex.exec(code)) !== null) {
            const setPart = match[1].toLowerCase();
            if (setPart.includes('membership_start_date') || setPart.includes('membership_end_date')) {
                if (file === 'ReceptionMemberController.php') {
                    if (match.index < renewBlock.startIndex || match.index > renewBlock.endIndex) {
                        foundIllegalUpdates = true;
                        console.error(`❌ FAIL: Illegal membership date UPDATE outside renew() in ${file}`);
                    }
                } else {
                    foundIllegalUpdates = true;
                    console.error(`❌ FAIL: Illegal membership date UPDATE in ${file}`);
                }
            }
        }
    });
    assert(!foundIllegalUpdates, "Invariant: Repository runtime scan found ZERO membership date UPDATE bypasses outside canonical ReceptionMemberController::renew");
}

// --- 16. MemberController boundary guard ---
const valBlock = extractBraceBlock(memberControllerSource, "private function validateMemberData");
assert(valBlock !== null, "Invariant: validateMemberData extracted");
if (valBlock) {
    assert(valBlock.content.includes("if ($isUpdate)") && valBlock.content.includes("array_key_exists('membership_start_date'") && valBlock.content.includes("VALIDATION_ERROR"), "Invariant: MemberController validation explicitly rejects date mutations on updates before allowing them");
}
const createBlock = extractBraceBlock(memberControllerSource, "public function create()");
assert(createBlock !== null, "Invariant: create() method extracted");
if (createBlock) {
    assert(createBlock.content.includes("$val['membership_start_date']") && createBlock.content.includes("INSERT INTO members"), "Invariant: Member CREATE explicitly supports initial membership dates");
}

// --- 17. Frontend base-payload protection ---
const frontendFile = 'src/admin/pages/members/AdminMemberEditor.tsx';
const frontendSrc = fs.readFileSync(frontendFile, 'utf8');
const payloadBlock = extractBraceBlock(frontendSrc, "const payload: any =");
assert(payloadBlock !== null, "Invariant: Frontend base payload block extracted");
if (payloadBlock) {
    assert(!payloadBlock.content.includes("membership_start_date") && !payloadBlock.content.includes("membership_end_date"), "Invariant: Base payload successfully stripped of membership dates");
}
assert(frontendSrc.includes("if (isNew)") && frontendSrc.includes("payload.membership_start_date =") && frontendSrc.includes("payload.membership_end_date ="), "Invariant: Frontend dynamically appends dates only on create path");
assert(frontendSrc.includes("disabled={!isNew}"), "Invariant: Existing member date inputs explicitly disabled to enforce immutable boundary");

if (exitCode === 0) {
    console.log("✅ All F.10F Reception Membership Renewal Hardened Guard constraints met.");
} else {
    console.error("❌ Verification failed.");
}
process.exit(exitCode);
