import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalInvariants = 0;
let passedInvariants = 0;
let failedInvariants = 0;

function checkInvariant(name, testFn) {
    totalInvariants++;
    try {
        testFn();
        console.log(`✅ PASS: ${name}`);
        passedInvariants++;
    } catch (err) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Reason: ${err.message}`);
        failedInvariants++;
    }
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
        if (c === '"' || c === "'" || c === '`') {
            inString = true;
            stringChar = c;
            continue;
        }
        
        if (c === openChar) braceCount++;
        if (c === closeChar) {
            braceCount--;
            if (braceCount === 0) return source.substring(blockStart, i + 1);
        }
    }
    return null;
}

const auditControllerSource = fs.readFileSync(path.resolve(rootDir, 'api/controllers/AuditLogController.php'), 'utf8');

checkInvariant("backend endpoint strict super_admin-only", () => {
    const fnIdx = auditControllerSource.indexOf('public function index()');
    if (fnIdx === -1) throw new Error("index function not found");
    const fnBody = extractBalanced(auditControllerSource, fnIdx);
    
    if (!/hasRole\(\['super_admin'\]\)/.test(fnBody)) {
        throw new Error("Missing strict super_admin role guard");
    }
});

checkInvariant("editor/admin/trainer/reception erişimi yok", () => {
    const fnIdx = auditControllerSource.indexOf('public function index()');
    const fnBody = extractBalanced(auditControllerSource, fnIdx);
    const rolesStr = fnBody.match(/hasRole\((.*?)\)/)[1];
    if (rolesStr.includes("'admin'") || rolesStr.includes("'editor'") || rolesStr.includes("'trainer'") || rolesStr.includes("'reception'")) {
        throw new Error("Role guard contains other roles than super_admin");
    }
});

checkInvariant("bounded pagination mevcut", () => {
    const fnIdx = auditControllerSource.indexOf('public function index()');
    const fnBody = extractBalanced(auditControllerSource, fnIdx);
    if (!/OFFSET \?/.test(fnBody) || !/LIMIT \?/.test(fnBody)) {
        throw new Error("Missing LIMIT/OFFSET binding");
    }
    if (!/per_?Page\s*>\s*100/.test(fnBody) && !/limit\s*>\s*100/.test(fnBody)) {
        throw new Error("No hard cap on max per_page detected (e.g. max 100)");
    }
});

checkInvariant("newest-first deterministic ordering mevcut", () => {
    const fnIdx = auditControllerSource.indexOf('public function index()');
    const fnBody = extractBalanced(auditControllerSource, fnIdx);
    if (!/ORDER BY a\.created_at DESC, a\.id DESC/.test(fnBody) && !/ORDER BY created_at DESC, id DESC/.test(fnBody)) {
        throw new Error("Missing deterministic ordering");
    }
});

checkInvariant("actor join audit row'u düşürmüyor", () => {
    const fnIdx = auditControllerSource.indexOf('public function index()');
    const fnBody = extractBalanced(auditControllerSource, fnIdx);
    if (!/LEFT JOIN admins/.test(fnBody)) {
        throw new Error("Missing LEFT JOIN for admins");
    }
});

checkInvariant("AuditLogController doesn't use non-existent admins columns (first_name, last_name)", () => {
    const fnIdx = auditControllerSource.indexOf('public function index()');
    const fnBody = extractBalanced(auditControllerSource, fnIdx);
    if (/first_name|last_name/.test(fnBody)) {
        throw new Error("AuditLogController references first_name or last_name which do not exist in admins schema");
    }
});

checkInvariant("response IP/user_agent/raw metadata/email/phone içermiyor", () => {
    const fnIdx = auditControllerSource.indexOf('public function index()');
    const fnBody = extractBalanced(auditControllerSource, fnIdx);
    if (/ip_address|user_agent|metadata_json|email|phone/.test(fnBody.split('SELECT')[1].split('FROM')[0])) {
        throw new Error("SELECT clause contains sensitive data fields");
    }
});

