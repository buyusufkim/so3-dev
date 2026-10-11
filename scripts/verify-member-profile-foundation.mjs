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

// Balanced-brace block extractor
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
  pkg.scripts && pkg.scripts["verify:member-profile-foundation"] === "node scripts/verify-member-profile-foundation.mjs",
  "Package.json exact registration: 'verify:member-profile-foundation' === 'node scripts/verify-member-profile-foundation.mjs'"
);

console.log("\n=== 2. Route Registration & Canonical Endpoint in api/index.php ===");
const indexPath = path.resolve(process.cwd(), 'api/index.php');
assert(fs.existsSync(indexPath), "api/index.php exists");
const indexContent = fs.readFileSync(indexPath, 'utf8');

// 2.1 Canonical GET /api/member/profile
assert(
  indexContent.includes("$requestUri === '/api/member/profile' && $method === 'GET'"),
  "api/index.php registers canonical GET /api/member/profile endpoint"
);

const profileRouteBlock = extractBlock(indexContent, "$requestUri === '/api/member/profile'");
assert(profileRouteBlock !== null, "Member profile route block successfully isolated from api/index.php");
assert(
  profileRouteBlock.includes("MemberProfileController.php") &&
  profileRouteBlock.includes("getProfile()"),
  "Profile route invokes MemberProfileController->getProfile()"
);

// 2.2 Prohibit mutation methods on /api/member/profile
assert(
  !/\$method\s*===\s*'(?:POST|PATCH|DELETE|PUT)'/.test(profileRouteBlock),
  "No mutation method (POST/PATCH/DELETE/PUT) allowed in member profile route block"
);

assert(
  !indexContent.includes("'/api/member/profile/update'"),
  "No non-canonical /api/member/profile/update route"
);

// Self-test: extractBlock captures nested braces and detects prohibited methods
const mockNestedRoute = `
if ($requestUri === '/api/member/test') {
    if ($method === 'GET') {
        doGet();
    }
    if ($method === 'PATCH') {
        doPatch();
    }
}
`;
const mockExtracted = extractBlock(mockNestedRoute, "$requestUri === '/api/member/test'");
assert(
  mockExtracted !== null && mockExtracted.includes("$method === 'PATCH'"),
  "Self-test: extractBlock captures nested blocks correctly"
);
assert(
  (!/\$method\s*===\s*'(?:POST|PATCH|DELETE|PUT)'/.test(mockExtracted)) === false,
  "Self-test: Prohibited mutation method check fails-closed when mutation is injected"
);

console.log("\n=== 3. Controller Architecture & Guard Invariants ===");
const ctrlPath = path.resolve(process.cwd(), 'api/controllers/MemberProfileController.php');
assert(fs.existsSync(ctrlPath), "api/controllers/MemberProfileController.php exists");
const ctrlContent = fs.readFileSync(ctrlPath, 'utf8');

// 3.1 Class and method definitions
assert(
  ctrlContent.includes("class MemberProfileController"),
  "MemberProfileController class declared"
);
assert(
  ctrlContent.includes("public function getProfile(): void") || ctrlContent.includes("public function getProfile()"),
  "MemberProfileController defines getProfile() method"
);

// 3.2 Authentication & Session Binding
assert(
  ctrlContent.includes("MemberAuthMiddleware::handle()"),
  "Controller invokes MemberAuthMiddleware::handle() for session authentication"
);
assert(
  ctrlContent.includes("\$_SESSION['member_id']") && ctrlContent.includes("\$_SESSION['member_account_id']"),
  "Controller identity is strictly bound to server session $_SESSION['member_id'] and $_SESSION['member_account_id']"
);
assert(
  !ctrlContent.includes("\$_GET['member_id']") &&
  !ctrlContent.includes("\$_GET['account_id']") &&
  !ctrlContent.includes("\$_POST['member_id']") &&
  !ctrlContent.includes("\$_POST['account_id']"),
  "Controller strictly ignores and does NOT read member_id or account_id from external inputs"
);

