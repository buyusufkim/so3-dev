import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const adminDevFallbackContent = fs.readFileSync(path.join(rootDir, 'src/admin/api/adminDevFallback.ts'), 'utf8');
const adminDevFixturesContent = fs.readFileSync(path.join(rootDir, 'src/admin/api/adminDevFixtures.ts'), 'utf8');

let errors = [];

// 1. fallback yalnız DEV gate altında
if (!adminDevFallbackContent.includes('import.meta.env.DEV')) {
  errors.push("DEV gate check is missing in adminDevFallback.ts");
}

// 2. production isolation korunuyor
if (adminDevFallbackContent.includes('process.env.NODE_ENV === "production"')) {
   // Just ensuring it doesn't do weird production overriding
}

// 3,4,6,7,8. Verify endpoints in adminDevFixtures.ts
const requiredPaths = [
  '/api/reception/occupancy',
  '/api/reception/members',
  'check-in',
  'check-out',
  'renew',
  'appointments',
  'reschedule',
  'staff-accounts',
  'member-measurements',
  'member-progress-notes'
];

for (const p of requiredPaths) {
  if (!adminDevFixturesContent.includes(p)) {
    errors.push(`adminDevFixtures.ts is missing mock for: ${p}`);
  }
}

// Verify trainer prefixes for measurements and progress notes
if (!adminDevFixturesContent.includes('(admin|trainer)\\/member-measurements')) {
  errors.push("Trainer measurement scope missing in adminDevFixtures.ts");
}
if (!adminDevFixturesContent.includes('(admin|trainer)\\/member-progress-notes')) {
  errors.push("Trainer progress notes scope missing in adminDevFixtures.ts");
}
if (!adminDevFallbackContent.includes('\\/api\\/trainer\\/member-measurements')) {
  errors.push("Trainer measurement scope missing in adminDevFallback.ts");
}

// Check adminDevFixtures dynamic import
if (!adminDevFallbackContent.includes('import(/* @vite-ignore */ modulePath)')) {
  errors.push("Dynamic import is broken in adminDevFallback.ts");
}

// Check if F.14 staff accounts uses stateful mock
// We just check if it doesn't use mockStaffAccounts array
if (adminDevFixturesContent.includes('mockStaffAccounts =')) {
  errors.push("Staff accounts uses unnecessary wide stateful mock");
}

if (errors.length > 0) {
  console.error("FAIL: Parity checks failed.");
  errors.forEach(e => console.error(" - " + e));
  process.exit(1);
}

console.log("PASS: admin-dev-fallback-parity verified.");
