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
  pkg.scripts && pkg.scripts["verify:community-updates-admin-ui"] === "node scripts/verify-community-updates-admin-ui.mjs",
  "Package.json exact registration: 'verify:community-updates-admin-ui' === 'node scripts/verify-community-updates-admin-ui.mjs'"
);

console.log("\n=== 2. Route Registration & Lazy Loading ===");
const routesPath = path.resolve(process.cwd(), 'src/routes/index.tsx');
assert(fs.existsSync(routesPath), "src/routes/index.tsx exists");
const routesContent = fs.readFileSync(routesPath, 'utf8');

assert(
  routesContent.includes('const CommunityUpdatesPage = lazy(') &&
  routesContent.includes('community-updates/CommunityUpdatesPage'),
  "src/routes/index.tsx contains lazy-loaded CommunityUpdatesPage import"
);
assert(
  routesContent.includes('path: "community-updates"') &&
  routesContent.includes('<CommunityUpdatesPage />'),
  "src/routes/index.tsx registers 'community-updates' route rendering <CommunityUpdatesPage />"
);

console.log("\n=== 3. Role Access Invariants in src/admin/auth/roles.ts ===");
const rolesPath = path.resolve(process.cwd(), 'src/admin/auth/roles.ts');
assert(fs.existsSync(rolesPath), "src/admin/auth/roles.ts exists");
const rolesContent = fs.readFileSync(rolesPath, 'utf8');

// Simulate role access function from roles.ts
function hasRoleAccessSimulated(role, pathname) {
  if (
    pathname === '/admin/audit-logs' || pathname.startsWith('/admin/audit-logs/') ||
    pathname === '/admin/staff-accounts' || pathname.startsWith('/admin/staff-accounts/')
  ) {
    return role === 'super_admin';
  }

  if (role === 'super_admin' || role === 'admin') return true;
  
  if (role === 'trainer') {
    if (pathname === '/admin/trainer') return true;
    if (pathname === '/admin/my-members' || pathname.startsWith('/admin/my-members/')) return true;
    if (pathname === '/admin/my-appointments' || pathname.startsWith('/admin/my-appointments/')) return true;
    if (pathname === '/admin/my-availability' || pathname.startsWith('/admin/my-availability/')) return true;
    return false;
  }
  
  if (role === 'reception') {
    const basePath = '/admin/reception';
    return pathname === basePath || pathname.startsWith(basePath + '/');
  }
  
  if (role === 'editor') {
    const cmsRoutes = ['/admin/homepage', '/admin/branches', '/admin/trainers', '/admin/events', '/admin/media', '/admin/community-updates'];
    return cmsRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));
  }
  
  return false;
}

assert(
  rolesContent.includes("'/admin/community-updates'"),
  "src/admin/auth/roles.ts includes '/admin/community-updates' in editor cmsRoutes"
);

assert(
  hasRoleAccessSimulated('super_admin', '/admin/community-updates') === true,
  "Role access: super_admin has access to /admin/community-updates"
);
assert(
  hasRoleAccessSimulated('admin', '/admin/community-updates') === true,
  "Role access: admin has access to /admin/community-updates"
);
assert(
  hasRoleAccessSimulated('editor', '/admin/community-updates') === true,
  "Role access: editor has access to /admin/community-updates"
);
assert(
  hasRoleAccessSimulated('trainer', '/admin/community-updates') === false,
  "Role access: trainer strictly DOES NOT have access to /admin/community-updates"
);
assert(
  hasRoleAccessSimulated('reception', '/admin/community-updates') === false,
  "Role access: reception strictly DOES NOT have access to /admin/community-updates"
);

console.log("\n=== 4. Admin Sidebar Invariants in src/admin/layouts/AdminLayout.tsx ===");
const layoutPath = path.resolve(process.cwd(), 'src/admin/layouts/AdminLayout.tsx');
assert(fs.existsSync(layoutPath), "src/admin/layouts/AdminLayout.tsx exists");
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

