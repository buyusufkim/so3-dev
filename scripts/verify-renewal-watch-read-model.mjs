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
            if (char === "'" || char === '"' || char === '`') {
                insideString = true;
                quoteChar = char;
            } else if (char === '{') {
                depth++;
            } else if (char === '}') {
                depth--;
            } else if (char === '/' && i + 1 < text.length) {
                if (text[i + 1] === '/') {
                    while (i < text.length && text[i] !== '\n') i++;
                    continue;
                } else if (text[i + 1] === '*') {
                    while (i + 1 < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
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

console.log("=== 1. Self-Tests & Negative Invariant Tests ===");

// 1. Role boundary test
function validateRoles(routeSnippet) {
    const roleMatch = routeSnippet.match(/AuthMiddleware::hasRole\(\s*\[([^\]]+)\]\s*\)/);
    if (!roleMatch) return false;
    const roles = roleMatch[1].split(',').map(r => r.trim().replace(/['"]/g, ''));
    const expected = ['super_admin', 'admin', 'reception'];
    if (roles.length !== expected.length || !expected.every(r => roles.includes(r))) return false;
    if (roles.includes('trainer') || roles.includes('editor')) return false;
    return true;
}
assert(validateRoles("AuthMiddleware::hasRole(['super_admin', 'admin', 'reception'])"), "Self-test: Exact roles pass");
assert(!validateRoles("AuthMiddleware::hasRole(['super_admin', 'admin', 'reception', 'trainer'])"), "Self-test: Trainer addition rejected");
assert(!validateRoles("AuthMiddleware::hasRole(['super_admin', 'admin'])"), "Self-test: Incomplete roles rejected");

// 2. HTTP method guard test
function validateMethod(routeSnippet) {
    const hasGet = /\$method\s*===\s*'GET'/.test(routeSnippet);
    const hasPost = /\$method\s*===\s*'(POST|PATCH|DELETE)'/.test(routeSnippet) || /\$method\s*!==\s*'GET'/.test(routeSnippet);
    return hasGet && !hasPost;
}
assert(validateMethod("if ($method === 'GET') { (new Controller())->index(); }"), "Self-test: GET-only pass");
assert(!validateMethod("if ($method === 'GET' || $method === 'POST') { }"), "Self-test: POST rejection passes");

// 3. Mutation detector test
function checkNoMutations(code) {
    const forbiddenPatterns = [
        /\bINSERT\s+INTO\b/i,
        /\bUPDATE\s+[a-zA-Z0-9_]+\s+SET\b/i,
        /\bDELETE\s+FROM\b/i,
        /AuditLogger::log/,
        /\bbeginTransaction\s*\(/,
        /\bcommit\s*\(/,
        /\brollBack\s*\(/
    ];
    return !forbiddenPatterns.some(p => p.test(code));
}
assert(checkNoMutations("SELECT m.id FROM members m WHERE m.status = 'active'"), "Self-test: Clean SELECT has no mutations");
assert(!checkNoMutations("INSERT INTO notifications (user_id) VALUES (1)"), "Self-test: INSERT detected and rejected");
assert(!checkNoMutations("AuditLogger::log('renewal.view', 1)"), "Self-test: AuditLogger detected and rejected");
assert(!checkNoMutations("$db->beginTransaction();"), "Self-test: Transaction detected and rejected");

// 4. Timezone detector test
function checkTimezone(code) {
    return code.includes("Europe/Istanbul") && code.includes("DateTimeZone") && code.includes("DateTimeImmutable");
}
assert(checkTimezone("new DateTimeZone('Europe/Istanbul'); new DateTimeImmutable('now', $tz);"), "Self-test: Valid Europe/Istanbul check");
assert(!checkTimezone("new DateTimeZone('UTC');"), "Self-test: UTC rejected");
assert(!checkTimezone("SELECT CURDATE()"), "Self-test: Raw CURDATE-only rejected");

// 5. Query allowlist test
function checkQueryAllowlist(code) {
    const allowedRegex = /\$allowedKeys\s*=\s*\[\s*'bucket'\s*,\s*'window_days'\s*,\s*'page'\s*,\s*'per_page'\s*\]/;
    const diffCheck = /array_diff\s*\(\s*\$requestKeys\s*,\s*\$allowedKeys\s*\)/;
    const errorCheck = /Response::error\([^,]+,\s*'VALIDATION_ERROR',\s*422\)/;
    return allowedRegex.test(code) && diffCheck.test(code) && errorCheck.test(code);
}
assert(checkQueryAllowlist("$allowedKeys = ['bucket', 'window_days', 'page', 'per_page']; $extraKeys = array_diff($requestKeys, $allowedKeys); if (!empty($extraKeys)) { Response::error('Geçersiz', 'VALIDATION_ERROR', 422); }"), "Self-test: Query allowlist check passes");

// 6. Signed days until expiry test
function checkSignedDays(code) {
    const hasAbs = /abs\s*\(\s*\$daysUntilExpiry\s*\)/.test(code) || /abs\s*\(\s*\(int\)\$diff/.test(code);
    const hasFormat = /diff[\s\S]*?->format\(['"]%r%a['"]\)/.test(code);
    const hasBranching = /\$daysUntilExpiry\s*<\s*0[\s\S]*?'expired'[\s\S]*?===?\s*0[\s\S]*?'today'[\s\S]*?'upcoming'/.test(code);
    return !hasAbs && hasFormat && hasBranching;
}
assert(checkSignedDays("$daysUntilExpiry = (int)$diff->format('%r%a'); if ($daysUntilExpiry < 0) { $renewalState = 'expired'; } elseif ($daysUntilExpiry === 0) { $renewalState = 'today'; } else { $renewalState = 'upcoming'; }"), "Self-test: Signed days passes");
assert(!checkSignedDays("$daysUntilExpiry = abs((int)$diff->format('%r%a'));"), "Self-test: abs() rejected");

// 7. Non-page-local summary test
function checkSummaryNotPageLocal(code) {
    const isReduce = /array_reduce\s*\(\s*\$items/.test(code) || /foreach\s*\(\s*\$items[\s\S]*?\$summary\[/.test(code);
    const hasSqlSummary = /SELECT[\s\S]*?COUNT\(CASE[\s\S]*?FROM\s+members/i.test(code);
    return !isReduce && hasSqlSummary;
}
assert(checkSummaryNotPageLocal("SELECT COUNT(CASE WHEN m.membership_end_date < :today THEN 1 END) AS expired_count FROM members m"), "Self-test: SQL summary passes");
assert(!checkSummaryNotPageLocal("foreach ($items as $item) { $summary[$item['renewal_state']]++; }"), "Self-test: Reduce-based page-local summary rejected");

console.log("=== 2. Package & Scripts Verification ===");
const pkgPath = 'package.json';
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert(
    pkg.scripts && pkg.scripts['verify:renewal-watch-read-model'] === 'node scripts/verify-renewal-watch-read-model.mjs',
    "package.json exact script 'verify:renewal-watch-read-model' registered"
);

console.log("=== 3. Router & RBAC Verification in api/index.php ===");
const indexPhpSource = fs.readFileSync('api/index.php', 'utf8');
const routeMatch = indexPhpSource.match(/preg_match\('#\^\/api\/reception\/renewal-watch\$#'/);
assert(routeMatch !== null, "Exact regex ^/api/reception/renewal-watch$ wired in api/index.php");

const routeBlock = extractBraceBlock(indexPhpSource, "preg_match('#^/api/reception/renewal-watch$#'");
assert(routeBlock !== null, "Extracted /api/reception/renewal-watch route block from api/index.php");
if (routeBlock) {
    const src = routeBlock.content;
    assert(validateRoles(src), "Exact role boundary: super_admin, admin, reception (trainer/editor strictly excluded)");
    assert(validateMethod(src), "Route is strictly GET; mutation methods rejected/unmatched");
    assert(src.includes("RenewalTrackingController"), "Route dispatches to RenewalTrackingController");
    assert(src.includes("(new \\Controllers\\RenewalTrackingController())->index()"), "Calls RenewalTrackingController->index()");
}

console.log("=== 4. Controller Source & Architecture Invariants ===");
const controllerPath = 'api/controllers/RenewalTrackingController.php';
assert(fs.existsSync(controllerPath), "RenewalTrackingController.php exists");
const controllerSource = fs.readFileSync(controllerPath, 'utf8');

// No mutation check
assert(checkNoMutations(controllerSource), "Zero writes: No INSERT, UPDATE, DELETE, transactions, or AuditLogger calls in controller");

// Timezone check
assert(checkTimezone(controllerSource), "Timezone strictly Europe/Istanbul via DateTimeZone and DateTimeImmutable");

// Query allowlist check
assert(checkQueryAllowlist(controllerSource), "Strict query parameter allowlist: [bucket, window_days, page, per_page] with 422 on extra params");

// Bucket contract
assert(
    controllerSource.includes("'all', 'expired', 'today', 'upcoming'"),
    "Bucket contract: strictly validates ['all', 'expired', 'today', 'upcoming']"
);

// Window days bounds (1..90, default 14)
assert(
    controllerSource.includes("$windowDays = 14;") &&
    controllerSource.includes("/^[1-9]\\d*$/") &&
    controllerSource.includes("$windowDays < 1 || $windowDays > 90"),
    "Window days bounds: canonical integer 1..90 with default 14"
);

// Pagination bounds
assert(
    controllerSource.includes("$page = 1;") &&
    controllerSource.includes("$perPage = 20;") &&
    controllerSource.includes("$perPage < 1 || $perPage > 100") &&
    controllerSource.includes("LIMIT :limit OFFSET :offset"),
    "Pagination parameters: page >= 1, per_page 1..100 with default 20, using LIMIT & OFFSET"
);

// Candidate scope filter
assert(
    controllerSource.includes("m.deleted_at IS NULL") &&
    controllerSource.includes("m.status = 'active'") &&
    controllerSource.includes("m.membership_end_date IS NOT NULL"),
    "Candidate scope invariant: active, non-deleted members with non-null membership_end_date only"
);

// Summary calculation independent of page items
assert(
    checkSummaryNotPageLocal(controllerSource),
    "Summary calculation is independent of paginated items (whole eligible population query)"
);
assert(
    controllerSource.includes("'expired' => $expiredCount") &&
    controllerSource.includes("'today' => $todayCount") &&
    controllerSource.includes("'upcoming' => $upcomingCount") &&
    controllerSource.includes("'total' => $totalCount"),
    "Summary structure contains expired, today, upcoming, total"
);

// Deterministic ordering
assert(
    controllerSource.includes("ORDER BY m.membership_end_date ASC, m.id ASC") && // upcoming
    controllerSource.includes("ORDER BY m.id ASC") && // today
    controllerSource.includes("ORDER BY m.membership_end_date DESC, m.id ASC"), // expired
    "Deterministic ordering present for each bucket condition"
);

// Signed days until expiry
assert(
    checkSignedDays(controllerSource),
    "Signed days until expiry: %r%a format, negative for expired, 0 for today, positive for upcoming, no abs()"
);

// Safe response item projection
const safeProjectionKeys = [
    "'id' =>",
    "'uuid' =>",
    "'first_name' =>",
    "'last_name' =>",
    "'phone' =>",
    "'membership_start_date' =>",
    "'membership_end_date' =>",
    "'renewal_state' =>",
    "'days_until_expiry' =>"
];
assert(
    safeProjectionKeys.every(k => controllerSource.includes(k)),
    "Item projection contains all safe fields (id, uuid, first_name, last_name, phone, membership_start_date, membership_end_date, renewal_state, days_until_expiry)"
);

const forbiddenProjection = [
    "'notes'",
    "'emergency_contact_name'",
    "'emergency_contact_phone'",
    "'password'",
    "'created_by'",
    "'updated_by'"
];
assert(
    !forbiddenProjection.some(f => controllerSource.includes(f)),
    "Sensitive fields (notes, emergency contact, password, audit creators) excluded from response"
);

// Response envelope check
const envelopeKeys = [
    "'as_of_date'",
    "'window_days'",
    "'bucket'",
    "'summary'",
    "'items'",
    "'pagination'"
];
assert(
    envelopeKeys.every(k => controllerSource.includes(k)),
    "Envelope structure contains as_of_date, window_days, bucket, summary, items, pagination"
);

console.log("=== 5. Decisions Documentation Invariants ===");
const decisionsSource = fs.readFileSync('DECISIONS.md', 'utf8');
assert(
    decisionsSource.includes("## F.20A Membership Renewal Watch Read Model Foundation"),
    "DECISIONS.md includes section 'F.20A Membership Renewal Watch Read Model Foundation'"
);
assert(
    decisionsSource.includes("existing reception renew transaction remains canonical") &&
    decisionsSource.includes("membership_renewals remains append-only history") &&
    decisionsSource.includes("current renewal state derives from members membership dates") &&
    decisionsSource.includes("renewal-watch is GET-only and side-effect free") &&
    decisionsSource.includes("business date is Europe/Istanbul") &&
    decisionsSource.includes("active non-deleted members with non-null end date only") &&
    decisionsSource.includes("14-day default configurable watch window") &&
    decisionsSource.includes("no notification persistence/delivery in F.20A"),
    "DECISIONS.md documents all 8 core F.20A architectural decisions"
);

console.log("=== 6. Repository Hygiene Check ===");
const strayPatterns = [
    /^patch.*\.(js|mjs|php)$/,
    /^tmp.*\.(js|mjs|php)$/,
    /\.tmp$/,
    /\.fixed$/,
    /^add-.*\.php$/
];
const rootFiles = fs.readdirSync('.');
const strayFiles = rootFiles.filter(f => strayPatterns.some(p => p.test(f)));
assert(strayFiles.length === 0, `Repo hygiene: No temporary or patch files in root (found: ${strayFiles.join(', ')})`);

console.log("\n========================================");
if (exitCode === 0) {
    console.log("🎯 ALL F.20A RENEWAL WATCH READ MODEL INVARIANTS PASS");
} else {
    console.error("💥 F.20A VERIFICATION FAILED");
}
console.log("========================================");

process.exit(exitCode);
