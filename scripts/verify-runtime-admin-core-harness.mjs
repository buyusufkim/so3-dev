/**
 * Static Verification Harness for Staging Admin-Realm Runtime Smoke Verifier
 * (Faz 7B.4G-F.23B.1 — Runtime Transport & Cookie Hardening)
 *
 * Verifies that scripts/verify-runtime-admin-core.mjs is safe, sound, non-destructive,
 * strictly enforces credential secrecy, blocks production by default, validates
 * hardened HTTPS cookie attributes (Path=/, HttpOnly, Secure, SameSite=Strict),
 * enforces security headers on both /api/health and /api/auth/csrf, and validates
 * central non-redirect JSON API transport on all tested /api/* endpoints.
 */

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

console.log("=== 1. Self-Tests & Negative Invariant Tests ===");

// Negative test 1: Mutation Blacklist Detector
function detectForbiddenMutations(source) {
  const codeWithoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');

  const forbiddenCalls = [
    /renewal-notifications\/materialize/,
    /['"]\/api\/[a-z0-9\/-]*\/check-in['"]/,
    /['"]\/api\/[a-z0-9\/-]*\/check-out['"]/,
    /['"]\/api\/[a-z0-9\/-]*\/renew['"]/,
    /['"]\/api\/[a-z0-9\/-]*\/complete['"]/,
    /['"]\/api\/[a-z0-9\/-]*\/no-show['"]/,
    /['"]\/api\/[a-z0-9\/-]*\/reschedule['"]/,
    /['"]\/api\/[a-z0-9\/-]*\/cancel['"]/,
    /['"]\/api\/[a-z0-9\/-]*\/reset-password['"]/,
    /['"]\/api\/[a-z0-9\/-]*\/change-password['"]/,
    /(?:method:\s*['"]PATCH['"][\s\S]*?\/read|\/read[\s\S]*?method:\s*['"]PATCH['"])/,
    /(?:method:\s*['"]PATCH['"][\s\S]*?\/dismiss|\/dismiss[\s\S]*?method:\s*['"]PATCH['"])/
  ];

  for (const pattern of forbiddenCalls) {
    if (pattern.test(codeWithoutComments)) {
      return { forbidden: true, pattern: pattern.toString() };
    }
  }
  return { forbidden: false };
}

assert(
  detectForbiddenMutations("request('/api/reception/renewal-notifications/materialize', { method: 'POST' })").forbidden === true,
  "Self-test: Correctly detects materialize mutation call"
);
assert(
  detectForbiddenMutations("request('/api/reception/members/1/check-in', { method: 'POST' })").forbidden === true,
  "Self-test: Correctly detects check-in mutation call"
);
assert(
  detectForbiddenMutations("request('/api/admin/notifications/1/read', { method: 'PATCH' })").forbidden === true,
  "Self-test: Correctly detects PATCH /read mutation call"
);
assert(
  detectForbiddenMutations("request('/api/admin/notifications/1/read', { method: 'GET' })").forbidden === false,
  "Self-test: Safe GET on /read for firewall check is not flagged as forbidden mutation"
);

// Negative test 2: Credential / Secret Printing Detector
function detectSecretLogging(source) {
  const codeWithoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');

  const secretLogPatterns = [
    /console\.(log|error|warn|info)\s*\([^)]*(ADMIN_PASS|RECEPTION_PASS|TRAINER_PASS|password|csrfToken|freshCsrf|cookieHdr)/,
    /console\.(log|error|warn|info)\s*\([^)]*rawCookies/
  ];

  for (const pattern of secretLogPatterns) {
    if (pattern.test(codeWithoutComments)) {
      return { logsSecret: true, pattern: pattern.toString() };
    }
  }
  return { logsSecret: false };
}

assert(
  detectSecretLogging("console.log('User password:', ADMIN_PASS)").logsSecret === true,
  "Self-test: Detects password logging"
);
assert(
  detectSecretLogging("console.log('CSRF Token:', csrfToken)").logsSecret === true,
  "Self-test: Detects CSRF token logging"
);
assert(
  detectSecretLogging("console.log('Status:', loginRes.status)").logsSecret === false,
  "Self-test: Status code logging is permitted"
);

// Negative test 3: Deliberate Bad-Password Testing Detector
function detectBadPasswordTesting(source) {
  const codeWithoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');

  return /['"](wrong-password|badpass|invalid-password|foo-bar-pass)['"]/.test(codeWithoutComments) ||
    /loginRole\([^)]*['"]wrong['"]/i.test(codeWithoutComments);
}

assert(
  detectBadPasswordTesting("loginRole('admin', 'admin', 'wrong-password')") === true,
  "Self-test: Detects deliberate wrong-password invocation"
);
assert(
  detectBadPasswordTesting("loginRole('Admin', ADMIN_USER, ADMIN_PASS, ADMIN_EXPECTED_ROLE)") === false,
  "Self-test: Accepts valid environment credential invocation"
);

// Transport invariant simulation helper
function isJsonApiResponse(res) {
  if (!res) return false;
  const isRedirect = res.status >= 300 && res.status < 400;
  const isJsonType = typeof res.contentType === 'string' && res.contentType.toLowerCase().includes('application/json');
  return !isRedirect && isJsonType && res.jsonParsed === true;
}

// Transport contract self-tests
const resHtml403 = { status: 403, contentType: 'text/html', jsonParsed: false };
assert(
  isJsonApiResponse(resHtml403) === false,
  "Negative Self-Test: HTML 403 fails transport invariant despite status 403"
);

const resRedirect = { status: 302, contentType: 'application/json', jsonParsed: true };
assert(
  isJsonApiResponse(resRedirect) === false,
  "Negative Self-Test: Redirect 302 fails transport invariant"
);

const resInvalidJson = { status: 200, contentType: 'application/json', jsonParsed: false };
assert(
  isJsonApiResponse(resInvalidJson) === false,
  "Negative Self-Test: Invalid JSON syntax fails transport invariant"
);

const resValidJson403 = { status: 403, contentType: 'application/json; charset=utf-8', jsonParsed: true };
assert(
  isJsonApiResponse(resValidJson403) === true,
  "Positive Self-Test: Non-redirect application/json with valid parsed JSON passes transport invariant"
);

// Cookie attribute validator simulation helper
function validateAdminSessionCookieAttributes(setCookieHeader) {
  if (!setCookieHeader || typeof setCookieHeader !== 'string') {
    return {
      hasCookie: false,
      hasPath: false,
      hasHttpOnly: false,
      hasSecure: false,
      hasSameSiteStrict: false,
      valid: false
    };
  }

  const parts = setCookieHeader.split(';').map(p => p.trim());
  let hasPath = false;
  let hasHttpOnly = false;
  let hasSecure = false;
  let hasSameSiteStrict = false;

  for (let i = 1; i < parts.length; i++) {
    const lower = parts[i].toLowerCase();
    if (lower === 'path=/') {
      hasPath = true;
    } else if (lower === 'httponly') {
      hasHttpOnly = true;
    } else if (lower === 'secure') {
      hasSecure = true;
    } else if (lower === 'samesite=strict') {
      hasSameSiteStrict = true;
    }
  }

  return {
    hasCookie: true,
    hasPath,
    hasHttpOnly,
    hasSecure,
    hasSameSiteStrict,
    valid: hasPath && hasHttpOnly && hasSecure && hasSameSiteStrict
  };
}

// Cookie attribute self-tests
const validCookie = 'so3_admin_session=dummyVal123; Path=/; Secure; HttpOnly; SameSite=Strict';
const cookieRes1 = validateAdminSessionCookieAttributes(validCookie);
assert(cookieRes1.valid === true, "Self-Test: Valid HTTPS cookie (Path=/, HttpOnly, Secure, SameSite=Strict) passes");

const missingSecureCookie = 'so3_admin_session=dummyVal123; Path=/; HttpOnly; SameSite=Strict';
const cookieRes2 = validateAdminSessionCookieAttributes(missingSecureCookie);
assert(cookieRes2.hasSecure === false && cookieRes2.valid === false, "Self-Test: Missing Secure attribute fails cookie validation");

const wrongSameSiteCookie = 'so3_admin_session=dummyVal123; Path=/; Secure; HttpOnly; SameSite=Lax';
const cookieRes3 = validateAdminSessionCookieAttributes(wrongSameSiteCookie);
assert(cookieRes3.hasSameSiteStrict === false && cookieRes3.valid === false, "Self-Test: Wrong SameSite=Lax attribute fails cookie validation");

const wrongPathCookie = 'so3_admin_session=dummyVal123; Path=/admin; Secure; HttpOnly; SameSite=Strict';
const cookieRes4 = validateAdminSessionCookieAttributes(wrongPathCookie);
assert(cookieRes4.hasPath === false && cookieRes4.valid === false, "Self-Test: Wrong Path=/admin attribute fails cookie validation");

console.log("\n=== 2. Package.json Script Registration ===");

const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:runtime-admin-core"] === "node scripts/verify-runtime-admin-core.mjs",
  "Package.json exact script registration: 'verify:runtime-admin-core' === 'node scripts/verify-runtime-admin-core.mjs'"
);
assert(
  pkg.scripts && pkg.scripts["verify:runtime-admin-core-harness"] === "node scripts/verify-runtime-admin-core-harness.mjs",
  "Package.json exact script registration: 'verify:runtime-admin-core-harness' === 'node scripts/verify-runtime-admin-core-harness.mjs'"
);

console.log("\n=== 3. Repo Hygiene Checks ===");

const rootFiles = fs.readdirSync(process.cwd());
const forbiddenPatterns = [
  /^patch.*\.js$/, /^patch.*\.mjs$/, /^patch.*\.php$/,
  /^tmp.*\.js$/, /^tmp.*\.mjs$/, /^tmp.*\.php$/,
  /^\.env\.runtime$/, /^runtime-credentials\.json$/, /^fixture-passwords\./
];
const foundForbidden = rootFiles.filter(f => forbiddenPatterns.some(p => p.test(f)));
assert(
  foundForbidden.length === 0,
  `Repo hygiene: No temporary, patch, or credential artifacts in root (found: ${foundForbidden.join(', ')})`
);

console.log("\n=== 4. Runtime Verifier Source Inspection (verify-runtime-admin-core.mjs) ===");

const runtimeScriptPath = path.resolve(process.cwd(), 'scripts/verify-runtime-admin-core.mjs');
assert(fs.existsSync(runtimeScriptPath), "scripts/verify-runtime-admin-core.mjs exists");
const runtimeSource = fs.readFileSync(runtimeScriptPath, 'utf8');

// Environment variables
assert(runtimeSource.includes("SO3_VERIFY_BASE_URL"), "Uses SO3_VERIFY_BASE_URL");
assert(runtimeSource.includes("SO3_VERIFY_ADMIN_USERNAME"), "Requires SO3_VERIFY_ADMIN_USERNAME from env");
assert(runtimeSource.includes("SO3_VERIFY_ADMIN_PASSWORD"), "Requires SO3_VERIFY_ADMIN_PASSWORD from env");
assert(runtimeSource.includes("SO3_VERIFY_ADMIN_EXPECTED_ROLE"), "Requires SO3_VERIFY_ADMIN_EXPECTED_ROLE from env");
assert(runtimeSource.includes("SO3_VERIFY_RECEPTION_USERNAME"), "Requires SO3_VERIFY_RECEPTION_USERNAME from env");
assert(runtimeSource.includes("SO3_VERIFY_RECEPTION_PASSWORD"), "Requires SO3_VERIFY_RECEPTION_PASSWORD from env");
assert(runtimeSource.includes("SO3_VERIFY_TRAINER_USERNAME"), "Requires SO3_VERIFY_TRAINER_USERNAME from env");
assert(runtimeSource.includes("SO3_VERIFY_TRAINER_PASSWORD"), "Requires SO3_VERIFY_TRAINER_PASSWORD from env");

// Production Guard
assert(runtimeSource.includes("so3pt.com.tr"), "Recognizes so3pt.com.tr production host");
assert(runtimeSource.includes("www.so3pt.com.tr"), "Recognizes www.so3pt.com.tr production host");
assert(runtimeSource.includes("SO3_VERIFY_ADMIN_CORE_ALLOW_PRODUCTION"), "Guards production with SO3_VERIFY_ADMIN_CORE_ALLOW_PRODUCTION");
assert(
  /if\s*\(\s*PRODUCTION_HOSTS\.includes[\s\S]*?process\.exit\(\s*2\s*\)/.test(runtimeSource),
  "Production guard exits with code 2 on production hosts by default"
);

// HTTP & Connection Safety
assert(runtimeSource.includes("redirect: 'manual'"), "Enforces manual redirects (no silent HTML follows)");
assert(runtimeSource.includes("AbortSignal.timeout"), "Enforces bounded request timeouts");
assert(runtimeSource.includes("SO3_VERIFY_ALLOW_HTTP"), "Reuses SO3_VERIFY_ALLOW_HTTP for localhost");

// Hardened Cookie Attributes & Specific Extraction (Faz F.23B.1)
assert(runtimeSource.includes("class CookieJar"), "Defines in-memory CookieJar class");
assert(runtimeSource.includes("so3_admin_session"), "Targets canonical so3_admin_session cookie");
assert(/function\s+findSetCookieFor/.test(runtimeSource), "Defines specific findSetCookieFor helper");
assert(/function\s+validateAdminSessionCookieAttributes/.test(runtimeSource), "Defines validateAdminSessionCookieAttributes helper");
assert(
  /path=\//i.test(runtimeSource) && /httponly/i.test(runtimeSource) && /secure/i.test(runtimeSource) && /samesite=strict/i.test(runtimeSource),
  "Cookie attribute validator checks Path=/, HttpOnly, Secure, and SameSite=Strict"
);
assert(
  /hasSecure/i.test(runtimeSource) && /hasSameSiteStrict/i.test(runtimeSource),
  "Cookie validation asserts hasSecure and hasSameSiteStrict"
);

// Central Security Headers Validation (/api/health and /api/auth/csrf)
assert(/function\s+validateApiSecurityHeaders/.test(runtimeSource), "Defines central validateApiSecurityHeaders helper");
assert(
  /validateApiSecurityHeaders\([^)]*healthRes\.headers/i.test(runtimeSource) || /validateApiSecurityHeaders\([^)]*\/api\/health/i.test(runtimeSource),
  "Applies security headers validation to GET /api/health"
);
assert(
  /validateApiSecurityHeaders\([^)]*csrfRes\.headers/i.test(runtimeSource) || /validateApiSecurityHeaders\([^)]*\/api\/auth\/csrf/i.test(runtimeSource),
  "Applies security headers validation to GET /api/auth/csrf (Parity)"
);

// Central Non-Redirect JSON API Transport Contract
assert(/function\s+isJsonApiResponse/.test(runtimeSource), "Defines isJsonApiResponse transport helper");
assert(/jsonParsed/.test(runtimeSource), "Tracks jsonParsed boolean flag separately from json value");
assert(
  /res\.status\s*>=\s*300\s*&&\s*res\.status\s*<\s*400/.test(runtimeSource),
  "Rejects 300..399 HTTP redirects as transport violations"
);
assert(
  /urlPath\.startsWith\(['"]\/api\/['"]\)/.test(runtimeSource),
  "Central request() validates transport contract for all tested /api/* endpoints"
);

// CSRF & Login Flow
assert(runtimeSource.includes("/api/auth/csrf"), "Fetches /api/auth/csrf before login");
assert(runtimeSource.includes("X-CSRF-Token"), "Sets X-CSRF-Token header on mutations");
assert(runtimeSource.includes("/api/auth/login"), "Calls POST /api/auth/login");
assert(runtimeSource.includes("/api/auth/me"), "Verifies authenticated identity via /api/auth/me");
assert(runtimeSource.includes("/api/auth/logout"), "Calls POST /api/auth/logout with fresh CSRF token");

// Anonymous Boundaries (Strict 401 JSON)
assert(runtimeSource.includes("Anonymous GET /api/auth/me"), "Enforces anonymous /api/auth/me -> 401 JSON");
assert(runtimeSource.includes("Anonymous GET /api/admin/notifications"), "Enforces anonymous /api/admin/notifications -> 401 JSON");
assert(runtimeSource.includes("Anonymous GET /api/admin/analytics/operations"), "Enforces anonymous /api/admin/analytics/operations -> 401 JSON");
assert(runtimeSource.includes("Anonymous GET /api/reception/renewal-watch"), "Enforces anonymous /api/reception/renewal-watch -> 401 JSON");
assert(runtimeSource.includes("Anonymous GET /api/reception/occupancy"), "Enforces anonymous /api/reception/occupancy -> 401 JSON");
assert(runtimeSource.includes("Anonymous GET /api/trainer/dashboard"), "Enforces anonymous /api/trainer/dashboard -> 401 JSON");

// Reception F.20C.2 Proof & Admin Broad Firewall Preservation
assert(
  runtimeSource.includes("Reception GET /api/admin/notifications (F.20C.2 exemption proof)"),
  "Tests Reception GET /api/admin/notifications -> 200 (F.20C.2 proof)"
);
assert(
  runtimeSource.includes("Reception GET /api/admin/dashboard (denial)"),
  "Tests Reception GET /api/admin/dashboard -> 403 JSON (broad admin firewall preservation)"
);
assert(
  runtimeSource.includes("Reception GET /api/admin/analytics/operations (denial)"),
  "Tests Reception GET /api/admin/analytics/operations -> 403 JSON (broad admin firewall preservation)"
);

// Trainer Matrix
assert(
  runtimeSource.includes("Trainer GET /api/admin/notifications (generic admin-realm)"),
  "Tests Trainer GET /api/admin/notifications -> 200 JSON (F.20C generic inbox)"
);
assert(
  runtimeSource.includes("Trainer GET /api/trainer/dashboard"),
  "Tests Trainer GET /api/trainer/dashboard -> 200 JSON"
);
assert(
  runtimeSource.includes("Trainer GET /api/admin/dashboard (denial)"),
  "Tests Trainer GET /api/admin/dashboard -> 403 JSON"
);

// Admin Operations Analytics Read Model
assert(
  runtimeSource.includes("Admin GET /api/admin/analytics/operations?range=7d"),
  "Tests Admin GET /api/admin/analytics/operations?range=7d -> 200 JSON"
);

// Bounded Notification Firewall Checks
assert(
  runtimeSource.includes("/api/admin/notifications/foo"),
  "Tests invalid notification path /foo -> 403 JSON"
);
assert(
  runtimeSource.includes("/api/admin/notifications-evil"),
  "Tests invalid prefix /notifications-evil -> 403 JSON"
);
assert(
  runtimeSource.includes("/api/admin/notifications/01/read"),
  "Tests invalid ID format /01/read -> 403 JSON"
);
assert(
  runtimeSource.includes("/api/admin/notifications/1/read"),
  "Tests canonical path with wrong method GET /1/read -> 404 JSON"
);

// Safety: Forbidden Mutations Blacklist Check
const mutationCheck = detectForbiddenMutations(runtimeSource);
assert(
  mutationCheck.forbidden === false,
  `Safety check: Zero forbidden business mutations in runtime script (violation: ${mutationCheck.pattern || 'none'})`
);

// Safety: Credential Secrecy Check
const secretCheck = detectSecretLogging(runtimeSource);
assert(
  secretCheck.logsSecret === false,
  `Safety check: Zero credential/secret logging in runtime script (violation: ${secretCheck.pattern || 'none'})`
);

// Safety: No Wrong-Password Testing
const badPassCheck = detectBadPasswordTesting(runtimeSource);
assert(
  badPassCheck === false,
  "Safety check: Zero deliberate wrong-password or brute-force testing in runtime script"
);

console.log("\n=== 5. Documentation Invariants (DEPLOYMENT_PHP_MYSQL.md & DECISIONS.md) ===");

const deployDocPath = path.resolve(process.cwd(), 'DEPLOYMENT_PHP_MYSQL.md');
assert(fs.existsSync(deployDocPath), "DEPLOYMENT_PHP_MYSQL.md exists");
const deployDocSource = fs.readFileSync(deployDocPath, 'utf8');

assert(
  deployDocSource.includes("Admin-Realm Staging Runtime Verification"),
  "DEPLOYMENT_PHP_MYSQL.md contains 'Admin-Realm Staging Runtime Verification' section"
);
assert(
  deployDocSource.includes("SO3_VERIFY_ADMIN_CORE_ALLOW_PRODUCTION"),
  "DEPLOYMENT_PHP_MYSQL.md documents SO3_VERIFY_ADMIN_CORE_ALLOW_PRODUCTION override warning"
);

const decisionsPath = path.resolve(process.cwd(), 'DECISIONS.md');
assert(fs.existsSync(decisionsPath), "DECISIONS.md exists");
const decisionsSource = fs.readFileSync(decisionsPath, 'utf8');

assert(
  decisionsSource.includes("## F.23B Staging Admin-Realm Runtime Smoke Harness"),
  "DECISIONS.md contains section '## F.23B Staging Admin-Realm Runtime Smoke Harness'"
);

// Summary
console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more static harness invariants failed.");
  process.exit(1);
} else {
  console.log("✅ SUCCESS: All Static Runtime Harness invariants verified.");
  process.exit(0);
}