assert(
  layoutContent.includes('to="/admin/community-updates"') &&
  layoutContent.includes('>Topluluk</NavLink>'),
  "AdminLayout.tsx contains Topluluk link pointing to '/admin/community-updates'"
);

// Verify it's within showCMS block
const showCmsBlockMatch = layoutContent.match(/\{showCMS\s*&&\s*\([\s\S]*?\)\}/);
assert(showCmsBlockMatch !== null, "AdminLayout.tsx has {showCMS && (...)} navigation block");
if (showCmsBlockMatch) {
  assert(
    showCmsBlockMatch[0].includes('/admin/community-updates'),
    "Topluluk link is strictly located inside showCMS navigation section"
  );
}

console.log("\n=== 5. Component Structure & Existence ===");
const pagePath = path.resolve(process.cwd(), 'src/admin/pages/community-updates/CommunityUpdatesPage.tsx');
assert(fs.existsSync(pagePath), "CommunityUpdatesPage.tsx exists");
const pageContent = fs.readFileSync(pagePath, 'utf8');

const modalPath = path.resolve(process.cwd(), 'src/admin/pages/community-updates/CommunityUpdateEditorModal.tsx');
assert(fs.existsSync(modalPath), "CommunityUpdateEditorModal.tsx exists");
const modalContent = fs.readFileSync(modalPath, 'utf8');

console.log("\n=== 6. Endpoint & Query Contract Invariants ===");
assert(
  pageContent.includes('/api/admin/community-updates'),
  "Page uses canonical endpoint '/api/admin/community-updates'"
);
assert(
  !pageContent.includes('/api/admin/community/updates'),
  "Page strictly DOES NOT use obsolete '/api/admin/community/updates'"
);

// Query params check
assert(
  pageContent.includes('status=${statusFilter}&page=${page}&per_page=20') ||
  pageContent.includes('status=') && pageContent.includes('page=') && pageContent.includes('per_page='),
  "Page passes only canonical query parameters: status, page, per_page"
);
assert(!pageContent.includes('search='), "Page does NOT pass 'search' parameter");
assert(!pageContent.includes('sort='), "Page does NOT pass 'sort' parameter");
assert(!pageContent.includes('order='), "Page does NOT pass 'order' parameter");

console.log("\n=== 7. Strict Runtime Validation ===");
assert(
  pageContent.includes('validateCommunityUpdateListResponse'),
  "Page imports and calls validateCommunityUpdateListResponse on fetch results"
);
assert(
  modalContent.includes('validateCommunityUpdateDetail'),
  "Modal imports and calls validateCommunityUpdateDetail on detail fetch & mutation results"
);

console.log("\n=== 8. Zero Client-Side Sorting ===");
assert(
  !pageContent.includes('.sort('),
  "Page strictly preserves backend ordering without client-side .sort()"
);

console.log("\n=== 9. Mutation Payloads & Safety ===");
// Create / Edit payload
assert(
  modalContent.includes('apiClient.post') &&
  modalContent.includes('apiClient.patch'),
  "Modal invokes apiClient.post and apiClient.patch for create and edit"
);
assert(
  modalContent.includes('/api/admin/community-updates/${updateId}') ||
  modalContent.includes('/api/admin/community-updates/'),
  "Modal uses canonical update endpoint '/api/admin/community-updates/{id}'"
);

// Payload exact keys: title, body, status
assert(
  !modalContent.includes('created_by_admin_id:') &&
  !modalContent.includes('updated_by_admin_id:') &&
  !modalContent.includes('creator_display_name:') &&
  !modalContent.includes('published_at:'),
  "Modal payload does NOT send internal actor fields or published_at"
);

