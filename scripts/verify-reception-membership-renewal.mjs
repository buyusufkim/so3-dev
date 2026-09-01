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
                    while(i < text.length && text[i] !== '\n') i++;
                    continue;
                } else if (text[i+1] === '*') {
                    while(i + 1 < text.length && !(text[i] === '*' && text[i+1] === '/')) i++;
                    i++;
                    continue;
                }
            }
        } else {
            if (char === '\\') {
                i++;
            } else if (char === quoteChar) {
                insideString = false;
            }
        }
        i++;
    }
    return { content: text.substring(startIndex, i), startIndex, endIndex: i };
}

console.log("--- Running Verifier Self-Tests ---");

// A. HTTP 201 regex self-test
const http201Regex = /Response::json\s*\([\s\S]*?,\s*201\s*\)/;
assert(http201Regex.test("Response::json(['status' => 'ok'], 201);"), "Self-Test A1: HTTP 201 regex passes correct synthetic input");
assert(!http201Regex.test("Response::json(['status' => 'ok'], 200);"), "Self-Test A2: HTTP 201 regex rejects 200 synthetic input");
assert(!http201Regex.test("Response::json(['status' => 'ok']);"), "Self-Test A3: HTTP 201 regex rejects no-status synthetic input");

// B. No-Status Predicate self-test
const statusPatterns = [
    /\$member\['status'\]/,
    /status\s*=\s*'active'/,
    /status\s*===\s*'inactive'/,
    /status\s*!==\s*'active'/,
    /status\s*!=\s*'active'/
];
const hasStatus = (text) => statusPatterns.some(p => p.test(text));
assert(hasStatus("if ($member['status'] !== 'active') { }"), "Self-Test B1: No-Status predicate catches $member['status'] usage");
assert(!hasStatus("if ($member['deleted_at']) { }"), "Self-Test B2: No-Status predicate allows deleted_at usage");

