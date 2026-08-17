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

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
if (!slugRegex.test(PUBLISHED_SLUG) || !slugRegex.test(NONPUBLIC_SLUG) || !slugRegex.test(MISSING_SLUG)) {
  console.error("Invalid slug format. Slugs must match ^[a-z0-9]+(?:-[a-z0-9]+)*$");
  process.exit(2);
}

if (PUBLISHED_SLUG === NONPUBLIC_SLUG || PUBLISHED_SLUG === MISSING_SLUG || NONPUBLIC_SLUG === MISSING_SLUG) {
  console.error("Slugs must be pairwise distinct.");
  process.exit(2);
}

let parsedUrl;
try {
  parsedUrl = new URL(BASE_URL);
} catch (e) {
  console.error("Invalid BASE_URL.");
  process.exit(2);
}

if ((parsedUrl.pathname !== '/' && parsedUrl.pathname !== '') || parsedUrl.search !== '' || parsedUrl.hash !== '' || parsedUrl.username || parsedUrl.password) {
  console.error("BASE_URL must not contain path, query, fragment, or credentials. Optionally, it may contain a root trailing slash.");
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
      isRedirect: res.status >= 300 && res.status < 400,
      location: res.headers.get('location') || null
    };
  } catch (e) {
    return { error: e.message };
  }
}

function addResult(name, expectedStr, actualStr, passed) {
  results.push({ name, expected: expectedStr, actual: String(actualStr).substring(0, 100), passed });
}

function checkNoSessionCookie(headers) {
  const setCookie = headers.get('set-cookie') || '';
  return !setCookie.includes('so3_admin_session');
}

function extractRobots(html) {
  const regex = /<meta\s+(?:name=["']robots["']\s+content=["'](.*?)["']|content=["'](.*?)["']\s+name=["']robots["'])\s*\/?>/ig;
  let matches = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1] || match[2]);
  }
  if (matches.length === 0) return null;
  if (matches.length > 1) return 'MULTIPLE';
  return matches[0];
}

function extractCanonical(html) {
  const regex = /<link\s+(?:rel=["']canonical["']\s+href=["'](.*?)["']|href=["'](.*?)["']\s+rel=["']canonical["'])\s*\/?>/ig;
  let matches = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1] || match[2]);
  }
  if (matches.length === 0) return null;
  if (matches.length > 1) return 'MULTIPLE';
  return matches[0];
}

function countTags(html, tag) {
  if (tag === 'title') {
    const matches = html.match(/<title[^>]*>.*?<\/title>/ig);
    return matches ? matches.length : 0;
  }
  return 0;
}

