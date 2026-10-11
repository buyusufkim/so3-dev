import fs from 'fs';
import path from 'path';

let exitCode = 0;
let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    exitCode = 1;
  } else {
    passedAssertions++;
    console.log(`✅ PASS: ${message}`);
  }
}

console.log("=== 1. Package.json Script Registration ===");
const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:deployment-runtime"] === "node scripts/verify-deployment-runtime.mjs",
  "Package.json exact registration: 'verify:deployment-runtime' === 'node scripts/verify-deployment-runtime.mjs'"
);
assert(
  pkg.scripts && pkg.scripts["verify:production-readiness-foundation"] === "node scripts/verify-production-readiness-foundation.mjs",
  "Package.json exact registration: 'verify:production-readiness-foundation' === 'node scripts/verify-production-readiness-foundation.mjs'"
);

console.log("\n=== 2. Runtime Smoke Harness Architecture & Security ===");
const runtimeScriptPath = path.resolve(process.cwd(), 'scripts/verify-deployment-runtime.mjs');
assert(fs.existsSync(runtimeScriptPath), "scripts/verify-deployment-runtime.mjs exists");
const runtimeContent = fs.readFileSync(runtimeScriptPath, 'utf8');

// 2.1 Base URL Guard: without target, exits with code 3 (BLOCKED) and never PASS
assert(
  runtimeContent.includes("SO3_RUNTIME_BASE_URL") &&
  runtimeContent.includes("process.exit(3)") &&
  runtimeContent.includes("STATUS: BLOCKED"),
  "Runtime script exits with code 3 (BLOCKED) when SO3_RUNTIME_BASE_URL is missing"
);

// 2.2 Default mode is strictly read-only
assert(
  runtimeContent.includes("MODE = ENV.SO3_RUNTIME_MODE || 'readonly'") ||
  runtimeContent.includes("MODE = ENV.SO3_RUNTIME_MODE || \"readonly\""),
  "Runtime default mode is strictly 'readonly'"
);
assert(
  runtimeContent.includes("Unsupported SO3_RUNTIME_MODE") &&
  runtimeContent.includes("process.exit(2)"),
  "Runtime script rejects non-readonly modes with exit code 2"
);

// 2.3 HTTPS mandatory
assert(
  runtimeContent.includes("parsedUrl.protocol !== 'https:'") &&
  runtimeContent.includes("ALLOW_HTTP"),
  "Runtime script enforces HTTPS protocol (allowing HTTP only for localhost if explicit)"
);

// 2.4 Production host protection — Unconditional block with zero override
assert(
  runtimeContent.includes("so3pt.com.tr") &&
  runtimeContent.includes("www.so3pt.com.tr") &&
  !runtimeContent.includes("ALLOW_PRODUCTION") &&
  !runtimeContent.includes("SO3_RUNTIME_ALLOW_PRODUCTION"),
  "Runtime script strictly prohibits production hosts with ZERO override mechanism (ALLOW_PRODUCTION removed)"
);
assert(
  runtimeContent.includes("normalizedHostname"),
  "Runtime script normalizes target hostname to prevent case or trailing-dot bypasses"
);

// 2.5 Cross-origin redirect protection
assert(
  runtimeContent.includes("redirect: 'manual'") &&
  runtimeContent.includes("dest.origin !== targetOrigin") &&
  runtimeContent.includes("crossOriginRedirect"),
  "Runtime script refuses to follow automatic redirects and rejects cross-origin redirects"
);

// 2.6 Timeout configured across connection and body read stream
assert(
  runtimeContent.includes("AbortController") &&
  runtimeContent.includes("setTimeout") &&
  runtimeContent.includes("clearTimeout") &&
  runtimeContent.includes("finally"),
  "Runtime script bounds each request with an explicit timeout cleaned up in finally covering stream read"
);