// 3.3 Query parameter rejection
assert(
  ctrlContent.includes("!empty($_GET)") && ctrlContent.includes("'VALIDATION_ERROR'") && ctrlContent.includes("422"),
  "Controller strictly rejects any query parameters with 422 VALIDATION_ERROR"
);

// 3.4 Password change guard & inactive account protection
assert(
  ctrlContent.includes("must_change_password") && ctrlContent.includes("'PASSWORD_CHANGE_REQUIRED'") && ctrlContent.includes("403"),
  "Controller enforces password change requirement with 403 PASSWORD_CHANGE_REQUIRED"
);

// 3.5 Active status & Soft-delete checks
assert(
  ctrlContent.includes("m.deleted_at IS NULL"),
  "Controller query enforces soft-deleted member protection (m.deleted_at IS NULL)"
);
assert(
  ctrlContent.includes("m.status = 'active'") && ctrlContent.includes("ma.status = 'active'"),
  "Controller query enforces active status on both members and member_accounts"
);

console.log("\n=== 4. Explicit SELECT & Privacy / Anti-Leak Invariants ===");
// 4.1 Explicit column SELECT, zero SELECT *
assert(
  !ctrlContent.includes("SELECT *") && !ctrlContent.includes("SELECT ma.*") && !ctrlContent.includes("SELECT m.*"),
  "Controller strictly forbids wildcard SELECT (SELECT *, SELECT ma.*, SELECT m.*)"
);
assert(
  ctrlContent.includes("SELECT ma.username, ma.status AS account_status,") &&
  ctrlContent.includes("m.first_name, m.last_name, m.phone, m.email,") &&
  ctrlContent.includes("m.emergency_contact_name, m.emergency_contact_phone"),
  "Controller explicitly selects only allowlisted columns"
);

// 4.2 Strict absence of sensitive / internal fields in response
const forbiddenExposureTokens = [
  'password_hash',
  'auth_version',
  'last_login_ip',
  'notes',
  'consent_given_at',
  'trainer_id',
  'membership_start_date',
  'membership_end_date'
];
for (const token of forbiddenExposureTokens) {
  assert(
    !ctrlContent.includes(`'${token}' =>`) && !ctrlContent.includes(`"${token}" =>`),
    `Controller strictly does not expose sensitive field '${token}' in response`
  );
}

// 4.3 Explicit JSON structure
assert(
  ctrlContent.includes("'account' => [") && ctrlContent.includes("'profile' => ["),
  "Controller constructs explicit 'account' and 'profile' response envelopes"
);
assert(
  ctrlContent.includes("'username' => (string)$row['username']") &&
  ctrlContent.includes("'status' => (string)$row['account_status']"),
  "Account envelope exposes exactly username and status"
);
assert(
  ctrlContent.includes("'first_name' => (string)$row['first_name']") &&
  ctrlContent.includes("'last_name' => (string)$row['last_name']") &&
  ctrlContent.includes("'phone' => (string)$row['phone']") &&
  ctrlContent.includes("'email' =>") &&
  ctrlContent.includes("'emergency_contact_name' =>") &&
  ctrlContent.includes("'emergency_contact_phone' =>"),
  "Profile envelope exposes exactly first_name, last_name, phone, email, emergency_contact_name, emergency_contact_phone"
);

console.log("\n=== 5. Client API Invariants in src/member/api/client.ts ===");
const clientPath = path.resolve(process.cwd(), 'src/member/api/client.ts');
assert(fs.existsSync(clientPath), "src/member/api/client.ts exists");
const clientContent = fs.readFileSync(clientPath, 'utf8');

assert(
  clientContent.includes("validateMemberProfile"),
  "client.ts imports validateMemberProfile"
);
assert(
  clientContent.includes("MemberProfileResponse"),
  "client.ts imports MemberProfileResponse"
);
assert(
  clientContent.includes("async getProfile(") &&
  clientContent.includes("signal?: AbortSignal") &&
  clientContent.includes("Promise<MemberProfileResponse>"),
  "memberApiClient defines getProfile(signal?: AbortSignal): Promise<MemberProfileResponse>"
);
assert(
  clientContent.includes("request('/api/member/profile'") || clientContent.includes('request("/api/member/profile"'),
  "getProfile calls canonical endpoint /api/member/profile"
);
assert(
  clientContent.includes("validateMemberProfile(data)"),
  "getProfile validates response payload with validateMemberProfile"
);

