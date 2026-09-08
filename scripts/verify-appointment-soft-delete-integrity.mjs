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

// --- Helper Functions ---
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
            if (braceCount === 0) return source.substring(blockStart, i + 1);
        }
    }
    return null;
}

const memberControllerPath = path.resolve(rootDir, 'api/controllers/MemberController.php');
const trainerControllerPath = path.resolve(rootDir, 'api/controllers/TrainerController.php');

const memberSource = fs.readFileSync(memberControllerPath, 'utf8');
const trainerSource = fs.readFileSync(trainerControllerPath, 'utf8');

checkInvariant("Member Delete Integrity Cascade Logic", () => {
    const fnIdx = memberSource.indexOf('public function delete(');
    if (fnIdx === -1) throw new Error("delete function not found in MemberController");
    
    const fnBody = extractBalanced(memberSource, fnIdx);
    if (!fnBody) throw new Error("Could not extract delete function body");
    
    // Check if the transaction block contains the cascade
    if (!/UPDATE\s+members\s+SET\s+deleted_at/i.test(fnBody)) {
        throw new Error("Missing members deleted_at update");
    }
    
    if (!/SELECT\s+id,\s+status\s+FROM\s+appointments\s+WHERE\s+member_id\s+=\s+\?\s+AND\s+status\s+=\s+'scheduled'\s+AND\s+ends_at\s+>\s+\?\s+FOR\s+UPDATE/i.test(fnBody)) {
        throw new Error("Missing proper FOR UPDATE lock on scheduled appointments");
    }
    
    if (!/UPDATE\s+appointments\s+SET\s+status\s+=\s+'cancelled'/i.test(fnBody)) {
        throw new Error("Missing appointments cancelled update");
    }
    
    if (!fnBody.includes("commit()")) {
        throw new Error("Missing transaction commit");
    }
    
    const commitIdx = fnBody.indexOf("commit()");
    const auditIdx = fnBody.indexOf("AuditLogger::log(", commitIdx);
    if (auditIdx === -1) {
        throw new Error("Missing AuditLogger call for appointments AFTER commit");
    }
});

checkInvariant("Trainer Delete Integrity Cascade Logic", () => {
    const fnIdx = trainerSource.indexOf('public function delete(');
    if (fnIdx === -1) throw new Error("delete function not found in TrainerController");
    
    const fnBody = extractBalanced(trainerSource, fnIdx);
    if (!fnBody) throw new Error("Could not extract delete function body");
    
    // Check if the transaction block contains the cascade
    if (!/UPDATE\s+trainers\s+SET\s+deleted_at/i.test(fnBody)) {
        throw new Error("Missing trainers deleted_at update");
    }
    
    if (!/SELECT\s+id,\s+status\s+FROM\s+appointments\s+WHERE\s+trainer_id\s+=\s+\?\s+AND\s+status\s+=\s+'scheduled'\s+AND\s+ends_at\s+>\s+\?\s+FOR\s+UPDATE/i.test(fnBody)) {
        throw new Error("Missing proper FOR UPDATE lock on scheduled appointments");
    }
    
    if (!/UPDATE\s+appointments\s+SET\s+status\s+=\s+'cancelled'/i.test(fnBody)) {
        throw new Error("Missing appointments cancelled update");
    }
    
    if (!fnBody.includes("commit()")) {
        throw new Error("Missing transaction commit");
    }
    
    const commitIdx = fnBody.indexOf("commit()");
    const auditIdx = fnBody.indexOf("AuditLogger::log(", commitIdx);
    if (auditIdx === -1) {
        throw new Error("Missing AuditLogger call for appointments AFTER commit");
    }
});

console.log("---------------------------------------------------------");
console.log(`Total Invariants: ${totalInvariants}`);
console.log(`Passed: ${passedInvariants}`);
console.log(`Failed: ${failedInvariants}`);
console.log("---------------------------------------------------------");

if (failedInvariants !== 0 || passedInvariants !== totalInvariants) {
    console.error(`❌ Appointment Soft-Delete Integrity Verifier FAILED.`);
    process.exit(1);
} else {
    console.log(`✅ Appointment Soft-Delete Integrity Verifier PASSED.`);
    process.exit(0);
}