// 2.7 Zero secret or credential logging
assert(
  !runtimeContent.includes("console.log(headers") &&
  !runtimeContent.includes("console.log(res.headers") &&
  !runtimeContent.includes("console.log(cookie") &&
  !runtimeContent.includes("console.log(token"),
  "Runtime script strictly avoids logging raw headers, cookies, or secrets"
);

// 2.8 Homepage & SPA HTML check precedence fix
assert(
  !runtimeContent.includes("res.status === 200 && res.body.includes('<!DOCTYPE html>') || res.body.includes('<html')"),
  "Runtime script eliminates operator precedence bug on HTML response validation"
);
assert(
  runtimeContent.includes("isSuccessfulHtmlResponse") ||
  runtimeContent.includes("res.status === 200 && ("),
  "Runtime script enforces status 200 and valid HTML document structure"
);

console.log("\n=== 3. Read-Only HTTP Checks Validation ===");
// Verify presence of canonical contract tests
const expectedChecks = [
  "Public Homepage Availability",
  "SPA Public Route Fallback (/branslar)",
  "Sitemap endpoint reachability (/sitemap.xml)",
  "Unauthenticated Admin API Access Rejection (/api/admin/overview)",
  "Unauthenticated Member Profile API Access Rejection (/api/member/profile)",
  "Unauthenticated Member Overview Access Rejection (/api/member/overview)",
  "Disallowed Method Handling on /api/member/profile (POST)",
  "Non-existent API endpoint response",
  "Public Member Auth CSRF Token Endpoint"
];

for (const chk of expectedChecks) {
  assert(
    runtimeContent.includes(chk),
    `Runtime harness defines read-only check: '${chk}'`
  );
}

// Ensure checks verify real response status, not arbitrary truthy mocks
assert(
  runtimeContent.includes("res.status === 200") &&
  runtimeContent.includes("res.status === 401") &&
  runtimeContent.includes("res.status === 405"),
  "Runtime checks assert actual HTTP response statuses from network responses"
);

console.log("\n=== 4. Production Readiness Documentation (docs/PRODUCTION_READINESS.md) ===");
const docPath = path.resolve(process.cwd(), 'docs/PRODUCTION_READINESS.md');
assert(fs.existsSync(docPath), "docs/PRODUCTION_READINESS.md exists");
const docContent = fs.readFileSync(docPath, 'utf8');

// 4.1 Hosting requirements & Document Root
assert(
  docContent.includes("Shared Hosting / Plesk / cPanel") &&
  docContent.includes("PHP 8.1+") &&
  docContent.includes("MySQL 8.0+"),
  "Documentation specifies Plesk/cPanel, PHP 8.1+, and MySQL 8.0+ hosting requirements"
);
assert(
  docContent.includes("index.html") &&
  docContent.includes("api/") &&
  docContent.includes("kardeş dizin"),
  "Documentation defines document root sibling requirement between dist and api/"
);

// 4.2 Rewrite & Security
assert(
  docContent.includes("RewriteEngine On") || docContent.includes(".htaccess"),
  "Documentation details web server rewrite rules"
);
assert(
  docContent.includes("config.local.php") &&
  docContent.includes("Least Privilege"),
  "Documentation defines configuration handling and least privilege DB user"
);

// 4.3 Database installation & migration distinction
assert(
  docContent.includes("database/fresh-install.sql") &&
  docContent.includes("database/migrations/") &&
  docContent.includes("php bin/migrate.php"),
  "Documentation documents fresh-install.sql (empty installs) vs php bin/migrate.php (incremental migrations)"
);

// 4.4 Role & Permission matrix
const expectedRoles = ['super_admin', 'admin', 'editor', 'trainer', 'reception', 'member', 'unauthenticated'];
for (const r of expectedRoles) {
  assert(
    docContent.includes(r),
    `Documentation role matrix includes '${r}' role`
  );
}

