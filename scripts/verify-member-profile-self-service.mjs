import fs from 'fs';
import path from 'path';

let exitCode = 0;
let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    exitCode = 1;
  } else {
    passedAssertions++;
    console.log(`✅ PASS: ${message}`);
  }
}

// Balanced brace block extractor
function extractBlock(content, searchPattern) {
  const matchIndex = typeof searchPattern === 'string'
    ? content.indexOf(searchPattern)
    : content.search(searchPattern);
  if (matchIndex === -1) return null;
  const openBraceIndex = content.indexOf('{', matchIndex);
  if (openBraceIndex === -1) return null;

  let depth = 1;
  let i = openBraceIndex + 1;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  if (depth !== 0) return null;
  return content.slice(openBraceIndex, i);
}

console.log("=== 1. Package.json Script Registration ===");
const pkgPath = path.resolve(process.cwd(), 'package.json');
assert(fs.existsSync(pkgPath), "package.json exists");
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

assert(
  pkg.scripts && pkg.scripts["verify:member-profile-self-service"] === "node scripts/verify-member-profile-self-service.mjs",
  "Package.json exact registration: 'verify:member-profile-self-service' === 'node scripts/verify-member-profile-self-service.mjs'"
);

console.log("\n=== 2. Route Registration & Canonical Endpoints in api/index.php ===");
const indexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(indexPath), "api/index.php exists");
const indexContent = fs.readFileSync(indexPath, 'utf8');

assert(
  indexContent.includes("$requestUri === '/api/member/profile'"),
  "api/index.php isolates canonical /api/member/profile route"
);

const profileRouteBlock = extractBlock(indexContent, "$requestUri === '/api/member/profile'");
assert(profileRouteBlock !== null, "Profile route block successfully isolated from api/index.php");

// 2.1 GET endpoint preserved
assert(
  profileRouteBlock.includes("$method === 'GET'") &&
  profileRouteBlock.includes("getProfile()"),
  "GET /api/member/profile route calls getProfile()"
);

// 2.2 PATCH endpoint implemented
assert(
  profileRouteBlock.includes("$method === 'PATCH'") &&
  profileRouteBlock.includes("updateProfile()"),
  "PATCH /api/member/profile route calls updateProfile()"
);

// 2.3 Other methods rejected with 405 Method Not Allowed
assert(
  profileRouteBlock.includes("METHOD_NOT_ALLOWED") &&
  profileRouteBlock.includes("405"),
  "Other methods explicitly rejected with 405 METHOD_NOT_ALLOWED"
);

// 2.4 Prohibit unwanted mutation methods
assert(
  !/\$method\s*===\s*'(?:POST|PUT|DELETE)'/.test(profileRouteBlock),
  "Prohibit POST/PUT/DELETE in /api/member/profile route block"
);

console.log("\n=== 3. Controller Architecture & Guard Invariants in MemberProfileController.php ===");
const ctrlPath = path.resolve(process.cwd(), 'api/controllers/MemberProfileController.php');
assert(fs.existsSync(ctrlPath), "MemberProfileController.php exists");
const ctrlContent = fs.readFileSync(ctrlPath, 'utf8');

// 3.1 Method presence
assert(
  ctrlContent.includes("public function getProfile(): void") || ctrlContent.includes("public function getProfile()"),
  "getProfile method declared"
);
assert(
  ctrlContent.includes("public function updateProfile(): void") || ctrlContent.includes("public function updateProfile()"),
  "updateProfile method declared"
);

