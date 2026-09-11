import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());

function check(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
}

function step(name) {
  console.log(`\n👉 ${name}`);
}

try {
  step('Repository Hygiene');
  const files = fs.readdirSync(ROOT_DIR);
    const badFiles = files.filter(f => 
    /^patch.*\.(m?js|php)$/.test(f) || 
    /^tmp.*\.(m?js|php)$/.test(f) || 
    f.endsWith('.tmp') || 
    f.endsWith('.fixed') ||
    f === 'add-get-measurements.php'
  );
  check(badFiles.length === 0, 'No temporary patch or artifact files allowed in repository root');

  step('Verifying Member Progress Measurements Read Model');

  const controllerPath = path.join(ROOT_DIR, 'api/controllers/MemberPortalController.php');
  const indexPath = path.join(ROOT_DIR, 'api/index.php');
  const schemaPath = path.join(ROOT_DIR, 'database/migrations/032_create_member_progress.sql');

  check(fs.existsSync(controllerPath), 'MemberPortalController.php not found');
  check(fs.existsSync(indexPath), 'index.php not found');
  check(fs.existsSync(schemaPath), '032_create_member_progress.sql not found');

  // Verify existing verifiers
  check(fs.existsSync(path.join(ROOT_DIR, 'scripts/verify-member-portal-auth-foundation.mjs')), 'F.18A verifier missing');
  check(fs.existsSync(path.join(ROOT_DIR, 'scripts/verify-member-portal-read-model.mjs')), 'F.18B verifier missing');

  const controllerCode = fs.readFileSync(controllerPath, 'utf8');
  const indexCode = fs.readFileSync(indexPath, 'utf8');
  const schemaCode = fs.readFileSync(schemaPath, 'utf8');

  step('Schema Parity');
  
  const tableDef = schemaCode;

  const requiredFields = [
    'id', 'uuid', 'member_id', 'trainer_id', 'measured_at', 'weight_kg', 
    'body_fat_percent', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm', 
    'notes', 'created_by', 'updated_by', 'created_at', 'updated_at', 'deleted_at'
  ];
  requiredFields.forEach(field => {
    check(tableDef.includes(field), `Schema missing field ${field}`);
  });

  step('Route Verifier');
  check(indexCode.includes("'/api/member/measurements'"), 'GET /api/member/measurements route missing');
  check(indexCode.includes("&& $method === 'GET'"), 'Route must be exact GET');
  check(indexCode.includes('->getMeasurements()'), 'Route must call getMeasurements()');
  
  const measurementsRouteCount = (indexCode.match(/\/api\/member\/measurements/g) || []).length;
  check(measurementsRouteCount === 1, 'Only one route allowed for /api/member/measurements (no POST/PUT/PATCH/DELETE)');

  step('Guard Verifier');
  
  const methodStart = controllerCode.indexOf('public function getMeasurements()');
  check(methodStart !== -1, 'getMeasurements method not found');
  const methodBody = controllerCode.substring(methodStart);
  check(methodBody.includes('Response::json'), 'missing Response::json');

  
  check(methodBody.includes('$this->guard()'), 'guard() must be called in getMeasurements');
  check(!methodBody.includes('$_GET'), 'Must not read $_GET parameters for query contract');

  step('Self-Only Verifier');
  check(methodBody.includes('mm.member_id = :member_id'), 'SQL must use self-only member_id boundary');
  check(methodBody.includes('deleted_at IS NULL'), 'SQL must filter deleted measurements');
  check(methodBody.includes("':member_id' => $this->memberId"), 'SQL must bind session $this->memberId');

  step('Fixed Cap Verifier');
  check(methodBody.includes('LIMIT 100'), 'Must limit to 100 records');
  check(methodBody.includes('ORDER BY mm.measured_at DESC, mm.id DESC'), 'Must order by measured_at DESC, id DESC');

  step('Privacy Projection Verifier');
  // Should NOT project these in response
  
  const mappingStart = methodBody.indexOf('$items[] = [');
  check(mappingStart !== -1, 'Response item mapping array not found');
  const responseMapping = methodBody.substring(mappingStart, methodBody.indexOf('];', mappingStart));

  
  check(!responseMapping.includes("'notes' =>"), "Response must not contain 'notes'");
  check(!responseMapping.includes("'note' =>"), "Response must not contain 'note'");
  check(!responseMapping.includes("'created_by' =>"), "Response must not contain 'created_by'");
  check(!responseMapping.includes("'updated_by' =>"), "Response must not contain 'updated_by'");
  check(!responseMapping.includes("'deleted_at' =>"), "Response must not contain 'deleted_at'");
  check(!responseMapping.includes("'member_id' =>"), "Response must not contain 'member_id'");
  check(!responseMapping.includes("'trainer_id' =>"), "Response must not contain 'trainer_id'");

  step('Progress-note Isolation');
  check(!methodBody.includes('member_progress_notes'), 'member_progress_notes must not be queried in getMeasurements');

  step('Numeric Normalization Verifier');
  const floatMetrics = ['weight_kg', 'body_fat_percent', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm'];
  floatMetrics.forEach(metric => {
    check(responseMapping.includes(`(float)$row['${metric}']`), `Metric ${metric} must be cast to (float)`);
    check(responseMapping.includes(`$row['${metric}'] !== null ?`), `Metric ${metric} must support nullable semantics`);
  });

  step('Safe Trainer Verifier');
  check(methodBody.includes('LEFT JOIN trainers'), 'Must LEFT JOIN trainers table');
  check(methodBody.includes('t.name as trainer_name'), 'Must select trainer_name');
  check(methodBody.includes('t.role_title as trainer_role'), 'Must select trainer_role');
  check(methodBody.includes('t.uuid as trainer_uuid'), 'Must select trainer_uuid');
  check(methodBody.includes("$row['trainer_deleted_at'] === null"), 'Must handle soft-delete for trainers');
  check(methodBody.includes("'trainer' => $trainer"), 'Must map safe trainer object or null');
  
  check(!methodBody.includes("t.email"), "Trainer email must not be selected");
  check(!methodBody.includes("t.phone"), "Trainer phone must not be selected");

  step('No Notes Detail Route');
  check(!indexCode.match(/\/api\/member\/measurements\//), 'Dynamic detail route for measurements is not allowed');

  console.log('✅ PASS — F.18E MEMBER PROGRESS MEASUREMENTS READ MODEL CLOSED');
} catch (err) {
  console.error(err);
  process.exit(1);
}