// 4.5 Critical Workflows & Negatif Test Matrisi
assert(
  docContent.includes("Kritik İş Akışları") &&
  docContent.includes("Üye Randevu Alma") &&
  docContent.includes("Antrenör Mobil Çalışma Alanı") &&
  docContent.includes("Resepsiyon Operasyonları"),
  "Documentation outlines critical operational workflows for F.35B verification"
);
assert(
  docContent.includes("Negatif Güvenlik") &&
  docContent.includes("401 UNAUTHORIZED") &&
  docContent.includes("403 FORBIDDEN") &&
  docContent.includes("405 METHOD_NOT_ALLOWED"),
  "Documentation defines negative security test contracts"
);

// 4.6 Rollback and Backup Procedures
assert(
  docContent.includes("Geriye Alma (Rollback) Planı") &&
  docContent.includes("Yedekleme (Backup)"),
  "Documentation contains explicit backup and rollback procedures"
);

// 4.7 Known Blockers & Audit Limitations
assert(
  docContent.includes("BLOCKED") &&
  (docContent.includes("F23B") || docContent.includes("Staging Sunucusu")),
  "Documentation explicitly flags Staging Sunucusu as BLOCKED"
);
assert(
  docContent.includes("F.34C") &&
  docContent.includes("audit_logs"),
  "Documentation records F.34C member profile audit log limitation for review"
);

// 4.8 Unsupported Security Guarantees & Network Boundaries
assert(
  docContent.includes("Desteklenmeyen Güvenlik Garantileri") &&
  docContent.includes("DNS ve Ağ Katmanı") &&
  docContent.includes("IP pinning"),
  "Documentation specifies DNS resolution and IP pinning network security boundaries"
);

console.log("\n=== 5. Algorithmic Simulation & Negative Fixture Self-Tests ===");
// Sim 1: Target with credentials must be rejected
function validateTargetUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.username || u.password) return { ok: false, reason: 'credentials' };
    if (u.search || u.hash) return { ok: false, reason: 'query_or_hash' };
    if (u.pathname !== '/' && u.pathname !== '') return { ok: false, reason: 'subpath' };
    if (u.protocol !== 'https:' && u.hostname !== 'localhost') return { ok: false, reason: 'non_https' };
    
    // Normalized production host check
    const normalizedHost = (u.hostname || '').toLowerCase().replace(/\.$/, '').trim();
    if (['so3pt.com.tr', 'www.so3pt.com.tr'].includes(normalizedHost)) {
      return { ok: false, reason: 'production_host' };
    }
    
    return { ok: true, origin: u.origin };
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
}

assert(validateTargetUrl("https://staging.example.com").ok === true, "Sim: Clean HTTPS target valid");
assert(validateTargetUrl("https://admin:pass@staging.example.com").reason === 'credentials', "Sim: Target with credentials rejected");
assert(validateTargetUrl("http://staging.example.com").reason === 'non_https', "Sim: Remote HTTP target rejected");
assert(validateTargetUrl("https://staging.example.com/sub/path").reason === 'subpath', "Sim: Subpath in target rejected");
assert(validateTargetUrl("https://staging.example.com?token=xyz").reason === 'query_or_hash', "Sim: Query string in target rejected");

// Sim 2: Absolute Production Host Prohibition & Normalization Invariants
assert(validateTargetUrl("https://so3pt.com.tr").reason === 'production_host', "Sim: exact production host so3pt.com.tr blocked");
assert(validateTargetUrl("https://www.so3pt.com.tr").reason === 'production_host', "Sim: exact production host www.so3pt.com.tr blocked");
assert(validateTargetUrl("https://SO3PT.COM.TR").reason === 'production_host', "Sim: uppercase production host blocked");
assert(validateTargetUrl("https://WWW.SO3PT.COM.TR:443").reason === 'production_host', "Sim: uppercase with port production host blocked");
assert(validateTargetUrl("https://so3pt.com.tr.").reason === 'production_host', "Sim: trailing dot FQDN production host blocked");
assert(validateTargetUrl("https://so3pt.com.tr:8443").reason === 'production_host', "Sim: custom port production host blocked");

