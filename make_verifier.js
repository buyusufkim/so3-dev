const fs = require('fs');
const content = `
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
        console.log(\`✅ PASS: \${name}\`);
        passedInvariants++;
    } catch (e) {
        console.error(\`❌ FAIL: \${name} -> \${e.message}\`);
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

// Extractors
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
            if (c === '\\n') inLineComment = false;
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
            if (c === '\\\\') i++;
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

function extractBalancedCall(source, functionName) {
    const fnIdx = source.indexOf(functionName);
    if (fnIdx === -1) return null;
    const parenIdx = source.indexOf("(", fnIdx);
    if (parenIdx === -1) return null;
    return extractBalanced(source, parenIdx, "(", ")");
}

console.log("--- Starting Negative Self-Tests ---");

// Negative tests for predicates (TBD)
// ...

console.log("--- Loading Production Sources (Fail-Closed) ---");
const indexSrc = fs.readFileSync(path.join(rootDir, 'api/index.php'), 'utf8');
const controllerSrc = fs.readFileSync(path.join(rootDir, 'api/controllers/AppointmentController.php'), 'utf8');
const migration35 = fs.readFileSync(path.join(rootDir, 'database/migrations/035_create_appointments.sql'), 'utf8');
const migration36 = fs.readFileSync(path.join(rootDir, 'database/migrations/036_create_appointment_reschedules.sql'), 'utf8');
const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

console.log("--- Running Child Verifiers ---");
const childVerifiers = [
    'verify:appointment-read-create',
    'verify:appointment-reschedule',
    'verify:appointment-cancel',
    'verify:appointment-terminalization'
];

for (const script of childVerifiers) {
    checkInvariant(\`Child Verifier Execution: \${script}\`, () => {
        if (!pkgJson.scripts[script]) throw new Error(\`Missing script \${script} in package.json\`);
        const result = spawnSync('npm', ['run', script], { cwd: rootDir, encoding: 'utf8' });
        if (result.status !== 0) {
            console.error(result.stdout);
            console.error(result.stderr);
            throw new Error(\`Child verifier \${script} failed with code \${result.status}\`);
        }
    });
}

console.log("--- Running Production Invariant Checks ---");

checkInvariant("Namespace Capability Matrix", () => {
    // Check routes in indexSrc
    const allMatches = [...indexSrc.matchAll(/preg_match\\('#\\^\\/api\\/([a-z_]+)\\/appointments.*?\\$#'/g)];
    const routeNamespaces = new Set(allMatches.map(m => m[1]));
    
    if (!routeNamespaces.has('admin') || !routeNamespaces.has('reception') || !routeNamespaces.has('trainer')) {
        throw new Error("Missing namespaces in routes");
    }
    
    if (indexSrc.includes('/api/public/appointments') || indexSrc.match(/\\/api\\/[a-z_]*member[a-z_]*\\/appointments/)) {
        throw new Error("Public/member appointment read/write lifecycle route forbidden");
    }
    
    // Admin routes
    if (!indexSrc.match(/#\\^\\/api\\/admin\\/appointments\\$#/)) throw new Error("Missing admin GET/POST");
    if (!indexSrc.match(/#\\^\\/api\\/admin\\/appointments\\/\\(\\[1-9\\]\\\\d\\*\\)\\/reschedule\\$#/)) throw new Error("Missing admin reschedule");
    if (!indexSrc.match(/#\\^\\/api\\/admin\\/appointments\\/\\(\\[1-9\\]\\\\d\\*\\)\\/cancel\\$#/)) throw new Error("Missing admin cancel");
    if (!indexSrc.match(/#\\^\\/api\\/admin\\/appointments\\/\\(\\[1-9\\]\\\\d\\*\\)\\/complete\\$#/)) throw new Error("Missing admin complete");
    if (!indexSrc.match(/#\\^\\/api\\/admin\\/appointments\\/\\(\\[1-9\\]\\\\d\\*\\)\\/no-show\\$#/)) throw new Error("Missing admin no-show");
    
    // Reception routes
    if (!indexSrc.match(/#\\^\\/api\\/reception\\/appointments\\$#/)) throw new Error("Missing reception GET/POST");
    if (!indexSrc.match(/#\\^\\/api\\/reception\\/appointments\\/\\(\\[1-9\\]\\\\d\\*\\)\\/reschedule\\$#/)) throw new Error("Missing reception reschedule");
    if (!indexSrc.match(/#\\^\\/api\\/reception\\/appointments\\/\\(\\[1-9\\]\\\\d\\*\\)\\/cancel\\$#/)) throw new Error("Missing reception cancel");
    if (indexSrc.match(/#\\^\\/api\\/reception\\/appointments\\/\\(\\[1-9\\]\\\\d\\*\\)\\/(complete|no-show)\\$#/)) throw new Error("Reception complete/no-show forbidden");
    
    // Trainer routes
    if (!indexSrc.match(/#\\^\\/api\\/trainer\\/appointments\\$#/)) throw new Error("Missing trainer GET/POST");
    if (!indexSrc.match(/#\\^\\/api\\/trainer\\/appointments\\/\\(\\[1-9\\]\\\\d\\*\\)\\/reschedule\\$#/)) throw new Error("Missing trainer reschedule");
    if (indexSrc.match(/#\\^\\/api\\/trainer\\/appointments\\/\\(\\[1-9\\]\\\\d\\*\\)\\/cancel\\$#/)) throw new Error("Trainer cancel forbidden");
    if (!indexSrc.match(/#\\^\\/api\\/trainer\\/appointments\\/\\(\\[1-9\\]\\\\d\\*\\)\\/complete\\$#/)) throw new Error("Missing trainer complete");
    if (!indexSrc.match(/#\\^\\/api\\/trainer\\/appointments\\/\\(\\[1-9\\]\\\\d\\*\\)\\/no-show\\$#/)) throw new Error("Missing trainer no-show");
});

checkInvariant("State Machine", () => {
    // Migration check
    const statusMatch = migration35.match(/status\\s+ENUM\\(([^)]+)\\)/i);
    if (!statusMatch) throw new Error("Missing status ENUM");
    const statuses = statusMatch[1].split(',').map(s => s.replace(/['\\s]/g, ''));
    const expected = ['scheduled', 'completed', 'cancelled', 'no_show'];
    if (statuses.length !== expected.length || !statuses.every(s => expected.includes(s))) {
        throw new Error("Exact statuses must be scheduled, completed, cancelled, no_show");
    }
    
    // Controller generic status bypass check
    if (controllerSrc.includes("updateStatus") || controllerSrc.includes("setAppointmentStatus")) {
        throw new Error("Generic status updater found");
    }
    if (indexSrc.match(/#\\^\\/api\\/[a-z_]+\\/appointments\\/\\(\\[1-9\\]\\\\d\\*\\)\\$#'/)) {
        throw new Error("Generic PATCH /appointments/{id} bypass forbidden");
    }
});

// Finish template
\`;

fs.writeFileSync('scripts/verify-appointment-lifecycle.mjs', content);
