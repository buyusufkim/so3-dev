import fs from 'fs';

let exitCode = 0;
function check(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`);
    } else {
        console.error(`[FAIL] ${message}`);
        exitCode = 1;
    }
}

const controllerStr = fs.readFileSync('api/controllers/AppointmentController.php', 'utf8');
const modalStr = fs.readFileSync('src/admin/pages/appointments/AppointmentCreateModal.tsx', 'utf8');
const fixturesStr = fs.readFileSync('src/admin/api/adminDevFixtures.ts', 'utf8');
const typesStr = fs.readFileSync('src/admin/pages/appointments/types.ts', 'utf8');

// Modal
check(!modalStr.includes("continue;"), "package option malformed item 'continue' sessizce atılmıyor");
const createPathStr = modalStr.split('loadPackages')[1];
check(!createPathStr.includes("as any") && !createPathStr.includes("as unknown as") && !createPathStr.includes("@ts-ignore") && !createPathStr.includes("payload: any"), "package path '(response as any)' temizlendi");
check(modalStr.includes("loadPackages();") || modalStr.includes("loadPackages()"), "package race error gerçek refetch (loadPackages) yapıyor");

// Types
check(!typesStr.includes("new Date") || typesStr.includes("isValidCalendarDate"), "yalnız regex DATE validation temizlendi (reusable date check var)");
check(typesStr.includes("validateAppointmentSessionPackageOptionsResponse"), "reusable options response validator var");
check(typesStr.includes("validateAppointmentCreateSuccessResponse") && typesStr.includes("expectedMemberId") && typesStr.includes("expectedStartsAt"), "create success response member/trainer/time alanlarını doğruluyor");

// Fixtures
check(!fixturesStr.match(/memberSessionPackages\.filter.*=>.*\).map\(getDerivedMsp\)/) === false, "DEV member package GET derivedMsp kullanıyor (raw object değil)");
check(!fixturesStr.includes("if (pkg.reserved_sessions > 0)"), "DEV cancellation raw pkg.reserved_sessions KULLANMIYOR");
check(fixturesStr.includes("getDerivedMsp(pkg).reserved_sessions > 0"), "DEV cancellation derivedMsp kullanıyor");
check(!fixturesStr.includes("items: packageLedgers.filter"), "DEV ledger {items: ...} dönmüyor (bare array)");
check(fixturesStr.includes("created_by_name: \"DEV Admin\""), "DEV ledger created_by_name içeriyor");
check(fixturesStr.includes("cancellation_reason"), "DEV release reason request cancellation reason kullanıyor");
check(!fixturesStr.match(/member_id:\s*Number\(p\.member_id\)/), "DEV create Number(...) coercion kullanmıyor");
check(!fixturesStr.includes("starts_at: String(p.starts_at || '2026-10-11 10:00:00')"), "DEV create synthetic time default kullanmıyor");
check(fixturesStr.includes("packageLedgers.filter") && fixturesStr.includes("getDerivedMsp"), "DEV reserve/release aynı ledger source-of-truth’u kullanıyor");

// Backend/Schema/Artifacts
check(!controllerStr.includes("handleCreate(['member_id', 'trainer_id', 'starts_at', 'ends_at']"), 'package-less backend create yeniden AÇILMADI');
check(!fs.existsSync('database/migrations/038_cutover.sql'), 'schema migration eklenmedi');
check(!fs.existsSync('patch_modal.mjs') && !fs.existsSync('patch_fixtures.mjs') && !fs.existsSync('patch_types.mjs') && !fs.existsSync('patch_modal_extract.mjs') && !fs.existsSync('patch_create_cancel.mjs') && !fs.existsSync('patch_fixtures_cutover.mjs'), 'temp patch artifact yok');

process.exit(exitCode);