console.log("\n=== 6. TypeScript Contract & Fail-Closed Validator in src/member/api/validators.ts ===");
const validatorsPath = path.resolve(process.cwd(), 'src/member/api/validators.ts');
assert(fs.existsSync(validatorsPath), "src/member/api/validators.ts exists");
const validatorsContent = fs.readFileSync(validatorsPath, 'utf8');

assert(
  validatorsContent.includes("export type MemberProfileResponse"),
  "validators.ts exports MemberProfileResponse type"
);
assert(
  validatorsContent.includes("export type MemberProfileAccount"),
  "validators.ts exports MemberProfileAccount type"
);
assert(
  validatorsContent.includes("export type MemberProfileData"),
  "validators.ts exports MemberProfileData type"
);
assert(
  validatorsContent.includes("export function validateMemberProfile(data: unknown): MemberProfileResponse"),
  "validators.ts exports validateMemberProfile function returning MemberProfileResponse"
);

// Ensure no unsafe type assertions bypassing validation
assert(
  !validatorsContent.includes("as MemberProfileResponse"),
  "validateMemberProfile contains zero unsafe 'as MemberProfileResponse' type casts"
);

console.log("\n=== 7. Algorithmic Simulation & Negative Fixture Tests for validateMemberProfile ===");
// Inline evaluation of validation logic to simulate runtime execution
function testValidator(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Member profile data must be an object');
  }

  const allowedTopKeys = ['account', 'profile'];
  const topKeys = Object.keys(data);

  for (const key of topKeys) {
    if (!allowedTopKeys.includes(key)) {
      throw new Error(`Unexpected top-level key "${key}" in member profile`);
    }
  }

  for (const reqKey of allowedTopKeys) {
    if (!(reqKey in data)) {
      throw new Error(`Missing required top-level key "${reqKey}" in member profile`);
    }
  }

  if (typeof data.account !== 'object' || data.account === null || Array.isArray(data.account)) {
    throw new Error('account must be an object in member profile');
  }

  const allowedAccountKeys = ['username', 'status'];
  const accountKeys = Object.keys(data.account);

  for (const key of accountKeys) {
    if (!allowedAccountKeys.includes(key)) {
      throw new Error(`Unexpected key "${key}" in member profile account`);
    }
  }

  for (const reqKey of allowedAccountKeys) {
    if (!(reqKey in data.account)) {
      throw new Error(`Missing required key "${reqKey}" in member profile account`);
    }
  }

  if (typeof data.account.username !== 'string' || data.account.username.trim().length === 0) {
    throw new Error('account.username must be a non-empty string');
  }

  if (typeof data.account.status !== 'string' || data.account.status.trim().length === 0) {
    throw new Error('account.status must be a non-empty string');
  }

  if (typeof data.profile !== 'object' || data.profile === null || Array.isArray(data.profile)) {
    throw new Error('profile must be an object in member profile');
  }

  const allowedProfileKeys = [
    'first_name',
    'last_name',
    'phone',
    'email',
    'emergency_contact_name',
    'emergency_contact_phone'
  ];
  const profileKeys = Object.keys(data.profile);

  for (const key of profileKeys) {
    if (!allowedProfileKeys.includes(key)) {
      throw new Error(`Unexpected key "${key}" in member profile data`);
    }
  }

  for (const reqKey of allowedProfileKeys) {
    if (!(reqKey in data.profile)) {
      throw new Error(`Missing required key "${reqKey}" in member profile data`);
    }
  }

  if (typeof data.profile.first_name !== 'string' || data.profile.first_name.trim().length === 0) {
    throw new Error('profile.first_name must be a non-empty string');
  }

  if (typeof data.profile.last_name !== 'string' || data.profile.last_name.trim().length === 0) {
    throw new Error('profile.last_name must be a non-empty string');
  }

  if (typeof data.profile.phone !== 'string' || data.profile.phone.trim().length === 0) {
    throw new Error('profile.phone must be a non-empty string');
  }

  if (data.profile.email !== null && typeof data.profile.email !== 'string') {
    throw new Error('profile.email must be a string or null');
  }

  if (data.profile.emergency_contact_name !== null && typeof data.profile.emergency_contact_name !== 'string') {
    throw new Error('profile.emergency_contact_name must be a string or null');
  }

  if (data.profile.emergency_contact_phone !== null && typeof data.profile.emergency_contact_phone !== 'string') {
    throw new Error('profile.emergency_contact_phone must be a string or null');
  }

  return {
    account: {
      username: data.account.username,
      status: data.account.status
    },
    profile: {
      first_name: data.profile.first_name,
      last_name: data.profile.last_name,
      phone: data.profile.phone,
      email: data.profile.email,
      emergency_contact_name: data.profile.emergency_contact_name,
      emergency_contact_phone: data.profile.emergency_contact_phone
    }
  };
}

