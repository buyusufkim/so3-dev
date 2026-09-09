import fs from 'fs';
import path from 'path';

const rolesPath = path.resolve(process.cwd(), 'src/admin/auth/roles.ts');
const layoutPath = path.resolve(process.cwd(), 'src/admin/layouts/AdminLayout.tsx');
const pagePath = path.resolve(process.cwd(), 'src/admin/pages/staff-accounts/StaffAccountsPage.tsx');
const typesPath = path.resolve(process.cwd(), 'src/admin/pages/staff-accounts/types.ts');
const routesPath = path.resolve(process.cwd(), 'src/routes/index.tsx');

let pass = true;
const check = (condition, msg) => {
    if (condition) {
        console.log(`[PASS] ${msg}`);
    } else {
        console.error(`[FAIL] ${msg}`);
        pass = false;
    }
};

if (!fs.existsSync(rolesPath) || !fs.existsSync(layoutPath) || !fs.existsSync(pagePath) || !fs.existsSync(typesPath) || !fs.existsSync(routesPath)) {
    console.error('FAIL: Missing required UI files.');
    process.exit(1);
}

const rolesCode = fs.readFileSync(rolesPath, 'utf-8');
const layoutCode = fs.readFileSync(layoutPath, 'utf-8');
const pageCode = fs.readFileSync(pagePath, 'utf-8');
const typesCode = fs.readFileSync(typesPath, 'utf-8');
const routesCode = fs.readFileSync(routesPath, 'utf-8');

// 1. /admin/staff-accounts route mevcut
check(routesCode.includes('path: "staff-accounts"'), 'Route /admin/staff-accounts exists.');

// 2. route roles.ts içinde super_admin-only
// 3. special guard genel admin allow rule'dan önce
check(
    rolesCode.includes('/admin/staff-accounts') && rolesCode.indexOf('/admin/staff-accounts') < rolesCode.indexOf("role === 'super_admin' || role === 'admin'"),
    'Route has super_admin-only special guard placed before general admin allow rule.'
);

// 4. sidebar link yalnız super_admin sectionında
const superAdminSectionIndex = layoutCode.indexOf("admin?.role === 'super_admin'");
const staffAccountsLinkIndex = layoutCode.indexOf('to="/admin/staff-accounts"');
check(
    superAdminSectionIndex !== -1 && staffAccountsLinkIndex > superAdminSectionIndex,
    'Sidebar link is located within the super_admin ONLY section.'
);

// 5. canonical GET endpoint kullanılıyor
check(pageCode.includes("apiClient.get('/api/admin/staff-accounts')"), 'Uses canonical GET endpoint.');

// 6. create payload yalnız 5 backend alanını gönderiyor
// 7. password_confirmation API payload'a gitmiyor
const createPostCall = pageCode.substring(pageCode.indexOf("await apiClient.post('/api/admin/staff-accounts'"), pageCode.indexOf("});", pageCode.indexOf("await apiClient.post('/api/admin/staff-accounts'")) + 3);
check(
    createPostCall.includes("username:") && createPostCall.includes("email:") && createPostCall.includes("display_name:") && createPostCall.includes("password,") && createPostCall.includes("role") && !createPostCall.includes("password_confirmation"),
    'Create payload sends exactly 5 backend fields.'
);

// 8. status canonical PATCH endpointini kullanıyor
check(pageCode.includes("apiClient.patch(`/api/admin/staff-accounts/${account.id}/status`"), 'Status uses canonical PATCH endpoint.');

// 9. role canonical PATCH endpointini kullanıyor
check(pageCode.includes("apiClient.patch(`/api/admin/staff-accounts/${account.id}/role`"), 'Role uses canonical PATCH endpoint.');

// 10. reset-password canonical POST endpointini kullanıyor
check(pageCode.includes("apiClient.post(`/api/admin/staff-accounts/${selectedAccountForPassword.id}/reset-password`"), 'Reset password uses canonical POST endpoint.');

// 11. role allowlist yalnız admin/editor/reception
check(
    pageCode.includes("role !== 'admin' && role !== 'editor' && role !== 'reception'") && 
    !pageCode.includes("super_admin") && !pageCode.includes("trainer"),
    'Role allowlist is strictly admin/editor/reception in UI validation.'
);

