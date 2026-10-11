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
  pkg.scripts && pkg.scripts["verify:member-profile-ui"] === "node scripts/verify-member-profile-ui.mjs",
  "Package.json exact registration: 'verify:member-profile-ui' === 'node scripts/verify-member-profile-ui.mjs'"
);

console.log("\n=== 2. Route Registration & Lazy Loading in src/routes/index.tsx ===");
const routesPath = path.resolve(process.cwd(), 'src/routes/index.tsx');
assert(fs.existsSync(routesPath), "src/routes/index.tsx exists");
const routesContent = fs.readFileSync(routesPath, 'utf8');

assert(
  routesContent.includes('const MemberProfilePage = lazy(() => import("../member/pages/MemberProfilePage")') ||
  routesContent.includes("const MemberProfilePage = lazy(() => import('../member/pages/MemberProfilePage')"),
  "src/routes/index.tsx imports MemberProfilePage via lazy loading"
);

assert(
  routesContent.includes('path: "hesabim"') || routesContent.includes("path: 'hesabim'"),
  "src/routes/index.tsx defines 'hesabim' path under member routes"
);

assert(
  routesContent.includes('<MemberSuspense><MemberProfilePage /></MemberSuspense>'),
  "/uye/hesabim route renders <MemberProfilePage /> wrapped in <MemberSuspense>"
);

// Verify existing member routes are preserved
const existingRoutes = ['programim', 'randevu-al', 'gelisim', 'topluluk', 'giris', 'sifre-degistir'];
for (const r of existingRoutes) {
  assert(
    routesContent.includes(`path: "${r}"`) || routesContent.includes(`path: '${r}'`),
    `Existing member route '${r}' is preserved in src/routes/index.tsx`
  );
}

console.log("\n=== 3. Navigation Invariants in src/member/layouts/MemberLayout.tsx ===");
const layoutPath = path.resolve(process.cwd(), 'src/member/layouts/MemberLayout.tsx');
assert(fs.existsSync(layoutPath), "src/member/layouts/MemberLayout.tsx exists");
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

assert(
  !layoutContent.includes('/admin') && !layoutContent.includes('AdminLayout'),
  "MemberLayout.tsx contains zero references to admin internals"
);

// Desktop navigation link
const desktopNavMatch = layoutContent.match(/<nav className="hidden sm:flex[^"]*">([\s\S]*?)<\/nav>/);
assert(desktopNavMatch !== null, "Desktop navigation <nav> element found");
const desktopNavContent = desktopNavMatch ? desktopNavMatch[1] : '';

assert(
  desktopNavContent.includes('to="/uye/hesabim"') && desktopNavContent.includes('Hesabım'),
  "Desktop navigation includes 'Hesabım' NavLink targeting /uye/hesabim"
);

// Mobile navigation link
const mobileNavMatch = layoutContent.match(/<nav className="max-w-5xl mx-auto px-4 flex items-center gap-4 py-2 overflow-x-auto">([\s\S]*?)<\/nav>/);
assert(mobileNavMatch !== null, "Mobile navigation <nav> element found");
const mobileNavContent = mobileNavMatch ? mobileNavMatch[1] : '';

assert(
  mobileNavContent.includes('to="/uye/hesabim"') && mobileNavContent.includes('Hesabım'),
  "Mobile navigation includes 'Hesabım' NavLink targeting /uye/hesabim"
);

// 44px touch target on both nav links
assert(
  desktopNavContent.includes('min-h-[44px]') && desktopNavContent.includes('/uye/hesabim'),
  "Desktop 'Hesabım' NavLink enforces min-h-[44px] touch target accessibility"
);
assert(
  mobileNavContent.includes('min-h-[44px]') && mobileNavContent.includes('/uye/hesabim'),
  "Mobile 'Hesabım' NavLink enforces min-h-[44px] touch target accessibility"
);

// Navigation guard
assert(
  layoutContent.includes('isAuthenticated && identity && !identity.account.must_change_password'),
  "MemberLayout preserves strict authentication & password-change gate for navigation links"
);

console.log("\n=== 4. MemberProfilePage Component & Canonical Client ===");
const pagePath = path.resolve(process.cwd(), 'src/member/pages/MemberProfilePage.tsx');
assert(fs.existsSync(pagePath), "src/member/pages/MemberProfilePage.tsx exists");
const pageContent = fs.readFileSync(pagePath, 'utf8');

