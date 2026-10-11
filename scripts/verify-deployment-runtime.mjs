/**
 * Deployment Runtime Smoke Test Harness (SO3 PT — F.35A Security Corrective)
 *
 * Verifies real HTTP deployment behavior in a safe, repeatable, and strictly
 * read-only manner against an explicitly provided, authorized staging target.
 *
 * Requirements:
 * - Reads target from process.env.SO3_RUNTIME_BASE_URL
 * - If SO3_RUNTIME_BASE_URL is not set: Exits with code 3 (BLOCKED — runtime target not configured)
 * - Requires HTTPS protocol (unless localhost with SO3_RUNTIME_ALLOW_HTTP=true)
 * - Prohibits user credentials in target URL
 * - Unconditionally blocks production hosts (so3pt.com.tr, www.so3pt.com.tr) with zero override
 * - Default mode is strictly 'readonly' (SO3_RUNTIME_MODE)
 * - Prohibits cross-origin redirects
 * - Zero secret or sensitive header/cookie logging
 * - Timeout covers both request transmission and response body reading
 * - Read-only HTTP checks against actual route contracts with fail-closed status verification
 */

const ENV = process.env;
const BASE_URL = ENV.SO3_RUNTIME_BASE_URL;
const MODE = ENV.SO3_RUNTIME_MODE || 'readonly';
const ALLOW_HTTP = ENV.SO3_RUNTIME_ALLOW_HTTP === 'true';

// 1. Missing Target Guard — BLOCKED
if (!BASE_URL || !BASE_URL.trim()) {
  console.log("=======================================================");
  console.log("SO3 PT — Deployment Runtime Smoke Test Harness");
  console.log("=======================================================");
  console.log("STATUS: BLOCKED");
  console.log("REASON: SO3_RUNTIME_BASE_URL environment variable is not configured.");
  console.log("USAGE : SO3_RUNTIME_BASE_URL=\"https://staging.yourdomain.com\" npm run verify:deployment-runtime");
  console.log("NOTE  : Runtime smoke tests are never faked or assumed passing without a live target.");
  console.log("=======================================================");
  process.exit(3); // Code 3 = BLOCKED
}

// 2. Validate URL structure
let parsedUrl;
try {
  parsedUrl = new URL(BASE_URL.trim());
} catch (e) {
  console.error("❌ FAIL: Invalid SO3_RUNTIME_BASE_URL format.");
  process.exit(2);
}

// Prohibit credentials, query, fragments, path
if (parsedUrl.username || parsedUrl.password) {
  console.error("❌ FAIL: Target URL must NOT contain username or password credentials.");
  process.exit(2);
}
if (parsedUrl.search !== '' || parsedUrl.hash !== '') {
  console.error("❌ FAIL: Target URL must NOT contain query parameters or hash fragments.");
  process.exit(2);
}
if (parsedUrl.pathname !== '/' && parsedUrl.pathname !== '') {
  console.error("❌ FAIL: Target URL must NOT contain subpaths. Provide origin only (e.g. https://staging.example.com).");
  process.exit(2);
}

// 3. Protocol Guard — HTTPS required
const rawHostname = parsedUrl.hostname || '';
const isLocalhost = rawHostname === 'localhost' || rawHostname === '127.0.0.1';
if (parsedUrl.protocol !== 'https:' && !(isLocalhost && ALLOW_HTTP)) {
  console.error("❌ FAIL: Target URL must use HTTPS. (HTTP allowed only for localhost with SO3_RUNTIME_ALLOW_HTTP=true).");
  process.exit(2);
}

// 4. Production Host Guard — Strictly prohibited with zero override
const normalizedHostname = rawHostname.toLowerCase().replace(/\.$/, '').trim();
const blockedProductionHosts = ['so3pt.com.tr', 'www.so3pt.com.tr'];
if (blockedProductionHosts.includes(normalizedHostname)) {
  console.error(`❌ FAIL: Execution against production host '${rawHostname}' is strictly prohibited in this phase.`);
  console.error("Production testing is not permitted. Runtime smoke tests require an isolated staging environment.");
  process.exit(2);
}

// 5. Read-only Mode Guard
if (MODE !== 'readonly') {
  console.error(`❌ FAIL: Unsupported SO3_RUNTIME_MODE '${MODE}'. Only 'readonly' is permitted in F.35A.`);
  process.exit(2);
}

const targetOrigin = parsedUrl.origin;
console.log("=======================================================");
console.log(`SO3 PT — Deployment Runtime Smoke Test Harness`);
console.log(`Target: ${targetOrigin}`);
console.log(`Mode  : ${MODE}`);
console.log("=======================================================\n");

const results = [];
let passCount = 0;
let failCount = 0;

/**
 * Robust HTML Document Response Validator
 * Fails closed unless status is exactly 200, content is string, not JSON,
 * and contains valid HTML structure tags.
 */