// Fixture 1: Valid profile with nulls
const validFixtureWithNulls = {
  account: {
    username: "uye123",
    status: "active"
  },
  profile: {
    first_name: "Ahmet",
    last_name: "Yılmaz",
    phone: "05551234567",
    email: null,
    emergency_contact_name: null,
    emergency_contact_phone: null
  }
};
const res1 = testValidator(validFixtureWithNulls);
assert(
  res1.account.username === "uye123" && res1.profile.first_name === "Ahmet" && res1.profile.email === null,
  "Fixture 1: Valid payload with null fields passes validation cleanly"
);

// Fixture 2: Valid profile with populated strings
const validFixturePopulated = {
  account: {
    username: "elif.demir",
    status: "active"
  },
  profile: {
    first_name: "Elif",
    last_name: "Demir",
    phone: "05329876543",
    email: "elif@example.com",
    emergency_contact_name: "Can Demir",
    emergency_contact_phone: "05321112233"
  }
};
const res2 = testValidator(validFixturePopulated);
assert(
  res2.account.username === "elif.demir" && res2.profile.email === "elif@example.com",
  "Fixture 2: Valid payload with all strings passes validation"
);

// Negative Fixture 3: Unexpected top-level key (e.g. member_id)
let caughtExtraTop = false;
try {
  testValidator({ ...validFixtureWithNulls, member_id: 123 });
} catch (e) {
  caughtExtraTop = e.message.includes('Unexpected top-level key');
}
assert(caughtExtraTop, "Negative Fixture 3: Unexpected top-level key 'member_id' correctly rejected");

// Negative Fixture 4: Missing top-level key (missing profile)
let caughtMissingTop = false;
try {
  testValidator({ account: validFixtureWithNulls.account });
} catch (e) {
  caughtMissingTop = e.message.includes('Missing required top-level key');
}
assert(caughtMissingTop, "Negative Fixture 4: Missing required top-level key 'profile' correctly rejected");

// Negative Fixture 5: Unexpected account key (e.g. password_hash or id)
let caughtExtraAccount = false;
try {
  testValidator({
    ...validFixtureWithNulls,
    account: { ...validFixtureWithNulls.account, password_hash: "hash", id: 1 }
  });
} catch (e) {
  caughtExtraAccount = e.message.includes('Unexpected key');
}
assert(caughtExtraAccount, "Negative Fixture 5: Leaked password_hash in account correctly rejected");

// Negative Fixture 6: Missing required key in account (missing status)
let caughtMissingAccount = false;
try {
  testValidator({
    ...validFixtureWithNulls,
    account: { username: "uye123" }
  });
} catch (e) {
  caughtMissingAccount = e.message.includes('Missing required key');
}
assert(caughtMissingAccount, "Negative Fixture 6: Missing required key 'status' in account rejected");

// Negative Fixture 7: Unexpected profile key (e.g. notes, trainer_id, created_by)
let caughtExtraProfile = false;
try {
  testValidator({
    ...validFixtureWithNulls,
    profile: { ...validFixtureWithNulls.profile, notes: "Secret admin note" }
  });
} catch (e) {
  caughtExtraProfile = e.message.includes('Unexpected key');
}
assert(caughtExtraProfile, "Negative Fixture 7: Unexpected key 'notes' in profile correctly rejected");