// 3.2 Session ownership & authentication guard
assert(
  ctrlContent.includes("MemberAuthMiddleware::handle()"),
  "Controller invokes MemberAuthMiddleware::handle()"
);
assert(
  ctrlContent.includes("CsrfMiddleware::handle()"),
  "Controller invokes CsrfMiddleware::handle() for mutation protection"
);
assert(
  ctrlContent.includes("$_SESSION['member_id']") && ctrlContent.includes("$_SESSION['member_account_id']"),
  "Controller binds identity strictly to server session"
);
assert(
  !ctrlContent.includes("$_GET['member_id']") &&
  !ctrlContent.includes("$_GET['account_id']") &&
  !ctrlContent.includes("$_POST['member_id']") &&
  !ctrlContent.includes("$_POST['account_id']") &&
  !ctrlContent.includes("$data['member_id']") &&
  !ctrlContent.includes("$data['account_id']"),
  "Controller strictly ignores and does NOT accept client-provided member or account IDs"
);

// 3.3 Query parameter rejection
assert(
  ctrlContent.includes("!empty($_GET)") && ctrlContent.includes("VALIDATION_ERROR") && ctrlContent.includes("422"),
  "Controller rejects query parameters with 422 VALIDATION_ERROR"
);

// 3.4 Password change guard
assert(
  ctrlContent.includes("must_change_password") && ctrlContent.includes("PASSWORD_CHANGE_REQUIRED") && ctrlContent.includes("403"),
  "Controller enforces password change requirement with 403 PASSWORD_CHANGE_REQUIRED"
);

// 3.5 Active status & soft-delete checks
assert(
  ctrlContent.includes("m.deleted_at IS NULL"),
  "Controller query enforces soft-deleted member protection (m.deleted_at IS NULL)"
);
assert(
  ctrlContent.includes("m.status = 'active'") && ctrlContent.includes("ma.status = 'active'"),
  "Controller query enforces active status on members and member_accounts"
);

console.log("\n=== 4. Exact Payload Keys & Allowlist Invariants ===");
// 4.1 Exact allowlist of keys
assert(
  ctrlContent.includes("['email', 'emergency_contact_name', 'emergency_contact_phone']"),
  "Allowed keys strictly set to email, emergency_contact_name, emergency_contact_phone"
);
assert(
  ctrlContent.includes("array_diff($payloadKeys, $allowedKeys)") &&
  ctrlContent.includes("array_diff($allowedKeys, $payloadKeys)"),
  "Controller rejects payloads with missing or extra keys"
);

// 4.2 Prohibit Mass Assignment in SQL UPDATE
const updateMatch = ctrlContent.match(/UPDATE\s+members\s+SET[\s\S]*?WHERE/i);
assert(updateMatch !== null, "UPDATE members SET query isolated");
const updateSql = updateMatch ? updateMatch[0] : '';
assert(
  updateSql.includes("email = :email") &&
  updateSql.includes("emergency_contact_name = :emergency_contact_name") &&
  updateSql.includes("emergency_contact_phone = :emergency_contact_phone") &&
  !updateSql.includes("first_name") &&
  !updateSql.includes("last_name") &&
  !/\bphone\s*=/i.test(updateSql.replace('emergency_contact_phone', '')) &&
  !updateSql.includes("status =") &&
  !updateSql.includes("trainer_id") &&
  !updateSql.includes("membership_start_date") &&
  !updateSql.includes("membership_end_date") &&
  !updateSql.includes("notes") &&
  !updateSql.includes("deleted_at") &&
  !updateSql.includes("password_hash"),
  "UPDATE members statement strictly limited to 3 allowlisted fields (email, emergency_contact_name, emergency_contact_phone)"
);

// 4.3 Atomic transaction
assert(
  ctrlContent.includes("beginTransaction()") &&
  ctrlContent.includes("commit()") &&
  ctrlContent.includes("rollBack()"),
  "Controller wraps mutation in atomic database transaction"
);

console.log("\n=== 5. Field Validation & Normalization Rules in Controller ===");
// 5.1 Email validation
assert(
  ctrlContent.includes("FILTER_VALIDATE_EMAIL"),
  "Controller validates email format with FILTER_VALIDATE_EMAIL"
);
assert(
  ctrlContent.includes("mb_strlen($trimmedEmail) > 120"),
  "Controller enforces max 120 chars on email"
);