function isSuccessfulHtmlResponse(res) {
  if (!res || res.status !== 200 || !res.body || typeof res.body !== 'string') {
    return false;
  }
  const trimmed = res.body.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return false; // Reject JSON payloads
  }
  const lower = trimmed.toLowerCase();
  const hasDoctypeOrHtml = lower.includes('<!doctype html') || lower.includes('<html');
  const hasClosingOrStructure = lower.includes('</html>') || lower.includes('<body') || lower.includes('<head');
  return hasDoctypeOrHtml && hasClosingOrStructure;
}

/**
 * Robust XML Sitemap Response Validator
 * Requires HTTP 200, string body, not JSON, and valid XML urlset tags.
 * Rejects 404, 500, or invalid XML.
 */
function isSuccessfulXmlResponse(res) {
  if (!res || res.status !== 200 || !res.body || typeof res.body !== 'string') {
    return false;
  }
  const trimmed = res.body.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return false; // Reject JSON payloads
  }
  const lower = trimmed.toLowerCase();
  const hasXmlOrUrlset = lower.includes('<?xml') || lower.includes('<urlset');
  const hasUrlsetEnd = lower.includes('</urlset>') || lower.includes('</sitemapindex>');
  return hasXmlOrUrlset && hasUrlsetEnd;
}

const ALLOWED_METHODS = ['GET', 'HEAD'];
const MAX_BODY_BYTES = 1048576; // 1 MiB (1,048,576 bytes)

function formatReceived(res) {
  if (!res) return 'HTTP 0 (INVALID_RESPONSE)';
  const statusPart = `HTTP ${res.status || 0}`;
  const errorPart = res.error ? ` (${res.error})` : '';
  return `${statusPart}${errorPart}`;
}

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  
  // Method allowlist guard: prevent any mutation method BEFORE fetch
  if (!ALLOWED_METHODS.includes(method)) {
    return {
      status: 0,
      headers: null,
      body: '',
      error: 'DISALLOWED_METHOD',
      crossOriginRedirect: false
    };
  }

  const fullUrl = new URL(path, targetOrigin).toString();
  const timeoutMs = options.timeoutMs || 8000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(fullUrl, {
      method,
      headers: {
        'Accept': 'application/json, text/html, application/xml, */*',
        ...(options.headers || {})
      },
      redirect: 'manual', // do not follow redirects automatically
      signal: controller.signal
    });

    // Cross-origin redirect protection
    const location = res.headers.get('location');
    if (location && [301, 302, 303, 307, 308].includes(res.status)) {
      try {
        const dest = new URL(location, targetOrigin);
        if (dest.origin !== targetOrigin) {
          return {
            status: res.status,
            crossOriginRedirect: true,
            error: 'CROSS_ORIGIN_REDIRECT',
            location: dest.origin, // only log origin, never full url with tokens
            body: '',
            headers: res.headers
          };
        }
      } catch {
        // invalid redirect location
      }
    }

    // Pre-check Content-Length header against 1 MiB limit
    const contentLengthHeader = res.headers.get('content-length');
    if (contentLengthHeader) {
      const parsedCl = parseInt(contentLengthHeader, 10);
      if (!Number.isNaN(parsedCl) && parsedCl > MAX_BODY_BYTES) {
        return {
          status: res.status,
          headers: res.headers,
          body: '',
          error: 'RESPONSE_TOO_LARGE',
          crossOriginRedirect: false
        };
      }
    }

    let bodyText = '';
    if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let totalBytes = 0;
      let chunks = '';
      let exceeded = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value.byteLength || value.length;
          if (totalBytes > MAX_BODY_BYTES) {
            exceeded = true;
            try {
              await reader.cancel();
            } catch {}
            break;
          }
          chunks += decoder.decode(value, { stream: true });
        }
        if (!exceeded) {
          chunks += decoder.decode(); // flush decoder
          bodyText = chunks;
        }
      } catch (streamErr) {
        try {
          await reader.cancel();
        } catch {}
        throw streamErr;
      }

      if (exceeded) {
        return {
          status: res.status,
          headers: res.headers,
          body: '',
          error: 'RESPONSE_TOO_LARGE',
          crossOriginRedirect: false
        };
      }
    }

    return {
      status: res.status,
      headers: res.headers,
      body: bodyText,
      crossOriginRedirect: false,
      error: null
    };
  } catch (err) {
    let errorCode = 'NETWORK_ERROR';
    if (err && (err.name === 'AbortError' || err.message === 'The operation was aborted.')) {
      errorCode = 'TIMEOUT';
    } else if (err instanceof TypeError) {
      errorCode = 'NETWORK_ERROR';
    } else if (err && err.name === 'SyntaxError') {
      errorCode = 'INVALID_RESPONSE';
    }
    return {
      error: errorCode,
      status: 0,
      body: '',
      headers: null,
      crossOriginRedirect: false
    };
  } finally {
    // Timeout covers both initial request and stream body read completion
    clearTimeout(timeoutId);
  }
}

