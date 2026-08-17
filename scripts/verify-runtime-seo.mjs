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

function sanitizeLocation(loc) {
  if (!loc) return 'none';
  try {
    const u = new URL(loc, 'http://localhost');
    u.hash = '';
    u.search = '';
    u.username = '';
    u.password = '';
    let result = u.href.replace(/^http:\/\/localhost/, '');
    if (result.length > 50) return result.substring(0, 47) + '...';
    return result;
  } catch (e) {
    let raw = String(loc);
    return raw.length > 50 ? raw.substring(0, 47) + '...' : raw;
  }
}

function checkNoSessionCookie(headers) {
  const setCookie = headers.get('set-cookie') || '';
  return !setCookie.includes('so3_admin_session');
}

function parseTags(html, tagName) {
  const regex = new RegExp(`<${tagName}\\s+([^>]*?)>`, 'gi');
  let tags = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const attrStr = match[1];
    const attrRegex = /([a-z0-9_-]+)\s*=\s*(?:["'](.*?)["']|([^"'\s>]+))/gi;
    let attrs = {};
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
      const name = attrMatch[1].toLowerCase();
      const value = attrMatch[2] !== undefined ? attrMatch[2] : attrMatch[3];
      attrs[name] = value;
    }
    tags.push(attrs);
  }
  return tags;
}

function extractRobots(html) {
  const metas = parseTags(html, 'meta');
  const robotsTags = metas.filter(m => m.name && m.name.toLowerCase() === 'robots');
  if (robotsTags.length === 0) return { error: 'MISSING', count: 0 };
  if (robotsTags.length > 1) return { error: 'MULTIPLE', count: robotsTags.length };
  const content = robotsTags[0].content;
  if (content === undefined) return { error: 'MISSING_CONTENT', count: 1 };
  return { value: content.trim(), count: 1 };
}

function extractCanonical(html) {
  const links = parseTags(html, 'link');
  const canonicalTags = links.filter(l => {
    if (!l.rel) return false;
    const rels = l.rel.toLowerCase().split(/\s+/);
    return rels.includes('canonical');
  });
  if (canonicalTags.length === 0) return { error: 'MISSING', count: 0 };
  if (canonicalTags.length > 1) return { error: 'MULTIPLE', count: canonicalTags.length };
  const href = canonicalTags[0].href;
  if (href === undefined) return { error: 'MISSING_HREF', count: 1 };
  return { value: href, count: 1 };
}

function countTitleTags(html) {
  const matches = html.match(/<title[^>]*>.*?<\/title>/ig);
  return matches ? matches.length : 0;
}

function checkMethodAllow(allowStr) {
  if (!allowStr) return false;
  const methods = allowStr.split(',').map(s => s.trim().toUpperCase());
  return methods.length === 2 && methods.includes('GET') && methods.includes('HEAD');
}

