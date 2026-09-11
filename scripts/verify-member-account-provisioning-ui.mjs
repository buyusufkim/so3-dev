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
  const adminMembersDir = path.join(ROOT_DIR, 'src', 'admin', 'pages', 'members');
  
  step('File existence');
  check(fs.existsSync(path.join(adminMembersDir, 'MemberPortalAccountPanel.tsx')), 'MemberPortalAccountPanel.tsx missing');
  check(fs.existsSync(path.join(adminMembersDir, 'memberPortalAccountTypes.ts')), 'memberPortalAccountTypes.ts missing');
  
  const editorPath = path.join(adminMembersDir, 'AdminMemberEditor.tsx');
  const editorCode = fs.readFileSync(editorPath, 'utf-8');
  
  step('AdminMemberEditor Integration');
  check(editorCode.includes('portal-account'), 'AdminMemberEditor must have portal-account tab');
  check(editorCode.includes('MemberPortalAccountPanel'), 'AdminMemberEditor must import and use MemberPortalAccountPanel');
  check(!editorCode.includes('<MemberPortalAccountPanel />') && editorCode.includes('memberId={'), 'AdminMemberEditor must pass memberId to panel');
  check(!editorCode.match(/<MemberPortalAccountPanel[^>]*memberId=\{parseInt\(id, 10\)\}/), 'AdminMemberEditor must not pass raw parseInt(id, 10) to PortalAccountPanel');
  check(editorCode.includes('const parsedMemberId = id && /^\\d+$/.test(id) ? parseInt(id, 10) : null'), 'AdminMemberEditor must use positive integer guard for id');

  check(editorCode.match(/<MemberPortalAccountPanel[^>]*key=\{validMemberId\}/), 'AdminMemberEditor must use key={validMemberId} to create a member identity boundary');

  check(!editorCode.includes('{activeTab === \'portal-account\' && id && ('), 'AdminMemberEditor must not use raw id for render guard');
  
  
  const panelPath = path.join(adminMembersDir, 'MemberPortalAccountPanel.tsx');
  const panelCode = fs.readFileSync(panelPath, 'utf-8');
  
  step('MemberPortalAccountPanel Endpoints');
  check(panelCode.includes('/api/admin/members/${memberId}/account'), 'GET account endpoint missing or invalid');
  check(panelCode.includes('apiClient.post(`/api/admin/members/${memberId}/account`'), 'POST create account endpoint missing or invalid');
  check(panelCode.includes('apiClient.patch(`/api/admin/member-accounts/${data.account.id}/status`'), 'PATCH status endpoint missing or invalid');
  check(panelCode.includes('apiClient.post(`/api/admin/member-accounts/${data.account.id}/reset-password`'), 'POST reset-password endpoint missing or invalid');
  
  check(!panelCode.includes('apiClient.delete'), 'No delete endpoint allowed');
  // Check for no username update: No PATCH to account endpoint with username body
  check(!panelCode.match(/apiClient\.patch\(.*\/account[^]*?username/s), 'No username update endpoint allowed');
  
  step('Validation & Types');
  const typesPath = path.join(adminMembersDir, 'memberPortalAccountTypes.ts');
  const typesCode = fs.readFileSync(typesPath, 'utf-8');
  
  check(typesCode.includes('validateMemberPortalAccountResponse'), 'Strict account GET validator missing');
  check(typesCode.includes('validateMemberPortalMutationResponse'), 'Strict success validator missing');
  
  check(!typesCode.includes('as any'), 'NO "as any" allowed');
  check(!typesCode.includes(': any'), 'NO ": any" allowed');
  check(!typesCode.includes('@ts-ignore'), 'NO @ts-ignore allowed');
  check(!typesCode.includes('unknown as'), 'NO "unknown as" allowed');
  
  check(panelCode.includes('validated.member.id !== memberId'), 'Must verify account.member_id/member.id parity with requested memberId');
  check(panelCode.includes('!data.account'), 'Must explicitly handle account-null state');
  
  step('Username Validation');
  check(panelCode.includes('toLowerCase()') && panelCode.includes('trim()'), 'Username must be lowercase normalized');
  check(panelCode.includes('/^[a-z0-9._-]+$/.test'), 'Username regex parity with backend missing');
  check(panelCode.includes('normalizedUsername.length < 3') && panelCode.includes('normalizedUsername.length > 50'), 'Username length strictly validated (3-50)');
  
  step('Password Validation');
  check(panelCode.includes('< 12') && panelCode.includes('> 256'), 'Password length validation (12-256) missing');
  check(panelCode.includes('!== createPasswordConfirm') || panelCode.includes('!== resetPasswordConfirm'), 'Password confirmation check missing');
  check(!panelCode.includes('password_confirm:') && !panelCode.includes('passwordConfirm:'), 'Confirmation must not be sent to backend');
  
  step('Security & State Handling');
  check(panelCode.includes('setCreatePassword("")'), 'Must clear create password state');
  check(panelCode.includes('setResetPassword("")'), 'Must clear reset password state');
  check(!panelCode.includes('localStorage.setItem'), 'No password persistence in localStorage');
  check(!panelCode.includes('sessionStorage.setItem'), 'No password persistence in sessionStorage');
  check(!panelCode.includes('console.log(createPassword)'), 'No password logging');
  
  check((panelCode.match(/fetchAccount\(\)/g) || []).length >= 4, 'Must refetch account after mutations');
  check(panelCode.includes('window.confirm'), 'Must confirm deactivation');
  
  step('UI Text & Formatting');
  check(panelCode.includes('Şifre sıfırlandığında'), 'Reset security explanation missing');
  check(panelCode.includes('id="portal-username"') && panelCode.includes('htmlFor="portal-username"'), 'Username input must have accessibility id/label');
  check(panelCode.includes('id="portal-create-password"') && panelCode.includes('htmlFor="portal-create-password"'), 'Create password input must have accessibility id/label');
  check(panelCode.includes('id="portal-create-password-confirm"') && panelCode.includes('htmlFor="portal-create-password-confirm"'), 'Create password confirm input must have accessibility id/label');
  check(panelCode.includes('id="portal-reset-password"') && panelCode.includes('htmlFor="portal-reset-password"'), 'Reset password input must have accessibility id/label');
  check(panelCode.includes('id="portal-reset-password-confirm"') && panelCode.includes('htmlFor="portal-reset-password-confirm"'), 'Reset password confirm input must have accessibility id/label');
  check(panelCode.includes('İlk girişte şifre değişikliği gerekli') && panelCode.includes('Şifre güncel'), 'must_change_password display text missing');
  
  check(panelCode.includes('formatDateTime'), 'DATETIME formatter missing');
  check(panelCode.includes('match') && !panelCode.includes('new Date('), 'DATETIME formatter must not use new Date()');
  check(typesCode.includes('function isValidDateTime'), 'DATETIME semantic validator missing');
  check(typesCode.includes('daysInMonth') && typesCode.includes('% 4 === 0'), 'DATETIME validator must check calendar day bounds and leap year');
  check(typesCode.includes('hour > 23') && typesCode.includes('minute > 59') && typesCode.includes('second > 59'), 'DATETIME validator must check time bounds');
  check(typesCode.includes('!isValidDateTime(account.last_login_at)') && typesCode.includes('!isValidDateTime(account.password_changed_at)') && typesCode.includes('!isValidDateTime(account.created_at)'), 'DATETIME validator must be used on nullable and strict date fields');
  
  step('Error Mapping');
  check(panelCode.includes('MEMBER_ACCOUNT_ALREADY_EXISTS'), 'MEMBER_ACCOUNT_ALREADY_EXISTS mapping missing');
  check(panelCode.includes('ACCOUNT_IDENTITY_CONFLICT'), 'ACCOUNT_IDENTITY_CONFLICT mapping missing');
  check(panelCode.includes('NOT_FOUND'), 'NOT_FOUND mapping missing');
  check(panelCode.includes('FORBIDDEN'), 'FORBIDDEN mapping missing');
  
  step('Concurrency Guards');
  check(panelCode.includes('isCreating.current') || panelCode.includes('isCreatingState'), 'Create mutation guard missing');
  check(panelCode.includes('const requestGenerationRef = useRef(0)'), 'Must have generation token or AbortController');
  check(panelCode.includes('requestGenerationRef.current++') || panelCode.includes('abort()'), 'Must invalidate old request on member change');
  check(panelCode.includes('requestedMemberId !== memberId'), 'Must verify response matches current member');
  check(panelCode.includes('isUpdatingStatus.current'), 'Status mutation guard missing');
  check(panelCode.includes('isResettingPassword.current'), 'Reset password mutation guard missing');

  check(
    (panelCode.match(/if \(!mountedRef\.current \|\| mutationMemberId !== memberId\) return;[\s\S]*?await fetchAccount\(\)/g) || []).length >= 3,
    'Must check if component is mounted and member is same before refetching in all 3 mutations'
  );

  
  
  step('Repository Hygiene');
  const files = fs.readdirSync(ROOT_DIR);
  const badFiles = files.filter(f => 
    /^patch.*\.(m?js)$/.test(f) || 
    /^tmp.*\.(m?js)$/.test(f) || 
    f.endsWith('.tmp') || 
    f.endsWith('.fixed')
  );
  check(badFiles.length === 0, 'No temporary patch or artifact files allowed in repository root');

  step('Existing Verifiers');
  check(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'verify-member-portal-auth-foundation.mjs')), 'F.18A verifier missing');
  check(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'verify-member-portal-read-model.mjs')), 'F.18B verifier missing');
  check(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'verify-member-portal-frontend.mjs')), 'F.18C verifier missing');
  
  if (hasErrors) {
    process.exit(1);
  } else {
    console.log('✅ PASS — F.18D ADMIN MEMBER ACCOUNT PROVISIONING UI CLOSED');
  }
} catch (e) {
  console.error(e);
  process.exit(1);
}