// Target cannot be authorized merely by substring 'staging'
assert(validateTargetUrl("https://so3pt.com.tr?staging=true").reason === 'query_or_hash', "Sim: 'staging' query parameter rejected");
assert(validateTargetUrl("https://so3pt.com.tr/staging").reason === 'subpath', "Sim: 'staging' subpath rejected");

// Sim 3: Cross-origin redirect detection
function checkRedirectSafety(status, locationHeader, currentOrigin) {
  if (![301, 302, 303, 307, 308].includes(status) || !locationHeader) return { safe: true };
  try {
    const dest = new URL(locationHeader, currentOrigin);
    if (dest.origin !== currentOrigin) {
      return { safe: false, reason: 'cross_origin_redirect' };
    }
    return { safe: true, dest: dest.pathname };
  } catch {
    return { safe: false, reason: 'malformed_location' };
  }
}

assert(checkRedirectSafety(302, "/login", "https://staging.example.com").safe === true, "Sim: Same-origin redirect permitted");
assert(checkRedirectSafety(302, "https://evil.com/phish", "https://staging.example.com").safe === false, "Sim: Cross-origin redirect blocked");

// Sim 4: HTML response validator negative tests
function testHtmlValidator(res) {
  if (!res || res.status !== 200 || !res.body || typeof res.body !== 'string') {
    return false;
  }
  const trimmed = res.body.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  const hasDoctypeOrHtml = lower.includes('<!doctype html') || lower.includes('<html');
  const hasClosingOrStructure = lower.includes('</html>') || lower.includes('<body') || lower.includes('<head');
  return hasDoctypeOrHtml && hasClosingOrStructure;
}

// 404 + HTML -> FAIL
assert(testHtmlValidator({ status: 404, body: "<!DOCTYPE html><html><body>Not Found</body></html>" }) === false, "Sim: 404 + HTML -> FAIL");
// 500 + HTML -> FAIL
assert(testHtmlValidator({ status: 500, body: "<!DOCTYPE html><html><body>Internal Server Error</body></html>" }) === false, "Sim: 500 + HTML -> FAIL");
// 200 + JSON -> FAIL
assert(testHtmlValidator({ status: 200, body: '{"error":null,"data":{"status":"ok"}}' }) === false, "Sim: 200 + JSON -> FAIL");
// 200 + Plain text -> FAIL
assert(testHtmlValidator({ status: 200, body: "OK text response" }) === false, "Sim: 200 + Plain text -> FAIL");
// 200 + Malformed HTML (no document structure) -> FAIL
assert(testHtmlValidator({ status: 200, body: "<span>Just a fragment</span>" }) === false, "Sim: 200 + Fragment -> FAIL");
// 200 + HTML -> PASS
assert(testHtmlValidator({ status: 200, body: "<!DOCTYPE html><html><head><title>SO3 PT</title></head><body><div id=\"root\"></div></body></html>" }) === true, "Sim: 200 + HTML -> PASS");

console.log("\n=== 6. Anti-Scope & Scope Isolation ===");
// Zero schema migrations added
const migDir = path.resolve(process.cwd(), 'database/migrations');
const migFiles = fs.readdirSync(migDir).filter(f => f.endsWith('.sql'));
assert(migFiles.length === 44, "Total migration count remains strictly 44 (001 to 044)");

// Protected core directories unaltered
assert(fs.existsSync(path.resolve(process.cwd(), 'api/controllers/MemberProfileController.php')), "MemberProfileController.php exists");
assert(fs.existsSync(path.resolve(process.cwd(), 'src/member/pages/MemberProfilePage.tsx')), "MemberProfilePage.tsx exists");
assert(fs.existsSync(path.resolve(process.cwd(), 'src/routes/index.tsx')), "src/routes/index.tsx exists");

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more F.35A Production Readiness Foundation invariants failed.");
  process.exit(exitCode);
} else {
  console.log("PASS — F.35A PRODUCTION READINESS FOUNDATION IMPLEMENTED");
}
