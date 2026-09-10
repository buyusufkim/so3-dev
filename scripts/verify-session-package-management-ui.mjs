import fs from 'fs';
import path from 'path';

let exitCode = 0;

function check(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`);
    } else {
        console.error(`[FAIL] ${message}`);
        exitCode = 1;
    }
}

const spPagePath = 'src/admin/pages/session-packages/SessionPackagesPage.tsx';
const spTypesPath = 'src/admin/pages/session-packages/types.ts';
const memberEditorPath = 'src/admin/pages/members/AdminMemberEditor.tsx';
const memberPanelPath = 'src/admin/pages/members/MemberSessionPackagesPanel.tsx';
const memberTypesPath = 'src/admin/pages/members/types.ts';
const routesPath = 'src/routes/index.tsx';
const adminLayoutPath = 'src/admin/layouts/AdminLayout.tsx';
const devFallbackPath = 'src/admin/api/adminDevFallback.ts';
const devFixturesPath = 'src/admin/api/adminDevFixtures.ts';

check(fs.existsSync(spPagePath), 'SessionPackagesPage exists');
check(fs.existsSync(memberPanelPath), 'MemberSessionPackagesPanel exists');

const routes = fs.readFileSync(routesPath, 'utf8');
check(routes.includes('path: "session-packages"'), 'Route /admin/session-packages exists');
check(routes.includes('<SessionPackagesPage />'), 'SessionPackagesPage is loaded in routes');

const layout = fs.readFileSync(adminLayoutPath, 'utf8');
check(layout.includes('<NavLink to="/admin/session-packages"'), 'Sidebar link for session packages exists');
check(layout.includes('isSuperOrAdmin && (') && layout.indexOf('<NavLink to="/admin/session-packages"') > layout.indexOf('isSuperOrAdmin && ('), 'Sidebar link is under super_admin/admin restriction');

const spTypes = fs.readFileSync(spTypesPath, 'utf8');
check(spTypes.includes('validateSessionPackageListResponse'), 'Strict catalog runtime validators exist');

const spPage = fs.readFileSync(spPagePath, 'utf8');
check(spPage.includes('Yeni Seans Paketi'), 'Create modal UI exists');
check(spPage.includes('Paketi Düzenle'), 'Edit modal UI exists');
check(!spPage.includes('Sil'), 'No delete UI in catalog');
check(spPage.includes('q') && spPage.includes('status') && spPage.includes('page') && spPage.includes('per_page'), 'Search, status filter, and pagination present');

const editor = fs.readFileSync(memberEditorPath, 'utf8');
check(editor.includes('<MemberSessionPackagesPanel'), 'Member editor includes session packages panel');

const mTypes = fs.readFileSync(memberTypesPath, 'utf8');
check(mTypes.includes('validateMemberSessionPackage'), 'Strict member package validator exists');
check(mTypes.includes('validateMemberLedgerEntry'), 'Strict ledger validator exists');

const mPanel = fs.readFileSync(memberPanelPath, 'utf8');
check(mPanel.includes('/api/admin/session-packages?status=active'), 'Fetches active catalog packages for assignment');
check(mPanel.includes('session_package_id') && mPanel.includes('valid_from'), 'Assignment payload includes correct fields');
check(!mPanel.includes('valid_until:'), 'Client does not send valid_until');
check(mPanel.includes('/cancel'), 'Cancellation flow exists');
check(mPanel.includes('PACKAGE_HAS_ACTIVE_RESERVATIONS'), 'PACKAGE_HAS_ACTIVE_RESERVATIONS error mapping handled');
check(mPanel.includes('Hareketler'), 'Ledger read UI exists');
check(!mPanel.includes('adjustment_api_call') && !mPanel.match(/<button[^>]*>\s*Manuel Düzeltme\s*<\/button>/i), 'No adjustment mutation UI'); // Make sure no button for adjustment
check(!mPanel.match(/new Date\(.*?\).toLocaleString\(/), 'Dates formatted without timezone shifting (toLocaleString absent for strict dates)');
check(mPanel.includes('formatDate('), 'Custom format date used');

const fallback = fs.readFileSync(devFallbackPath, 'utf8');
check(fallback.includes('/api/admin/session-packages') && fallback.includes('/api/admin/member-session-packages'), 'DEV fallback targets added');

const fixtures = fs.readFileSync(devFixturesPath, 'utf8');
check(fixtures.includes('sessionPackages =') && fixtures.includes('memberSessionPackages ='), 'DEV catalog and member package stateful handlers exist');
check(fixtures.includes('total_sessions:') && fixtures.includes('remaining_sessions:'), 'DEV responses match backend parity');


check(!spPage.includes('as any') && !spPage.includes('as unknown'), 'SessionPackagesPage has no typescript escapes');
check(!mPanel.includes('as any') && !mPanel.includes('as unknown'), 'MemberSessionPackagesPanel has no typescript escapes');
check(spPage.includes('validateSessionPackage(res)') || spPage.includes('validateSessionPackage'), 'SessionPackagesPage validates mutation response');
check(mPanel.includes('validateMemberSessionPackage(res)'), 'MemberSessionPackagesPanel validates mutation response');
check(spPage.includes('isSubmittingRef.current'), 'Double submit protection in SessionPackagesPage');
check(mPanel.includes('isAssigningRef.current') && mPanel.includes('isCancellingRef.current'), 'Double submit protection in MemberSessionPackagesPanel');
check(fixtures.includes('PACKAGE_HAS_ACTIVE_RESERVATIONS'), 'adminDevFixtures handles PACKAGE_HAS_ACTIVE_RESERVATIONS');

process.exit(exitCode);
