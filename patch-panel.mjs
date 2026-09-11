import fs from 'fs';
let content = fs.readFileSync('src/admin/pages/members/MemberPortalAccountPanel.tsx', 'utf8');

// 1. Panel prop runtime guard
content = content.replace(
  "export function MemberPortalAccountPanel({ memberId }: { memberId: number }) {",
  "export function MemberPortalAccountPanel({ memberId }: { memberId: number | null }) {\n  if (memberId === null || memberId <= 0) return null;"
);

// 2. formatDateTime
content = content.replace(
  /function formatDateTime\(dateStr: string \| null\): string {[\s\S]*?return `\$\{match\[3\]\}\.\$\{match\[2\]\}\.\$\{match\[1\]\} \$\{match\[4\]\}:\$\{match\[5\]\}`;[\s\S]*?}/,
  `function formatDateTime(dateStr: string | null, fallback: string): string {
  if (!dateStr) return fallback;
  const match = dateStr.match(/^(\\d{4})-(\\d{2})-(\\d{2}) (\\d{2}):(\\d{2}):(\\d{2})$/);
  if (!match) return fallback;
  return \`\${match[3]}.\${match[2]}.\${match[1]} \${match[4]}:\${match[5]}\`;
}`
);

// 3. usage of formatDateTime
content = content.replace(
  "{formatDateTime(data.account.created_at)}",
  "{formatDateTime(data.account.created_at, 'Bilinmiyor')}"
);
content = content.replace(
  "{formatDateTime(data.account.last_login_at)}",
  "{formatDateTime(data.account.last_login_at, 'Henüz giriş yapmadı')}"
);
content = content.replace(
  "{formatDateTime(data.account.password_changed_at)}",
  "{formatDateTime(data.account.password_changed_at, 'Henüz değiştirilmedi')}"
);


// 4. Stale-response race with requestGenerationRef
content = content.replace(
  "const mountedRef = useRef(true);",
  "const mountedRef = useRef(true);\n  const requestGenerationRef = useRef(0);"
);

// Modify fetchAccount to use generation and requestedMemberId
content = content.replace(
  "const fetchAccount = useCallback(async () => {",
  `const fetchAccount = useCallback(async () => {
    if (memberId === null || memberId <= 0) return;
    const generation = ++requestGenerationRef.current;
    const requestedMemberId = memberId;`
);

content = content.replace(
  /const res = await apiClient\.get\(`\/api\/admin\/members\/\$\{memberId\}\/account`\);\n\s*if \(!mountedRef\.current\) return;/g,
  `const res = await apiClient.get(\`/api/admin/members/\${memberId}/account\`);
      if (!mountedRef.current || generation !== requestGenerationRef.current || requestedMemberId !== memberId) return;`
);

content = content.replace(
  /catch \(err\) {\n\s*if \(!mountedRef\.current\) return;/g,
  `catch (err) {
      if (!mountedRef.current || generation !== requestGenerationRef.current || requestedMemberId !== memberId) return;`
);

content = content.replace(
  /finally {\n\s*if \(mountedRef\.current\) {\n\s*setLoading\(false\);\n\s*}\n\s*}/g,
  `finally {
      if (mountedRef.current && generation === requestGenerationRef.current && requestedMemberId === memberId) {
        setLoading(false);
      }
    }`
);

// Member change cleanup
content = content.replace(
  "mountedRef.current = true;\n    void fetchAccount();\n    return () => {\n      mountedRef.current = false;\n    };",
  `mountedRef.current = true;
    requestGenerationRef.current++;
    setData(null);
    setLoading(true);
    setError(null);
    void fetchAccount();
    return () => {
      mountedRef.current = false;
    };`
);

// Username length check
content = content.replace(
  "if (!/^[a-z0-9._-]+$/.test(normalizedUsername)) {",
  `if (normalizedUsername.length < 3 || normalizedUsername.length > 50) {
      alert("Kullanıcı adı 3 ile 50 karakter arasında olmalıdır.");
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(normalizedUsername)) {`
);

// Error Mapping for SERVER_ERROR
content = content.replace(
  "if (err.code === 'NOT_FOUND') return 'Üye veya portal hesabı bulunamadı.';\n    }",
  "if (err.code === 'NOT_FOUND') return 'Üye veya portal hesabı bulunamadı.';\n      if (err.code === 'SERVER_ERROR') return 'İşlem şu anda gerçekleştirilemiyor.';\n    }"
);

// Accessibility
content = content.replace(
  '<label className="text-sm font-medium text-white/70">Kullanıcı adı</label>',
  '<label htmlFor="portal-username" className="text-sm font-medium text-white/70">Kullanıcı adı</label>'
);
content = content.replace(
  'type="text"\n                required',
  'type="text"\n                id="portal-username"\n                required'
);

content = content.replace(
  '<label className="text-sm font-medium text-white/70">Geçici şifre</label>',
  '<label htmlFor="portal-create-password" className="text-sm font-medium text-white/70">Geçici şifre</label>'
);
content = content.replace(
  'type="password"\n                required\n                value={createPassword}',
  'type="password"\n                id="portal-create-password"\n                required\n                value={createPassword}'
);

content = content.replace(
  '<label className="text-sm font-medium text-white/70">Geçici şifre tekrar</label>',
  '<label htmlFor="portal-create-password-confirm" className="text-sm font-medium text-white/70">Geçici şifre tekrar</label>'
);
content = content.replace(
  'type="password"\n                required\n                value={createPasswordConfirm}',
  'type="password"\n                id="portal-create-password-confirm"\n                required\n                value={createPasswordConfirm}'
);

content = content.replace(
  '<label className="text-sm font-medium text-white/70">Yeni geçici şifre</label>',
  '<label htmlFor="portal-reset-password" className="text-sm font-medium text-white/70">Yeni geçici şifre</label>'
);
content = content.replace(
  'type="password"\n                  required\n                  value={resetPassword}',
  'type="password"\n                  id="portal-reset-password"\n                  required\n                  value={resetPassword}'
);

content = content.replace(
  '<label className="text-sm font-medium text-white/70">Yeni geçici şifre tekrar</label>',
  '<label htmlFor="portal-reset-password-confirm" className="text-sm font-medium text-white/70">Yeni geçici şifre tekrar</label>'
);
content = content.replace(
  'type="password"\n                  required\n                  value={resetPasswordConfirm}',
  'type="password"\n                  id="portal-reset-password-confirm"\n                  required\n                  value={resetPasswordConfirm}'
);


fs.writeFileSync('src/admin/pages/members/MemberPortalAccountPanel.tsx', content);
console.log("Panel patched");