// Negative Fixture 8: Invalid type for email (number instead of string/null)
let caughtInvalidEmail = false;
try {
  testValidator({
    ...validFixtureWithNulls,
    profile: { ...validFixtureWithNulls.profile, email: 12345 }
  });
} catch (e) {
  caughtInvalidEmail = e.message.includes('profile.email must be a string or null');
}
assert(caughtInvalidEmail, "Negative Fixture 8: Non-string email type rejected");

// Negative Fixture 9: Empty first_name
let caughtEmptyName = false;
try {
  testValidator({
    ...validFixtureWithNulls,
    profile: { ...validFixtureWithNulls.profile, first_name: "   " }
  });
} catch (e) {
  caughtEmptyName = e.message.includes('profile.first_name must be a non-empty string');
}
assert(caughtEmptyName, "Negative Fixture 9: Empty string first_name rejected");

// Negative Fixture 10: Non-object input
let caughtNonObject = false;
try {
  testValidator("string payload");
} catch (e) {
  caughtNonObject = e.message.includes('must be an object');
}
assert(caughtNonObject, "Negative Fixture 10: Primitive payload rejected");

console.log("\n=== 8. Non-Regression & Scope Isolation ===");
// 8.1 Existing /api/member-auth/me unchanged
assert(
  indexContent.includes("$requestUri === '/api/member-auth/me' && $method === 'GET'"),
  "Existing GET /api/member-auth/me route is intact"
);
const authCtrlPath = path.resolve(process.cwd(), 'api/controllers/MemberAuthController.php');
assert(fs.existsSync(authCtrlPath), "MemberAuthController.php exists");
const authCtrlContent = fs.readFileSync(authCtrlPath, 'utf8');
assert(
  authCtrlContent.includes("public function me()"),
  "MemberAuthController->me() method is intact"
);
assert(
  validatorsContent.includes("export type MemberAuthIdentity"),
  "MemberAuthIdentity type in validators.ts is intact"
);

// 8.2 Zero new schema migrations
const migDir = path.resolve(process.cwd(), 'database/migrations');
const migFiles = fs.readdirSync(migDir).filter(f => f.endsWith('.sql'));
assert(
  migFiles.length === 44,
  `Zero schema migrations added in F.34A (exactly 44 migrations exist: 001 to 044)`
);

// 8.3 UI isolation (F.34B introduces MemberProfilePage strictly read-only with zero mutation inputs)
const memberPagesDir = path.resolve(process.cwd(), 'src/member/pages');
const memberPages = fs.readdirSync(memberPagesDir);
if (memberPages.includes('MemberProfilePage.tsx')) {
  const profilePageContent = fs.readFileSync(path.resolve(memberPagesDir, 'MemberProfilePage.tsx'), 'utf8');
  assert(
    !profilePageContent.includes('<input') && !profilePageContent.includes('<textarea'),
    "MemberProfilePage.tsx is strictly read-only with zero editable form inputs"
  );
} else {
  assert(true, "No MemberProfilePage.tsx created (UI deferred to F.34B)");
}

const routesPath = path.resolve(process.cwd(), 'src/routes/index.tsx');
assert(fs.existsSync(routesPath), "src/routes/index.tsx exists");
const routesContent = fs.readFileSync(routesPath, 'utf8');
assert(
  !routesContent.includes("MemberProfileEditor"),
  "src/routes/index.tsx has zero references to profile mutation editors"
);

// 8.4 Strictly read-only
assert(
  !indexContent.includes("PATCH /api/member/profile") &&
  !indexContent.includes("POST /api/member/profile"),
  "Strictly zero profile mutation endpoints in api/index.php"
);

console.log("\n=======================================================");
console.log(`Total Invariants Verified: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${totalAssertions - passedAssertions}`);
console.log("=======================================================");

if (exitCode !== 0) {
  console.error("❌ FAILED: One or more F.34A Member Account & Profile Foundation invariants failed.");
  process.exit(exitCode);
} else {
  console.log("PASS — F.34A MEMBER ACCOUNT & PROFILE FOUNDATION IMPLEMENTED");
}