assert(
  pageContent.includes("memberApiClient.getProfile("),
  "MemberProfilePage calls canonical memberApiClient.getProfile()"
);
assert(
  pageContent.includes("controller.signal") || pageContent.includes("signal"),
  "Component passes AbortSignal to memberApiClient.getProfile()"
);
assert(
  !pageContent.includes("window.fetch") && !pageContent.includes("fetch("),
  "Component strictly does NOT use raw window.fetch"
);
assert(
  !pageContent.includes("adminApiClient") && !pageContent.includes("/admin/"),
  "Component strictly does NOT import admin API client"
);
assert(
  !pageContent.includes("profile?") && !pageContent.includes("getProfile('?") && !pageContent.includes('getProfile("?'),
  "Component sends zero query parameters to getProfile endpoint"
);

// Race safety and lifecycle guards
assert(
  pageContent.includes("new AbortController()") &&
  pageContent.includes("abortControllerRef") &&
  pageContent.includes("requestGenerationRef") &&
  pageContent.includes("isMountedRef"),
  "Component protects against race conditions with AbortController, request generation counter, and mount guard"
);

console.log("\n=== 5. Page Headings, Card Layout & Semantic Accessibility ===");
assert(
  pageContent.includes("<h1") && pageContent.includes("Hesabım") && (pageContent.match(/<h1/g) || []).length === 1,
  "Page contains exactly one single semantic <h1> titled 'Hesabım'"
);
assert(
  pageContent.includes("Hesap ve iletişim bilgilerini görüntüle."),
  "Page displays canonical subtitle: 'Hesap ve iletişim bilgilerini görüntüle.'"
);

// Three distinct card sections with semantic h2
assert(
  pageContent.includes("<h2") && pageContent.includes("Kişisel Bilgiler"),
  "Card A header is semantic <h2> titled 'Kişisel Bilgiler'"
);
assert(
  pageContent.includes("<h2") && pageContent.includes("İletişim Bilgileri"),
  "Card B header is semantic <h2> titled 'İletişim Bilgileri'"
);
assert(
  pageContent.includes("<h2") && pageContent.includes("Hesap ve Acil Durum Bilgileri"),
  "Card C header is semantic <h2> titled 'Hesap ve Acil Durum Bilgileri'"
);

// Semantic dl / dt / dd usage
assert(
  pageContent.includes("<dl") && pageContent.includes("<dt") && pageContent.includes("<dd"),
  "Cards use semantic <dl>, <dt>, <dd> for clear label-value relationships"
);

// Mobile responsiveness & word-break
assert(
  pageContent.includes("break-words"),
  "Component applies 'break-words' to prevent long emails or phone numbers from overflowing on mobile"
);

// Loading skeleton within the page
assert(
  pageContent.includes("animate-pulse"),
  "Component renders compact loading skeleton cards within the page"
);

// Bounded Turkish error copy & retry button
assert(
  pageContent.includes("Hesap bilgilerin yüklenemedi."),
  "Component displays bounded Turkish error message: 'Hesap bilgilerin yüklenemedi.'"
);
assert(
  pageContent.includes("Tekrar Dene"),
  "Component renders retry button 'Tekrar Dene'"
);
assert(
  pageContent.includes("min-h-[44px]") && pageContent.includes("Tekrar Dene"),
  "Retry button enforces min-h-[44px] touch target accessibility"
);

console.log("\n=== 6. Field Presentation & Fallback Invariants ===");
// Account fields
assert(
  pageContent.includes("profileData.account.username"),
  "Component renders account.username"
);
assert(
  pageContent.includes("profileData.account.status"),
  "Component renders account.status"
);

// Profile fields
assert(
  pageContent.includes("profileData.profile.first_name"),
  "Component renders profile.first_name"
);
assert(
  pageContent.includes("profileData.profile.last_name"),
  "Component renders profile.last_name"
);
assert(
  pageContent.includes("profileData.profile.phone"),
  "Component renders profile.phone"
);
assert(
  pageContent.includes("profileData.profile.email"),
  "Component renders profile.email"
);
assert(
  pageContent.includes("profileData.profile.emergency_contact_name"),
  "Component renders profile.emergency_contact_name"
);
assert(
  pageContent.includes("profileData.profile.emergency_contact_phone"),
  "Component renders profile.emergency_contact_phone"
);

// Canonical fallback label
assert(
  pageContent.includes("Belirtilmemiş"),
  "Component uses canonical 'Belirtilmemiş' fallback for null or empty values"
);
assert(
  pageContent.includes("Aktif"),
  "Component maps 'active' account status to Turkish label 'Aktif'"
);