async function runChecks() {
  try {
    // --- PUBLISHED EVENT ---
    const pubPath = `/etkinlikler/${PUBLISHED_SLUG}`;
    const pubGet = await fetchUrl(pubPath, 'GET');
    const pubHead = await fetchUrl(pubPath, 'HEAD');
    
    addResult('Published GET status', '200', pubGet.error || pubGet.status, !pubGet.error && pubGet.status === 200);
    addResult('Published HEAD status', '200', pubHead.error || pubHead.status, !pubHead.error && pubHead.status === 200);
    
    addResult('Published GET no redirect', 'false', pubGet.isRedirect ? `true to ${sanitizeLocation(pubGet.location)}` : 'false', !pubGet.isRedirect);
    addResult('Published HEAD no redirect', 'false', pubHead.isRedirect ? `true to ${sanitizeLocation(pubHead.location)}` : 'false', !pubHead.isRedirect);
    
    if (!pubGet.error && !pubHead.error && !pubGet.isRedirect && !pubHead.isRedirect) {
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
      addResult('Published exact robots', 'index, follow', robots.error || robots.value, robots.value === 'index, follow');
      
      const canonical = extractCanonical(pubGet.body);
      addResult('Published exact canonical', `https://so3pt.com.tr/etkinlikler/${PUBLISHED_SLUG}`, canonical.error || canonical.value, canonical.value === `https://so3pt.com.tr/etkinlikler/${PUBLISHED_SLUG}`);
      
      const cTitle = countTitleTags(pubGet.body);
      addResult('Published title count', '1', cTitle, cTitle === 1);
      addResult('Published canonical count', '1', canonical.count, canonical.count === 1);
      addResult('Published robots count', '1', robots.count, robots.count === 1);
    }
    
    // --- NONPUBLIC EVENT ---
    const nonPath = `/etkinlikler/${NONPUBLIC_SLUG}`;
    const nonGet = await fetchUrl(nonPath, 'GET');
    const nonHead = await fetchUrl(nonPath, 'HEAD');
    
    addResult('Nonpublic GET status', '404', nonGet.error || nonGet.status, !nonGet.error && nonGet.status === 404);
    addResult('Nonpublic HEAD status', '404', nonHead.error || nonHead.status, !nonHead.error && nonHead.status === 404);
    addResult('Nonpublic GET no redirect', 'false', nonGet.isRedirect ? `true to ${sanitizeLocation(nonGet.location)}` : 'false', !nonGet.isRedirect);
    addResult('Nonpublic HEAD no redirect', 'false', nonHead.isRedirect ? `true to ${sanitizeLocation(nonHead.location)}` : 'false', !nonHead.isRedirect);
    
    if (!nonGet.error && !nonHead.error && !nonGet.isRedirect && !nonHead.isRedirect) {
      const nonGetCT = nonGet.headers.get('content-type') || '';
      const nonHeadCT = nonHead.headers.get('content-type') || '';
      addResult('Nonpublic GET Content-Type', 'text/html', nonGetCT, nonGetCT.includes('text/html'));
      addResult('Nonpublic HEAD Content-Type', 'text/html', nonHeadCT, nonHeadCT.includes('text/html'));
      addResult('Nonpublic Content-Type parity', 'true', nonGetCT === nonHeadCT, nonGetCT === nonHeadCT);
      
      const nonGetCC = nonGet.headers.get('cache-control') || '';
      const nonHeadCC = nonHead.headers.get('cache-control') || '';
      addResult('Nonpublic GET short cache', 'true', nonGetCC, nonGetCC.includes('public') && nonGetCC.includes('max-age=60'));
      addResult('Nonpublic Cache-Control parity', 'true', nonGetCC === nonHeadCC, nonGetCC === nonHeadCC);
      
      addResult('Nonpublic GET no session', 'true', nonGet.headers.get('set-cookie'), checkNoSessionCookie(nonGet.headers));
      addResult('Nonpublic HEAD no session', 'true', nonHead.headers.get('set-cookie'), checkNoSessionCookie(nonHead.headers));
      addResult('Nonpublic HEAD empty body', '0', nonHead.body.length, nonHead.body.length === 0);
      
      const robots = extractRobots(nonGet.body);
      addResult('Nonpublic exact robots', 'noindex, follow', robots.error || robots.value, robots.value === 'noindex, follow');
    }
    
    // --- MISSING EVENT ---
    const missPath = `/etkinlikler/${MISSING_SLUG}`;
    const missGet = await fetchUrl(missPath, 'GET');
    const missHead = await fetchUrl(missPath, 'HEAD');
    
    addResult('Missing GET status', '404', missGet.error || missGet.status, !missGet.error && missGet.status === 404);
    addResult('Missing HEAD status', '404', missHead.error || missHead.status, !missHead.error && missHead.status === 404);
    addResult('Missing GET no redirect', 'false', missGet.isRedirect ? `true to ${sanitizeLocation(missGet.location)}` : 'false', !missGet.isRedirect);
    addResult('Missing HEAD no redirect', 'false', missHead.isRedirect ? `true to ${sanitizeLocation(missHead.location)}` : 'false', !missHead.isRedirect);
    
    if (!missGet.error && !missHead.error && !missGet.isRedirect && !missHead.isRedirect) {
      const missGetCT = missGet.headers.get('content-type') || '';
      const missHeadCT = missHead.headers.get('content-type') || '';
      addResult('Missing GET Content-Type', 'text/html', missGetCT, missGetCT.includes('text/html'));
      addResult('Missing Content-Type parity', 'true', missGetCT === missHeadCT, missGetCT === missHeadCT);
      
      const missGetCC = missGet.headers.get('cache-control') || '';
      const missHeadCC = missHead.headers.get('cache-control') || '';
      addResult('Missing GET short cache', 'true', missGetCC, missGetCC.includes('public') && missGetCC.includes('max-age=60'));
      addResult('Missing Cache-Control parity', 'true', missGetCC === missHeadCC, missGetCC === missHeadCC);
      
      addResult('Missing GET no session', 'true', missGet.headers.get('set-cookie'), checkNoSessionCookie(missGet.headers));
      addResult('Missing HEAD no session', 'true', missHead.headers.get('set-cookie'), checkNoSessionCookie(missHead.headers));
      addResult('Missing HEAD empty body', '0', missHead.body.length, missHead.body.length === 0);
      
      const robots = extractRobots(missGet.body);
      addResult('Missing exact robots', 'noindex, follow', robots.error || robots.value, robots.value === 'noindex, follow');
      
      if (!nonGet.error && !nonGet.isRedirect) {
        addResult('Missing/Nonpublic Body Match', 'true', '...', nonGet.body === missGet.body);
        addResult('Nonpublic excludes slug', 'true', '...', !nonGet.body.includes(NONPUBLIC_SLUG));
        addResult('Nonpublic excludes canonical url', 'true', '...', !nonGet.body.includes(`https://so3pt.com.tr/etkinlikler/${NONPUBLIC_SLUG}`));
        const nonTitle = nonGet.body.match(/<title>(.*?)<\/title>/is)?.[1] || '';
        const missTitle = missGet.body.match(/<title>(.*?)<\/title>/is)?.[1] || '';
        addResult('Generic 404 title match', 'true', '...', nonTitle && nonTitle === missTitle && nonTitle.includes('Bulunamadı'));
      }
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
    const malformed = [...new Set(rawMalformed)].filter(s => s !== PUBLISHED_SLUG);
    
    for (const slug of malformed) {
      const mGet = await fetchUrl(`/etkinlikler/${slug}`, 'GET');
      const mHead = await fetchUrl(`/etkinlikler/${slug}`, 'HEAD');
      
      addResult(`Malformed GET ${slug} status`, '404', mGet.error || mGet.status, !mGet.error && mGet.status === 404);
      addResult(`Malformed HEAD ${slug} status`, '404', mHead.error || mHead.status, !mHead.error && mHead.status === 404);
      
      addResult(`Malformed GET ${slug} no redirect`, 'false', mGet.isRedirect ? `true to ${sanitizeLocation(mGet.location)}` : 'false', !mGet.isRedirect);
      addResult(`Malformed HEAD ${slug} no redirect`, 'false', mHead.isRedirect ? `true to ${sanitizeLocation(mHead.location)}` : 'false', !mHead.isRedirect);

      if (!mGet.error && !mHead.error && !mGet.isRedirect && !mHead.isRedirect) {
        addResult(`Malformed GET ${slug} no session`, 'true', mGet.headers.get('set-cookie'), checkNoSessionCookie(mGet.headers));
        addResult(`Malformed HEAD ${slug} no session`, 'true', mHead.headers.get('set-cookie'), checkNoSessionCookie(mHead.headers));
        
        const mGetCT = mGet.headers.get('content-type') || '';
        const mHeadCT = mHead.headers.get('content-type') || '';
        addResult(`Malformed GET ${slug} html`, 'text/html', mGetCT, mGetCT.includes('text/html'));
        addResult(`Malformed Content-Type parity ${slug}`, 'true', mGetCT === mHeadCT, mGetCT === mHeadCT);
        
        const mGetCC = mGet.headers.get('cache-control') || '';
        const mHeadCC = mHead.headers.get('cache-control') || '';
        addResult(`Malformed GET ${slug} short cache`, 'true', mGetCC, mGetCC.includes('public') && mGetCC.includes('max-age=60'));
        addResult(`Malformed Cache-Control parity ${slug}`, 'true', mGetCC === mHeadCC, mGetCC === mHeadCC);

        const mRobots = extractRobots(mGet.body);
        addResult(`Malformed GET ${slug} robots`, 'noindex, follow', mRobots.error || mRobots.value, mRobots.value === 'noindex, follow');
        addResult(`Malformed HEAD ${slug} empty body`, '0', mHead.body.length, mHead.body.length === 0);
      }
    }
    
    // --- SITEMAP ---
    const smGet = await fetchUrl('/sitemap.xml', 'GET');
    const smHead = await fetchUrl('/sitemap.xml', 'HEAD');
    
    addResult('Sitemap GET status', '200', smGet.error || smGet.status, !smGet.error && smGet.status === 200);
    addResult('Sitemap HEAD status', '200', smHead.error || smHead.status, !smHead.error && smHead.status === 200);
    addResult('Sitemap GET no redirect', 'false', smGet.isRedirect ? `true to ${sanitizeLocation(smGet.location)}` : 'false', !smGet.isRedirect);
    addResult('Sitemap HEAD no redirect', 'false', smHead.isRedirect ? `true to ${sanitizeLocation(smHead.location)}` : 'false', !smHead.isRedirect);
    
    if (!smGet.error && !smHead.error && !smGet.isRedirect && !smHead.isRedirect) {
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
        locMatches.push(m[1].trim());
      }
      
      addResult('Sitemap has entries', 'true', locMatches.length, locMatches.length >= 3);
      
      let allValid = locMatches.length > 0;
      let pubCount = 0;
      let hasNonPub = false;
      let hasMissing = false;
      let hasHome = false;
      let hasArchive = false;
      let noneEmpty = true;
      
      for (const loc of locMatches) {
        if (!loc) {
          noneEmpty = false;
          continue;
        }
        try {
          const lu = new URL(loc);
          if (lu.origin !== 'https://so3pt.com.tr') allValid = false;
          if (lu.port) allValid = false;
          if (lu.search !== '' || lu.hash !== '' || lu.username || lu.password) allValid = false;
          
          if (loc === 'https://so3pt.com.tr/') hasHome = true;
          if (loc === 'https://so3pt.com.tr/etkinlikler') hasArchive = true;
          if (loc === `https://so3pt.com.tr/etkinlikler/${PUBLISHED_SLUG}`) pubCount++;
          if (loc === `https://so3pt.com.tr/etkinlikler/${NONPUBLIC_SLUG}`) hasNonPub = true;
          if (loc === `https://so3pt.com.tr/etkinlikler/${MISSING_SLUG}`) hasMissing = true;
        } catch(e) {
          allValid = false;
        }
      }
      
      addResult('Sitemap locs non-empty', 'true', noneEmpty, noneEmpty);
      addResult('Sitemap locs origin valid', 'true', allValid, allValid);
      addResult('Sitemap has homepage', 'true', hasHome, hasHome);
      addResult('Sitemap has archive', 'true', hasArchive, hasArchive);
      addResult('Sitemap published count', '1', pubCount, pubCount === 1);
      addResult('Sitemap nonpublic absent', 'true', !hasNonPub, !hasNonPub);
      addResult('Sitemap missing absent', 'true', !hasMissing, !hasMissing);
    }
    
    // --- METHOD GATES ---
    const methEvt = await fetchUrl(pubPath, 'POST');
    addResult('Method Event status', '405', methEvt.error || methEvt.status, !methEvt.error && methEvt.status === 405);
    addResult('Method Event no redirect', 'false', methEvt.isRedirect ? `true to ${sanitizeLocation(methEvt.location)}` : 'false', !methEvt.isRedirect);
    if (!methEvt.error && !methEvt.isRedirect) {
      addResult('Method Event no session', 'true', methEvt.headers.get('set-cookie'), checkNoSessionCookie(methEvt.headers));
      const allowEvt = methEvt.headers.get('allow') || '';
      addResult('Method Event Allow', 'GET, HEAD', allowEvt, checkMethodAllow(allowEvt));
      const ccEvt = methEvt.headers.get('cache-control') || '';
      addResult('Method Event no-store', 'true', ccEvt, ccEvt.includes('no-store'));
      addResult('Method Event empty/generic body', 'true', methEvt.body.length, methEvt.body.length === 0 || methEvt.body.includes('405'));
    }
    
    const methSm = await fetchUrl('/sitemap.xml', 'POST');
    addResult('Method Sitemap status', '405', methSm.error || methSm.status, !methSm.error && methSm.status === 405);
    addResult('Method Sitemap no redirect', 'false', methSm.isRedirect ? `true to ${sanitizeLocation(methSm.location)}` : 'false', !methSm.isRedirect);
    if (!methSm.error && !methSm.isRedirect) {
      addResult('Method Sitemap no session', 'true', methSm.headers.get('set-cookie'), checkNoSessionCookie(methSm.headers));
      const allowSm = methSm.headers.get('allow') || '';
      addResult('Method Sitemap Allow', 'GET, HEAD', allowSm, checkMethodAllow(allowSm));
      const ccSm = methSm.headers.get('cache-control') || '';
      addResult('Method Sitemap no-store', 'true', ccSm, ccSm.includes('no-store'));
      addResult('Method Sitemap empty/generic body', 'true', methSm.body.length, methSm.body.length === 0 || methSm.body.includes('405'));
    }
    
    // Print results
    let allPassed = true;
    for (const r of results) {
      if (!r.passed) {
        allPassed = false;
        console.log(`FAIL: ${r.name} | Expected: ${r.expected} | Actual: ${r.actual}`);
      }
    }
    
    if (allPassed) {
      console.log("All SEO runtime checks passed successfully.");
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    process.exit(1);
  }
}

runChecks();
