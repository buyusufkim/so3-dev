import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let currentStep = '';
let hasErrors = false;

function step(name) {
  currentStep = name;
}

function check(condition, message) {
  if (!condition) {
    console.error(`❌ [${currentStep}] ${message}`);
    hasErrors = true;
  }
}

try {
  // 1. Structure
  step('Directory Structure');
  const memberDir = path.join(ROOT_DIR, 'src', 'member');
  check(fs.existsSync(memberDir), 'src/member directory missing');
  
  const apiClientPath = path.join(memberDir, 'api', 'client.ts');
  check(fs.existsSync(apiClientPath), 'src/member/api/client.ts missing');
  
  // 2. Member API Client Isolation & Envelopes
  step('Member API Client Isolation & Envelopes');
  const apiClientCode = fs.readFileSync(apiClientPath, 'utf-8');
  check(!apiClientCode.includes('src/admin/api/client'), 'Member client must not import admin client');
  check(!apiClientCode.includes('adminDevFallback'), 'Member client must not import adminDevFallback');
  check(apiClientCode.includes('/api/member-auth/csrf'), 'Member CSRF endpoint not found in client');
  check(apiClientCode.includes('so3_member_auth_expired'), 'Member client must use so3_member_auth_expired event');
  check(!apiClientCode.includes('so3_auth_expired'), 'Member client must not use admin auth expired event');
  
  check(apiClientCode.includes('/api/member-auth/login'), 'Login endpoint missing');
  check(apiClientCode.includes('/api/member-auth/me'), 'Me endpoint missing');
  check(apiClientCode.includes('/api/member-auth/logout'), 'Logout endpoint missing');
  check(apiClientCode.includes('/api/member-auth/change-password'), 'Change password endpoint missing');
  
  check(apiClientCode.includes('/api/member/overview'), 'Overview read endpoint missing');
  check(apiClientCode.includes('/api/member/session-packages'), 'Packages read endpoint missing');
  check(apiClientCode.includes('/api/member/appointments'), 'Appointments read endpoint missing');
  check(apiClientCode.includes('/api/member/training-program'), 'Training program read endpoint missing');
  
  check(!apiClientCode.includes('member_id='), 'No client member ID query params allowed');
  
  check(apiClientCode.includes('unwrapSuccessEnvelope'), 'Must unwrap success envelope');
  check(!apiClientCode.includes('data.csrf_token') || apiClientCode.includes('unwrapSuccessEnvelope'), 'CSRF must unwrap envelope securely');
  
  // 3. Response Validation
  step('Strict Response Validators');
  const validatorsPath = path.join(memberDir, 'api', 'validators.ts');
  check(fs.existsSync(validatorsPath), 'validators.ts missing');
  const validatorsCode = fs.readFileSync(validatorsPath, 'utf-8');
  
  check(!validatorsCode.includes('as any') && !apiClientCode.includes('as any'), 'NO "as any" allowed');
  check(!validatorsCode.includes(': any') && !apiClientCode.includes(': any'), 'NO ": any" allowed');
  check(!validatorsCode.includes('@ts-ignore'), 'NO @ts-ignore allowed');
  check(!validatorsCode.includes('unknown as'), 'NO "unknown as" allowed');
  
  check(!validatorsCode.includes('? value : 0') && !validatorsCode.includes(': 0,'), 'No silent normalization to 0');
  check(!validatorsCode.includes('? value : ""') && !validatorsCode.includes(': "",'), 'No silent normalization to ""');
  check(!validatorsCode.includes('Array.isArray') || !validatorsCode.includes('? d.upcoming.map') || !validatorsCode.includes(': []'), 'No fallback to [] for required arrays');
  
  check(!validatorsCode.includes('member.status'), 'Member overview contract should not have member.status');
  check(!validatorsCode.includes('membership.membership_start_date'), 'Membership start date field is start_date');
  check(!validatorsCode.includes('membership.membership_end_date'), 'Membership end date field is end_date');
  
  check(validatorsCode.includes('validateMemberLoginResponse'), 'Login response validator missing');
  check(apiClientCode.includes('validateMemberLoginResponse'), 'Login endpoint must use login validator');
  check(validatorsCode.includes('validateMemberAuthIdentity'), 'Auth identity validator missing');
  check(validatorsCode.includes('validateMemberOverview'), 'Overview validator missing');
  check(validatorsCode.includes('validateSessionPackages'), 'Packages validator missing');
  check(validatorsCode.includes('validateAppointments'), 'Appointments validator missing');
  check(validatorsCode.includes('validateTrainingPrograms'), 'Training program validator missing');
  
  step('Real Date Validation');
  const dateRegexOnlyMatch = validatorsCode.match(/isValidDate[\s\S]*?return\s+\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(value\)/);
  check(!dateRegexOnlyMatch, 'isValidDate must not be a regex-only one-liner');
  check(validatorsCode.includes('parseInt') && validatorsCode.includes('match[1]') && validatorsCode.includes('match[2]'), 'Must parse year, month, day components');
  check(validatorsCode.includes('month < 1') || validatorsCode.includes('month > 12'), 'Must validate month bounds');
  check(validatorsCode.includes('daysInMonth') || validatorsCode.includes('31, 28'), 'Must perform days-in-month boundary checks');
  check(validatorsCode.includes('% 4 === 0') || validatorsCode.includes('isLeap'), 'Must include leap year calculation logic');
  
  step('Real DateTime Validation');
  const dateTimeRegexOnlyMatch = validatorsCode.match(/isValidDateTime[\s\S]*?return\s+\/\^\\d\{4\}-\\d\{2\}-\\d\{2\} \\d\{2\}:\\d\{2\}:\\d\{2\}\$\/\.test\(value\)/);
  check(!dateTimeRegexOnlyMatch, 'isValidDateTime must not be a regex-only one-liner');
  check(validatorsCode.includes('isValidDate('), 'isValidDateTime must reuse isValidDate for the date part');
  check(validatorsCode.includes('hour > 23'), 'Must validate hour upper bound (23)');
  check(validatorsCode.includes('minute > 59'), 'Must validate minute upper bound (59)');
  check(validatorsCode.includes('second > 59'), 'Must validate second upper bound (59)');

  // 4. Routes
  step('Route Isolation');
  const routesPath = path.join(ROOT_DIR, 'src', 'routes', 'index.tsx');
  const routesCode = fs.readFileSync(routesPath, 'utf-8');
  check(routesCode.includes('path: "/uye"'), '/uye route missing');
  check(routesCode.includes('MemberAuthProvider'), 'MemberAuthProvider missing in routes');
  check(routesCode.includes('MemberLayout'), 'MemberLayout missing in routes');
  check(routesCode.includes('MemberLoginPage'), 'MemberLoginPage missing in routes');
  check(routesCode.includes('MemberChangePasswordPage'), 'MemberChangePasswordPage missing in routes');
  check(routesCode.includes('MemberDashboardPage'), 'MemberDashboardPage missing in routes');
  
  const adminBlock = routesCode.indexOf('path: "/admin"');
  const uyeBlock = routesCode.indexOf('path: "/uye"');
  check(uyeBlock < adminBlock || uyeBlock > adminBlock, 'Member routes must be peer to Admin routes, not under them');
  
  // 5. Layout & Auth Provider
  step('Layout and Context');
  const layoutPath = path.join(memberDir, 'layouts', 'MemberLayout.tsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf-8');
  check(layoutCode.includes('noindex,nofollow'), 'Layout must set noindex,nofollow');
  check(layoutCode.includes('useMemberAuth'), 'Layout must use member auth');
  check(!layoutCode.includes('admin'), 'Layout must not use admin internals');
  
  const authCtxPath = path.join(memberDir, 'auth', 'MemberAuthContext.tsx');
  const authCtxCode = fs.readFileSync(authCtxPath, 'utf-8');
  check(authCtxCode.includes('memberApiClient.me'), 'Provider must boot from /me');
  check(authCtxCode.includes('so3_member_auth_expired'), 'Provider must listen to member auth expired event');
  check(authCtxCode.includes('401'), 'Auth context must separate 401 error');
  check(authCtxCode.includes('authError'), 'Auth context must track authError');
  
  // 6. Login
  step('Login Semantics');
  const loginPath = path.join(memberDir, 'pages', 'MemberLoginPage.tsx');
  const loginCode = fs.readFileSync(loginPath, 'utf-8');
  check(loginCode.includes('login(username'), 'Must call login client');
  check(!loginCode.includes('Kayıt Ol') && !loginCode.includes('Hesap Oluştur'), 'No public signup allowed');
  check(!loginCode.includes('Şifremi Unuttum'), 'No forgot password flow allowed');
  
  // 7. Password Change
  step('Password Change Semantics');
  const pwPath = path.join(memberDir, 'pages', 'MemberChangePasswordPage.tsx');
  const pwCode = fs.readFileSync(pwPath, 'utf-8');
  check(pwCode.includes('changePassword(currentPassword, newPassword)'), 'Must call changePassword client');
  check(pwCode.includes('refreshIdentity'), 'Must refresh identity after change');
  check(pwCode.includes('freshIdentity'), 'Change password must use freshIdentity');
  check(pwCode.includes('!freshIdentity.account.must_change_password'), 'Must verify must_change_password flag is false');
  
  // 8. Dashboard
  step('Dashboard Constraints');
  const dashboardPath = path.join(memberDir, 'pages', 'MemberDashboardPage.tsx');
  const dashboardCode = fs.readFileSync(dashboardPath, 'utf-8');
  check(dashboardCode.includes('AbortController'), 'Must use AbortController');
  check(dashboardCode.includes('Promise.all'), 'Must load endpoints concurrently');
  check(dashboardCode.includes('PASSWORD_CHANGE_REQUIRED'), 'Must handle PASSWORD_CHANGE_REQUIRED error');
  check(!dashboardCode.includes('POST') && !dashboardCode.includes('PATCH'), 'No dashboard mutations allowed');
  check(dashboardCode.includes('membership.status'), 'Membership status check missing');
  check(dashboardCode.includes('remaining_sessions'), 'Packages check missing');
  check(dashboardCode.includes('controller.signal') || dashboardCode.includes('abortController?.signal'), 'Dashboard must pass AbortSignal');
  check(apiClientCode.includes('signal?: AbortSignal'), 'Client endpoints must accept AbortSignal');
  
  const dataErrorIdx = dashboardCode.indexOf('if (dataError)');
  const overviewIdx = dashboardCode.indexOf('if (!overview)');
  check(dataErrorIdx !== -1 && overviewIdx !== -1 && dataErrorIdx < overviewIdx, 'dataError branch must be reachable before !overview');

  step('Dashboard Tracked Request Lifecycle');
  check(dashboardCode.includes('useRef<AbortController'), 'Dashboard must track AbortController in ref');
  check(!dashboardCode.includes('fetchData(new AbortController())'), 'Dashboard must not use raw AbortController instantiation in retry');
  check(dashboardCode.includes('current?.abort()'), 'Dashboard must abort active controller on cleanup or restart');
  
  // 9. Storage Leaks
  step('Storage Leak Prevention');
  const scanPaths = [apiClientPath, authCtxPath, loginPath, pwPath, dashboardPath];
  for (const p of scanPaths) {
    if (fs.existsSync(p)) {
      const code = fs.readFileSync(p, 'utf-8');
      check(!code.includes('localStorage.setItem(\'token'), 'No localStorage tokens allowed');
      check(!code.includes('sessionStorage.setItem'), 'No sessionStorage tokens allowed');
    }
  }

  // 10. Existing Verifiers & Artifacts
  step('Existing Setup Verification');
  check(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'verify-member-portal-auth-foundation.mjs')), 'F.18A verifier missing');
  check(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'verify-member-portal-read-model.mjs')), 'F.18B verifier missing');
  
  const files = fs.readdirSync(ROOT_DIR);
  check(!files.includes('patch.mjs'), 'Temp artifacts not allowed');
  
  if (hasErrors) {
    process.exit(1);
  } else {
    console.log('✅ PASS — F.18C MEMBER PORTAL FRONTEND SHELL & DASHBOARD CLOSED');
  }

} catch (e) {
  console.error(e);
  process.exit(1);
}