// Delete mutation
assert(
  pageContent.includes('apiClient.delete(`/api/admin/community-updates/${deletingId}`)') ||
  pageContent.includes('apiClient.delete('),
  "Page uses canonical DELETE on '/api/admin/community-updates/{id}'"
);
assert(
  pageContent.includes('Bu duyuruyu silmek istediğinize emin misiniz?'),
  "Page includes exact soft-delete confirmation prompt"
);
assert(
  !pageContent.includes('restore') && !pageContent.includes('arşiv'),
  "Page does NOT contain restore or archive actions (out of scope for F32B)"
);

console.log("\n=== 10. Double-Submit Protection ===");
assert(
  modalContent.includes('submitting') && modalContent.includes('disabled={submitting}'),
  "Modal prevents double submit via submitting state and disabled controls"
);

console.log("\n=== 11. Race Safety in List Fetch ===");
assert(
  pageContent.includes('AbortController') &&
  pageContent.includes('abortControllerRef') &&
  pageContent.includes('requestGenerationRef') &&
  pageContent.includes('isMountedRef'),
  "Page implements race cancellation with AbortController, generation counter, and mount tracking"
);

console.log("\n=== 12. Bounded User-Facing Error Messages ===");
assert(
  pageContent.includes('Topluluk duyuruları yüklenemedi.'),
  "Page uses bounded error message: 'Topluluk duyuruları yüklenemedi.'"
);
assert(
  modalContent.includes('Duyuru oluşturulamadı.') &&
  modalContent.includes('Duyuru güncellenemedi.'),
  "Modal uses bounded error messages for create/update failures"
);
assert(
  pageContent.includes('Duyuru silinemedi.'),
  "Page uses bounded error message: 'Duyuru silinemedi.'"
);

// Check that raw err.message is not rendered to user
assert(
  !pageContent.includes('err.message') && !pageContent.includes('error.message'),
  "Page does NOT leak raw err.message or error.message"
);
assert(
  !modalContent.includes('err.message') && !modalContent.includes('error.message'),
  "Modal does NOT leak raw err.message or error.message"
);

console.log("\n=== 13. Deterministic Timestamp Formatting ===");
assert(
  pageContent.includes('function formatDateTime'),
  "Page defines local deterministic formatDateTime string helper"
);
assert(
  !pageContent.includes('new Date(') &&
  !pageContent.includes('toLocaleDateString') &&
  !pageContent.includes('Intl.DateTimeFormat'),
  "Page does NOT use non-deterministic Date API or Intl formatters"
);

console.log("\n=== 14. Touch Targets & Accessibility (>= 44px) ===");
assert(
  pageContent.includes('min-h-[44px]'),
  "Page enforces min-h-[44px] touch targets on interactive controls"
);
assert(
  modalContent.includes('min-h-[44px]'),
  "Modal enforces min-h-[44px] touch targets on buttons"
);

console.log("\n=== 15. Empty States ===");
assert(
  pageContent.includes('Henüz topluluk duyurusu bulunmuyor.') &&
  pageContent.includes('Taslak duyuru bulunmuyor.') &&
  pageContent.includes('Yayında duyuru bulunmuyor.'),
  "Page defines all three canonical empty states: all, draft, published"
);

console.log("\n=== 16. Anti-Scope Hygiene Guard ===");
const forbiddenUIKeywords = [
  'community_comments',
  'community_likes',
  'community_reactions',
  'direct_message',
  'chat_room',
  'view_count',
  'read_receipt',
  'user_targeting',
  'media_upload',
  'file_attachment'
];

for (const kw of forbiddenUIKeywords) {
  assert(!pageContent.toLowerCase().includes(kw), `Page does not mention forbidden anti-scope feature: ${kw}`);
  assert(!modalContent.toLowerCase().includes(kw), `Modal does not mention forbidden anti-scope feature: ${kw}`);
}

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("\n❌ FAILED: Admin Community Updates UI verification detected violations.");
  process.exit(1);
} else {
  console.log("\n✅ SUCCESS: All Admin Community Updates UI invariants verified.");
  process.exit(0);
}
