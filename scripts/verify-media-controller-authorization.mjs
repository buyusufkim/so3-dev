import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
}

const mediaControllerPath = path.join(rootDir, 'api/controllers/MediaController.php');
const indexPath = path.join(rootDir, 'api/index.php');

assert(fs.existsSync(mediaControllerPath), 'MediaController.php not found');
assert(fs.existsSync(indexPath), 'api/index.php not found');

const controllerCode = fs.readFileSync(mediaControllerPath, 'utf8');
const indexCode = fs.readFileSync(indexPath, 'utf8');

// 1. AuthMiddleware import
assert(controllerCode.includes('use Middleware\\AuthMiddleware;'), 'AuthMiddleware is not imported in MediaController');

// Helper to extract method body
function extractMethodBody(code, methodName) {
  const regex = new RegExp(`public function ${methodName}\\s*\\([^)]*\\)\\s*{`, 'g');
  const match = regex.exec(code);
  if (!match) return null;

  let braceCount = 1;
  let i = match.index + match[0].length;
  let bodyStart = i;

  while (i < code.length && braceCount > 0) {
    if (code[i] === '{') braceCount++;
    if (code[i] === '}') braceCount--;
    i++;
  }

  return code.substring(bodyStart, i - 1);
}

const publicMethods = [
  'index',
  'show',
  'store',
  'update',
  'updateVideoPoster',
  'destroy',
  'restore'
];

const exactGuard = "AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);";
const fallbackGuard = "AuthMiddleware::hasRole(['super_admin', 'admin', 'editor'])"; // in case of spacing

let guardFoundCount = 0;

// 2, 3, 4, 5, 6, 11
for (const method of publicMethods) {
  const body = extractMethodBody(controllerCode, method);
  assert(body !== null, `Method ${method} not found in MediaController`);

  const trimmedBody = body.trim();
  // Ensure the guard is at the very beginning of the body (after any whitespace or newlines)
  const isFirstStmt = trimmedBody.startsWith(exactGuard) || trimmedBody.startsWith(fallbackGuard) || body.replace(/\s+/g, '').startsWith(exactGuard.replace(/\s+/g, ''));
  assert(isFirstStmt, `Method ${method} does not have the exact AuthMiddleware::hasRole guard at the beginning of its body.`);
  
  // Verify exact role set explicitly again just to be safe
  assert(body.includes("['super_admin', 'admin', 'editor']"), `Method ${method} does not contain exact role set`);
  assert(!body.includes("'trainer'"), `Method ${method} should not include trainer role in guard`);
  assert(!body.includes("'reception'"), `Method ${method} should not include reception role in guard`);
  
  // Guard is clearly before any DB/filesystem/mutation (as it is the first statement)
}

// 7. Verify index.php global firewall
// We know it's at `/api/admin/` but there might also be `/api/admin/media` explicitly.
// But the prompt states: 
// "api/index.php canonical global firewall role setiyle controller role seti eşleşiyor."
// The role set for /api/admin/ is ['super_admin', 'admin', 'editor']
assert(indexCode.includes("if (strpos($requestUri, '/api/admin/') === 0) {") && indexCode.includes("AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);"), "Global firewall for /api/admin/ role set does not match");

// 8. api/index.php is unchanged regarding media routes
assert(indexCode.includes("'/api/admin/media' => function() {"), "api/index.php media routes changed or missing");

// 10. Public media route list and guarded methods cross check
// index.php references: index, store, restore, updateVideoPoster, show, update, destroy
const indexMethods = ['index', 'store', 'restore', 'updateVideoPoster', 'show', 'update', 'destroy'];
for (const m of indexMethods) {
  assert(indexCode.includes(`->${m}(`), `Method ${m} is not called in api/index.php for media endpoints`);
}

// 12. Artifacts
assert(!fs.existsSync(path.join(rootDir, 'patch_media_auth.cjs')), "Temporary artifact patch_media_auth.cjs exists");

console.log('✅ PASS: MediaController Explicit Authorization Hardening Verified');
