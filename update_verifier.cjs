const fs = require('fs');

const path = 'scripts/verify-operational-admin-dashboard.mjs';
let content = fs.readFileSync(path, 'utf8');

const additionalInvariants = `
checkInvariant("No empty catch blocks swallowing metric queries", () => {
    const fnIdx = controllerSource.indexOf('public function operationalDashboard()');
    const fnBody = extractBalanced(controllerSource, fnIdx);
    
    // Check if there's any catch block that looks like catch (\\Exception $e) {}
    // We allow whitespace inside {} but no real code.
    if (/catch\\s*\\([^)]+\\)\\s*\\{\\s*\\}/.test(fnBody)) {
        throw new Error("Found empty catch block swallowing exceptions in operationalDashboard");
    }
});

checkInvariant("Fail-closed logic maps to Response::error", () => {
    const fnIdx = controllerSource.indexOf('public function operationalDashboard()');
    const fnBody = extractBalanced(controllerSource, fnIdx);
    
    if (!/\\\\Core\\\\Response::error\\s*\\(/.test(fnBody)) {
        throw new Error("Missing Response::error call for fail-closed query error handling");
    }
});

checkInvariant("No literal escaped newline artifact at the end of the file", () => {
    // Look at the last 20 characters of the file
    const tail = controllerSource.slice(-20);
    if (tail.includes('\\n}\\n') && !tail.includes('\\n}\\n\\n')) {
        // Just checking if we find literally the string "\\n}\\n"
    }
    // A better check:
    if (controllerSource.includes('\\\\n}\\\\n')) {
        throw new Error("Found literal escaped newline artifact");
    }
});
`;

// Insert the new invariants right before "// 3. FRONTEND INTEGRATION"
content = content.replace('// 3. FRONTEND INTEGRATION', additionalInvariants + '\n// 3. FRONTEND INTEGRATION');

fs.writeFileSync(path, content);
