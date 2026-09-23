/**
 * Staging Admin-Realm Runtime Smoke Harness (Faz 7B.4G-F.23B)
 *
 * Verifies real HTTP staging deployment authorization boundaries:
 * - Anonymous auth boundaries
 * - Admin/super_admin matrix
 * - Reception matrix (including F.20C.2 notification firewall exemption)
 * - Trainer matrix (including F.20C generic inbox & trainer dashboard)
 * - Bounded notification path firewall enforcement
 * - Read-only smoke: zero business data mutations
 * - Never prints or logs secrets, passwords, cookies, or member PII
 */

const ENV = process.env;

const BASE_URL = ENV.SO3_VERIFY_BASE_URL;
const ADMIN_USER = ENV.SO3_VERIFY_ADMIN_USERNAME;
const ADMIN_PASS = ENV.SO3_VERIFY_ADMIN_PASSWORD;
const ADMIN_EXPECTED_ROLE = ENV.SO3_VERIFY_ADMIN_EXPECTED_ROLE;

const RECEPTION_USER = ENV.SO3_VERIFY_RECEPTION_USERNAME;
const RECEPTION_PASS = ENV.SO3_VERIFY_RECEPTION_PASSWORD;

const TRAINER_USER = ENV.SO3_VERIFY_TRAINER_USERNAME;
const TRAINER_PASS = ENV.SO3_VERIFY_TRAINER_PASSWORD;

// Validate required environment variables
const missingVars = [];
if (!BASE_URL) missingVars.push('SO3_VERIFY_BASE_URL');
if (!ADMIN_USER) missingVars.push('SO3_VERIFY_ADMIN_USERNAME');
if (!ADMIN_PASS) missingVars.push('SO3_VERIFY_ADMIN_PASSWORD');
if (!ADMIN_EXPECTED_ROLE) missingVars.push('SO3_VERIFY_ADMIN_EXPECTED_ROLE');
if (!RECEPTION_USER) missingVars.push('SO3_VERIFY_RECEPTION_USERNAME');
if (!RECEPTION_PASS) missingVars.push('SO3_VERIFY_RECEPTION_PASSWORD');
if (!TRAINER_USER) missingVars.push('SO3_VERIFY_TRAINER_USERNAME');
if (!TRAINER_PASS) missingVars.push('SO3_VERIFY_TRAINER_PASSWORD');

if (missingVars.length > 0) {
  console.error("Missing required environment variables for runtime verification:");
  for (const v of missingVars) {
    console.error(` - ${v}`);
  }
  console.error("\nRun this harness against a deployed staging environment with dedicated test accounts.");
  process.exit(2);
}

if (ADMIN_EXPECTED_ROLE !== 'admin' && ADMIN_EXPECTED_ROLE !== 'super_admin') {
  console.error("SO3_VERIFY_ADMIN_EXPECTED_ROLE must be 'admin' or 'super_admin'.");
  process.exit(2);
}

// Validate Base URL
let parsedUrl;
try {
  parsedUrl = new URL(BASE_URL);
} catch (e) {
  console.error("Invalid SO3_VERIFY_BASE_URL format.");
  process.exit(2);
}

if ((parsedUrl.pathname !== '/' && parsedUrl.pathname !== '') || parsedUrl.search !== '' || parsedUrl.hash !== '' || parsedUrl.username || parsedUrl.password) {
  console.error("SO3_VERIFY_BASE_URL must not contain path, query, fragment, or credentials.");
  process.exit(2);
}

if (parsedUrl.protocol !== 'https:' && !(parsedUrl.hostname === 'localhost' && ENV.SO3_VERIFY_ALLOW_HTTP === 'true')) {
  console.error("SO3_VERIFY_BASE_URL must use HTTPS unless localhost with SO3_VERIFY_ALLOW_HTTP=true.");
  process.exit(2);
}

// Production guard
const PRODUCTION_HOSTS = ['so3pt.com.tr', 'www.so3pt.com.tr'];
if (PRODUCTION_HOSTS.includes(parsedUrl.hostname.toLowerCase())) {
  if (ENV.SO3_VERIFY_ADMIN_CORE_ALLOW_PRODUCTION !== 'true') {
    console.error("PRODUCTION GUARD REFUSAL: Target host is recognized as production.");
    console.error("To override explicitly for manual verification, set SO3_VERIFY_ADMIN_CORE_ALLOW_PRODUCTION=true.");
    process.exit(2);
  }
}

const baseUrlStr = BASE_URL.replace(/\/$/, '');
const results = [];
let totalAssertions = 0;
let passedAssertions = 0;
let exitCode = 0;

