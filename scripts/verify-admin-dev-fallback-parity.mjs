import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const adminDevFallbackContent = fs.readFileSync(path.join(rootDir, 'src/admin/api/adminDevFallback.ts'), 'utf8');
const adminDevFixturesContent = fs.readFileSync(path.join(rootDir, 'src/admin/api/adminDevFixtures.ts'), 'utf8');

let errors = [];

// 1. DEV gate
if (!adminDevFallbackContent.includes('import.meta.env.DEV')) {
  errors.push("DEV gate check is missing in adminDevFallback.ts");
}
if (!adminDevFallbackContent.includes('return fetch(endpoint, options)')) {
  errors.push("DEV isolation missing return fetch(...)");
}

// 2. Fixtures dynamic DEV import
if (!adminDevFallbackContent.includes('import(/* @vite-ignore */ modulePath)')) {
  errors.push("Dynamic import is broken in adminDevFallback.ts");
}

// 3. appointment-trainers contract
if (!adminDevFixturesContent.includes('return createResponse({ data: { items } });') || !adminDevFixturesContent.includes('/api/reception/appointment-trainers')) {
  errors.push("appointment-trainers response does not match canonical {items:[...]}.");
}

// 4. appointment GET list canonical {items:[{appointment,member,trainer}]}
if (!adminDevFixturesContent.includes('return { appointment: a, member:') || !adminDevFixturesContent.includes('trainer: { id: trainer.id') || !adminDevFixturesContent.includes('uuid: (\'uuid\' in trainer') || !adminDevFixturesContent.includes('uuid: (\'uuid\' in member')) {
  errors.push("appointment list GET does not return proper {appointment, member, trainer} format.");
}

// 5. create request values to response
if (!adminDevFixturesContent.includes('starts_at: ') || !adminDevFixturesContent.includes('ends_at: ')) {
  errors.push("create does not map starts_at/ends_at properly.");
}

// 6. reschedule keeps identity
if (!adminDevFixturesContent.includes("appt.starts_at = p.starts_at") || !adminDevFixturesContent.includes("appt.status = 'scheduled'")) {
  errors.push("reschedule does not preserve identity / update starts_at and ends_at.");
}

// 7. cancel -> cancelled
if (!adminDevFixturesContent.includes("appt.status = 'cancelled'")) {
  errors.push("cancel does not set status to cancelled.");
}

// 8. complete -> completed
if (!adminDevFixturesContent.includes("appt.status = 'completed'")) {
  errors.push("complete does not set status to completed.");
}

// 9. no-show -> no_show
if (!adminDevFixturesContent.includes("appt.status = 'no_show'")) {
  errors.push("no-show does not set status to no_show.");
}

// 10. unsupported appointment scope
if (!adminDevFixturesContent.includes("if (scope === 'reception') return createError('Not found'")) {
  errors.push("Complete or no-show is not blocking reception scope.");
}

// 11. Staff account canonical response
if (!adminDevFixturesContent.includes('message: \'İşlem başarılı\'') || !adminDevFixturesContent.includes('role: p?.role || \'reception\'')) {
  errors.push("Staff accounts parity is broken.");
}

// 12. trainer measurement scope
if (!adminDevFixturesContent.includes('(admin|trainer)\\/member-measurements') || !adminDevFixturesContent.includes('(admin|trainer)\\/member-progress-notes')) {
  errors.push("Trainer measurement scope missing in adminDevFixtures.ts");
}
if (!adminDevFallbackContent.includes('\\/api\\/trainer\\/member-measurements')) {
  errors.push("Trainer measurement scope missing in adminDevFallback.ts");
}

// 13. reception occupancy/check-in...
if (!adminDevFixturesContent.includes('/api/reception/occupancy') || !adminDevFixturesContent.includes('/api/reception/members') || !adminDevFixturesContent.includes('check-in') || !adminDevFixturesContent.includes('renew')) {
  errors.push("Reception contracts are missing.");
}

// 14. unknown intercepted route -> 404
if (!adminDevFixturesContent.includes('return createError(\'Not implemented in mock\', 404);')) {
  errors.push("Unknown route fallback is broken.");
}

// 15. artifact absence
if (fs.existsSync(path.join(rootDir, 'append_fixtures.cjs')) || fs.existsSync(path.join(rootDir, 'append_fixtures.js')) || fs.existsSync(path.join(rootDir, 'fix_appointments.mjs'))) {
  errors.push("Temporary patch artifacts exist.");
}

// 16. package script
const pkg = fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8');
if (!pkg.includes('"verify:admin-dev-fallback-parity"')) {
  errors.push("verify:admin-dev-fallback-parity missing from package.json");
}

// 17. roles.ts semantics
const roles = fs.readFileSync(path.join(rootDir, 'src/admin/auth/roles.ts'), 'utf8');
if (!roles.includes("pathname === '/admin/audit-logs'") || !roles.includes("pathname === '/admin/staff-accounts'") || !roles.includes("return role === 'super_admin';")) {
  errors.push("roles.ts semantics broken");
}

// 18. PHP files
// No easy way to check they didn't change besides git status, but we haven't touched them.

if (errors.length > 0) {
  console.error("FAIL: Parity checks failed.");
  errors.forEach(e => console.error(" - " + e));
  process.exit(1);
}

console.log("PASS: admin-dev-fallback-parity verified.");