async function runChecks() {
  try {
    // --- PUBLISHED EVENT ---
    const pubPath = `/etkinlikler/${PUBLISHED_SLUG}`;
    const pubGet = await fetchUrl(pubPath, 'GET');
    const pubHead = await fetchUrl(pubPath, 'HEAD');
    
    // Status
    addResult('Published GET status', '200', pubGet.error || pubGet.status, !pubGet.error && pubGet.status === 200);
    addResult('Published HEAD status', '200', pubHead.error || pubHead.status, !pubHead.error && pubHead.status === 200);
    
    // Redirects
    addResult('Published GET no redirect', 'false', pubGet.isRedirect, !pubGet.isRedirect);
    addResult('Published HEAD no redirect', 'false', pubHead.isRedirect, !pubHead.isRedirect);
    
    if (!pubGet.error && !pubHead.error) {
      const pubGetCT = pubGet.headers.get('content-type') || '';
      const pubHeadCT = pubHead.headers.get('content-type') || '';
      const pubGetCC = pubGet.headers.get('cache-control') || '';
      const pubHeadCC = pubHead.headers.get('cache-control') || '';
      
      addResult('Published GET Content-Type', 'text/html', pubGetCT, pubGetCT.includes('text/html'));
      addResult('Published HEAD Content-Type', 'text/html', pubHeadCT, pubHeadCT.includes('text/html'));
      addResult('Published Content-Type parity', 'true', pubGetCT === pubHeadCT, pubGetCT === pubHeadCT);
      
      addResult('Published GET short cache', 'true', pubGetCC, pubGetCC.includes('public') && pubGetCC.includes('max-age=60'));
      addResult('Published Cache-Control parity', 'true', pubGetCC === pubHeadCC, pubGetCC === pubHeadCC);
      
      addResult('Published GET no session', 'true', pubGet.headers.get('set-cookie'), checkNoSessionCookie(pubGet.headers));
      addResult('Published HEAD no session', 'true', pubHead.headers.get('set-cookie'), checkNoSessionCookie(pubHead.headers));
      
      addResult('Published HEAD empty body', '0', pubHead.body.length, pubHead.body.length === 0);
      
      const robots = extractRobots(pubGet.body);
      addResult('Published exact robots', 'index, follow', robots, robots === 'index, follow');
      
      const canonical = extractCanonical(pubGet.body);
      addResult('Published exact canonical', `https://so3pt.com.tr/etkinlikler/${PUBLISHED_SLUG}`, canonical, canonical === `https://so3pt.com.tr/etkinlikler/${PUBLISHED_SLUG}`);
      
      const cTitle = countTags(pubGet.body, 'title');
      const cCanonical = pubGet.body.match(/<link\s+[^>]*rel=["']canonical["'][^>]*>/ig)?.length || 0;
      const cRobots = pubGet.body.match(/<meta\s+[^>]*name=["']robots["'][^>]*>/ig)?.length || 0;
      
      addResult('Published title count', '1', cTitle, cTitle === 1);
      addResult('Published canonical count', '1', cCanonical, cCanonical === 1);
      addResult('Published robots count', '1', cRobots, cRobots === 1);
    }
    
    // --- NONPUBLIC EVENT ---
    const nonPath = `/etkinlikler/${NONPUBLIC_SLUG}`;
    const nonGet = await fetchUrl(nonPath, 'GET');
    const nonHead = await fetchUrl(nonPath, 'HEAD');
    
    addResult('Nonpublic GET status', '404', nonGet.error || nonGet.status, !nonGet.error && nonGet.status === 404);
    addResult('Nonpublic HEAD status', '404', nonHead.error || nonHead.status, !nonHead.error && nonHead.status === 404);
    addResult('Nonpublic GET no redirect', 'false', nonGet.isRedirect, !nonGet.isRedirect);
    addResult('Nonpublic HEAD no redirect', 'false', nonHead.isRedirect, !nonHead.isRedirect);
    
    if (!nonGet.error && !nonHead.error) {
      const nonGetCT = nonGet.headers.get('content-type') || '';
      const nonHeadCT = nonHead.headers.get('content-type') || '';
      addResult('Nonpublic GET Content-Type', 'text/html', nonGetCT, nonGetCT.includes('text/html'));
      addResult('Nonpublic Content-Type parity', 'true', nonGetCT === nonHeadCT, nonGetCT === nonHeadCT);
      
      const nonGetCC = nonGet.headers.get('cache-control') || '';
      const nonHeadCC = nonHead.headers.get('cache-control') || '';
      addResult('Nonpublic GET short cache', 'true', nonGetCC, nonGetCC.includes('public') && nonGetCC.includes('max-age=60'));
      addResult('Nonpublic Cache-Control parity', 'true', nonGetCC === nonHeadCC, nonGetCC === nonHeadCC);
      
      addResult('Nonpublic GET no session', 'true', nonGet.headers.get('set-cookie'), checkNoSessionCookie(nonGet.headers));
      addResult('Nonpublic HEAD no session', 'true', nonHead.headers.get('set-cookie'), checkNoSessionCookie(nonHead.headers));
      addResult('Nonpublic HEAD empty body', '0', nonHead.body.length, nonHead.body.length === 0);
      
      const robots = extractRobots(nonGet.body);
      addResult('Nonpublic exact robots', 'noindex, follow', robots, robots === 'noindex, follow');
    }
    
    // --- MISSING EVENT ---
    const missPath = `/etkinlikler/${MISSING_SLUG}`;
    const missGet = await fetchUrl(missPath, 'GET');
    const missHead = await fetchUrl(missPath, 'HEAD');
    
    addResult('Missing GET status', '404', missGet.error || missGet.status, !missGet.error && missGet.status === 404);
    addResult('Missing HEAD status', '404', missHead.error || missHead.status, !missHead.error && missHead.status === 404);
    
    if (!nonGet.error && !missGet.error) {
      // Data leak check
      addResult('Missing/Nonpublic Body Match', 'true', '...', nonGet.body === missGet.body);
      addResult('Nonpublic excludes slug', 'true', '...', !nonGet.body.includes(NONPUBLIC_SLUG));
      addResult('Nonpublic excludes canonical url', 'true', '...', !nonGet.body.includes(`https://so3pt.com.tr/etkinlikler/${NONPUBLIC_SLUG}`));
      const nonTitle = nonGet.body.match(/<title>(.*?)<\/title>/is)?.[1] || '';
      const missTitle = missGet.body.match(/<title>(.*?)<\/title>/is)?.[1] || '';
      addResult('Generic 404 title match', 'true', '...', nonTitle && nonTitle === missTitle && nonTitle.includes('Bulunamadı'));
    }
    
    // --- MALFORMED SLUGS ---
    let rawMalformed = [
      PUBLISHED_SLUG.toUpperCase(),
      `-${PUBLISHED_SLUG}`,
      `${PUBLISHED_SLUG}-`,
      PUBLISHED_SLUG.replace('-', '_') + '_',
      `${PUBLISHED_SLUG}--test`,
      `${PUBLISHED_SLUG}/`,
      `${PUBLISHED_SLUG}/nested`,
      `${PUBLISHED_SLUG}%2f`,
      `${PUBLISHED_SLUG}%26`,
      `${PUBLISHED_SLUG}%3f`
    ];
    // filter duplicates and keep valid variants
    const malformed = [...new Set(rawMalformed)].filter(s => s !== PUBLISHED_SLUG);
    
    for (const slug of malformed) {
      const mGet = await fetchUrl(`/etkinlikler/${slug}`, 'GET');
      const mHead = await fetchUrl(`/etkinlikler/${slug}`, 'HEAD');
      
      let passGet = !mGet.error && mGet.status === 404 && !mGet.isRedirect && checkNoSessionCookie(mGet.headers) && (mGet.headers.get('content-type') || '').includes('text/html') && extractRobots(mGet.body) === 'noindex, follow';
      addResult(`Malformed GET ${slug}`, '404 noindex html no-redirect no-session', mGet.error ? mGet.error : `${mGet.status} ${extractRobots(mGet.body)}`, passGet);
      
      let passHead = !mHead.error && mHead.status === 404 && !mHead.isRedirect && checkNoSessionCookie(mHead.headers) && mHead.body.length === 0 && mGet.headers.get('content-type') === mHead.headers.get('content-type');
      addResult(`Malformed HEAD ${slug}`, '404 empty match-headers no-redirect', mHead.error ? mHead.error : `${mHead.status} len:${mHead.body.length}`, passHead);
    }
    
    // --- SITEMAP ---
    const smGet = await fetchUrl('/sitemap.xml', 'GET');
    const smHead = await fetchUrl('/sitemap.xml', 'HEAD');
    
    addResult('Sitemap GET status', '200', smGet.error || smGet.status, !smGet.error && smGet.status === 200);
    addResult('Sitemap HEAD status', '200', smHead.error || smHead.status, !smHead.error && smHead.status === 200);
    addResult('Sitemap GET no redirect', 'false', smGet.isRedirect, !smGet.isRedirect);
    addResult('Sitemap HEAD no redirect', 'false', smHead.isRedirect, !smHead.isRedirect);
    
    if (!smGet.error && !smHead.error) {
      const smGetCT = smGet.headers.get('content-type') || '';
      const smHeadCT = smHead.headers.get('content-type') || '';
      const smGetCC = smGet.headers.get('cache-control') || '';
      const smHeadCC = smHead.headers.get('cache-control') || '';
      
      addResult('Sitemap Content-Type', 'application/xml', smGetCT, smGetCT.includes('application/xml'));
      addResult('Sitemap Content-Type parity', 'true', smGetCT === smHeadCT, smGetCT === smHeadCT);
      addResult('Sitemap GET short cache', 'true', smGetCC, smGetCC.includes('public') && smGetCC.includes('max-age=60'));
      addResult('Sitemap Cache-Control parity', 'true', smGetCC === smHeadCC, smGetCC === smHeadCC);
      addResult('Sitemap GET no session', 'true', smGet.headers.get('set-cookie'), checkNoSessionCookie(smGet.headers));
      addResult('Sitemap HEAD no session', 'true', smHead.headers.get('set-cookie'), checkNoSessionCookie(smHead.headers));
      addResult('Sitemap HEAD empty body', '0', smHead.body.length, smHead.body.length === 0);
      
      const xmlDecs = (smGet.body.match(/<\?xml/g) || []).length;
      addResult('Sitemap exactly 1 XML dec', '1', xmlDecs, xmlDecs === 1);
      
      const openSets = (smGet.body.match(/<urlset[^>]*>/g) || []).length;
      const closeSets = (smGet.body.match(/<\/urlset>/g) || []).length;
      addResult('Sitemap exactly 1 urlset', '1', `${openSets}, ${closeSets}`, openSets === 1 && closeSets === 1);
      
      const locRegex = /<loc>(.*?)<\/loc>/g;
      let locMatches = [];
      let m;
      while ((m = locRegex.exec(smGet.body)) !== null) {
        locMatches.push(m[1]);
      }
      
      addResult('Sitemap has entries', 'true', locMatches.length, locMatches.length >= 3);
      
      let allValid = locMatches.length > 0;
      let pubCount = 0;
      let hasNonPub = false;
      let hasMissing = false;
      let hasHome = false;
      let hasArchive = false;
      
      for (const loc of locMatches) {
        try {
          const lu = new URL(loc);
          if (lu.protocol !== 'https:' || lu.hostname !== 'so3pt.com.tr') allValid = false;
          if (loc === 'https://so3pt.com.tr/') hasHome = true;
          if (loc === 'https://so3pt.com.tr/etkinlikler') hasArchive = true;
          if (loc === `https://so3pt.com.tr/etkinlikler/${PUBLISHED_SLUG}`) pubCount++;
          if (loc === `https://so3pt.com.tr/etkinlikler/${NONPUBLIC_SLUG}`) hasNonPub = true;
          if (loc === `https://so3pt.com.tr/etkinlikler/${MISSING_SLUG}`) hasMissing = true;
        } catch(e) {
          allValid = false;
        }
      }
      
      addResult('Sitemap locs valid https so3pt.com.tr', 'true', allValid, allValid);
      addResult('Sitemap has homepage', 'true', hasHome, hasHome);
      addResult('Sitemap has archive', 'true', hasArchive, hasArchive);
      addResult('Sitemap published count', '1', pubCount, pubCount === 1);
      addResult('Sitemap nonpublic absent', 'true', !hasNonPub, !hasNonPub);
      addResult('Sitemap missing absent', 'true', !hasMissing, !hasMissing);
    }
    
    // --- METHOD GATES ---
    const methEvt = await fetchUrl(pubPath, 'POST');
    addResult('Method Event status', '405', methEvt.error || methEvt.status, !methEvt.error && methEvt.status === 405);
    addResult('Method Event no redirect', 'false', methEvt.isRedirect, !methEvt.isRedirect);
    addResult('Method Event no session', 'true', methEvt.headers?.get('set-cookie'), checkNoSessionCookie(methEvt.headers || new Headers()));
    const allowEvt = methEvt.headers?.get('allow') || '';
    addResult('Method Event Allow', 'true', allowEvt, allowEvt.includes('GET') && allowEvt.includes('HEAD'));
    const ccEvt = methEvt.headers?.get('cache-control') || '';
    addResult('Method Event no-store', 'true', ccEvt, ccEvt.includes('no-store'));
    
    const methSm = await fetchUrl('/sitemap.xml', 'POST');
    addResult('Method Sitemap status', '405', methSm.error || methSm.status, !methSm.error && methSm.status === 405);
    addResult('Method Sitemap no redirect', 'false', methSm.isRedirect, !methSm.isRedirect);
    addResult('Method Sitemap no session', 'true', methSm.headers?.get('set-cookie'), checkNoSessionCookie(methSm.headers || new Headers()));
    const allowSm = methSm.headers?.get('allow') || '';
    addResult('Method Sitemap Allow', 'true', allowSm, allowSm.includes('GET') && allowSm.includes('HEAD'));
    const ccSm = methSm.headers?.get('cache-control') || '';
    addResult('Method Sitemap no-store', 'true', ccSm, ccSm.includes('no-store'));
    
    // Print results
    let allPassed = true;
    console.log('Check | Expected | Actual | Result');
    console.log('---|---|---|---');
    for (const r of results) {
      const cleanActual = String(r.actual).replace(/\n/g, ' ').substring(0, 50);
      console.log(`${r.name} | ${r.expected} | ${cleanActual} | ${r.passed ? 'PASS' : 'FAIL'}`);
      if (!r.passed) allPassed = false;
    }
    
    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error("Unexpected Script Error:");
    process.exit(1);
  }
}

runChecks();
