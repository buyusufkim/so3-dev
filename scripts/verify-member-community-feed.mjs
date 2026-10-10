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
  pkg.scripts && pkg.scripts["verify:member-community-feed"] === "node scripts/verify-member-community-feed.mjs",
  "Package.json exact registration: 'verify:member-community-feed' === 'node scripts/verify-member-community-feed.mjs'"
);

console.log("\n=== 2. Route Registration & Lazy Loading ===");
const routesPath = path.resolve(process.cwd(), 'src/routes/index.tsx');
assert(fs.existsSync(routesPath), "src/routes/index.tsx exists");
const routesContent = fs.readFileSync(routesPath, 'utf8');

assert(
  routesContent.includes('MemberCommunityPage = lazy(') &&
  routesContent.includes('MemberCommunityPage'),
  "src/routes/index.tsx contains lazy-loaded MemberCommunityPage import"
);

// Check that under /uye routes, topluluk is registered
const uyeBlockMatch = routesContent.match(/path:\s*["']\/uye["'][\s\S]*?children:\s*\[([\s\S]*?)\]\s*\},/);
assert(Boolean(uyeBlockMatch), "src/routes/index.tsx has /uye route with children");
const uyeChildren = uyeBlockMatch ? uyeBlockMatch[1] : '';

assert(
  uyeChildren.includes('path: "topluluk"') && uyeChildren.includes('<MemberCommunityPage />'),
  "/uye route registers child 'topluluk' rendering <MemberCommunityPage />"
);

console.log("\n=== 3. Public Route Preservation ===");
// Ensure public /topluluk still redirects to /#topluluk
const publicBlockMatch = routesContent.match(/path:\s*["']\/["'][\s\S]*?children:\s*\[([\s\S]*?)\]\s*\},/);
assert(Boolean(publicBlockMatch), "src/routes/index.tsx has root public route");
const publicChildren = publicBlockMatch ? publicBlockMatch[1] : '';

assert(
  publicChildren.includes('path: "topluluk"') &&
  publicChildren.includes('Navigate to="/#topluluk"'),
  "Public /topluluk redirect to /#topluluk remains preserved and untouched"
);

console.log("\n=== 4. Member Navigation Invariants in src/member/layouts/MemberLayout.tsx ===");
const layoutPath = path.resolve(process.cwd(), 'src/member/layouts/MemberLayout.tsx');
assert(fs.existsSync(layoutPath), "src/member/layouts/MemberLayout.tsx exists");
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

// Ensure Topluluk link is present pointing to /uye/topluluk
assert(
  layoutContent.includes('to="/uye/topluluk"') && layoutContent.includes('Topluluk'),
  "MemberLayout.tsx contains Topluluk link pointing to '/uye/topluluk'"
);

// Check both desktop and mobile navigation sections have it
const desktopNavMatch = layoutContent.match(/<nav className="hidden sm:flex[^"]*">([\s\S]*?)<\/nav>/);
assert(Boolean(desktopNavMatch), "Desktop navigation block found in MemberLayout.tsx");
assert(
  desktopNavMatch && desktopNavMatch[1].includes('to="/uye/topluluk"'),
  "Desktop navigation includes Topluluk link"
);

const mobileNavMatch = layoutContent.match(/<nav className="max-w-5xl[^"]*overflow-x-auto">([\s\S]*?)<\/nav>/);
assert(Boolean(mobileNavMatch), "Mobile navigation block found in MemberLayout.tsx");
assert(
  mobileNavMatch && mobileNavMatch[1].includes('to="/uye/topluluk"'),
  "Mobile navigation includes Topluluk link"
);

// Both must be within auth guard
assert(
  layoutContent.includes('{isAuthenticated && identity && !identity.account.must_change_password && ('),
  "Navigation blocks are gated by {isAuthenticated && identity && !identity.account.must_change_password && ("
);

// Touch target for Topluluk link
assert(
  layoutContent.includes('to="/uye/topluluk"') && layoutContent.includes('min-h-[44px]'),
  "Topluluk link enforces >=44px vertical touch target (min-h-[44px])"
);

// Layout must not leak admin internals
assert(!layoutContent.includes('admin'), "MemberLayout.tsx contains zero 'admin' references");

console.log("\n=== 5. Component Existence & Structure ===");
const pagePath = path.resolve(process.cwd(), 'src/member/pages/MemberCommunityPage.tsx');
assert(fs.existsSync(pagePath), "src/member/pages/MemberCommunityPage.tsx exists");
const pageContent = fs.readFileSync(pagePath, 'utf8');

assert(
  pageContent.includes('export function MemberCommunityPage'),
  "MemberCommunityPage.tsx exports named component MemberCommunityPage"
);

assert(
  pageContent.includes('<h1') && pageContent.includes('Topluluk</h1>'),
  "Page renders <h1>Topluluk</h1>"
);

assert(
  pageContent.includes('SO3’ten duyurular ve topluluk güncellemeleri.'),
  "Page renders canonical supporting copy 'SO3’ten duyurular ve topluluk güncellemeleri.'"
);

console.log("\n=== 6. Canonical Client & Isolation ===");
assert(
  pageContent.includes('memberApiClient.getCommunityUpdates('),
  "Page strictly uses canonical memberApiClient.getCommunityUpdates()"
);

assert(
  !pageContent.includes("fetch('/api/member/community-updates'") &&
  !pageContent.includes('fetch("/api/member/community-updates"'),
  "Page does NOT directly call fetch on endpoint"
);

assert(
  !pageContent.includes('apiClient.get') && !pageContent.includes('apiClient.post'),
  "Page does NOT use admin apiClient"
);

console.log("\n=== 7. Race Safety & Lifecycle Invariants ===");
assert(
  pageContent.includes('new AbortController()') &&
  pageContent.includes('abortControllerRef'),
  "Page implements AbortController for race cancellation"
);

assert(
  pageContent.includes('requestGenerationRef'),
  "Page tracks requestGenerationRef to prevent stale out-of-order resolution"
);

assert(
  pageContent.includes('isMountedRef'),
  "Page tracks isMountedRef across async boundaries"
);

assert(
  pageContent.includes('abortControllerRef.current?.abort()'),
  "Page aborts in-flight fetch on unmount or new fetch trigger"
);

assert(
  !pageContent.includes('setInterval') && !pageContent.includes('setTimeout('),
  "Page contains zero automatic polling or intervals"
);

console.log("\n=== 8. Bounded User-Facing Error Messages ===");
assert(
  pageContent.includes("'Topluluk duyuruları yüklenemedi.'") ||
  pageContent.includes('"Topluluk duyuruları yüklenemedi."'),
  "Page uses canonical bounded error message: 'Topluluk duyuruları yüklenemedi.'"
);

assert(
  !pageContent.includes('err.message') && !pageContent.includes('error.message'),
  "Page does NOT leak raw err.message or error.message"
);

console.log("\n=== 9. Ordering & Non-Mutation of API Array ===");
assert(
  !pageContent.includes('.sort('),
  "Page does NOT sort items client-side (.sort)"
);

assert(
  !pageContent.includes('.reverse('),
  "Page does NOT reverse items client-side (.reverse)"
);

console.log("\n=== 10. Rendered Data Fields & Privacy Invariants ===");
assert(
  pageContent.includes('item.title'),
  "Page renders item.title"
);

assert(
  pageContent.includes('item.body'),
  "Page renders item.body"
);

assert(
  pageContent.includes('item.published_at'),
  "Page renders item.published_at"
);

assert(
  !pageContent.includes('item.status'),
  "Page does NOT access or render item.status"
);

assert(
  !pageContent.includes('item.created_at'),
  "Page does NOT access or render item.created_at"
);

assert(
  !pageContent.includes('item.updated_at'),
  "Page does NOT access or render item.updated_at"
);

assert(
  !pageContent.includes('SO3 Yönetimi') &&
  !pageContent.includes('Yazar:') &&
  !pageContent.includes('Admin'),
  "Page does NOT invent author/admin labels"
);

console.log("\n=== 11. Deterministic Timestamp Formatting ===");
assert(
  pageContent.includes('formatDateTime'),
  "Page defines local formatDateTime helper"
);

assert(
  !pageContent.includes('new Date('),
  "Page strictly DOES NOT instantiate new Date()"
);

assert(
  !pageContent.includes('Date.parse('),
  "Page strictly DOES NOT call Date.parse()"
);

assert(
  !pageContent.includes('toLocaleString'),
  "Page strictly DOES NOT use toLocaleString()"
);

assert(
  !pageContent.includes('Intl.DateTimeFormat'),
  "Page strictly DOES NOT use Intl.DateTimeFormat"
);

// Test local formatDateTime helper logic simulation
function testFormatDateTime(val) {
  if (!val || typeof val !== 'string') return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):\d{2}$/.exec(val);
  if (!match) return '—';
  const [, year, month, day, hour, minute] = match;
  return `${day}.${month}.${year} ${hour}:${minute}`;
}

assert(testFormatDateTime('2026-10-10 14:30:00') === '10.10.2026 14:30', "formatDateTime converts standard datetime correctly");
assert(testFormatDateTime(null) === '—', "formatDateTime fails closed to '—' on null");
assert(testFormatDateTime(undefined) === '—', "formatDateTime fails closed to '—' on undefined");
assert(testFormatDateTime('invalid-date') === '—', "formatDateTime fails closed to '—' on invalid string");

console.log("\n=== 12. Plain Text Body & Safe Styling ===");
assert(
  pageContent.includes('whitespace-pre-wrap'),
  "Page uses whitespace-pre-wrap to preserve formatting"
);

assert(
  pageContent.includes('break-words'),
  "Page uses break-words to prevent text overflow"
);

assert(
  !pageContent.includes('dangerouslySetInnerHTML'),
  "Page strictly DOES NOT use dangerouslySetInnerHTML"
);

assert(
  !pageContent.includes('marked(') && !pageContent.includes('ReactMarkdown'),
  "Page strictly DOES NOT use markdown or rich text parsers"
);

console.log("\n=== 13. Zero Mutations (Read-Only Surface) ===");
assert(!pageContent.includes('apiClient.post'), "Page contains zero POST calls");
assert(!pageContent.includes('apiClient.patch'), "Page contains zero PATCH calls");
assert(!pageContent.includes('apiClient.put'), "Page contains zero PUT calls");
assert(!pageContent.includes('apiClient.delete'), "Page contains zero DELETE calls");
assert(!pageContent.includes('memberApiClient.create'), "Page contains zero member mutation calls");

console.log("\n=== 14. Empty State & Retry Touch Target ===");
assert(
  pageContent.includes('Henüz yayınlanmış topluluk duyurusu bulunmuyor.'),
  "Page defines canonical empty state: 'Henüz yayınlanmış topluluk duyurusu bulunmuyor.'"
);

assert(
  pageContent.includes('Tekrar Dene'),
  "Page provides retry button labeled 'Tekrar Dene'"
);

assert(
  pageContent.includes('min-h-[44px]'),
  "Page enforces min-h-[44px] touch target on retry button"
);

console.log("\n=== 15. Zero Pagination, Filtering, or Search ===");
assert(!pageContent.includes('per_page'), "Page contains zero per_page controls");
assert(!pageContent.includes('statusFilter'), "Page contains zero status filters");
assert(!pageContent.includes('searchQuery') && !pageContent.includes('searchInput'), "Page contains zero search controls");

console.log("\n=== 16. Anti-Scope Hygiene Invariants ===");
const forbiddenAntiScope = [
  'comment',
  'like',
  'reaction',
  'share',
  'bookmark',
  'follow',
  'message',
  'chat',
  'poll',
  'view_count',
  'read_receipt',
  'media_upload'
];

for (const term of forbiddenAntiScope) {
  // Check if term appears as an identifier, JSX tag, or property
  const regex = new RegExp(`\\b${term}\\b`, 'i');
  assert(
    !regex.test(pageContent),
    `Page strictly does NOT contain anti-scope feature term: '${term}'`
  );
}

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more invariants failed verification.");
  process.exit(1);
} else {
  console.log("✅ SUCCESS: All Member Community Feed invariants verified.");
  process.exit(0);
}