checkInvariant("mutation route yok", () => {
    if (/function\s+(store|update|delete|destroy|create)/.test(auditControllerSource)) {
        throw new Error("Found mutation function in AuditLogController");
    }
    const indexSource = fs.readFileSync(path.resolve(rootDir, 'api/index.php'), 'utf8');
    if (/POST|PUT|PATCH|DELETE/.test(indexSource.match(/'\/api\/admin\/audit-logs'.*?function.*?}/s)?.[0] || "")) {
        throw new Error("Mutation route found for audit logs");
    }
});

const rolesSource = fs.readFileSync(path.resolve(rootDir, 'src/admin/auth/roles.ts'), 'utf8');

checkInvariant("route/sidebar yalnız super_admin için erişilebilir", () => {
    const fnStart = rolesSource.indexOf('export const hasRoleAccess');
    const fnBody = extractBalanced(rolesSource, fnStart, '{', '}');
    
    if (!fnBody.includes("pathname === '/admin/audit-logs'") || !fnBody.includes("pathname.startsWith('/admin/audit-logs/')")) {
        throw new Error("Missing exact or child route check for audit-logs");
    }

    const auditLogsRegex = /if\s*\([\s\S]*?'\/admin\/audit-logs'[\s\S]*?\)\s*\{\s*return role === 'super_admin';\s*\}/;
    if (!auditLogsRegex.test(fnBody)) {
        throw new Error("Frontend roles.ts does not strict-guard /admin/audit-logs to super_admin inside the special block");
    }
    
    const auditMatch = fnBody.match(auditLogsRegex);
    const genericAllowIdx = fnBody.indexOf("if (role === 'super_admin' || role === 'admin') return true;");
    
    if (auditMatch.index >= genericAllowIdx) {
        throw new Error("audit-logs check happens after generic allow");
    }
});

const frontendSource = fs.readFileSync(path.resolve(rootDir, 'src/admin/pages/audit-logs/AuditLogsPage.tsx'), 'utf8');

checkInvariant("frontend canonical endpoint kullanıyor", () => {
    if (!frontendSource.includes("apiClient.get(`/api/admin/audit-logs")) {
        throw new Error("Frontend does not fetch from canonical /api/admin/audit-logs");
    }
});

checkInvariant("loading/error/empty state mevcut", () => {
    if (!frontendSource.includes("isLoading && logs.length === 0") && !frontendSource.includes("isLoading")) {
        throw new Error("Loading state missing");
    }
    if (!frontendSource.includes("error ?") && !frontendSource.includes("error")) {
        throw new Error("Error state missing");
    }
    if (!frontendSource.includes("logs.length === 0")) {
        throw new Error("Empty state missing");
    }
});

checkInvariant("DB error fake empty response'a çevrilmiyor", () => {
    // In AuditLogController, check if Exception returns Response::error instead of empty data
    const fnIdx = auditControllerSource.indexOf('public function index()');
    const fnBody = extractBalanced(auditControllerSource, fnIdx);
    if (!/Response::error\(/ .test(fnBody)) {
        throw new Error("Missing Response::error on catch");
    }
});

checkInvariant("raw exception detail client'a sızmıyor", () => {
    const fnIdx = auditControllerSource.indexOf('public function index()');
    const fnBody = extractBalanced(auditControllerSource, fnIdx);
    if (/\$e->getMessage\(\)/.test(fnBody.match(/catch.*?\}/s)?.[0] || "")) {
        throw new Error("Raw exception message leaked in catch block");
    }
});

console.log("---------------------------------------------------------");
console.log(`Total Invariants: ${totalInvariants}`);
console.log(`Passed: ${passedInvariants}`);
console.log(`Failed: ${failedInvariants}`);
console.log("---------------------------------------------------------");

if (failedInvariants !== 0 || passedInvariants !== totalInvariants) {
    console.error(`❌ Audit Log Visibility Verifier FAILED.`);
    process.exit(1);
} else {
    console.log(`✅ Audit Log Visibility Verifier PASSED.`);
    process.exit(0);
}