function recordResult(name, expected, actual, passed, details = '') {
  totalAssertions++;
  if (passed) {
    passedAssertions++;
    console.log(`✅ PASS: ${name} (expected: ${expected}, actual: ${actual})`);
  } else {
    exitCode = 1;
    console.error(`❌ FAIL: ${name} (expected: ${expected}, actual: ${actual}${details ? ` - ${details}` : ''})`);
  }
  results.push({ name, expected, actual, passed });
}

// In-Memory Cookie Jar for Role Session Isolation
class CookieJar {
  constructor() {
    this.cookies = new Map();
    this.rawSetCookies = [];
  }

  absorbFromHeaders(headers) {
    let setCookieHeaders = [];
    if (typeof headers.getSetCookie === 'function') {
      setCookieHeaders = headers.getSetCookie();
    } else {
      const sc = headers.get('set-cookie');
      if (sc) setCookieHeaders = [sc];
    }

    for (const header of setCookieHeaders) {
      this.rawSetCookies.push(header);
      const parts = header.split(';').map(p => p.trim());
      if (parts.length === 0) continue;
      const firstPart = parts[0];
      const eqIdx = firstPart.indexOf('=');
      if (eqIdx === -1) continue;
      const name = firstPart.substring(0, eqIdx).trim();
      const value = firstPart.substring(eqIdx + 1).trim();

      let isExpired = false;
      if (value === '') isExpired = true;
      for (const attr of parts.slice(1)) {
        const lower = attr.toLowerCase();
        if (lower === 'max-age=0' || lower.startsWith('max-age=-')) {
          isExpired = true;
        }
      }

      if (isExpired) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  getCookieHeader() {
    if (this.cookies.size === 0) return '';
    const items = [];
    for (const [k, v] of this.cookies.entries()) {
      items.push(`${k}=${v}`);
    }
    return items.join('; ');
  }

  has(name) {
    return this.cookies.has(name);
  }
}

async function request(urlPath, options = {}, jar = null) {
  const url = baseUrlStr + urlPath;
  const headers = new Headers(options.headers || {});

  if (jar) {
    const cookieHdr = jar.getCookieHeader();
    if (cookieHdr) {
      headers.set('Cookie', cookieHdr);
    }
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(8000),
    body: options.body
  };

  try {
    const res = await fetch(url, fetchOptions);
    if (jar) {
      jar.absorbFromHeaders(res.headers);
    }

    const text = await res.text();
    let json = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('application/json')) {
      try {
        json = JSON.parse(text);
      } catch (e) {
        json = null;
      }
    }

    return {
      status: res.status,
      headers: res.headers,
      body: text,
      json,
      contentType
    };
  } catch (err) {
    return {
      status: 0,
      headers: new Headers(),
      body: '',
      json: null,
      contentType: '',
      error: err.message
    };
  }
}

async function loginRole(roleName, username, password, expectedRole) {
  const jar = new CookieJar();

  // 1. GET /api/auth/csrf
  const csrfRes = await request('/api/auth/csrf', { method: 'GET' }, jar);
  if (csrfRes.status !== 200 || !csrfRes.json || !csrfRes.json.data || typeof csrfRes.json.data.token !== 'string') {
    recordResult(`${roleName} CSRF fetch`, 200, csrfRes.status, false, 'Failed to obtain valid CSRF token');
    return null;
  }
  const csrfToken = csrfRes.json.data.token;

  // 2. POST /api/auth/login
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({ username, password })
  }, jar);

  const loginSuccess = loginRes.status === 200 &&
    loginRes.json &&
    loginRes.json.data &&
    Number.isInteger(loginRes.json.data.id) &&
    loginRes.json.data.id > 0 &&
    typeof loginRes.json.data.username === 'string' &&
    typeof loginRes.json.data.display_name === 'string' &&
    loginRes.json.data.role === expectedRole;

  recordResult(
    `${roleName} login status & identity verification`,
    `200 with role ${expectedRole}`,
    `${loginRes.status} (role: ${loginRes.json?.data?.role || 'none'})`,
    loginSuccess
  );

  if (!loginSuccess) {
    return null;
  }

  // 3. GET /api/auth/me to verify regenerated session
  const meRes = await request('/api/auth/me', { method: 'GET' }, jar);
  const meSuccess = meRes.status === 200 && meRes.json?.data?.role === expectedRole;
  recordResult(
    `${roleName} authenticated /api/auth/me session confirmation`,
    `200 with role ${expectedRole}`,
    `${meRes.status} (role: ${meRes.json?.data?.role || 'none'})`,
    meSuccess
  );

  return { jar, csrfToken };
}

