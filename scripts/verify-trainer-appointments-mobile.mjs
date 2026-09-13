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
    /^patch.*\\.(m?js|php)$/.test(f) || 
    /^tmp.*\\.(m?js|php)$/.test(f) || 
    f.endsWith('.tmp') || 
    f.endsWith('.fixed') ||
    f.startsWith('add-') && f.endsWith('.php')
  );
  check(badFiles.length === 0, 'No temporary patch or artifact files allowed in repository root');

  step('Verifying F.19C Trainer Mobile Appointments Workspace');

  const listFile = path.join(ROOT_DIR, 'src/admin/pages/appointments/AppointmentListPage.tsx');
  const createModalFile = path.join(ROOT_DIR, 'src/admin/pages/appointments/AppointmentCreateModal.tsx');
  const rescheduleModalFile = path.join(ROOT_DIR, 'src/admin/pages/appointments/AppointmentRescheduleModal.tsx');
  const terminalModalFile = path.join(ROOT_DIR, 'src/admin/pages/appointments/AppointmentTerminalModal.tsx');

  const listCode = fs.readFileSync(listFile, 'utf8');
  const createCode = fs.readFileSync(createModalFile, 'utf8');
  const rescheduleCode = fs.readFileSync(rescheduleModalFile, 'utf8');
  const terminalCode = fs.readFileSync(terminalModalFile, 'utf8');

  step('Trainer API Read Invariant');
  check(listCode.includes('/api/trainer/appointments'), 'Must retain existing trainer API endpoint');
  check(listCode.includes('?from='), 'Must retain from query parameter');
  check(listCode.includes('&to='), 'Must retain to query parameter');

  step('Trainer Mutation Endpoints Presence (via Modals/Props)');
  check(createCode.includes('/api/trainer/appointments'), 'Create modal must retain trainer POST logic');
  check(rescheduleCode.includes('/api/trainer/appointments'), 'Reschedule modal must retain trainer PATCH logic');
  check(terminalCode.includes('/api/trainer/appointments'), 'Terminal modal must retain trainer PATCH logic');

  step('Trainer Cancel Absence');
  const cancelItemRegex = /scope === 'admin' \|\| scope === 'reception'/;
  check(cancelItemRegex.test(listCode), 'Cancel action must remain isolated to admin/reception scopes');

  step('Mobile Card Presence & Desktop Table Preserved');
  check(listCode.includes("lg:hidden space-y-4") || listCode.includes("lg:hidden"), 'Trainer mobile card container must be present');
  check(listCode.includes("hidden lg:block") || listCode.includes("hidden lg:table"), 'Desktop table must be preserved for trainer/admin');
  
  step('Mobile Scheduled Actions');
  check(listCode.includes("setRescheduleItem(item)"), 'Reschedule action must be present');
  check(listCode.includes("setTerminalItem({ item, action: 'completed' })"), 'Complete action must be present');
  check(listCode.includes("setTerminalItem({ item, action: 'no_show' })"), 'No-show action must be present');
  
  step('Non-scheduled Action Isolation');
  check(listCode.includes("item.appointment.status === 'scheduled'"), 'Actions must be scoped strictly to scheduled appointments');

  step('Date Navigator & Touch Targets');
  check(listCode.includes('handlePrevDay'), 'Prev day action must exist');
  check(listCode.includes('handleNextDay'), 'Next day action must exist');
  check(listCode.includes('handleToday'), 'Today action must exist');
  check(listCode.includes('type="date"'), 'Native date input must exist');
  check(listCode.includes('min-h-') || listCode.includes('py-2.5'), 'Touch targets must have sufficient minimum height padding');

  step('Request Race Invariants');
  check(listCode.includes('abortControllerRef'), 'Must preserve abortControllerRef');
  check(listCode.includes('requestGenerationRef'), 'Must preserve requestGenerationRef');
  check(listCode.includes('selectedDateRef'), 'Must preserve selectedDateRef');

  step('Create Trainer Payload & Limits');
  check(!createCode.includes('trainer_id: selectedTrainerId') || createCode.includes("scope !== 'trainer'"), 'Trainer payload must not submit trainer_id');
  check(createCode.includes('/api/trainer/members'), 'Must use isolated trainer member search namespace');
  check(createCode.includes('/api/trainer/appointment-session-packages'), 'Must use isolated trainer packages namespace');

  step('Reschedule Immutability');
  check(rescheduleCode.includes('starts_at'), 'Reschedule payload must include starts_at');
  check(rescheduleCode.includes('ends_at'), 'Reschedule payload must include ends_at');
  check(!rescheduleCode.includes('JSON.stringify({ member_id'), 'Reschedule must not mutate member in payload');

  step('Modal Responsive Invariant');
  check(createCode.includes('sm:max-h-'), 'Create modal must implement mobile viewport fitting (sm:max-h-)');
  check(rescheduleCode.includes('sm:max-h-'), 'Reschedule modal must implement mobile viewport fitting');
  check(terminalCode.includes('sm:max-h-'), 'Terminal modal must implement mobile viewport fitting');
  check(createCode.includes('p-0 sm:p-4') || createCode.includes('p-4 sm:p-6'), 'Modals must use responsive padding');

  console.log('✅ PASS — F.19C TRAINER MOBILE APPOINTMENTS WORKSPACE CLOSED');
} catch (err) {
  console.error(err);
  process.exit(1);
}
