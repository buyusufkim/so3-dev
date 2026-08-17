const ENV = process.env;

const BASE_URL = ENV.SO3_VERIFY_BASE_URL;
const PUBLISHED_SLUG = ENV.SO3_VERIFY_PUBLISHED_SLUG;
const NONPUBLIC_SLUG = ENV.SO3_VERIFY_NONPUBLIC_SLUG;
const MISSING_SLUG = ENV.SO3_VERIFY_MISSING_SLUG;

if (!BASE_URL || !PUBLISHED_SLUG || !NONPUBLIC_SLUG || !MISSING_SLUG) {
  console.error("Missing required environment variables:");
  console.error("SO3_VERIFY_BASE_URL, SO3_VERIFY_PUBLISHED_SLUG, SO3_VERIFY_NONPUBLIC_SLUG, SO3_VERIFY_MISSING_SLUG");
  process.exit(2);
}

let parsedUrl;
try {
  parsedUrl = new URL(BASE_URL);
} catch (e) {
  console.error("Invalid BASE_URL.");
  process.exit(2);
}

if (parsedUrl.pathname !== '/' || parsedUrl.search !== '' || parsedUrl.hash !== '' || parsedUrl.username || parsedUrl.password) {
  console.error("BASE_URL must not contain path, query, fragment, or credentials.");
  process.exit(2);
}

if (parsedUrl.protocol !== 'https:' && !(parsedUrl.hostname === 'localhost' && ENV.SO3_VERIFY_ALLOW_HTTP === 'true')) {
  console.error("BASE_URL must use HTTPS unless localhost with SO3_VERIFY_ALLOW_HTTP=true.");
  process.exit(2);
}

const baseUrlStr = BASE_URL.replace(/\/$/, '');
const results = [];

async function fetchUrl(urlPath, method = 'GET') {
  const url = baseUrlStr + urlPath;
  const options = {
    method,
    redirect: 'manual',
    signal: AbortSignal.timeout(5000)
  };
  try {
    const res = await fetch(url, options);
    const body = await res.text();
    return {
      status: res.status,
      headers: res.headers,
      body,
      ok: res.ok,
      redirected: res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)
    };
  } catch (e) {
    return { error: e.message };
  }
}

function addResult(name, expectedStr, actualStr, passed) {
  results.push({ name, expected: expectedStr, actual: actualStr, passed });
}

function checkNoSessionCookie(headers) {
  const setCookie = headers.get('set-cookie') || '';
  return !setCookie.includes('so3_admin_session');
}

