import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());

function check(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
}

function step(name) {
  console.log(`\n👉 ${name}`);
}

try {
  step('Repository Hygiene');
  const files = fs.readdirSync(ROOT_DIR);
  const badFiles = files.filter(f => 
    /^patch.*\\.(m?js|php)$/.test(f) || 
    /^tmp.*\\.(m?js|php)$/.test(f) || 
    f.endsWith('.tmp') || 
    f.endsWith('.fixed') ||
    f.startsWith('add-') && f.endsWith('.php')
  );
  check(badFiles.length === 0, 'No temporary patch or artifact files allowed in repository root');

  step('Verifying F.19A Trainer Mobile Workspace Shell');

  const layoutPath = path.join(ROOT_DIR, 'src/admin/layouts/AdminLayout.tsx');
  const navPath = path.join(ROOT_DIR, 'src/admin/components/TrainerMobileNavigation.tsx');
  const routesPath = path.join(ROOT_DIR, 'src/routes/index.tsx');
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  const rolesPath = path.join(ROOT_DIR, 'src/admin/auth/roles.ts');

  const layoutCode = fs.readFileSync(layoutPath, 'utf8');
  const navCode = fs.readFileSync(navPath, 'utf8');
  const routesCode = fs.readFileSync(routesPath, 'utf8');
  const pkgCode = fs.readFileSync(pkgPath, 'utf8');
  const rolesCode = fs.readFileSync(rolesPath, 'utf8');

  step('Route Contract');
  check(routesCode.includes('path: "trainer"'), 'Canonical trainer dashboard route missing');
  check(routesCode.includes('path: "my-appointments"'), 'Canonical trainer appointments route missing');
  check(routesCode.includes('path: "my-members"'), 'Canonical trainer members route missing');
  check(!routesCode.includes('path: "/trainer"'), 'Top-level /trainer route is forbidden');

  step('Role Boundary');
  check(layoutCode.includes("isTrainer"), 'Role boundary gate missing in layout');
  check(layoutCode.includes("isTrainerMobile"), 'Trainer mobile shell gate missing');

  step('Desktop Sidebar & Admin Regression');
  check(layoutCode.includes("isSuperOrAdmin"), 'Admin layout regression');
  check(layoutCode.includes("isEditor"), 'Editor layout regression');
  check(layoutCode.includes("isReception"), 'Reception layout regression');
  check(layoutCode.includes("w-64 bg-[#121212]"), 'Desktop sidebar width removed');
  check(layoutCode.includes("hidden lg:flex") || layoutCode.includes("lg:block"), 'Desktop sidebar must be hidden on mobile for trainers');

  step('Bottom Nav Exact Links & Active Handling');
  check(navCode.includes('to="/admin/trainer"'), 'Missing home nav link');
  check(navCode.includes('to="/admin/my-appointments"'), 'Missing appointments nav link');
  check(navCode.includes('to="/admin/my-members"'), 'Missing members nav link');
  check(navCode.includes("startsWith('/admin/my-members')"), 'Nested members active state handling missing');
  check(!navCode.includes('/admin/settings'), 'Unauthorized setting link in trainer mobile nav');
  check(!navCode.includes('/admin/members'), 'Unauthorized admin members link in trainer mobile nav');

  step('Safe-area & Padding');
  check(navCode.includes('safe-area-inset-bottom'), 'Safe-area handling missing in bottom nav');
  check(layoutCode.includes('pb-24 lg:pb-0'), 'Content bottom spacing missing for mobile bottom nav');
  check(layoutCode.includes('px-4 py-6'), 'Compact mobile padding missing');

  step('No Duplicated Auth/API');
  check(!navCode.includes('/api/auth/me'), 'No separate auth fetch allowed in mobile nav component');
  check(!navCode.includes('localStorage'), 'No localStorage allowed in mobile nav component');
  check(!navCode.includes('sessionStorage'), 'No sessionStorage allowed in mobile nav component');

  step('Logout Reuse');
  check(navCode.includes('onLogout'), 'Component must receive onLogout prop');
  check(!navCode.includes('/api/auth/logout'), 'Component must not duplicate logout API call');

  step('No External UI Dependency');
  check(!pkgCode.includes('@headlessui'), 'Headless UI is forbidden');
  check(!pkgCode.includes('@radix'), 'Radix UI is forbidden');
  check(!pkgCode.includes('@mui'), 'MUI is forbidden');

  console.log('✅ PASS — F.19A TRAINER MOBILE WORKSPACE SHELL CLOSED');
} catch (err) {
  console.error(err);
  process.exit(1);
}