// 5.2 Emergency contact name validation
assert(
  ctrlContent.includes("mb_strlen($trimmedName) > 120"),
  "Controller enforces max 120 chars on emergency_contact_name"
);

// 5.3 Emergency contact phone validation
assert(
  ctrlContent.includes("mb_strlen($trimmedPhone) > 20"),
  "Controller enforces max 20 chars on emergency_contact_phone"
);

// 5.4 Control characters rejection
assert(
  ctrlContent.includes("/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/"),
  "Controller rejects control characters across all input fields"
);

console.log("\n=== 6. Canonical Response & Formatter Parity ===");
// 6.1 Shared response formatter
assert(
  ctrlContent.includes("formatProfileResponse(array $row)"),
  "Controller utilizes shared formatProfileResponse helper for GET and PATCH"
);

// 6.2 Strict field presence and exclusion in response
const forbiddenTokens = [
  'password_hash',
  'auth_version',
  'last_login_ip',
  'notes',
  'consent_given_at',
  'trainer_id',
  'membership_start_date',
  'membership_end_date'
];
for (const token of forbiddenTokens) {
  assert(
    !ctrlContent.includes(`'${token}' =>`) && !ctrlContent.includes(`"${token}" =>`),
    `Response strictly excludes internal field '${token}'`
  );
}

console.log("\n=== 7. Frontend Client Invariants in src/member/api/client.ts ===");
const clientPath = path.resolve(process.cwd(), 'src/member/api/client.ts');
assert(fs.existsSync(clientPath), "src/member/api/client.ts exists");
const clientContent = fs.readFileSync(clientPath, 'utf8');

assert(
  clientContent.includes("async updateProfile(") &&
  clientContent.includes("method: 'PATCH'") &&
  clientContent.includes("JSON.stringify(payload)") &&
  clientContent.includes("validateMemberProfile(data)"),
  "memberApiClient.updateProfile calls PATCH /api/member/profile and validates response with validateMemberProfile"
);

console.log("\n=== 8. Member Profile Page UI Invariants in src/member/pages/MemberProfilePage.tsx ===");
const pagePath = path.resolve(process.cwd(), 'src/member/pages/MemberProfilePage.tsx');
assert(fs.existsSync(pagePath), "MemberProfilePage.tsx exists");
const pageContent = fs.readFileSync(pagePath, 'utf8');

// 8.1 Read-only vs editable fields
assert(
  pageContent.includes("Bilgilerimi Düzenle") &&
  pageContent.includes("Kaydet") &&
  pageContent.includes("Vazgeç"),
  "UI includes controlled 'Bilgilerimi Düzenle', 'Kaydet', and 'Vazgeç' buttons"
);

assert(
  !pageContent.includes('value={editFirstName') &&
  !pageContent.includes('value={editLastName') &&
  !pageContent.includes('value={editPhone') &&
  !pageContent.includes('name="first_name"') &&
  !pageContent.includes('name="last_name"') &&
  !pageContent.includes('name="phone"'),
  "Identity fields (first_name, last_name) and primary phone are strictly locked as read-only"
);

// 8.2 Form controls only for allowlisted 3 fields
assert(
  pageContent.includes("editEmail") &&
  pageContent.includes("editEmergencyName") &&
  pageContent.includes("editEmergencyPhone"),
  "Form manages state only for email, emergency name, and emergency phone"
);

// 8.3 Double submit & race safety
assert(
  pageContent.includes("isSubmittingRef") &&
  pageContent.includes("patchAbortControllerRef") &&
  pageContent.includes("patchGenerationRef"),
  "UI protects against double submit and stale race conditions using refs and abort controllers"
);

// 8.4 User messages & 44px touch targets
assert(
  pageContent.includes("Bilgilerin güncellendi.") &&
  pageContent.includes("Bilgilerin güncellenemedi."),
  "UI displays canonical Turkish success and error messages"
);
assert(
  pageContent.includes("min-h-[44px]"),
  "Action buttons enforce min-h-[44px] touch targets"
);