// C. Exact UPDATE Set self-test
function checkUpdateSet(colsStr) {
    const cols = colsStr.split(',').map(s => s.trim().split('=')[0].trim().replace(/`/g, ''));
    const expectedCols = new Set(['membership_start_date', 'membership_end_date', 'updated_by']);
    const actualCols = new Set(cols);
    return actualCols.size === expectedCols.size && [...actualCols].every(c => expectedCols.has(c));
}
assert(checkUpdateSet("membership_start_date = :sd, membership_end_date = :ed, updated_by = :ub"), "Self-Test C1: Exact UPDATE set accepts canonical columns");
assert(!checkUpdateSet("membership_start_date = :sd, membership_end_date = :ed, updated_by = :ub, status = 'active'"), "Self-Test C2: Exact UPDATE set rejects extra status column");
console.log("-----------------------------------");

console.log("Starting Membership Renewal Cross-Contract Final Precision Guard...");

const indexPhpSource = fs.readFileSync('api/index.php', 'utf8');
const routeMatch = indexPhpSource.match(/preg_match\('#\^\/api\/reception\/members\/\(\[1-9\]\\d\*\)\/renew\$#'/);
assert(routeMatch !== null, "Invariant: Exact renewal route positive integer regex found");
const routeBlock = extractBraceBlock(indexPhpSource, "preg_match('#^/api/reception/members/([1-9]\\d*)/renew$#'");
if (routeBlock) {
    assert(routeBlock.content.includes("AuthMiddleware::hasRole(['super_admin', 'admin', 'reception'])"), "Invariant: Exact RBAC on renewal route");
    assert(routeBlock.content.includes("$method === 'POST'"), "Invariant: Method exact POST on renewal route");
    assert(routeBlock.content.includes("ReceptionMemberController())->renew("), "Invariant: Target exact ReceptionMemberController()->renew");
    assert(!routeBlock.content.includes("'trainer'") && !routeBlock.content.includes("'editor'"), "Invariant: Trainer/editor excluded from renewal route RBAC");
}

const receptionControllerFile = 'api/controllers/ReceptionMemberController.php';
const receptionControllerSource = fs.readFileSync(receptionControllerFile, 'utf8');

const renewBlock = extractBraceBlock(receptionControllerSource, "public function renew($id)");
assert(renewBlock !== null, "Invariant: renew() method extracted successfully");

if (renewBlock) {
    const renewSrc = renewBlock.content;

    // 3. Exact request contract
    assert(renewSrc.includes("INVALID_JSON") && renewSrc.includes("400"), "Invariant: Invalid JSON rejection with 400");
    assert(renewSrc.includes("count($decoded) !== 2") || renewSrc.includes("count($decoded) === 2") || renewSrc.includes("count($decoded) != 2"), "Invariant: Exact 2 fields payload count check");
    assert(renewSrc.includes("new_start_date") && renewSrc.includes("new_end_date"), "Invariant: new_start_date and new_end_date explicitly checked");

    // 4. Strict date contract
    assert(renewSrc.includes("DateTime::createFromFormat('Y-m-d'"), "Invariant: Y-m-d strict parsing used in renewal");
    assert(renewSrc.includes("$endDateTime < $startDateTime") || renewSrc.includes("strtotime($newEndDate) < strtotime($newStartDate)"), "Invariant: End < Start check allows same-day");
    assert(!renewSrc.includes("$endDateTime <= $startDateTime") && !renewSrc.includes("strtotime($newEndDate) <= strtotime($newStartDate)"), "Invariant: <= is NOT used for date comparison (same-day allowed)");

    // 5. Transaction + Lock + Order
    const tx = renewSrc.indexOf("beginTransaction()");
    const sel = renewSrc.indexOf("SELECT id, membership_start_date, membership_end_date, deleted_at FROM members");
    const lock = renewSrc.indexOf("FOR UPDATE", sel);
    const prevCap = Math.max(renewSrc.indexOf("$previousStartDate ="), renewSrc.indexOf("$previousEndDate ="));
    const upd = renewSrc.indexOf("UPDATE members", prevCap);
    const ins = renewSrc.indexOf("INSERT INTO membership_renewals", upd);
    const posId = renewSrc.indexOf("<= 0", ins);
    const cmt = renewSrc.indexOf("commit()", posId);
    const aud = renewSrc.indexOf("AuditLogger::log", cmt);
    const res = renewSrc.search(http201Regex);

    assert(tx > -1 && sel > tx && lock > sel && prevCap > lock && upd > prevCap && ins > upd && posId > ins && cmt > posId && aud > cmt && res > aud, "Invariant: Monotonic transactional order including precise SELECT fields, lock, audit, and 201 response");

    // 6. Actual soft-delete guard
    assert(renewSrc.includes("!empty($member['deleted_at'])") || renewSrc.includes("!$member"), "Invariant: Actual soft-delete guard (!empty or !$member)");

    // 7. No-status guard
    assert(!hasStatus(renewSrc), "Invariant: No-status eligibility guard (no active/inactive checks)");

    // 8. NULL binding
    assert(renewSrc.includes("$previousStartDate === null ? \\PDO::PARAM_NULL : \\PDO::PARAM_STR"), "Invariant: Exact NULL previousStartDate binding");
    assert(renewSrc.includes("$previousEndDate === null ? \\PDO::PARAM_NULL : \\PDO::PARAM_STR"), "Invariant: Exact NULL previousEndDate binding");

    // 9 & 13. Exact DB-default & exact history INSERT
    const insMatch = renewSrc.match(/INSERT\s+INTO\s+membership_renewals\s*\(([^)]+)\)/is);
    if (insMatch) {
        const insCols = insMatch[1].split(',').map(s => s.trim().replace(/`/g, ''));
        const expInsCols = new Set(['uuid', 'member_id', 'previous_start_date', 'previous_end_date', 'new_start_date', 'new_end_date', 'renewed_by']);
        const isExactIns = insCols.length === expInsCols.size && insCols.every(c => expInsCols.has(c));
        assert(isExactIns, "Invariant: Exact history INSERT columns set");
        assert(!insCols.includes("created_at") && !insCols.includes("updated_at") && !insCols.includes("deleted_at") && !insCols.includes("status"), "Invariant: No forbidden columns in history INSERT");
        assert(!renewSrc.includes("NOW()"), "Invariant: Exact DB-default for created_at (no NOW())");
    } else {
        assert(false, "Invariant: Exact history INSERT columns set");
    }

    // 10. Exact HTTP 201
    assert(http201Regex.test(renewSrc), "Invariant: Exact HTTP 201 success response");

    // 11. Exact 5-arg audit
    const auditRegex = /\\Core\\AuditLogger::log\(\s*'reception\.member\.renew',\s*\$adminId,\s*'membership_renewal',\s*\$renewalId,\s*\[\s*'member_id'\s*=>\s*\$id\s*\]\s*\)/is;
    assert(auditRegex.test(renewSrc), "Invariant: Exact 5-arg renewal audit");

    // 12. Exact member UPDATE set
    const updMatch = renewSrc.match(/UPDATE\s+members\s+SET\s+(.*?)\s+WHERE/is);
    if (updMatch) {
        assert(checkUpdateSet(updMatch[1]), "Invariant: Exact member UPDATE columns set");
    } else {
        assert(false, "Invariant: Exact member UPDATE columns set");
    }

    // Positive renewal ID and Throwable
    const posIdBlock = extractBraceBlock(renewSrc, "if ($renewalId <= 0)");
    if (posIdBlock) {
        assert(posIdBlock.content.includes("rollBack()") && posIdBlock.content.includes("INTERNAL_ERROR") && posIdBlock.content.includes("500"), "Invariant: Positive-ID branch-scoped rollback");
        assert(posIdBlock.content.indexOf("rollBack()") < posIdBlock.content.indexOf("INTERNAL_ERROR"), "Invariant: Positive-ID rollback BEFORE response");
    }

    const catchBlock = extractBraceBlock(renewSrc, "catch (\\Throwable");
    if (catchBlock) {
        assert(catchBlock.content.includes("inTransaction()") && catchBlock.content.includes("rollBack()") && catchBlock.content.includes("INTERNAL_ERROR") && catchBlock.content.includes("500"), "Invariant: Throwable catch-scoped rollback");
    }

    // 17. Forbidden hidden business logic
    const forbiddenLogicPatterns = [/modify\('\+1 month/i, /modify\("\+1 month/i, /\+30 days/i, /P1M/i, /new\s*\\?DateInterval/i, /member_visits/i];
    const foundForbidden = forbiddenLogicPatterns.some(p => p.test(renewSrc));
    assert(!foundForbidden, "Invariant: No arithmetic/member_visits forbidden patterns");

    // 14. Runtime UPDATE scan
    const controllersDir = 'api/controllers';
    let canonicalUpdates = 0;
    let illegalUpdates = 0;
    fs.readdirSync(controllersDir).forEach(file => {
        if (!file.endsWith('.php')) return;
        const code = fs.readFileSync(path.join(controllersDir, file), 'utf8');
        let match;
        const scanUpdateRegex = /UPDATE\s+members\s+SET\s+(.*?)\s+WHERE/isg;
        while ((match = scanUpdateRegex.exec(code)) !== null) {
            const setPart = match[1].toLowerCase();
            if (setPart.includes('membership_start_date') || setPart.includes('membership_end_date')) {
                if (file === 'ReceptionMemberController.php' && match.index >= renewBlock.startIndex && match.index <= renewBlock.endIndex) {
                    if (checkUpdateSet(setPart)) {
                        canonicalUpdates++;
                    } else {
                        illegalUpdates++;
                    }
                } else {
                    illegalUpdates++;
                }
            }
        }
    });
    assert(canonicalUpdates === 1, "Invariant: Canonical membership-date UPDATE count = 1");
    assert(illegalUpdates === 0, `Invariant: Illegal runtime UPDATE count = 0 (found ${illegalUpdates})`);
}

// 15. Create validation scoped
const memberControllerSource = fs.readFileSync('api/controllers/MemberController.php', 'utf8');
const valBlock = extractBraceBlock(memberControllerSource, "private function validateMemberData");
if (valBlock) {
    const isUpdateBlock = extractBraceBlock(valBlock.content, "if ($isUpdate)");
    if (isUpdateBlock) {
        assert(isUpdateBlock.content.includes("array_key_exists('membership_start_date'"), "Invariant: Independent membership_start_date update key rejection");
        assert(isUpdateBlock.content.includes("array_key_exists('membership_end_date'"), "Invariant: Independent membership_end_date update key rejection");
        assert(isUpdateBlock.content.includes("VALIDATION_ERROR") && isUpdateBlock.content.includes("422"), "Invariant: VALIDATION_ERROR and 422 returned on rejection");
        assert(valBlock.content.indexOf("if ($isUpdate)") < valBlock.content.indexOf("$allowedFields = ["), "Invariant: Rejection occurs before normal validation execution");
    }

    assert(memberControllerSource.includes("private function validateDate") && memberControllerSource.includes("DateTime::createFromFormat('Y-m-d'"), "Invariant: Strict date format validation in MemberController shared validator");
    assert(valBlock.content.includes("$endDateTime < $startDateTime") || valBlock.content.includes("strtotime"), "Invariant: End < Start logic inside MemberController::validateMemberData");
}

const createBlock = extractBraceBlock(memberControllerSource, "public function create()");
if (createBlock) {
    assert(createBlock.content.includes("validateMemberData($data, false)"), "Invariant: Create path correctly uses validateMemberData(..., false)");
    assert(createBlock.content.includes("membership_start_date") && createBlock.content.includes("membership_end_date"), "Invariant: Create INSERT carries both dates");
}

// Frontend validation
const frontendFile = 'src/admin/pages/members/AdminMemberEditor.tsx';
const frontendSrc = fs.readFileSync(frontendFile, 'utf8');

const payloadBlockStart = frontendSrc.indexOf("const payload: any =");
const payloadBlock = extractBraceBlock(frontendSrc.substring(payloadBlockStart), "{");
if (payloadBlock) {
    assert(!payloadBlock.content.includes("membership_start_date") && !payloadBlock.content.includes("membership_end_date"), "Invariant: Base payload strictly has no membership dates");
}

const isNewStart = frontendSrc.indexOf("if (isNew)", payloadBlockStart);
const isNewBlock = extractBraceBlock(frontendSrc.substring(isNewStart), "{");
if (isNewBlock) {
    assert(isNewBlock.content.includes("payload.membership_start_date =") && isNewBlock.content.includes("payload.membership_end_date ="), "Invariant: Both dates assigned exactly inside the create-only block");
}
const startAssignCount = (frontendSrc.match(/payload\.membership_start_date\s*=/g) || []).length;
const endAssignCount = (frontendSrc.match(/payload\.membership_end_date\s*=/g) || []).length;
assert(startAssignCount === 1 && endAssignCount === 1, "Invariant: Exact 1 assignment occurrence per date field in frontend payload processing");

// 16. Frontend disabled input narrower scope
function findInputDisabled(htmlSrc, name) {
    const valueStr = `value={formData.${name}}`;
    const nameIndex = htmlSrc.indexOf(valueStr);
    if (nameIndex === -1) return false;
    const inputStart = htmlSrc.lastIndexOf("<input", nameIndex);
    const inputEnd = htmlSrc.indexOf("/>", nameIndex);
    if (inputStart === -1 || inputEnd === -1) return false;
    const inputStr = htmlSrc.substring(inputStart, inputEnd);
    return inputStr.includes("disabled={!isNew}");
}

assert(findInputDisabled(frontendSrc, "membership_start_date"), "Invariant: Separate start date disabled input guard enforced within its input element");
assert(findInputDisabled(frontendSrc, "membership_end_date"), "Invariant: Separate end date disabled input guard enforced within its input element");

if (exitCode === 0) {
    console.log("✅ All F.10F Reception Membership Renewal Final Precision constraints met.");
} else {
    console.error("❌ Verification failed.");
}
process.exit(exitCode);
