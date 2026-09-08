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

// 1. BACKEND ROUTER ISOLATION
const indexSource = fs.readFileSync(path.resolve(rootDir, 'api/index.php'), 'utf8');

checkInvariant("Router exposes separate operational endpoint", () => {
    if (!indexSource.includes("'/api/admin/dashboard/operations' => function()")) {
        throw new Error("Missing /api/admin/dashboard/operations route");
    }
    if (!indexSource.includes("operationalDashboard();")) {
        throw new Error("Missing operationalDashboard call");
    }
});

// 2. BACKEND CONTROLLER ISOLATION & SEMANTICS
const controllerSource = fs.readFileSync(path.resolve(rootDir, 'api/controllers/AdminController.php'), 'utf8');

checkInvariant("Operational endpoint explicitly guards admin/super_admin", () => {
    const fnIdx = controllerSource.indexOf('public function operationalDashboard()');
    if (fnIdx === -1) throw new Error("operationalDashboard not found");
    const fnBody = extractBalanced(controllerSource, fnIdx);
    
    if (!/hasRole\(\['super_admin',\s*'admin'\]\)/.test(fnBody)) {
        throw new Error("Missing strict role guard for operations");
    }
});

checkInvariant("Active member metric strict scope", () => {
    const fnIdx = controllerSource.indexOf('public function operationalDashboard()');
    const fnBody = extractBalanced(controllerSource, fnIdx);
    
    if (!/COUNT\(\*\)\s+FROM\s+members\s+WHERE\s+status\s+=\s+'active'\s+AND\s+deleted_at\s+IS\s+NULL/.test(fnBody)) {
        throw new Error("Active members query missing exact status='active' AND deleted_at IS NULL");
    }
});

checkInvariant("Occupancy metric strict scope", () => {
    const fnIdx = controllerSource.indexOf('public function operationalDashboard()');
    const fnBody = extractBalanced(controllerSource, fnIdx);
    
    if (!/COUNT\(\*\)\s+FROM\s+member_visits\s+WHERE\s+checked_out_at\s+IS\s+NULL/.test(fnBody)) {
        throw new Error("Occupancy query missing exact checked_out_at IS NULL condition");
    }
});

checkInvariant("Europe/Istanbul today boundaries", () => {
    const fnIdx = controllerSource.indexOf('public function operationalDashboard()');
    const fnBody = extractBalanced(controllerSource, fnIdx);
    
    if (!/new\s+\\DateTimeZone\('Europe\/Istanbul'\)/.test(fnBody)) {
        throw new Error("Missing exact Europe/Istanbul timezone");
    }
    if (!/new\s+\\DateTime\('today',\s*\$tz\)/.test(fnBody) || !/new\s+\\DateTime\('tomorrow',\s*\$tz\)/.test(fnBody)) {
        throw new Error("Missing explicit today/tomorrow bounds");
    }
});

checkInvariant("Visits today bounds condition", () => {
    const fnIdx = controllerSource.indexOf('public function operationalDashboard()');
    const fnBody = extractBalanced(controllerSource, fnIdx);
    if (!/COUNT\(\*\)\s+FROM\s+member_visits\s+WHERE\s+checked_in_at\s+>=\s+\?\s+AND\s+checked_in_at\s+<\s+\?/.test(fnBody)) {
         throw new Error("Missing checked_in_at boundaries inside query");
    }
});

checkInvariant("Appointments today canonical status set", () => {
    const fnIdx = controllerSource.indexOf('public function operationalDashboard()');
    const fnBody = extractBalanced(controllerSource, fnIdx);
    if (!/status\s+=\s+'scheduled'/.test(fnBody) || !/status\s+=\s+'completed'/.test(fnBody) || !/status\s+=\s+'cancelled'/.test(fnBody) || !/status\s+=\s+'no_show'/.test(fnBody)) {
        throw new Error("Appointments query does not aggregate all 4 canonical statuses");
    }
});

