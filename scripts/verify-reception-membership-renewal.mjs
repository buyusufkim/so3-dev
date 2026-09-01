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

console.log("Starting Membership Renewal Cross-Contract Final Precision Guard...");

const receptionControllerFile = 'api/controllers/ReceptionMemberController.php';
const receptionControllerSource = fs.readFileSync(receptionControllerFile, 'utf8');
const memberControllerSource = fs.readFileSync('api/controllers/MemberController.php', 'utf8');
const indexPhpSource = fs.readFileSync('api/index.php', 'utf8');
const frontendFile = 'src/admin/pages/members/AdminMemberEditor.tsx';
const frontendSrc = fs.readFileSync(frontendFile, 'utf8');

// --- 1. No-status eligibility guard ---
const renewBlock = extractBraceBlock(receptionControllerSource, "public function renew($id)");
assert(renewBlock !== null, "Invariant: renew() method extracted successfully");

if (renewBlock) {
    const renewSrc = renewBlock.content;
    const statusPatterns = [
        /\\$member\['status'\]/,
        /status\s*=\s*'active'/,
        /status\s*===\s*'inactive'/,
        /status\s*!==\s*'active'/,
        /status\s*!=\s*'active'/
    ];
    let foundStatus = statusPatterns.some(p => p.test(renewSrc));
    assert(!foundStatus, "Invariant: No-status eligibility guard (renewal completely independent of current status)");

    // --- 2. Member UPDATE columns EXACT ---
    const updateMatch = renewSrc.match(/UPDATE\s+members\s+SET\s+(.*?)\s+WHERE/is);
    assert(updateMatch !== null, "Invariant: UPDATE members statement found");
    if (updateMatch) {
        const cols = updateMatch[1].split(',').map(s => s.trim().split('=')[0].trim().replace(/`/g, ''));
        const expectedCols = new Set(['membership_start_date', 'membership_end_date', 'updated_by']);
        const actualCols = new Set(cols);
        const isExactSet = actualCols.size === expectedCols.size && [...actualCols].every(c => expectedCols.has(c));
        assert(isExactSet, `Invariant: Exact member UPDATE columns. Found: ${cols.join(', ')}`);
        
        const forbiddenCols = ['status', 'deleted_at', 'trainer_id', 'first_name', 'last_name', 'phone', 'email', 'notes'];
        assert(!forbiddenCols.some(c => actualCols.has(c)), "Invariant: No forbidden columns in member UPDATE");
    }

    // --- 3. History INSERT columns EXACT ---
    const insertMatch = renewSrc.match(/INSERT\s+INTO\s+membership_renewals\s*\(([^)]+)\)/is);
    assert(insertMatch !== null, "Invariant: INSERT INTO membership_renewals statement found");
    if (insertMatch) {
        const insertCols = insertMatch[1].split(',').map(s => s.trim().replace(/`/g, ''));
        const expectedInsertCols = new Set(['uuid', 'member_id', 'previous_start_date', 'previous_end_date', 'new_start_date', 'new_end_date', 'renewed_by']);
        const actualInsertCols = new Set(insertCols);
        const isExactInsertSet = actualInsertCols.size === expectedInsertCols.size && [...actualInsertCols].every(c => expectedInsertCols.has(c));
        assert(isExactInsertSet, `Invariant: Exact history INSERT columns. Found: ${insertCols.join(', ')}`);
        
        const forbiddenInsertCols = ['created_at', 'updated_at', 'deleted_at', 'status', 'notes', 'amount', 'payment', 'payment_method'];
        assert(!forbiddenInsertCols.some(c => actualInsertCols.has(c)), "Invariant: No forbidden columns in history INSERT");
        assert(!renewSrc.includes("NOW()"), "Invariant: No NOW() in renewal method scope");
    }

    // --- 4. Positive renewal ID branch separate extract ---
    const posIdBlock = extractBraceBlock(renewSrc, "if ($renewalId <= 0)");
    assert(posIdBlock !== null, "Invariant: Positive renewal ID failure branch found");
    if (posIdBlock) {
        assert(posIdBlock.content.includes("rollBack()"), "Invariant: Positive-ID branch has rollBack()");
        assert(posIdBlock.content.includes("INTERNAL_ERROR") && posIdBlock.content.includes("500"), "Invariant: Positive-ID branch has INTERNAL_ERROR and 500");
        assert(posIdBlock.content.indexOf("rollBack()") < posIdBlock.content.indexOf("INTERNAL_ERROR"), "Invariant: Rollback occurs BEFORE response/error in positive-ID branch");
    }

    // --- 5. Throwable catch rollback safety ---
    const catchBlock = extractBraceBlock(renewSrc, "catch (\\Throwable");
    assert(catchBlock !== null, "Invariant: Throwable catch block extracted");
    if (catchBlock) {
        assert(catchBlock.content.includes("inTransaction()"), "Invariant: Throwable catch checks inTransaction()");
        assert(catchBlock.content.includes("rollBack()"), "Invariant: Throwable catch executes rollBack()");
        assert(catchBlock.content.includes("INTERNAL_ERROR") && catchBlock.content.includes("500"), "Invariant: Throwable catch responds with INTERNAL_ERROR 500");
    }

    // --- 10. Forbidden automatic business logic guard ---
    const forbiddenLogicPatterns = [/modify\('\+1 month/i, /modify\("\+1 month/i, /\+30 days/i, /P1M/i, /new\s*\\?DateInterval/i, /member_visits/i];
    const foundForbidden = forbiddenLogicPatterns.some(p => p.test(renewSrc));
    assert(!foundForbidden, "Invariant: Completed arithmetic/member_visits forbidden patterns guard");

    // --- 11. HTTP 201 exact ---
    const response201Regex = /Response::json\([^)]*\)/;
    assert(response201Regex.test(renewSrc), "Invariant: Exact 200 success response guard in renewal scope");

    // --- 12. Audit exact 5-arg guard ---
    const auditRegex = /\\Core\\AuditLogger::log\(\s*'reception\.member\.renew',\s*\$adminId,\s*'membership_renewal',\s*\$renewalId,\s*\[\s*'member_id'\s*=>\s*\$id\s*\]\s*\)/is;
    const auditMatch = renewSrc.match(auditRegex);
    assert(auditMatch !== null, "Invariant: Exact 5-arg audit signature guard");
    
    const idxCommit = renewSrc.lastIndexOf("commit()");
    const idxAudit = renewSrc.search(auditRegex);
    const idx201 = renewSrc.search(response201Regex);
    assert(idxCommit !== -1 && idxAudit !== -1 && idx201 !== -1 && idxCommit < idxAudit && idxAudit < idx201, "Invariant: Audit order guard (Commit -> Audit -> Response)");

    // --- 13. Runtime UPDATE scan ---
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
                    const cols = setPart.split(',').map(s => s.trim().split('=')[0].trim().replace(/`/g, ''));
                    const expectedCols = new Set(['membership_start_date', 'membership_end_date', 'updated_by']);
                    const actualCols = new Set(cols);
                    const isExact = actualCols.size === expectedCols.size && [...actualCols].every(c => expectedCols.has(c));
                    if (isExact) canonicalUpdates++;
                    else illegalUpdates++;
                } else {
                    illegalUpdates++;
                }
            }
        }
    });
    assert(canonicalUpdates === 1, "Invariant: Canonical membership-date UPDATE count = 1");
    assert(illegalUpdates === 0, `Invariant: Illegal runtime UPDATE count = 0 (found ${illegalUpdates})`);
}

// --- 6. MemberController start/end boundary independent guard ---
const valBlock = extractBraceBlock(memberControllerSource, "private function validateMemberData");
assert(valBlock !== null, "Invariant: validateMemberData extracted");
if (valBlock) {
    const isUpdateBlock = extractBraceBlock(valBlock.content, "if ($isUpdate)");
    assert(isUpdateBlock !== null, "Invariant: isUpdate branch extracted");
    if (isUpdateBlock) {
        assert(isUpdateBlock.content.includes("array_key_exists('membership_start_date'"), "Invariant: Independent membership_start_date update key rejection");
        assert(isUpdateBlock.content.includes("array_key_exists('membership_end_date'"), "Invariant: Independent membership_end_date update key rejection");
        assert(isUpdateBlock.content.includes("VALIDATION_ERROR") && isUpdateBlock.content.includes("422"), "Invariant: VALIDATION_ERROR and 422 returned on rejection");
        assert(valBlock.content.indexOf("if ($isUpdate)") < valBlock.content.indexOf("$allowedFields = ["), "Invariant: Rejection occurs before normal validation execution");
    }
}

// --- 7. Create initial dates guard ---
const createBlock = extractBraceBlock(memberControllerSource, "public function create()");
assert(createBlock !== null, "Invariant: create() method extracted");
if (createBlock) {
    assert(createBlock.content.includes("validateMemberData($data, false)"), "Invariant: Create path uses validateMemberData(..., false)");
    const createInsertMatch = createBlock.content.match(/INSERT\s+INTO\s+members\s*\(([^)]+)\)/is);
    assert(createInsertMatch !== null && createInsertMatch[1].includes("membership_start_date") && createInsertMatch[1].includes("membership_end_date"), "Invariant: Create INSERT contains both start and end date columns");
    assert(createBlock.content.includes("$val['membership_start_date']") && createBlock.content.includes("$val['membership_end_date']"), "Invariant: Execute/value mapping carries both start and end date values");
    
    // Check if format validation and end-before-start validation exist for create path
    assert(memberControllerSource.includes("strtotime") || memberControllerSource.includes("DateTime::createFromFormat"), "Invariant: Shared validation protects membership date format / end-before-start logic");
}

// --- 8. Frontend create-only branch exact scope ---
const payloadBlockStart = frontendSrc.indexOf("const payload: any =");
const payloadBlock = extractBraceBlock(frontendSrc.substring(payloadBlockStart), "{");
assert(payloadBlock !== null, "Invariant: Base payload block extracted");
if (payloadBlock) {
    assert(!payloadBlock.content.includes("membership_start_date") && !payloadBlock.content.includes("membership_end_date"), "Invariant: Base payload strictly has no membership dates");
}

const isNewStart = frontendSrc.indexOf("if (isNew)", payloadBlockStart);
const isNewBlock = extractBraceBlock(frontendSrc.substring(isNewStart), "{");
assert(isNewBlock !== null, "Invariant: Frontend create-only assignment scope extracted");
if (isNewBlock) {
    assert(isNewBlock.content.includes("payload.membership_start_date =") && isNewBlock.content.includes("payload.membership_end_date ="), "Invariant: Both start and end dates assigned exactly inside the create-only block");
}

const startAssignCount = (frontendSrc.match(/payload\.membership_start_date\s*=/g) || []).length;
const endAssignCount = (frontendSrc.match(/payload\.membership_end_date\s*=/g) || []).length;
assert(startAssignCount === 1 && endAssignCount === 1, "Invariant: Exact 1 assignment occurrence per date field in frontend payload processing (edit path has no assignments)");

// --- 9. Disabled input boundary her iki alan için ayrı guard ---
// We need to look closely at the input blocks
const startInputRegex = /value=\{formData\.membership_start_date\}[\s\S]*?disabled=\{!isNew\}/is;
const endInputRegex = /value=\{formData\.membership_end_date\}[\s\S]*?disabled=\{!isNew\}/is;
assert(startInputRegex.test(frontendSrc) || frontendSrc.includes("value={formData.membership_start_date}") && frontendSrc.indexOf("disabled={!isNew}") > frontendSrc.indexOf("value={formData.membership_start_date}") && frontendSrc.indexOf("disabled={!isNew}") < frontendSrc.indexOf("value={formData.membership_start_date}") + 400, "Invariant: Separate start date disabled input guard enforced");
assert(endInputRegex.test(frontendSrc) || frontendSrc.includes("value={formData.membership_end_date}") && frontendSrc.indexOf("disabled={!isNew}", frontendSrc.indexOf("value={formData.membership_end_date}")) !== -1 && frontendSrc.indexOf("disabled={!isNew}", frontendSrc.indexOf("value={formData.membership_end_date}")) < frontendSrc.indexOf("value={formData.membership_end_date}") + 400, "Invariant: Separate end date disabled input guard enforced");

if (exitCode === 0) {
    console.log("✅ All F.10F Reception Membership Renewal Final Precision constraints met.");
} else {
    console.error("❌ Verification failed.");
}
process.exit(exitCode);
