/**
 * Staging Admin-Realm Runtime Smoke Harness (Faz 7B.4G-F.23B.2)
 *
 * Verifies real HTTP staging deployment authorization boundaries:
 * - Anonymous auth boundaries
 * - Admin/super_admin matrix
 * - Reception matrix (including F.20C.2 notification firewall exemption)
 * - Trainer matrix (including F.20C generic inbox & trainer dashboard)
 * - Bounded notification path firewall enforcement
 * - Dual security headers validation (/api/health and /api/auth/csrf)
 * - Initial session cookie attributes (Path=/, HttpOnly, Secure, SameSite=Strict)
 * - Post-login regenerated session cookie verification (Session::regenerate())
 * - Request-specific Set-Cookie isolation and reverse-traversal latest cookie selection
 * - Safe internal verification of session ID rotation (zero secret exposure)
 * - Central non-redirect JSON API transport validation for all tested /api/* responses
 * - Read-only smoke: zero business data mutations
 * - Never prints or logs secrets, passwords, cookies, session IDs, or member PII
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

// Latest Matching Set-Cookie Extractor (Reverse Traversal Authority)
function findLatestSetCookieFor(rawSetCookies, cookieName) {
  if (!Array.isArray(rawSetCookies)) return null;
  for (let i = rawSetCookies.length - 1; i >= 0; i--) {
    const sc = rawSetCookies[i];
    if (typeof sc !== 'string') continue;
    const parts = sc.split(';');
    if (parts.length === 0) continue;
    const firstPart = parts[0].trim();
    const eqIdx = firstPart.indexOf('=');
    if (eqIdx !== -1) {
      const name = firstPart.substring(0, eqIdx).trim();
      if (name === cookieName) {
        return sc;
      }
    }
  }
  return null;
}

// Internal Cookie Value Extractor (For non-logged rotation check)
function extractCookieValue(setCookieHeader, cookieName) {
  if (!setCookieHeader || typeof setCookieHeader !== 'string') return null;
  const parts = setCookieHeader.split(';');
  if (parts.length === 0) return null;
  const firstPart = parts[0].trim();
  const eqIdx = firstPart.indexOf('=');
  if (eqIdx !== -1) {
    const name = firstPart.substring(0, eqIdx).trim();
    if (name === cookieName) {
      return firstPart.substring(eqIdx + 1).trim();
    }
  }
  return null;
}

// Pure Session ID Rotation Comparator
function isCookieValueRotated(preLoginValue, postLoginValue) {
  if (!preLoginValue || !postLoginValue) return false;
  return preLoginValue !== postLoginValue;
}

// Bounded Cookie Attribute Validator (Zero secret output)
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

// Central Security Header Validator
function validateApiSecurityHeaders(headers, endpointLabel) {
  const nosniff = headers.get('x-content-type-options') === 'nosniff';
  const xframe = headers.get('x-frame-options') === 'DENY';
  const referrer = headers.get('referrer-policy') === 'no-referrer';
  const cacheControl = (headers.get('cache-control') || '').toLowerCase();
  const cacheSafe = cacheControl.includes('no-store') || cacheControl.includes('no-cache');

  recordResult(
    `${endpointLabel} Security Header X-Content-Type-Options: nosniff`,
    "nosniff",
    headers.get('x-content-type-options') || 'none',
    nosniff
  );
  recordResult(
    `${endpointLabel} Security Header X-Frame-Options: DENY`,
    "DENY",
    headers.get('x-frame-options') || 'none',
    xframe
  );
  recordResult(
    `${endpointLabel} Security Header Referrer-Policy: no-referrer`,
    "no-referrer",
    headers.get('referrer-policy') || 'none',
    referrer
  );
  recordResult(
    `${endpointLabel} Security Header Cache-Control: no-store / no-cache`,
    "no-store/no-cache",
    headers.get('cache-control') || 'none',
    cacheSafe
  );
}

// Transport Contract Check: non-redirect application/json with valid parsed JSON
function isJsonApiResponse(res) {
  if (!res) return false;
  const isRedirect = res.status >= 300 && res.status < 400;
  const isJsonType = typeof res.contentType === 'string' && res.contentType.toLowerCase().includes('application/json');
  return !isRedirect && isJsonType && res.jsonParsed === true;
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

  const method = options.method || 'GET';
  const fetchOptions = {
    method,
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

    let setCookieHeaders = [];
    if (typeof res.headers.getSetCookie === 'function') {
      setCookieHeaders = res.headers.getSetCookie();
    } else {
      const sc = res.headers.get('set-cookie');
      if (sc) setCookieHeaders = [sc];
    }

    const text = await res.text();
    let json = null;
    let jsonParsed = false;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('application/json')) {
      try {
        json = JSON.parse(text);
        jsonParsed = true;
      } catch (e) {
        json = null;
        jsonParsed = false;
      }
    }

    const responseObj = {
      status: res.status,
      headers: res.headers,
      body: text,
      json,
      jsonParsed,
      contentType,
      setCookies: setCookieHeaders
    };

    // Central API Transport Validation for every tested /api/* response
    if (urlPath.startsWith('/api/')) {
      const isRedirect = res.status >= 300 && res.status < 400;
      const isJsonType = contentType.toLowerCase().includes('application/json');

      if (isRedirect) {
        recordResult(
          `API transport ${method} ${urlPath}`,
          "non-redirect application/json",
          `${res.status} redirect`,
          false
        );
      } else if (!isJsonType) {
        const safeType = contentType ? contentType.split(';')[0].trim() : 'empty';
        recordResult(
          `API transport ${method} ${urlPath}`,
          "non-redirect application/json",
          `${res.status} ${safeType}`,
          false
        );
      } else if (!jsonParsed) {
        recordResult(
          `API transport ${method} ${urlPath}`,
          "valid parseable JSON",
          `${res.status} invalid JSON syntax`,
          false
        );
      }
    }

    return responseObj;
  } catch (err) {
    if (urlPath.startsWith('/api/')) {
      recordResult(
        `API transport ${method} ${urlPath}`,
        "network success",
        `network failure: ${err.message}`,
        false
      );
    }
    return {
      status: 0,
      headers: new Headers(),
      body: '',
      json: null,
      jsonParsed: false,
      contentType: '',
      setCookies: [],
      error: err.message
    };
  }
}

async function loginRole(roleName, username, password, expectedRole) {
  const jar = new CookieJar();

  // 1. GET /api/auth/csrf
  const csrfRes = await request('/api/auth/csrf', { method: 'GET' }, jar);
  if (csrfRes.status !== 200 || !isJsonApiResponse(csrfRes) || !csrfRes.json || !csrfRes.json.data || typeof csrfRes.json.data.token !== 'string') {
    recordResult(`${roleName} CSRF fetch`, "200 JSON with token", `${csrfRes.status}`, false, 'Failed to obtain valid CSRF token');
    return null;
  }
  const csrfToken = csrfRes.json.data.token;

  // Capture pre-login session cookie value internally for rotation check (never logged)
  const preLoginHeader = findLatestSetCookieFor(csrfRes.setCookies, 'so3_admin_session') ||
                         findLatestSetCookieFor(jar.rawSetCookies, 'so3_admin_session');
  const preLoginValue = extractCookieValue(preLoginHeader, 'so3_admin_session');

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
    isJsonApiResponse(loginRes) &&
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

  // Request-specific regenerated session cookie verification (POST /api/auth/login)
  const regeneratedHeader = findLatestSetCookieFor(loginRes.setCookies, 'so3_admin_session');
  const regeneratedExists = Boolean(regeneratedHeader);

  recordResult(
    `${roleName} regenerated session cookie exists`,
    true,
    regeneratedExists,
    regeneratedExists
  );

  // Rotation validation if pre-login value was captured
  if (regeneratedHeader && preLoginValue) {
    const postLoginValue = extractCookieValue(regeneratedHeader, 'so3_admin_session');
    const rotated = isCookieValueRotated(preLoginValue, postLoginValue);
    recordResult(
      `${roleName} session ID rotated upon login`,
      true,
      rotated,
      rotated
    );
  }

  // Validate hardened cookie attributes on HTTPS post-login
  if (parsedUrl.protocol === 'https:') {
    const regeneratedAttr = validateAdminSessionCookieAttributes(regeneratedHeader);
    recordResult(
      `${roleName} regenerated session cookie Path=/ attribute`,
      true,
      regeneratedAttr.hasPath,
      regeneratedAttr.hasPath
    );
    recordResult(
      `${roleName} regenerated session cookie HttpOnly attribute`,
      true,
      regeneratedAttr.hasHttpOnly,
      regeneratedAttr.hasHttpOnly
    );
    recordResult(
      `${roleName} regenerated session cookie Secure attribute`,
      true,
      regeneratedAttr.hasSecure,
      regeneratedAttr.hasSecure
    );
    recordResult(
      `${roleName} regenerated session cookie SameSite=Strict attribute`,
      true,
      regeneratedAttr.hasSameSiteStrict,
      regeneratedAttr.hasSameSiteStrict
    );
  }

  // 3. GET /api/auth/me to verify regenerated session
  const meRes = await request('/api/auth/me', { method: 'GET' }, jar);
  const meSuccess = meRes.status === 200 && isJsonApiResponse(meRes) && meRes.json?.data?.role === expectedRole;
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
    "200 JSON",
    `${logoutRes.status}`,
    logoutRes.status === 200 && isJsonApiResponse(logoutRes)
  );

  // Verification: post-logout /api/auth/me must return 401
  const meRes = await request('/api/auth/me', { method: 'GET' }, jar);
  recordResult(
    `${roleName} post-logout /api/auth/me rejection`,
    "401 JSON",
    `${meRes.status}`,
    meRes.status === 401 && isJsonApiResponse(meRes)
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
    "200 JSON",
    `${healthRes.status}`,
    healthRes.status === 200 && isJsonApiResponse(healthRes) && healthRes.json?.data?.ok === true
  );

  // Security headers check on /api/health
  validateApiSecurityHeaders(healthRes.headers, "GET /api/health");

  const anonJar = new CookieJar();
  const csrfRes = await request('/api/auth/csrf', { method: 'GET' }, anonJar);
  recordResult(
    "Anonymous GET /api/auth/csrf",
    "200 JSON",
    `${csrfRes.status}`,
    csrfRes.status === 200 && isJsonApiResponse(csrfRes) && Boolean(csrfRes.json?.data?.token)
  );

  // Security headers check on /api/auth/csrf (Parity enforcement)
  validateApiSecurityHeaders(csrfRes.headers, "GET /api/auth/csrf");

  // Specific session cookie attribute check on HTTPS
  if (parsedUrl.protocol === 'https:') {
    const adminSessionHeader = findLatestSetCookieFor(csrfRes.setCookies, 'so3_admin_session') ||
                               findLatestSetCookieFor(anonJar.rawSetCookies, 'so3_admin_session');
    const cookieAttr = validateAdminSessionCookieAttributes(adminSessionHeader);

    recordResult(
      "Session cookie named so3_admin_session exists",
      true,
      cookieAttr.hasCookie,
      cookieAttr.hasCookie
    );
    recordResult(
      "Session cookie Path=/ attribute",
      true,
      cookieAttr.hasPath,
      cookieAttr.hasPath
    );
    recordResult(
      "Session cookie HttpOnly attribute",
      true,
      cookieAttr.hasHttpOnly,
      cookieAttr.hasHttpOnly
    );
    recordResult(
      "Session cookie Secure attribute",
      true,
      cookieAttr.hasSecure,
      cookieAttr.hasSecure
    );
    recordResult(
      "Session cookie SameSite=Strict attribute",
      true,
      cookieAttr.hasSameSiteStrict,
      cookieAttr.hasSameSiteStrict
    );
  }

  console.log("\n=== 2. Anonymous Authorization Boundaries (Strict 401 JSON) ===");

  const anonMe = await request('/api/auth/me');
  recordResult("Anonymous GET /api/auth/me", "401 JSON", `${anonMe.status}`, anonMe.status === 401 && isJsonApiResponse(anonMe));

  const anonNotif = await request('/api/admin/notifications');
  recordResult("Anonymous GET /api/admin/notifications", "401 JSON", `${anonNotif.status}`, anonNotif.status === 401 && isJsonApiResponse(anonNotif));

  const anonAnalytics = await request('/api/admin/analytics/operations?range=7d');
  recordResult("Anonymous GET /api/admin/analytics/operations", "401 JSON", `${anonAnalytics.status}`, anonAnalytics.status === 401 && isJsonApiResponse(anonAnalytics));

  const anonRenewWatch = await request('/api/reception/renewal-watch');
  recordResult("Anonymous GET /api/reception/renewal-watch", "401 JSON", `${anonRenewWatch.status}`, anonRenewWatch.status === 401 && isJsonApiResponse(anonRenewWatch));

  const anonOccupancy = await request('/api/reception/occupancy');
  recordResult("Anonymous GET /api/reception/occupancy", "401 JSON", `${anonOccupancy.status}`, anonOccupancy.status === 401 && isJsonApiResponse(anonOccupancy));

  const anonTrainerDash = await request('/api/trainer/dashboard');
  recordResult("Anonymous GET /api/trainer/dashboard", "401 JSON", `${anonTrainerDash.status}`, anonTrainerDash.status === 401 && isJsonApiResponse(anonTrainerDash));

  console.log("\n=== 3. Admin / Super Admin Authorization Matrix ===");

  const adminSession = await loginRole('Admin', ADMIN_USER, ADMIN_PASS, ADMIN_EXPECTED_ROLE);
  if (adminSession) {
    const jar = adminSession.jar;

    // 1. Notification Inbox
    const notifRes = await request('/api/admin/notifications?view=active&page=1&per_page=20', { method: 'GET' }, jar);
    const notifValid = notifRes.status === 200 &&
      isJsonApiResponse(notifRes) &&
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
      isJsonApiResponse(analyticsRes) &&
      analyticsRes.json?.data?.range === '7d' &&
      analyticsRes.json?.data?.timezone === 'Europe/Istanbul' &&
      Array.isArray(analyticsRes.json?.data?.daily) &&
      analyticsRes.json.data.daily.length === 7 &&
      Boolean(analyticsRes.json?.data?.start_date) &&
      Boolean(analyticsRes.json?.data?.end_date);
    recordResult("Admin GET /api/admin/analytics/operations?range=7d", 200, analyticsRes.status, analyticsValid);

    // 3. Reception Occupancy
    const occRes = await request('/api/reception/occupancy', { method: 'GET' }, jar);
    recordResult("Admin GET /api/reception/occupancy", 200, occRes.status, occRes.status === 200 && isJsonApiResponse(occRes));

    // 4. Reception Renewal Watch
    const rwRes = await request('/api/reception/renewal-watch?bucket=all&window_days=14&page=1&per_page=20', { method: 'GET' }, jar);
    recordResult("Admin GET /api/reception/renewal-watch", 200, rwRes.status, rwRes.status === 200 && isJsonApiResponse(rwRes));

    // 5. Trainer Dashboard Denial (Trainer only)
    const tdRes = await request('/api/trainer/dashboard', { method: 'GET' }, jar);
    recordResult("Admin GET /api/trainer/dashboard (denial)", "403 JSON", `${tdRes.status}`, tdRes.status === 403 && isJsonApiResponse(tdRes));

    await logoutRole('Admin', jar);
  }

  console.log("\n=== 4. Reception Authorization Matrix (F.20C.2 Proof & Boundaries) ===");

  const receptionSession = await loginRole('Reception', RECEPTION_USER, RECEPTION_PASS, 'reception');
  if (receptionSession) {
    const jar = receptionSession.jar;

    // 1. Reception Notification Inbox (Critical F.20C.2 Proof!)
    const notifRes = await request('/api/admin/notifications?view=active&page=1&per_page=20', { method: 'GET' }, jar);
    const notifValid = notifRes.status === 200 &&
      isJsonApiResponse(notifRes) &&
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
    recordResult("Reception GET /api/reception/occupancy", 200, occRes.status, occRes.status === 200 && isJsonApiResponse(occRes));

    // 3. Reception Renewal Watch
    const rwRes = await request('/api/reception/renewal-watch?bucket=all&window_days=14&page=1&per_page=20', { method: 'GET' }, jar);
    recordResult("Reception GET /api/reception/renewal-watch", 200, rwRes.status, rwRes.status === 200 && isJsonApiResponse(rwRes));

    // 4. Admin Dashboard Denial (Broad firewall preserved)
    const admDashRes = await request('/api/admin/dashboard', { method: 'GET' }, jar);
    recordResult("Reception GET /api/admin/dashboard (denial)", "403 JSON", `${admDashRes.status}`, admDashRes.status === 403 && isJsonApiResponse(admDashRes));

    // 5. Operations Analytics Denial
    const admAnalyticsRes = await request('/api/admin/analytics/operations?range=7d', { method: 'GET' }, jar);
    recordResult("Reception GET /api/admin/analytics/operations (denial)", "403 JSON", `${admAnalyticsRes.status}`, admAnalyticsRes.status === 403 && isJsonApiResponse(admAnalyticsRes));

    // 6. Trainer Dashboard Denial
    const tdRes = await request('/api/trainer/dashboard', { method: 'GET' }, jar);
    recordResult("Reception GET /api/trainer/dashboard (denial)", "403 JSON", `${tdRes.status}`, tdRes.status === 403 && isJsonApiResponse(tdRes));

    // Bounded Notification Firewall Checks
    const fooRes = await request('/api/admin/notifications/foo', { method: 'GET' }, jar);
    recordResult("Reception GET /api/admin/notifications/foo (firewall denied)", "403 JSON", `${fooRes.status}`, fooRes.status === 403 && isJsonApiResponse(fooRes));

    const evilRes = await request('/api/admin/notifications-evil', { method: 'GET' }, jar);
    recordResult("Reception GET /api/admin/notifications-evil (firewall denied)", "403 JSON", `${evilRes.status}`, evilRes.status === 403 && isJsonApiResponse(evilRes));

    const zeroIdRes = await request('/api/admin/notifications/01/read', { method: 'GET' }, jar);
    recordResult("Reception GET /api/admin/notifications/01/read (firewall denied)", "403 JSON", `${zeroIdRes.status}`, zeroIdRes.status === 403 && isJsonApiResponse(zeroIdRes));

    const wrongMethodRes = await request('/api/admin/notifications/1/read', { method: 'GET' }, jar);
    recordResult("Reception GET /api/admin/notifications/1/read (exempted but method 404)", "404 JSON", `${wrongMethodRes.status}`, wrongMethodRes.status === 404 && isJsonApiResponse(wrongMethodRes));

    await logoutRole('Reception', jar);
  }

  console.log("\n=== 5. Trainer Authorization Matrix (Generic Inbox & Workspace) ===");

  const trainerSession = await loginRole('Trainer', TRAINER_USER, TRAINER_PASS, 'trainer');
  if (trainerSession) {
    const jar = trainerSession.jar;

    // 1. Generic Notification Inbox
    const notifRes = await request('/api/admin/notifications?view=active&page=1&per_page=20', { method: 'GET' }, jar);
    recordResult("Trainer GET /api/admin/notifications (generic admin-realm)", 200, notifRes.status, notifRes.status === 200 && isJsonApiResponse(notifRes));

    // 2. Trainer Dashboard
    const tdRes = await request('/api/trainer/dashboard', { method: 'GET' }, jar);
    recordResult("Trainer GET /api/trainer/dashboard", 200, tdRes.status, tdRes.status === 200 && isJsonApiResponse(tdRes));

    // 3. Admin Dashboard Denial
    const admDashRes = await request('/api/admin/dashboard', { method: 'GET' }, jar);
    recordResult("Trainer GET /api/admin/dashboard (denial)", "403 JSON", `${admDashRes.status}`, admDashRes.status === 403 && isJsonApiResponse(admDashRes));

    // 4. Operations Analytics Denial
    const admAnalyticsRes = await request('/api/admin/analytics/operations?range=7d', { method: 'GET' }, jar);
    recordResult("Trainer GET /api/admin/analytics/operations (denial)", "403 JSON", `${admAnalyticsRes.status}`, admAnalyticsRes.status === 403 && isJsonApiResponse(admAnalyticsRes));

    // 5. Reception Occupancy Denial
    const occRes = await request('/api/reception/occupancy', { method: 'GET' }, jar);
    recordResult("Trainer GET /api/reception/occupancy (denial)", "403 JSON", `${occRes.status}`, occRes.status === 403 && isJsonApiResponse(occRes));

    // 6. Reception Renewal Watch Denial
    const rwRes = await request('/api/reception/renewal-watch', { method: 'GET' }, jar);
    recordResult("Trainer GET /api/reception/renewal-watch (denial)", "403 JSON", `${rwRes.status}`, rwRes.status === 403 && isJsonApiResponse(rwRes));

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