// 12. runtime list response validation mevcut
check(pageCode.includes("isStaffAccountListResponse(json)"), 'Runtime list response validation is present.');

// 13. malformed response fake empty state'e çevrilmiyor
check(
    pageCode.includes("setError('Personel hesabı verisi doğrulanamadı.')") && pageCode.includes("setData([])"),
    'Malformed response is correctly identified as an error state.'
);

// 14. loading/error/empty state mevcut
check(
    pageCode.includes("isLoading ?") && pageCode.includes("error ?") && pageCode.includes("data.length === 0 ?"),
    'Loading, error, and empty states are present in UI.'
);

// 15. password 12–256 + confirmation kontrolü var
check(
    pageCode.includes("Array.from(password).length < 12") && pageCode.includes("Array.from(password).length > 256") && pageCode.includes("password !== password_confirmation"),
    'Password 12-256 and confirmation check exists.'
);

// 16. password başarılı işlem sonrası state'ten temizleniyor
check(
    pageCode.includes("setPasswordFormData({ password: '', password_confirmation: '' })"),
    'Password state is cleared after successful reset.'
);

// 17. raw new Date() ile MySQL wall-time parse edilmiyor
check(
    !pageCode.includes("new Date(account.last_login_at)") && !pageCode.includes("new Date(account.password_changed_at)") && pageCode.match(/formatDate\(account\.last_login_at\)/) !== null,
    'Raw new Date() parsing is avoided.'
);

// 18. DELETE çağrısı yok
check(!pageCode.includes("apiClient.delete("), 'No DELETE calls exist in the UI.');

// 19. trainer/super_admin role option yok
check(
    !pageCode.includes('<option value="super_admin">') && !pageCode.includes('<option value="trainer">'),
    'Trainer and super_admin options do not exist in the role select.'
);

// F.14B.1 Hardening
// 20. create mutation response validate ediliyor
check(pageCode.includes("isStaffAccountCreateResponse(res)"), "Create response is validated");
// 21. status/role/reset-password mutation response validate ediliyor
check((pageCode.match(/isStaffAccountMessageResponse\(res\)/g) || []).length >= 3, "Message responses are validated for status, role, and reset-password");
// 22. malformed mutation response success sayılmıyor
check(pageCode.includes("throw new Error('Geçersiz sunucu yanıtı.')"), "Malformed mutation responses throw errors");
// 23. create success sonrası password state hemen temizleniyor
const createSuccessIndex = pageCode.indexOf("setCreateFormSuccess('Hesap başarıyla oluşturuldu.')");
const createPasswordClearIndex = pageCode.indexOf("password: ''", pageCode.indexOf("setCreateFormData(prev"));
check(createPasswordClearIndex !== -1 && createPasswordClearIndex < createSuccessIndex, "Create password state is cleared immediately after success");
// 24. reset success sonrası password state hemen temizleniyor
const resetSuccessIndex = pageCode.indexOf("setPasswordFormSuccess('Şifre başarıyla güncellendi.')");
const resetPasswordClearIndex = pageCode.indexOf("setPasswordFormData({ password: '', password_confirmation: '' })");
check(resetPasswordClearIndex !== -1 && resetPasswordClearIndex < resetSuccessIndex, "Reset password state is cleared immediately after success");
// 25. cleanup setTimeout içine bırakılmıyor
const createSetTimeoutContent = pageCode.substring(createSuccessIndex, createSuccessIndex + 300);
const resetSetTimeoutContent = pageCode.substring(resetSuccessIndex, resetSuccessIndex + 300);
check(!createSetTimeoutContent.includes("password: ''", createSetTimeoutContent.indexOf("setCreateFormData({")) && !resetSetTimeoutContent.includes("setPasswordFormData({ password: '', password_confirmation: '' })"), "Cleanup is not left inside setTimeout");
// 26. display_name Unicode-safe length kullanıyor
check(pageCode.includes("Array.from(trimmedDisplayName).length < 2") && pageCode.includes("Array.from(trimmedDisplayName).length > 100"), "display_name uses Unicode-safe length check");

if (pass) {
    console.log('\nPASS — F.14B SUPER ADMIN STAFF ACCOUNTS UI CLOSED');
    process.exit(0);
} else {
    console.error('\nFAIL — Verifications failed.');
    process.exit(1);
}
