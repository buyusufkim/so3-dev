import fs from 'fs';
let content = fs.readFileSync('scripts/verify-member-account-provisioning-ui.mjs', 'utf8');

// Verifier - invalid route ID
content = content.replace(
  "check(!editorCode.includes('<MemberPortalAccountPanel />') && editorCode.includes('memberId={'), 'AdminMemberEditor must pass memberId to panel');",
  "check(!editorCode.includes('<MemberPortalAccountPanel />') && editorCode.includes('memberId={'), 'AdminMemberEditor must pass memberId to panel');\n  check(!editorCode.includes('memberId={parseInt(id, 10)}'), 'AdminMemberEditor must not pass raw parseInt(id, 10)');\n  check(editorCode.includes('const parsedMemberId = id && /^\\\\d+$/.test(id) ? parseInt(id, 10) : null'), 'AdminMemberEditor must use positive integer guard for id');\n  check(!editorCode.includes('{activeTab === \\'portal-account\\' && id && ('), 'AdminMemberEditor must not use raw id for render guard');"
);

// Verifier - stale race
content = content.replace(
  "check(panelCode.includes('isCreating.current') || panelCode.includes('isCreatingState'), 'Create mutation guard missing');",
  "check(panelCode.includes('isCreating.current') || panelCode.includes('isCreatingState'), 'Create mutation guard missing');\n  check(panelCode.includes('const requestGenerationRef = useRef(0)'), 'Must have generation token or AbortController');\n  check(panelCode.includes('requestGenerationRef.current++') || panelCode.includes('abort()'), 'Must invalidate old request on member change');\n  check(panelCode.includes('requestedMemberId !== memberId'), 'Must verify response matches current member');"
);

// Verifier - DATETIME semantic validation
content = content.replace(
  "check(panelCode.includes('formatDateTime'), 'DATETIME formatter missing');\n  check(panelCode.includes('match') && !panelCode.includes('new Date('), 'DATETIME formatter must not use new Date()');",
  "check(panelCode.includes('formatDateTime'), 'DATETIME formatter missing');\n  check(panelCode.includes('match') && !panelCode.includes('new Date('), 'DATETIME formatter must not use new Date()');\n  check(typesCode.includes('function isValidDateTime'), 'DATETIME semantic validator missing');\n  check(typesCode.includes('daysInMonth') && typesCode.includes('% 4 === 0'), 'DATETIME validator must check calendar day bounds and leap year');\n  check(typesCode.includes('hour > 23') && typesCode.includes('minute > 59') && typesCode.includes('second > 59'), 'DATETIME validator must check time bounds');\n  check(typesCode.includes('!isValidDateTime(account.last_login_at)') && typesCode.includes('!isValidDateTime(account.password_changed_at)') && typesCode.includes('!isValidDateTime(account.created_at)'), 'DATETIME validator must be used on nullable and strict date fields');"
);

// Verifier - username length
content = content.replace(
  "check(panelCode.includes('/^[a-z0-9._-]+$/.test'), 'Username regex parity with backend missing');",
  "check(panelCode.includes('/^[a-z0-9._-]+$/.test'), 'Username regex parity with backend missing');\n  check(panelCode.includes('normalizedUsername.length < 3') && panelCode.includes('normalizedUsername.length > 50'), 'Username length strictly validated (3-50)');"
);

// Verifier - accessibility
content = content.replace(
  "check(panelCode.includes('Şifre sıfırlandığında'), 'Reset security explanation missing');",
  "check(panelCode.includes('Şifre sıfırlandığında'), 'Reset security explanation missing');\n  check(panelCode.includes('id=\"portal-username\"') && panelCode.includes('htmlFor=\"portal-username\"'), 'Username input must have accessibility id/label');\n  check(panelCode.includes('id=\"portal-create-password\"') && panelCode.includes('htmlFor=\"portal-create-password\"'), 'Create password input must have accessibility id/label');\n  check(panelCode.includes('id=\"portal-create-password-confirm\"') && panelCode.includes('htmlFor=\"portal-create-password-confirm\"'), 'Create password confirm input must have accessibility id/label');\n  check(panelCode.includes('id=\"portal-reset-password\"') && panelCode.includes('htmlFor=\"portal-reset-password\"'), 'Reset password input must have accessibility id/label');\n  check(panelCode.includes('id=\"portal-reset-password-confirm\"') && panelCode.includes('htmlFor=\"portal-reset-password-confirm\"'), 'Reset password confirm input must have accessibility id/label');"
);

fs.writeFileSync('scripts/verify-member-account-provisioning-ui.mjs', content);
console.log("Verifier patched");