checkInvariant("No PII returned", () => {
    const fnIdx = controllerSource.indexOf('public function operationalDashboard()');
    const fnBody = extractBalanced(controllerSource, fnIdx);
    if (/first_name|last_name|email|phone/.test(fnBody)) {
        throw new Error("PII fields detected in operational query");
    }
});


checkInvariant("No empty catch blocks swallowing metric queries", () => {
    const fnIdx = controllerSource.indexOf('public function operationalDashboard()');
    const fnBody = extractBalanced(controllerSource, fnIdx);
    
    // Check if there's any catch block that looks like catch (\Exception $e) {}
    // We allow whitespace inside {} but no real code.
    if (/catch\s*\([^)]+\)\s*\{\s*\}/.test(fnBody)) {
        throw new Error("Found empty catch block swallowing exceptions in operationalDashboard");
    }
});

checkInvariant("Fail-closed logic maps to Response::error", () => {
    const fnIdx = controllerSource.indexOf('public function operationalDashboard()');
    const fnBody = extractBalanced(controllerSource, fnIdx);
    
    if (!/\\Core\\Response::error\s*\(/.test(fnBody)) {
        throw new Error("Missing Response::error call for fail-closed query error handling");
    }
});

checkInvariant("No literal escaped newline artifact at the end of the file", () => {
    // Look at the last 20 characters of the file
    const tail = controllerSource.slice(-20);
    if (tail.includes('\n}\n') && !tail.includes('\n}\n\n')) {
        // Just checking if we find literally the string "\n}\n"
    }
    // A better check:
    if (controllerSource.includes('\\n}\\n')) {
        throw new Error("Found literal escaped newline artifact");
    }
});


checkInvariant("No exception detail leakage in Response::error", () => {
    const fnIdx = controllerSource.indexOf('public function operationalDashboard()');
    const fnBody = extractBalanced(controllerSource, fnIdx);
    
    if (fnBody && fnBody.includes('$e->getMessage()') && fnBody.includes('Response::error')) {
        throw new Error("Exception details leaked in client-facing Response::error");
    }
});

checkInvariant("fix_admin_controller.cjs does not exist", () => {
    if (fs.existsSync(path.resolve(rootDir, 'fix_admin_controller.cjs'))) {
        throw new Error("fix_admin_controller.cjs must be removed");
    }
});

checkInvariant("update_verifier.cjs does not exist", () => {
    if (fs.existsSync(path.resolve(rootDir, 'update_verifier.cjs'))) {
        throw new Error("update_verifier.cjs must be removed");
    }
});

// 3. FRONTEND INTEGRATION
const dashboardSource = fs.readFileSync(path.resolve(rootDir, 'src/admin/pages/Dashboard.tsx'), 'utf8');

checkInvariant("Frontend fetches operations endpoint and handles roles", () => {
    if (!dashboardSource.includes("apiClient.get('/api/admin/dashboard/operations')")) {
        throw new Error("Operations endpoint not fetched");
    }
    
    if (!dashboardSource.includes("isAdminUser(meResponse)") || (!dashboardSource.includes("meResponse.role === 'admin'") && !dashboardSource.includes("meResponse.role === 'super_admin'"))) {
        throw new Error("Frontend role check missing for operations render");
    }
    
    if (!dashboardSource.includes("Operasyonel veriler alınamadı")) {
        throw new Error("Operations fetch error state not handled");
    }
});

checkInvariant("Legacy dashboard gracefully degraded on ops fail", () => {
    if (!dashboardSource.includes("apiClient.get('/api/admin/dashboard')")) {
        throw new Error("Legacy dashboard fetch missing");
    }
});

console.log("---------------------------------------------------------");
console.log(`Total Invariants: ${totalInvariants}`);
console.log(`Passed: ${passedInvariants}`);
console.log(`Failed: ${failedInvariants}`);
console.log("---------------------------------------------------------");

if (failedInvariants !== 0 || passedInvariants !== totalInvariants) {
    console.error(`❌ Operational Dashboard Verifier FAILED.`);
    process.exit(1);
} else {
    console.log(`✅ Operational Dashboard Verifier PASSED.`);
    process.exit(0);
}