function recordResult(name, status, expectedDesc, receivedDesc, passed) {
  if (passed) {
    passCount++;
    console.log(`✅ PASS: ${name}`);
    console.log(`   Expected: ${expectedDesc} | Received: ${receivedDesc}`);
  } else {
    failCount++;
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Expected: ${expectedDesc} | Received: ${receivedDesc}`);
  }
  results.push({ name, passed, status, expectedDesc, receivedDesc });
}

// Test Definitions (Strictly Read-Only HTTP Checks)
async function runSmokeTests() {
  // Test 1: Public Homepage
  {
    const res = await request('/');
    const ok = isSuccessfulHtmlResponse(res);
    recordResult(
      "Public Homepage Availability",
      res.status,
      "HTTP 200 with HTML document structure",
      formatReceived(res),
      ok
    );
  }

  // Test 2: Public SPA Route (Client-side route fallback to index.html)
  {
    const res = await request('/branslar');
    const ok = isSuccessfulHtmlResponse(res);
    recordResult(
      "SPA Public Route Fallback (/branslar)",
      res.status,
      "HTTP 200 with SPA HTML document structure",
      formatReceived(res),
      ok
    );
  }

  // Test 3: Public Robots / Sitemap Route (Canonical SEO endpoint via RewriteRule ^sitemap\.xml$ api/seo-sitemap.php)
  {
    const res = await request('/sitemap.xml');
    const ok = isSuccessfulXmlResponse(res);
    recordResult(
      "Sitemap endpoint reachability (/sitemap.xml)",
      res.status,
      "HTTP 200 with valid XML urlset document structure",
      formatReceived(res),
      ok
    );
  }

  // Test 4: Unauthenticated Admin Overview Protected Boundary
  {
    const res = await request('/api/admin/overview');
    const ok = res.status === 401;
    let hasEnvelope = false;
    try {
      const parsed = JSON.parse(res.body);
      hasEnvelope = parsed && parsed.error && parsed.error.code === 'UNAUTHORIZED';
    } catch {}
    recordResult(
      "Unauthenticated Admin API Access Rejection (/api/admin/overview)",
      res.status,
      "HTTP 401 with UNAUTHORIZED JSON envelope",
      formatReceived(res),
      ok && hasEnvelope
    );
  }

  // Test 5: Unauthenticated Member Profile Protected Boundary
  {
    const res = await request('/api/member/profile');
    const ok = res.status === 401;
    let hasEnvelope = false;
    try {
      const parsed = JSON.parse(res.body);
      hasEnvelope = parsed && parsed.error && parsed.error.code === 'UNAUTHORIZED';
    } catch {}
    recordResult(
      "Unauthenticated Member Profile API Access Rejection (/api/member/profile)",
      res.status,
      "HTTP 401 with UNAUTHORIZED JSON envelope",
      formatReceived(res),
      ok && hasEnvelope
    );
  }

  // Test 6: Unauthenticated Member Overview Protected Boundary
  {
    const res = await request('/api/member/overview');
    const ok = res.status === 401;
    recordResult(
      "Unauthenticated Member Overview Access Rejection (/api/member/overview)",
      res.status,
      "HTTP 401",
      formatReceived(res),
      ok
    );
  }

  // Test 7: Non-existent API Endpoint Clean 404
  {
    const res = await request('/api/non-existent-probe-endpoint-f35');
    const ok = res.status === 404 || res.status === 401;
    recordResult(
      "Non-existent API endpoint response (/api/non-existent-probe-endpoint-f35)",
      res.status,
      "HTTP 404 (or 401) without 500 server crash",
      formatReceived(res),
      ok && res.status !== 500
    );
  }

  // Test 8: Public Auth CSRF endpoint reachability
  {
    const res = await request('/api/member-auth/csrf');
    const ok = res.status === 200;
    let hasToken = false;
    try {
      const parsed = JSON.parse(res.body);
      hasToken = parsed && parsed.data && typeof parsed.data.csrf_token === 'string';
    } catch {}
    recordResult(
      "Public Member Auth CSRF Token Endpoint (/api/member-auth/csrf)",
      res.status,
      "HTTP 200 with data.csrf_token",
      formatReceived(res),
      ok && hasToken
    );
  }

  console.log("\n=======================================================");
  console.log(`Smoke Test Summary: ${passCount} Passed, ${failCount} Failed (Total ${results.length})`);
  console.log("=======================================================");

  if (failCount > 0) {
    console.error("❌ FAILED: One or more deployment runtime smoke checks failed.");
    process.exit(1);
  } else {
    console.log("PASS — All read-only deployment runtime checks succeeded.");
    process.exit(0);
  }
}

runSmokeTests();