async function logoutRole(roleName, jar) {
  // Fresh CSRF with authenticated cookie
  const csrfRes = await request('/api/auth/csrf', { method: 'GET' }, jar);
  const freshCsrf = csrfRes.json?.data?.token || '';

  // POST /api/auth/logout
  const logoutRes = await request('/api/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': freshCsrf
    },
    body: JSON.stringify({})
  }, jar);

  recordResult(
    `${roleName} logout status`,
    200,
    logoutRes.status,
    logoutRes.status === 200
  );

  // Verification: post-logout /api/auth/me must return 401
  const meRes = await request('/api/auth/me', { method: 'GET' }, jar);
  recordResult(
    `${roleName} post-logout /api/auth/me rejection`,
    401,
    meRes.status,
    meRes.status === 401
  );
}

console.log("==================================================================");
console.log(`SO3 Staging Admin-Realm Runtime Smoke Harness`);
console.log(`Target Host: ${parsedUrl.hostname}`);
console.log("==================================================================\n");

async function runSmoke() {
  console.log("=== 1. Anonymous Health, API Security Headers & Cookie Flags ===");

  const healthRes = await request('/api/health');
  recordResult(
    "Anonymous GET /api/health",
    200,
    healthRes.status,
    healthRes.status === 200 && healthRes.json?.data?.ok === true
  );

  // Security headers check on /api/health and /api/auth/csrf
  const nosniff = healthRes.headers.get('x-content-type-options') === 'nosniff';
  const xframe = healthRes.headers.get('x-frame-options') === 'DENY';
  const referrer = healthRes.headers.get('referrer-policy') === 'no-referrer';
  const cacheControl = (healthRes.headers.get('cache-control') || '').toLowerCase();
  const cacheSafe = cacheControl.includes('no-store') || cacheControl.includes('no-cache');

  recordResult(
    "API Security Header X-Content-Type-Options: nosniff",
    "nosniff",
    healthRes.headers.get('x-content-type-options') || 'none',
    nosniff
  );
  recordResult(
    "API Security Header X-Frame-Options: DENY",
    "DENY",
    healthRes.headers.get('x-frame-options') || 'none',
    xframe
  );
  recordResult(
    "API Security Header Referrer-Policy: no-referrer",
    "no-referrer",
    healthRes.headers.get('referrer-policy') || 'none',
    referrer
  );
  recordResult(
    "API Security Header Cache-Control: no-store / no-cache",
    "no-store/no-cache",
    healthRes.headers.get('cache-control') || 'none',
    cacheSafe
  );

  const anonJar = new CookieJar();
  const csrfRes = await request('/api/auth/csrf', { method: 'GET' }, anonJar);
  recordResult(
    "Anonymous GET /api/auth/csrf",
    200,
    csrfRes.status,
    csrfRes.status === 200 && Boolean(csrfRes.json?.data?.token)
  );

  // Cookie attribute check on HTTPS
  if (parsedUrl.protocol === 'https:') {
    const rawCookies = anonJar.rawSetCookies.join(' ');
    const hasAdminSession = /so3_admin_session=/i.test(rawCookies);
    const hasHttpOnly = /httponly/i.test(rawCookies);
    const hasPath = /path=\//i.test(rawCookies);
    recordResult(
      "Session cookie named so3_admin_session",
      true,
      hasAdminSession,
      hasAdminSession
    );
    recordResult(
      "Session cookie HttpOnly attribute",
      true,
      hasHttpOnly,
      hasHttpOnly
    );
    recordResult(
      "Session cookie Path=/ attribute",
      true,
      hasPath,
      hasPath
    );
  }

  console.log("\n=== 2. Anonymous Authorization Boundaries (Strict 401) ===");

  const anonMe = await request('/api/auth/me');
  recordResult("Anonymous GET /api/auth/me", 401, anonMe.status, anonMe.status === 401);

  const anonNotif = await request('/api/admin/notifications');
  recordResult("Anonymous GET /api/admin/notifications", 401, anonNotif.status, anonNotif.status === 401);

  const anonAnalytics = await request('/api/admin/analytics/operations?range=7d');
  recordResult("Anonymous GET /api/admin/analytics/operations", 401, anonAnalytics.status, anonAnalytics.status === 401);

  const anonRenewWatch = await request('/api/reception/renewal-watch');
  recordResult("Anonymous GET /api/reception/renewal-watch", 401, anonRenewWatch.status, anonRenewWatch.status === 401);

  const anonOccupancy = await request('/api/reception/occupancy');
  recordResult("Anonymous GET /api/reception/occupancy", 401, anonOccupancy.status, anonOccupancy.status === 401);

  const anonTrainerDash = await request('/api/trainer/dashboard');
  recordResult("Anonymous GET /api/trainer/dashboard", 401, anonTrainerDash.status, anonTrainerDash.status === 401);

  console.log("\n=== 3. Admin / Super Admin Authorization Matrix ===");

  const adminSession = await loginRole('Admin', ADMIN_USER, ADMIN_PASS, ADMIN_EXPECTED_ROLE);
  if (adminSession) {
    const jar = adminSession.jar;

    // 1. Notification Inbox
    const notifRes = await request('/api/admin/notifications?view=active&page=1&per_page=20', { method: 'GET' }, jar);
    const notifValid = notifRes.status === 200 &&
      notifRes.json &&
      notifRes.json.data &&
      Number.isInteger(notifRes.json.data.unread_count) &&
      notifRes.json.data.unread_count >= 0 &&
      notifRes.json.data.view === 'active' &&
      Array.isArray(notifRes.json.data.items) &&
      typeof notifRes.json.data.pagination === 'object';
    recordResult("Admin GET /api/admin/notifications", 200, notifRes.status, notifValid);

    // 2. Operations Analytics Read Model
    const analyticsRes = await request('/api/admin/analytics/operations?range=7d', { method: 'GET' }, jar);
    const analyticsValid = analyticsRes.status === 200 &&
      analyticsRes.json?.data?.range === '7d' &&
      analyticsRes.json?.data?.timezone === 'Europe/Istanbul' &&
      Array.isArray(analyticsRes.json?.data?.daily) &&
      analyticsRes.json.data.daily.length === 7 &&
      Boolean(analyticsRes.json?.data?.start_date) &&
      Boolean(analyticsRes.json?.data?.end_date);
    recordResult("Admin GET /api/admin/analytics/operations?range=7d", 200, analyticsRes.status, analyticsValid);

    // 3. Reception Occupancy
    const occRes = await request('/api/reception/occupancy', { method: 'GET' }, jar);
    recordResult("Admin GET /api/reception/occupancy", 200, occRes.status, occRes.status === 200);

    // 4. Reception Renewal Watch
    const rwRes = await request('/api/reception/renewal-watch?bucket=all&window_days=14&page=1&per_page=20', { method: 'GET' }, jar);
    recordResult("Admin GET /api/reception/renewal-watch", 200, rwRes.status, rwRes.status === 200);

    // 5. Trainer Dashboard Denial (Trainer only)
    const tdRes = await request('/api/trainer/dashboard', { method: 'GET' }, jar);
    recordResult("Admin GET /api/trainer/dashboard (denial)", 403, tdRes.status, tdRes.status === 403);

    await logoutRole('Admin', jar);
  }

  console.log("\n=== 4. Reception Authorization Matrix (F.20C.2 Proof & Boundaries) ===");

  const receptionSession = await loginRole('Reception', RECEPTION_USER, RECEPTION_PASS, 'reception');
  if (receptionSession) {
    const jar = receptionSession.jar;

    // 1. Reception Notification Inbox (Critical F.20C.2 Proof!)
    const notifRes = await request('/api/admin/notifications?view=active&page=1&per_page=20', { method: 'GET' }, jar);
    const notifValid = notifRes.status === 200 &&
      notifRes.json &&
      notifRes.json.data &&
      Number.isInteger(notifRes.json.data.unread_count) &&
      notifRes.json.data.unread_count >= 0 &&
      notifRes.json.data.view === 'active';
    recordResult(
      "Reception GET /api/admin/notifications (F.20C.2 exemption proof)",
      200,
      notifRes.status,
      notifValid,
      notifRes.status === 403 ? "REGRESSION: Broad admin firewall blocked reception notifications!" : ""
    );

    // 2. Reception Occupancy
    const occRes = await request('/api/reception/occupancy', { method: 'GET' }, jar);
    recordResult("Reception GET /api/reception/occupancy", 200, occRes.status, occRes.status === 200);

    // 3. Reception Renewal Watch
    const rwRes = await request('/api/reception/renewal-watch?bucket=all&window_days=14&page=1&per_page=20', { method: 'GET' }, jar);
    recordResult("Reception GET /api/reception/renewal-watch", 200, rwRes.status, rwRes.status === 200);

    // 4. Admin Dashboard Denial (Broad firewall preserved)
    const admDashRes = await request('/api/admin/dashboard', { method: 'GET' }, jar);
    recordResult("Reception GET /api/admin/dashboard (denial)", 403, admDashRes.status, admDashRes.status === 403);

    // 5. Operations Analytics Denial
    const admAnalyticsRes = await request('/api/admin/analytics/operations?range=7d', { method: 'GET' }, jar);
    recordResult("Reception GET /api/admin/analytics/operations (denial)", 403, admAnalyticsRes.status, admAnalyticsRes.status === 403);

    // 6. Trainer Dashboard Denial
    const tdRes = await request('/api/trainer/dashboard', { method: 'GET' }, jar);
    recordResult("Reception GET /api/trainer/dashboard (denial)", 403, tdRes.status, tdRes.status === 403);

    // Bounded Notification Firewall Checks
    const fooRes = await request('/api/admin/notifications/foo', { method: 'GET' }, jar);
    recordResult("Reception GET /api/admin/notifications/foo (firewall denied)", 403, fooRes.status, fooRes.status === 403);

    const evilRes = await request('/api/admin/notifications-evil', { method: 'GET' }, jar);
    recordResult("Reception GET /api/admin/notifications-evil (firewall denied)", 403, evilRes.status, evilRes.status === 403);

    const zeroIdRes = await request('/api/admin/notifications/01/read', { method: 'GET' }, jar);
    recordResult("Reception GET /api/admin/notifications/01/read (firewall denied)", 403, zeroIdRes.status, zeroIdRes.status === 403);

    const wrongMethodRes = await request('/api/admin/notifications/1/read', { method: 'GET' }, jar);
    recordResult("Reception GET /api/admin/notifications/1/read (exempted but method 404)", 404, wrongMethodRes.status, wrongMethodRes.status === 404);

    await logoutRole('Reception', jar);
  }

  console.log("\n=== 5. Trainer Authorization Matrix (Generic Inbox & Workspace) ===");

  const trainerSession = await loginRole('Trainer', TRAINER_USER, TRAINER_PASS, 'trainer');
  if (trainerSession) {
    const jar = trainerSession.jar;

    // 1. Generic Notification Inbox
    const notifRes = await request('/api/admin/notifications?view=active&page=1&per_page=20', { method: 'GET' }, jar);
    recordResult("Trainer GET /api/admin/notifications (generic admin-realm)", 200, notifRes.status, notifRes.status === 200);

    // 2. Trainer Dashboard
    const tdRes = await request('/api/trainer/dashboard', { method: 'GET' }, jar);
    recordResult("Trainer GET /api/trainer/dashboard", 200, tdRes.status, tdRes.status === 200);

    // 3. Admin Dashboard Denial
    const admDashRes = await request('/api/admin/dashboard', { method: 'GET' }, jar);
    recordResult("Trainer GET /api/admin/dashboard (denial)", 403, admDashRes.status, admDashRes.status === 403);

    // 4. Operations Analytics Denial
    const admAnalyticsRes = await request('/api/admin/analytics/operations?range=7d', { method: 'GET' }, jar);
    recordResult("Trainer GET /api/admin/analytics/operations (denial)", 403, admAnalyticsRes.status, admAnalyticsRes.status === 403);

    // 5. Reception Occupancy Denial
    const occRes = await request('/api/reception/occupancy', { method: 'GET' }, jar);
    recordResult("Trainer GET /api/reception/occupancy (denial)", 403, occRes.status, occRes.status === 403);

    // 6. Reception Renewal Watch Denial
    const rwRes = await request('/api/reception/renewal-watch', { method: 'GET' }, jar);
    recordResult("Trainer GET /api/reception/renewal-watch (denial)", 403, rwRes.status, rwRes.status === 403);

    await logoutRole('Trainer', jar);
  }

  console.log("\n==================================================================");
  console.log(`Execution Summary:`);
  console.log(`Base Host: ${parsedUrl.hostname}`);
  console.log(`Roles Tested: admin (${ADMIN_EXPECTED_ROLE}), reception, trainer`);
  console.log(`Total Checks: ${totalAssertions}`);
  console.log(`Passed: ${passedAssertions}`);
  console.log(`Failed: ${totalAssertions - passedAssertions}`);
  console.log("==================================================================");

  if (exitCode !== 0) {
    console.error("\n❌ FAILED: One or more staging runtime invariants failed.");
    process.exit(1);
  } else {
    console.log("\n✅ SUCCESS: All staging admin-realm runtime invariants verified.");
    process.exit(0);
  }
}

runSmoke().catch(err => {
  console.error("Unhandled runtime error during smoke test:", err.message);
  process.exit(1);
});