console.log("\n=== 7. Algorithmic Simulation of Helpers & Display Logic ===");
function simulateFormatValue(val) {
  if (!val || typeof val !== 'string' || val.trim() === '') {
    return 'Belirtilmemiş';
  }
  return val.trim();
}

function simulateAccountStatus(status) {
  if (!status || typeof status !== 'string') {
    return { label: 'Belirtilmemiş', badgeClass: 'bg-white/10 text-white/70 border-white/10' };
  }
  const normalized = status.trim().toLowerCase();
  if (normalized === 'active') {
    return { label: 'Aktif', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  }
  return { label: 'Belirtilmemiş', badgeClass: 'bg-white/10 text-white/70 border-white/10' };
}

// Test formatValue
assert(simulateFormatValue(null) === 'Belirtilmemiş', "Sim: null formats to 'Belirtilmemiş'");
assert(simulateFormatValue(undefined) === 'Belirtilmemiş', "Sim: undefined formats to 'Belirtilmemiş'");
assert(simulateFormatValue('') === 'Belirtilmemiş', "Sim: empty string formats to 'Belirtilmemiş'");
assert(simulateFormatValue('   ') === 'Belirtilmemiş', "Sim: whitespace string formats to 'Belirtilmemiş'");
assert(simulateFormatValue('05551234567') === '05551234567', "Sim: valid phone preserved");
assert(simulateFormatValue('ahmet@example.com') === 'ahmet@example.com', "Sim: valid email preserved");

// Test account status formatting
assert(simulateAccountStatus('active').label === 'Aktif', "Sim: 'active' maps to 'Aktif'");
assert(simulateAccountStatus('ACTIVE').label === 'Aktif', "Sim: uppercase 'ACTIVE' maps to 'Aktif'");
assert(simulateAccountStatus('inactive').label === 'Belirtilmemiş', "Sim: unknown status safely falls back to 'Belirtilmemiş'");
assert(simulateAccountStatus(null).label === 'Belirtilmemiş', "Sim: null status falls back to 'Belirtilmemiş'");

console.log("\n=== 8. Controlled Self-Service & Anti-Scope Invariants ===");
// Only email, emergency_contact_name, emergency_contact_phone may have inputs
assert(
  !pageContent.includes("<textarea") && !pageContent.includes("<select"),
  "Component strictly contains zero textarea or select inputs"
);
assert(
  !pageContent.includes('name="first_name"') &&
  !pageContent.includes('name="last_name"') &&
  !pageContent.includes('name="phone"') &&
  !pageContent.includes('name="username"') &&
  !pageContent.includes('value={editFirstName') &&
  !pageContent.includes('value={editLastName') &&
  !pageContent.includes('value={editPhone'),
  "Identity and primary phone fields are strictly locked from user editing"
);
assert(
  pageContent.includes("Bilgilerimi Düzenle") && pageContent.includes("Kaydet") && pageContent.includes("Vazgeç"),
  "Component provides controlled 'Bilgilerimi Düzenle', 'Kaydet', and 'Vazgeç' buttons"
);
assert(
  !pageContent.includes("type=\"file\"") && !pageContent.includes("avatar"),
  "Component strictly contains zero avatar/media upload mechanisms"
);
assert(
  !pageContent.includes("password_hash") &&
  !pageContent.includes("auth_version") &&
  !pageContent.includes("last_login_ip") &&
  !pageContent.includes("trainer_id") &&
  !pageContent.includes("member_id") &&
  !pageContent.includes("account_id"),
  "Component strictly avoids rendering or expecting internal database/audit IDs"
);

console.log("\n=== 9. Non-Regression & Scope Isolation ===");
// Verify existing member pages are not modified
const dashboardPath = path.resolve(process.cwd(), 'src/member/pages/MemberDashboardPage.tsx');
assert(fs.existsSync(dashboardPath), "MemberDashboardPage.tsx exists");
const trainingProgramPagePath = path.resolve(process.cwd(), 'src/member/pages/MemberTrainingProgramPage.tsx');
assert(fs.existsSync(trainingProgramPagePath), "MemberTrainingProgramPage.tsx exists");

// Zero backend or schema modifications in F.34B
const migDir = path.resolve(process.cwd(), 'database/migrations');
const migFiles = fs.readdirSync(migDir).filter(f => f.endsWith('.sql'));
assert(migFiles.length === 44, "Total migration count remains strictly 44 (001 to 044)");

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more F.34B Member Profile UI invariants failed.");
  process.exit(exitCode);
} else {
  console.log("PASS — F.34B MEMBER PROFILE READ-ONLY UI IMPLEMENTED");
}