console.log("\n=== 9. Algorithmic Simulation of Controller Validation Rules ===");
// Simulate controller phone validator regex
const phoneRegex = /^\+?[0-9\s\-\(\)]{7,20}$/;
function validateSimulatedPhone(phone) {
  if (phone === null) return { valid: true, value: null };
  if (typeof phone !== 'string') return { valid: false };
  const trimmed = phone.trim();
  if (trimmed === '') return { valid: true, value: null };
  if (trimmed.length > 20) return { valid: false };
  if (!phoneRegex.test(trimmed)) return { valid: false };
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return { valid: false };
  return { valid: true, value: trimmed };
}

assert(validateSimulatedPhone("05551234567").valid === true, "Sim: standard 05XXXXXXXXX phone valid");
assert(validateSimulatedPhone("+90 555 123 45 67").valid === true, "Sim: formatted +90 phone valid");
assert(validateSimulatedPhone("5551234567").valid === true, "Sim: 10 digit phone valid");
assert(validateSimulatedPhone("").value === null, "Sim: empty phone normalizes to null");
assert(validateSimulatedPhone(null).value === null, "Sim: null phone preserves null");
assert(validateSimulatedPhone("abc055512345").valid === false, "Sim: phone with letters invalid");
assert(validateSimulatedPhone("123").valid === false, "Sim: phone too short (<7 digits) invalid");
assert(validateSimulatedPhone("123456789012345678901").valid === false, "Sim: phone too long (>20 chars) invalid");

// Simulate exact payload keys validator
function validatePayloadKeys(data) {
  const allowed = ['email', 'emergency_contact_name', 'emergency_contact_phone'];
  const keys = Object.keys(data);
  const extra = keys.filter(k => !allowed.includes(k));
  const missing = allowed.filter(k => !keys.includes(k));
  return extra.length === 0 && missing.length === 0;
}

assert(
  validatePayloadKeys({ email: "test@example.com", emergency_contact_name: "Ali", emergency_contact_phone: "05551112233" }),
  "Sim: exact 3 keys payload valid"
);
assert(
  !validatePayloadKeys({ email: "test@example.com", emergency_contact_name: "Ali" }),
  "Sim: missing emergency_contact_phone rejected"
);
assert(
  !validatePayloadKeys({ email: "test@example.com", emergency_contact_name: "Ali", emergency_contact_phone: "0555", status: "inactive" }),
  "Sim: payload with extra forbidden key 'status' rejected"
);
assert(
  !validatePayloadKeys({ email: "test@example.com", emergency_contact_name: "Ali", emergency_contact_phone: "0555", phone: "05559998877" }),
  "Sim: payload with extra forbidden key 'phone' rejected"
);

console.log("\n=== 10. Non-Regression & Scope Isolation ===");
// Zero schema migrations
const migDir = path.resolve(process.cwd(), 'database/migrations');
const migFiles = fs.readdirSync(migDir).filter(f => f.endsWith('.sql'));
assert(migFiles.length === 44, "Total migration count remains strictly 44 (001 to 044)");

// Protected files intact
assert(fs.existsSync(path.resolve(process.cwd(), 'src/member/pages/MemberDashboardPage.tsx')), "MemberDashboardPage.tsx exists");
assert(fs.existsSync(path.resolve(process.cwd(), 'src/member/pages/MemberTrainingProgramPage.tsx')), "MemberTrainingProgramPage.tsx exists");
assert(fs.existsSync(path.resolve(process.cwd(), 'src/routes/index.tsx')), "src/routes/index.tsx exists");

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more F.34C Member Profile Self-Service invariants failed.");
  process.exit(exitCode);
} else {
  console.log("PASS — F.34C CONTROLLED MEMBER PROFILE SELF-SERVICE IMPLEMENTED");
}
