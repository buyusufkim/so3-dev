import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Reason: ${e.message}`);
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

const memberControllerPath = path.resolve(rootDir, 'api/controllers/MemberController.php');
const memberSource = fs.readFileSync(memberControllerPath, 'utf8');

checkInvariant("getVisits policy exact match", () => {
    const fnIdx = memberSource.indexOf('public function getVisits');
    if (fnIdx === -1) throw new Error("Missing getVisits in MemberController");
    const fnBody = extractBalanced(memberSource, fnIdx);
    
    if (!/AuthMiddleware::hasRole\(\['super_admin',\s*'admin'\]\)/.test(fnBody)) {
        throw new Error("Missing exact role guard in getVisits");
    }
    if (!/SELECT\s+id\s+FROM\s+members\s+WHERE\s+id\s+=\s+\?\s+AND\s+deleted_at\s+IS\s+NULL/.test(fnBody)) {
        throw new Error("Missing exact deleted_at IS NULL member policy in getVisits");
    }
    if (!/WHERE\s+mv\.member_id\s+=\s+\?/.test(fnBody)) {
        throw new Error("Missing member scope in getVisits query");
    }
    if (!/ORDER\s+BY\s+mv\.checked_in_at\s+DESC/.test(fnBody)) {
        throw new Error("Missing deterministic ordering in getVisits");
    }
    if (!/LIMIT\s+\d+/.test(fnBody)) {
        throw new Error("Missing bounds (LIMIT) in getVisits");
    }
});

checkInvariant("getRenewals policy exact match", () => {
    const fnIdx = memberSource.indexOf('public function getRenewals');
    if (fnIdx === -1) throw new Error("Missing getRenewals in MemberController");
    const fnBody = extractBalanced(memberSource, fnIdx);
    
    if (!/AuthMiddleware::hasRole\(\['super_admin',\s*'admin'\]\)/.test(fnBody)) {
        throw new Error("Missing exact role guard in getRenewals");
    }
    if (!/SELECT\s+id\s+FROM\s+members\s+WHERE\s+id\s+=\s+\?\s+AND\s+deleted_at\s+IS\s+NULL/.test(fnBody)) {
        throw new Error("Missing exact deleted_at IS NULL member policy in getRenewals");
    }
    if (!/WHERE\s+mr\.member_id\s+=\s+\?/.test(fnBody)) {
        throw new Error("Missing member scope in getRenewals query");
    }
    if (!/ORDER\s+BY\s+mr\.created_at\s+DESC/.test(fnBody)) {
        throw new Error("Missing deterministic ordering in getRenewals");
    }
    if (!/LIMIT\s+\d+/.test(fnBody)) {
        throw new Error("Missing bounds (LIMIT) in getRenewals");
    }
});

const indexPath = path.resolve(rootDir, 'api/index.php');
const indexSource = fs.readFileSync(indexPath, 'utf8');

checkInvariant("Router exact endpoint definitions", () => {
    if (!indexSource.includes("preg_match('#^/api/admin/members/([1-9]\\d*)/visits$#', $requestUri")) {
        throw new Error("Missing exact visits GET route regex");
    }
    if (!indexSource.includes("preg_match('#^/api/admin/members/([1-9]\\d*)/renewals$#', $requestUri")) {
        throw new Error("Missing exact renewals GET route regex");
    }
});

const adminMemberEditorPath = path.resolve(rootDir, 'src/admin/pages/members/AdminMemberEditor.tsx');
const adminMemberEditorSource = fs.readFileSync(adminMemberEditorPath, 'utf8');

checkInvariant("AdminMemberEditor integration", () => {
    if (!adminMemberEditorSource.includes("MemberVisitsPanel memberId={id}")) {
        throw new Error("MemberVisitsPanel not mounted with memberId");
    }
    if (!adminMemberEditorSource.includes("MemberRenewalsPanel memberId={id}")) {
        throw new Error("MemberRenewalsPanel not mounted with memberId");
    }
});

const visitsPanelPath = path.resolve(rootDir, 'src/admin/pages/members/MemberVisitsPanel.tsx');
const renewalsPanelPath = path.resolve(rootDir, 'src/admin/pages/members/MemberRenewalsPanel.tsx');
const visitsPanelSource = fs.readFileSync(visitsPanelPath, 'utf8');
const renewalsPanelSource = fs.readFileSync(renewalsPanelPath, 'utf8');

checkInvariant("Frontend panel API calls and states", () => {
    if (!visitsPanelSource.includes("`/api/admin/members/${memberId}/visits`")) {
        throw new Error("Visits panel API path incorrect");
    }
    if (!renewalsPanelSource.includes("`/api/admin/members/${memberId}/renewals`")) {
        throw new Error("Renewals panel API path incorrect");
    }
    if (!visitsPanelSource.includes("formatSafeDate") || !renewalsPanelSource.includes("formatSafeDate")) {
        throw new Error("Missing safe date formatting usage");
    }
    
    // Strict datetime parser check (without new Date() conversion risk)
    const strictRegex1 = `/^(\\d{4})-(\\d{2})-(\\d{2})$/`;
    const strictRegex2 = `/^(\\d{4})-(\\d{2})-(\\d{2}) (\\d{2}):(\\d{2}):(\\d{2})$/`;
    
    if (!visitsPanelSource.includes(strictRegex1) || !visitsPanelSource.includes(strictRegex2)) {
         throw new Error("Visits panel missing strict DATE/DATETIME regex formatting");
    }
    if (!renewalsPanelSource.includes(strictRegex1) || !renewalsPanelSource.includes(strictRegex2)) {
         throw new Error("Renewals panel missing strict DATE/DATETIME regex formatting");
    }
    
    // Check absence of new Date( inside the formatter
    const visitsFormatterIdx = visitsPanelSource.indexOf("function formatSafeDate");
    const visitsFormatterBody = extractBalanced(visitsPanelSource, visitsFormatterIdx);
    if (visitsFormatterBody && visitsFormatterBody.includes("new Date(")) {
        throw new Error("Visits panel formatSafeDate uses raw new Date() parsing, breaking timezone determinism");
    }
    
    const renewalsFormatterIdx = renewalsPanelSource.indexOf("function formatSafeDate");
    const renewalsFormatterBody = extractBalanced(renewalsPanelSource, renewalsFormatterIdx);
    if (renewalsFormatterBody && renewalsFormatterBody.includes("new Date(")) {
        throw new Error("Renewals panel formatSafeDate uses raw new Date() parsing, breaking timezone determinism");
    }
});

console.log("---------------------------------------------------------");
console.log(`Total Invariants: ${totalInvariants}`);
console.log(`Passed: ${passedInvariants}`);
console.log(`Failed: ${failedInvariants}`);
console.log("---------------------------------------------------------");

if (failedInvariants !== 0 || passedInvariants !== totalInvariants) {
    console.error(`❌ Member Operational History Verifier FAILED.`);
    process.exit(1);
} else {
    console.log(`✅ Member Operational History Verifier PASSED.`);
    process.exit(0);
}