async function runChecks() {
  let allPassed = true;

  // 1. Published Event
  const pubPath = `/etkinlikler/${PUBLISHED_SLUG}`;
  let res = await fetchUrl(pubPath, 'GET');
  let passed = !res.error && res.status === 200;
  addResult('Published GET status', '200', res.error || res.status, passed);

  if (passed) {
    const cType = res.headers.get('content-type') || '';
    passed = cType.includes('text/html');
    addResult('Published Content-Type', 'text/html', cType, passed);

    passed = checkNoSessionCookie(res.headers);
    addResult('Published No Session', 'true', passed ? 'true' : 'false', passed);

    passed = res.body.includes('index, follow');
    addResult('Published contains index, follow', 'true', passed ? 'true' : 'false', passed);

    const canonicalUrl = `https://so3pt.com.tr/etkinlikler/${PUBLISHED_SLUG}`;
    passed = res.body.includes(`canonical" href="${canonicalUrl}"`);
    addResult('Published canonical URL', 'true', passed ? 'true' : 'false', passed);

    passed = !res.body.includes('Build not found');
    addResult('Published no Build not found', 'true', passed ? 'true' : 'false', passed);

    const countTitle = (res.body.match(/<title>/g) || []).length;
    const countCanonical = (res.body.match(/<link rel="canonical"/g) || []).length;
    const countRobots = (res.body.match(/<meta name="robots"/g) || []).length;
    passed = countTitle === 1 && countCanonical === 1 && countRobots === 1;
    addResult('Published exact tags count', '1 title, 1 canonical, 1 robots', `${countTitle} title, ${countCanonical} canonical, ${countRobots} robots`, passed);
  }

  // Published Event HEAD
  res = await fetchUrl(pubPath, 'HEAD');
  passed = !res.error && res.status === 200;
  addResult('Published HEAD status', '200', res.error || res.status, passed);
  if (passed) {
    const cType = res.headers.get('content-type') || '';
    passed = cType.includes('text/html') && res.body.length === 0;
    addResult('Published HEAD Content-Type & empty body', 'text/html + empty', `${cType} + len:${res.body.length}`, passed);
  }

  // 2. Nonpublic Event
  const nonPubPath = `/etkinlikler/${NONPUBLIC_SLUG}`;
  res = await fetchUrl(nonPubPath, 'GET');
  passed = !res.error && res.status === 404;
  addResult('Nonpublic GET status', '404', res.error || res.status, passed);
  if (passed) {
    passed = res.body.includes('noindex');
    addResult('Nonpublic noindex', 'true', passed ? 'true' : 'false', passed);
  }
  res = await fetchUrl(nonPubPath, 'HEAD');
  passed = !res.error && res.status === 404;
  addResult('Nonpublic HEAD status', '404', res.error || res.status, passed);

  // 3. Missing Event
  const missingPath = `/etkinlikler/${MISSING_SLUG}`;
  res = await fetchUrl(missingPath, 'GET');
  passed = !res.error && res.status === 404;
  addResult('Missing GET status', '404', res.error || res.status, passed);
  if (passed) {
    passed = res.body.includes('noindex');
    addResult('Missing noindex', 'true', passed ? 'true' : 'false', passed);
  }
  res = await fetchUrl(missingPath, 'HEAD');
  passed = !res.error && res.status === 404;
  addResult('Missing HEAD status', '404', res.error || res.status, passed);

  // 4. Malformed Slugs
  const malformed = [
    PUBLISHED_SLUG.toUpperCase(),
    PUBLISHED_SLUG + '_',
    '-' + PUBLISHED_SLUG,
    PUBLISHED_SLUG + '--slug',
    PUBLISHED_SLUG + '/',
    PUBLISHED_SLUG + '%26',
    PUBLISHED_SLUG + '%3f',
    PUBLISHED_SLUG + '/nested'
  ];

  for (const slug of malformed) {
    res = await fetchUrl(`/etkinlikler/${slug}`, 'GET');
    passed = !res.error && res.status === 404 && res.body.includes('noindex');
    addResult(`Malformed slug: ${slug}`, '404 noindex', res.error ? res.error : `${res.status} ${res.body.includes('noindex') ? 'noindex' : 'index'}`, passed);
  }

  // 5. Sitemap
  res = await fetchUrl('/sitemap.xml', 'GET');
  passed = !res.error && res.status === 200;
  addResult('Sitemap GET status', '200', res.error || res.status, passed);
  if (passed) {
    const cType = res.headers.get('content-type') || '';
    passed = cType.includes('application/xml');
    addResult('Sitemap Content-Type', 'application/xml', cType, passed);

    passed = res.body.includes('<?xml') && res.body.includes('<urlset') && res.body.includes('</urlset>');
    addResult('Sitemap complete urlset', 'true', passed ? 'true' : 'false', passed);

    passed = res.body.includes('https://so3pt.com.tr/') && res.body.includes('https://so3pt.com.tr/etkinlikler') && res.body.includes(`https://so3pt.com.tr/etkinlikler/${PUBLISHED_SLUG}`);
    addResult('Sitemap expected locs', 'true', passed ? 'true' : 'false', passed);

    passed = !res.body.includes(`https://so3pt.com.tr/etkinlikler/${NONPUBLIC_SLUG}`);
    addResult('Sitemap lacks nonpublic loc', 'true', passed ? 'true' : 'false', passed);

    const locs = res.body.match(/<loc>(.*?)<\/loc>/g) || [];
    passed = locs.every(loc => loc.includes('https://so3pt.com.tr/'));
    addResult('Sitemap locs use so3pt.com.tr', 'true', passed ? 'true' : 'false', passed);

    const openSet = (res.body.match(/<urlset/g) || []).length;
    const closeSet = (res.body.match(/<\/urlset>/g) || []).length;
    passed = openSet === 1 && closeSet === 1;
    addResult('Sitemap single urlset tag', '1', `${openSet} open, ${closeSet} close`, passed);

    passed = checkNoSessionCookie(res.headers);
    addResult('Sitemap No Session', 'true', passed ? 'true' : 'false', passed);
  }

  res = await fetchUrl('/sitemap.xml', 'HEAD');
  passed = !res.error && res.status === 200 && res.body.length === 0;
  addResult('Sitemap HEAD status & empty', '200 + empty', `${res.error || res.status} + len:${res.body ? res.body.length : 0}`, passed);

  // 6. Method Gate
  res = await fetchUrl(pubPath, 'POST');
  passed = !res.error && res.status === 405;
  addResult('POST Event status', '405', res.error || res.status, passed);
  if (passed) {
    passed = (res.headers.get('allow') || '').includes('GET, HEAD') && (res.headers.get('cache-control') || '').includes('no-store');
    addResult('POST Event headers', 'Allow GET, HEAD; no-store', `Allow: ${res.headers.get('allow')}, Cache: ${res.headers.get('cache-control')}`, passed);
    passed = checkNoSessionCookie(res.headers);
    addResult('POST Event No Session', 'true', passed ? 'true' : 'false', passed);
  }

  res = await fetchUrl('/sitemap.xml', 'POST');
  passed = !res.error && res.status === 405;
  addResult('POST Sitemap status', '405', res.error || res.status, passed);
  if (passed) {
    passed = (res.headers.get('allow') || '').includes('GET, HEAD') && (res.headers.get('cache-control') || '').includes('no-store');
    addResult('POST Sitemap headers', 'Allow GET, HEAD; no-store', `Allow: ${res.headers.get('allow')}, Cache: ${res.headers.get('cache-control')}`, passed);
    passed = checkNoSessionCookie(res.headers);
    addResult('POST Sitemap No Session', 'true', passed ? 'true' : 'false', passed);
  }

  console.log('Check | Expected | Actual | Result');
  console.log('---|---|---|---');
  for (const r of results) {
    console.log(`${r.name} | ${r.expected} | ${r.actual} | ${r.passed ? 'PASS' : 'FAIL'}`);
    if (!r.passed) allPassed = false;
  }

  if (!allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runChecks();
